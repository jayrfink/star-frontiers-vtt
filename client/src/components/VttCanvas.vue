<template>
  <div
    ref="containerRef"
    class="vtt-canvas-container"
    :class="{ 'cursor-pan': isPanning || activeTool === 'pan', 'cursor-measure': activeTool === 'measure' }"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @wheel.prevent="onWheel"
  >
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { socket } from '../services/socket.js';
import { getTokenDamageOverlayState, drawTokenDamageOverlay } from '../utils/tokenDamageOverlay.js';

const props = defineProps({
  map: {
    type: Object,
    default: null,
  },
  tokens: {
    type: Array,
    default: () => [],
  },
  activeTool: {
    type: String,
    default: 'select', // 'select', 'pan', 'measure'
  },
  zoomLevel: {
    type: Number,
    default: 1.0,
  },
  panX: {
    type: Number,
    default: 50,
  },
  panY: {
    type: Number,
    default: 50,
  },
  isGm: {
    type: Boolean,
    default: false,
  },
  selectedTokenId: {
    type: [Number, String],
    default: null,
  },
});

const emit = defineEmits([
  'update:zoomLevel',
  'update:panX',
  'update:panY',
  'token-moved',
  'token-selected',
  'tokens-updated',
  'map-updated',
]);

const containerRef = ref(null);
const canvasRef = ref(null);

// Canvas transform & interaction state
const panX = ref(props.panX);
const panY = ref(props.panY);

watch(() => props.panX, (val) => {
  if (typeof val === 'number' && val !== panX.value) {
    panX.value = val;
    requestRender();
  }
});
watch(() => props.panY, (val) => {
  if (typeof val === 'number' && val !== panY.value) {
    panY.value = val;
    requestRender();
  }
});
watch(() => props.zoomLevel, () => {
  requestRender();
});
watch(() => props.tokens, () => {
  requestRender();
}, { deep: true });
watch(() => props.map, () => {
  requestRender();
}, { deep: true });
watch(() => props.selectedTokenId, () => {
  requestRender();
});

const isPanning = ref(false);
const panStart = { x: 0, y: 0 };
const isSpacePressed = ref(false);

// Dragging token state
const draggingToken = ref(null);
const dragCell = ref({ x: 0, y: 0 });

// Ruler state
const rulerStart = ref(null);
const rulerEnd = ref(null);
const isMeasuring = ref(false);

// Image cache
const imageCache = new Map();

function getCachedImage(url) {
  if (!url) return null;
  if (imageCache.has(url)) {
    const cached = imageCache.get(url);
    return cached.loaded ? cached.img : null;
  }
  const img = new Image();
  const record = { img, loaded: false };
  imageCache.set(url, record);
  img.onload = () => {
    record.loaded = true;
    requestRender();
  };
  img.onerror = () => {
    imageCache.delete(url);
  };
  img.src = url;
  return null;
}

function handleAssetRenamed({ oldUrl, newUrl }) {
  for (const [key, cached] of Array.from(imageCache.entries())) {
    if (key === oldUrl || key.split('?')[0] === oldUrl) {
      imageCache.delete(key);
      const query = key.includes('?') ? '?' + key.split('?')[1] : '';
      if (newUrl) {
        imageCache.set(newUrl + query, cached);
      }
    }
  }
  if (props.tokens && Array.isArray(props.tokens)) {
    let changed = false;
    const updatedTokens = props.tokens.map((t) => {
      if (t.avatar_url === oldUrl) {
        changed = true;
        return { ...t, avatar_url: newUrl };
      } else if (t.avatar_url && t.avatar_url.split('?')[0] === oldUrl) {
        changed = true;
        const query = t.avatar_url.includes('?') ? '?' + t.avatar_url.split('?')[1] : '';
        return { ...t, avatar_url: newUrl + query };
      }
      return t;
    });
    if (changed) {
      emit('tokens-updated', updatedTokens);
    }
  }
  requestRender();
}

function handleAssetDeleted({ url }) {
  for (const key of Array.from(imageCache.keys())) {
    if (key === url || key.split('?')[0] === url) {
      imageCache.delete(key);
    }
  }
  if (props.tokens && Array.isArray(props.tokens)) {
    let changed = false;
    const updatedTokens = props.tokens.map((t) => {
      if (t.avatar_url === url || (t.avatar_url && t.avatar_url.split('?')[0] === url)) {
        changed = true;
        return { ...t, avatar_url: '' };
      }
      return t;
    });
    if (changed) {
      emit('tokens-updated', updatedTokens);
    }
  }
  requestRender();
}

function handleMapAssetRenamed({ oldUrl, newUrl }) {
  for (const [key, cached] of Array.from(imageCache.entries())) {
    if (key === oldUrl || key.split('?')[0] === oldUrl) {
      imageCache.delete(key);
      const query = key.includes('?') ? '?' + key.split('?')[1] : '';
      if (newUrl) imageCache.set(newUrl + query, cached);
    }
  }
  if (props.map) {
    if (props.map.background_url === oldUrl) {
      emit('map-updated', { ...props.map, background_url: newUrl });
    } else if (props.map.background_url && props.map.background_url.split('?')[0] === oldUrl) {
      const query = props.map.background_url.includes('?') ? '?' + props.map.background_url.split('?')[1] : '';
      emit('map-updated', { ...props.map, background_url: newUrl + query });
    }
  }
  requestRender();
}

function handleMapAssetDeleted({ url }) {
  for (const key of Array.from(imageCache.keys())) {
    if (key === url || key.split('?')[0] === url) {
      imageCache.delete(key);
    }
  }
  if (props.map && (props.map.background_url === url || (props.map.background_url && props.map.background_url.split('?')[0] === url))) {
    emit('map-updated', { ...props.map, background_url: '' });
  }
  requestRender();
}

// Helpers
const gridPx = computed(() => props.map?.grid_size || 40);
const mapCols = computed(() => props.map?.width || 20);
const mapRows = computed(() => props.map?.height || 20);

function getCellFromWorld(wx, wy) {
  const mapW = mapCols.value * gridPx.value;
  const mapH = mapRows.value * gridPx.value;
  if (wx < 0 || wy < 0 || wx >= mapW || wy >= mapH) {
    return null;
  }
  const cx = Math.floor(wx / gridPx.value);
  const cy = Math.floor(wy / gridPx.value);
  return {
    x: Math.max(0, Math.min(mapCols.value - 1, cx)),
    y: Math.max(0, Math.min(mapRows.value - 1, cy)),
  };
}

function getWorldFromScreen(sx, sy) {
  if (!canvasRef.value) return { x: 0, y: 0 };
  const rect = canvasRef.value.getBoundingClientRect();
  const mouseX = sx - rect.left;
  const mouseY = sy - rect.top;
  return {
    x: (mouseX - panX.value) / props.zoomLevel,
    y: (mouseY - panY.value) / props.zoomLevel,
  };
}

// Resize canvas
function resizeCanvas() {
  if (!containerRef.value || !canvasRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  canvasRef.value.width = Math.round(rect.width * dpr);
  canvasRef.value.height = Math.round(rect.height * dpr);
  canvasRef.value.style.width = `${rect.width}px`;
  canvasRef.value.style.height = `${rect.height}px`;
}

// Animation loop handle & dirty flag
let animationFrameId = null;
let needsRender = false;

function requestRender() {
  needsRender = true;
  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(() => {
      animationFrameId = null;
      if (needsRender) {
        needsRender = false;
        drawCanvas();
      }
    });
  }
}

function startRenderLoop() {
  requestRender();
}

function stopRenderLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  needsRender = false;
}

// Canvas rendering
function drawCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas buffer
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (!props.map) {
    // Render blank background when no map is active
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#8b949e';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    const cssW = width / dpr;
    const cssH = height / dpr;
    ctx.fillText('No Active Map Loaded. Select or Create a Map in GM Panel.', cssW / 2, cssH / 2);
    ctx.restore();
    return;
  }

  const mapW = mapCols.value * gridPx.value;
  const mapH = mapRows.value * gridPx.value;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.translate(panX.value, panY.value);
  ctx.scale(props.zoomLevel, props.zoomLevel);

  // 1. Draw Map Background
  drawBackground(ctx, mapW, mapH);

  // 2. Draw Grid Lines
  drawGrid(ctx, mapW, mapH);

  // 3. Draw Tokens
  drawTokens(ctx);

  // 4. Draw Dragging Ghost Token (if any)
  if (draggingToken.value) {
    drawGhostToken(ctx, draggingToken.value, dragCell.value);
  }

  // 5. Draw Measurement Ruler
  if (rulerStart.value && rulerEnd.value) {
    drawMeasurementRuler(ctx);
  }

  ctx.restore();
}

function drawBackground(ctx, mapW, mapH) {
  if (!props.map) return;
  const preset = props.map.preset_bg || 'grid_only';
  const customUrl = props.map.background_url;

  if (customUrl) {
    const img = getCachedImage(customUrl);
    if (img) {
      ctx.drawImage(img, 0, 0, mapW, mapH);
      return;
    }
  }

  switch (preset) {
    case 'ship_deck': {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, mapW, mapH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let x = 0; x < mapW; x += gridPx.value / 2) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapH);
        ctx.stroke();
      }
      break;
    }
    case 'volturnus_desert': {
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(0, 0, mapW, mapH);
      ctx.fillStyle = '#9a3412';
      for (let x = 10; x < mapW; x += 40) {
        for (let y = 10; y < mapH; y += 40) {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'starfield': {
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, mapW, mapH);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137) % mapW);
        const sy = ((i * 243) % mapH);
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 2) + 1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'grassland': {
      ctx.fillStyle = '#14532d';
      ctx.fillRect(0, 0, mapW, mapH);
      ctx.fillStyle = '#166534';
      for (let x = 15; x < mapW; x += 30) {
        for (let y = 15; y < mapH; y += 30) {
          ctx.fillRect(x, y, 4, 8);
        }
      }
      break;
    }
    case 'grid_only':
    default: {
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, mapW, mapH);
      break;
    }
  }
}

function drawGrid(ctx, mapW, mapH) {
  if (!props.map) return;
  // Grid lines can be hidden per map; token snapping uses cell coordinates and is unaffected.
  if (props.map.grid_visible === false || props.map.grid_visible === 0) return;
  const gSize = gridPx.value;
  const color = props.map.grid_color || '#333333';

  ctx.strokeStyle = color;
  const lineThickness = Number(props.map.grid_line_width) > 0 ? Number(props.map.grid_line_width) : 1;
  ctx.lineWidth = Math.max(lineThickness, lineThickness / props.zoomLevel);

  ctx.beginPath();
  for (let c = 0; c <= mapCols.value; c++) {
    const x = c * gSize;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, mapH);
  }
  for (let r = 0; r <= mapRows.value; r++) {
    const y = r * gSize;
    ctx.moveTo(0, y);
    ctx.lineTo(mapW, y);
  }
  ctx.stroke();
}

function drawTokens(ctx) {
  const gSize = gridPx.value;

  // Layering: larger tokens (e.g. vehicles size >= 2) render first (underneath), smaller tokens on top
  const sortedTokens = [...props.tokens].sort((a, b) => {
    const sizeA = Number(a.size) || 1;
    const sizeB = Number(b.size) || 1;
    return sizeB - sizeA;
  });

  sortedTokens.forEach((token) => {
    if (draggingToken.value && draggingToken.value.id === token.id) {
      // Skip drawing normal token if being dragged
      return;
    }
    renderSingleToken(ctx, token, token.x, token.y, gSize, token.id === props.selectedTokenId);
  });
}

function drawGhostToken(ctx, token, cell) {
  ctx.save();
  ctx.globalAlpha = 0.6;
  renderSingleToken(ctx, token, cell.x, cell.y, gridPx.value, true);
  ctx.restore();
}

function renderSingleToken(ctx, token, cellX, cellY, gSize, isSelected) {
  const size = token.size || 1;
  const px = cellX * gSize;
  const py = cellY * gSize;
  const tokenPx = size * gSize;
  const cx = px + tokenPx / 2;
  const cy = py + tokenPx / 2;
  const radius = tokenPx / 2 - 3;

  // Selected Token Glow
  if (isSelected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(88, 166, 255, 0.4)';
    ctx.fill();
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Token Base Circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#1f2937';
  ctx.fill();

  // Avatar Image or Initials
  if (token.avatar_url) {
    const img = getCachedImage(token.avatar_url);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, px + 3, py + 3, tokenPx - 6, tokenPx - 6);
      ctx.restore();
    } else {
      drawInitials(ctx, token.name, cx, cy, radius);
    }
  } else {
    drawInitials(ctx, token.name, cx, cy, radius);
  }

  // Damage / Wounded Red Overlay
  const damageOverlayState = getTokenDamageOverlayState(token);
  if (damageOverlayState) {
    drawTokenDamageOverlay(ctx, damageOverlayState, cx, cy, radius);
  }

  // Token Colored Ring Border
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = token.color || '#666666';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Status Icons (⚡ Stunned, 💀 Unconscious, 🩸 Wounded)
  let statusEffects = token.status_effects;
  if (typeof statusEffects === 'string') {
    try {
      statusEffects = JSON.parse(statusEffects);
    } catch {
      statusEffects = [];
    }
  }
  if (statusEffects && Array.isArray(statusEffects) && statusEffects.length > 0) {
    const iconMap = {
      stunned: '⚡',
      unconscious: '💀',
      wounded: '🩸',
      '⚡': '⚡',
      '💀': '💀',
      '🩸': '🩸',
    };
    const activeIcons = statusEffects.map(s => iconMap[s] || s);
    const iconStr = activeIcons.join('');
    
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(iconStr, px + tokenPx - 2, py + 2);
  }

  // Vehicle Token Overlays (Speed badge & Damage condition icon)
  if (token.vehicle_data) {
    // Damage Condition Indicator (🔥 Burning, ⚠️ Damaged)
    let conditions = token.vehicle_data.damage_conditions;
    if (typeof conditions === 'string') {
      try {
        conditions = JSON.parse(conditions);
      } catch {
        conditions = [];
      }
    }
    conditions = Array.isArray(conditions) ? conditions : [];
    if (conditions.length > 0) {
      const isBurning = conditions.some(
        c => typeof c === 'string' && (c.toLowerCase().includes('burn') || c.includes('🔥'))
      );
      const icon = isBurning ? '🔥' : '⚠️';
      ctx.save();
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(icon, px + 2, py + 2);
      ctx.restore();
    }

    // Speed Pill Badge (e.g. "60 m/t")
    const currentSpeed = Number(token.vehicle_data.current_speed) || 0;
    if (currentSpeed > 0) {
      ctx.save();
      const speedText = `${currentSpeed} m/t`;
      const fontSize = Math.max(9, Math.min(12, Math.round(gSize * 0.22)));
      ctx.font = `bold ${fontSize}px monospace`;
      const textMetrics = ctx.measureText(speedText);
      const textWidth = textMetrics.width;
      const badgeH = fontSize + 4;
      const badgeW = textWidth + 8;
      const badgeX = cx - badgeW / 2;
      const badgeY = py + tokenPx - badgeH - 2;

      ctx.fillStyle = 'rgba(11, 19, 32, 0.85)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00e5ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(speedText, cx, badgeY + badgeH / 2);
      ctx.restore();
    }
  }
}

function drawInitials(ctx, name, cx, cy, radius) {
  const initials = (name || 'T')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  ctx.font = `bold ${Math.round(radius * 0.9)}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, cx, cy);
}

function drawMeasurementRuler(ctx) {
  const startCell = rulerStart.value;
  const endCell = rulerEnd.value;
  const gSize = gridPx.value;

  const sx = (startCell.x + 0.5) * gSize;
  const sy = (startCell.y + 0.5) * gSize;
  const ex = (endCell.x + 0.5) * gSize;
  const ey = (endCell.y + 0.5) * gSize;

  const dx = Math.abs(endCell.x - startCell.x);
  const dy = Math.abs(endCell.y - startCell.y);
  const cellDist = Math.max(dx, dy);
  const feet = cellDist * 5;
  const meters = cellDist * 2;

  ctx.save();
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = '#58a6ff';
  ctx.beginPath();
  ctx.arc(sx, sy, 5, 0, Math.PI * 2);
  ctx.arc(ex, ey, 5, 0, Math.PI * 2);
  ctx.fill();

  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;
  const labelText = `${cellDist} cells (${feet} ft / ${meters} m)`;

  ctx.font = 'bold 13px sans-serif';
  const textMetrics = ctx.measureText(labelText);
  const bgW = textMetrics.width + 16;
  const bgH = 24;

  ctx.fillStyle = 'rgba(13, 17, 23, 0.9)';
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 1;
  ctx.fillRect(midX - bgW / 2, midY - bgH / 2, bgW, bgH);
  ctx.strokeRect(midX - bgW / 2, midY - bgH / 2, bgW, bgH);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, midX, midY);

  ctx.restore();
}

function onMouseDown(e) {
  if (!props.map) return;
  const worldPos = getWorldFromScreen(e.clientX, e.clientY);
  const cell = getCellFromWorld(worldPos.x, worldPos.y);

  if (e.button === 1 || isSpacePressed.value || props.activeTool === 'pan') {
    if (e.button === 1) e.preventDefault();
    isPanning.value = true;
    panStart.x = e.clientX - panX.value;
    panStart.y = e.clientY - panY.value;
    return;
  }

  if (e.button === 0) {
    if (props.activeTool === 'select') {
      // Hit-testing: smaller tokens on top take precedence over larger tokens underneath
      const hitTestOrder = [...props.tokens].sort((a, b) => {
        const sizeA = Number(a.size) || 1;
        const sizeB = Number(b.size) || 1;
        return sizeA - sizeB;
      });
      const hitToken = cell
        ? hitTestOrder.find((t) => {
            const tx = Number(t.x) || 0;
            const ty = Number(t.y) || 0;
            const size = Number(t.size) || 1;
            return (
              cell.x >= tx &&
              cell.x < tx + size &&
              cell.y >= ty &&
              cell.y < ty + size
            );
          })
        : null;

      if (hitToken) {
        draggingToken.value = hitToken;
        dragCell.value = { x: hitToken.x, y: hitToken.y };
        emit('token-selected', hitToken);
      } else {
        emit('token-selected', null);
      }
      requestRender();
    } else if (cell && props.activeTool === 'measure') {
      rulerStart.value = cell;
      rulerEnd.value = cell;
      isMeasuring.value = true;
      requestRender();
    }
  }
}

function onMouseMove(e) {
  const worldPos = getWorldFromScreen(e.clientX, e.clientY);
  const cell = getCellFromWorld(worldPos.x, worldPos.y);

  if (isPanning.value) {
    panX.value = e.clientX - panStart.x;
    panY.value = e.clientY - panStart.y;
    emit('update:panX', panX.value);
    emit('update:panY', panY.value);
    requestRender();
    return;
  }

  if (cell && draggingToken.value) {
    dragCell.value = cell;
    requestRender();
    return;
  }

  if (rulerStart.value && props.activeTool === 'measure' && isMeasuring.value) {
    rulerEnd.value = cell;
    requestRender();
    return;
  }
}

function onMouseUp() {
  if (isMeasuring.value) {
    isMeasuring.value = false;
    requestRender();
  }

  if (isPanning.value) {
    isPanning.value = false;
    requestRender();
  }

  if (draggingToken.value) {
    if (dragCell.value.x !== draggingToken.value.x || dragCell.value.y !== draggingToken.value.y) {
      emit('token-moved', {
        id: draggingToken.value.id,
        x: dragCell.value.x,
        y: dragCell.value.y,
      });
    }
    draggingToken.value = null;
    requestRender();
  }
}

function onWheel(e) {
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  let newZoom = Math.min(3.0, Math.max(0.25, props.zoomLevel * zoomFactor));
  newZoom = Math.round(newZoom * 100) / 100;

  if (newZoom === props.zoomLevel) return;

  if (canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    panX.value = mouseX - ((mouseX - panX.value) * newZoom) / props.zoomLevel;
    panY.value = mouseY - ((mouseY - panY.value) * newZoom) / props.zoomLevel;
    emit('update:panX', panX.value);
    emit('update:panY', panY.value);
  }

  emit('update:zoomLevel', newZoom);
  requestRender();
}

function onKeyDown(e) {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    if (!isSpacePressed.value) {
      isSpacePressed.value = true;
    }
  }
}

function onKeyUp(e) {
  if (e.code === 'Space') {
    isSpacePressed.value = false;
  }
}

watch(
  () => props.activeTool,
  (newTool) => {
    if (newTool !== 'measure') {
      rulerStart.value = null;
      rulerEnd.value = null;
      isMeasuring.value = false;
    }
    requestRender();
  }
);

let resizeObserver = null;

onMounted(() => {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(containerRef.value);
  }

  startRenderLoop();

  socket.on('token:asset-renamed', handleAssetRenamed);
  socket.on('token:asset-deleted', handleAssetDeleted);
  socket.on('map:asset-renamed', handleMapAssetRenamed);
  socket.on('map:asset-deleted', handleMapAssetDeleted);
});

onBeforeUnmount(() => {
  stopRenderLoop();
  socket.off('token:asset-renamed', handleAssetRenamed);
  socket.off('token:asset-deleted', handleAssetDeleted);
  socket.off('map:asset-renamed', handleMapAssetRenamed);
  socket.off('map:asset-deleted', handleMapAssetDeleted);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  window.removeEventListener('resize', resizeCanvas);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});
</script>

<style scoped>
.vtt-canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: var(--bg-primary, #0d1117);
  user-select: none;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.cursor-pan {
  cursor: grab;
}

.cursor-pan:active {
  cursor: grabbing;
}

.cursor-measure {
  cursor: crosshair;
}
</style>

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
]);

const containerRef = ref(null);
const canvasRef = ref(null);

// Canvas transform & interaction state
const panX = ref(props.panX);
const panY = ref(props.panY);

watch(() => props.panX, (val) => {
  if (typeof val === 'number' && val !== panX.value) panX.value = val;
});
watch(() => props.panY, (val) => {
  if (typeof val === 'number' && val !== panY.value) panY.value = val;
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
  };
  img.onerror = () => {
    imageCache.delete(url);
  };
  img.src = url;
  return null;
}

// Helpers
const gridPx = computed(() => props.map?.grid_size || 40);
const mapCols = computed(() => props.map?.width || 20);
const mapRows = computed(() => props.map?.height || 20);

function getCellFromWorld(wx, wy) {
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
  canvasRef.value.width = rect.width;
  canvasRef.value.height = rect.height;
}

// Animation loop handle
let animationFrameId = null;

function startRenderLoop() {
  function render() {
    drawCanvas();
    animationFrameId = requestAnimationFrame(render);
  }
  animationFrameId = requestAnimationFrame(render);
}

function stopRenderLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// Canvas rendering
function drawCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  if (!props.map) {
    // Render blank background when no map is active
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#8b949e';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No Active Map Loaded. Select or Create a Map in GM Panel.', width / 2, height / 2);
    return;
  }

  const mapW = mapCols.value * gridPx.value;
  const mapH = mapRows.value * gridPx.value;

  ctx.save();
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
  const gSize = gridPx.value;
  const color = props.map.grid_color || '#333333';

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, 1 / props.zoomLevel);

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

  props.tokens.forEach((token) => {
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

  // Token Colored Ring Border
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = token.color || '#666666';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Status Icons (⚡ Stunned, 💀 Unconscious, 🩸 Wounded)
  if (token.status_effects && Array.isArray(token.status_effects) && token.status_effects.length > 0) {
    const iconMap = {
      stunned: '⚡',
      unconscious: '💀',
      wounded: '🩸',
      '⚡': '⚡',
      '💀': '💀',
      '🩸': '🩸',
    };
    const activeIcons = token.status_effects.map(s => iconMap[s] || s);
    const iconStr = activeIcons.join('');
    
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(iconStr, px + tokenPx - 2, py + 2);
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
      const hitToken = [...props.tokens].reverse().find((t) => {
        const size = t.size || 1;
        return (
          cell.x >= t.x &&
          cell.x < t.x + size &&
          cell.y >= t.y &&
          cell.y < t.y + size
        );
      });

      if (hitToken) {
        draggingToken.value = hitToken;
        dragCell.value = { x: hitToken.x, y: hitToken.y };
        emit('token-selected', hitToken);
      } else {
        emit('token-selected', null);
      }
    } else if (props.activeTool === 'measure') {
      rulerStart.value = cell;
      rulerEnd.value = cell;
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
    return;
  }

  if (draggingToken.value) {
    dragCell.value = cell;
    return;
  }

  if (rulerStart.value && props.activeTool === 'measure') {
    rulerEnd.value = cell;
    return;
  }
}

function onMouseUp() {
  if (isPanning.value) {
    isPanning.value = false;
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
}

function onKeyDown(e) {
  if (e.code === 'Space' && !isSpacePressed.value && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    isSpacePressed.value = true;
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
    }
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
});

onBeforeUnmount(() => {
  stopRenderLoop();
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value);
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

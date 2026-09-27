<template>
  <div
    ref="containerRef"
    class="space-vtt-canvas-container"
    :class="{ 'cursor-pan': isPanning || activeTool === 'pan' }"
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
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

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
    default: 'select', // 'select', 'pan'
  },
  zoomLevel: {
    type: Number,
    default: 1.0,
  },
  selectedTokenId: {
    type: [Number, String],
    default: null,
  },
});

const emit = defineEmits([
  'update:zoomLevel',
  'token-moved',
  'token-selected',
]);

const containerRef = ref(null);
const canvasRef = ref(null);

// Canvas transform & interaction state
const panX = ref(50);
const panY = ref(50);
const isPanning = ref(false);
const panStart = { x: 0, y: 0 };
const isSpacePressed = ref(false);

// Dragging token state
const draggingToken = ref(null);
const dragCell = ref({ q: 0, r: 0 });

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
const hexSize = computed(() => props.map?.grid_size || 40);
const mapCols = computed(() => props.map?.width || 20);
const mapRows = computed(() => props.map?.height || 20);

const hexW = computed(() => Math.sqrt(3) * hexSize.value);
const hexH = computed(() => 2 * hexSize.value);

function getCellCenter(q, r) {
  const w = hexW.value;
  const h = hexH.value;
  const cx = q * w + (r % 2) * (w / 2) + w / 2;
  const cy = r * (0.75 * h) + h / 2;
  return { x: cx, y: cy };
}

function getCellFromWorld(wx, wy) {
  // Hex grid picking (odd-r offset coordinates)
  // Approximate for now: find nearest hex center
  const w = hexW.value;
  const h = hexH.value;
  let minDist = Infinity;
  let bestQ = 0;
  let bestR = 0;
  
  // Search within a reasonable bounding box
  const approxR = Math.floor(wy / (0.75 * h));
  const approxQ = Math.floor(wx / w);
  
  for (let r = Math.max(0, approxR - 2); r <= Math.min(mapRows.value - 1, approxR + 2); r++) {
    for (let q = Math.max(0, approxQ - 2); q <= Math.min(mapCols.value - 1, approxQ + 2); q++) {
      const center = getCellCenter(q, r);
      const dist = Math.sqrt((wx - center.x) ** 2 + (wy - center.y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        bestQ = q;
        bestR = r;
      }
    }
  }
  
  return { q: bestQ, r: bestR };
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
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const mapW = mapCols.value * hexW.value + hexW.value / 2;
  const mapH = mapRows.value * (0.75 * hexH.value) + 0.25 * hexH.value;

  ctx.save();
  ctx.translate(panX.value, panY.value);
  ctx.scale(props.zoomLevel, props.zoomLevel);

  // 1. Draw Map Background
  drawBackground(ctx, mapW, mapH);

  // 2. Draw Grid Lines
  drawGrid(ctx, mapW, mapH);

  // 3. Draw Tokens
  drawTokens(ctx);

  // 4. Draw Dragging Ghost Token
  if (draggingToken.value) {
    drawGhostToken(ctx, draggingToken.value, dragCell.value);
  }

  ctx.restore();
}

// Pre-generate stars for procedural background so they don't change every frame
const stars = [];
for (let i = 0; i < 200; i++) {
  stars.push({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.5 + 0.3
  });
}

function drawBackground(ctx, mapW, mapH) {
  // Fill with dark space background
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, mapW, mapH);

  if (props.map?.background_url) {
    const bgImg = getCachedImage(props.map.background_url);
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, mapW, mapH);
      return;
    }
  }

  // Draw random white stars
  stars.forEach(star => {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.beginPath();
    ctx.arc(star.x * mapW, star.y * mapH, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGrid(ctx, mapW, mapH) {
  if (!props.map) return;
  const hexSize = props.map.grid_size || 40;

  ctx.strokeStyle = props.map.grid_color || '#334155';
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let r = 0; r < mapRows.value; r++) {
    for (let q = 0; q < mapCols.value; q++) {
      const center = getCellCenter(q, r);
      
      for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        const x = center.x + hexSize * Math.cos(angle_rad);
        const y = center.y + hexSize * Math.sin(angle_rad);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
  }
  ctx.stroke();
}

function drawTokens(ctx) {
  props.tokens.forEach((token) => {
    if (draggingToken.value && draggingToken.value.id === token.id) {
      return;
    }
    renderSingleToken(ctx, token, token.x, token.y, token.id === props.selectedTokenId);
  });
}

function drawGhostToken(ctx, token, cell) {
  ctx.save();
  ctx.globalAlpha = 0.6;
  renderSingleToken(ctx, token, cell.q, cell.r, true);
  ctx.restore();
}

function renderSingleToken(ctx, token, q, r, isSelected) {
  const center = getCellCenter(q, r);
  const cx = center.x;
  const cy = center.y;
  const size = hexSize.value * 0.8; // Token slightly smaller than hex
  
  // Selected Token Glow
  if (isSelected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(88, 166, 255, 0.4)';
    ctx.fill();
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Save context for rotation
  ctx.save();
  ctx.translate(cx, cy);
  const rotation = token.rotation || 0;
  ctx.rotate((rotation * Math.PI) / 180);

  // Draw Token Image or fallback
  if (token.avatar_url) {
    const img = getCachedImage(token.avatar_url);
    if (img) {
      // Assuming square image fitting inside circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, -size, -size, size * 2, size * 2);
      ctx.restore();
    } else {
      drawInitials(ctx, token.name, 0, 0, size);
    }
  } else {
    drawInitials(ctx, token.name, 0, 0, size);
  }
  
  // Token Colored Ring Border
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.strokeStyle = token.color || '#666666';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  
  // Restore context so badges stay upright
  ctx.restore();


  // Speed badge
  const speed = token.current_speed ?? token.speed;
  if (speed !== null && speed !== undefined) {
    ctx.fillStyle = '#69c79e'; // speed indicator background
    ctx.beginPath();
    ctx.arc(cx + size * 0.7, cy - size * 0.7, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#489d78';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#081c15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(speed.toString(), cx + size * 0.7, cy - size * 0.7);
  }

  // Status Icons (💥 Damaged, 🛰️ Adrift, ⚡ Disabled, 🔥 Burning, etc.)
  const rawStatus = token.status_effects;
  let statusEffects = [];
  if (Array.isArray(rawStatus)) {
    statusEffects = rawStatus;
  } else if (typeof rawStatus === 'string' && rawStatus) {
    try {
      statusEffects = JSON.parse(rawStatus);
    } catch {
      statusEffects = [];
    }
  }

  if (statusEffects.length > 0) {
    const iconMap = {
      damaged: '💥',
      adrift: '🛰️',
      disabled: '⚡',
      burning: '🔥',
      stunned: '⚡',
      unconscious: '💀',
      wounded: '🩸',
      '💥': '💥',
      '🛰️': '🛰️',
      '⚡': '⚡',
      '🔥': '🔥',
      '💀': '💀',
      '🩸': '🩸',
    };
    const activeIcons = statusEffects.map((s) => iconMap[s] || s);
    const iconStr = activeIcons.join('');

    ctx.save();
    ctx.font = `${Math.max(12, Math.round(size * 0.4))}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(iconStr, cx - size * 0.85, cy - size * 0.85);
    ctx.restore();
  }
}

function drawInitials(ctx, name, cx, cy, radius) {
  const initials = (name || 'T')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#1f2937';
  ctx.fill();

  ctx.font = `bold ${Math.round(radius * 0.9)}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, cx, cy);
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
        return t.x === cell.q && t.y === cell.r;
      });

      if (hitToken) {
        draggingToken.value = hitToken;
        dragCell.value = { q: hitToken.x, r: hitToken.y };
        emit('token-selected', hitToken);
      } else {
        emit('token-selected', null);
      }
    }
  }
}

function onMouseMove(e) {
  const worldPos = getWorldFromScreen(e.clientX, e.clientY);
  const cell = getCellFromWorld(worldPos.x, worldPos.y);

  if (isPanning.value) {
    panX.value = e.clientX - panStart.x;
    panY.value = e.clientY - panStart.y;
    return;
  }

  if (draggingToken.value) {
    dragCell.value = cell;
    return;
  }
}

function onMouseUp() {
  if (isPanning.value) {
    isPanning.value = false;
  }

  if (draggingToken.value) {
    if (dragCell.value.q !== draggingToken.value.x || dragCell.value.r !== draggingToken.value.y) {
      emit('token-moved', {
        id: draggingToken.value.id,
        x: dragCell.value.q,
        y: dragCell.value.r,
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
.space-vtt-canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #0d1117;
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
</style>

/**
 * Ping Renderer & Hit-Testing Utility
 *
 * Provides canvas 2D rendering for real-time tactical pings with radar ripples,
 * radial glow, and sci-fi badges, as well as coordinate hit-testing for badge dismissal.
 */

export const PING_COLORS = {
  aqua: '#00ffff',
  aquaGlow: '#22d3ee',
  teal: '#14b8a6',
  tealDark: '#0d9488',
  badgeBg: 'rgba(13, 17, 23, 0.9)',
  badgeBorder: '#14b8a6',
  badgeText: '#e2e8f0',
};

export const BADGE_OFFSET_X = 18;
export const BADGE_OFFSET_Y = -24;
export const BADGE_HEIGHT = 20;
export const BADGE_CLOSE_RADIUS = 8;

/**
 * Calculates bounding box and close button hit coordinates for a ping's username badge.
 *
 * @param {Object} ping - { x: number, y: number, username?: string }
 * @returns {Object|null} - { x, y, width, height, closeX, closeY, closeRadius } or null if invalid
 */
export function getPingBadgeBounds(ping) {
  if (
    !ping ||
    typeof ping.x !== 'number' ||
    typeof ping.y !== 'number' ||
    Number.isNaN(ping.x) ||
    Number.isNaN(ping.y)
  ) {
    return null;
  }

  const username = ping.username || 'Player';
  const charWidth = 7.5;
  const paddingLeft = 8;
  const textWidth = Math.max(30, username.length * charWidth);
  const gap = 6;
  const closeDiameter = BADGE_CLOSE_RADIUS * 2;
  const paddingRight = 6;
  const width = Math.ceil(paddingLeft + textWidth + gap + closeDiameter + paddingRight);
  const height = BADGE_HEIGHT;

  const x = ping.x + BADGE_OFFSET_X;
  const y = ping.y + BADGE_OFFSET_Y;

  const closeX = x + width - paddingRight - BADGE_CLOSE_RADIUS;
  const closeY = y + height / 2;
  const closeRadius = BADGE_CLOSE_RADIUS;

  return {
    x,
    y,
    width,
    height,
    closeX,
    closeY,
    closeRadius,
  };
}

/**
 * Determines whether the given canvas coordinates hit the ping's dismissal button (✕).
 *
 * @param {Object} ping - { x: number, y: number, username?: string }
 * @param {number} canvasX
 * @param {number} canvasY
 * @returns {boolean}
 */
export function isPingDismissHit(ping, canvasX, canvasY) {
  if (
    typeof canvasX !== 'number' ||
    typeof canvasY !== 'number' ||
    Number.isNaN(canvasX) ||
    Number.isNaN(canvasY)
  ) {
    return false;
  }

  const bounds = getPingBadgeBounds(ping);
  if (!bounds) return false;

  const dx = canvasX - bounds.closeX;
  const dy = canvasY - bounds.closeY;
  return dx * dx + dy * dy <= bounds.closeRadius * bounds.closeRadius;
}

/**
 * Renders a single ping onto the canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} ping - { x: number, y: number, username?: string }
 * @param {number} [timestamp=0] - Current performance.now() or Date.now() timestamp
 */
export function drawPing(ctx, ping, timestamp = 0) {
  if (
    !ctx ||
    !ping ||
    typeof ping.x !== 'number' ||
    typeof ping.y !== 'number' ||
    Number.isNaN(ping.x) ||
    Number.isNaN(ping.y)
  ) {
    return;
  }

  const t = typeof timestamp === 'number' && !Number.isNaN(timestamp) ? timestamp : 0;
  const sinVal = Math.sin(t / 200);
  const pulse = (sinVal + 1) / 2; // 0 to 1

  ctx.save();

  // 1. Aqua radial gradient core
  const coreRadius = 26;
  const gradient = ctx.createRadialGradient(ping.x, ping.y, 0, ping.x, ping.y, coreRadius);
  gradient.addColorStop(0, PING_COLORS.aqua);
  gradient.addColorStop(0.35, 'rgba(34, 211, 238, 0.7)');
  gradient.addColorStop(1, 'rgba(20, 184, 166, 0)');

  ctx.beginPath();
  ctx.arc(ping.x, ping.y, coreRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // 2. Bright center focus dot
  ctx.beginPath();
  ctx.arc(ping.x, ping.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // 3. Radar ripple rings
  // Ring 1 (pulsing wave)
  const r1 = 16 + pulse * 10;
  const alpha1 = Math.max(0.2, 0.8 - pulse * 0.5);
  ctx.beginPath();
  ctx.arc(ping.x, ping.y, r1, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(20, 184, 166, ${alpha1})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ring 2 (outer secondary wave)
  const pulse2 = (Math.sin(t / 200 + Math.PI / 2) + 1) / 2;
  const r2 = 22 + pulse2 * 12;
  const alpha2 = Math.max(0.1, 0.5 - pulse2 * 0.4);
  ctx.beginPath();
  ctx.arc(ping.x, ping.y, r2, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0, 229, 255, ${alpha2})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 4. Username Badge
  const bounds = getPingBadgeBounds(ping);
  if (bounds) {
    // Badge background and border
    ctx.fillStyle = PING_COLORS.badgeBg;
    ctx.strokeStyle = PING_COLORS.teal;
    ctx.lineWidth = 1;

    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    // Monospace username text
    const username = ping.username || 'Player';
    ctx.font = '11px monospace';
    ctx.fillStyle = PING_COLORS.badgeText;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(username, bounds.x + 8, bounds.y + bounds.height / 2);

    // Dismiss ✕ button
    ctx.beginPath();
    ctx.arc(bounds.closeX, bounds.closeY, bounds.closeRadius - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 184, 166, 0.25)';
    ctx.fill();

    ctx.font = '11px monospace';
    ctx.fillStyle = PING_COLORS.teal;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', bounds.closeX, bounds.closeY);
  }

  ctx.restore();
}

/**
 * Renders all pings from an array or a map keyed by userId.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array|Object} pings
 * @param {number} [timestamp=0]
 */
export function drawAllPings(ctx, pings, timestamp = 0) {
  if (!ctx || !pings) return;

  const pingList = Array.isArray(pings)
    ? pings
    : typeof pings === 'object'
    ? Object.values(pings)
    : [];

  for (const ping of pingList) {
    if (ping && typeof ping.x === 'number' && typeof ping.y === 'number') {
      drawPing(ctx, ping, timestamp);
    }
  }
}

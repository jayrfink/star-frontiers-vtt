/**
 * Determines the damage/wound red overlay tier for an RPG VTT token.
 *
 * @param {Object} token
 * @returns {'dead' | 'critical' | 'bloodied' | null}
 */
export function getTokenDamageOverlayState(token) {
  if (!token || token.vehicle_data) return null;

  const hasMaxHp =
    token.max_hp !== null &&
    token.max_hp !== undefined &&
    token.max_hp !== '' &&
    Number(token.max_hp) > 0;
  const hasCurHp =
    token.current_hp !== null &&
    token.current_hp !== undefined &&
    token.current_hp !== '';

  if (hasMaxHp && hasCurHp) {
    const cur = Number(token.current_hp);
    const max = Number(token.max_hp);
    if (Number.isFinite(cur) && Number.isFinite(max) && max > 0) {
      if (cur <= 0) return 'dead';
      const ratio = cur / max;
      if (ratio < 0.2) return 'critical';
      if (ratio < 0.5) return 'bloodied';
    }
  }

  const isWoundedEntry = (val) => {
    if (typeof val !== 'string') return false;
    const lower = val.trim().toLowerCase();
    return lower === 'wounded' || lower === '🩸';
  };

  const parseList = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  };

  const statusEffects = parseList(token.status_effects);
  const conditions = parseList(token.conditions);

  if (statusEffects.some(isWoundedEntry) || conditions.some(isWoundedEntry)) {
    return 'bloodied';
  }

  return null;
}

/**
 * Renders the red damage/wound overlay inside the token's circular bounds.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {'dead' | 'critical' | 'bloodied' | null} state
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 */
export function drawTokenDamageOverlay(ctx, state, cx, cy, radius) {
  if (!ctx || !state) return;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const bottomY = cy + radius;

  if (state === 'dead') {
    ctx.fillStyle = 'rgba(230, 15, 15, 0.62)';
    ctx.fill();
  } else if (state === 'critical') {
    const endY = cy - radius * 0.65;
    const grad = ctx.createLinearGradient(cx, bottomY, cx, endY);
    grad.addColorStop(0, 'rgba(255, 20, 20, 0.78)');
    grad.addColorStop(0.7, 'rgba(255, 20, 20, 0.42)');
    grad.addColorStop(1, 'rgba(255, 20, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  } else if (state === 'bloodied') {
    const endY = cy - radius * 0.1;
    const grad = ctx.createLinearGradient(cx, bottomY, cx, endY);
    grad.addColorStop(0, 'rgba(255, 25, 25, 0.68)');
    grad.addColorStop(0.6, 'rgba(255, 25, 25, 0.30)');
    grad.addColorStop(1, 'rgba(255, 25, 25, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  ctx.restore();
}

import { isCelestialToken } from './spaceTokens.js';

/**
 * Determines the damage overlay state for a ship token on the Space VTT.
 *
 * @param {Object} token - Space map token object
 * @param {Object} [ship] - Linked ship sheet (optional, from ships list)
 * @returns {'out_of_commission' | 'critical' | 'heavy' | 'light' | null}
 */
export function getShipDamageOverlayState(token, ship = null) {
  if (!token || isCelestialToken(token)) return null;

  // Extract current and max HP / Hull Points from token or linked ship
  const hasTokenCur =
    token.current_hp !== null &&
    token.current_hp !== undefined &&
    token.current_hp !== '';
  const hasTokenMax =
    token.max_hp !== null &&
    token.max_hp !== undefined &&
    token.max_hp !== '' &&
    Number(token.max_hp) > 0;

  const hasShipCur =
    ship &&
    ship.current_hp !== null &&
    ship.current_hp !== undefined &&
    ship.current_hp !== '';
  const hasShipMax =
    ship &&
    ship.hull_points !== null &&
    ship.hull_points !== undefined &&
    ship.hull_points !== '' &&
    Number(ship.hull_points) > 0;

  let curHp = null;
  let maxHp = null;

  if (hasTokenCur && hasTokenMax) {
    curHp = Number(token.current_hp);
    maxHp = Number(token.max_hp);
  } else if (hasShipCur && hasShipMax) {
    curHp = Number(ship.current_hp);
    maxHp = Number(ship.hull_points);
  } else if (hasTokenCur && hasShipMax) {
    curHp = Number(token.current_hp);
    maxHp = Number(ship.hull_points);
  } else if (hasShipCur && hasTokenMax) {
    curHp = Number(ship.current_hp);
    maxHp = Number(token.max_hp);
  }

  if (curHp !== null && maxHp !== null && Number.isFinite(curHp) && Number.isFinite(maxHp) && maxHp > 0) {
    if (curHp <= 0) {
      return 'out_of_commission';
    }
    const ratio = curHp / maxHp;
    if (ratio < 0.2) {
      return 'critical';
    }
    if (ratio < 0.5) {
      return 'heavy';
    }
    if (ratio < 1.0) {
      return 'light';
    }
    return null;
  }

  // Check conditions and status effects if no numeric HP is available
  const parseList = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim()) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return [val.trim()];
    }
    return [];
  };

  const statusEffects = parseList(token.status_effects);
  const conditions = parseList(token.conditions);
  const allEffects = [...statusEffects, ...conditions].map((v) =>
    typeof v === 'string' ? v.trim().toLowerCase() : ''
  );

  if (
    allEffects.some((e) =>
      ['destroyed', 'hulk', 'dead', 'out of commission', 'derelict', 'wreck'].includes(e)
    )
  ) {
    return 'out_of_commission';
  }

  if (allEffects.some((e) => ['critical', 'catastrophic'].includes(e))) {
    return 'critical';
  }

  if (
    allEffects.some((e) =>
      ['damaged', '💥', 'adrift', 'disabled', 'burning', '🔥'].includes(e)
    )
  ) {
    return 'heavy';
  }

  return null;
}

/**
 * Renders the damage overlay for a space ship token inside its circular bounds.
 * - Out of Commission (0 HP): light grey translucent covering the entire token.
 * - Damaged (> 0 HP, < Max HP): gradual translucent orange linear gradient rising from bottom up.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {'out_of_commission' | 'critical' | 'heavy' | 'light' | null} state
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} radius - Token radius
 * @param {number} [ratio] - Optional exact ratio of curHp/maxHp (0 to 1) for continuous gradient
 */
export function drawShipDamageOverlay(ctx, state, cx, cy, radius, ratio = null) {
  if (!ctx || !state) return;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const bottomY = cy + radius;

  if (state === 'out_of_commission' || state === 'dead') {
    // When a ship reaches 0 hull points a light grey translucent covers the entire token showing it is out of commission
    ctx.fillStyle = 'rgba(210, 218, 226, 0.62)';
    ctx.fill();
  } else if (ratio !== null && Number.isFinite(ratio) && ratio > 0 && ratio < 1.0) {
    // Continuous gradual translucent orange
    const damageFraction = 1.0 - ratio;
    const endY = bottomY - 2 * radius * Math.min(0.9, Math.max(0.2, damageFraction * 0.95));
    const alpha = Math.min(0.85, 0.52 + damageFraction * 0.32);
    const grad = ctx.createLinearGradient(cx, bottomY, cx, endY);
    grad.addColorStop(0, `rgba(255, 115, 0, ${alpha.toFixed(2)})`);
    grad.addColorStop(0.65, `rgba(255, 140, 25, ${(alpha * 0.48).toFixed(2)})`);
    grad.addColorStop(1, 'rgba(255, 160, 40, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  } else if (state === 'critical') {
    // Critical damage (< 20% HP)
    const endY = cy - radius * 0.70;
    const grad = ctx.createLinearGradient(cx, bottomY, cx, endY);
    grad.addColorStop(0, 'rgba(255, 110, 0, 0.82)');
    grad.addColorStop(0.65, 'rgba(255, 140, 25, 0.45)');
    grad.addColorStop(1, 'rgba(255, 160, 40, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  } else if (state === 'heavy' || state === 'bloodied') {
    // Heavy damage (< 50% HP)
    const endY = cy - radius * 0.15;
    const grad = ctx.createLinearGradient(cx, bottomY, cx, endY);
    grad.addColorStop(0, 'rgba(255, 125, 10, 0.72)');
    grad.addColorStop(0.6, 'rgba(255, 150, 30, 0.35)');
    grad.addColorStop(1, 'rgba(255, 170, 50, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  } else if (state === 'light') {
    // Light damage (< 100% HP)
    const endY = cy + radius * 0.25;
    const grad = ctx.createLinearGradient(cx, bottomY, cx, endY);
    grad.addColorStop(0, 'rgba(255, 135, 15, 0.60)');
    grad.addColorStop(0.5, 'rgba(255, 155, 35, 0.25)');
    grad.addColorStop(1, 'rgba(255, 175, 60, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  ctx.restore();
}

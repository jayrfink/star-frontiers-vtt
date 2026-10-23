export const FLIP_AND_BURN_MIN_MR = 3;
export const MULTI_TURN_FLIP_STATUS = '🔄 Flip & Burn (Turn 1/2)';

/**
 * Any ship with an MR of 3 or above (MR >= 3 / greater than 2) can execute a 1-turn Flip and Burn.
 * @param {number|string} mr
 * @returns {boolean}
 */
export function canFlipAndBurn(mr) {
  const n = Number(mr);
  return Number.isFinite(n) && n >= 3;
}

/**
 * Ships with MR < 3 (MR 1 or 2) can perform a Multi-Turn Hi-G Flip across 2 combat turns.
 * @param {number|string} mr
 * @returns {boolean}
 */
export function canMultiTurnFlip(mr) {
  const n = Number(mr);
  return Number.isFinite(n) && n > 0 && n < 3;
}

/**
 * Reverses a ship's heading by 180 degrees (normalized to 0..359).
 * @param {number} currentRotation
 * @returns {number}
 */
export function calculateFlipHeading(currentRotation) {
  const cur = Number(currentRotation) || 0;
  return (((cur + 180) % 360) + 360) % 360;
}

/**
 * Rotates a ship's heading by 90 degrees for a multi-turn flip stage.
 * @param {number} currentRotation
 * @param {number} deltaDegrees default 90
 * @returns {number}
 */
export function calculateTurnHeading(currentRotation, deltaDegrees = 90) {
  const cur = Number(currentRotation) || 0;
  return (((cur + deltaDegrees) % 360) + 360) % 360;
}

/**
 * Strapped-in PCs who fail their STA check pass out for 1d10 * 10 seconds.
 * @param {number} dieValue (1-10)
 * @returns {number}
 */
export function calculateBlackoutSeconds(dieValue) {
  const d = Math.max(1, Math.min(10, Math.round(Number(dieValue) || 1)));
  return d * 10;
}

/**
 * Formats the tactical roll log announcement for a Flip and Burn maneuver.
 * @param {string} shipName
 * @param {number} newHeading
 * @returns {string}
 */
export function formatFlipAndBurnAlert(shipName, newHeading) {
  const name = shipName || 'Ship';
  return `Heading reversed to ${newHeading}°. Strapped-in PCs aboard ${name} must pass a STA check (d% <= STA) or pass out for 1d10×10 seconds!`;
}

/**
 * Formats the tactical roll log announcement for multi-turn Flip and Burn (MR < 3).
 * @param {string} shipName
 * @param {number} turn (1 or 2)
 * @param {number} newHeading
 * @returns {string}
 */
export function formatMultiTurnAlert(shipName, turn, newHeading) {
  const name = shipName || 'Ship';
  if (turn === 1) {
    return `Turn 1/2 of Multi-Turn Flip initiated on ${name}. Heading turned to ${newHeading}°. Strapped-in PCs must pass STA Check #1 (d% <= STA) or pass out for 1d10×10 seconds!`;
  }
  return `Turn 2/2 completed for ${name}. Full 180° reversal achieved (heading: ${newHeading}°). Strapped-in PCs must pass STA Check #2 (d% <= STA) or pass out for 1d10×10 seconds!`;
}

export const FLIP_AND_BURN_MIN_MR = 3;

/**
 * Any ship with an MR of 3 or above (MR >= 3 / greater than 2) can execute a Flip and Burn.
 * @param {number|string} mr
 * @returns {boolean}
 */
export function canFlipAndBurn(mr) {
  const n = Number(mr);
  return Number.isFinite(n) && n >= 3;
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

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
 * Standard 1-turn in-hex Flip and Burn is available for ships with MR >= 3.
 * No crew STA check required under rotational independence.
 * @param {number|string} mr
 * @returns {boolean}
 */
export function canStandardFlip(mr) {
  return canFlipAndBurn(mr);
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
 * Lumbering Flip (2 turns, 90°/turn at drift velocity, no crew check) for MR 1-2 vessels.
 * @param {number|string} mr
 * @returns {boolean}
 */
export function canLumberingFlip(mr) {
  return canMultiTurnFlip(mr);
}

/**
 * Emergency Snap Flip (1 turn, overloaded RCS, requires pilot check and crew STA check) for MR 1-2 vessels.
 * @param {number|string} mr
 * @returns {boolean}
 */
export function canSnapFlip(mr) {
  return canMultiTurnFlip(mr);
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
 * Legacy helper maintained for backward compatibility.
 * @param {number} dieValue (1-10)
 * @returns {number}
 */
export function calculateBlackoutSeconds(dieValue) {
  const d = Math.max(1, Math.min(10, Math.round(Number(dieValue) || 1)));
  return d * 10;
}

/**
 * Calculates modified STA target % for G-force resilience checks.
 *
 * Rules:
 * - Linear Deceleration: Safe up to 2 hexes ΔV (0%). High-G burns (ΔV >= 3) suffer -10% per hex > 2.
 * - Posture: Crash couch / strapped-in (+20%), Braced (0%), Unbraced (-20%).
 * - Extremity Whip (Snap Flips): Bow/Stern (-10%), Midships (0%).
 * - Target clamped between 1 and 99.
 *
 * @param {number|string} baseSta
 * @param {Object} [options={}]
 * @param {number} [options.deltaV=0]
 * @param {string} [options.posture='braced']
 * @param {string} [options.location='midships']
 * @param {string} [options.extremity]
 * @param {number} [options.extremityMod]
 * @returns {{ target: number, gPenalty: number, postureMod: number, extremityMod: number, breakdown: string }}
 */
export function calculateStaCheckTarget(baseSta, options = {}) {
  const sta = Math.round(Number(baseSta) || 0);

  // ΔV linear deceleration penalty: Safe threshold 1-2 hexes. ΔV >= 3 is -10% per hex > 2.
  const dv = Number(options.deltaV) || 0;
  const gPenalty = dv >= 3 ? -((dv - 2) * 10) : 0;

  // Posture modifier: Crash couch (+20%), Braced (0%), Unbraced (-20%)
  const posture = (options.posture || 'braced').toLowerCase();
  let postureMod = 0;
  if (posture.includes('couch') || posture.includes('strap')) {
    postureMod = 20;
  } else if (
    posture.includes('unbraced') ||
    posture.includes('moving') ||
    posture.includes('boarding')
  ) {
    postureMod = -20;
  } else {
    postureMod = 0;
  }

  // Extremity / Centrifugal whip modifier (-10% for bow/stern, 0% for midships)
  let extremityMod = 0;
  if (typeof options.extremityMod === 'number') {
    extremityMod = options.extremityMod;
  } else {
    const loc = (options.location || options.extremity || '').toLowerCase();
    if (loc === 'bow' || loc === 'stern') {
      extremityMod = -10;
    } else {
      extremityMod = 0;
    }
  }

  const rawTarget = sta + gPenalty + postureMod + extremityMod;
  const target = Math.max(1, Math.min(99, rawTarget));

  const breakdownParts = [`Base STA (${sta}%)`];
  if (gPenalty !== 0) breakdownParts.push(`Burn ΔV (${gPenalty}%)`);
  if (postureMod !== 0) breakdownParts.push(`Posture (${postureMod > 0 ? '+' : ''}${postureMod}%)`);
  if (extremityMod !== 0) breakdownParts.push(`Extremity Whip (${extremityMod > 0 ? '+' : ''}${extremityMod}%)`);

  const breakdown = `${breakdownParts.join(' ')} = ${target}%`;

  return {
    target,
    gPenalty,
    postureMod,
    extremityMod,
    breakdown,
  };
}

/**
 * Resolves STA check outcome and G-LOC / impact effects.
 *
 * Rules:
 * - Roll <= target: Success! (no adverse effects, condition: 'Normal')
 * - Roll > target: Margin of failure = roll - target
 *   - Margin 01–19 (Grey-Out / G-Stun):
 *     - Secured crew (couch or braced): Stunned for 1 turn, -20% to all checks on following turn.
 *     - Unbraced crew: Knocked prone, 1d3 hull-impact damage, stunned for 1 turn (-20% following turn).
 *   - Margin 20+ (Full G-LOC Blackout):
 *     - Secured crew: Passes out cold for 1d6 turns (6–36s).
 *     - Unbraced crew: Hurled 1d3m toward ship's bow, 1d6 impact damage, passes out cold for 1d6 turns.
 *
 * @param {number} roll (d100 roll: 1-100)
 * @param {number} targetSta (effective STA %)
 * @param {string} [posture='braced']
 * @returns {{
 *   success: boolean,
 *   margin: number,
 *   severity: 'none' | 'stun' | 'g-loc',
 *   condition: string,
 *   stunnedTurns: number,
 *   checkPenalty: number,
 *   damageDice: string | null,
 *   unconsciousTurnsDice: string | null,
 *   displacementMetersDice: string | null,
 *   summaryText: string
 * }}
 */
export function resolveStaCheckResult(roll, targetSta, posture = 'braced') {
  const r = Number(roll) || 1;
  const target = Number(targetSta) || 1;
  const post = (posture || 'braced').toLowerCase();
  const isUnbraced =
    post.includes('unbraced') ||
    post.includes('moving') ||
    post.includes('boarding');

  if (r <= target) {
    return {
      success: true,
      margin: 0,
      severity: 'none',
      condition: 'Normal',
      stunnedTurns: 0,
      checkPenalty: 0,
      damageDice: null,
      unconsciousTurnsDice: null,
      displacementMetersDice: null,
      summaryText: 'Pass! Crew member withstands G-forces with no adverse effects.',
    };
  }

  const margin = r - target;

  if (margin < 20) {
    // Margin 01–19: Grey-Out / G-Stun
    if (isUnbraced) {
      return {
        success: false,
        margin,
        severity: 'stun',
        condition: 'G-Stun (Prone)',
        stunnedTurns: 1,
        checkPenalty: -20,
        damageDice: '1d3',
        unconsciousTurnsDice: null,
        displacementMetersDice: null,
        summaryText:
          'Grey-Out / G-Stun: Knocked prone in current position, takes 1d3 hull-impact damage, and stunned for 1 turn (-20% to actions next turn).',
      };
    }

    return {
      success: false,
      margin,
      severity: 'stun',
      condition: 'G-Stun',
      stunnedTurns: 1,
      checkPenalty: -20,
      damageDice: null,
      unconsciousTurnsDice: null,
      displacementMetersDice: null,
      summaryText:
        'Grey-Out / G-Stun: Secured crew member stunned for 1 turn (cannot take actions) and suffers -20% penalty to all checks on following turn.',
    };
  }

  // Margin 20+: Full G-LOC Blackout
  if (isUnbraced) {
    return {
      success: false,
      margin,
      severity: 'g-loc',
      condition: 'G-LOC Blackout (Hurled)',
      stunnedTurns: 0,
      checkPenalty: 0,
      damageDice: '1d6',
      unconsciousTurnsDice: '1d6',
      displacementMetersDice: '1d3',
      summaryText:
        "Full G-LOC Blackout: Hurled 1d3m toward ship's bow, takes 1d6 impact damage, and passes out cold for 1d6 turns (6–36s).",
    };
  }

  return {
    success: false,
    margin,
    severity: 'g-loc',
    condition: 'G-LOC Blackout',
    stunnedTurns: 0,
    checkPenalty: 0,
    damageDice: null,
    unconsciousTurnsDice: '1d6',
    displacementMetersDice: null,
    summaryText:
      'Full G-LOC Blackout: Secured crew member passes out cold in crash couch / station for 1d6 turns (6–36s).',
  };
}

/**
 * Formats tactical roll log announcement for a Standard Flip (MR >= 3).
 * @param {string} shipName
 * @param {number} newHeading
 * @returns {string}
 */
export function formatStandardFlipAlert(shipName, newHeading) {
  const name = shipName || 'Ship';
  return `${name}: Standard Flip completed (heading: ${newHeading}°). 1-turn in-hex pivot executed cleanly; no crew STA check required.`;
}

/**
 * Formats tactical roll log announcement for a Lumbering Flip (MR 1-2).
 * @param {string} shipName
 * @param {number} turn (1 or 2)
 * @param {number} newHeading
 * @returns {string}
 */
export function formatLumberingFlipAlert(shipName, turn, newHeading) {
  const name = shipName || 'Ship';
  if (turn === 1) {
    return `${name}: Lumbering Flip (Turn 1/2). Ship drifts along vector while rotating 90° (heading: ${newHeading}°). No crew STA check required.`;
  }
  return `${name}: Lumbering Flip (Turn 2/2 completed). Full 180° reversal achieved (heading: ${newHeading}°). No crew STA check required.`;
}

/**
 * Formats tactical roll log announcement for an Emergency Snap Flip (MR 1-2).
 * @param {string} shipName
 * @param {number} newHeading
 * @returns {string}
 */
export function formatSnapFlipAlert(shipName, newHeading) {
  const name = shipName || 'Ship';
  return `${name}: Emergency Snap Flip executed! Heading reversed to ${newHeading}°. RCS thrusters overloaded (1 Turn). Pilot check required; crew must make STA checks (-10% Bow/Stern centrifugal whip)!`;
}

/**
 * Formats tactical roll log announcement for a Braking Burn (linear deceleration).
 * @param {string} shipName
 * @param {number} deltaV
 * @returns {string}
 */
export function formatBrakingBurnAlert(shipName, deltaV) {
  const name = shipName || 'Ship';
  const dv = Number(deltaV) || 0;
  if (dv <= 2) {
    return `${name}: Braking Burn (ΔV ${dv} hexes). Safe deceleration within inertial compensator limits; no crew STA check required.`;
  }
  const penalty = (dv - 2) * 10;
  return `${name}: HIGH-G Braking Burn (ΔV ${dv} hexes)! Extreme linear deceleration (-${penalty}% STA check penalty). All crew must make STA checks to resist G-LOC!`;
}

/**
 * Formats tactical roll log announcement for a crew member's G-load STA check result.
 * @param {string} crewName
 * @param {Object} checkResult (produced by resolveStaCheckResult)
 * @returns {string}
 */
export function formatGLocResultAlert(crewName, checkResult) {
  const name = crewName || 'Crew member';
  if (checkResult.success) {
    return `${name}: STA Check SUCCESS. Withstands G-forces with no adverse effects.`;
  }
  return `${name}: STA Check FAILED (Margin: ${checkResult.margin}, Condition: ${checkResult.condition}). ${checkResult.summaryText}`;
}

/**
 * Legacy formatter for backward compatibility.
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
 * Legacy formatter for backward compatibility.
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

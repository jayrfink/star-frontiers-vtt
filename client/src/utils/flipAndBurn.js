export const FLIP_AND_BURN_MIN_MR = 3;
export const MULTI_TURN_FLIP_STATUS = '🔄 Flip & Burn (Turn 1/2)';
export const SAFE_COMPENSATOR_DELTA_V = 3;

/**
 * Native Star Frontiers d10/d100 roll generator for 1-5 light rolls: ceil(1d10 / 2).
 * @param {Function} [randomFn=Math.random]
 * @returns {number} integer 1..5
 */
export function rollD5(randomFn = Math.random) {
  const d10 = Math.floor(randomFn() * 10) + 1;
  return Math.ceil(d10 / 2);
}

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
 * - Linear Deceleration: Safe up to 3 hexes ΔV (0%). High-G burns (ΔV > 3) suffer -10% per hex > 3.
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

  // ΔV linear deceleration penalty: Safe threshold 1-3 hexes. ΔV > 3 is -10% per hex > 3.
  const dv = Number(options.deltaV) || 0;
  const gPenalty = dv > SAFE_COMPENSATOR_DELTA_V ? -((dv - SAFE_COMPENSATOR_DELTA_V) * 10) : 0;

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
 *     - Unbraced crew: Knocked prone, ceil(1d10 / 2) hull-impact damage, stunned for 1 turn (-20% following turn).
 *   - Margin 20+ (Full G-LOC Blackout):
 *     - Secured crew: Passes out cold for ceil(1d10 / 2) turns (6–30s).
 *     - Unbraced crew: Hurled ceil(1d10 / 2)m toward ship's bow, 1d10 impact damage, passes out cold for ceil(1d10 / 2) turns.
 *
 * @param {number} roll (d100 roll: 1-100)
 * @param {number} targetSta (effective STA %)
 * @param {string} [posture='braced']
 * @returns {{
 *   success: boolean,
 *   margin: number,
 *   severity: 'none' | 'stun' | 'g-loc',
 *   condition: string,
 *   isProne: boolean,
 *   stunnedTurns: number,
 *   checkPenalty: number,
 *   damageDice: string | null,
 *   unconsciousTurnsDice: string | null,
 *   displacementMetersDice: string | null,
 *   summaryText: string
 * }}
 */
export function resolveStaCheckResult(roll, targetSta, posture = 'braced') {
  const r = Number.isFinite(Number(roll)) ? Number(roll) : 1;
  const target = Number.isFinite(Number(targetSta)) ? Number(targetSta) : 1;
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
      isProne: false,
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
        isProne: true,
        stunnedTurns: 1,
        checkPenalty: -20,
        damageDice: 'ceil(1d10 / 2)',
        unconsciousTurnsDice: null,
        displacementMetersDice: null,
        summaryText:
          'Grey-Out / G-Stun: Knocked prone in current position, takes ceil(1d10 / 2) hull-impact damage, and stunned for 1 turn (-20% to actions next turn).',
      };
    }

    return {
      success: false,
      margin,
      severity: 'stun',
      condition: 'G-Stun',
      isProne: false,
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
      isProne: true,
      stunnedTurns: 0,
      checkPenalty: 0,
      damageDice: '1d10',
      unconsciousTurnsDice: 'ceil(1d10 / 2)',
      displacementMetersDice: 'ceil(1d10 / 2)',
      summaryText:
        "Full G-LOC Blackout: Hurled ceil(1d10 / 2)m toward ship's bow, takes 1d10 impact damage, and passes out cold for ceil(1d10 / 2) turns (6–30s).",
    };
  }

  return {
    success: false,
    margin,
    severity: 'g-loc',
    condition: 'G-LOC Blackout',
    isProne: false,
    stunnedTurns: 0,
    checkPenalty: 0,
    damageDice: null,
    unconsciousTurnsDice: 'ceil(1d10 / 2)',
    displacementMetersDice: null,
    summaryText:
      'Full G-LOC Blackout: Secured crew member passes out cold in crash couch / station for ceil(1d10 / 2) turns (6–30s).',
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
  if (dv <= SAFE_COMPENSATOR_DELTA_V) {
    return `${name}: Braking Burn (ΔV ${dv} hexes). Safe deceleration within inertial compensator limits; no crew STA check required.`;
  }
  const penalty = (dv - SAFE_COMPENSATOR_DELTA_V) * 10;
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

/**
 * Calculates compound G-load for powered Oberth maneuvers.
 * Total ΔV = Base Gravity ΔV + (ADF spent × 2).
 * @param {number} baseGravityDeltaV
 * @param {number} adfSpent
 * @returns {number}
 */
export function calculateCompoundDeltaV(baseGravityDeltaV = 0, adfSpent = 0) {
  const base = Math.max(0, Number(baseGravityDeltaV) || 0);
  const adf = Math.max(0, Number(adfSpent) || 0);
  return base + adf * 2;
}

/**
 * Calculates orbital slingshot parameters around celestial bodies.
 *
 * Rules:
 * - Minimum entry speed: 4 hexes/turn (40,000 km/turn).
 * - Moon:
 *   - Distance 0 (Crater Skim): Bonus MR +1, Free Exit Speed +1, Base ΔV 2, Pilot Check (penalty -5% per speed > 8).
 *   - Distance > 0: Ineligible (shallow well).
 * - Planet:
 *   - Distance 1 (Outer Well): Bonus MR +1, Free Exit Speed +1, Base ΔV 1, No Pilot Check.
 *   - Distance 0 (Low-Orbit Skim): Bonus MR +2, Free Exit Speed +2, Base ΔV 3, Pilot Check (penalty -5% per speed > 6).
 *   - Distance > 1: Ineligible.
 * - Gas Giant:
 *   - Distance 1-2 (Outer Well): Bonus MR +1, Free Exit Speed +1, Base ΔV 2, No Pilot Check.
 *   - Distance 0 (Deep Skim): Bonus MR +3, Free Exit Speed +3, Base ΔV 4, Pilot Check at -20% (-5% per speed > 6).
 *   - Distance > 2: Ineligible.
 * - Oberth ADF Burn:
 *   - Only valid at Distance 0: Each 1 ADF spent yields +2 Exit Speed and adds +2 to ΔV.
 *   - Outside Distance 0: ADF burn is not multiplied by Oberth effect (Oberth Exit Speed = 0).
 * - High-G G-Load:
 *   - Total ΔV > 3 triggers High-G penalty: (Total ΔV - 3) * -10%.
 *
 * @param {string} bodyType ('MOON', 'PLANET', 'GAS_GIANT')
 * @param {number} distanceHexes
 * @param {number} entrySpeed
 * @param {number} [adfSpent=0]
 * @returns {Object}
 */
export function calculateSlingshotParameters(bodyType, distanceHexes, entrySpeed, adfSpent = 0) {
  const speed = Math.round(Number(entrySpeed) || 0);
  if (speed < 4) {
    return {
      eligible: false,
      reason: 'Minimum entry speed 4 hexes/turn required',
    };
  }

  const rawType = String(bodyType || '').toUpperCase().trim().replace(/[-\s]+/g, '_');
  let normalizedType = rawType;
  if (rawType.includes('MOON')) normalizedType = 'MOON';
  else if (rawType.includes('GAS') || rawType.includes('GIANT')) normalizedType = 'GAS_GIANT';
  else if (rawType.includes('PLANET')) normalizedType = 'PLANET';

  const dist = Math.max(0, Math.round(Number(distanceHexes) || 0));
  const adf = Math.max(0, Math.round(Number(adfSpent) || 0));

  let zoneName = '';
  let bonusMr = 0;
  let freeExitSpeed = 0;
  let baseGravityDeltaV = 0;
  let requiresPilotCheck = false;
  let pilotModifier = 0;

  if (normalizedType === 'MOON') {
    if (dist === 0) {
      zoneName = 'Crater Skim';
      bonusMr = 1;
      freeExitSpeed = 1;
      baseGravityDeltaV = 2;
      requiresPilotCheck = true;
      pilotModifier = speed > 8 ? (speed - 8) * -5 : 0;
    } else {
      return {
        eligible: false,
        reason: 'Moon gravity well is too shallow beyond distance 0',
      };
    }
  } else if (normalizedType === 'PLANET') {
    if (dist === 0) {
      zoneName = 'Low-Orbit Skim';
      bonusMr = 2;
      freeExitSpeed = 2;
      baseGravityDeltaV = 3;
      requiresPilotCheck = true;
      pilotModifier = speed > 6 ? (speed - 6) * -5 : 0;
    } else if (dist === 1) {
      zoneName = 'Outer Well';
      bonusMr = 1;
      freeExitSpeed = 1;
      baseGravityDeltaV = 1;
      requiresPilotCheck = false;
      pilotModifier = 0;
    } else {
      return {
        eligible: false,
        reason: 'Outside planet gravitational influence (max distance 1)',
      };
    }
  } else if (normalizedType === 'GAS_GIANT') {
    if (dist === 0) {
      zoneName = 'Deep Skim';
      bonusMr = 3;
      freeExitSpeed = 3;
      baseGravityDeltaV = 4;
      requiresPilotCheck = true;
      pilotModifier = -20 + (speed > 6 ? (speed - 6) * -5 : 0);
    } else if (dist === 1 || dist === 2) {
      zoneName = 'Outer Well';
      bonusMr = 1;
      freeExitSpeed = 1;
      baseGravityDeltaV = 2;
      requiresPilotCheck = false;
      pilotModifier = 0;
    } else {
      return {
        eligible: false,
        reason: 'Outside gas giant gravitational influence (max distance 2)',
      };
    }
  } else {
    return {
      eligible: false,
      reason: `Unsupported celestial body type: ${bodyType}`,
    };
  }

  // Oberth burn only applies inside Distance 0 hex
  const oberthExitSpeed = dist === 0 ? adf * 2 : 0;
  const totalExitSpeed = speed + freeExitSpeed + oberthExitSpeed;
  const totalDeltaV = calculateCompoundDeltaV(baseGravityDeltaV, dist === 0 ? adf : 0);

  const isHighG = totalDeltaV > SAFE_COMPENSATOR_DELTA_V;
  const gPenalty = isHighG ? (totalDeltaV - SAFE_COMPENSATOR_DELTA_V) * -10 : 0;

  const breakdownParts = [
    `${zoneName} (${normalizedType}): Entry speed ${speed}`,
    `Free exit +${freeExitSpeed}`,
  ];
  if (oberthExitSpeed > 0) {
    breakdownParts.push(`Oberth burn +${oberthExitSpeed} (${adf} ADF)`);
  }
  breakdownParts.push(`-> Exit speed ${totalExitSpeed}`);
  breakdownParts.push(
    `Total ΔV ${totalDeltaV}${isHighG ? ` (${gPenalty}% STA Check penalty)` : ' (Safe)'}`
  );
  breakdownParts.push(`Bonus MR +${bonusMr}`);

  const breakdownText = breakdownParts.join(', ');

  return {
    eligible: true,
    zoneName,
    bonusMr,
    freeExitSpeed,
    baseGravityDeltaV,
    oberthExitSpeed,
    totalExitSpeed,
    totalDeltaV,
    isHighG,
    gPenalty,
    requiresPilotCheck,
    pilotModifier,
    breakdownText,
  };
}

/**
 * Resolves Distance 0 pilot check hazards for slingshot maneuvers.
 *
 * Rules:
 * - Roll <= targetSkill: Success! Gravity assist achieved with no hazards.
 * - Margin 01–19 (Minor Hazard / Atmospheric Skip):
 *   - Loses free exit speed bonus.
 *   - Moon: 1d10 hull damage (defensive screens absorb).
 *   - Planet / Gas Giant: 2d10 structural hull damage (ignores screens).
 *   - Unbraced crew knocked Prone taking ceil(1d10 / 2) damage.
 * - Margin 20+ (Major Hazard / Impact or Capture):
 *   - Loses half speed (speedMultiplier = 0.5).
 *   - Moon: 3d10 structural damage (ignores screens), scatter 1 hex-face (60°).
 *   - Planet / Gas Giant: 4d10 structural damage (ignores screens), trapped in hex, requires 2 ADF escape.
 *   - Unbraced crew knocked Prone.
 *
 * @param {number} roll
 * @param {number} targetSkill
 * @param {string} bodyType
 * @returns {Object}
 */
export function resolveSlingshotPilotCheck(roll, targetSkill, bodyType) {
  const r = Number.isFinite(Number(roll)) ? Number(roll) : 1;
  const target = Number.isFinite(Number(targetSkill)) ? Number(targetSkill) : 1;
  const rawType = String(bodyType || '').toUpperCase().trim().replace(/[-\s]+/g, '_');
  const isMoon = rawType.includes('MOON');

  if (r <= target) {
    return {
      success: true,
      margin: 0,
      isMinorHazard: false,
      isMajorHazard: false,
      hullDamageDice: null,
      ignoresScreens: false,
      crewDamageDice: null,
      crewProne: false,
      speedMultiplier: 1,
      scatterFaces: 0,
      trappedInHex: false,
      requiresEscapeAdf: 0,
      statusEffect: null,
      losesFreeExitSpeed: false,
      summaryText: 'Slingshot maneuver executed flawlessly! Gravity assist achieved with no hazard.',
    };
  }

  const margin = r - target;

  if (margin < 20) {
    // Minor Hazard (Margin 01-19)
    const hullDamageDice = isMoon ? '1d10' : '2d10';
    const ignoresScreens = !isMoon;
    const zoneDesc = isMoon ? 'Moon Crater Skim' : (rawType.includes('GAS') ? 'Gas Giant Deep Skim' : 'Planet Low-Orbit Skim');

    return {
      success: false,
      margin,
      isMinorHazard: true,
      isMajorHazard: false,
      hullDamageDice,
      ignoresScreens,
      crewDamageDice: 'ceil(1d10 / 2)',
      crewProne: true,
      speedMultiplier: 1,
      scatterFaces: 0,
      trappedInHex: false,
      requiresEscapeAdf: 0,
      statusEffect: null,
      losesFreeExitSpeed: true,
      summaryText: `Minor Hazard (${zoneDesc}): Free exit speed lost. Hull takes ${hullDamageDice} ${ignoresScreens ? 'structural ' : ''}damage${ignoresScreens ? ' (ignores screens)' : ' (screens absorb)'}. Unbraced crew knocked prone taking ceil(1d10 / 2) damage.`,
    };
  }

  // Major Hazard (Margin 20+)
  if (isMoon) {
    return {
      success: false,
      margin,
      isMinorHazard: false,
      isMajorHazard: true,
      hullDamageDice: '3d10',
      ignoresScreens: true,
      crewDamageDice: '1d10',
      crewProne: true,
      speedMultiplier: 0.5,
      scatterFaces: 1,
      trappedInHex: false,
      requiresEscapeAdf: 0,
      statusEffect: null,
      losesFreeExitSpeed: true,
      summaryText: 'Major Hazard (Moon Ridge Impact): Ship loses half speed, deflects 60° (scatter 1 face), and takes 3d10 structural damage (ignores screens). Unbraced crew knocked prone.',
    };
  }

  const hazardName = rawType.includes('GAS') ? 'Gas Giant Gravity Capture' : 'Planet Sub-Orbital Decay';
  return {
    success: false,
    margin,
    isMinorHazard: false,
    isMajorHazard: true,
    hullDamageDice: '4d10',
    ignoresScreens: true,
    crewDamageDice: '1d10',
    crewProne: true,
    speedMultiplier: 0.5,
    scatterFaces: 0,
    trappedInHex: true,
    requiresEscapeAdf: 2,
    statusEffect: 'ORBITAL_DECAY_REQUIRES_2_ADF_ESCAPE',
    losesFreeExitSpeed: true,
    summaryText: `Major Hazard (${hazardName}): Ship loses half speed and is trapped in hex with status ORBITAL_DECAY_REQUIRES_2_ADF_ESCAPE! Takes 4d10 structural damage (ignores screens). Unbraced crew knocked prone.`,
  };
}

/**
 * Formats tactical roll log announcement for a successful slingshot maneuver.
 * @param {string} shipName
 * @param {string} bodyType
 * @param {string} zoneName
 * @param {number} bonusMr
 * @param {number} exitSpeed
 * @param {number} totalDeltaV
 * @returns {string}
 */
export function formatSlingshotSuccessAlert(shipName, bodyType, zoneName, bonusMr, exitSpeed, totalDeltaV) {
  const name = shipName || 'Ship';
  const dv = Number(totalDeltaV) || 0;
  const isHighG = dv > SAFE_COMPENSATOR_DELTA_V;
  const penalty = isHighG ? (dv - SAFE_COMPENSATOR_DELTA_V) * 10 : 0;
  const gNote = isHighG
    ? ` HIGH-G LOAD (${dv} ΔV, -${penalty}% STA check penalty)! Crew STA checks required.`
    : ` (${dv} ΔV, Safe within compensators).`;
  return `${name}: Orbital Slingshot SUCCESS around ${bodyType} (${zoneName})! Exit speed: ${exitSpeed} hexes/turn (+${bonusMr} MR turn bonus).${gNote}`;
}

/**
 * Formats tactical roll log announcement for a slingshot hazard.
 * @param {string} shipName
 * @param {string} bodyType
 * @param {boolean} isMajor
 * @param {string} [damageDice]
 * @param {string} [summary]
 * @returns {string}
 */
export function formatSlingshotHazardAlert(shipName, bodyType, isMajor, damageDice, summary) {
  const name = shipName || 'Ship';
  const severity = isMajor ? 'CRITICAL HAZARD' : 'HAZARD';
  const dmg = damageDice ? ` Takes ${damageDice} hull damage.` : '';
  return `${name}: Orbital Slingshot ${severity} around ${bodyType}!${dmg} ${summary || ''}`.trim();
}

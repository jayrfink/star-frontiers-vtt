/**
 * Processes an array of settled die objects from @3d-dice/dice-box for damage rolls.
 * In Star Frontiers, d10 damage values range from 1 to 10. If the physics engine
 * returns 0 on a 10-sided die face, it represents a 10.
 *
 * @param {Array<{ value?: number }>} results
 * @returns {{ total: number, dice: number[], count: number }}
 */
export function calculateDamageRoll(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return { total: 0, dice: [], count: 0 };
  }

  const flatResults = results.flat(Infinity);
  const dice = flatResults.map((d) => {
    const rawVal = Number(d?.value) || 0;
    return rawVal === 0 ? 10 : rawVal;
  });

  const total = dice.reduce((sum, val) => sum + val, 0);

  return {
    total,
    dice,
    count: dice.length
  };
}

/**
 * Processes settled die objects from @3d-dice/dice-box for percentile (d%) rolls.
 * The tens die is the lighter colored die (#77d19e, group 0).
 * The ones die is the darker colored die (#182734, legacy #22384a, group 1).
 * On a d10 face showing 0 (raw value 0 or 10), the digit value is 0.
 * In Star Frontiers, rolling 00 (tens 0 and ones 0) is 100.
 * All other rolls are tensDigit * 10 + onesDigit.
 *
 * @param {Array} results
 * @returns {{ total: number, tens: number, ones: number, valid: boolean }}
 */
export function calculatePercentileRoll(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return { total: 0, tens: 0, ones: 0, valid: false };
  }

  const flatResults = results.flat(Infinity);
  if (flatResults.length < 2) {
    return { total: 0, tens: 0, ones: 0, valid: false };
  }

  // Find tens die (lighter colored die #77d19e, theme 'custom-tens', or group 0)
  const tensDie = flatResults.find(d => d?.theme === 'custom-tens' || d?.themeColor === '#77d19e' || d?.groupId === 0) || flatResults[0];
  // Find ones die (darker colored die #182734, legacy #22384a, theme 'custom-ones', or group 1)
  const onesDie = flatResults.find(d => d !== tensDie && (d?.theme === 'custom-ones' || d?.themeColor === '#182734' || d?.themeColor === '#22384a' || d?.groupId === 1)) ||
    flatResults.find(d => d !== tensDie) ||
    flatResults[1];

  const tensRaw = Number(tensDie?.value) || 0;
  const onesRaw = Number(onesDie?.value) || 0;

  const tensDigit = tensRaw % 10;
  const onesDigit = onesRaw % 10;

  let total;
  if (tensDigit === 0 && onesDigit === 0) {
    total = 100;
  } else {
    total = tensDigit * 10 + onesDigit;
  }

  return {
    total,
    tens: tensDigit,
    ones: onesDigit,
    valid: true
  };
}

/**
 * Processes settled die objects from @3d-dice/dice-box for combat initiative.
 * Die #1 (Players): theme 'custom-init-player', themeColor '#021a1e' (legacy: '#97c966', '#97e847', '#97f23d', '#70e6b3', '#12415a', '#0b222e').
 * Die #2 (Opposition): theme 'custom-init-opp', themeColor '#080d0d' (legacy: '#202020', '#0f1a18', '#09201b', '#07221c', '#124a3d', '#1d705d', '#6f0e39', '#400a22').
 * On a d10 face showing 0 (raw value 0 or 10), the roll value is 10 (range 1-10).
 *
 * @param {Array} results
 * @returns {{ playerRoll: number, oppRoll: number, winner: 'players'|'opposition'|'tie', valid: boolean }}
 */
export function calculateInitiativeRoll(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return { playerRoll: 0, oppRoll: 0, winner: 'tie', valid: false };
  }

  const flat = results.flat(Infinity);
  if (flat.length < 2) {
    return { playerRoll: 0, oppRoll: 0, winner: 'tie', valid: false };
  }

  // Find player die: theme 'custom-init-player', themeColor '#021a1e' / '#97c966' / '#97e847' / '#97f23d' / '#70e6b3' / '#12415a' / '#0b222e' / '#17304a', or groupId 0
  const playerDie = flat.find(d =>
    d?.theme === 'custom-init-player' ||
    d?.themeColor?.toLowerCase() === '#021a1e' ||
    d?.themeColor?.toLowerCase() === '#97c966' ||
    d?.themeColor?.toLowerCase() === '#97e847' ||
    d?.themeColor?.toLowerCase() === '#97f23d' ||
    d?.themeColor?.toLowerCase() === '#70e6b3' ||
    d?.themeColor?.toLowerCase() === '#12415a' ||
    d?.themeColor?.toLowerCase() === '#0b222e' ||
    d?.themeColor?.toLowerCase() === '#17304a' ||
    d?.groupId === 0
  ) || flat[0];

  // Find opposition die: theme 'custom-init-opp', themeColor '#080d0d' / '#202020' / '#0f1a18' / '#09201b' / '#07221c' / '#124a3d' / '#1d705d' / '#6f0e39' / '#400a22', or groupId 1
  const oppDie = flat.find(d =>
    d !== playerDie && (
      d?.theme === 'custom-init-opp' ||
      d?.themeColor?.toLowerCase() === '#080d0d' ||
      d?.themeColor?.toLowerCase() === '#202020' ||
      d?.themeColor?.toLowerCase() === '#0f1a18' ||
      d?.themeColor?.toLowerCase() === '#09201b' ||
      d?.themeColor?.toLowerCase() === '#07221c' ||
      d?.themeColor?.toLowerCase() === '#124a3d' ||
      d?.themeColor?.toLowerCase() === '#1d705d' ||
      d?.themeColor?.toLowerCase() === '#6f0e39' ||
      d?.themeColor?.toLowerCase() === '#400a22' ||
      d?.groupId === 1
    )
  ) || flat.find(d => d !== playerDie) || flat[1];

  const rawPlayer = Number(playerDie?.value) || 0;
  const rawOpp = Number(oppDie?.value) || 0;

  const playerRoll = (rawPlayer === 0 || rawPlayer === 10) ? 10 : (rawPlayer % 10 || 10);
  const oppRoll = (rawOpp === 0 || rawOpp === 10) ? 10 : (rawOpp % 10 || 10);

  let winner = 'tie';
  if (playerRoll > oppRoll) {
    winner = 'players';
  } else if (oppRoll > playerRoll) {
    winner = 'opposition';
  }

  return {
    playerRoll,
    oppRoll,
    winner,
    valid: true,
  };
}

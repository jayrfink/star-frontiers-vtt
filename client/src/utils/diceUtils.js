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
 * The ones die is the darker colored die (#22384a, group 1).
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

  // Find tens die (lighter colored die #77d19e or group 0)
  const tensDie = flatResults.find(d => d?.themeColor === '#77d19e' || d?.groupId === 0) || flatResults[0];
  // Find ones die (darker colored die #22384a or group 1)
  const onesDie = flatResults.find(d => d !== tensDie && (d?.themeColor === '#22384a' || d?.groupId === 1)) ||
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

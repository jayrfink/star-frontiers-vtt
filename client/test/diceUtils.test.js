import { describe, it, expect } from 'vitest';
import { calculateDamageRoll } from '../src/utils/diceUtils.js';

describe('calculateDamageRoll', () => {
  it('calculates total for a single die', () => {
    const raw = [{ value: 7 }];
    const result = calculateDamageRoll(raw);
    expect(result).toEqual({
      total: 7,
      dice: [7],
      count: 1
    });
  });

  it('calculates sum across multiple dice', () => {
    const raw = [{ value: 4 }, { value: 6 }, { value: 9 }];
    const result = calculateDamageRoll(raw);
    expect(result).toEqual({
      total: 19,
      dice: [4, 6, 9],
      count: 3
    });
  });

  it('maps 0 value to 10 for Star Frontiers d10 damage', () => {
    const raw = [{ value: 0 }, { value: 5 }];
    const result = calculateDamageRoll(raw);
    expect(result).toEqual({
      total: 15,
      dice: [10, 5],
      count: 2
    });
  });

  it('handles empty or missing input safely', () => {
    expect(calculateDamageRoll(null)).toEqual({ total: 0, dice: [], count: 0 });
    expect(calculateDamageRoll([])).toEqual({ total: 0, dice: [], count: 0 });
  });
});

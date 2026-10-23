import { describe, it, expect } from 'vitest';
import { calculateDamageRoll, calculatePercentileRoll } from '../src/utils/diceUtils.js';

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

  it('handles nested arrays from dice-box die groups properly', () => {
    const raw = [[{ value: 4 }, { value: 7 }]];
    const result = calculateDamageRoll(raw);
    expect(result).toEqual({
      total: 11,
      dice: [4, 7],
      count: 2
    });
  });

  it('handles empty or missing input safely', () => {
    expect(calculateDamageRoll(null)).toEqual({ total: 0, dice: [], count: 0 });
    expect(calculateDamageRoll([])).toEqual({ total: 0, dice: [], count: 0 });
  });
});

describe('calculatePercentileRoll', () => {
  it('correctly identifies tens and ones dice by theme name (Bug 3.5)', () => {
    // Dice supplied in reverse order: ones first, then tens
    const raw = [
      { value: 3, theme: 'custom-ones' },
      { value: 8, theme: 'custom-tens' }
    ];
    const result = calculatePercentileRoll(raw);
    expect(result).toEqual({
      total: 83,
      tens: 8,
      ones: 3,
      valid: true
    });
  });

  it('calculates standard two-digit roll', () => {
    const raw = [
      { value: 4, themeColor: '#77d19e' },
      { value: 7, themeColor: '#22384a' }
    ];
    const result = calculatePercentileRoll(raw);
    expect(result).toEqual({
      total: 47,
      tens: 4,
      ones: 7,
      valid: true
    });
  });

  it('calculates single-digit roll when tens die is 0 or 10', () => {
    const raw = [
      { value: 10, themeColor: '#77d19e' },
      { value: 6, themeColor: '#22384a' }
    ];
    const result = calculatePercentileRoll(raw);
    expect(result).toEqual({
      total: 6,
      tens: 0,
      ones: 6,
      valid: true
    });
  });

  it('calculates round tens when ones die is 0 or 10', () => {
    const raw = [
      { value: 8, themeColor: '#77d19e' },
      { value: 0, themeColor: '#22384a' }
    ];
    const result = calculatePercentileRoll(raw);
    expect(result).toEqual({
      total: 80,
      tens: 8,
      ones: 0,
      valid: true
    });
  });

  it('calculates 100 for double zeros (00)', () => {
    const raw = [
      { value: 0, themeColor: '#77d19e' },
      { value: 10, themeColor: '#22384a' }
    ];
    const result = calculatePercentileRoll(raw);
    expect(result).toEqual({
      total: 100,
      tens: 0,
      ones: 0,
      valid: true
    });
  });

  it('identifies tens and ones regardless of array order using themeColor', () => {
    // Ones die first, Tens die second
    const raw = [
      { value: 3, themeColor: '#22384a' },
      { value: 5, themeColor: '#77d19e' }
    ];
    const result = calculatePercentileRoll(raw);
    expect(result).toEqual({
      total: 53,
      tens: 5,
      ones: 3,
      valid: true
    });
  });

  it('identifies tens and ones using groupId when themeColor is absent', () => {
    const raw = [
      { value: 2, groupId: 0 },
      { value: 9, groupId: 1 }
    ];
    const result = calculatePercentileRoll(raw);
    expect(result).toEqual({
      total: 29,
      tens: 2,
      ones: 9,
      valid: true
    });
  });

  it('handles nested group arrays from dice-box', () => {
    const raw = [
      [{ value: 6, themeColor: '#77d19e' }],
      [{ value: 1, themeColor: '#22384a' }]
    ];
    const result = calculatePercentileRoll(raw);
    expect(result).toEqual({
      total: 61,
      tens: 6,
      ones: 1,
      valid: true
    });
  });

  it('handles empty or insufficient input safely', () => {
    expect(calculatePercentileRoll(null)).toEqual({ total: 0, tens: 0, ones: 0, valid: false });
    expect(calculatePercentileRoll([])).toEqual({ total: 0, tens: 0, ones: 0, valid: false });
    expect(calculatePercentileRoll([{ value: 5 }])).toEqual({ total: 0, tens: 0, ones: 0, valid: false });
  });
});

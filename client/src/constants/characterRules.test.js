import { describe, it, expect } from 'vitest';
import {
  OFFICIAL_SKILLS,
  SPACESHIP_SKILL_COSTS,
  calcXPCost,
  calcIM,
  calcPunchDamage,
  calcMeleeHit,
  calcMaxCarry,
  calcUnencumberedMax,
} from './characterRules.js';

describe('Knight Hawks Spaceship Skills in characterRules.js', () => {
  it('includes all 4 spaceship skills in OFFICIAL_SKILLS', () => {
    const spaceSkills = OFFICIAL_SKILLS.filter(s => s.psa === 'Spaceship');
    expect(spaceSkills.map(s => s.name)).toEqual([
      'Piloting',
      'Astrogation',
      'Engineering',
      'Gunnery',
    ]);

    expect(OFFICIAL_SKILLS.find(s => s.name === 'Piloting')).toEqual({
      name: 'Piloting',
      psa: 'Spaceship',
      baseChance: 'Reaction Speed',
    });
    expect(OFFICIAL_SKILLS.find(s => s.name === 'Astrogation')).toEqual({
      name: 'Astrogation',
      psa: 'Spaceship',
      baseChance: 'Logic',
    });
    expect(OFFICIAL_SKILLS.find(s => s.name === 'Engineering')).toEqual({
      name: 'Engineering',
      psa: 'Spaceship',
      baseChance: 'Logic',
    });
    expect(OFFICIAL_SKILLS.find(s => s.name === 'Gunnery')).toEqual({
      name: 'Gunnery',
      psa: 'Spaceship',
      baseChance: 'Dexterity',
    });
  });

  it('exports SPACESHIP_SKILL_COSTS with correct Knight Hawks progression', () => {
    expect(SPACESHIP_SKILL_COSTS).toBeDefined();
    expect(SPACESHIP_SKILL_COSTS.Piloting).toEqual([10, 20, 40, 70, 100, 150]);
    expect(SPACESHIP_SKILL_COSTS.Astrogation).toEqual([8, 16, 36, 60, 80, 120]);
    expect(SPACESHIP_SKILL_COSTS.Engineering).toEqual([8, 16, 36, 60, 80, 120]);
    expect(SPACESHIP_SKILL_COSTS.Gunnery).toEqual([6, 12, 20, 30, 50, 75]);
  });

  it('calculates flat XP cost for spaceship skills regardless of character PSA', () => {
    // Level 1
    expect(calcXPCost('Piloting', 1, 'Military')).toBe(10);
    expect(calcXPCost('Piloting', 1, 'Technological')).toBe(10);
    expect(calcXPCost('Piloting', 1, 'Biosocial')).toBe(10);

    // Level 2
    expect(calcXPCost('Astrogation', 2, 'Military')).toBe(16);
    expect(calcXPCost('Engineering', 2, 'Biosocial')).toBe(16);
    expect(calcXPCost('Gunnery', 2, 'Technological')).toBe(12);

    // Level 6
    expect(calcXPCost('Piloting', 6, 'Military')).toBe(150);
    expect(calcXPCost('Astrogation', 6, 'Technological')).toBe(120);
    expect(calcXPCost('Engineering', 6, 'Military')).toBe(120);
    expect(calcXPCost('Gunnery', 6, 'Biosocial')).toBe(75);
  });

  it('continues calculating standard PSA costs for ground skills', () => {
    // Beam Weapons (Military): in-PSA = nextLevel * 3, out-of-PSA = nextLevel * 6
    expect(calcXPCost('Beam Weapons', 2, 'Military')).toBe(6);
    expect(calcXPCost('Beam Weapons', 2, 'Technological')).toBe(12);
  });

  it('calculates custom skill XP cost with out-of-PSA penalty (Bug 35)', () => {
    // Custom skill without skillPSA: base nextLevel * 3
    expect(calcXPCost('Hacking', 2, 'Technological')).toBe(6);
    // Custom skill with matching skillPSA: base nextLevel * 3
    expect(calcXPCost('Hacking', 2, 'Technological', 'Technological')).toBe(6);
    // Custom skill with out-of-PSA skillPSA: double penalty nextLevel * 3 * 2
    expect(calcXPCost('Hacking', 2, 'Military', 'Technological')).toBe(12);
    expect(calcXPCost('Alien Biology', 3, 'Military', 'Biosocial')).toBe(18); // 3 * 3 * 2
  });
});

describe('characterRules.js Math Helpers with Nullish Coalescing (0-safe)', () => {
  it('calcIM correctly handles 0, valid scores, and undefined fallback', () => {
    expect(calcIM(0)).toBe(0);
    expect(calcIM(45)).toBe(5);
    expect(calcIM(65)).toBe(7);
    expect(calcIM(undefined)).toBe(5);
    expect(calcIM(null)).toBe(5);
  });

  it('calcPunchDamage correctly handles 0, boundaries, and undefined fallback', () => {
    expect(calcPunchDamage(0)).toBe('1');
    expect(calcPunchDamage(20)).toBe('1');
    expect(calcPunchDamage(21)).toBe('2');
    expect(calcPunchDamage(40)).toBe('2');
    expect(calcPunchDamage(50)).toBe('3');
    expect(calcPunchDamage(60)).toBe('3');
    expect(calcPunchDamage(80)).toBe('4');
    expect(calcPunchDamage(85)).toBe('5');
    expect(calcPunchDamage(undefined)).toBe('3');
    expect(calcPunchDamage(null)).toBe('3');
  });

  it('calcMeleeHit correctly handles 0 for str or dex without resetting to 50', () => {
    expect(calcMeleeHit(0, 0)).toBe(0);
    expect(calcMeleeHit(0, 60)).toBe(30);
    expect(calcMeleeHit(60, 0)).toBe(30);
    expect(calcMeleeHit(45, 55)).toBe(28); // Math.max(Math.ceil(45/2)=23, Math.ceil(55/2)=28)
    expect(calcMeleeHit(undefined, undefined)).toBe(25);
  });

  it('calcMaxCarry correctly handles 0 kg carry limit', () => {
    expect(calcMaxCarry(0)).toBe(0);
    expect(calcMaxCarry(75)).toBe(75);
    expect(calcMaxCarry(undefined)).toBe(50);
    expect(calcMaxCarry(null)).toBe(50);
  });

  it('calcUnencumberedMax correctly handles 0 kg unencumbered limit and rounds up (Bug 34)', () => {
    expect(calcUnencumberedMax(0)).toBe(0);
    // 75 / 2 = 37.5 -> Math.ceil = 38 (Alpha Dawn round fractions up rule)
    expect(calcUnencumberedMax(75)).toBe(38);
    expect(calcUnencumberedMax(undefined)).toBe(25);
    expect(calcUnencumberedMax(null)).toBe(25);
  });
});

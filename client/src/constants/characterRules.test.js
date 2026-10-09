import { describe, it, expect } from 'vitest';
import {
  OFFICIAL_SKILLS,
  SPACESHIP_SKILL_COSTS,
  calcXPCost,
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
});

import { describe, it, expect } from 'vitest';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';
import { OFFICIAL_SKILLS } from '../src/constants/characterRules.js';

describe('CharacterSheetsView - Spaceship Skills Integration', () => {
  it('exposes spaceship skills in officialSkills data', () => {
    const defaultData = CharacterSheetsView.data();
    const spaceSkills = defaultData.officialSkills.filter(s => s.psa === 'Spaceship');
    expect(spaceSkills.length).toBe(4);
    expect(spaceSkills.map(s => s.name)).toContain('Piloting');
    expect(spaceSkills.map(s => s.name)).toContain('Astrogation');
    expect(spaceSkills.map(s => s.name)).toContain('Engineering');
    expect(spaceSkills.map(s => s.name)).toContain('Gunnery');
  });

  it('calculates Piloting success chance using Reaction Speed (rs)', () => {
    const vm = {
      selectedChar: {
        rs: 65,
        dex: 40,
        log: 45,
      },
      derivedMeleeHit: 50,
    };

    const skill = { name: 'Piloting', level: 2 };
    // Base RS (65) + level bonus (2 * 10 = 20) = 85%
    const chance = CharacterSheetsView.methods.getSkillSuccessChance.call(vm, skill);
    expect(chance).toBe(85);
  });

  it('calculates Astrogation and Engineering success chance using Logic (log)', () => {
    const vm = {
      selectedChar: {
        rs: 40,
        dex: 50,
        log: 60,
      },
      derivedMeleeHit: 50,
    };

    const astroSkill = { name: 'Astrogation', level: 1 };
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, astroSkill)).toBe(70);

    const engSkill = { name: 'Engineering', level: 3 };
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, engSkill)).toBe(90);
  });

  it('calculates Gunnery success chance using Dexterity (dex)', () => {
    const vm = {
      selectedChar: {
        rs: 40,
        dex: 70,
        log: 50,
      },
      derivedMeleeHit: 50,
    };

    const gunnerySkill = { name: 'Gunnery', level: 1 };
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, gunnerySkill)).toBe(80);
  });

  it('returns official Knight Hawks XP cost for spaceship skills via getXPCost', () => {
    const vm = {
      selectedChar: { psa: 'Military' },
    };

    // Piloting Level 2 = 20 XP
    expect(CharacterSheetsView.methods.getXPCost.call(vm, 'Piloting', 2)).toBe(20);
    // Gunnery Level 4 = 30 XP
    expect(CharacterSheetsView.methods.getXPCost.call(vm, 'Gunnery', 4)).toBe(30);
  });
});

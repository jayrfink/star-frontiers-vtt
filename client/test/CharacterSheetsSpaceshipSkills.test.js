import { describe, it, expect } from 'vitest';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';

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

  it('calculates Math.ceil(stat / 2) base chance for ranged and non-weapon skills while spaceship skills use 100% stat', () => {
    const vm = {
      selectedChar: {
        dex: 55,
        rs: 65,
        log: 61,
        int: 45,
        per: 53,
      },
      derivedMeleeHit: 30,
    };

    // Spaceship skills: 100% stat + level bonus
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Piloting', level: 1 })).toBe(75); // 65 + 10
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Astrogation', level: 2 })).toBe(81); // 61 + 20
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Engineering', level: 1 })).toBe(71); // 61 + 10
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Gunnery', level: 1 })).toBe(65); // 55 + 10

    // Ranged weapon skill: Math.ceil(dex / 2) + level bonus
    // dex = 55 -> Math.ceil(55/2) = 28. level 1 -> 28 + 10 = 38
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Beam Weapons', level: 1 })).toBe(38);
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Projectile Weapons', level: 2 })).toBe(48); // 28 + 20 = 48

    // Non-weapon skills: Math.ceil(stat / 2) + level bonus
    // Computer (Logic = 61 -> 31) + level 1 (10) = 41
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Computer', level: 1 })).toBe(41);
    // Robotics (Logic = 61 -> 31) + level 2 (20) = 51
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Robotics', level: 2 })).toBe(51);
    // Technician (Logic = 61 -> 31) + level 1 (10) = 41
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Technician', level: 1 })).toBe(41);
    // Medical (Logic = 61 -> 31) + level 3 (30) = 61
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Medical', level: 3 })).toBe(61);
    // Demolitions (Logic = 61 -> 31) + level 1 (10) = 41
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Demolitions', level: 1 })).toBe(41);
    // Environmental (Intuition = 45 -> 23) + level 1 (10) = 33
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Environmental', level: 1 })).toBe(33);
    // Psycho-Social (Personality = 53 -> 27) + level 1 (10) = 37
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Psycho-Social', level: 1 })).toBe(37);
  });

  it('ensures level 0 or unset skills return only base chance with no level bonus added', () => {
    const vm = {
      selectedChar: {
        dex: 60,
        rs: 50,
        log: 70,
        int: 40,
        per: 50,
      },
      derivedMeleeHit: 30,
    };

    // Spaceship skill level 0 / unset
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Piloting', level: 0 })).toBe(50);
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Astrogation' })).toBe(70);
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Engineering', level: null })).toBe(70);
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Gunnery', level: 0 })).toBe(60);

    // Ground skills level 0 / unset
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Beam Weapons', level: 0 })).toBe(30); // Math.ceil(60/2) = 30
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Computer', level: 0 })).toBe(35); // Math.ceil(70/2) = 35
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Environmental' })).toBe(20); // Math.ceil(40/2) = 20
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, { name: 'Melee Weapons', level: 0 })).toBe(30); // derivedMeleeHit = 30
  });

  it('applies racial ability modifiers from RACES_DATA during character creation', async () => {
    let sentPayload = null;
    const origFetch = global.fetch;
    global.fetch = async (url, opts) => {
      sentPayload = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({ id: 99, ...sentPayload }),
      };
    };

    try {
      const vm = {
        newCharForm: {
          name: 'Garth',
          race: 'Dralasite',
          psa: 'Military',
          avatar_url: '',
          str_sta: 50,
          dex_rs: 50,
          int_log: 50,
          per_ldr: 50,
          max_stamina: 50,
          current_stamina: 50,
        },
        characters: [],
        showCreateModal: true,
        selectedChar: null,
        normalizeCharacterData: CharacterSheetsView.methods.normalizeCharacterData,
      };

      // Dralasite: str: +5, sta: +5, dex: -5, rs: -5, int: 0, log: 0, per: 0, ldr: 0
      await CharacterSheetsView.methods.createCharacter.call(vm);
      expect(sentPayload.str).toBe(55);
      expect(sentPayload.sta).toBe(55);
      expect(sentPayload.max_stamina).toBe(55);
      expect(sentPayload.current_stamina).toBe(55);
      expect(sentPayload.dex).toBe(45);
      expect(sentPayload.rs).toBe(45);
      expect(sentPayload.int).toBe(50);
      expect(sentPayload.log).toBe(50);

      // Yazirian: str: -10, sta: -10, dex: +5, rs: +5, int: +5, log: +5, per: 0, ldr: 0
      vm.newCharForm.race = 'Yazirian';
      vm.newCharForm.str_sta = 60;
      vm.newCharForm.dex_rs = 50;
      vm.newCharForm.int_log = 40;
      vm.newCharForm.per_ldr = 45;
      await CharacterSheetsView.methods.createCharacter.call(vm);
      expect(sentPayload.str).toBe(50); // 60 - 10
      expect(sentPayload.sta).toBe(50); // 60 - 10
      expect(sentPayload.dex).toBe(55); // 50 + 5
      expect(sentPayload.rs).toBe(55); // 50 + 5
      expect(sentPayload.int).toBe(45); // 40 + 5
      expect(sentPayload.log).toBe(45); // 40 + 5
      expect(sentPayload.per).toBe(45);
      expect(sentPayload.ldr).toBe(45);

      // Vrusk: str: -5, sta: -5, dex: +5, rs: +5, int: 0, log: 0, per: 0, ldr: 0
      vm.newCharForm.race = 'Vrusk';
      vm.newCharForm.str_sta = 50;
      vm.newCharForm.dex_rs = 50;
      vm.newCharForm.int_log = 50;
      vm.newCharForm.per_ldr = 50;
      await CharacterSheetsView.methods.createCharacter.call(vm);
      expect(sentPayload.str).toBe(45); // 50 - 5
      expect(sentPayload.sta).toBe(45); // 50 - 5
      expect(sentPayload.dex).toBe(55); // 50 + 5
      expect(sentPayload.rs).toBe(55); // 50 + 5

      // Human: all modifiers 0
      vm.newCharForm.race = 'Human';
      await CharacterSheetsView.methods.createCharacter.call(vm);
      expect(sentPayload.str).toBe(50);
      expect(sentPayload.sta).toBe(50);
      expect(sentPayload.dex).toBe(50);
      expect(sentPayload.rs).toBe(50);
      expect(sentPayload.int).toBe(50);
      expect(sentPayload.log).toBe(50);
    } finally {
      global.fetch = origFetch;
    }
  });
});

import { describe, it, expect } from 'vitest';
import {
  SHIP_COMBAT_REF,
  RANGED_COMBAT_REF,
  MELEE_COMBAT_REF,
  WEAPON_RESTRICTIONS_LEGEND
} from './combatReference.js';

describe('combatReference', () => {
  describe('SHIP_COMBAT_REF', () => {
    it('exports comprehensive ship combat reference structure', () => {
      expect(SHIP_COMBAT_REF.sequenceOfPlay).toBeDefined();
      expect(Array.isArray(SHIP_COMBAT_REF.sequenceOfPlay)).toBe(true);
      expect(SHIP_COMBAT_REF.sequenceOfPlay.length).toBe(5);

      expect(SHIP_COMBAT_REF.weapons).toBeDefined();
      expect(Array.isArray(SHIP_COMBAT_REF.weapons)).toBe(true);
      expect(SHIP_COMBAT_REF.weapons.length).toBeGreaterThanOrEqual(9);

      expect(SHIP_COMBAT_REF.defenses).toBeDefined();
      expect(Array.isArray(SHIP_COMBAT_REF.defenses)).toBe(true);
      expect(SHIP_COMBAT_REF.defenses.length).toBeGreaterThanOrEqual(4);

      expect(SHIP_COMBAT_REF.criticalHits).toBeDefined();
      expect(Array.isArray(SHIP_COMBAT_REF.criticalHits)).toBe(true);
      expect(SHIP_COMBAT_REF.criticalHits.length).toBeGreaterThanOrEqual(6);
    });

    it('contains expected ship weapons with valid schema', () => {
      const weaponNames = SHIP_COMBAT_REF.weapons.map((w) => w.name);
      expect(weaponNames).toContain('Laser Cannon');
      expect(weaponNames).toContain('Laser Battery');
      expect(weaponNames).toContain('Electron Battery');
      expect(weaponNames).toContain('Proton Battery');
      expect(weaponNames).toContain('Disruptor Cannon');
      expect(weaponNames).toContain('Torpedo');
      expect(weaponNames).toContain('Assault Rocket');
      expect(weaponNames).toContain('Rocket Battery');
      expect(weaponNames).toContain('Mine');

      SHIP_COMBAT_REF.weapons.forEach((w) => {
        expect(w).toHaveProperty('name');
        expect(w).toHaveProperty('type');
        expect(w).toHaveProperty('damage');
        expect(w).toHaveProperty('rangeHexes');
        expect(w).toHaveProperty('ammo');
        expect(w).toHaveProperty('rof');
        expect(w).toHaveProperty('notes');
      });
    });

    it('defines restrictions for all ship weapons and exports WEAPON_RESTRICTIONS_LEGEND', () => {
      expect(WEAPON_RESTRICTIONS_LEGEND).toBeDefined();
      expect(WEAPON_RESTRICTIONS_LEGEND.FF).toBeDefined();
      expect(WEAPON_RESTRICTIONS_LEGEND.T).toBeDefined();
      expect(WEAPON_RESTRICTIONS_LEGEND.MPO).toBeDefined();
      expect(WEAPON_RESTRICTIONS_LEGEND.RD).toBeDefined();
      expect(WEAPON_RESTRICTIONS_LEGEND.LTD).toBeDefined();

      for (const w of SHIP_COMBAT_REF.weapons) {
        expect(Array.isArray(w.restrictions)).toBe(true);
        expect(w.restrictions.length).toBeGreaterThan(0);
      }

      const lc = SHIP_COMBAT_REF.weapons.find((w) => w.name === 'Laser Cannon');
      expect(lc.restrictions).toEqual(['FF', 'RD']);

      const lb = SHIP_COMBAT_REF.weapons.find((w) => w.name === 'Laser Battery');
      expect(lb.restrictions).toEqual(['T', 'RD']);
    });

    it('contains expected ship defenses and critical hit entries', () => {
      const defenseNames = SHIP_COMBAT_REF.defenses.map((d) => d.name);
      expect(defenseNames).toContain('Reflective Hull');
      expect(defenseNames).toContain('Masking Screen');
      expect(defenseNames).toContain('Inertia Screen');
      expect(defenseNames).toContain('Stasis Screen');
      expect(defenseNames.some((n) => n.includes('ICM'))).toBe(true);

      SHIP_COMBAT_REF.defenses.forEach((d) => {
        expect(d).toHaveProperty('name');
        expect(d).toHaveProperty('type');
        expect(d).toHaveProperty('effect');
        expect(d).toHaveProperty('limitations');
      });

      const critLocations = SHIP_COMBAT_REF.criticalHits.map((c) => c.location);
      expect(critLocations).toContain('Bridge');
      expect(critLocations).toContain('Drive');
      expect(critLocations).toContain('Weapons');
    });
  });

  describe('RANGED_COMBAT_REF', () => {
    it('exports comprehensive ranged combat reference structure', () => {
      expect(RANGED_COMBAT_REF.sequenceOfPlay).toBeDefined();
      expect(Array.isArray(RANGED_COMBAT_REF.sequenceOfPlay)).toBe(true);
      expect(RANGED_COMBAT_REF.weapons.length).toBeGreaterThanOrEqual(12);
      expect(RANGED_COMBAT_REF.modifiers.length).toBeGreaterThanOrEqual(10);
      expect(RANGED_COMBAT_REF.armor.length).toBeGreaterThanOrEqual(4);
    });

    it('contains small arms, heavy weapons, and grenades with valid schema', () => {
      const weaponNames = RANGED_COMBAT_REF.weapons.map((w) => w.name);
      expect(weaponNames).toContain('Laser Pistol');
      expect(weaponNames).toContain('Laser Rifle');
      expect(weaponNames).toContain('Electrostunner');
      expect(weaponNames).toContain('Automatic Pistol');
      expect(weaponNames).toContain('Automatic Rifle');
      expect(weaponNames).toContain('Gyrojet Pistol');
      expect(weaponNames).toContain('Gyrojet Rifle');
      expect(weaponNames).toContain('Needler');
      expect(weaponNames).toContain('Frag Grenade');
      expect(weaponNames).toContain('Doze Grenade');
      expect(weaponNames).toContain('Smoke Grenade');
      expect(weaponNames).toContain('Tangler Grenade');

      RANGED_COMBAT_REF.weapons.forEach((w) => {
        expect(w).toHaveProperty('name');
        expect(w).toHaveProperty('category');
        expect(w).toHaveProperty('damage');
        expect(w).toHaveProperty('rof');
        expect(w).toHaveProperty('shortRange');
        expect(w).toHaveProperty('medRange');
        expect(w).toHaveProperty('longRange');
        expect(w).toHaveProperty('ammo');
        expect(w).toHaveProperty('notes');
      });
    });

    it('contains ranged modifiers and defenses', () => {
      RANGED_COMBAT_REF.modifiers.forEach((m) => {
        expect(m).toHaveProperty('condition');
        expect(m).toHaveProperty('modifier');
        expect(m).toHaveProperty('notes');
      });

      const armorNames = RANGED_COMBAT_REF.armor.map((a) => a.name);
      expect(armorNames).toContain('Skeinsuit');
      expect(armorNames).toContain('Albedo Suit');
      expect(armorNames).toContain('Albedo Screen');
      expect(armorNames).toContain('Inertia Screen');

      RANGED_COMBAT_REF.armor.forEach((a) => {
        expect(a).toHaveProperty('name');
        expect(a).toHaveProperty('type');
        expect(a).toHaveProperty('protection');
        expect(a).toHaveProperty('notes');
      });
    });
  });

  describe('MELEE_COMBAT_REF', () => {
    it('exports comprehensive melee combat reference structure', () => {
      expect(MELEE_COMBAT_REF.attackBaseFormula).toBeDefined();
      expect(typeof MELEE_COMBAT_REF.attackBaseFormula).toBe('string');
      expect(Array.isArray(MELEE_COMBAT_REF.unarmedDamage)).toBe(true);
      expect(MELEE_COMBAT_REF.unarmedDamage.length).toBe(5);
      expect(Array.isArray(MELEE_COMBAT_REF.weapons)).toBe(true);
      expect(MELEE_COMBAT_REF.weapons.length).toBeGreaterThanOrEqual(6);
      expect(Array.isArray(MELEE_COMBAT_REF.modifiers)).toBe(true);
      expect(MELEE_COMBAT_REF.modifiers.length).toBeGreaterThanOrEqual(5);
    });

    it('verifies unarmed damage brackets and melee weapons', () => {
      const brackets = MELEE_COMBAT_REF.unarmedDamage.map((b) => b.strBracket);
      expect(brackets).toContain('STR 1-20');
      expect(brackets).toContain('STR 21-40');
      expect(brackets).toContain('STR 41-60');
      expect(brackets).toContain('STR 61-80');
      expect(brackets).toContain('STR 81+');

      MELEE_COMBAT_REF.unarmedDamage.forEach((u) => {
        expect(u).toHaveProperty('strBracket');
        expect(u).toHaveProperty('punchDamage');
        expect(u).toHaveProperty('kickDamage');
      });

      const meleeNames = MELEE_COMBAT_REF.weapons.map((w) => w.name);
      expect(meleeNames).toContain('Knife');
      expect(meleeNames).toContain('Vibroknife');
      expect(meleeNames).toContain('Stun Baton');
      expect(meleeNames.some((n) => n.includes('Club'))).toBe(true);
      expect(meleeNames.some((n) => n.includes('Sword'))).toBe(true);
      expect(meleeNames).toContain('Axe');

      MELEE_COMBAT_REF.weapons.forEach((w) => {
        expect(w).toHaveProperty('name');
        expect(w).toHaveProperty('damage');
        expect(w).toHaveProperty('weight');
        expect(w).toHaveProperty('special');
      });

      MELEE_COMBAT_REF.modifiers.forEach((m) => {
        expect(m).toHaveProperty('situation');
        expect(m).toHaveProperty('modifier');
        expect(m).toHaveProperty('notes');
      });
    });
  });
});

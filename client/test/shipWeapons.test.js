import { describe, it, expect } from 'vitest';
import { SHIP_WEAPONS_CATALOG, createWeaponInstance } from '../src/constants/shipWeapons.js';
import { SHIP_PRESETS } from '../src/constants/shipPresets.js';

describe('Knight Hawks Ship Weapons Catalog', () => {
  it('exports all 10 canonical Knight Hawks weapons', () => {
    expect(SHIP_WEAPONS_CATALOG.length).toBe(10);
    const names = SHIP_WEAPONS_CATALOG.map((w) => w.name);
    expect(names).toContain('Laser Cannon');
    expect(names).toContain('Laser Battery');
    expect(names).toContain('Electron Battery');
    expect(names).toContain('Proton Battery');
    expect(names).toContain('Disruptor Cannon');
    expect(names).toContain('Torpedoes');
    expect(names).toContain('Assault Rockets');
    expect(names).toContain('Rocket Battery');
    expect(names).toContain('Mines');
    expect(names).toContain('Seeker Missile');
  });

  it('contains accurate Knight Hawks rulebook stats for each weapon', () => {
    const lc = SHIP_WEAPONS_CATALOG.find((w) => w.name === 'Laser Cannon');
    expect(lc.damage).toBe('2d10');
    expect(lc.range).toBe(10);
    expect(lc.ammo_max).toBe(0);

    const lb = SHIP_WEAPONS_CATALOG.find((w) => w.name === 'Laser Battery');
    expect(lb.damage).toBe('1d10');
    expect(lb.range).toBe(9);
    expect(lb.ammo_max).toBe(0);

    const torp = SHIP_WEAPONS_CATALOG.find((w) => w.name === 'Torpedoes');
    expect(torp.damage).toBe('4d10');
    expect(torp.range).toBe(4);
    expect(torp.ammo_max).toBe(2);

    const ar = SHIP_WEAPONS_CATALOG.find((w) => w.name === 'Assault Rockets');
    expect(ar.damage).toBe('2d10+4');
    expect(ar.range).toBe(4);
    expect(ar.ammo_max).toBe(4);

    const sm = SHIP_WEAPONS_CATALOG.find((w) => w.name === 'Seeker Missile');
    expect(sm.damage).toBe('5d10');
    expect(sm.range).toBe(99);
    expect(sm.ammo_max).toBe(1);

    const mines = SHIP_WEAPONS_CATALOG.find((w) => w.name === 'Mines');
    expect(mines.damage).toBe('3d10+5');
    expect(mines.range).toBe(0);
    expect(mines.ammo_max).toBe(2);
  });

  it('createWeaponInstance creates a ready-to-equip ship weapon object', () => {
    const lc = SHIP_WEAPONS_CATALOG.find((w) => w.name === 'Laser Cannon');
    const weapon = createWeaponInstance(lc);
    expect(weapon.id).toMatch(/^w_\d+_/);
    expect(weapon.name).toBe('Laser Cannon');
    expect(weapon.type).toBe('Laser Cannon');
    expect(weapon.damage).toBe('2d10');
    expect(weapon.range).toBe(10);
    expect(weapon.ammo_max).toBe(0);
    expect(weapon.ammo_current).toBe(0);
    expect(weapon.status).toBe('Online');
  });

  it('createWeaponInstance applies custom overrides', () => {
    const custom = createWeaponInstance(
      { name: 'Custom Railgun', damage: '3d10', range: 8, ammo_max: 6, ammo_current: 6 },
      { name: 'Heavy Railgun', ammo_max: 10, ammo_current: 10 }
    );
    expect(custom.name).toBe('Heavy Railgun');
    expect(custom.type).toBe('Heavy Railgun');
    expect(custom.damage).toBe('3d10');
    expect(custom.range).toBe(8);
    expect(custom.ammo_max).toBe(10);
    expect(custom.ammo_current).toBe(10);
    expect(custom.status).toBe('Online');
  });

  it('includes restrictions on catalog weapons and normalizes restrictions in createWeaponInstance', () => {
    for (const w of SHIP_WEAPONS_CATALOG) {
      expect(Array.isArray(w.restrictions)).toBe(true);
      expect(w.restrictions.length).toBeGreaterThan(0);
    }

    const lc = SHIP_WEAPONS_CATALOG.find((w) => w.id === 'laser_cannon');
    expect(lc.restrictions).toContain('FF');
    expect(lc.restrictions).toContain('RD');

    // Test createWeaponInstance with array
    const w1 = createWeaponInstance(lc, { restrictions: ['FF', 'MPO'] });
    expect(w1.restrictions).toEqual(['FF', 'MPO']);

    // Test createWeaponInstance with comma-separated string
    const w2 = createWeaponInstance({}, { name: 'Plasma Gun', restrictions: 'FF, RD, Custom Aft' });
    expect(w2.restrictions).toEqual(['FF', 'RD', 'Custom Aft']);

    // Test createWeaponInstance fallback
    const w3 = createWeaponInstance(lc);
    expect(w3.restrictions).toEqual(['FF', 'RD']);
  });

  it('ensures all weapons in SHIP_PRESETS have restrictions arrays', () => {
    for (const preset of SHIP_PRESETS) {
      for (const weapon of preset.weapons) {
        expect(Array.isArray(weapon.restrictions)).toBe(true);
        expect(weapon.restrictions.length).toBeGreaterThan(0);
      }
    }
  });
});

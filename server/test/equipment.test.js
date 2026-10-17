import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { createDb } from '../src/db.js';

describe('GET /api/equipment - Alpha Dawn Expanded Equipment Catalog', () => {
  let db;
  let server;
  let response;
  const ALLOWED_CATEGORIES = [
    'Weapon',
    'Ammunition',
    'Defense',
    'Toolkit',
    'Medical',
    'Gear',
    'Power',
  ];

  beforeAll(async () => {
    db = createDb(':memory:');
    const result = createApp(db, ':memory:');
    server = result.server;
    response = await request(result.app).get('/api/equipment');
  });

  afterAll(() => {
    if (db) db.close();
    if (server && server.close) server.close();
  });

  it('returns HTTP 200 with JSON content', () => {
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('contains more than 100 canonical equipment items', () => {
    expect(response.body.length).toBeGreaterThanOrEqual(100);
  });

  it('validates that every item strictly matches the equipment schema', () => {
    for (const item of response.body) {
      expect(typeof item.name).toBe('string');
      expect(item.name.trim().length).toBeGreaterThan(0);

      expect(ALLOWED_CATEGORIES).toContain(item.category);

      expect(typeof item.cost).toBe('number');
      expect(item.cost).toBeGreaterThanOrEqual(0);

      expect(typeof item.weight).toBe('number');
      expect(item.weight).toBeGreaterThanOrEqual(0);

      expect(typeof item.capabilities).toBe('string');
      expect(item.capabilities.trim().length).toBeGreaterThan(0);
    }
  });

  it('verifies representative canonical weapons from Alpha Dawn Expanded Rules', () => {
    const names = response.body.map(i => i.name);
    
    // Beam weapons
    expect(names).toContain('Laser Pistol');
    expect(names).toContain('Laser Rifle');
    expect(names).toContain('Heavy Laser');
    expect(names).toContain('Electrostunner');
    expect(names).toContain('Sonic Stunner');
    expect(names).toContain('Sonic Disruptor');
    expect(names).toContain('Sonic Devastator');

    // Projectile & Heavy weapons
    expect(names).toContain('Automatic Pistol');
    expect(names).toContain('Automatic Rifle');
    expect(names).toContain('Machine Gun');
    expect(names).toContain('Needler Pistol');
    expect(names).toContain('Needler Rifle');
    expect(names).toContain('Gyrojet Pistol');
    expect(names).toContain('Gyrojet Rifle');
    expect(names).toContain('Grenade Rifle');
    expect(names).toContain('Grenade Mortar');
    expect(names).toContain('Rocket Launcher');
    expect(names).toContain('Recoilless Rifle');

    // Grenades
    expect(names).toContain('Frag Grenade');
    expect(names).toContain('Doze Grenade');
    expect(names).toContain('Smoke Grenade');
    expect(names).toContain('Tangler Grenade');
    expect(names).toContain('Incendiary Grenade');
    expect(names).toContain('Poison Grenade');

    // Melee & Archaic
    expect(names).toContain('Vibroknife');
    expect(names).toContain('Stun Baton');
    expect(names).toContain('Electric Sword');
    expect(names).toContain('Sonic Knife');
    expect(names).toContain('Sonic Sword');
    expect(names).toContain('Shock Gloves');
    expect(names).toContain('Brass Knuckles');
    expect(names).toContain('Club / Nightstick');
    expect(names).toContain('Polearm / Spear');
    expect(names).toContain('Knife / Dagger');
    expect(names).toContain('Axe');
    expect(names).toContain('Sword');
    expect(names).toContain('Whip');
    expect(names).toContain('Bow & Arrows');
    expect(names).toContain('Musket');
  });

  it('verifies representative ammunition, defenses, toolkits, medical, gear, and power items', () => {
    const names = response.body.map(i => i.name);

    // Ammunition
    expect(names).toContain('SEU Clip (20 SEU)');
    expect(names).toContain('Bulletclip (Pistol, 20 rds)');
    expect(names).toContain('Machine Gun Belt (100 rds)');
    expect(names).toContain('Jetclip (Pistol, 10 rds)');
    expect(names).toContain('Needleclip (Barbed, 20 rds)');
    expect(names).toContain('Anti-Armor Rocket');
    expect(names).toContain('Recoilless Shell');

    // Defenses
    expect(names).toContain('Skeinsuit');
    expect(names).toContain('Civilian Skeinsuit');
    expect(names).toContain('Albedo Suit');
    expect(names).toContain('Albedo Screen');
    expect(names).toContain('Inertia Screen');
    expect(names).toContain('Gauss Screen');
    expect(names).toContain('Holo Screen');
    expect(names).toContain('Sonic Screen');

    // Toolkits
    expect(names).toContain('Techkit');
    expect(names).toContain('Robcomkit');
    expect(names).toContain('Envirokit');
    expect(names).toContain('Lockpick Set (Electronic & Mechanical)');
    expect(names).toContain('Demolitions Kit');

    // Medical
    expect(names).toContain('Medkit');
    expect(names).toContain('First Aid Pack');
    expect(names).toContain('Stimdose');
    expect(names).toContain('Staydose');
    expect(names).toContain('Antibody Plus');
    expect(names).toContain('Antitox');
    expect(names).toContain('Omnimycin');
    expect(names).toContain('Telol');
    expect(names).toContain('Plastiflesh (Canister)');
    expect(names).toContain('Freeze Field Unit');

    // Gear
    expect(names).toContain('Chronocom');
    expect(names).toContain('Polyvox');
    expect(names).toContain('Toxy-Rad Gauge');
    expect(names).toContain('Anti-Shock Implant');
    expect(names).toContain('Exoskeleton (Power Frame)');
    expect(names).toContain('IR Jammer');
    expect(names).toContain('Subspace Radio');
    expect(names).toContain('Solvaway (Canister)');

    // Power
    expect(names).toContain('Power Beltpack');
    expect(names).toContain('Power Backpack');
    expect(names).toContain('Parabattery Level 1 (50 SEU)');
    expect(names).toContain('Parabattery Level 4 (500 SEU)');
    expect(names).toContain('Portable Generator (Chemical)');
    expect(names).toContain('Portable Computer Level 1');
    expect(names).toContain('Portable Computer Level 2');
  });

  it('validates exact stats for key items', () => {
    const itemMap = new Map(response.body.map(i => [i.name, i]));

    const heavyLaser = itemMap.get('Heavy Laser');
    expect(heavyLaser.category).toBe('Weapon');
    expect(heavyLaser.cost).toBe(1000);
    expect(heavyLaser.weight).toBe(15);
    expect(heavyLaser.capabilities).toContain('30d10');

    const civilianSkeinsuit = itemMap.get('Civilian Skeinsuit');
    expect(civilianSkeinsuit.category).toBe('Defense');
    expect(civilianSkeinsuit.cost).toBe(150);
    expect(civilianSkeinsuit.weight).toBe(1.5);

    const robcomkit = itemMap.get('Robcomkit');
    expect(robcomkit.category).toBe('Toolkit');
    expect(robcomkit.cost).toBe(800);
    expect(robcomkit.weight).toBe(6);

    const antibodyPlus = itemMap.get('Antibody Plus');
    expect(antibodyPlus.category).toBe('Medical');
    expect(antibodyPlus.cost).toBe(50);
    expect(antibodyPlus.weight).toBe(0.1);

    const portableComp2 = itemMap.get('Portable Computer Level 2');
    expect(portableComp2.category).toBe('Power');
    expect(portableComp2.cost).toBe(3000);
    expect(portableComp2.weight).toBe(6);
  });
});

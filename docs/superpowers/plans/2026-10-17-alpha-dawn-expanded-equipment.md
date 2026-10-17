# Alpha Dawn Expanded Equipment & Weapons Inventory Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Star Frontiers VTT equipment catalog in `data/inventory_items.json` to 100+ canonical Alpha Dawn Expanded items across 7 standard categories, and add category filter tabs with live count badges in the Character Sheet Equipment Catalog modal.

**Architecture:** The server continues serving `data/inventory_items.json` via `GET /api/equipment`. The catalog JSON is expanded with complete Alpha Dawn Expanded Rules statistics (Cost, Weight, capabilities, damage, ammo, ranges). On the client, `CharacterSheetsView.vue` is updated with category filter tabs above the modal search input, dynamic counts per category, and coordinated category/text filtering.

**Tech Stack:** Node.js, Express, Vitest, Vue 3, HTML/CSS.

## Global Constraints

- Run all test and build commands inside the container: `docker exec sf-vtt-dev bash -c "<command>"`
- Server unit tests: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/equipment.test.js"`
- Full server test suite: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
- Client unit tests: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/CharacterSheetsView.test.js"`
- Full client test suite & production build: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
- Standard category names: `'Weapon'`, `'Ammunition'`, `'Defense'`, `'Toolkit'`, `'Medical'`, `'Gear'`, `'Power'`.
- All item prices in Credits (Cr) and weights in kilograms (kg) must match Alpha Dawn Expanded Game Rules (pp. 31, 38, 48–56).
- Preserve existing character sheet inventory data compatibility: items added have `{ name, quantity: 1, weight: Number(item.weight) || 0, notes: item.capabilities || '' }`.

---

## File Structure

- Create: `server/test/equipment.test.js` — Vitest suite testing `GET /api/equipment` endpoint, schema validation, item counts, and presence of canonical Alpha Dawn weapons and equipment.
- Modify: `data/inventory_items.json` — Comprehensive catalog containing all 117 canonical items.
- Modify: `client/src/views/CharacterSheetsView.vue` — Equipment catalog modal category filter tabs, live count badges, active category state, updated `filteredEquipmentList` computation, and CSS styling.
- Modify: `client/test/CharacterSheetsView.test.js` — Unit tests for category filter tabs, category counts, tab selection, search within category, and adding items to inventory.

---

### Task 1: Canonical Alpha Dawn Equipment Catalog Expansion & Backend Tests

**Files:**
- Create: `server/test/equipment.test.js`
- Modify: `data/inventory_items.json`

**Interfaces:**
- Consumes: `GET /api/equipment` from `server/src/index.js`
- Produces: JSON array of 117 equipment objects with schema `{ name: string, category: string, cost: number, weight: number, capabilities: string }`

- [ ] **Step 1: Write the failing test in `server/test/equipment.test.js`**

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('GET /api/equipment - Alpha Dawn Expanded Equipment Catalog', () => {
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
    response = await request(app).get('/api/equipment');
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/equipment.test.js"`
Expected: FAIL because `inventory_items.json` only has 42 items and lacks the new canonical items and categories.

- [ ] **Step 3: Update `data/inventory_items.json` with the canonical 117 Alpha Dawn Expanded items**

Write `data/inventory_items.json`:
```json
[
  { "name": "Laser Pistol", "category": "Weapon", "cost": 500, "weight": 1, "capabilities": "Damage: 1d10 to 10d10 (dial: 1-10 SEU), Range: 50m, Ammo: 20 SEU clip" },
  { "name": "Laser Rifle", "category": "Weapon", "cost": 800, "weight": 3, "capabilities": "Damage: 1d10 to 20d10 (dial: 1-20 SEU), Range: 150m, Ammo: 20 SEU clip or Backpack" },
  { "name": "Heavy Laser", "category": "Weapon", "cost": 1000, "weight": 15, "capabilities": "Damage: 1d10 to 30d10 (dial: 1-30 SEU), Range: 300m, Ammo: Power Backpack or Generator, Tripod mounted" },
  { "name": "Electrostunner", "category": "Weapon", "cost": 400, "weight": 1, "capabilities": "Damage: Stun (d100 vs STA), Range: 30m, Ammo: 20 SEU clip (2 SEU/shot)" },
  { "name": "Sonic Stunner", "category": "Weapon", "cost": 300, "weight": 1, "capabilities": "Damage: Stun cone (d100 vs STA), Range: 10m, Ammo: 20 SEU clip (2 SEU/shot)" },
  { "name": "Sonic Disruptor", "category": "Weapon", "cost": 600, "weight": 2, "capabilities": "Damage: 3d10 disrupts molecular bonds, Range: 30m, Ammo: 20 SEU clip (3 SEU/shot)" },
  { "name": "Sonic Devastator", "category": "Weapon", "cost": 1200, "weight": 10, "capabilities": "Damage: 5d10 wide-beam disruption, Range: 50m, Ammo: Power Backpack (5 SEU/shot)" },
  { "name": "Automatic Pistol", "category": "Weapon", "cost": 50, "weight": 1, "capabilities": "Damage: 1d10, Range: 50m, Ammo: 20-bullet clip, Rate: 1 or burst" },
  { "name": "Automatic Rifle", "category": "Weapon", "cost": 120, "weight": 3, "capabilities": "Damage: 1d10, Range: 150m, Ammo: 20-bullet clip, Rate: 1 or burst" },
  { "name": "Machine Gun", "category": "Weapon", "cost": 250, "weight": 10, "capabilities": "Damage: 2d10 (burst/suppressive), Range: 200m, Ammo: 100-bullet belt, Tripod mounted" },
  { "name": "Needler Pistol", "category": "Weapon", "cost": 150, "weight": 1, "capabilities": "Damage: 1d10 plus poison/sleep/anesthetic, Range: 30m, Ammo: 10-needle clip" },
  { "name": "Needler Rifle", "category": "Weapon", "cost": 250, "weight": 3, "capabilities": "Damage: 1d10 plus poison/sleep/anesthetic, Range: 100m, Ammo: 20-needle clip" },
  { "name": "Gyrojet Pistol", "category": "Weapon", "cost": 200, "weight": 1, "capabilities": "Damage: 1d10, Range: 50m, Ammo: 10-rocket jetclip" },
  { "name": "Gyrojet Rifle", "category": "Weapon", "cost": 300, "weight": 3, "capabilities": "Damage: 1d10, Range: 150m, Ammo: 10-rocket jetclip" },
  { "name": "Grenade Rifle", "category": "Weapon", "cost": 400, "weight": 4, "capabilities": "Fires launched grenades, Range: 150m, Ammo: 6-grenade internal magazine" },
  { "name": "Grenade Mortar", "category": "Weapon", "cost": 600, "weight": 12, "capabilities": "Fires launched grenades indirectly, Range: 500m, Ammo: 1 grenade per round, Crew: 2" },
  { "name": "Rocket Launcher", "category": "Weapon", "cost": 500, "weight": 8, "capabilities": "Fires anti-vehicle/personnel rockets, Range: 300m, Ammo: 1 rocket" },
  { "name": "Recoilless Rifle", "category": "Weapon", "cost": 750, "weight": 15, "capabilities": "Damage: 6d10, Range: 400m, Ammo: 1 recoilless shell per shot, Crew: 2" },
  { "name": "Frag Grenade", "category": "Weapon", "cost": 30, "weight": 0.5, "capabilities": "Damage: 5d10 shrapnel, Blast Radius: 5m, Throw: 30m" },
  { "name": "Doze Grenade", "category": "Weapon", "cost": 40, "weight": 0.5, "capabilities": "Damage: Sleep gas (d100 vs STA), Blast Radius: 5m, Duration: 5 turns" },
  { "name": "Smoke Grenade", "category": "Weapon", "cost": 10, "weight": 0.5, "capabilities": "Thick obscuring smoke, Radius: 10m, Duration: 10 turns" },
  { "name": "Tangler Grenade", "category": "Weapon", "cost": 50, "weight": 0.5, "capabilities": "Traps victims in sticky synthetic fibers (DEX/STR check to escape), Radius: 3m" },
  { "name": "Incendiary Grenade", "category": "Weapon", "cost": 45, "weight": 0.5, "capabilities": "Damage: 3d10 burn + fire damage, Radius: 3m" },
  { "name": "Poison Grenade", "category": "Weapon", "cost": 60, "weight": 0.5, "capabilities": "Damage: Toxic gas (d100 vs STA or lethal poison), Radius: 5m" },
  { "name": "Vibroknife", "category": "Weapon", "cost": 30, "weight": 1, "capabilities": "Damage: 1d10, Melee, Powered: 1 SEU per 10 minutes of use" },
  { "name": "Stun Baton", "category": "Weapon", "cost": 40, "weight": 1, "capabilities": "Damage: 1d10 Stun, Melee, Powered: 1 SEU per hit" },
  { "name": "Electric Sword", "category": "Weapon", "cost": 100, "weight": 2, "capabilities": "Damage: 2d10 (1d10 physical + 1d10 shock), Melee, Powered: 2 SEU per hit" },
  { "name": "Sonic Knife", "category": "Weapon", "cost": 50, "weight": 1, "capabilities": "Damage: 1d10+2, Melee, High-frequency vibrating blade, 1 SEU per 5 min" },
  { "name": "Sonic Sword", "category": "Weapon", "cost": 150, "weight": 2, "capabilities": "Damage: 2d10+2, Melee, High-frequency disruption blade, 2 SEU per 5 min" },
  { "name": "Shock Gloves", "category": "Weapon", "cost": 75, "weight": 1, "capabilities": "Damage: 1d10 Stun/Shock on unarmed hit, Melee, 1 SEU per hit" },
  { "name": "Brass Knuckles", "category": "Weapon", "cost": 5, "weight": 0.2, "capabilities": "Damage: Punch + 2, Melee, Archaic" },
  { "name": "Club / Nightstick", "category": "Weapon", "cost": 5, "weight": 1, "capabilities": "Damage: 1d10, Melee, Archaic blunt weapon" },
  { "name": "Polearm / Spear", "category": "Weapon", "cost": 15, "weight": 2, "capabilities": "Damage: 2d10, Melee reach weapon, Archaic" },
  { "name": "Knife / Dagger", "category": "Weapon", "cost": 10, "weight": 0.5, "capabilities": "Damage: 1d10-2, Melee/Thrown (10m), Archaic" },
  { "name": "Axe", "category": "Weapon", "cost": 20, "weight": 2, "capabilities": "Damage: 2d10, Melee, Archaic" },
  { "name": "Sword", "category": "Weapon", "cost": 50, "weight": 2, "capabilities": "Damage: 2d10, Melee, Archaic blade" },
  { "name": "Whip", "category": "Weapon", "cost": 15, "weight": 1, "capabilities": "Damage: 1d5 + entangle, Melee reach (3m), Archaic" },
  { "name": "Bow & Arrows", "category": "Weapon", "cost": 30, "weight": 1.5, "capabilities": "Damage: 1d10, Range: 50m, Ammo: Quiver of arrows, Archaic" },
  { "name": "Musket", "category": "Weapon", "cost": 40, "weight": 4, "capabilities": "Damage: 2d10, Range: 50m, Ammo: Powder & shot, Archaic black powder" },

  { "name": "SEU Clip (20 SEU)", "category": "Ammunition", "cost": 10, "weight": 0.1, "capabilities": "Standard 20 Energy Unit power clip for beam/stun/vibro weapons" },
  { "name": "Bulletclip (Pistol, 20 rds)", "category": "Ammunition", "cost": 5, "weight": 0.2, "capabilities": "20 solid slug bullets for Automatic Pistol" },
  { "name": "Bulletclip (Rifle, 20 rds)", "category": "Ammunition", "cost": 10, "weight": 0.3, "capabilities": "20 solid slug bullets for Automatic Rifle" },
  { "name": "Machine Gun Belt (100 rds)", "category": "Ammunition", "cost": 40, "weight": 2, "capabilities": "100-round linked ammo belt for Machine Gun" },
  { "name": "Jetclip (Pistol, 10 rds)", "category": "Ammunition", "cost": 20, "weight": 0.3, "capabilities": "10 gyrojet micro-rockets for Gyrojet Pistol" },
  { "name": "Jetclip (Rifle, 10 rds)", "category": "Ammunition", "cost": 30, "weight": 0.5, "capabilities": "10 gyrojet micro-rockets for Gyrojet Rifle" },
  { "name": "Needleclip (Barbed, 20 rds)", "category": "Ammunition", "cost": 15, "weight": 0.1, "capabilities": "20 barbed needles for Needler Pistol/Rifle" },
  { "name": "Needleclip (Anesthetic, 20 rds)", "category": "Ammunition", "cost": 30, "weight": 0.1, "capabilities": "20 fast-acting anesthetic needles for Needler Pistol/Rifle" },
  { "name": "Grenade Shells (Launcher, 6 rds)", "category": "Ammunition", "cost": 150, "weight": 1.5, "capabilities": "Magazine of 6 propelled frag grenade shells for Grenade Rifle/Mortar" },
  { "name": "Anti-Armor Rocket", "category": "Ammunition", "cost": 100, "weight": 2, "capabilities": "Damage: 8d10, Range: 300m, Single HEAT rocket for Rocket Launcher" },
  { "name": "Recoilless Shell", "category": "Ammunition", "cost": 80, "weight": 3, "capabilities": "Damage: 6d10, Single heavy shell for Recoilless Rifle" },
  { "name": "Arrows (Quiver of 20)", "category": "Ammunition", "cost": 10, "weight": 1, "capabilities": "20 feathered arrows for hunting and archaic bows" },
  { "name": "Powder & Shot (20 shots)", "category": "Ammunition", "cost": 10, "weight": 1, "capabilities": "Lead balls and black powder charges for musket" },

  { "name": "Skeinsuit", "category": "Defense", "cost": 200, "weight": 2, "capabilities": "Defends vs kinetic weapons (projectiles/melee), reduces damage by half" },
  { "name": "Civilian Skeinsuit", "category": "Defense", "cost": 150, "weight": 1.5, "capabilities": "Light concealable ballistic weave, absorbs 1d10 kinetic damage" },
  { "name": "Albedo Suit", "category": "Defense", "cost": 100, "weight": 2, "capabilities": "Ablative reflective suit, absorbs up to 50 HP of laser/energy fire before degrading" },
  { "name": "Albedo Screen", "category": "Defense", "cost": 500, "weight": 1, "capabilities": "Force screen absorbing laser and beam fire, drains 1 SEU per 2 pts damage, belt-worn" },
  { "name": "Inertia Screen", "category": "Defense", "cost": 600, "weight": 1, "capabilities": "Kinetic dampening field absorbing projectile and impact damage, drains 1 SEU per 2 pts damage" },
  { "name": "Gauss Screen", "category": "Defense", "cost": 700, "weight": 1.5, "capabilities": "Electromagnetic defense field deflecting charged particle and ion attacks, 1 SEU/round active" },
  { "name": "Holo Screen", "category": "Defense", "cost": 800, "weight": 1, "capabilities": "Projects deceptive displacement holographic image, imposes -20% hit penalty on attackers, 1 SEU/min" },
  { "name": "Sonic Screen", "category": "Defense", "cost": 650, "weight": 1.5, "capabilities": "Dampening sonic vibration field negating sonic attacks and stunners, 2 SEU/min" },

  { "name": "Techkit", "category": "Toolkit", "cost": 500, "weight": 5, "capabilities": "Full diagnostic and repair toolkit for mechanics and technological systems" },
  { "name": "Robcomkit", "category": "Toolkit", "cost": 800, "weight": 6, "capabilities": "Specialized tools and interface cables for robot and mainframe computer maintenance/override" },
  { "name": "Envirokit", "category": "Toolkit", "cost": 400, "weight": 4, "capabilities": "Atmospheric and ecological analysis sensor kit, monitors toxins and habitability" },
  { "name": "Lockpick Set (Electronic & Mechanical)", "category": "Toolkit", "cost": 150, "weight": 0.5, "capabilities": "Standard tension bars, bypass chips, and pick needles for security bypass" },
  { "name": "Standard Equipment Pack", "category": "Toolkit", "cost": 100, "weight": 10, "capabilities": "All-in-one survival pack: backpack, blanket, rations, rope, canteen, compass, matches" },
  { "name": "Demolitions Kit", "category": "Toolkit", "cost": 600, "weight": 4, "capabilities": "Wire strippers, detonator crimpers, blasting caps, and remote triggers for explosives" },
  { "name": "Geological Survey Kit", "category": "Toolkit", "cost": 350, "weight": 5, "capabilities": "Core sampler, mineral spectrometer, and seismic sensor pack" },

  { "name": "Medkit", "category": "Medical", "cost": 500, "weight": 5, "capabilities": "Advanced surgical scanner and medical instruments required for surgery and deep field treatment" },
  { "name": "First Aid Pack", "category": "Medical", "cost": 50, "weight": 1, "capabilities": "Basic trauma dressings and coagulants; restores 10 STA" },
  { "name": "Stimdose", "category": "Medical", "cost": 20, "weight": 0.1, "capabilities": "Emergency stimulant hypo; restores 10 STA immediately" },
  { "name": "Staydose", "category": "Medical", "cost": 20, "weight": 0.1, "capabilities": "Suspends vital functions, stabilizing dying character for 24 hours" },
  { "name": "Antidose", "category": "Medical", "cost": 20, "weight": 0.1, "capabilities": "Broad-spectrum poison neutralizer in the bloodstream" },
  { "name": "Biocort", "category": "Medical", "cost": 20, "weight": 0.1, "capabilities": "Cellular regenerator; doubles natural healing rate for 24 hours" },
  { "name": "Antibody Plus", "category": "Medical", "cost": 50, "weight": 0.1, "capabilities": "Immune system booster; grants +20% to Stamina checks against infection and diseases" },
  { "name": "Antitox", "category": "Medical", "cost": 40, "weight": 0.1, "capabilities": "Neutralizes ingested or contact chemical poisons" },
  { "name": "Omnimycin", "category": "Medical", "cost": 75, "weight": 0.1, "capabilities": "Universal antibiotic curative treating exotic planetary microbial infections" },
  { "name": "Telol", "category": "Medical", "cost": 100, "weight": 0.1, "capabilities": "Truth serum / disinhibitor; target must answer questions truthfully on failed STA check" },
  { "name": "Plastiflesh (Canister)", "category": "Medical", "cost": 45, "weight": 0.5, "capabilities": "Synthetic spray-on skin and antiseptic sealant; stops bleeding immediately" },
  { "name": "Local Anesthetic", "category": "Medical", "cost": 15, "weight": 0.1, "capabilities": "Topical and injectable nerve blocker; eliminates pain penalty during field treatment" },
  { "name": "Freeze Field Unit", "category": "Medical", "cost": 1000, "weight": 8, "capabilities": "Portable cryogenic stasis pod keeping critical patient alive indefinitely (10 SEU/day)" },
  { "name": "Vitasalt Pills (Bottle of 50)", "category": "Medical", "cost": 10, "weight": 0.1, "capabilities": "Electrolyte and mineral tablets preventing dehydration and heat exhaustion" },

  { "name": "Chronocom", "category": "Gear", "cost": 50, "weight": 0.5, "capabilities": "Wrist timepiece, personal communicator, and audio memo recorder" },
  { "name": "Polyvox", "category": "Gear", "cost": 1500, "weight": 2, "capabilities": "Linguistic universal translator; translates known alien languages in real time" },
  { "name": "Toxy-Rad Gauge", "category": "Gear", "cost": 100, "weight": 0.5, "capabilities": "Handheld sensor detecting radiation, chemical poisons, and atmospheric hazards" },
  { "name": "Gas Mask", "category": "Gear", "cost": 50, "weight": 1, "capabilities": "Filters airborne toxins, spores, smoke, and tear gas" },
  { "name": "Anti-Shock Implant", "category": "Gear", "cost": 1200, "weight": 0.1, "capabilities": "Surgical subdermal neural buffer preventing unconsciousness from sudden shock or pain" },
  { "name": "Everflame", "category": "Gear", "cost": 10, "weight": 0.1, "capabilities": "Miniaturized electronic plasma lighter; works underwater and in extreme weather" },
  { "name": "Exoskeleton (Power Frame)", "category": "Gear", "cost": 2500, "weight": 25, "capabilities": "Motorized harness granting +30 carry capacity and +20 STR for lifting/bracing (2 SEU/hr)" },
  { "name": "Flashlight", "category": "Gear", "cost": 10, "weight": 0.5, "capabilities": "High-intensity beam lantern, illuminates 100m, 1 SEU per 10 hours" },
  { "name": "Holoflares (Pack of 5)", "category": "Gear", "cost": 25, "weight": 0.5, "capabilities": "High-altitude signal flares emitting distinct holographic patterns for 1 hour" },
  { "name": "IR Goggles", "category": "Gear", "cost": 150, "weight": 0.5, "capabilities": "Infrared thermal vision goggles detecting heat signatures in pitch darkness" },
  { "name": "IR Jammer", "category": "Gear", "cost": 300, "weight": 1, "capabilities": "Scrambles thermal scanners and IR tracking sights in a 10m radius (1 SEU/min)" },
  { "name": "Life Jacket", "category": "Gear", "cost": 25, "weight": 1, "capabilities": "Self-inflating flotation vest with distress beacon" },
  { "name": "Machete / Brush Knife", "category": "Gear", "cost": 15, "weight": 1, "capabilities": "Heavy-bladed brush cutter for clearing dense jungle or flora; Damage: 1d10" },
  { "name": "Parawing", "category": "Gear", "cost": 250, "weight": 5, "capabilities": "Collapsible personal gliding wing for safe high-altitude drops and controlled descent" },
  { "name": "Radiophone", "category": "Gear", "cost": 150, "weight": 2, "capabilities": "Long-range tactical 2-way radio transceiver; range 100km planetary" },
  { "name": "Subspace Radio", "category": "Gear", "cost": 3000, "weight": 15, "capabilities": "Interstellar communications relay capable of broadcasting into orbital/subspace networks" },
  { "name": "Rope (25m synthetic)", "category": "Gear", "cost": 10, "weight": 2, "capabilities": "Ultra-tensile synthetic cord, holds up to 1000 kg" },
  { "name": "Solvaway (Canister)", "category": "Gear", "cost": 30, "weight": 0.5, "capabilities": "Neutralizing solvent that instantly dissolves Tangler threads and synthetic glues" },
  { "name": "Solvent (1 liter)", "category": "Gear", "cost": 20, "weight": 1, "capabilities": "Corrosive solvent dissolving plastics, resins, and organic membranes" },
  { "name": "Variable Timer / Detonator", "category": "Gear", "cost": 50, "weight": 0.2, "capabilities": "Multi-function digital fuse timer with delay, radio trip, and proximity triggers" },
  { "name": "Compass", "category": "Gear", "cost": 10, "weight": 0.5, "capabilities": "Magnetic navigational orientation compass" },
  { "name": "Flares (Pack of 5)", "category": "Gear", "cost": 10, "weight": 0.5, "capabilities": "Phosphorus handheld illumination torches; 1 hour burn each" },
  { "name": "Survival Rations (5 days)", "category": "Gear", "cost": 10, "weight": 1, "capabilities": "Concentrated nutrient cubes; 5 full days of balanced sustenance" },
  { "name": "Water Pack (2 liters)", "category": "Gear", "cost": 5, "weight": 2, "capabilities": "Durable hydration pack with integrated micro-filter tube" },
  { "name": "All-weather Blanket", "category": "Gear", "cost": 10, "weight": 0.5, "capabilities": "Reflective thermal insulation blanket protecting against extreme temperatures" },
  { "name": "Magnigoggles", "category": "Gear", "cost": 200, "weight": 0.5, "capabilities": "Binocular magnifying lenses with light intensification and infrared overlay" },
  { "name": "Sungoggles", "category": "Gear", "cost": 10, "weight": 0.1, "capabilities": "Polarized UV lenses preventing glare and protecting against flash blindness" },

  { "name": "Power Beltpack", "category": "Power", "cost": 100, "weight": 2, "capabilities": "Wearable power source holding up to 50 SEU; connects via heavy cable" },
  { "name": "Power Backpack", "category": "Power", "cost": 200, "weight": 5, "capabilities": "Heavy-duty wearable power bank holding up to 100 SEU" },
  { "name": "Parabattery Level 1 (50 SEU)", "category": "Power", "cost": 125, "weight": 2.5, "capabilities": "Stationary rechargeable storage battery with 50 SEU capacity" },
  { "name": "Parabattery Level 2 (100 SEU)", "category": "Power", "cost": 250, "weight": 5, "capabilities": "Medium rechargeable storage battery with 100 SEU capacity" },
  { "name": "Parabattery Level 3 (200 SEU)", "category": "Power", "cost": 500, "weight": 10, "capabilities": "Heavy industrial storage battery with 200 SEU capacity" },
  { "name": "Parabattery Level 4 (500 SEU)", "category": "Power", "cost": 1200, "weight": 25, "capabilities": "Base-station power cell storing 500 SEU capacity" },
  { "name": "Portable Generator (Chemical)", "category": "Power", "cost": 1000, "weight": 30, "capabilities": "Combustion power generator; recharges 10 SEU per hour of operation (uses liquid fuel)" },
  { "name": "Portable Computer Level 1", "category": "Power", "cost": 1500, "weight": 3, "capabilities": "Handheld micro-mainframe with 10 Function Points, running basic security/scientific programs" },
  { "name": "Portable Computer Level 2", "category": "Power", "cost": 3000, "weight": 6, "capabilities": "Rugged terminal with 20 Function Points, satellite uplink, and sensor analysis software" }
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/equipment.test.js"`
Expected: PASS with 5/5 tests passing.

- [ ] **Step 5: Run full server test suite**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: PASS (all server tests passing).

- [ ] **Step 6: Commit changes**

```bash
git add server/test/equipment.test.js data/inventory_items.json
git commit -m "feat(data): expand equipment catalog with canonical Alpha Dawn Expanded items and tests"
```

---

### Task 2: Character Sheet Equipment Modal Category Filter Tabs & UI Tests

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue`
- Modify: `client/test/CharacterSheetsView.test.js`

**Interfaces:**
- Consumes: `GET /api/equipment` via `this.equipmentList`
- Produces: Category filter pills (`All`, `Weapon`, `Ammunition`, `Defense`, `Toolkit`, `Medical`, `Gear`, `Power`) with live item counts, coordinated search/category filtering, and inventory addition.

- [ ] **Step 1: Write failing tests in `client/test/CharacterSheetsView.test.js`**

Add tests to `client/test/CharacterSheetsView.test.js` in a new `describe('Equipment Catalog Category Filtering & Tabs', ...)` block:

```javascript
  describe('Equipment Catalog Category Filtering & Tabs', () => {
    const mockEquipmentList = [
      { name: 'Laser Pistol', category: 'Weapon', cost: 500, weight: 1, capabilities: 'Damage: 1d10' },
      { name: 'Heavy Laser', category: 'Weapon', cost: 1000, weight: 15, capabilities: 'Damage: 1d10 to 30d10' },
      { name: 'SEU Clip (20 SEU)', category: 'Ammunition', cost: 10, weight: 0.1, capabilities: '20 SEU' },
      { name: 'Skeinsuit', category: 'Defense', cost: 200, weight: 2, capabilities: 'Defends vs kinetic' },
      { name: 'Techkit', category: 'Toolkit', cost: 500, weight: 5, capabilities: 'Diagnostic toolkit' },
      { name: 'Stimdose', category: 'Medical', cost: 20, weight: 0.1, capabilities: 'Restores 10 STA' },
      { name: 'Chronocom', category: 'Gear', cost: 50, weight: 0.5, capabilities: 'Personal communicator' },
      { name: 'Power Backpack', category: 'Power', cost: 200, weight: 5, capabilities: '100 SEU' },
    ];

    it('calculates category count accurately including All', () => {
      const vm = {
        equipmentList: mockEquipmentList,
      };

      const getCount = CharacterSheetsView.methods.getCategoryCount;
      expect(getCount.call(vm, 'All')).toBe(8);
      expect(getCount.call(vm, 'Weapon')).toBe(2);
      expect(getCount.call(vm, 'Ammunition')).toBe(1);
      expect(getCount.call(vm, 'Defense')).toBe(1);
      expect(getCount.call(vm, 'Toolkit')).toBe(1);
      expect(getCount.call(vm, 'Medical')).toBe(1);
      expect(getCount.call(vm, 'Gear')).toBe(1);
      expect(getCount.call(vm, 'Power')).toBe(1);
      expect(getCount.call(vm, 'NonExistent')).toBe(0);
    });

    it('filters equipment list by activeEquipmentCategory when category is not All', () => {
      const vm = {
        equipmentList: mockEquipmentList,
        activeEquipmentCategory: 'Weapon',
        equipmentSearchQuery: '',
      };

      let filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(2);
      expect(filtered.map(i => i.name)).toEqual(['Laser Pistol', 'Heavy Laser']);

      vm.activeEquipmentCategory = 'Defense';
      filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Skeinsuit');

      vm.activeEquipmentCategory = 'All';
      filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(8);
    });

    it('filters by both category and search query simultaneously', () => {
      const vm = {
        equipmentList: mockEquipmentList,
        activeEquipmentCategory: 'Weapon',
        equipmentSearchQuery: 'Heavy',
      };

      let filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Heavy Laser');

      // Search term does not match anything in active category
      vm.equipmentSearchQuery = 'Skeinsuit';
      filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(0);

      // Switching category back to All matches search term
      vm.activeEquipmentCategory = 'All';
      filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Skeinsuit');
    });

    it('defaults activeEquipmentCategory gracefully if unset on vm', () => {
      const vm = {
        equipmentList: mockEquipmentList,
        equipmentSearchQuery: '',
      };

      const filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(8);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/CharacterSheetsView.test.js"`
Expected: FAIL (`CharacterSheetsView.methods.getCategoryCount is not a function` or category filtering not yet implemented).

- [ ] **Step 3: Implement category filtering and tabs in `client/src/views/CharacterSheetsView.vue`**

1. In the `data()` section of `CharacterSheetsView.vue`, add:
```javascript
activeEquipmentCategory: 'All',
equipmentCategories: ['All', 'Weapon', 'Ammunition', 'Defense', 'Toolkit', 'Medical', 'Gear', 'Power'],
```

2. Update `filteredEquipmentList` in `computed`:
```javascript
filteredEquipmentList() {
  if (!this.equipmentList) return [];
  let list = this.equipmentList;
  if (this.activeEquipmentCategory && this.activeEquipmentCategory !== 'All') {
    list = list.filter(item => item.category === this.activeEquipmentCategory);
  }
  if (!this.equipmentSearchQuery) return list;
  const q = this.equipmentSearchQuery.toLowerCase().trim();
  return list.filter(item => 
    (item.name && item.name.toLowerCase().includes(q)) || 
    (item.category && item.category.toLowerCase().includes(q)) || 
    (item.capabilities && item.capabilities.toLowerCase().includes(q))
  );
},
```

3. In `methods`, add `getCategoryCount`:
```javascript
getCategoryCount(category) {
  if (!this.equipmentList) return 0;
  if (category === 'All') return this.equipmentList.length;
  return this.equipmentList.filter(item => item.category === category).length;
},
```

4. In the template for `Equipment Catalog Modal` (around line 524):
```html
        <p class="equipment-modal-desc">
          Search weapons, defenses, and gear from the Star Frontiers catalog. Click <strong>+ Add</strong> to add an item to your character's inventory.
        </p>

        <!-- Category Filter Tabs -->
        <div class="equipment-category-tabs" role="tablist" aria-label="Equipment Categories">
          <button
            v-for="cat in equipmentCategories"
            :key="cat"
            type="button"
            role="tab"
            class="cat-tab"
            :class="{ active: (activeEquipmentCategory || 'All') === cat }"
            :aria-selected="(activeEquipmentCategory || 'All') === cat"
            @click="activeEquipmentCategory = cat"
          >
            {{ cat }} <span class="cat-count">({{ getCategoryCount(cat) }})</span>
          </button>
        </div>

        <input 
          type="text" 
          v-model="equipmentSearchQuery" 
          placeholder="Search available equipment by name, category, or capability..." 
          class="modal-search"
          autofocus
        />
```

5. In the `<style scoped>` section of `CharacterSheetsView.vue`, add styling for category tabs:
```css
.equipment-category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.cat-tab {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid #334455;
  color: #8899aa;
  padding: 0.35rem 0.65rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.cat-tab:hover {
  background: rgba(0, 229, 255, 0.1);
  border-color: #00e5ff;
  color: #ffffff;
}

.cat-tab.active {
  background: rgba(0, 229, 255, 0.2);
  border-color: #00e5ff;
  color: #00e5ff;
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.3);
  font-weight: bold;
}

.cat-count {
  font-size: 0.75rem;
  opacity: 0.8;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/CharacterSheetsView.test.js"`
Expected: PASS.

- [ ] **Step 5: Run full client test suite and build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: PASS (all tests pass, build succeeds).

- [ ] **Step 6: Run full server test suite to ensure zero regressions**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: PASS.

- [ ] **Step 7: Commit changes**

```bash
git add client/src/views/CharacterSheetsView.vue client/test/CharacterSheetsView.test.js
git commit -m "feat(equipment): add category filter tabs and count badges to character sheet equipment catalog"
```

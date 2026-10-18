# Ship Weapon Selection Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to select and equip canonical Knight Hawks spaceship weapons (or create custom weapons) via an interactive modal when clicking "+ Add Weapon" on ship sheets, and allow renaming weapons directly on weapon cards.

**Architecture:**
- Creates a centralized canonical catalog (`client/src/constants/shipWeapons.js`) exporting all 10 official *Knight Hawks* weapons with exact damage, range, and ammo limits, plus a factory helper `createWeaponInstance`.
- Integrates an "Equip Ship Weapon" modal dialog into `client/src/views/ShipSheetsView.vue` with stat preview badges and custom weapon creator.
- Converts the static weapon title label on ship weapon cards into an editable text input that syncs with `wpn.type` and triggers ship updates.

**Tech Stack:**
- Vue 3 (Options API), Vite
- Knight Hawks Starship Combat Rules (pp. 19-21)
- Vitest

## Global Constraints
- Run all test and build commands inside the container: `docker exec sf-vtt-dev bash -c "<command>"`
- Client tests: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run <test-path>"`
- Full client suite & build: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
- Full server suite: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
- Weapon statistics must strictly match official Knight Hawks tables (Laser Cannon 2d10/Rng 10, Laser Battery 1d10/Rng 9, Electron Battery 1d10/Rng 10, Proton Battery 1d10/Rng 12, Disruptor Cannon 3d10/Rng 9, Torpedoes 4d10/Rng 4, Assault Rockets 2d10+4/Rng 4, Rocket Battery 2d10/Rng 3, Mines 3d10+5/Rng 0, Seeker Missile 5d10/Rng 99).
- Preserve existing weapon data compatibility and `updateShip()` real-time persistence.

---

### Task 1: Canonical Knight Hawks Weapons Catalog & Unit Tests

**Files:**
- Create: `client/src/constants/shipWeapons.js`
- Create: `client/test/shipWeapons.test.js`

**Interfaces:**
- Produces:
  - `SHIP_WEAPONS_CATALOG`: Array of 10 canonical weapon templates
  - `createWeaponInstance(template, overrides)`: `(template: object, overrides?: object) => object`

- [ ] **Step 1: Write failing unit test in `client/test/shipWeapons.test.js`**

```javascript
import { describe, it, expect } from 'vitest';
import { SHIP_WEAPONS_CATALOG, createWeaponInstance } from '../src/constants/shipWeapons.js';

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
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/shipWeapons.test.js"`
Expected: FAIL with "Cannot find module '../src/constants/shipWeapons.js'"

- [ ] **Step 3: Implement `client/src/constants/shipWeapons.js`**

```javascript
export const SHIP_WEAPONS_CATALOG = [
  {
    id: 'laser_cannon',
    name: 'Laser Cannon',
    category: 'Beam',
    damage: '2d10',
    range: 10,
    ammo_max: 0,
    ammo_current: 0,
    description: 'Heavy long-range forward-mount or turret beam weapon',
  },
  {
    id: 'laser_battery',
    name: 'Laser Battery',
    category: 'Beam',
    damage: '1d10',
    range: 9,
    ammo_max: 0,
    ammo_current: 0,
    description: 'Standard light defensive and offensive beam turret',
  },
  {
    id: 'electron_battery',
    name: 'Electron Battery',
    category: 'Beam',
    damage: '1d10',
    range: 10,
    ammo_max: 0,
    ammo_current: 0,
    description: 'Medium beam weapon with high armor penetration',
  },
  {
    id: 'proton_battery',
    name: 'Proton Battery',
    category: 'Beam',
    damage: '1d10',
    range: 12,
    ammo_max: 0,
    ammo_current: 0,
    description: 'High-energy beam weapon with maximum effective beam range',
  },
  {
    id: 'disruptor_cannon',
    name: 'Disruptor Cannon',
    category: 'Energy',
    damage: '3d10',
    range: 9,
    ammo_max: 0,
    ammo_current: 0,
    description: 'High-yield particle disruption cannon causing heavy hull damage',
  },
  {
    id: 'torpedoes',
    name: 'Torpedoes',
    category: 'Ordnance',
    damage: '4d10',
    range: 4,
    ammo_max: 2,
    ammo_current: 2,
    description: 'Self-guided anti-ship torpedoes; target can intercept with ICMs',
  },
  {
    id: 'assault_rockets',
    name: 'Assault Rockets',
    category: 'Ordnance',
    damage: '2d10+4',
    range: 4,
    ammo_max: 4,
    ammo_current: 4,
    description: 'High-acceleration tactical rocket salvo; target can intercept with ICMs',
  },
  {
    id: 'rocket_battery',
    name: 'Rocket Battery',
    category: 'Ordnance',
    damage: '2d10',
    range: 3,
    ammo_max: 4,
    ammo_current: 4,
    description: 'Multiple-launch rocket pods for close-range broadsides',
  },
  {
    id: 'mines',
    name: 'Mines',
    category: 'Ordnance',
    damage: '3d10+5',
    range: 0,
    ammo_max: 2,
    ammo_current: 2,
    description: 'Stationary hex hazard; detonates upon ship entry',
  },
  {
    id: 'seeker_missile',
    name: 'Seeker Missile',
    category: 'Ordnance',
    damage: '5d10',
    range: 99,
    ammo_max: 1,
    ammo_current: 1,
    description: 'Autonomous extreme-range pursuit missile with massive explosive payload',
  },
];

export function createWeaponInstance(template, overrides = {}) {
  const name = overrides.name || template.name || 'Custom Weapon';
  const ammoMax = overrides.ammo_max !== undefined ? Number(overrides.ammo_max) : (template.ammo_max || 0);
  const ammoCur = overrides.ammo_current !== undefined ? Number(overrides.ammo_current) : (template.ammo_current !== undefined ? template.ammo_current : ammoMax);

  return {
    id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    type: overrides.type || name,
    damage: overrides.damage || template.damage || '1d10',
    range: overrides.range !== undefined ? Number(overrides.range) : (template.range !== undefined ? Number(template.range) : 5),
    ammo_max: ammoMax,
    ammo_current: ammoCur,
    status: 'Online',
  };
}
```

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/shipWeapons.test.js"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/constants/shipWeapons.js client/test/shipWeapons.test.js
git commit -m "feat(ships): add canonical Knight Hawks weapons catalog and factory helper"
```

---

### Task 2: Equip Ship Weapon Modal, Sheet Integration, Editable Title, & Tests

**Files:**
- Modify: `client/src/views/ShipSheetsView.vue`
- Modify: `client/test/ShipSheetsView.test.js`

**Interfaces:**
- Consumes:
  - `SHIP_WEAPONS_CATALOG`, `createWeaponInstance` from `../constants/shipWeapons.js`
- Produces:
  - `showAddWeaponModal`: Boolean state controlling modal visibility
  - `openAddWeaponModal()`: Method opening modal and resetting custom inputs
  - `equipWeapon(weaponTemplate, ammoOverride)`: Method adding canonical weapon to `selectedShip.weapons`
  - `equipCustomWeapon()`: Method validating and adding custom weapon
  - `onWeaponNameChange(wpn)`: Method updating `wpn.type` when title is renamed and saving ship
  - Accessible modal dialog for weapon selection
  - Editable text input for weapon card title

- [ ] **Step 1: Write failing tests in `client/test/ShipSheetsView.test.js`**

Add tests to `client/test/ShipSheetsView.test.js`:

```javascript
import { SHIP_WEAPONS_CATALOG } from '../src/constants/shipWeapons.js';

describe('ShipSheetsView - Weapon Selection & Renaming', () => {
  it('opens and closes add weapon modal', () => {
    const vm = {
      showAddWeaponModal: false,
      customWeaponForm: { name: '', damage: '1d10', range: 5, ammo_max: 0 },
      weaponCategoryFilter: 'All',
    };
    ShipSheetsView.methods.openAddWeaponModal.call(vm);
    expect(vm.showAddWeaponModal).toBe(true);
    expect(vm.customWeaponForm.name).toBe('');
    expect(vm.weaponCategoryFilter).toBe('All');
  });

  it('equips a canonical weapon from catalog to selectedShip.weapons', () => {
    let updated = false;
    const vm = {
      showAddWeaponModal: true,
      selectedShip: {
        weapons: [],
      },
      updateShip() {
        updated = true;
      },
    };

    const torpedo = SHIP_WEAPONS_CATALOG.find((w) => w.name === 'Torpedoes');
    ShipSheetsView.methods.equipWeapon.call(vm, torpedo);

    expect(vm.selectedShip.weapons.length).toBe(1);
    expect(vm.selectedShip.weapons[0].name).toBe('Torpedoes');
    expect(vm.selectedShip.weapons[0].damage).toBe('4d10');
    expect(vm.selectedShip.weapons[0].range).toBe(4);
    expect(vm.selectedShip.weapons[0].ammo_max).toBe(2);
    expect(vm.selectedShip.weapons[0].ammo_current).toBe(2);
    expect(vm.selectedShip.weapons[0].status).toBe('Online');
    expect(vm.showAddWeaponModal).toBe(false);
    expect(updated).toBe(true);
  });

  it('equips a custom weapon to selectedShip.weapons', () => {
    let updated = false;
    const vm = {
      showAddWeaponModal: true,
      customWeaponForm: {
        name: 'Heavy Plasma Cannon',
        damage: '3d10',
        range: 7,
        ammo_max: 5,
      },
      selectedShip: {
        weapons: [],
      },
      updateShip() {
        updated = true;
      },
    };

    ShipSheetsView.methods.equipCustomWeapon.call(vm);

    expect(vm.selectedShip.weapons.length).toBe(1);
    expect(vm.selectedShip.weapons[0].name).toBe('Heavy Plasma Cannon');
    expect(vm.selectedShip.weapons[0].damage).toBe('3d10');
    expect(vm.selectedShip.weapons[0].range).toBe(7);
    expect(vm.selectedShip.weapons[0].ammo_max).toBe(5);
    expect(vm.selectedShip.weapons[0].status).toBe('Online');
    expect(vm.showAddWeaponModal).toBe(false);
    expect(updated).toBe(true);
  });

  it('updates weapon name and type and triggers updateShip onWeaponNameChange', () => {
    let updated = false;
    const vm = {
      updateShip() {
        updated = true;
      },
    };
    const wpn = {
      name: 'Port Laser Battery',
      type: 'Laser Battery',
    };

    ShipSheetsView.methods.onWeaponNameChange.call(vm, wpn);
    expect(wpn.name).toBe('Port Laser Battery');
    expect(wpn.type).toBe('Port Laser Battery');
    expect(updated).toBe(true);

    // Empty name falls back to previous type
    wpn.name = '   ';
    ShipSheetsView.methods.onWeaponNameChange.call(vm, wpn);
    expect(wpn.name).toBe('Port Laser Battery');
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/ShipSheetsView.test.js"`
Expected: FAIL on undefined methods (`openAddWeaponModal`, `equipWeapon`, etc.).

- [ ] **Step 3: Update `client/src/views/ShipSheetsView.vue`**

1. **Import in script section**:
   ```javascript
   import { SHIP_WEAPONS_CATALOG, createWeaponInstance } from '../constants/shipWeapons.js';
   ```

2. **Add to `data()`**:
   ```javascript
   showAddWeaponModal: false,
   weaponCatalog: SHIP_WEAPONS_CATALOG,
   weaponCategoryFilter: 'All',
   customWeaponForm: {
     name: '',
     damage: '1d10',
     range: 5,
     ammo_max: 0,
   },
   ```

3. **Add methods**:
   ```javascript
   openAddWeaponModal() {
     this.showAddWeaponModal = true;
     this.weaponCategoryFilter = 'All';
     this.customWeaponForm = {
       name: '',
       damage: '1d10',
       range: 5,
       ammo_max: 0,
     };
   },
   equipWeapon(weaponTemplate, ammoOverride = null) {
     if (!this.selectedShip) return;
     if (!this.selectedShip.weapons) this.selectedShip.weapons = [];
     const overrides = {};
     if (ammoOverride !== null && ammoOverride !== undefined) {
       overrides.ammo_max = Number(ammoOverride);
       overrides.ammo_current = Number(ammoOverride);
     }
     const instance = createWeaponInstance(weaponTemplate, overrides);
     this.selectedShip.weapons.push(instance);
     this.showAddWeaponModal = false;
     this.updateShip();
   },
   equipCustomWeapon() {
     if (!this.selectedShip) return;
     const name = (this.customWeaponForm.name || '').trim();
     if (!name) return;
     if (!this.selectedShip.weapons) this.selectedShip.weapons = [];
     const instance = createWeaponInstance(this.customWeaponForm, { name });
     this.selectedShip.weapons.push(instance);
     this.showAddWeaponModal = false;
     this.updateShip();
   },
   onWeaponNameChange(wpn) {
     if (!wpn) return;
     const trimmed = (wpn.name || '').trim();
     if (!trimmed) {
       wpn.name = wpn.type || 'Laser Battery';
     } else {
       wpn.name = trimmed;
     }
     wpn.type = wpn.name;
     this.updateShip();
   },
   ```

4. **Update `Armament / Weapons` button in template (line ~245)**:
   ```html
   <button class="btn-secondary" @click="openAddWeaponModal">+ Add Weapon</button>
   ```

5. **Update Weapon Card title in template (line ~253)**:
   Replace:
   ```html
   <span class="weapon-title-name">{{ wpn.type || wpn.name || 'Laser Battery' }}</span>
   ```
   With:
   ```html
   <input
     type="text"
     v-model="wpn.name"
     @change="onWeaponNameChange(wpn)"
     class="weapon-title-input"
     placeholder="Weapon Name"
     title="Click to rename weapon"
   />
   ```

6. **Add "Equip Ship Weapon" Modal in template (after create ship modal)**:
   ```html
   <!-- Equip Ship Weapon Modal -->
   <div v-if="showAddWeaponModal" class="modal-backdrop" @click.self="showAddWeaponModal = false">
     <div class="modal-card weapon-picker-modal">
       <div class="modal-header-row">
         <h3>🚀 Equip Ship Weapon</h3>
         <button type="button" class="btn-close-modal" @click="showAddWeaponModal = false">✕</button>
       </div>

       <!-- Category Filter Tabs -->
       <div class="weapon-filter-tabs">
         <button
           type="button"
           class="tab-btn"
           :class="{ active: weaponCategoryFilter === 'All' }"
           @click="weaponCategoryFilter = 'All'"
         >
           All ({{ weaponCatalog.length }})
         </button>
         <button
           type="button"
           class="tab-btn"
           :class="{ active: weaponCategoryFilter === 'Beam' }"
           @click="weaponCategoryFilter = 'Beam'"
         >
           Beams (5)
         </button>
         <button
           type="button"
           class="tab-btn"
           :class="{ active: weaponCategoryFilter === 'Ordnance' }"
           @click="weaponCategoryFilter = 'Ordnance'"
         >
           Ordnance & Rockets (5)
         </button>
         <button
           type="button"
           class="tab-btn"
           :class="{ active: weaponCategoryFilter === 'Custom' }"
           @click="weaponCategoryFilter = 'Custom'"
         >
           Custom Weapon
         </button>
       </div>

       <!-- Weapon Catalog List -->
       <div v-if="weaponCategoryFilter !== 'Custom'" class="weapon-picker-list">
         <div
           v-for="weapon in weaponCatalog"
           :key="weapon.id"
           v-show="weaponCategoryFilter === 'All' || weapon.category === weaponCategoryFilter"
           class="weapon-picker-item"
         >
           <div class="weapon-picker-info">
             <div class="weapon-picker-name-row">
               <span class="weapon-picker-name">{{ weapon.name }}</span>
               <span class="weapon-picker-category">{{ weapon.category }}</span>
             </div>
             <div class="weapon-picker-stats">
               <span class="stat-pill dmg">💥 {{ weapon.damage }}</span>
               <span class="stat-pill rng">🎯 {{ weapon.range }} hexes</span>
               <span class="stat-pill ammo">
                 {{ weapon.ammo_max > 0 ? `🔋 Ammo: ${weapon.ammo_max}` : '♾️ Unlimited' }}
               </span>
             </div>
             <p class="weapon-picker-desc">{{ weapon.description }}</p>
           </div>
           <button type="button" class="btn-equip-weapon" @click="equipWeapon(weapon)">
             Equip
           </button>
         </div>
       </div>

       <!-- Custom Weapon Form -->
       <div v-else class="custom-weapon-panel">
         <h4>Design Custom Ship Weapon</h4>
         <form @submit.prevent="equipCustomWeapon">
           <div class="form-group">
             <label>Weapon Name *</label>
             <input
               type="text"
               v-model="customWeaponForm.name"
               required
               placeholder="e.g. Heavy Plasma Cannon"
             />
           </div>
           <div class="form-row">
             <div class="form-group">
               <label>Damage Dice</label>
               <input
                 type="text"
                 v-model="customWeaponForm.damage"
                 required
                 placeholder="e.g. 2d10"
               />
             </div>
             <div class="form-group">
               <label>Range (hexes)</label>
               <input
                 type="number"
                 v-model.number="customWeaponForm.range"
                 min="0"
                 placeholder="5"
               />
             </div>
             <div class="form-group">
               <label>Max Ammo (0 = Unlimited)</label>
               <input
                 type="number"
                 v-model.number="customWeaponForm.ammo_max"
                 min="0"
                 placeholder="0"
               />
             </div>
           </div>
           <div class="modal-actions">
             <button type="button" class="btn-modal-cancel" @click="showAddWeaponModal = false">Cancel</button>
             <button type="submit" class="btn-modal-create" :disabled="!customWeaponForm.name.trim()">
               Equip Custom Weapon
             </button>
           </div>
         </form>
       </div>
     </div>
   </div>
   ```

7. **Add CSS styles** for `.weapon-title-input`, `.weapon-picker-modal`, `.weapon-filter-tabs`, `.weapon-picker-list`, `.weapon-picker-item`, `.weapon-picker-info`, `.weapon-picker-stats`, `.stat-pill`, `.btn-equip-weapon`, and `.custom-weapon-panel`.

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/ShipSheetsView.test.js"`
Expected: PASS

- [ ] **Step 5: Run full client suite and build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: ALL pass with zero errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/views/ShipSheetsView.vue client/test/ShipSheetsView.test.js
git commit -m "feat(ships): add Equip Ship Weapon modal and editable weapon card titles"
```

# Space Weapon Firing Restrictions & Custom Weapons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Star Frontiers Knight Hawks weapon firing restrictions/capabilities (e.g., `FF`, `T`, `MPO`, `RD`, `LTD`) to the Rulebooks Ship-to-Ship Combat reference table with an abbreviations legend, update weapon catalogs and ship presets, add restriction toggle chips and custom input to the custom ship weapon designer, and render restriction tags in Ship Sheets and the Space Combat VTT.

**Architecture:**
- Update `client/src/constants/combatReference.js` with `restrictions` on each standard ship weapon and export `WEAPON_RESTRICTIONS_LEGEND`.
- Update `client/src/components/QuickReferenceTables.vue` with an `Arcs & Restrictions` column and an abbreviations legend card grid.
- Update `client/src/constants/shipWeapons.js` (`SHIP_WEAPONS_CATALOG` and `createWeaponInstance`) and `client/src/constants/shipPresets.js` to normalize and persist `restrictions`.
- Update `client/src/views/ShipSheetsView.vue` with catalog restriction pills, custom weapon interactive toggle chips + custom text field, and equipped armament tags.
- Update `client/src/views/SpaceVttView.vue` to render restriction badges on ship token weapons.

**Tech Stack:** Vue 3, Vite, Vitest, JavaScript (ESM).

## Global Constraints
- Strictly adhere to Star Frontiers Knight Hawks rulebook abbreviations: `FF` (Forward Firing), `T` (Turret / 360°), `MPO` (Moving Player Only), `RD` (Range Diffusion), `LTD` (Limited Supply).
- Preserve existing weapon data properties (`id`, `name`, `type`, `damage`, `range`, `ammo_max`, `ammo_current`, `status`).
- Run all test and verification commands inside the Docker container `sf-vtt-dev` (`docker exec sf-vtt-dev bash -c "..."`).

---

### Task 1: Rulebook Reference Table & Abbreviations Legend

**Files:**
- Modify: `client/src/constants/combatReference.js`
- Modify: `client/src/components/QuickReferenceTables.vue`
- Modify: `client/src/constants/combatReference.test.js`
- Modify: `client/test/QuickReferenceTables.test.js`

**Interfaces:**
- Consumes: `SHIP_COMBAT_REF` from `client/src/constants/combatReference.js`
- Produces: `WEAPON_RESTRICTIONS_LEGEND` export and `restrictions` array on every item in `SHIP_COMBAT_REF.weapons`.

- [ ] **Step 1: Write failing tests for combatReference and QuickReferenceTables**

In `client/src/constants/combatReference.test.js`:
```javascript
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

    const lc = SHIP_COMBAT_REF.weapons.find(w => w.name === 'Laser Cannon');
    expect(lc.restrictions).toEqual(['FF', 'RD']);

    const lb = SHIP_COMBAT_REF.weapons.find(w => w.name === 'Laser Battery');
    expect(lb.restrictions).toEqual(['T', 'RD']);
  });
```

In `client/test/QuickReferenceTables.test.js`:
```javascript
  it('renders Arcs & Restrictions column and abbreviations legend in Ship-to-Ship tab', async () => {
    const wrapper = mount(QuickReferenceTables, {
      props: { initialCategory: 'ship' },
    });
    const html = wrapper.html();
    expect(html).toContain('Arcs &amp; Restrictions');
    expect(html).toContain('Weapon Restrictions &amp; Abbreviations');
    expect(html).toContain('Forward Firing');
    expect(html).toContain('Range Diffusion');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run src/constants/combatReference.test.js test/QuickReferenceTables.test.js"`
Expected: FAIL with missing exports or missing assertions.

- [ ] **Step 3: Implement weapon restrictions and abbreviations legend**

In `client/src/constants/combatReference.js`:
Add `WEAPON_RESTRICTIONS_LEGEND`:
```javascript
export const WEAPON_RESTRICTIONS_LEGEND = {
  FF: {
    code: 'FF',
    name: 'Forward Firing',
    description: 'Weapon can only fire into the forward 60° arc along the ship\'s facing hex direction.'
  },
  T: {
    code: 'T',
    name: 'Turret (360°)',
    description: 'Weapon can fire in any direction (all 360° hex arcs). Standard for defensive and offensive beam batteries.'
  },
  MPO: {
    code: 'MPO',
    name: 'Moving Player Only',
    description: 'Weapon can only be fired during the attacking ship\'s own combat phase (cannot fire defensive fire during enemy movement).'
  },
  RD: {
    code: 'RD',
    name: 'Range Diffusion',
    description: 'Beam diffusion reduces accuracy by -5% per hex of distance to target.'
  },
  LTD: {
    code: 'LTD',
    name: 'Limited Supply',
    description: 'Ammunition is finite and consumed upon firing (tracked on ship record sheet).'
  }
};
```
Add `restrictions` array to each weapon in `SHIP_COMBAT_REF.weapons`:
- Laser Cannon: `['FF', 'RD']`
- Laser Battery: `['T', 'RD']`
- Electron Battery: `['T', 'RD']`
- Proton Battery: `['T', 'RD']`
- Disruptor Cannon: `['FF', 'RD']`
- Torpedo: `['MPO', 'LTD']`
- Assault Rocket: `['FF', 'MPO', 'LTD']`
- Rocket Battery: `['LTD']`
- Mine: `['LTD']`
- Seeker Missile: `['LTD']`

In `client/src/components/QuickReferenceTables.vue`:
- Import `WEAPON_RESTRICTIONS_LEGEND` from `../constants/combatReference.js`.
- Add `<th>Arcs &amp; Restrictions</th>` to the table header in Ship Weapons.
- In `v-for="w in filteredShipWeapons"`, add:
```html
<td class="col-restrictions">
  <span
    v-for="tag in (w.restrictions || [])"
    :key="tag"
    class="restriction-pill"
    :class="tag.toLowerCase()"
    :title="weaponLegend[tag]?.name || tag"
  >
    {{ tag }}
  </span>
</td>
```
- Below the Ship Weapons table, add the legend section:
```html
<div class="restrictions-legend-box">
  <h3 class="legend-title">ℹ️ Weapon Restrictions &amp; Abbreviations</h3>
  <div class="legend-grid">
    <div v-for="(info, code) in weaponLegend" :key="code" class="legend-card">
      <div class="legend-badge-row">
        <span class="restriction-pill" :class="code.toLowerCase()">{{ code }}</span>
        <strong class="legend-name">{{ info.name }}</strong>
      </div>
      <p class="legend-desc">{{ info.description }}</p>
    </div>
  </div>
</div>
```
- Add styling for `.restriction-pill`, `.restrictions-legend-box`, `.legend-grid`, and `.legend-card`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run src/constants/combatReference.test.js test/QuickReferenceTables.test.js"`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add client/src/constants/combatReference.js client/src/components/QuickReferenceTables.vue client/src/constants/combatReference.test.js client/test/QuickReferenceTables.test.js
git commit -m "feat(rules): add weapon restrictions column and abbreviations legend to ship combat quick reference"
```

---

### Task 2: Weapon Catalog, Presets & Instance Factory

**Files:**
- Modify: `client/src/constants/shipWeapons.js`
- Modify: `client/src/constants/shipPresets.js`
- Modify: `client/test/shipWeapons.test.js`

**Interfaces:**
- Consumes: `createWeaponInstance` from `client/src/constants/shipWeapons.js`
- Produces: `restrictions: string[]` on all `SHIP_WEAPONS_CATALOG` items, `SHIP_PRESETS` weapon entries, and normalized in `createWeaponInstance`.

- [ ] **Step 1: Write failing tests for shipWeapons**

In `client/test/shipWeapons.test.js`:
```javascript
  it('includes restrictions on catalog weapons and normalizes restrictions in createWeaponInstance', () => {
    for (const w of SHIP_WEAPONS_CATALOG) {
      expect(Array.isArray(w.restrictions)).toBe(true);
      expect(w.restrictions.length).toBeGreaterThan(0);
    }

    const lc = SHIP_WEAPONS_CATALOG.find(w => w.id === 'laser_cannon');
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/shipWeapons.test.js"`
Expected: FAIL on `restrictions` assertions.

- [ ] **Step 3: Implement restrictions in catalog, presets, and factory**

In `client/src/constants/shipWeapons.js`:
- Add `restrictions: [...]` to all catalog weapons:
  - `laser_cannon`: `['FF', 'RD']`
  - `laser_battery`: `['T', 'RD']`
  - `electron_battery`: `['T', 'RD']`
  - `proton_battery`: `['T', 'RD']`
  - `disruptor_cannon`: `['FF', 'RD']`
  - `torpedoes`: `['MPO', 'LTD']`
  - `assault_rockets`: `['FF', 'MPO', 'LTD']`
  - `rocket_battery`: `['LTD']`
  - `mines`: `['LTD']`
  - `seeker_missile`: `['LTD']`
- Update `createWeaponInstance(template = {}, overrides = {})`:
```javascript
  let restrictions = [];
  const rawRestrictions = overrides.restrictions !== undefined ? overrides.restrictions : template.restrictions;
  if (Array.isArray(rawRestrictions)) {
    restrictions = rawRestrictions.map(r => String(r).trim()).filter(Boolean);
  } else if (typeof rawRestrictions === 'string' && rawRestrictions.trim()) {
    restrictions = rawRestrictions.split(',').map(r => r.trim()).filter(Boolean);
  }

  return {
    ...
    restrictions,
    ...
  };
```

In `client/src/constants/shipPresets.js`:
- Ensure weapons defined in `SHIP_PRESETS` include their `restrictions` array matching their weapon type.

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/shipWeapons.test.js"`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add client/src/constants/shipWeapons.js client/src/constants/shipPresets.js client/test/shipWeapons.test.js
git commit -m "feat(space): add restrictions to ship weapon catalog, presets, and factory"
```

---

### Task 3: Custom Weapon Designer & Ship Sheets / Space VTT UI

**Files:**
- Modify: `client/src/views/ShipSheetsView.vue`
- Modify: `client/src/views/SpaceVttView.vue`
- Modify: `client/test/ShipSheetsView.test.js`

**Interfaces:**
- Consumes: `restrictions` property on ship weapon objects, `createWeaponInstance` from `shipWeapons.js`.
- Produces: Interactive restriction toggle chips (`FF`, `T`, `MPO`, `RD`, `LTD`) + custom text field in `ShipSheetsView.vue` custom weapon modal; renders restriction badges on catalog cards, equipped ship weapons, and Space VTT token weapon lists.

- [ ] **Step 1: Write failing tests for ShipSheetsView custom weapon restrictions**

In `client/test/ShipSheetsView.test.js`:
```javascript
  it('supports selecting restriction chips and custom restrictions in custom weapon modal', () => {
    expect(ShipSheetsView.data().customWeaponForm.selectedTags).toBeDefined();
    expect(ShipSheetsView.data().customWeaponForm.customRestrictions).toBeDefined();
    expect(Array.isArray(ShipSheetsView.data().STANDARD_RESTRICTION_TAGS)).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/ShipSheetsView.test.js"`
Expected: FAIL on customWeaponForm properties.

- [ ] **Step 3: Implement Custom Weapon Designer, Ship Sheets badges, and Space VTT badges**

In `client/src/views/ShipSheetsView.vue`:
1. In `data()`:
   - Add `STANDARD_RESTRICTION_TAGS: ['FF', 'T', 'MPO', 'RD', 'LTD']`.
   - Update `customWeaponForm`:
     ```javascript
     customWeaponForm: {
       name: '',
       damage: '1d10',
       range: 5,
       ammo_max: 0,
       selectedTags: [],
       customRestrictions: '',
     }
     ```
2. In `openAddWeaponModal`:
   - Reset `selectedTags: []` and `customRestrictions: ''`.
3. Add method `toggleRestrictionTag(tag)`:
   - Toggles `tag` inside `customWeaponForm.selectedTags`.
4. In `equipCustomWeapon`:
   - Merge `selectedTags` and any comma-separated entries from `customRestrictions`:
     ```javascript
     const customParts = (this.customWeaponForm.customRestrictions || '')
       .split(',')
       .map(s => s.trim())
       .filter(Boolean);
     const combinedRestrictions = Array.from(new Set([...this.customWeaponForm.selectedTags, ...customParts]));
     const instance = createWeaponInstance(this.customWeaponForm, {
       name,
       restrictions: combinedRestrictions,
     });
     ```
5. In the Custom Weapon template panel:
   - Render:
     ```html
     <div class="form-group">
       <label>Firing Arcs &amp; Limitations</label>
       <div class="restriction-toggle-group">
         <button
           v-for="tag in STANDARD_RESTRICTION_TAGS"
           :key="tag"
           type="button"
           class="btn-tag-chip"
           :class="{ active: customWeaponForm.selectedTags.includes(tag), [tag.toLowerCase()]: true }"
           @click="toggleRestrictionTag(tag)"
         >
           {{ tag }}
         </button>
       </div>
       <input
         type="text"
         v-model="customWeaponForm.customRestrictions"
         placeholder="Custom / other restrictions (e.g. Aft, Port)"
         class="custom-restrictions-input"
       />
     </div>
     ```
6. In the catalog weapon picker item template:
   - Display `w.restrictions` tags beneath the weapon name/damage row.
7. In the equipped Armament list:
   - Render weapon restriction pills (`<span v-for="tag in (wpn.restrictions || [])" :key="tag" class="wpn-restriction-pill" :class="tag.toLowerCase()">{{ tag }}</span>`).

In `client/src/views/SpaceVttView.vue`:
- In the ship token inspector under weapons list, render restriction badges on each weapon:
  ```html
  <span v-for="tag in (wpn.restrictions || [])" :key="tag" class="token-wpn-tag" :class="tag.toLowerCase()">
    {{ tag }}
  </span>
  ```
- Add clean styling for `.token-wpn-tag`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/ShipSheetsView.test.js"`
Expected: PASS

- [ ] **Step 5: Run full test suite and build verification**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && cd ../server && npx vitest run"`
Expected: All tests pass.
Run: `docker exec sf-vtt-dev bash -c "cd client && npx vite build"`
Expected: Build succeeds.

- [ ] **Step 6: Commit changes**

```bash
git add client/src/views/ShipSheetsView.vue client/src/views/SpaceVttView.vue client/test/ShipSheetsView.test.js
git commit -m "feat(space): add restriction chips to custom weapon designer and render badges in ship sheets and space vtt"
```

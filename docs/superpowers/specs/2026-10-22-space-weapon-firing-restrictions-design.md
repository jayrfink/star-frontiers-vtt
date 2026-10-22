# Space Weapon Firing Restrictions & Custom Weapons Spec

**Date:** 2026-10-22  
**Status:** Approved by User  
**Scope:** Knight Hawks Rulebook Reference, Weapon Catalogs, Custom Ship Weapon Designer, Ship Sheets, and Space Combat VTT.

---

## 1. Problem Statement & Goals
In Star Frontiers Knight Hawks space combat, weapons have specific firing arcs and tactical limitations (such as `FF` for Forward Firing, `T` for Turret/360°, `MPO` for Moving Player Only, `RD` for Range Diffusion, and `LTD` for Limited Ammo). These restrictions are critical for tactical play on the hex grid but are easy to forget without constant rulebook consultation.

Furthermore, when GameMasters or players design custom ship weapons on ship record sheets, there is currently no way to specify firing arcs or restrictions, leaving custom weapons without documented tactical limitations.

### Goals
1. **Rulebooks Reference (`QuickReferenceTables.vue` & `combatReference.js`):**
   - Add an **Arcs & Restrictions** column to the Ship Weapons table.
   - Add a dedicated **Weapon Restrictions & Abbreviations Legend** beneath the table defining all Knight Hawks abbreviations (`FF`, `T`, `MPO`, `RD`, `LTD`).
2. **Catalog & Ship Presets (`shipWeapons.js` & `shipPresets.js`):**
   - Add `restrictions: [...]` metadata to all standard ship weapons and pre-equipped preset ship weapons.
   - Ensure `createWeaponInstance` normalizes and persists `restrictions`.
3. **Custom Ship Weapon Designer (`ShipSheetsView.vue`):**
   - Provide interactive quick-toggle chips for standard tags (`FF`, `T`, `MPO`, `RD`, `LTD`) plus a text input for custom freeform restrictions.
   - Display restriction tags on weapon picker items and equipped armament lists.
4. **Space VTT Display (`SpaceVttView.vue`):**
   - Display weapon restriction tags in the Space VTT token inspector/armament display so players and GMs can easily verify firing arcs during battle.

---

## 2. Rulebook Weapon Restrictions & Legend

### 2.1 Standard Knight Hawks Weapon Codes
| Code | Full Name | Tactical Rule Definition |
|---|---|---|
| **FF** | Forward Firing | Can only fire into the forward 60° arc along the ship's facing hex direction. |
| **T** | Turret (360°) | Can fire in all directions (any 360° hex arc). Standard for beam batteries. |
| **MPO** | Moving Player Only | Can only fire during the attacking player's combat phase (cannot fire defensive fire during enemy turn). |
| **RD** | Range Diffusion | Beam diffusion reduces accuracy by -5% per hex of distance to the target. |
| **LTD** | Limited Supply | Ammunition is finite and consumed upon firing (tracked on ship record sheet). |

### 2.2 Standard Weapon Assignments (`combatReference.js` & `shipWeapons.js`)
- **Laser Cannon:** `['FF', 'RD']` (Range 10, unlimited ammo, forward mount or turret)
- **Laser Battery:** `['T', 'RD']` (Range 9, unlimited ammo, turret 360°)
- **Electron Battery:** `['T', 'RD']` (Range 10, unlimited ammo, turret 360°)
- **Proton Battery:** `['T', 'RD']` (Range 12, unlimited ammo, turret 360°)
- **Disruptor Cannon:** `['FF', 'RD']` (Range 9, unlimited ammo, forward heavy mount)
- **Torpedo:** `['MPO', 'LTD']` (Range 4, 2 ammo, moving player only)
- **Assault Rockets:** `['FF', 'MPO', 'LTD']` (Range 4, 4 ammo, forward firing, moving player only)
- **Rocket Battery:** `['LTD']` (Range 3, 4 ammo, multiple rocket salvo)
- **Mines:** `['LTD']` (Range 0, 2 ammo, stationary hex hazard)
- **Seeker Missile:** `['LTD']` (Range unlimited, 1 ammo, autonomous pursuit)

---

## 3. UI & Component Architecture

### 3.1 Rulebooks View (`QuickReferenceTables.vue`)
- **Table Structure:**
  - Insert `<th class="col-restrictions">Arcs &amp; Restrictions</th>` between Damage/Range and Ammo.
  - Render restriction badges (`<span class="restriction-tag" :class="tag.toLowerCase()">{{ tag }}</span>`).
- **Legend Component/Box:**
  - Placed directly under the Ship Weapons table.
  - Formatted as a grid of compact explanation cards with colored abbreviation badges and concise rules text.

### 3.2 Ship Sheets View (`ShipSheetsView.vue`)
- **Equip Modal Catalog Cards:**
  - Display weapon restriction pills (`FF`, `T`, `MPO`, `RD`, `LTD`) below the weapon name/damage row.
- **Custom Weapon Designer Panel:**
  - New form field section: `Firing Arcs & Restrictions`.
  - Toggle chip buttons:
    - `[FF] Forward Firing`
    - `[T] Turret (360°)`
    - `[MPO] Moving Player Only`
    - `[RD] Range Diffusion`
    - `[LTD] Limited Supply`
  - Text input: `Custom / Other Restrictions` (e.g. `Aft Arc, Port Broadside`).
  - Active chips are highlighted with active accent colors.
  - Submitting merges selected chip tags and any comma-separated custom text into `customWeaponForm.restrictions`.
- **Equipped Weapon List (`Armament`):**
  - Render restriction badges alongside damage, range, and ammo pills for each equipped weapon.

### 3.3 Space VTT View (`SpaceVttView.vue`)
- In the Space VTT Token Inspector under the ship token's weapons list, render restriction tags on each weapon item so tactical arcs can be referenced without switching tabs.

---

## 4. Testing & Verification Plan

### 4.1 Unit & Component Tests
1. **`client/test/combatReference.test.js`:**
   - Verify all `SHIP_COMBAT_REF.weapons` contain valid `restrictions` arrays with Knight Hawks standard tags.
2. **`client/test/shipWeapons.test.js`:**
   - Verify `SHIP_WEAPONS_CATALOG` items contain `restrictions`.
   - Verify `createWeaponInstance` correctly normalizes array and string inputs for `restrictions`.
3. **`client/test/QuickReferenceTables.test.js`:**
   - Verify table renders the `Arcs & Restrictions` column header and badges.
   - Verify the abbreviations legend renders `FF`, `T`, `MPO`, `RD`, and `LTD`.
4. **`client/test/ShipSheetsView.test.js`:**
   - Verify custom weapon designer toggles chips and populates `restrictions`.
   - Verify equipped weapon list displays restriction tags.
5. **Full Suite Verification:**
   - Run `docker exec sf-vtt-dev bash -c "cd client && npx vitest run"` to ensure 100% test pass rate.
   - Run `docker exec sf-vtt-dev bash -c "cd client && npx vite build"` to ensure production bundle compiles cleanly.

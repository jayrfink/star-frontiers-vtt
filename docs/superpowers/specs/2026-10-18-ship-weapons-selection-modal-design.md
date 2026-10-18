# Ship Weapon Selection Modal Design Specification

## Overview
When customizing or maintaining starships in the Star Frontiers VTT (`ShipSheetsView.vue`), adding a weapon currently appends a generic entry labeled `"New Weapon"` with no selection mechanism or direct way to change the label.

This feature introduces:
1. A canonical **Knight Hawks Spaceship Weapons Catalog** (`client/src/constants/shipWeapons.js`).
2. An accessible, dark sci-fi **"Equip Ship Weapon" Modal** (`AddShipWeaponModal.vue` or integrated in `ShipSheetsView.vue`) that presents a list of canonical weapons with full stats (damage, range, ammo, description) and a custom weapon option.
3. An **editable weapon name field** directly on the weapon card in `ShipSheetsView.vue` so users can customize or rename any weapon at any time.

---

## 1. Canonical Weapons Catalog (`client/src/constants/shipWeapons.js`)

The catalog incorporates the official weapons from the *Knight Hawks Expansion Rules* combat tables:

| Weapon | Category | Damage | Range (hexes) | Default Ammo | Notes / Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Laser Cannon** | Beam | `2d10` | 10 | 0 (Unlimited) | Heavy long-range forward-mount or turret beam weapon |
| **Laser Battery** | Beam | `1d10` | 9 | 0 (Unlimited) | Standard light defensive and offensive beam turret |
| **Electron Battery** | Beam | `1d10` | 10 | 0 (Unlimited) | Medium beam weapon with high armor penetration |
| **Proton Battery** | Beam | `1d10` | 12 | 0 (Unlimited) | High-energy beam weapon with maximum effective beam range |
| **Disruptor Cannon** | Energy | `3d10` | 9 | 0 (Unlimited) | High-yield particle disruption cannon causing heavy hull damage |
| **Torpedoes** | Heavy Ordnance | `4d10` | 4 | 2 | Self-guided anti-ship torpedoes; target can intercept with ICMs |
| **Assault Rockets** | Rocket | `2d10+4` | 4 | 4 | High-acceleration tactical rocket salvo; target can intercept with ICMs |
| **Rocket Battery** | Rocket | `2d10` | 3 | 4 | Multiple-launch rocket pods for close-range broadsides |
| **Mines** | Hazard | `3d10+5` | 0 | 2 | Stationary hex hazard; detonates upon ship entry |
| **Seeker Missile** | Missile | `5d10` | 99 | 1 | Autonomous extreme-range pursuit missile with massive explosive payload |

### Factory Helper
```javascript
export function createWeaponInstance(template, customOverrides = {}) {
  const name = customOverrides.name || template.name;
  return {
    id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    type: customOverrides.type || name,
    damage: customOverrides.damage || template.damage,
    range: customOverrides.range !== undefined ? customOverrides.range : template.range,
    ammo_max: customOverrides.ammo_max !== undefined ? customOverrides.ammo_max : template.ammo_max,
    ammo_current: customOverrides.ammo_current !== undefined ? customOverrides.ammo_current : template.ammo_current,
    status: 'Online',
  };
}
```

---

## 2. Modal Dialog Workflow (`AddShipWeaponModal.vue` / `ShipSheetsView.vue`)

### Trigger
- In `ShipSheetsView.vue` under the **Armament / Weapons** card, clicking `+ Add Weapon` sets `showAddWeaponModal = true`.

### Modal UI Layout
- **Header**: `🚀 Equip Ship Weapon` with close button (`✕`) and Escape key dismissal.
- **Weapon Categories / Sections**:
  - **Beam Weapons**: Laser Cannon, Laser Battery, Electron Battery, Proton Battery, Disruptor Cannon.
  - **Ordnance & Rockets**: Torpedoes, Assault Rockets, Rocket Battery, Mines, Seeker Missile.
  - **Custom Weapon Builder**: Collapsible or tabbed section allowing user to input custom weapon name, damage dice, range, and ammo.
- **Weapon Item Display**:
  - Weapon Name & Type badge (e.g. `Beam`, `Heavy Ordnance`, `Rocket`).
  - Stat Badges:
    - Damage: `💥 2d10`
    - Range: `🎯 10 hexes`
    - Ammo: `♾️ Unlimited` or `🔋 Ammo: 2` (with optional editable initial count)
  - Brief description from Knight Hawks rulebook.
  - **`Equip` Button**: Appends weapon to `selectedShip.weapons`, triggers `this.updateShip()`, and closes the modal.

### Custom Weapon Creation
- Input fields:
  - Name (required, e.g. "Plasma Torpedo")
  - Damage (default `1d10`)
  - Range (default `5`)
  - Ammo Capacity (default `0` for unlimited, or e.g. `2`, `4`)
- Action: "Equip Custom Weapon" button.

---

## 3. Weapon Card Title Editing (`ShipSheetsView.vue`)

Currently:
```html
<span class="weapon-title-name">{{ wpn.type || wpn.name || 'Laser Battery' }}</span>
```
Updated to:
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
- Method `onWeaponNameChange(wpn)`:
  ```javascript
  onWeaponNameChange(wpn) {
    if (!wpn.name || !wpn.name.trim()) {
      wpn.name = wpn.type || 'Laser Battery';
    }
    wpn.type = wpn.name;
    this.updateShip();
  }
  ```
- CSS: Transparent background, subtle border on hover, glow on focus, styled to look like an integrated card heading.

---

## 4. Automated Testing Strategy

### Unit Tests
1. **`client/test/shipWeapons.test.js`**:
   - Verifies `SHIP_WEAPONS_CATALOG` exports all 10 canonical Knight Hawks weapons with accurate stats.
   - Verifies `createWeaponInstance` assigns default online status, unique ID, and handles custom overrides.
2. **`client/test/ShipSheetsView.test.js`**:
   - Verifies clicking `+ Add Weapon` opens the weapon selection modal.
   - Verifies equipping a canonical weapon adds the item to `selectedShip.weapons` with rulebook stats.
   - Verifies equipping a custom weapon adds the item with specified parameters.
   - Verifies renaming a weapon updates `wpn.name`, `wpn.type`, and triggers ship update.

---

## 5. Verification Commands
- `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/shipWeapons.test.js test/ShipSheetsView.test.js"`
- `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
- `docker exec sf-vtt-dev bash -c "cd server && npm test"`

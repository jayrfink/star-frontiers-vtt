# Knight Hawks Ship Classes & Armament/Defense Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `ShipSheetsView.vue` with 13 official Knight Hawks ship class presets (Fighter, Assault Scout, Corvette, Frigate, Destroyer, Light Cruiser, Heavy Cruiser, Assault Carrier, Battleship, Small/Medium/Heavy Freighters, Space Station), interactive weapon status & ammo management, and defensive screen/ICM controls with real-time Socket.io synchronization.

**Architecture:** Create `client/src/constants/shipPresets.js` containing official presets. Enhance `ShipSheetsView.vue` with a Class selector that auto-populates stats, weapons, and defenses while supporting customization, plus quick actions for firing weapons and deploying screens/ICMs.

**Tech Stack:** Vue 3, Socket.io-client, Vite

---

### Task 1: Ship Presets Constant & Enhanced ShipSheetsView UI

**Files:**
- Create: `client/src/constants/shipPresets.js`
- Modify: `client/src/views/ShipSheetsView.vue`

**Interfaces:**
- Produces: `SHIP_PRESETS` object with 13 vessel types, enhanced `ShipSheetsView.vue` UI with class preset selector, weapon manager, defense system controls, and socket sync.

- [ ] **Step 1: Create client/src/constants/shipPresets.js**

```js
export const SHIP_PRESETS = [
  {
    type: 'Fighter',
    hull_points: 8, adf: 5, mr: 5, dcr: 30,
    weapons: [
      { id: 'w1', type: 'Assault Rockets', damage: '2d10+4', range: 4, ammo_max: 3, ammo_current: 3, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 0, masking_screens_current: 0, icm_max: 0, icm_current: 0 }
  },
  {
    type: 'Assault Scout',
    hull_points: 15, adf: 5, mr: 4, dcr: 35,
    weapons: [
      { id: 'w1', type: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w2', type: 'Assault Rockets', damage: '2d10+4', range: 4, ammo_max: 4, ammo_current: 4, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 0, masking_screens_current: 0, icm_max: 0, icm_current: 0 }
  },
  {
    type: 'Corvette',
    hull_points: 20, adf: 4, mr: 3, dcr: 42,
    weapons: [
      { id: 'w1', type: 'Laser Cannon', damage: '2d10', range: 10, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w2', type: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w3', type: 'Rocket Battery', damage: '2d10', range: 3, ammo_max: 2, ammo_current: 2, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 1, masking_screens_current: 1, icm_max: 2, icm_current: 2 }
  },
  {
    type: 'Frigate',
    hull_points: 40, adf: 3, mr: 3, dcr: 50,
    weapons: [
      { id: 'w1', type: 'Laser Cannon', damage: '2d10', range: 10, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w2', type: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w3', type: 'Torpedoes', damage: '4d10', range: 4, ammo_max: 2, ammo_current: 2, status: 'Online' },
      { id: 'w4', type: 'Rocket Batteries', damage: '2d10', range: 3, ammo_max: 4, ammo_current: 4, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 1, masking_screens_current: 1, icm_max: 4, icm_current: 4 }
  },
  {
    type: 'Destroyer',
    hull_points: 50, adf: 3, mr: 2, dcr: 60,
    weapons: [
      { id: 'w1', type: 'Laser Cannon', damage: '2d10', range: 10, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w2', type: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w3', type: 'Torpedoes', damage: '4d10', range: 4, ammo_max: 2, ammo_current: 2, status: 'Online' },
      { id: 'w4', type: 'Rocket Batteries', damage: '2d10', range: 3, ammo_max: 6, ammo_current: 6, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 2, masking_screens_current: 2, icm_max: 6, icm_current: 6 }
  },
  {
    type: 'Light Cruiser',
    hull_points: 70, adf: 2, mr: 2, dcr: 70,
    weapons: [
      { id: 'w1', type: 'Laser Cannon', damage: '2d10', range: 10, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w2', type: 'Laser Batteries (x2)', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w3', type: 'Torpedoes (x4)', damage: '4d10', range: 4, ammo_max: 4, ammo_current: 4, status: 'Online' },
      { id: 'w4', type: 'Rocket Batteries (x6)', damage: '2d10', range: 3, ammo_max: 6, ammo_current: 6, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 2, masking_screens_current: 2, icm_max: 6, icm_current: 6 }
  },
  {
    type: 'Heavy Cruiser',
    hull_points: 80, adf: 1, mr: 1, dcr: 75,
    weapons: [
      { id: 'w1', type: 'Laser Cannon', damage: '2d10', range: 10, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w2', type: 'Laser Batteries (x3)', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w3', type: 'Torpedoes (x4)', damage: '4d10', range: 4, ammo_max: 4, ammo_current: 4, status: 'Online' },
      { id: 'w4', type: 'Rocket Batteries (x8)', damage: '2d10', range: 3, ammo_max: 8, ammo_current: 8, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 2, masking_screens_current: 2, icm_max: 8, icm_current: 8 }
  },
  {
    type: 'Assault Carrier',
    hull_points: 75, adf: 2, mr: 1, dcr: 75,
    weapons: [
      { id: 'w1', type: 'Laser Batteries (x2)', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w2', type: 'Rocket Batteries (x6)', damage: '2d10', range: 3, ammo_max: 6, ammo_current: 6, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 2, masking_screens_current: 2, icm_max: 8, icm_current: 8 }
  },
  {
    type: 'Battleship',
    hull_points: 120, adf: 2, mr: 2, dcr: 100,
    weapons: [
      { id: 'w1', type: 'Laser Cannons (x2)', damage: '2d10', range: 10, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w2', type: 'Laser Batteries (x4)', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w3', type: 'Torpedoes (x8)', damage: '4d10', range: 4, ammo_max: 8, ammo_current: 8, status: 'Online' },
      { id: 'w4', type: 'Rocket Batteries (x10)', damage: '2d10', range: 3, ammo_max: 10, ammo_current: 10, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 4, masking_screens_current: 4, icm_max: 10, icm_current: 10 }
  },
  {
    type: 'Small Freighter',
    hull_points: 25, adf: 2, mr: 2, dcr: 35,
    weapons: [
      { id: 'w1', type: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 0, masking_screens_current: 0, icm_max: 2, icm_current: 2 }
  },
  {
    type: 'Medium Freighter',
    hull_points: 50, adf: 1, mr: 1, dcr: 50,
    weapons: [
      { id: 'w1', type: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 0, masking_screens_current: 0, icm_max: 4, icm_current: 4 }
  },
  {
    type: 'Heavy Freighter',
    hull_points: 75, adf: 1, mr: 1, dcr: 65,
    weapons: [
      { id: 'w1', type: 'Laser Batteries (x2)', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 1, masking_screens_current: 1, icm_max: 6, icm_current: 6 }
  },
  {
    type: 'Space Station',
    hull_points: 50, adf: 0, mr: 0, dcr: 80,
    weapons: [
      { id: 'w1', type: 'Laser Batteries (x2)', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, status: 'Online' },
      { id: 'w2', type: 'Rocket Batteries (x4)', damage: '2d10', range: 3, ammo_max: 4, ammo_current: 4, status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 1, masking_screens_current: 1, icm_max: 6, icm_current: 6 }
  },
  {
    type: 'Custom Vessel',
    hull_points: 30, adf: 2, mr: 2, dcr: 40,
    weapons: [],
    defenses: { reflective_hull: true, masking_screens_max: 0, masking_screens_current: 0, icm_max: 0, icm_current: 0 }
  }
];
```

- [ ] **Step 2: Update ShipSheetsView.vue**

Update `ShipSheetsView.vue` to import `SHIP_PRESETS`.
Add preset selection logic in creation/editing mode that loads default stats, weapons, and defenses when a class is selected, while maintaining full user editability.
Add interactive "Fire Weapon" and "Deploy Defense" controls that update remaining ammunition and defense charges in real time.

- [ ] **Step 3: Verification**

Run client build to verify no errors:
```bash
docker exec sf-vtt-dev bash -c "cd client && npm run build"
```

- [ ] **Step 4: Commit**

```bash
git add client/
git commit -m "feat: add official Knight Hawks ship class presets, weapons, and defense controls"
```

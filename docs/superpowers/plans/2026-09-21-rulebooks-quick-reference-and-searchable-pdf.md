# Rulebooks Quick Reference Tables & Searchable PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unformatted raw text reader in the Rulebooks view with structured Quick Reference Tables (Ship-to-Ship, Ranged Weapons, Melee) and equip the PDF viewer with an integrated search engine that jumps directly to relevant pages.

**Architecture:** 
1. Build `client/src/constants/combatReference.js` to store comprehensive Star Frontiers Alpha Dawn and Knight Hawks tables and rules reference data.
2. Build `client/src/components/QuickReferenceTables.vue` to render responsive, styled tables with sub-category tabs (Ship Combat, Ranged Combat, Melee Combat).
3. Update `client/src/views/RulebooksView.vue` with top-level tabs `[Quick Reference Tables]` and `[PDF Rulebooks]`, removing the continuous text reader, and integrating Lunr search directly into the PDF view to jump to matched books and pages.

**Tech Stack:** Vue 3 (Composition API), Vite, Lunr.js, Docker/Node.

## Global Constraints
- Run all test and build commands in the docker container: `docker exec sf-vtt-dev bash -c "<command>"`
- Keep styling cohesive with the dark theme design system (`--bg-primary`, `--bg-secondary`, `--border`, `--accent`, `--radius`).
- Clean ESM imports with `.vue` extensions for Vue SFCs.

---

### Task 1: Create Combat Reference Constants

**Files:**
- Create: `client/src/constants/combatReference.js`
- Test: `client/src/constants/combatReference.test.js`

**Interfaces:**
- Produces: `SHIP_COMBAT_REF`, `RANGED_COMBAT_REF`, `MELEE_COMBAT_REF` objects containing sequence of play, tables, modifiers, and damage formulas.

- [ ] **Step 1: Write tests for combatReference constants**

Create `client/src/constants/combatReference.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { SHIP_COMBAT_REF, RANGED_COMBAT_REF, MELEE_COMBAT_REF } from './combatReference.js';

describe('combatReference', () => {
  it('exports comprehensive ship combat reference', () => {
    expect(SHIP_COMBAT_REF.sequenceOfPlay).toBeDefined();
    expect(SHIP_COMBAT_REF.weapons.length).toBeGreaterThan(0);
    expect(SHIP_COMBAT_REF.defenses.length).toBeGreaterThan(0);
    expect(SHIP_COMBAT_REF.criticalHits.length).toBeGreaterThan(0);
  });

  it('exports comprehensive ranged combat reference', () => {
    expect(RANGED_COMBAT_REF.sequenceOfPlay).toBeDefined();
    expect(RANGED_COMBAT_REF.weapons.length).toBeGreaterThan(0);
    expect(RANGED_COMBAT_REF.modifiers.length).toBeGreaterThan(0);
    expect(RANGED_COMBAT_REF.armor.length).toBeGreaterThan(0);
  });

  it('exports comprehensive melee combat reference', () => {
    expect(MELEE_COMBAT_REF.attackBaseFormula).toBeDefined();
    expect(MELEE_COMBAT_REF.unarmedDamage.length).toBeGreaterThan(0);
    expect(MELEE_COMBAT_REF.weapons.length).toBeGreaterThan(0);
    expect(MELEE_COMBAT_REF.modifiers.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run src/constants/combatReference.test.js"`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement combatReference.js**

Create `client/src/constants/combatReference.js` with structured data for:
- `SHIP_COMBAT_REF`: Knight Hawks Sequence of Play (Initiative 1d10, Movement ADF/MR, Defensive Fire, Offensive Fire, Damage), Weapons (Laser Cannon, Laser Battery, Torpedoes, Assault Rockets, Rocket Battery, Disruptor Cannon), Defenses (Reflective Hull, Masking Screen, Inertia Screen, ICMs), and Critical Hit Table (Bridge, Drive, Weapons, etc.).
- `RANGED_COMBAT_REF`: Sequence of Play, Small Arms & Heavy Weapons table (Laser Pistol, Laser Rifle, Auto Pistol, Auto Rifle, Gyrojet Pistol/Rifle, Needler, Grenades), Modifiers table (Range, Cover, Movement, Darkness, Aiming, Prone), Armor & Screens (Skeinsuit, Albedo Suit, Albedo Screen, Inertia Screen).
- `MELEE_COMBAT_REF`: Attack base calculation, Unarmed punching table (by STR bracket 1-5 pts) and kicking, Melee Weapons table (Knife, Vibroknife, Stun Baton, Club, Sword), Modifiers & Maneuvers (Grappling, Charging, Yazirian Battle Rage, Prone target).

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run src/constants/combatReference.test.js"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/constants/combatReference.js client/src/constants/combatReference.test.js
git commit -m "feat: add Star Frontiers combat quick reference constants"
```

---

### Task 2: Create QuickReferenceTables Vue Component

**Files:**
- Create: `client/src/components/QuickReferenceTables.vue`
- Test: `client/test/QuickReferenceTables.test.js`

**Interfaces:**
- Consumes: `SHIP_COMBAT_REF`, `RANGED_COMBAT_REF`, `MELEE_COMBAT_REF` from `client/src/constants/combatReference.js`.
- Produces: A Vue component rendering sub-tabs (`Ship-to-Ship Combat`, `Ranged Weapon Combat`, `Melee Combat`) with responsive tables, callout modifier boxes, and clean typography.

- [ ] **Step 1: Write test for QuickReferenceTables component**

Create `client/test/QuickReferenceTables.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import QuickReferenceTables from '../src/components/QuickReferenceTables.vue';

describe('QuickReferenceTables.vue', () => {
  it('renders with sub-category tabs', () => {
    const wrapper = mount(QuickReferenceTables);
    expect(wrapper.text()).toContain('Ship-to-Ship Combat');
    expect(wrapper.text()).toContain('Ranged Weapon Combat');
    expect(wrapper.text()).toContain('Melee Combat');
  });

  it('switches tabs when clicked', async () => {
    const wrapper = mount(QuickReferenceTables);
    const buttons = wrapper.findAll('.category-tab-btn');
    await buttons[1].trigger('click'); // Ranged Weapon Combat
    expect(wrapper.text()).toContain('Beam Weapons');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/QuickReferenceTables.test.js"`
Expected: FAIL

- [ ] **Step 3: Implement QuickReferenceTables.vue**

Create `client/src/components/QuickReferenceTables.vue`:
- Tab buttons for `ship`, `ranged`, `melee`.
- Filter search within tables so GMs/players can quickly locate any weapon or rule.
- Styled tables matching theme (`.ref-table`, `.ref-header`, `.badge`, `.modifier-pill`).

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/QuickReferenceTables.test.js"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/QuickReferenceTables.vue client/test/QuickReferenceTables.test.js
git commit -m "feat: implement QuickReferenceTables component"
```

---

### Task 3: Refactor RulebooksView with Tabs & Searchable PDF

**Files:**
- Modify: `client/src/views/RulebooksView.vue`

**Interfaces:**
- Consumes: `QuickReferenceTables.vue`, `/api/rulebooks`, `/api/rulebooks/pdf/:bookId#page=:page`.
- Replaces raw Text Reader with `QuickReferenceTables`.
- Pairs Lunr search engine with the PDF viewer so clicking any search snippet jumps the PDF iframe directly to that book and page.

- [ ] **Step 1: Update RulebooksView.vue template & script**
- Change top-level navigation:
  - Button: `Quick Reference Tables` (default active)
  - Button: `PDF Rulebooks`
- Remove the raw unformatted text reader and its DOM nodes.
- In `PDF Rulebooks` view:
  - Left sidebar: Search bar with live Lunr search over indexed pages. Results show book title, page number, and snippet. Clicking a result sets `pdfBookId` and `pdfPage`.
  - Right pane: PDF viewer iframe with book selector, page jump controls, and "Open in New Tab" link.
- In `Quick Reference Tables` view:
  - Renders `<QuickReferenceTables />`.

- [ ] **Step 2: Verify client build and run test suite**

Run: `docker exec sf-vtt-dev bash -c "cd client && npm run build && npx vitest run"`
Expected: All build checks and vitest suites pass.

- [ ] **Step 3: Verify manually in Playwright test**

Run a headless browser check navigating to `/dashboard/rulebooks`, clicking the tabs, typing a search query ("Laser" or "ADF"), and confirming the PDF page updates.

- [ ] **Step 4: Commit**

```bash
git add client/src/views/RulebooksView.vue
git commit -m "feat: integrate Quick Reference Tables and searchable PDF reader into RulebooksView"
```

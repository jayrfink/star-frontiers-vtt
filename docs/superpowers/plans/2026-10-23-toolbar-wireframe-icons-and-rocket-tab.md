# VTT Toolbar Wireframe Icons & Rocket Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all emojis on the VTT floating toolbars with glowing textual lined wireframe icons inheriting the button's box color, and replace the Space VTT tab icon with a dark blue rocket.

**Architecture:**
- Navigation: Update `NavBar.vue` to render a dark blue vector rocket icon for the Space VTT tab.
- Toolbars: In `RpgVttView.vue` and `SpaceVttView.vue`, replace emoji buttons with inline vector stroke icons (`stroke="currentColor"`, `fill="none"`) with CSS drop-shadow glow styling.
- Tests: Update `client/test/NavBar.test.js` and create `client/test/VttToolbarIcons.test.js` to ensure zero remaining emojis on the toolbars.

**Tech Stack:** Vue 3, SVG, CSS3, Vitest, Vite.

## Global Constraints
- No emojis on the VTT floating toolbar buttons (Move, Pan, Ruler, Ping, Clear Ping, Clear All Pings, Initiative, Roll d%, DMG Die, Clear Dice).
- Toolbar icons must use `stroke="currentColor"` so their lines automatically inherit the button box / border color (cyan when inactive, aqua when active, red on Clear Ping, amber on Clear All).
- Space VTT tab icon must be a dark blue rocket vector (`#1e3a8a` / `#1d4ed8` / `#2563eb`).

---

### Task 1: Dark Blue Rocket Icon for Space VTT Tab

**Files:**
- Modify: `client/src/components/NavBar.vue`
- Test: `client/test/NavBar.test.js`

**Interfaces:**
- Produces: Space VTT tab icon rendering dark blue SVG rocket instead of emoji `🚀`.

- [ ] **Step 1.1: Write failing test in `client/test/NavBar.test.js`**
  - Verify Space VTT tab renders the dark blue rocket SVG and does not contain `🚀`.

- [ ] **Step 1.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/NavBar.test.js"
  ```

- [ ] **Step 1.3: Update `client/src/components/NavBar.vue`**
  - Replace `icon: '🚀'` for Space VTT with a dedicated rocket SVG template or component styled in dark blue (`#1e3a8a` / `#1d4ed8`).

- [ ] **Step 1.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/NavBar.test.js"
  ```

- [ ] **Step 1.5: Commit Task 1**
  ```bash
  git add client/src/components/NavBar.vue client/test/NavBar.test.js
  git commit -m "feat(nav): add dark blue rocket icon for Space VTT tab"
  ```

---

### Task 2: VTT Floating Toolbar Wireframe Lined Shapes

**Files:**
- Modify: `client/src/views/RpgVttView.vue`
- Modify: `client/src/views/SpaceVttView.vue`
- Test: `client/test/VttToolbarIcons.test.js`

**Interfaces:**
- Produces: Inline vector wireframe icons (`stroke="currentColor"`, `class="tool-icon"`) across all floating toolbar buttons.

- [ ] **Step 2.1: Write failing tests in `client/test/VttToolbarIcons.test.js`**
  - Test that `RpgVttView.vue` and `SpaceVttView.vue` toolbars contain `<svg class="tool-icon"` elements for Move, Pan, Ping, Initiative, Roll d%, DMG Die, and Clear actions.
  - Test that none of the toolbar buttons contain raw emojis (`👆`, `✋`, `📏`, `📍`, `⚡`, `🎲`, `💥`, `✖`, `🧹`).

- [ ] **Step 2.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/VttToolbarIcons.test.js"
  ```

- [ ] **Step 2.3: Replace emojis with vector wireframe icons in `RpgVttView.vue` and `SpaceVttView.vue`**
  - Add lined SVGs: Move (4-way cross), Pan (navigation compass), Ruler (caliper bar), Ping (radar beacon), Clear Ping (`⨉`), Clear All (`⊘`), Initiative (lightning bolt), Roll d% (d10 polygon), DMG Die (starburst), Clear Dice (`⨉`).
  - Add `.tool-icon` styling in CSS: `width: 14px; height: 14px; vertical-align: -2px; margin-right: 5px; stroke: currentColor; fill: none; stroke-width: 1.8; filter: drop-shadow(0 0 3px currentColor);`.
  - Active button hover/active increases filter to `drop-shadow(0 0 6px currentColor)`.

- [ ] **Step 2.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/VttToolbarIcons.test.js"
  ```

- [ ] **Step 2.5: Commit Task 2**
  ```bash
  git add client/src/views/RpgVttView.vue client/src/views/SpaceVttView.vue client/test/VttToolbarIcons.test.js
  git commit -m "feat(vtt): replace toolbar emojis with dynamic glowing lined wireframe icons"
  ```

---

### Task 3: Full Suite Verification & Build

- [ ] **Step 3.1: Run all client Vitest tests**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run"
  ```

- [ ] **Step 3.2: Run client production build**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npm run build"
  ```

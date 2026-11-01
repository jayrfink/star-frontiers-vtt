# GM Token Visibility (Hide Tokens from Players) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the GameMaster (GM) to hide and reveal tokens on both the RPG VTT and Space VTT, spawn new tokens/adversaries/vehicles in a hidden state (`layer = 'gm'`), visually distinguish hidden tokens on the GM's canvas, and synchronize visibility transitions in real time with connected players.

**Architecture:** We build on the existing `tokens.layer` column (`'gm'`, `'character'`, `'celestial'`) in SQLite and `server/src/maps.js`. On `PUT /api/tokens/:id`, transitioning a token between visible (`layer !== 'gm'`) and hidden (`layer === 'gm'`) emits `token:deleted` to non-GM sockets when hidden and `token:created` to non-GM sockets when revealed. On the client, we add GM visibility toggles to `RpgVttView.vue`, `SpaceVttView.vue`, `AdversaryTokenHud.vue`, and `VehicleTokenHud.vue`, spawn-hidden checkboxes to the Add Token, Stock Adversary, and Deploy Vehicle modals, and 55%-opacity + dashed-ring + `🙈` badge rendering on `VttCanvas.vue` and `SpaceVttCanvas.vue`.

**Tech Stack:** Node.js / Express / Socket.IO / SQLite (`better-sqlite3`), Vue 3, HTML5 Canvas, Vitest.

## Global Constraints

- Players (`role !== 'GameMaster'`) must never receive, view, move, edit, or delete tokens with `layer === 'gm'`.
- Space VTT celestial tokens must retain their celestial identity (`isCelestialToken(token) === true`) even when `token.layer === 'gm'` (via `'celestial'` in `token.conditions`), and restore `layer = 'celestial'` when unhidden.
- Follow TDD for each task: write failing test first, run to verify failure, implement minimal code, run to verify pass, and commit.

---

### Task 1: Backend Real-Time Socket Transitions & Adversary Spawn Layer Support

**Files:**
- Modify: `server/src/maps.js:710-725`
- Modify: `server/src/adversaries.js:210-330`
- Test: `server/test/maps.test.js`

**Interfaces:**
- Consumes: `PUT /api/tokens/:id` with `{ layer: 'gm' | 'character' | 'celestial' }`, `POST /api/adversaries/spawn` with `{ layer: 'gm' | 'character' }`
- Produces: Socket events `token:deleted` to `io.except('role:GameMaster')` when hiding a visible token, `token:created` to `io.except('role:GameMaster')` when revealing a hidden token, and `layer: 'gm'` tokens when spawning adversaries with `layer: 'gm'`.

- [ ] **Step 1: Write the failing test in `server/test/maps.test.js`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement visibility transition socket emissions in `server/src/maps.js` and `layer` forwarding in `server/src/adversaries.js`**
- [ ] **Step 4: Run server tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 2: Celestial Token Identity Preservation & Canvas Hidden Token Rendering (`VttCanvas.vue` & `SpaceVttCanvas.vue`)

**Files:**
- Modify: `client/src/utils/spaceTokens.js`
- Modify: `client/src/components/VttCanvas.vue`
- Modify: `client/src/components/SpaceVttCanvas.vue`
- Test: `client/test/spaceTokens.test.js`

**Interfaces:**
- Consumes: `token.layer === 'gm'`, `token.conditions`
- Produces: `isCelestialToken(token)` returning `true` when `token.conditions` includes `'celestial'`, and canvas rendering of hidden tokens with `globalAlpha = 0.55`, dashed amber ring (`#f59e0b`), and `🙈` badge.

- [ ] **Step 1: Write the failing tests in `client/test/spaceTokens.test.js`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Update `client/src/utils/spaceTokens.js`, `client/src/components/VttCanvas.vue`, and `client/src/components/SpaceVttCanvas.vue`**
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 3: GM Visibility Controls in Adversary HUD, Vehicle HUD, Stock Adversary Modal & Deploy Vehicle Modal

**Files:**
- Modify: `client/src/components/AdversaryTokenHud.vue`
- Modify: `client/src/components/VehicleTokenHud.vue`
- Modify: `client/src/components/StockAdversaryModal.vue`
- Modify: `client/src/components/DeployVehicleModal.vue`
- Test: `client/test/AdversaryTokenHud.test.js`, `client/test/VehicleTokenHud.test.js`, `client/test/StockAdversaryModal.test.js`, `client/test/DeployVehicleModal.test.js`

**Interfaces:**
- Consumes: `isGm` prop, `token.layer`
- Produces:
  - `AdversaryTokenHud` & `VehicleTokenHud`: GM toggle button `.btn-hud-visibility` emitting `update:token` with `{ ...token, layer: token.layer === 'gm' ? 'character' : 'gm' }`
  - `StockAdversaryModal`: `spawnHidden` checkbox passing `layer: 'gm'` in `buildSpawnPayload`
  - `DeployVehicleModal`: `deployHidden` checkbox passing `layer: 'gm'` in `@deploy` payload

- [ ] **Step 1: Write the failing tests in HUD and modal test files**
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement visibility controls in `AdversaryTokenHud.vue`, `VehicleTokenHud.vue`, `StockAdversaryModal.vue`, and `DeployVehicleModal.vue`**
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 4: GM Visibility Controls in `RpgVttView.vue` and `SpaceVttView.vue`

**Files:**
- Modify: `client/src/views/RpgVttView.vue`
- Modify: `client/src/views/SpaceVttView.vue`
- Test: `client/test/GmTokenVisibility.test.js`

**Interfaces:**
- Consumes: `isGm`, `selectedToken`, `tokens`, `toggleTokenVisibility(token)`
- Produces:
  - Token Inspector visibility toggle button (`.btn-toggle-visibility`) in both `RpgVttView.vue` and `SpaceVttView.vue`
  - Quick visibility toggle button (`.btn-token-list-visibility`) and `HIDDEN` badge in the Map Tokens list in both views
  - `"Start Hidden from Players (GM Layer)"` checkbox in the Add Token modal of both views
  - Forwarding of `layer` in `onAdversaryTokenUpdate`, `onVehicleTokenUpdate`, and `onDeployVehicle` in `RpgVttView.vue`

- [ ] **Step 1: Write the failing test in `client/test/GmTokenVisibility.test.js`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement visibility controls and handlers in `RpgVttView.vue` and `SpaceVttView.vue`**
- [ ] **Step 4: Run full server + client test suites and Vite build to verify all tests pass**
- [ ] **Step 5: Commit**

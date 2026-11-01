# GM Token Visibility (Hide Tokens from Players) Design

**Date:** 2026-10-31
**Scope:** Both RPG VTT (`RpgVttView.vue` / `VttCanvas.vue`) and Space VTT (`SpaceVttView.vue` / `SpaceVttCanvas.vue`), Adversary & Vehicle HUDs, Token Spawn Modals, and Backend Real-Time Socket Sync (`server/src/maps.js`).

---

## 1. Overview & Goals

Give the GameMaster (GM) the ability to hide tokens from players and reveal them at any time on both the **RPG VTT** and **Space VTT**, as well as spawn new tokens, adversaries, and vehicles in a hidden state (`layer = 'gm'`).

- **Players** never receive or see tokens with `layer === 'gm'` (enforced both on the server REST/Socket layer and client state).
- **GameMasters** see all tokens on the map, with hidden tokens rendered at reduced opacity (`0.55`), a dashed outer indicator ring, and a `🙈` badge on the canvas, plus one-click toggle controls in the Token Inspector, Map Tokens list, Adversary HUD, and Vehicle HUD.

---

## 2. Architecture & Data Model

### 2.1 Existing Database & Server Layer Support
- The `tokens` table in `server/src/db.js` already stores `layer TEXT NOT NULL DEFAULT 'character'`.
- `server/src/maps.js` already filters out `t.layer === 'gm'` for non-GM users on `GET /api/maps/active`, `GET /api/maps/:id`, `GET /api/tokens`, `GET /api/tokens/:id`, and `POST/PUT /api/maps/:id/activate`.
- Non-GM users are already blocked from creating, moving, editing, or deleting `layer === 'gm'` tokens (`canManageToken` / `canDeleteToken`).

### 2.2 Preserving Celestial Token Identity on Space VTT
- On Space VTT, celestial bodies normally have `layer = 'celestial'`.
- When a celestial token is created as hidden or toggled to `layer = 'gm'`, we preserve `'celestial'` inside `token.conditions` (and check `token.conditions.includes('celestial')` in `isCelestialToken(token)` in `client/src/utils/spaceTokens.js`).
- When a hidden celestial token is revealed by the GM, its `layer` is restored to `'celestial'`; all other tokens restore to `'character'`.

### 2.3 Real-Time Socket.IO Transitions (`PUT /api/tokens/:id` in `server/src/maps.js`)
When a GM updates a token via `PUT /api/tokens/:id`:
1. **Visible → Hidden (`existing.layer !== 'gm'` and `token.layer === 'gm'`)**:
   - Emit `token:updated` (`{ token }`) to `role:GameMaster`.
   - Emit `token:deleted` (`{ id: token.id }`) to `io.except('role:GameMaster')` so the token immediately disappears from all connected player canvases and deselects if selected.
2. **Hidden → Visible (`existing.layer === 'gm'` and `token.layer !== 'gm'`)**:
   - Emit `token:updated` (`{ token }`) to `role:GameMaster`.
   - Emit `token:created` (`{ token }`) to `io.except('role:GameMaster')` so the newly revealed token immediately appears on all connected player canvases.
3. **Remains Hidden (`existing.layer === 'gm'` and `token.layer === 'gm'`)**:
   - Emit `token:moved` (if position changed) and `token:updated` (`{ token }`) only to `role:GameMaster`.
4. **Remains Visible (`existing.layer !== 'gm'` and `token.layer !== 'gm'`)**:
   - Emit `token:moved` (if position changed) and `token:updated` (`{ token }`) to all connected clients (`io.emit`).

---

## 3. UI Components & Workflows

### 3.1 Token Inspector Sidebar (`RpgVttView.vue` & `SpaceVttView.vue`)
- **Selected Token Card (GM Only)**:
  - Add a **Player Visibility** control row displaying a toggle button:
    - When visible (`token.layer !== 'gm'`): `👁️ Visible to Players` (styled with green/cyan operational accent; clicking hides the token).
    - When hidden (`token.layer === 'gm'`): `🙈 Hidden from Players (GM Only)` (styled with amber/red warning accent; clicking reveals the token).
- **Map Tokens List (When No Token Is Selected, GM Only)**:
  - Each token row in the sidebar list displays a compact `👁️` / `🙈` quick-toggle button (using `@click.stop="toggleTokenVisibility(t)"`) and a `HIDDEN` badge when `t.layer === 'gm'`.

### 3.2 Adversary & Vehicle HUDs (`AdversaryTokenHud.vue` & `VehicleTokenHud.vue`)
- Pass `:is-gm="isGm"` to `AdversaryTokenHud` (already passed to `VehicleTokenHud` or add if needed).
- In the HUD header (next to the close button or title badges), render a GM-only visibility toggle button (`👁️ Visible` / `🙈 Hidden`) that emits `update:token` with `{ layer: token.layer === 'gm' ? 'character' : 'gm' }`.

### 3.3 Spawn Hidden Option in Creation Modals (GM Only)
- **Add Token Modal (`RpgVttView.vue` & `SpaceVttView.vue`)**:
  - Add a GM-only checkbox: `🙈 Start Hidden from Players (GM Layer)` bound to `newTokenForm.is_hidden`.
  - When checked, `submitAddToken` sends `layer: 'gm'` (and for celestial tokens on Space VTT, includes `'celestial'` in `conditions`).
- **Stock Adversary Modal (`StockAdversaryModal.vue`)**:
  - Add a GM-only checkbox in the spawn footer/controls: `🙈 Spawn Hidden from Players` (`spawnHidden`), passed as `options: { layer: spawnHidden ? 'gm' : 'character' }` to `POST /api/adversaries/spawn`.
- **Deploy Vehicle Modal (`DeployVehicleModal.vue`)**:
  - Add a GM-only checkbox in the deploy placement section: `🙈 Deploy Hidden from Players` (`deployHidden`), emitting `layer: deployHidden ? 'gm' : 'character'` in the `@deploy` payload.

### 3.4 Canvas Rendering for Hidden Tokens (`VttCanvas.vue` & `SpaceVttCanvas.vue`)
- When `token.layer === 'gm'`:
  - Render the token body and ring at `ctx.globalAlpha = 0.55`.
  - Draw a dashed outer indicator circle (`ctx.setLineDash([4, 4])`, stroke `#f59e0b`) around the token perimeter.
  - Draw a small `🙈` badge at the top-left of the token so the GM can immediately identify hidden tokens on the tactical grid/hex map.

---

## 4. Testing Strategy

1. **Backend Integration Tests (`server/test/maps.test.js` / `server/test/security.test.js`)**:
   - Verify `PUT /api/tokens/:id` transitioning `layer` from `'character'` to `'gm'` emits `token:deleted` to non-GM sockets and `token:updated` to GM sockets.
   - Verify `PUT /api/tokens/:id` transitioning `layer` from `'gm'` to `'character'` emits `token:created` to non-GM sockets and `token:updated` to GM sockets.
2. **Frontend Unit Tests (`client/test/`)**:
   - Verify GM visibility toggle in `RpgVttView.vue` and `SpaceVttView.vue` Token Inspector and Map Tokens list calls `PUT /api/tokens/:id` with `layer: 'gm'` / `'character'` (or `'celestial'`).
   - Verify `AdversaryTokenHud.vue` and `VehicleTokenHud.vue` render the visibility toggle button for GMs and emit the layer update.
   - Verify `StockAdversaryModal.vue`, `DeployVehicleModal.vue`, and Add Token modals support spawning hidden tokens.
   - Verify `isCelestialToken` in `client/src/utils/spaceTokens.js` recognizes celestial tokens even when `layer === 'gm'`.

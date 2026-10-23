# Implementation Plan: Comprehensive Bug Fixes (Round 3)

**Date:** 2026-10-23  
**Goal:** Address and resolve all confirmed backend and frontend issues identified in the exhaustive Round 3 code audit, ensuring 100% test pass rate and dev container stability.

---

## Phased Tasks

### Task 1: Backend Security, Entity Disambiguation & Relational Integrity
- **Files:** `server/src/maps.js`, `server/src/sheets.js`, `server/src/auth.js`, `server/src/adversaries.js`, `server/src/adversaryMathEngine.js`, `server/src/gmNotes.js`, `server/src/vehicles.js`
- **Tests:** `server/test/maps.test.js`, `server/test/sheets.test.js`, `server/test/auth.test.js`, `server/test/adversaries.test.js`, `server/test/adversaryMathEngine.test.js`
- **Actions:**
  1. In `server/src/maps.js`:
     - Disambiguate `canManageToken` and `POST /api/tokens` using map type: space maps check `ship_sheets`, non-space maps check `character_sheets`.
     - Wrap map activation and updates in `POST /api/maps` and `PUT /api/maps/:id` in `db.transaction()`.
     - When `PUT /api/maps/:id` sets `is_active: 1`, emit `map:activated` with `{ map, tokens }`.
     - Allow non-GM token owners to update their own `current_speed` and `seu_current`.
     - Clamp `size` (1..10) and `rotation` (0..359).
  2. In `server/src/sheets.js`:
     - Disambiguate token unlinking on delete: characters only unlink tokens on non-space maps; ships only unlink tokens on space maps.
     - Remove leftover `console.log` statements.
     - Validate non-empty name and clamp numeric stats in `PUT /api/characters/:id`.
  3. In `server/src/auth.js`:
     - Anchor session deletion LIKE query with JSON delimiters: `%"userId":${id},%` and `%"userId":${id}}%`.
  4. In `server/src/adversaries.js` & `server/src/adversaryMathEngine.js`:
     - Wrap adversary deletion and token image updates in `db.transaction()`.
     - In `validateAdversaryTemplate`, fix falsy check on `threat_tier` (reject `threat_tier = 0`).
     - In `parseHpDelta`, allow damage subtraction without capping at `max_hp` so temporary HP is preserved.
  5. In `server/src/gmNotes.js`:
     - Fix `null` coercion to string `"null"`.
     - Wrap multi-statement session creation in `db.transaction()`.
  6. In `server/src/vehicles.js`:
     - Validate and sanitize numeric fields with `Number.isFinite`.

### Task 2: Canvas Hit-Testing, Event Handling & Lifecycle Polish
- **Files:** `client/src/components/SpaceVttCanvas.vue`, `client/src/components/VttCanvas.vue`, `client/src/components/AdversaryTokenHud.vue`, `client/src/utils/tokenDamageOverlay.js`
- **Tests:** `client/test/SpaceVttCanvasCelestial.test.js`, `client/test/tokenDamageOverlay.test.js`, `client/test/AdversaryTokenHud.test.js`
- **Actions:**
  1. In `SpaceVttCanvas.vue`:
     - Sort tokens in reverse layer order (ships first, celestials last) in `onMouseDown` hit-testing so celestial tokens do not block ships.
     - Stop mutating `props.tokens` and `props.map` directly; emit updates or update local `imageCache`.
     - Call `resizeObserver.disconnect()` on unmount.
  2. In `VttCanvas.vue`:
     - Coerce `t.x`, `t.y`, and `t.size` to numbers in hit-testing to prevent string concatenation.
     - Stop mutating `props.tokens` and `props.map` directly.
     - Call `resizeObserver.disconnect()` on unmount.
  3. In `AdversaryTokenHud.vue`:
     - Prevent double HP execution by blurring target on `@keyup.enter` or tracking committed value.
  4. In `tokenDamageOverlay.js`:
     - Safely parse JSON strings for `status_effects` and `conditions`.

### Task 3: Vehicle Deployment, Character Stats & Star Frontiers Rules
- **Files:** `client/src/components/DeployVehicleModal.vue`, `client/src/views/CharacterSheetsView.vue`, `client/src/constants/combatReference.js`, `client/src/constants/shipWeapons.js`, `client/src/components/VehicleTokenHud.vue`
- **Tests:** `client/test/DeployVehicleModal.test.js`, `client/test/CharacterSheetsView.test.js`, `client/test/combatReference.test.js`, `client/test/shipWeapons.test.js`
- **Actions:**
  1. In `DeployVehicleModal.vue`:
     - Ensure deployed vehicle token receives `top_speed_kph`, `cruise_speed_kph`, numeric `passengers`, `passengers_capacity`, and `driver`.
  2. In `CharacterSheetsView.vue`:
     - In `shiftStat`, clamp `current_stamina` to `max_stamina` if `sta` was reduced.
  3. In `combatReference.js` & `shipWeapons.js`:
     - Standardize Mine damage to `3d10+5` per Knight Hawks Basic Rules page 14.
     - Add Proton Screen and Electron Screen to spaceship defenses in `combatReference.js`.
  4. In `VehicleTokenHud.vue`:
     - Fix vehicle speed turn conversion calculation (`meters/turn * 0.36`).

### Task 4: Whole-Branch Verification & Regressions Audit
- **Actions:**
  1. Run full server test suite (`npm test`) in Docker.
  2. Run full client test suite (`npx vitest run`) in Docker.
  3. Verify port 3000 and 3001 health.
  4. Dispatch Final Reviewer subagent for full regression verification.

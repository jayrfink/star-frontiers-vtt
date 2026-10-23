# Implementation Plan: Comprehensive Bug Fixes (Server & Client)

**Date:** 2026-10-23  
**Goal:** Resolve all confirmed bugs across the backend (`server/src/`) and frontend (`client/src/`) identified during the security, logic, and QA audits.

---

## 1. Subsystems & Target Modules

### 1.1 Backend (`server/src/`)
- [`sheets.js`](file:///Users/jrf/star-frontiers-vtt/server/src/sheets.js): Enforce IDOR protection (owner or GM) on `PUT`/`DELETE` for characters and ships; support clearing `avatar_url` with empty string; on character deletion, set `tokens.character_id = NULL`.
- [`adversaries.js`](file:///Users/jrf/star-frontiers-vtt/server/src/adversaries.js): Enforce `requireGM` on template CRUD, spawning, and AI token art generation; enforce upper ceiling on spawn count (`count <= 50`); accept and use configurable `uploadDir`.
- [`maps.js`](file:///Users/jrf/star-frontiers-vtt/server/src/maps.js): Restrict token modification/deletion to owner or GM; fix `formatToken` callback argument mismatch (`tokenRows.map(row => formatToken(row, db))`); enforce mutex deactivation of previous active map on `PUT /api/maps/:id`; clamp coordinates.
- [`upload.js`](file:///Users/jrf/star-frontiers-vtt/server/src/upload.js): Add multer `fileFilter` rejecting non-image extensions (.html, .svg, .js); escape `%` and `_` in SQLite `LIKE` queries for asset cascades.
- [`index.js`](file:///Users/jrf/star-frontiers-vtt/server/src/index.js) & [`middleware.js`](file:///Users/jrf/star-frontiers-vtt/server/src/middleware.js): Authenticate Socket.io handshake sessions.
- [`adversarySpawner.js`](file:///Users/jrf/star-frontiers-vtt/server/src/adversarySpawner.js): Impose strict ceiling on `count` and execute bulk token insertions within an atomic SQLite transaction.
- [`tokenImagePipeline.js`](file:///Users/jrf/star-frontiers-vtt/server/src/tokenImagePipeline.js): XML-escape initials before embedding into SVG string templates.
- [`rolls.js`](file:///Users/jrf/star-frontiers-vtt/server/src/rolls.js): Safe JSON parsing for roll summary log extraction.
- [`auth.js`](file:///Users/jrf/star-frontiers-vtt/server/src/auth.js): Invalidate user sessions from `sessions.db` on account deletion.
- [`imageGeneratorService.js`](file:///Users/jrf/star-frontiers-vtt/server/src/imageGeneratorService.js): Support configurable uploads/data directory.

### 1.2 Frontend (`client/src/`)
- [`SpaceVttCanvas.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/components/SpaceVttCanvas.vue): Multi-hex token hit-testing; out-of-bounds click detection (don't clamp to origin token).
- [`VttCanvas.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/components/VttCanvas.vue): Return `null` when world coordinates are outside map boundaries instead of clamping to `(0, 0)`.
- [`RpgVttView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/RpgVttView.vue) & [`SpaceVttView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/SpaceVttView.vue): Clean up WebGL DiceBox context on unmount to prevent WebGL context exhaustion; fix random candidate coordinates binding in `DeployVehicleModal`.
- [`DeployVehicleModal.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/components/DeployVehicleModal.vue): Listen to `vehicle:created` and `vehicle:deleted` Socket.io events; preserve blueprint numeric `passengers_capacity` and avoid overwriting with driver name.
- [`VehicleTokenHud.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/components/VehicleTokenHud.vue): Display `passengers_capacity` in rulebook stats and keep driver notes separate from passenger count.
- [`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue): Fix ranged weapon attack chance calculation to use `Math.ceil(dex / 2)` per Star Frontiers Alpha Dawn rules; fix encumbrance bar denominator to use `maxCarryWeight` (STR).
- [`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue): Debounce/guard weapon renaming blur/keyup/change events to prevent duplicate PUT requests; re-normalize defenses on preset selection.

---

## 2. Phased Implementation Tasks

### Phase 1: Server Security & Access Control
- **Task 1: Sheets IDOR, Ownership Checks & Avatar Clearing**
  - Files: `server/src/sheets.js`, `server/test/sheets.test.js`
  - In `PUT` & `DELETE` for `/api/characters/:id` and `/api/ships/:id`, verify `existing.user_id === req.session.userId || isGameMaster(db, req.session.userId)`. Return 403 Forbidden on failure.
  - In update handlers: `const avatar_url = req.body.avatar_url !== undefined ? req.body.avatar_url : (existing.avatar_url || '');`.
  - On character deletion: `db.prepare('UPDATE tokens SET character_id = NULL WHERE character_id = ?').run(req.params.id);`.
  - Add unit tests verifying 403 for other players, 200 for owner and GM, avatar clearing, and token unlinking.

- **Task 2: Adversary Routes & Token Manipulation Authorization**
  - Files: `server/src/adversaries.js`, `server/src/maps.js`, `server/test/adversaries.test.js`, `server/test/maps.test.js`
  - Add `requireGM(db)` to `POST /api/adversaries/generate-token-art`, `POST /api/adversaries`, `PATCH /api/adversaries/:id/token`, `POST /api/adversaries/spawn`, and `DELETE /api/adversaries/:id`.
  - In `maps.js`, for `PUT /api/tokens/:id` and `DELETE /api/tokens/:id`, verify GM status or token ownership via `token.character_id`.
  - Add unit tests.

- **Task 3: Upload MIME Whitelisting & Stored XSS Prevention**
  - Files: `server/src/upload.js`, `server/test/upload.test.js`
  - Configure `multer` with `fileFilter` allowing only `['.png', '.jpg', '.jpeg', '.gif', '.webp']`.
  - Reject `.html`, `.svg`, `.js`, etc. with HTTP 400.
  - Add tests in `server/test/upload.test.js`.

- **Task 4: Socket.io Handshake Session Authentication**
  - Files: `server/src/index.js`, `server/src/middleware.js`, `server/test/auth.test.js`
  - Wrap session middleware for Socket.io handshake and attach `socket.request.session`.
  - Reject unauthenticated socket connections when session is missing or invalid.
  - Verify existing tests continue to pass.

---

### Phase 2: Server State, Serialization & Robustness
- **Task 5: Map Activation `formatToken` Bug, Map Mutex & Coordinate Clamping**
  - Files: `server/src/maps.js`, `server/test/maps.test.js`
  - Fix `tokenRows.map(row => formatToken(row, db))` in `POST /api/maps/:id/activate`.
  - On `PUT /api/maps/:id` where `is_active: 1`, deactivate all other maps of same `map_type`.
  - Validate and clamp `x` and `y` coordinates on token creation/update.
  - Add unit tests.

- **Task 6: Adversary Spawner DoS Ceiling & SVG Initials XML Escaping**
  - Files: `server/src/adversarySpawner.js`, `server/src/adversaries.js`, `server/src/tokenImagePipeline.js`, `server/test/adversarySpawner.test.js`, `server/test/tokenImagePipeline.test.js`
  - Clamp `count` to `Math.min(50, Math.max(1, parseInt(count, 10) || 1))`.
  - Run multi-token spawner DB inserts in a single transaction.
  - XML-escape initials in `tokenImagePipeline.js`.
  - Add unit tests.

- **Task 7: SQL LIKE Wildcards, Roll Log JSON Safety & Account Deletion Session Cleanup**
  - Files: `server/src/upload.js`, `server/src/rolls.js`, `server/src/auth.js`, `server/src/adversaries.js`, `server/src/imageGeneratorService.js`, `server/test/upload.test.js`, `server/test/rolls.test.js`, `server/test/auth.test.js`
  - Escape `_` and `%` in SQL `LIKE` queries for asset cascades using `ESCAPE '\\'`.
  - Use `try/catch` around `JSON.parse` in `rolls.js`.
  - In `DELETE /api/auth/users/:id`, delete active sessions matching user ID.
  - Accept `uploadDir` in `adversaries.js` and `imageGeneratorService.js`.
  - Add unit tests.

---

### Phase 3: Frontend Canvas, Mechanics & UI Bug Fixes
- **Task 8: Canvas Multi-Hex Hit-Testing & Out-of-Bounds Click Protection**
  - Files: `client/src/components/SpaceVttCanvas.vue`, `client/src/components/VttCanvas.vue`, `client/test/spaceTokens.test.js`, `client/test/SpaceVttCanvasCelestial.test.js`
  - In `SpaceVttCanvas.vue`, update hit-testing to check distance based on `token.size`:
    Token matches cell if `hexDistance(cell, { q: t.x, r: t.y }) <= Math.floor((t.size || 1) / 2)`.
  - In `VttCanvas.vue` and `SpaceVttCanvas.vue`, check if world click is outside map bounds: if outside, return `null` and do NOT select or drag cell `(0, 0)` token.

- **Task 9: Star Frontiers Mechanics (Ranged Half-Dex & Encumbrance Calculations)**
  - Files: `client/src/views/CharacterSheetsView.vue`, `client/test/CharacterSheetsView.test.js`
  - In `getSkillSuccessChance`: for skills with `baseChance === 'Dexterity'`, set `baseVal = Math.ceil((this.selectedChar.dex || 50) / 2)` per Star Frontiers Alpha Dawn rules.
  - In `encumbrancePct`: calculate percentage against `maxCarryWeight` (STR) rather than `unencumberedMaxWeight` (STR / 2).

- **Task 10: Vehicle Modal Synchronization, Coordinates & Passenger Capacity**
  - Files: `client/src/components/DeployVehicleModal.vue`, `client/src/views/RpgVttView.vue`, `client/src/components/VehicleTokenHud.vue`, `client/test/DeployVehicleModal.test.js`, `client/test/VehicleTokenHud.test.js`
  - In `DeployVehicleModal.vue`: import `socket`, subscribe to `vehicle:created` and `vehicle:deleted`.
  - In `RpgVttView.vue`: calculate default coordinates once when opening modal rather than continuously evaluating two separate random getters in template props.
  - In `DeployVehicleModal.vue` and `VehicleTokenHud.vue`: ensure blueprint `passengers_capacity` integer is preserved and driver notes are stored in `driver` / `driver_notes`.

- **Task 11: WebGL DiceBox Disposal & ShipSheets Weapon Rename Debounce**
  - Files: `client/src/views/RpgVttView.vue`, `client/src/views/SpaceVttView.vue`, `client/src/views/ShipSheetsView.vue`, `client/test/ShipSheetsView.test.js`
  - In `RpgVttView.vue` and `SpaceVttView.vue` `beforeUnmount`: dispose DiceBox / clear canvas DOM to prevent WebGL context leaks.
  - In `ShipSheetsView.vue`: guard `stopEditWeapon` and `onWeaponNameChange` against redundant re-triggers; normalize defenses on preset selection.

---

### Phase 4: Full End-to-End Verification
- **Task 12: Test Suites & Regression Verification**
  - Run all server tests: `docker exec sf-vtt-dev bash -c "cd server && npm test"`.
  - Run all client tests: `docker exec sf-vtt-dev bash -c "cd client && npm test"`.
  - Confirm background services are healthy.

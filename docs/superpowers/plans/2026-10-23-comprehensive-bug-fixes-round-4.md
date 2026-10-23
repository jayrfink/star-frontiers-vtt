# Implementation Plan: Comprehensive Bug Fixes (Round 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 38 confirmed bugs across backend (`server/src/`) and frontend (`client/src/`) discovered during the full codebase audit, verifying with automated tests and zero regressions.

**Architecture:** 
- Backend fixes harden authentication, session cleanup, CORS origin reflection, token permission enforcement (layer isolation and socket rooms), database transactions, input validation (clamping dimensions, stats, hex colors), and robust error handling on file/rulebook streams.
- Frontend fixes repair inverted stat arrows, ruler infinite-follow on canvas, continuous RAF render loop CPU drain, status effects/conditions array string-spreading corruption, adversary formula parsing, WebGL/DiceBox singleton lifecycle management, and user error reporting.

**Tech Stack:** Node.js, Express, Socket.io, better-sqlite3, Vue 3, Vite, Pinia, HTML5 Canvas 2D, Three.js / @3d-dice/dice-box, Vitest.

---

### Task 1: Backend Security, Auth, Sessions & Handshakes
**Covers Bugs:** 1, 2, 3, 4, 9
- **Bug 1 (Critical):** `server/src/middleware.js:11-24` `connect-sqlite3` native `sqlite3` missing driver. Use a custom `better-sqlite3` session store adapter or ensure `sessions.db` is handled through `better-sqlite3`.
- **Bug 2 (Critical):** `server/src/auth.js:143-152` Zombie session cookies on account deletion. Query and purge deleted user sessions from `sessions.db` (or session store).
- **Bug 3 (Critical):** `server/src/index.js:26-31, 58-61` CORS and Socket.io origin validation. Restrict `origin: true` reflection to valid hostnames (`localhost`, `127.0.0.1`, `CLIENT_URL`).
- **Bug 4 (High):** `server/src/auth.js:20-59` Race condition in initial GM registration. Wrap `userCount` check and user creation in `db.transaction()`.
- **Bug 9 (High):** `server/src/index.js:40-54` Socket.io session touch crash. Implement stub methods (`setHeader`, `getHeader`, `end`) on the mock response object passed into `sessionMiddleware`.

**Files:**
- Modify: `server/src/middleware.js`
- Modify: `server/src/auth.js`
- Modify: `server/src/index.js`
- Test: `server/test/auth.test.js`

- [x] **Step 1: Write tests for session deletion, initial GM transaction, and CORS origin validation in `server/test/auth.test.js`**
- [x] **Step 2: Implement session store safety in `server/src/middleware.js` and session cleanup in `server/src/auth.js`**
- [x] **Step 3: Implement CORS/CSWSH restriction and Socket.io mock response stubs in `server/src/index.js`**
- [x] **Step 4: Run server tests to verify Task 1 passes**

---

### Task 2: Backend Maps, Tokens, Layers, Database & Rules
**Covers Bugs:** 5, 6, 7, 8, 13, 14, 15, 16, 17, 18, 19, 26, 27, 28, 37
- **Bug 5 (High):** `server/src/maps.js:106-138, 551-557` Hide `layer === 'gm'` tokens from non-GM players; emit GM-layer updates only to GM socket room.
- **Bug 6 (High):** `server/src/maps.js:385-464` Prevent non-GM players from supplying `layer: 'gm'` or `layer: 'adversary'` in `POST /api/tokens`.
- **Bug 7 (High):** `server/src/adversarySpawner.js:208-213` Restrict adversary token creation socket broadcast to GM room if spawned on GM or adversary layer.
- **Bug 8 (High):** `server/src/db.js:217-262` Wrap `character_sheets` table migration in `db.transaction()`.
- **Bug 13 (Med):** `server/src/rolls.js:62-131` Validate roll parameters and bounds on `POST /api/rolls`.
- **Bug 14 (Med):** `server/src/sheets.js:311-420` Numeric stat clamping (`hull_points`, `adf`, `mr`, `dcr`) on ship sheets.
- **Bug 15 (Med):** `server/src/maps.js:141-302` Clamp map dimensions (`width`, `height`, `grid_size`).
- **Bug 16 (Med):** `server/src/upload.js:208-216` Replace `upload.any()` with `upload.single('file')`.
- **Bug 17 (Med):** `server/src/upload.js:217-234` Robust SVG sanitization against script and entity bypasses.
- **Bug 18 (Med):** `server/src/rulebooks.js:23-35` Error handler on PDF read stream to prevent crash on aborted client connections.
- **Bug 19 (Med):** `server/src/rulebooks.js:37-49` Concurrency mutex for rulebook extraction.
- **Bug 26 (Low):** `server/src/rolls.js:111-121` Optimize roll history log pruning.
- **Bug 27 (Low):** `server/src/db.js:90-105` Add `ON DELETE CASCADE` to tokens `map_id` foreign key.
- **Bug 28 (Low):** `server/src/rulebooks.js:51-82` Clean up unused legacy endpoints.
- **Bug 37 (Low):** `server/src/maps.js:427-432` Hex color format validation.

**Files:**
- Modify: `server/src/maps.js`
- Modify: `server/src/adversarySpawner.js`
- Modify: `server/src/db.js`
- Modify: `server/src/rolls.js`
- Modify: `server/src/sheets.js`
- Modify: `server/src/upload.js`
- Modify: `server/src/rulebooks.js`
- Test: `server/test/maps.test.js`
- Test: `server/test/adversarySpawner.test.js`
- Test: `server/test/rolls.test.js`
- Test: `server/test/sheets.test.js`
- Test: `server/test/upload.test.js`

- [x] **Step 1: Write/update tests for GM layer filtering, layer injection blocking, and stat clamping**
- [x] **Step 2: Implement map layer security, token layer validation, and hex color validation in `server/src/maps.js` and `adversarySpawner.js`**
- [x] **Step 3: Implement database transactions and foreign keys in `server/src/db.js`**
- [x] **Step 4: Implement roll validation, ship stat clamping, upload single-file and SVG sanitization, and rulebook stream safety in `rolls.js`, `sheets.js`, `upload.js`, `rulebooks.js`**
- [x] **Step 5: Run server tests to verify Task 2 passes**

---

### Task 3: Frontend Canvases, HUDs, Measurement & Render Optimization
**Covers Bugs:** 11, 20, 21, 22, 32, 33, 38
- **Bug 11 (High):** `client/src/components/VttCanvas.vue:671-716` Fix sticky measurement ruler by adding `isMeasuring` drag state.
- **Bug 20 (Med):** `client/src/components/VttCanvas.vue` & `SpaceVttCanvas.vue` unthrottled render loops. Add dirty checking / render-on-demand or idle throttling to prevent continuous CPU drain.
- **Bug 21 (Med):** `client/src/components/VttCanvas.vue:492-509` Parse stringified `status_effects` before checking length.
- **Bug 22 (Med):** `client/src/components/AdversaryTokenHud.vue:231-285` Parse stringified `conditions` before toggling to prevent overwriting with empty array.
- **Bug 32 (Low):** `client/src/components/VttCanvas.vue:414-424` Token size/layer z-index sorting so large vehicles do not obscure characters.
- **Bug 33 (Low):** `client/src/components/VttCanvas.vue:739-743` & `SpaceVttCanvas.vue:639-643` Prevent page scroll on Space key (`e.preventDefault()`).
- **Bug 38 (Low):** `client/src/components/VehicleTokenHud.vue:225-235` Prevent double-save on Enter key in vehicle HUD.

**Files:**
- Modify: `client/src/components/VttCanvas.vue`
- Modify: `client/src/components/SpaceVttCanvas.vue`
- Modify: `client/src/components/AdversaryTokenHud.vue`
- Modify: `client/src/components/VehicleTokenHud.vue`
- Test: `client/test/VttCanvasPolish.test.js`
- Test: `client/test/AdversaryTokenHud.test.js`
- Test: `client/test/VehicleTokenHud.test.js`

- [x] **Step 1: Write/update unit tests for ruler drag state, status effects parsing, adversary conditions, and HUD Enter key blur**
- [x] **Step 2: Implement ruler `isMeasuring` flag, Space key `preventDefault()`, token z-index sorting, and render throttling in `VttCanvas.vue` and `SpaceVttCanvas.vue`**
- [x] **Step 3: Implement stringified conditions parsing in `AdversaryTokenHud.vue` and Enter key handling in `VehicleTokenHud.vue`**
- [x] **Step 4: Run client tests to verify Task 3 passes**

---

### Task 4: Frontend Views, Sheets, Rules, DiceBox & Error Handling
**Covers Bugs:** 10, 12, 23, 24, 25, 29, 30, 31, 34, 35, 36
- **Bug 10 (High):** `client/src/views/CharacterSheetsView.vue:164-231, 1032-1045` Fix inverted point-shift arrow directions and tooltips.
- **Bug 12 (High):** `client/src/views/RpgVttView.vue:1140` & `SpaceVttView.vue:1264` Fix string spreading corruption of `status_effects`.
- **Bug 23 (Med):** `client/src/views/RpgVttView.vue:1663-1666` Fix adversary damage roll regex for flat damage and alternative formulas.
- **Bug 24 (Med):** `client/src/views/RpgVttView.vue` & `SpaceVttView.vue` WebGL context / DiceBox leak. Manage DiceBox as shared singleton or properly dispose/reuse canvas.
- **Bug 25 (Med):** `client/src/views/RpgVttView.vue:2001-2012` & `SpaceVttView.vue:2060-2071` Replace blanket `socket.off('event')` with specific handler references.
- **Bug 29 (Low):** `client/src/views/CharacterSheetsView.vue:1089` & `ShipSheetsView.vue:980` Provide user feedback on save/update network failures.
- **Bug 30 (Low):** `client/src/views/RpgVttView.vue:1293-1309` & `SpaceVttView.vue:1612-1628` Surface error messages on modal creation failures.
- **Bug 31 (Low):** `client/src/views/RpgVttView.vue:1135-1142` & `SpaceVttView.vue:1259-1268` Clear selected token form state on token deselection.
- **Bug 34 (Low):** `client/src/constants/characterRules.js:76-78` Round `calcUnencumberedMax` up using `Math.ceil((str ?? 50) / 2)`.
- **Bug 35 (Low):** `client/src/constants/characterRules.js:88-95` Support PSA check on custom skills in `calcXPCost`.
- **Bug 36 (Low):** `client/src/views/ShipSheetsView.vue:891-1031` Replace blocking native `alert()` and `confirm()` dialogs.

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue`
- Modify: `client/src/views/ShipSheetsView.vue`
- Modify: `client/src/views/RpgVttView.vue`
- Modify: `client/src/views/SpaceVttView.vue`
- Modify: `client/src/constants/characterRules.js`
- Test: `client/test/CharacterSheetsView.test.js`
- Test: `client/test/characterRules.test.js`
- Test: `client/test/ShipSheetsView.test.js`

- [x] **Step 1: Write/update unit tests for point-shift arrows, `calcUnencumberedMax`, `calcXPCost`, and token form reset**
- [x] **Step 2: Implement point-shift fixes and error feedback in `CharacterSheetsView.vue` and `ShipSheetsView.vue`**
- [x] **Step 3: Implement `calcUnencumberedMax` and `calcXPCost` in `characterRules.js`**
- [x] **Step 4: Implement status effect parsing, adversary damage formula handling, socket listener cleanup, DiceBox reuse, and token form clearing in `RpgVttView.vue` and `SpaceVttView.vue`**
- [x] **Step 5: Run full client and server test suites to verify whole-branch completion**

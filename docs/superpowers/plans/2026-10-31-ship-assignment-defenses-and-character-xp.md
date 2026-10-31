# Ship Sheets Assignment, Defenses Upgrade, and Character XP Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three sequential enhancements:
1. Enable the GameMaster (GM) to assign ship sheets to valid player logins on creation and update (identical capability to character sheets).
2. Rename the "Defensive Screens" panel on ship sheets to "Defenses", add a "+ Add Defense" button and modal capability mirroring "+ Add Weapon", and add the ability to delete an equipped defense.
3. Add an XP tracker on character sheets with increment and decrement steppers allowing players and GMs to track and spend XP to increase attributes or buy skills.

**Tech Stack:** Node.js, Express, better-sqlite3, Socket.io, Vue 3, Pinia, Vitest, Supertest

---

## Global Constraints
- Only GameMasters (`isGameMaster`) can assign or reassign ship sheet `user_id`. Non-GMs cannot modify `user_id`.
- The target `user_id` must exist in the `users` table; invalid or nonexistent IDs must return `400 Bad Request`.
- On ship sheets, rename the applet header "Defensive Screens" to "Defenses", add "+ Add Defense" button and modal, and allow deleting defenses without breaking existing preset loading or defense toggles/counters.
- For character sheets, store `current_xp` in SQLite `character_sheets` table (default 0), expose via API, and provide reactive increment/decrement steppers on the sheet.
- All existing tests across both server and client suites must pass 100%.

---

### Task 1: GM Player Assignment for Ship Sheets (Backend & Frontend)

**Files:**
- Modify: `server/src/sheets.js`
- Test: `server/test/sheets.test.js`
- Modify: `client/src/views/ShipSheetsView.vue`
- Test: `client/test/ShipSheetsView.test.js`

**Interfaces:**
- Consumes: `users` table (`id`, `username`, `role`), `isGameMaster(db, userId)` from `middleware.js`
- Produces: `owner_username` on `ship` object; GM capability to set `user_id` on `POST /api/ships` and `PUT /api/ships/:id`; player attribution dropdown/badge on frontend.

- [ ] **Step 1: Write backend tests in `server/test/sheets.test.js`**
  - Verify `GET /api/ships` and `GET /api/ships/:id` return `owner_username`.
  - Verify GM can assign a ship to another player on `POST /api/ships`.
  - Verify GM can reassign a ship to another player on `PUT /api/ships/:id`.
  - Verify assigning to a non-existent `user_id` returns 400 Bad Request.
  - Verify non-GM player cannot alter `user_id` on `PUT /api/ships/:id`.

- [ ] **Step 2: Implement backend player assignment in `server/src/sheets.js`**
  - In `formatShipSheet(row)`: add `user_id: Number(row.user_id)` and `owner_username: row.owner_username || ''`.
  - In `GET /` and `GET /:id`: update query to `SELECT s.*, u.username AS owner_username FROM ship_sheets s LEFT JOIN users u ON s.user_id = u.id`.
  - In `POST /`: check `isGM` and if `req.body.user_id` is supplied, validate user exists in `users` and use target `id` as `ownerId`.
  - In `PUT /:id`: check `isGM` and if `req.body.user_id` is supplied, validate user exists and update `user_id = ?`. If non-GM, preserve `existing.user_id`.
  - When selecting `created` and `updated` ship sheets, join `users u ON s.user_id = u.id` so `owner_username` is returned and broadcast via socket.

- [ ] **Step 3: Write frontend tests in `client/test/ShipSheetsView.test.js`**
  - Verify GM sees the player assignment dropdown (`.player-select-wrap select`) when registered users are present.
  - Verify changing the dropdown invokes `updateShip` with the selected `user_id`.
  - Verify non-GM players see the read-only attribution badge (`.badge-player`) with the owner's username.
  - Verify Create Ship modal includes Assigned Player select for GM.

- [ ] **Step 4: Implement frontend player assignment in `client/src/views/ShipSheetsView.vue`**
  - Add `registeredUsers: []` in component `data()`.
  - In `mounted()`: call `fetchUsers()` when `isGm`.
  - Implement `fetchUsers()` calling `GET /api/auth/users`.
  - In `.sheet-header .header-main`: add `.player-select-wrap` for GM and `.badge-player` for players (matching `CharacterSheetsView.vue`).
  - In `newShipForm`: add `user_id` defaulting to current user ID.
  - In Create Ship modal: add Assigned Player select for GM.
  - In `normalizeShipData`: preserve `user_id` and `owner_username`.

- [ ] **Step 5: Run tests and verify**
  - Run server tests: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/server && ./node_modules/.bin/vitest run test/sheets.test.js"`
  - Run client tests: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/client && ./node_modules/.bin/vitest run test/ShipSheetsView.test.js"`
  - Commit: `feat(ships): enable GM player assignment on ship sheets and create modal`

---

### Task 2: Ship Defenses Panel Upgrade (Rename, "+ Add Defense" Modal, Delete Defense)

**Files:**
- Modify: `client/src/views/ShipSheetsView.vue`
- Create/Modify: `client/src/constants/shipDefenses.js` (or catalog in constants)
- Test: `client/test/ShipSheetsView.test.js`

**Interfaces:**
- Produces: Renamed header "Defenses" in place of "Defensive Screens".
- Produces: `+ Add Defense` button and modal with preset Knight Hawks defenses (Reflective Hull, Masking Screens, ICMs, Stasis Screen, Stealth Screen, Proton Screen, Electron Screen) and custom defense creation (toggle vs counter).
- Produces: Delete button (`✕`) on every defense item in the Defenses list.
- Backwards compatibility: Existing defense formats (both object map and array/list) normalized safely; toggle buttons and counters function as expected.

- [ ] **Step 1: Write failing frontend tests in `client/test/ShipSheetsView.test.js`**
  - Verify header text is "Defenses" (not "Defensive Screens").
  - Verify "+ Add Defense" button exists in `.list-header`.
  - Verify clicking "+ Add Defense" opens the Add Defense modal.
  - Verify adding a defense (from catalog or custom) adds it to the ship's defenses and calls `updateShip()`.
  - Verify clicking the delete button (`✕`) removes the defense and calls `updateShip()`.

- [ ] **Step 2: Define defense catalog and helper in `client/src/constants/shipDefenses.js`**
  - Standard Knight Hawks defenses: Reflective Hull (type: 'toggle'), Masking Screens (type: 'counter', max: 2), ICMs (type: 'counter', max: 4), Stasis Screen (type: 'toggle'), Stealth Screen (type: 'toggle'), Proton Screen (type: 'counter'/'toggle'), Electron Screen (type: 'counter'/'toggle').
  - Provide `createDefenseInstance(template, overrides)`.

- [ ] **Step 3: Update `ShipSheetsView.vue`**
  - Change `<h4>Defensive Screens</h4>` to `<h4>Defenses</h4>`.
  - Add `<button class="btn-secondary" @click="openAddDefenseModal">+ Add Defense</button>`.
  - Render defense items with online/offline toggles (for toggle types), counters with current/max and action buttons (for counter types like deploy/launch), and a delete button (`<button class="btn-remove" title="Remove Defense" @click="removeDefense(keyOrIndex)">✕</button>`).
  - Add Add Defense modal (catalog list + custom defense form) mirroring `showAddWeaponModal`.
  - Update `normalizeDefenses` so it supports both existing standard keys and dynamic defense items/lists seamlessly.
  - Add `removeDefense(item)` method that removes the defense, updates state, and calls `updateShip()`.

- [ ] **Step 4: Run tests and verify**
  - Run: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/client && ./node_modules/.bin/vitest run test/ShipSheetsView.test.js"`
  - Commit: `feat(ships): rename defense screens to defenses, add defense modal and delete capability`

---

### Task 3: Character Sheet XP Tracker (Backend DB & API, Frontend Steppers & Spend)

**Files:**
- Modify: `server/src/db.js`
- Modify: `server/src/sheets.js`
- Test: `server/test/sheets.test.js`
- Modify: `client/src/views/CharacterSheetsView.vue`
- Test: `client/test/CharacterSheetsView.test.js`

**Interfaces:**
- Produces: `current_xp` integer column in `character_sheets` table (default 0).
- Produces: `current_xp` included in character GET/POST/PUT API responses and requests.
- Produces: Interactive XP tracker card in `CharacterSheetsView.vue` with current XP display, direct number input, and stepper buttons (`-5`, `-1`, `+1`, `+5`).
- Produces: Ability to spend XP to upgrade skills (deducting from `current_xp`) or increase attributes.

- [ ] **Step 1: Write backend tests in `server/test/sheets.test.js`**
  - Verify `GET /api/characters` returns `current_xp` (default 0).
  - Verify `POST /api/characters` accepts and persists `current_xp`.
  - Verify `PUT /api/characters/:id` updates `current_xp`.

- [ ] **Step 2: Implement backend support in `server/src/db.js` and `server/src/sheets.js`**
  - In `server/src/db.js`: add `current_xp INTEGER NOT NULL DEFAULT 0` to `CREATE TABLE IF NOT EXISTS character_sheets` and check PRAGMA to `ALTER TABLE character_sheets ADD COLUMN current_xp INTEGER NOT NULL DEFAULT 0` if missing.
  - In `server/src/sheets.js`: update `formatCharacterSheet` to include `current_xp: Number(row.current_xp || 0)`.
  - In `POST /api/characters`: handle `current_xp = 0` (clamped min 0).
  - In `PUT /api/characters/:id`: include `current_xp = ?` in `UPDATE character_sheets SET ...`.

- [ ] **Step 3: Write frontend tests in `client/test/CharacterSheetsView.test.js`**
  - Verify XP Tracker card is displayed with current XP.
  - Verify stepper buttons (`-1`, `+1`, `-5`, `+5`) update `current_xp` and trigger `updateCharacter`.
  - Verify manual XP input updates `current_xp`.
  - Verify spending XP on skill upgrade deducts XP from `current_xp` when available.

- [ ] **Step 4: Implement frontend XP tracker in `client/src/views/CharacterSheetsView.vue`**
  - In template: add Experience Points (XP) Tracker card (near Quick Trackers or above Skills & Experience).
  - Include current XP display, stepper buttons (`-5`, `-1`, `+1`, `+5`), and direct number input.
  - Implement `adjustXP(amount)` method that clamps `current_xp` to minimum 0 and calls `updateCharacter()`.
  - In `upgradeSkillLevel(index)`: when XP is available, deduct `getXPCost(...)` from `current_xp` and notify/update.
  - In `normalizeCharacterData`: ensure `current_xp: Number(copy.current_xp || 0)` is preserved.

- [ ] **Step 5: Run tests and verify**
  - Run server tests: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/server && npm test"`
  - Run client tests: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/client && ./node_modules/.bin/vitest run test/CharacterSheetsView.test.js"`
  - Commit: `feat(characters): add XP tracker with increment/decrement steppers and skill spend integration`

---

### Final Verification & Service Restart
- Run full client vitest suite: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/client && ./node_modules/.bin/vitest run"`
- Run full server vitest suite: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/server && npm test"`
- Run client production build: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/client && npm run build"`
- Restart services: `./sf-vtt-ctl.sh restart && ./sf-vtt-ctl.sh status`

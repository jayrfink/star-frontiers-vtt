# Implementation Plan: Comprehensive Bug Fixes (Round 2)

**Date:** 2026-10-23  
**Goal:** Resolve all confirmed backend and frontend bugs identified in the exhaustive audit report, while maintaining 100% passing tests and dev server stability.

---

## Subsystems & Target Modules

### 1. Backend (`server/src/`)
- `server/src/adversaries.js`: Sanitize `template_id` to prevent path traversal; accept `id` as fallback for `template_id`.
- `server/src/upload.js`: Restrict `POST /api/upload` to GMs; enhance SVG sanitization; strip query strings from URLs in `sanitizeUploadPath`.
- `server/src/auth.js` & `server/src/middleware.js`: Validate active user existence in `requireAuth`; serialize user registration checks.
- `server/src/maps.js`: Support both `character_sheets` and `ship_sheets` in `canManageToken` and `POST /api/tokens`; prevent non-GM players from modifying restricted token fields (`layer`, `map_id`, `template_id`); safely handle `null` in JSON fields.
- `server/src/sheets.js`: Nullify `tokens.character_id` on ship sheet deletion; wrap multi-statement operations in `db.transaction()`.
- `server/src/rolls.js`: Reject `NaN` and `Infinity` in roll logging.

### 2. Frontend (`client/src/`)
- `client/src/views/CharacterSheetsView.vue`: Correct Star Frontiers non-weapon skill base chance to 50% stat; apply racial ability modifiers during character creation; fix level 0 skill bonus.
- `client/src/constants/characterRules.js`: Use nullish coalescing (`??`) across math calculations (`calcIM`, `calcPunchDamage`, `calcMaxCarry`).
- `client/src/constants/shipWeapons.js`: Align space mines damage to `3d10` per Knight Hawks rules.
- `client/src/views/ShipSheetsView.vue`: Use nullish coalescing in hull point math; preserve limited ammo display when empty.
- `client/src/components/DeployVehicleModal.vue`: Unwrap `{ vehicle }` payload from `vehicle:created` socket event.
- `client/src/components/VehicleTokenHud.vue`: Preserve numeric `passengers` capacity when editing driver notes.
- `client/src/components/AdversaryTokenHud.vue`: Fallback to `hp_max` when computing adversary token max HP.
- `client/src/views/GmNotesView.vue`: Guard against async session panel fetch race conditions.
- `client/src/views/RpgVttView.vue` & `SpaceVttView.vue`: Await `diceBoxInstance.init()`.
- `client/src/components/VttCanvas.vue` & `SpaceVttCanvas.vue`: Add HiDPI (`devicePixelRatio`) canvas scaling.

---

## Phased Tasks

### Task 1: Backend Security & Access Control
- Files: `server/src/adversaries.js`, `server/src/upload.js`, `server/src/auth.js`, `server/src/middleware.js`, `server/src/maps.js`
- Test Files: `server/test/adversaries.test.js`, `server/test/upload.test.js`, `server/test/auth.test.js`, `server/test/maps.test.js`

### Task 2: Space VTT Starship Ownership & Database Integrity
- Files: `server/src/maps.js`, `server/src/sheets.js`, `server/src/rolls.js`, `server/src/upload.js`
- Test Files: `server/test/maps.test.js`, `server/test/sheets.test.js`, `server/test/rolls.test.js`, `server/test/upload.test.js`

### Task 3: Star Frontiers Rules & Character Creation Mechanics
- Files: `client/src/views/CharacterSheetsView.vue`, `client/src/constants/characterRules.js`, `client/src/constants/shipWeapons.js`, `client/src/views/ShipSheetsView.vue`
- Test Files: `client/test/CharacterSheetsView.test.js`, `client/test/CharacterSheetsSpaceshipSkills.test.js`, `src/constants/characterRules.test.js`, `client/test/shipWeapons.test.js`, `client/test/ShipSheetsView.test.js`

### Task 4: Vehicle Sync, HUD State & Canvas HiDPI Robustness
- Files: `client/src/components/DeployVehicleModal.vue`, `client/src/components/VehicleTokenHud.vue`, `client/src/components/AdversaryTokenHud.vue`, `client/src/views/GmNotesView.vue`, `client/src/views/RpgVttView.vue`, `client/src/views/SpaceVttView.vue`, `client/src/components/VttCanvas.vue`, `client/src/components/SpaceVttCanvas.vue`
- Test Files: `client/test/DeployVehicleModal.test.js`, `client/test/VehicleTokenHud.test.js`, `client/test/AdversaryTokenHud.test.js`, `client/test/GmNotesView.test.js`

# Implementation Plan: Character & Ship Sheets Left Navigation Reordering

**Date:** 2026-10-26  
**Spec Reference:** [`docs/superpowers/specs/2026-10-26-sheets-sidebar-reordering-design.md`](file:///Users/jrf/star-frontiers-vtt/docs/superpowers/specs/2026-10-26-sheets-sidebar-reordering-design.md)  
**Goal:** Enable drag-and-drop and button-based reordering of character and ship sheets in their sidebar navigation lists, backed by SQLite persistence and Socket.io real-time synchronization.

---

## Proposed Changes

### Backend Subsystem
- **`server/src/db.js`**:
  - Add migration logic for `sort_order INTEGER NOT NULL DEFAULT 0` column to `character_sheets` and `ship_sheets`.
  - Populate existing rows with sequential `sort_order = id` if `sort_order == 0`.
- **`server/src/sheets.js`**:
  - When inserting new character or ship sheet, set `sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1)`.
  - Update `GET /api/characters` to `ORDER BY sort_order ASC, id ASC`.
  - Update `GET /api/ships` to `ORDER BY sort_order ASC, id ASC`.
  - Add `PUT /api/characters/reorder` endpoint with validation, permissions (GM or owner), transaction execution, and `io.emit('sheets:reordered', { type: 'character', order })`.
  - Add `PUT /api/ships/reorder` endpoint with validation, permissions (GM or owner), transaction execution, and `io.emit('sheets:reordered', { type: 'ship', order })`.
- **`server/test/sheets.test.js`**:
  - Add integration tests for ordering queries, reordering endpoints, validation, permissions, and socket events.

### Frontend Subsystem
- **`client/src/views/CharacterSheetsView.vue`**:
  - Add drag handle (`⋮⋮`) with `@dragstart`, `@dragover`, `@drop`, `@dragend` to each list item in `.character-list`.
  - Add accessible Move Up (`▲`) and Move Down (`▼`) buttons to reorder item by 1 position.
  - Implement optimistic local swap + `PUT /api/characters/reorder` API call with rollback on failure.
  - Add Socket.io listener for `sheets:reordered` (type `character`) to update order in real time while keeping selected sheet active.
  - Add CSS styles for `.drag-handle`, `.reorder-actions`, `.dragging`, and drop indicator border.
- **`client/src/views/ShipSheetsView.vue`**:
  - Implement identical reordering features (drag handle + up/down buttons) for `.ship-list`.
  - Socket.io listener for `sheets:reordered` (type `ship`).
- **`client/test/CharacterSheetsView.test.js`**:
  - Add tests for drag handle rendering, move up/down button clicks, optimistic swap, and socket updates.
- **`client/test/ShipSheetsView.test.js`**:
  - Add tests for ship list drag handle rendering, move up/down button clicks, and socket updates.

---

## Tasks

### Task 1: Database Migration & Sheet Insertion Order
- [ ] In `server/src/db.js`, add migration altering `character_sheets` and `ship_sheets` to include `sort_order INTEGER NOT NULL DEFAULT 0`.
- [ ] In `server/src/sheets.js`, set `sort_order` upon creation of new character and ship sheets.
- [ ] In `server/src/sheets.js`, update `GET /api/characters` and `GET /api/ships` to sort by `sort_order ASC, id ASC`.
- [ ] Verify existing server tests pass (`npm test`).

### Task 2: Backend Reorder Endpoints & Tests (TDD)
- [ ] Write integration tests in `server/test/sheets.test.js` verifying `PUT /api/characters/reorder` and `PUT /api/ships/reorder` (success case, unauthenticated 401, player permissions, invalid payload 400, socket emission).
- [ ] Implement `PUT /api/characters/reorder` and `PUT /api/ships/reorder` in `server/src/sheets.js`.
- [ ] Run server tests inside container (`docker exec sf-vtt-dev sh -c "cd server && npm test"`).

### Task 3: Character Sheets Left Navigation Reordering UI
- [ ] Update `client/src/views/CharacterSheetsView.vue` with drag handles, drag-and-drop events, up/down buttons, optimistic API reordering, and socket synchronization.
- [ ] Add CSS styling in `CharacterSheetsView.vue` for handles, action buttons, hover states, and drag visual cues.
- [ ] Add unit tests in `client/test/CharacterSheetsView.test.js` covering move up/down and socket reorder.
- [ ] Run vitest suite to verify client passes.

### Task 4: Ship Sheets Left Navigation Reordering UI
- [ ] Update `client/src/views/ShipSheetsView.vue` with drag handles, drag-and-drop events, up/down buttons, optimistic API reordering, and socket synchronization.
- [ ] Add CSS styling in `ShipSheetsView.vue`.
- [ ] Add unit tests in `client/test/ShipSheetsView.test.js` covering move up/down and socket reorder.
- [ ] Run vitest suite to verify client passes.

### Task 5: End-to-End Verification & Documentation
- [ ] Verify both RPG Character Sheets and Knight Hawks Ship Sheets in the running app.
- [ ] Run full test suites (`server` and `client`).
- [ ] Commit implementation changes.

# Design Spec: Character & Ship Sheets Left Navigation Reordering

**Date:** 2026-10-26  
**Status:** Approved  

---

## 1. Overview
Allow users to reorder character sheets and ship sheets in the left navigation sidebar of both [`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue) and [`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue). The ordering is shared globally in the database across connected clients, updating in real time via Socket.io. Users can reorder via drag-and-drop handles or hover move up/down buttons.

---

## 2. Requirements & Permissions
1. **Global Ordering:** Stored in the SQLite database (`sort_order INTEGER NOT NULL DEFAULT 0`) on `character_sheets` and `ship_sheets`.
2. **Access Control:**
   - GameMaster (GM) can reorder any sheet.
   - Players can reorder sheets they own. If a player reorders a list containing other sheets, any moved sheets must belong to the player (or owner/GM permission verified per item moved).
3. **User Interaction:**
   - Drag handle (`⋮⋮` / `⠿`) on each list item supporting HTML5 drag-and-drop.
   - Accessible Move Up (`▲`) and Move Down (`▼`) buttons appearing on hover (or accessible via focus) on each sheet item.
   - Optimistic UI reordering for immediate tactile response, followed by persistence to backend.
   - Real-time synchronization via Socket.io `sheets:reordered` event.

---

## 3. Data Model & Migration
### Schema Alterations in [`server/src/db.js`](file:///Users/jrf/star-frontiers-vtt/server/src/db.js)
```sql
-- Migration check & alter
ALTER TABLE character_sheets ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ship_sheets ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
```
- Existing rows will be assigned sequential `sort_order` values (`sort_order = id`) during migration if not already set.
- New sheets inserted into `character_sheets` and `ship_sheets` calculate `next_sort_order` as `COALESCE(MAX(sort_order), 0) + 1` so they appear at the bottom of the list by default.
- Query updates:
  - `GET /api/characters`: `SELECT * FROM character_sheets ORDER BY sort_order ASC, id ASC`
  - `GET /api/ships`: `SELECT * FROM ship_sheets ORDER BY sort_order ASC, id ASC`

---

## 4. Backend Endpoints & Sockets
### Endpoints in [`server/src/sheets.js`](file:///Users/jrf/star-frontiers-vtt/server/src/sheets.js)
1. `PUT /api/characters/reorder`
   - **Request Body:** `{ order: [id1, id2, id3, ...] }`
   - **Validation:**
     - `order` must be a non-empty array of integer IDs without duplicates.
     - Verify permissions: If not GM, ensure that any sheet changing relative order is owned by `req.session.userId`.
   - **Execution:** Run database transaction updating `sort_order = index` for each ID in the new order.
   - **Socket Event:** `io.emit('sheets:reordered', { type: 'character', order: [...] })`
   - **Response:** `200 OK` with `{ success: true }`.

2. `PUT /api/ships/reorder`
   - **Request Body:** `{ order: [id1, id2, id3, ...] }`
   - Same validation, execution, and socket emission (`type: 'ship'`) as characters.

---

## 5. Frontend Implementation
### Shared Components / Helpers & Views
1. **Drag-and-Drop + Button Controls in Sidebar:**
   - In [`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue) and [`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue):
     - Each `<li>` in `.sheet-list` gains:
       - `.drag-handle` (`⋮⋮`) with `draggable="true"` or list-item draggable.
       - `.reorder-actions` container with `.btn-move-up` (`▲`) and `.btn-move-down` (`▼`).
       - Disabled state for Move Up on the first item and Move Down on the last item.
     - Event listeners: `@dragstart`, `@dragover`, `@drop`, `@dragend`.
     - Drag styling: `.dragging` opacity, `.drag-over` drop indicator border.
2. **Move Actions:**
   - Clicking `▲` swaps the item with the item immediately above it.
   - Clicking `▼` swaps the item with the item immediately below it.
   - Dropping an item inserts it at the target position.
3. **Persistence & Sockets:**
   - Calls `PUT /api/characters/reorder` or `PUT /api/ships/reorder`.
   - Listens on `socket.on('sheets:reordered')`: if incoming order differs from local state, update local list order accordingly while preserving the currently selected sheet.

---

## 6. Testing & Verification
1. **Unit & Integration Tests:**
   - `server/test/sheets.test.js`:
     - Test migration adds `sort_order`.
     - Test `GET /api/characters` and `GET /api/ships` return items ordered by `sort_order ASC`.
     - Test `PUT /api/characters/reorder` and `PUT /api/ships/reorder` update `sort_order` properly in transaction.
     - Test permission checks (GM vs Player vs unauthenticated).
     - Test socket emission `sheets:reordered`.
   - `client/test/CharacterSheetsView.test.js` & `client/test/ShipSheetsView.test.js`:
     - Test rendering of drag handles and move up/down buttons.
     - Test clicking move up / move down swaps list items and calls API.
     - Test handling of `sheets:reordered` socket event.

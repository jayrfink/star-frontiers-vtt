# Star Frontiers VTT — Phase 3 Design Spec: Character & Ship Sheets (State Management & WebSockets)

## Goal
Implement interactive Alpha Dawn Character Sheets and Knight Hawks Ship Sheets with SQLite persistence and real-time Socket.io state synchronization across all connected clients.

## Scope & Architectural Changes

### 1. Database Layer (`server/src/db.js`)
- Add `character_sheets` table:
  - Fields: `id`, `user_id`, `name`, `race` (Human/Dralasite/Vrusk/Yazirian), `gender`, `height`, `weight`, `str`, `sta`, `current_sta`, `dex`, `rs`, `int_stat`, `log_stat`, `per`, `ldr`, `racial_abilities` (JSON), `skills` (JSON), `inventory` (JSON), `notes`, `created_at`, `updated_at`.
- Add `ship_sheets` table:
  - Fields: `id`, `user_id`, `name`, `ship_type`, `hull_points`, `current_hp`, `adf`, `mr`, `dcr`, `weapons` (JSON), `defenses` (JSON), `notes`, `created_at`, `updated_at`.

### 2. Backend WebSockets & REST API (`server/src/sheets.js` & `server/src/index.js`)
- Install `socket.io` on server.
- Express REST Endpoints:
  - `/api/characters` (GET, POST, GET :id, PUT :id, DELETE :id)
  - `/api/ships` (GET, POST, GET :id, PUT :id, DELETE :id)
- Socket.io Events:
  - Server listens for `sheet:update` and broadcasts `sheet:updated` to all connected clients.
  - Broadcasts `sheet:created` and `sheet:deleted` for list synchronization.

### 3. Frontend WebUI & Socket Integration
- Install `socket.io-client` on client.
- Global socket plugin/service or Pinia store integration connecting to Express server.
- **`CharacterSheetsView.vue`**:
  - Sidebar list of characters + "Create Character" modal/form.
  - Interactive sheet pane for primary stats, live stamina tracker (-5/-1/+1/+5), racial abilities, skills, and equipment.
- **`ShipSheetsView.vue`**:
  - Sidebar list of ships + "Create Ship" form.
  - Interactive sheet pane for ADF, MR, DCR, live HP tracker, weapons, and defensive screen toggles.

## Verification & Testing
1. Unit tests for `/api/characters` and `/api/ships` REST endpoints.
2. Socket.io broadcast test verifying real-time update events.
3. Manual verification using two browser windows (GM vs Player) confirming live stat updates sync instantly.

# GM Notes Tab & Space Combat Flip and Burn Design

**Date:** 2026-10-22
**Status:** Approved

## 1. Overview & Goals
This feature introduces two capabilities to the Star Frontiers VTT:
1. **GM-Only "GM Notes" Tab (`/dashboard/gm-notes`):**
   - A dedicated workspace visible and accessible **exclusively** to `GameMaster` users.
   - Allows the GM to organize campaign sessions in a left sidebar and create multiple customizable Note Panels per session in the main workspace (e.g., `"Introduction"`, `"Part 1"`, `"Readouts"`, `"Adversaries to Spawn"`).
   - Each Note Panel has an inline-editable title and a freeform text area that persists automatically to SQLite.
2. **Space Combat "Flip and Burn" Maneuver (`MR > 3`):**
   - Any starship with a Maneuver Rating (`MR`) strictly greater than `3` (`MR >= 4`) can execute a **Flip and Burn** maneuver in space combat.
   - Executing Flip and Burn reverses the ship token's heading by `180°` on the Space VTT and broadcasts a shared Space Roll Log alert reminding all strapped-in PCs on board to pass a **STA check** or pass out for **`1d10 × 10` seconds**.
   - Provides 1-click rollers in the Space VTT Token Inspector for **Crew STA Check (d%)** and **Blackout Duration (`1d10 × 10` seconds)**, plus a capability indicator and rule badge on the **Ship Sheets** view.

---

## 2. Part 1: GM Notes Architecture

### 2.1 Database Schema (`server/src/db.js`)
Add two tables in `migrate(db)`:
```sql
CREATE TABLE IF NOT EXISTS gm_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT 'Session 1',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gm_note_panels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Note',
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES gm_sessions(id) ON DELETE CASCADE
);
```

### 2.2 Backend Router (`server/src/gmNotes.js` mounted at `/api/gm-notes`)
All endpoints use `requireAuth` and `requireGM` from `server/src/middleware.js` so non-GMs receive `403 Forbidden` (and unauthenticated requests receive `401 Unauthorized`).
- `GET /api/gm-notes/sessions`:
  - Returns all rows from `gm_sessions` ordered by `id ASC`.
  - If the table is empty, automatically seeds a default session (`"Session 1"`) with two starter panels (`"Introduction"` and `"Part 1"`) so the GM immediately has a ready-to-use workspace.
- `POST /api/gm-notes/sessions`:
  - Creates a new session (`{ title }`, defaulting to `"New Session"`), seeds an initial `"Introduction"` panel, and returns `201` with the created session.
- `PUT /api/gm-notes/sessions/:id`:
  - Updates `title` and `updated_at` on `gm_sessions`. Returns `404` if not found.
- `DELETE /api/gm-notes/sessions/:id`:
  - Deletes the session (cascading to `gm_note_panels`). Returns `200` (`{ ok: true }`).
- `GET /api/gm-notes/sessions/:id/panels`:
  - Returns all panels for `session_id = :id` ordered by `sort_order ASC, id ASC`. Returns `404` if session does not exist.
- `POST /api/gm-notes/sessions/:id/panels`:
  - Creates a new panel (`{ title, content }`, defaulting `title` to `"New Note"`) in `session_id = :id` and returns `201` with the created panel.
- `PUT /api/gm-notes/panels/:id`:
  - Updates `title` and/or `content` on `gm_note_panels`. Returns `200` with the updated panel (or `404` if not found).
- `DELETE /api/gm-notes/panels/:id`:
  - Deletes the panel and returns `200` (`{ ok: true }`).

### 2.3 Frontend View & Navigation (`NavBar.vue`, `router.js`, `GmNotesView.vue`)
- **`client/src/components/NavBar.vue`:**
  - When `auth.user?.role === 'GameMaster'`, include `{ path: '/dashboard/gm-notes', label: 'GM Notes', icon: '📓' }` in `tabs` (right before `Admin`).
- **`client/src/router.js`:**
  - Add `/dashboard/gm-notes` (`name: 'GmNotes'`, `component: GmNotesView`, `meta: { requiresAuth: true, requiresGm: true, title: 'GM Notes' }`).
  - Include `'/dashboard/gm-notes'` in `ALLOWED_DASHBOARD_PATHS` and `'GmNotes'` in `ALLOWED_DASHBOARD_NAMES` (with the same non-GM guard as `/dashboard/admin` in `getSavedDashboardPath`).
- **`client/src/views/GmNotesView.vue`:**
  - **Left Sidebar (`Sessions`):**
    - `+ New Session` button.
    - List of sessions showing session title and delete (`✕`) button.
    - Clicking a session loads its note panels.
  - **Main Workspace:**
    - Session header with an editable session title input (`@change="saveSessionTitle"`), a `+ Add Note Panel` button, and quick-add preset buttons (`+ Introduction`, `+ Part 1`, `+ Readout`, `+ Adversaries`).
    - Responsive grid of Note Panel cards (`.note-panel-card`):
      - Editable panel title `<input>` (e.g., `"Introduction"`, `"Part 1"`) saved via `PUT /api/gm-notes/panels/:id` on `@change`.
      - Delete panel button (`✕`).
      - Resizable `<textarea>` for session notes, box-text readouts, and adversary plans, saved via `PUT /api/gm-notes/panels/:id` on `@change` / `@blur`.

---

## 3. Part 2: Space Combat "Flip and Burn" Architecture

### 3.1 Pure Helper Module (`client/src/utils/flipAndBurn.js`)
- `FLIP_AND_BURN_MIN_MR = 4` (strictly greater than 3: `mr > 3`).
- `canFlipAndBurn(mr)`: returns `Number.isFinite(Number(mr)) && Number(mr) > 3`.
- `calculateFlipHeading(currentRotation)`: returns `((Number(currentRotation) || 0) + 180) % 360`, normalized to `[0, 360)`.
- `calculateBlackoutSeconds(d10Value)`: clamps/parses `d10Value` (1–10) and returns `d10Value * 10`.
- `formatFlipAndBurnAlert(shipName, newHeading)`: returns a descriptive breakdown string:
  `"Heading reversed to ${newHeading}°. All strapped-in PCs aboard ${shipName} must pass a STA check (d% <= STA) or pass out for 1d10×10 seconds!"`

### 3.2 Space VTT Token Inspector (`client/src/views/SpaceVttView.vue`)
- Add computed `selectedTokenLinkedShip` that looks up `ships.value.find(s => s.id === selectedToken.value?.character_id) || null`.
- Add computed `selectedTokenCanFlipAndBurn`:
  - If `selectedTokenLinkedShip` exists, returns `canFlipAndBurn(selectedTokenLinkedShip.mr)`.
  - If the token is an unlinked custom ship token (`!selectedTokenLinkedShip`), returns `true` (so GMs/players using unlinked tokens can still execute the maneuver if their ship has MR > 3).
- In the Token Inspector sidebar (for non-celestial tokens):
  - Add a **🔄 Flip & Burn Maneuver** box:
    - Shows linked ship's MR badge (`MR: X`) if linked.
    - If `selectedTokenLinkedShip` has `mr <= 3`, disables the **🔄 Flip & Burn (180°)** button and displays `Requires MR > 3 (Current MR: X)`.
    - Clicking **🔄 Flip & Burn (180°)** (`executeFlipAndBurn()`):
      1. Computes `newRotation = calculateFlipHeading(selectedToken.value.rotation)`.
      2. Updates the token's rotation via `PUT /api/tokens/:id` (`{ rotation: newRotation }`).
      3. Logs a shared roll/maneuver notification via `sendRollToServer` (`type: 'percentile'`, `label: "${token.name}: Flip & Burn (180°)"`, `total: newRotation`, `breakdown: formatFlipAndBurnAlert(token.name, newRotation)`).
    - Below the maneuver button, provide two 1-click crew check buttons:
      - **🎲 Crew STA Check (d%):** Rolls 3D percentile dice (`d100`) and logs `${token.name}: Flip & Burn STA Check (d%)` (`Pass if roll <= STA, or pass out for 1d10×10s`).
      - **💫 Roll Blackout (1d10×10s):** Rolls 1d10 (3D damage die), multiplies the result by `10`, displays the banner, and logs `${token.name}: Flip & Burn Blackout (${seconds}s)` with breakdown `[Die: ${dieVal} × 10 = ${seconds} seconds unconscious]`.

### 3.3 Ship Sheets View (`client/src/views/ShipSheetsView.vue`)
- Inside the **Flight & Tactical Stats** section (below the `ADF` / `MR` / `DCR` grid), add a compact **🔄 Flip & Burn Maneuver** status banner:
  - When `selectedShip.mr > 3`: displays a highlighted cyan/emerald badge `🔄 Flip & Burn Capable (MR ${selectedShip.mr} > 3)` with rule text: *"Can execute a 180° Flip & Burn in combat. Strapped-in PCs on board must pass a STA check or pass out for 1d10 × 10 seconds."*
  - When `selectedShip.mr <= 3`: displays a muted badge `🚫 Flip & Burn Unavailable (Requires MR > 3 • Current MR: ${selectedShip.mr ?? 0})`.

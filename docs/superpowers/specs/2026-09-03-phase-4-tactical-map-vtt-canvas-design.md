# Star Frontiers VTT — Phase 4: Tactical Map & Token VTT Canvas Design Spec

## Goal
Build Phase 4 of Star Frontiers VTT: an interactive, real-time HTML5 Canvas tactical tabletop with square grid rendering, token management, distance measurement ruler, fog of war, map background presets, and live WebSocket synchronization across GM and Players.

## Architecture & Data Model

### 1. Database Schema (`server/src/db.js`)

Add `maps` and `tokens` tables:

```sql
CREATE TABLE IF NOT EXISTS maps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  background_url TEXT DEFAULT '',
  preset_bg TEXT DEFAULT 'ship_deck' CHECK(preset_bg IN ('ship_deck', 'volturnus_desert', 'starfield', 'grassland', 'grid_only')),
  width INTEGER NOT NULL DEFAULT 2000,
  height INTEGER NOT NULL DEFAULT 1500,
  grid_size INTEGER NOT NULL DEFAULT 50,
  grid_color TEXT DEFAULT '#334155',
  is_active INTEGER NOT NULL DEFAULT 0,
  fog_data TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  map_id INTEGER NOT NULL,
  character_id INTEGER DEFAULT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  avatar_url TEXT DEFAULT '',
  x INTEGER NOT NULL DEFAULT 0,
  y INTEGER NOT NULL DEFAULT 0,
  size INTEGER NOT NULL DEFAULT 1,
  current_hp INTEGER NOT NULL DEFAULT 50,
  max_hp INTEGER NOT NULL DEFAULT 50,
  status_effects TEXT DEFAULT '[]',
  layer TEXT DEFAULT 'token' CHECK(layer IN ('token', 'gm')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES character_sheets(id) ON DELETE SET NULL
);
```

### 2. REST API & Socket.io Backend (`server/src/maps.js`)
- `GET /api/maps` — List all maps.
- `GET /api/maps/active` — Return active map for current session.
- `POST /api/maps` — Create map (GM only).
- `PUT /api/maps/:id` — Update map settings / fog of war (GM only).
- `POST /api/maps/:id/activate` — Set map as active for all clients (GM only).
- `DELETE /api/maps/:id` — Delete map (GM only).
- `GET /api/maps/:mapId/tokens` — List tokens on a map.
- `POST /api/tokens` — Create new token (associating optionally with a Character Sheet).
- `PUT /api/tokens/:id` — Update token position `(x, y)`, HP, color, status effects.
- `DELETE /api/tokens/:id` — Delete token.

- **Socket Events**:
  - Broadcasts: `map:created`, `map:updated`, `map:activated`, `map:deleted`, `token:created`, `token:moved`, `token:updated`, `token:deleted`, `fog:updated`.

### 3. Frontend WebUI & Canvas Architecture (`RpgVttView.vue` & `client/src/components/VttCanvas.vue`)
- **Canvas Rendering Loop**:
  - HTML5 Canvas element rendered via `requestAnimationFrame`.
  - Zoom (`0.25x` to `3.0x`) and Pan navigation (middle-click drag, spacebar+drag, or Pan tool).
  - Background rendering (preset textured pattern or uploaded image URL).
  - High-precision square grid lines with customizable cell size (default 50px = 2 meters / 5 feet in Alpha Dawn).
- **Tokens & Overlays**:
  - Render tokens as circular badges with character avatars/initials, color borders, and floating HP bars.
  - Interactive Token Dragging: Optimistic local drag with snap-to-grid and `token:moved` socket broadcast.
  - Status Effect Overlays: Visual icons (⚡ Stunned, 💀 Unconscious, 🩸 Wounded).
  - Token Inspector Sidebar / Modal for updating HP, status, or linking to Character Sheets.
- **VTT Tools Toolbar**:
  - **Select / Move Token Tool**
  - **Pan Viewport Tool**
  - **Distance Measurement Ruler**: Draws line from start point to cursor showing distance in cells and meters/feet according to Alpha Dawn movement rules.
  - **Fog of War Brush (GM Only)**: Obscure or reveal map regions.
  - **Map Manager Drawer (GM Only)**: Create maps, switch active map, change background preset.

## Verification Plan
- Unit tests in `server/test/maps.test.js` verifying CRUD for maps and tokens, authentication checks, GM permissions, and Socket.io broadcasts.
- Verify client build succeeds cleanly.
- Verify real-time socket events sync token moves and fog updates across browser sessions.

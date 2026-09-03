# Phase 4 — Tactical Map & Token VTT Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 4 of Star Frontiers VTT: an interactive, real-time HTML5 Canvas tactical tabletop with square grid rendering, token management, distance measurement ruler, fog of war, map background presets, and live WebSocket synchronization across GM and Players.

**Architecture:** Add `maps` and `tokens` tables to SQLite (`server/src/db.js`), implement CRUD routers & Socket.io broadcasts in `server/src/maps.js`. Build reusable `client/src/components/VttCanvas.vue` HTML5 Canvas component and full `RpgVttView.vue` with toolbar, map drawer, token inspector, measurement ruler, and fog of war.

**Tech Stack:** Express, SQLite (better-sqlite3), Socket.io, Vue 3, HTML5 2D Canvas API

---

### Task 1: Database Migration, REST APIs & Socket.io Backend for Maps & Tokens

**Files:**
- Modify: `server/src/db.js`
- Create: `server/src/maps.js`
- Create: `server/test/maps.test.js`
- Modify: `server/src/index.js`

**Interfaces:**
- Produces: `CREATE TABLE maps`, `CREATE TABLE tokens`, `createMapRouter(db, io)`, `createTokenRouter(db, io)` mounted at `/api/maps` and `/api/tokens`, Socket.io broadcasts for map/token events, full vitest test suite in `server/test/maps.test.js`.

- [ ] **Step 1: Update server/src/db.js with maps and tokens tables**

Add `maps` and `tokens` tables to `migrate(db)` in `server/src/db.js`:
- `maps`: `id`, `user_id`, `name`, `background_url`, `preset_bg`, `width`, `height`, `grid_size`, `grid_color`, `is_active`, `fog_data`, `created_at`, `updated_at`.
- `tokens`: `id`, `map_id`, `character_id`, `name`, `color`, `avatar_url`, `x`, `y`, `size`, `current_hp`, `max_hp`, `status_effects`, `layer`, `created_at`, `updated_at`.

- [ ] **Step 2: Create failing unit tests in server/test/maps.test.js**

Write tests checking:
1. `GET /api/maps` returns 401 when unauthenticated, 200 list when authenticated.
2. `POST /api/maps` creates map (GM only).
3. `POST /api/maps/:id/activate` activates map.
4. `POST /api/tokens` and `PUT /api/tokens/:id` create and move token, emitting Socket.io events (`token:created`, `token:moved`, `token:updated`).
5. `DELETE /api/tokens/:id` deletes token.

- [ ] **Step 3: Implement server/src/maps.js**

Export `createMapRouter(db, io)` and `createTokenRouter(db, io)` with authentication & GM authorization checks, formatting JSON fields (`fog_data`, `status_effects`), and Socket.io broadcasts.

- [ ] **Step 4: Mount routers in server/src/index.js**

Mount `/api/maps` and `/api/tokens` in `server/src/index.js`.

- [ ] **Step 5: Verify server tests pass**

```bash
docker exec sf-vtt-dev bash -c "cd server && npx vitest run"
```

- [ ] **Step 6: Commit Task 1**

```bash
git add server/
git commit -m "feat(server): add database schema, REST APIs, and Socket.io events for maps and tokens"
```

---

### Task 2: HTML5 Canvas VTT Component & Tactical Map WebUI

**Files:**
- Create: `client/src/components/VttCanvas.vue`
- Modify: `client/src/views/RpgVttView.vue`

**Interfaces:**
- Produces: `VttCanvas.vue` HTML5 Canvas component supporting panning, zooming, grid rendering, preset backgrounds, token drag-and-drop, measurement ruler, and fog of war brush. `RpgVttView.vue` with VTT toolbar, GM map manager drawer, token inspector, and live Socket.io sync.

- [ ] **Step 1: Create client/src/components/VttCanvas.vue**

Implement HTML5 2D Canvas component:
- Render loop via `requestAnimationFrame`.
- Pan & Zoom transform calculations (`ctx.scale`, `ctx.translate`).
- Grid rendering (Square grid overlay with custom cell size and color).
- Background rendering (preset textures: `ship_deck`, `volturnus_desert`, `starfield`, `grassland`, `grid_only` or image URL).
- Token rendering: Circular badges with avatars/initials, color ring, floating HP bar, and status icons.
- Token Dragging: Snap-to-grid movement with `@token-moved` emit.
- Measurement Ruler Tool: Line from start cell to current mouse position displaying distance in cells and meters/feet (5ft / 2m per cell).
- Fog of War rendering & brush tool: Obscured black layer with revealed rects.

- [ ] **Step 2: Implement client/src/views/RpgVttView.vue**

Build full RPG VTT view:
- VTT Header: Active Map title, Grid size display, Zoom controls (`+`, `-`, Reset).
- Toolbar: Select/Move Tool, Pan Tool, Distance Measurement Ruler, Fog of War Brush (GM only).
- VTT Canvas Container embedding `VttCanvas.vue`.
- GM Controls Panel / Drawer: Create Map modal, Active Map selector, Grid settings, Preset background selector.
- Token Inspector Sidebar / Modal: Add Token, Link to Character Sheet, HP adjuster, Status toggles (⚡ Stunned, 💀 Unconscious, 🩸 Wounded).
- Socket.io listeners: `map:activated`, `map:updated`, `token:created`, `token:moved`, `token:updated`, `token:deleted`, `fog:updated`.

- [ ] **Step 3: Verification**

Verify client build and full server test suite:
```bash
docker exec sf-vtt-dev bash -c "cd client && npm run build"
docker exec sf-vtt-dev bash -c "cd server && npx vitest run"
```

- [ ] **Step 4: Commit Task 2**

```bash
git add client/
git commit -m "feat(client): implement HTML5 Canvas VTT component, token drag & drop, measurement ruler, and GM map controls"
```

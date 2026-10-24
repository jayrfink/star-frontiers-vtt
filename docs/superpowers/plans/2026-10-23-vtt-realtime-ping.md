# VTT Real-Time Player & GM Ping System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a real-time tactical Ping system on both RPG VTT and Space VTT allowing players and GMs to click and wiggle a beacon with an aqua center, teal edge glow, and username badge across the canvas, persist it on the map, and clear it.

**Architecture:**
- Backend: Ephemeral in-memory Socket.io state per map (`server/src/pings.js`) managing live pings, broadcasting throttled position updates (`ping:updated`), handling clear requests (`ping:cleared`), syncing late joiners (`pings:sync`), and pruning on disconnect with strict authentication and role authorization.
- Client: Shared canvas rendering and hit-testing utility (`client/src/utils/pingRenderer.js`) rendering glowing aqua/teal pulsing radar beacons and interactive username badges with `✕` dismiss triggers.
- VTT Canvases & Views: Toolbar `[ 📍 Ping ]` tool on `RpgVttView.vue` and `SpaceVttView.vue` with click-and-drag wiggling, `[ ✕ Clear Ping ]` for players, and `[ 🧹 Clear All Pings ]` for the GameMaster.

**Tech Stack:** Node.js, Express, Socket.io, Vue 3, HTML5 Canvas 2D, Vitest.

## Global Constraints
- Center color: Aqua (`#00ffff` / `#22d3ee`).
- Outer edge glow: Teal (`#0d9488` / `#14b8a6` / `#00e5ff`).
- Username badge: Offset sci-fi pill badge with player username and `✕` dismiss button.
- Authentication: Session-authenticated sockets required; players may only move/clear their own ping; GMs can clear any or all pings.
- No database persistence: Pings are ephemeral in-memory to prevent disk I/O bottlenecks during mouse wiggling.

---

### Task 1: Backend Ephemeral Ping Store & Socket.io Handlers

**Files:**
- Create: `server/src/pings.js`
- Modify: `server/src/index.js`
- Test: `server/test/pings.test.js`

**Interfaces:**
- Consumes: `io` (Socket.io server), `db` (SQLite database for `isGameMaster`), `socket.request.session`.
- Produces:
  - `registerPingHandlers(io, db)` registering `ping:update`, `ping:clear`, `ping:request_sync`, and `disconnect` listeners.
  - Events emitted: `ping:updated` (`{ mapId, ping }`), `ping:cleared` (`{ mapId, userId, all }`), `pings:sync` (`{ mapId, pings }`).

- [ ] **Step 1.1: Write failing tests in `server/test/pings.test.js`**
  - Connect socket client with mock session.
  - Test `ping:update` emits `ping:updated` with sanitized coordinates and username.
  - Test player cannot clear another player's ping.
  - Test GM can clear any player's ping or emit all: true.
  - Test `ping:request_sync` returns all active pings on map.
  - Test disconnecting socket clears their active ping.

- [ ] **Step 1.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd server && npx vitest run test/pings.test.js"
  ```

- [ ] **Step 1.3: Implement `server/src/pings.js` and mount in `server/src/index.js`**
  - Implement `activePings` map-keyed storage.
  - Implement coordinate bounds checking (`Number.isFinite(x) && Number.isFinite(y)`).
  - Implement session check & GM role check (`isGameMaster(db, userId)`).
  - Register handlers in `server/src/index.js`.

- [ ] **Step 1.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd server && npx vitest run test/pings.test.js"
  ```

- [ ] **Step 1.5: Commit Task 1**
  ```bash
  git add server/src/pings.js server/src/index.js server/test/pings.test.js
  git commit -m "feat(pings): add backend in-memory ping store and socket handlers"
  ```

---

### Task 2: Client Ping Renderer & Hit-Testing Utility

**Files:**
- Create: `client/src/utils/pingRenderer.js`
- Test: `client/test/pingRenderer.test.js`

**Interfaces:**
- Produces:
  - `drawPing(ctx, ping, timestamp)`: Draws the aqua radial center, teal glowing ripple rings, and username badge with `✕`.
  - `drawAllPings(ctx, pings, timestamp)`: Iterates array/map of pings and invokes `drawPing`.
  - `getPingBadgeBounds(ping)`: Returns `{ x, y, width, height, closeX, closeY, closeRadius }` in canvas space.
  - `isPingDismissHit(ping, canvasX, canvasY)`: Returns `true` if click falls within the `✕` close button region.

- [ ] **Step 2.1: Write failing tests in `client/test/pingRenderer.test.js`**
  - Test `getPingBadgeBounds` calculates accurate bounding coordinates relative to `ping.x` and `ping.y`.
  - Test `isPingDismissHit` returns true when clicking within the `✕` radius and false elsewhere.
  - Test `drawPing` renders with correct aqua and teal color constants and radial gradient without error.

- [ ] **Step 2.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/pingRenderer.test.js"
  ```

- [ ] **Step 2.3: Implement `client/src/utils/pingRenderer.js`**
  - Implement canvas 2D rendering methods with radial gradient `#00ffff` to `#14b8a6`.
  - Implement animated radar wave rings using `Math.sin(timestamp / 200)`.
  - Implement badge text rendering and `✕` close circle.

- [ ] **Step 2.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/pingRenderer.test.js"
  ```

- [ ] **Step 2.5: Commit Task 2**
  ```bash
  git add client/src/utils/pingRenderer.js client/test/pingRenderer.test.js
  git commit -m "feat(pings): add client ping canvas rendering and hit-testing utility"
  ```

---

### Task 3: VTT Canvas Integration (`VttCanvas.vue` & `SpaceVttCanvas.vue`)

**Files:**
- Modify: `client/src/components/VttCanvas.vue`
- Modify: `client/src/components/SpaceVttCanvas.vue`
- Test: `client/test/VttCanvasPing.test.js`

**Interfaces:**
- Consumes: `pings` prop (Array of ping objects), `activeTool` prop (`'ping'`), `drawAllPings` & `isPingDismissHit` from `client/src/utils/pingRenderer.js`.
- Produces:
  - Canvas mouse events emit `ping-update` (`{ x, y, isDragging }`) and `ping-dismiss` (`{ userId }`).
  - Canvas animation loop refreshes when `pings.length > 0` to render pulsing radar waves.

- [ ] **Step 3.1: Write failing tests in `client/test/VttCanvasPing.test.js`**
  - Test canvas mousedown with `activeTool === 'ping'` triggers ping update emit.
  - Test canvas mousemove while dragging triggers throttled ping update emit.
  - Test canvas mousedown on a ping's `✕` badge triggers ping dismiss emit.

- [ ] **Step 3.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/VttCanvasPing.test.js"
  ```

- [ ] **Step 3.3: Implement ping interactions in `VttCanvas.vue` and `SpaceVttCanvas.vue`**
  - Add `pings` prop to both canvas components.
  - Add `'ping'` tool handling to `onMouseDown`, `onMouseMove`, `onMouseUp`.
  - Add 30ms throttle for drag/wiggle emits.
  - Render pings in `drawCanvas()` after tokens and before measurement ruler.
  - Start animation loop when pings are active.

- [ ] **Step 3.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/VttCanvasPing.test.js"
  ```

- [ ] **Step 3.5: Commit Task 3**
  ```bash
  git add client/src/components/VttCanvas.vue client/src/components/SpaceVttCanvas.vue client/test/VttCanvasPing.test.js
  git commit -m "feat(pings): integrate ping interactions and rendering into VTT canvases"
  ```

---

### Task 4: Floating Toolbar Controls & Socket Synchronization (`RpgVttView.vue` & `SpaceVttView.vue`)

**Files:**
- Modify: `client/src/views/RpgVttView.vue`
- Modify: `client/src/views/SpaceVttView.vue`
- Test: `client/test/VttPingView.test.js`

**Interfaces:**
- Consumes: Socket events `ping:updated`, `ping:cleared`, `pings:sync`.
- Produces:
  - Toolbar `[ 📍 Ping ]` button.
  - Dynamic `[ ✕ Clear Ping ]` button for player.
  - GM `[ 🧹 Clear All Pings ]` button.
  - Socket handlers keeping `activePings` reactive array synchronized.

- [ ] **Step 4.1: Write failing tests in `client/test/VttPingView.test.js`**
  - Test `activeTool = 'ping'` selection.
  - Test `hasMyActivePing` computed property.
  - Test socket listeners update `activePings` on `ping:updated`, remove on `ping:cleared`, and replace on `pings:sync`.
  - Test clear methods emit `ping:clear` to socket.

- [ ] **Step 4.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/VttPingView.test.js"
  ```

- [ ] **Step 4.3: Implement toolbar buttons and socket listeners in `RpgVttView.vue` and `SpaceVttView.vue`**
  - Add `[ 📍 Ping ]`, `[ ✕ Clear Ping ]`, and `[ 🧹 Clear All Pings ]` buttons to `.vtt-toolbar`.
  - Connect socket listeners on mount and clean up on unmount.
  - Wire canvas `@ping-update` and `@ping-dismiss` handlers to emit socket events.

- [ ] **Step 4.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/VttPingView.test.js"
  ```

- [ ] **Step 4.5: Commit Task 4**
  ```bash
  git add client/src/views/RpgVttView.vue client/src/views/SpaceVttView.vue client/test/VttPingView.test.js
  git commit -m "feat(pings): add toolbar controls and socket synchronization in RPG and Space VTTs"
  ```

---

### Task 5: Full Suite Verification & Build

- [ ] **Step 5.1: Run all server tests**
  ```bash
  docker exec sf-vtt-dev sh -c "cd server && npm test"
  ```

- [ ] **Step 5.2: Run all client tests**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run"
  ```

- [ ] **Step 5.3: Run client production build**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npm run build"
  ```

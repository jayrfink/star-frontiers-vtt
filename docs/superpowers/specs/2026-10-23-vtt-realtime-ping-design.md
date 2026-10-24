# VTT Real-Time Player & GM Ping System Design

## 1. Overview
This specification defines the real-time tactical Ping system for the Star Frontiers Virtual Tabletop (both RPG VTT and Space VTT). Players and GameMasters can activate a dedicated Ping tool, click and drag ("wiggle") a visual beacon across the map in real time to indicate movement intentions, targets, or areas of interest, leave the marker on the map for continued reference, and clear it when finished.

---

## 2. Visual Styling & Canvas Presentation

### 2.1 Ping Beacon Appearance
- **Core Center:** Vibrant aqua disc (`#00ffff` / `#22d3ee`) with a glowing radial gradient and high opacity.
- **Edge Glow & Radar Ripples:** Outer edge shaded with a soft teal bloom (`#0d9488` / `#14b8a6` / `#00e5ff`) and concentric radar ripple rings that softly pulse using an elapsed-time oscillation (`Math.sin(timestamp)`).
- **Dimensions:** Radius ~28px to ensure strong visibility across both zoomed-out tactical maps and interior ship corridors without obscuring underlying terrain.

### 2.2 Username Badge & Dismiss Button
- Floats offset to the top-right of the ping beacon.
- **Styling:** Sci-fi rounded tag with dark semi-transparent background (`rgba(13, 17, 23, 0.9)`), teal border (`1px solid #14b8a6`), subtle drop shadow, and crisp white monospace typography.
- **Content:** Username of the ping owner (e.g. `Wilks` or `GM`).
- **Dismiss Button:** An inline `✕` button on the badge allowing the ping owner or GM to dismiss that ping directly with a single click.

### 2.3 Layering & Rendering
- Rendered on the VTT canvas on top of tokens and grid lines, ensuring it is never obscured by tokens or walls, but beneath UI HUD elements (Initiative tracker, dice box, and modal dialogs).

---

## 3. User Interaction & Controls

### 3.1 Toolbar Integration
- Added to floating navigation toolbars on both `RpgVttView.vue` and `SpaceVttView.vue`:
  - `[ 📍 Ping ]` tool button positioned alongside `Move`, `Pan`, and `Ruler`.
  - When selected (`activeTool === 'ping'`), the cursor switches to `crosshair`.
  - Dynamic sub-action button `[ ✕ Clear Ping ]` is displayed whenever the current user has an active ping placed on the map.
  - When logged in as **GameMaster**, an additional `[ 🧹 Clear All Pings ]` button is visible to clear the entire map at once.

### 3.2 Mouse Interactions
- **Click & Drag ("Wiggle to Look / Move"):**
  - Mousedown immediately registers/moves the user's ping to the target canvas coordinate.
  - While dragging, client sends throttled position updates (~30ms) via Socket.io. Connected players and the GM see the beacon smoothly follow the cursor with a responsive trailing glow.
  - Mouseup locks the ping at that location.
- **Single Click:**
  - Instantly positions or moves the ping to the clicked coordinate without requiring a drag.
- **Clearing:**
  - **By Player:** Click `✕` on their own badge or click `[ ✕ Clear Ping ]` on the toolbar.
  - **By GM:** Click `✕` on any badge or click `[ 🧹 Clear All Pings ]` on the toolbar.

---

## 4. Real-Time Synchronization & Server Architecture

### 4.1 In-Memory Map State
- The backend stores active pings purely in-memory:
  ```javascript
  // activePings: Map<mapId, Map<userId, PingObject>>
  {
    userId: 4,
    username: 'Wilks',
    x: 450,
    y: 320,
    isDragging: true,
    updatedAt: 1729728400000
  }
  ```
- Avoids database I/O overhead during rapid cursor movement while preventing persistent clutter.

### 4.2 Socket.io Event Protocol
- `ping:update` (`client -> server`): Client sends `{ mapId, x, y, isDragging }`. Server updates in-memory map state and broadcasts `ping:updated` to the room.
- `ping:clear` (`client -> server`): Client sends `{ mapId, targetUserId }` (or `{ mapId, all: true }` for GM). Server prunes the ping(s) and broadcasts `ping:cleared`.
- `pings:sync` (`server -> client`): Emitted to clients joining the map room or switching maps, delivering the list of all currently active pings for that map.
- `disconnect` cleanup: When a client disconnects, any active pings belonging to their session are pruned and a `ping:cleared` broadcast is emitted.

### 4.3 Security & Authorization
- **Session Authentication:** Requires valid user session on all ping socket events.
- **Ownership Verification:** Players may only create, update, or clear their own `userId` ping. Any attempt to modify another user's ping is rejected.
- **GameMaster Privileges:** GameMasters may clear any individual player's ping or broadcast a global wipe for the map.
- **Coordinate Sanity Checks:** Rejects non-finite numbers, `NaN`, or coordinates outside reasonable map bounds.

---

## 5. Testing & Verification

1. **Server Unit & Integration Tests (`server/test/pings.test.js`):**
   - Socket event handling for `ping:update`, `ping:clear`, and `pings:sync`.
   - Player ownership enforcement (players cannot clear or impersonate other users).
   - GM permission to clear individual or all pings.
   - Coordinate validation and sanitization.
   - Disconnect cleanup removing ephemeral pings.

2. **Client Unit Tests (`client/test/pings.test.js`, `client/test/RpgVttView.test.js`, `client/test/SpaceVttView.test.js`):**
   - Toolbar button presence and mode switching (`activeTool = 'ping'`).
   - Ping rendering calculation (aqua center, teal outer glow, username badge offset).
   - Throttle logic during drag/wiggle interaction.
   - Dismiss handlers for player and GM.

3. **Full Suite Verification:**
   - Run complete server test suite (`npm test`).
   - Run complete client test suite (`npx vitest run`).
   - Run client production build (`npm run build`).

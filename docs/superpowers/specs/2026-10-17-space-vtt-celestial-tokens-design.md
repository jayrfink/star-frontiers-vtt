# Space VTT Celestial Tokens (Asteroids, Moons, Planets) Design Specification

## Overview
This specification details the architecture, UI controls, canvas rendering rules, and automated testing strategy for adding special non-ship celestial tokens (such as Asteroids, Moons, Centurian Moons, and Planets) to the Star Frontiers Space VTT tactical map.

Celestial tokens have distinct tabletop characteristics:
- Occupy strictly 1 hex (`size: 1`).
- Feature **no colored ring border**.
- Feature **no speed indicator badge**.
- Feature **no rotation / heading direction** (locked upright at 0°).
- Feature **no combat stats, conditions, or tactical status effect icons**.
- Avatar images are stored and managed using the existing asset repository (`/uploads/tokens`) and accessible via `ImageBrowserModal`, file upload, or URL input.

---

## 1. Data Model & Storage

### Token Classification
Tokens in the Star Frontiers VTT SQLite database utilize the existing `layer` column in the `tokens` table:
- Standard spaceships & space stations: `layer = 'character'` (or unset default).
- Celestial objects: `layer = 'celestial'`.

### Attributes for Celestial Tokens
When created or updated, celestial tokens enforce:
- `layer`: `'celestial'`
- `size`: `1` (strictly 1 hex)
- `color`: `''` or `'transparent'` (no ring drawn)
- `current_speed`: `null` (or 0, suppressed on canvas and sidebar)
- `rotation`: `0` (suppressed on canvas and sidebar)
- `status_effects`: `[]` (suppressed on canvas and sidebar)
- `character_id`: `null` (no linked ship sheet)
- `name`: string (e.g., "Asteroid A-1", "Centurian Moon", "Planet Volturnus")
- `avatar_url`: string (URL to celestial sprite / image)

Because SQLite's `tokens` table already contains `layer TEXT NOT NULL DEFAULT 'character'`, and `POST /api/tokens` / `PUT /api/tokens/:id` already persist and broadcast `layer`, no backend database schema migration is required.

---

## 2. Canvas Rendering (`client/src/components/SpaceVttCanvas.vue`)

In `renderSingleToken(ctx, token, q, r, isSelected)`:

1. **Identification**:
   ```javascript
   const isCelestial = token.layer === 'celestial';
   ```

2. **Selection Glow**:
   - If `isSelected` is true, render the selection halo ring (`rgba(88, 166, 255, 0.4)` fill and `#58a6ff` stroke) so the GM or player can clearly see which celestial body is currently selected for moving or inspecting.

3. **Rotation**:
   - If `isCelestial` is true, lock rotation to `0` (`ctx.rotate(0)`), ignoring any accidental rotation values.

4. **Image & Fallback Rendering**:
   - If `token.avatar_url`:
     - Clip to circular radius (`ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.clip();`).
     - Draw cached image scaled to hex size (`-size, -size, size * 2, size * 2`).
   - If no image:
     - Render neutral celestial initials or icon (`🪐` or token initials) without colored ring.

5. **Suppression of Ship Overlays**:
   - **Colored Ring Border**:
     ```javascript
     if (!isCelestial) {
       ctx.beginPath();
       ctx.arc(0, 0, size, 0, Math.PI * 2);
       ctx.strokeStyle = token.color || '#666666';
       ctx.lineWidth = 3.5;
       ctx.stroke();
     }
     ```
   - **Speed Badge**:
     ```javascript
     if (!isCelestial && speed !== null && speed !== undefined) {
       // Render green circle and numeric speed
     }
     ```
   - **Status Effects**:
     ```javascript
     if (!isCelestial && statusEffects.length > 0) {
       // Render status icons (💥 Damaged, 🛰️ Adrift, etc.)
     }
     ```

---

## 3. UI Workflow (`client/src/views/SpaceVttView.vue`)

### Add Token Modal
- Add a **Token Type** selector at the top of the modal:
  - `🚀 Ship / Station` (Standard token)
  - `🪐 Celestial Object (Asteroid, Moon, Planet)`
- When `Celestial Object` is selected:
  - **Show**:
    - **Token Name**: Text input with quick-fill chip buttons: `Asteroid`, `Moon`, `Centurian Moon`, `Planet`.
    - **Start Hex Coordinates**: Q (X) and R (Y).
    - **Token Image / Avatar**: Standard avatar section with "Browse Uploads" (`ImageBrowserModal`), file upload, and URL input.
  - **Hide**:
    - Link to Ship Sheet selector.
    - Ring Color picker.
    - Initial Speed input.
    - Initial Rotation selector.
- On Submit:
  - Sets `layer: 'celestial'`, `size: 1`, `rotation: 0`, `current_speed: null`, `character_id: null`.
  - Dispatches `POST /api/tokens`.

### Sidebar Token Inspector
- When a celestial token is selected (`selectedToken.layer === 'celestial'`):
  - **Show**:
    - Header: Token Name & Avatar preview.
    - Token Type Badge: `🪐 Celestial Object`.
    - Hex Position `(Q, R)`.
    - "Delete Token" action button.
  - **Hide**:
    - Linked Ship / Character ID.
    - Current Speed control & +/- adjustment buttons.
    - Heading / Rotation control & Q/E rotation buttons.
    - Tactical Status Effects toggles (Damaged, Adrift, Disabled, Burning).
    - Ring Color picker.

---

## 4. Automated Testing Strategy

### Client Unit Tests
1. **`client/test/SpaceVttCanvas.test.js`**:
   - Verifies `renderSingleToken` with `layer: 'celestial'` skips ring stroke (`ctx.stroke` for border).
   - Verifies `renderSingleToken` with `layer: 'celestial'` skips speed badge text and circle fill.
   - Verifies `renderSingleToken` with `layer: 'celestial'` skips tactical status effects.
   - Verifies standard ship tokens (`layer: 'character'` or undefined) still render ring, speed badge, and status effects.

2. **`client/test/SpaceVttView.test.js`**:
   - Verifies switching to "Celestial Object" in Add Token modal hides ship-specific fields (ring color, speed, rotation, linked ship).
   - Verifies clicking quick-fill chips sets the token name.
   - Verifies submitting Add Token with "Celestial Object" dispatches `layer: 'celestial'`.
   - Verifies selected token inspector displays simplified view for celestial tokens and hides speed/rotation/status controls.

---

## 5. Verification Commands
- Client tests: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttCanvas.test.js test/SpaceVttView.test.js"`
- Full client test suite & build: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
- Full server test suite: `docker exec sf-vtt-dev bash -c "cd server && npm test"`

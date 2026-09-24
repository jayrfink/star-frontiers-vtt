# Design Spec: Remove Fog Capability from RPG VTT

**Date:** 2026-09-24  
**Status:** Approved  
**Author:** Pair Programming Assistant  

---

## 1. Background & Goals

Star Frontiers does not require Fog of War or dynamic lighting mechanics. The current RPG VTT implementation includes GM fog brush tools ("Reveal Fog" and "Hide Fog"), a canvas layer rendering darkness rects over unrevealed cells, Map Manager fog controls, and socket synchronization for fog data.

To simplify the VTT interface and eliminate unneeded complexity:
- Completely remove Fog of War capabilities from the RPG VTT (`RpgVttView.vue`) and its canvas renderer (`VttCanvas.vue`).
- Delete the "Reveal Fog" and "Hide Fog" toolbar buttons.
- Delete the "Fog Controls" and "Enable Fog of War" options in the GM Map Manager.
- Remove all fog canvas rendering, brush handlers, and socket event synchronization.
- Maintain server database schema and REST endpoints as backward-compatible with default values.

---

## 2. Requirements & UI Changes

### 2.1 RPG VTT Toolbar (`RpgVttView.vue`)
- Remove the GM toolbar buttons:
  - `👁️ Reveal Fog` (`activeTool === 'fog_reveal'`)
  - `🙈 Hide Fog` (`activeTool === 'fog_hide'`)
- Retain all other toolbar controls:
  - `👆 Move` (`select`)
  - `✋ Pan` (`pan`)
  - `📏 Ruler` (`measure`)
  - `🎲 Roll d%`
  - `💥 DMG Die`

### 2.2 RPG VTT Map Manager Drawer (`RpgVttView.vue`)
- Remove the "Fog Controls" section:
  - `Clear Fog (Reveal All)` button
  - `Reset Fog (Hide All)` button
  - Associated CSS (`.fog-actions`, `.fog-actions button`)
- Remove the "Enable Fog of War" checkbox from:
  - Active Map Settings form
  - Create New Map form
- Remove script logic:
  - `clearFog()` and `resetFog()` methods
  - `saveFog()` debounce timer and fetch call
  - `onFogChanged()` handler
  - `socket.on('fog:updated', ...)` and `socket.off('fog:updated')`
  - `fog_enabled` property from `newMapForm` and `activeMapForm`

### 2.3 Canvas Renderer (`VttCanvas.vue`)
- Remove `drawFogOfWar()` method and its call in `render()`.
- Remove fog brush interaction logic:
  - `isDrawingFog` state ref
  - `applyFogBrush()` method
  - `fog_reveal` / `fog_hide` checks in `handleMouseDown`, `handleMouseMove`, `handleMouseUp`
- Remove `fog-changed` from `defineEmits`.
- Remove `fog_reveal` and `fog_hide` tool options from documentation/comments.

### 2.4 Server & Database Compatibility
- Server routes (`server/src/maps.js`) and database table (`server/src/db.js`) retain `fog_enabled` and `fog_data` columns/fields. They will simply default to `0` and `'[]'`, ensuring existing maps remain compatible and server unit tests (`server/test/maps.test.js`) continue to pass.

---

## 3. Verification & Testing

1. **Client Tests:** `docker exec sf-vtt-dev bash -c "cd client && npx vitest run"`
2. **Server Tests:** `docker exec sf-vtt-dev bash -c "cd server && npm test"`
3. **Production Build:** `docker exec sf-vtt-dev bash -c "cd client && npm run build"`
4. **Functional UI Inspection:**
   - Verify RPG VTT toolbar displays Move, Pan, Ruler, Roll d%, and DMG Die without Reveal/Hide Fog buttons.
   - Verify GM Map Manager contains map sizing, background presets, and grid controls without Fog actions.
   - Verify map canvas renders background image, grid, ruler, and tokens cleanly without fog overlay.

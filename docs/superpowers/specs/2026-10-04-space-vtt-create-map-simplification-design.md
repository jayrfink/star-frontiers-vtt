# Design Spec: Space VTT Create Tactical Map Modal Simplification

## 1. Overview
In the Star Frontiers Virtual Tabletop, space maps represent open tactical fleet engagements where Fog of War is conceptually not applicable ("you can't have a fog of war in space"). Additionally, when creating a new tactical space map, game masters should have the map added to their list in the Map Manager drawer without automatically activating and switching the active tactical view away from whatever is currently on-screen.

This specification details removing the "Enable Fog of War" and "Set as Active Map immediately" checkboxes from the "Create New Tactical Space Map" modal in the Space VTT client, while preserving system stability and decoupling from RPG VTT.

---

## 2. Scope & Requirements

### 2.1 User Interface Requirements
1. **Remove Fog of War Checkbox**:
   - In `client/src/views/SpaceVttView.vue`, within the "Create New Tactical Space Map" modal (`showCreateMapModal`), delete the `checkbox-group` containing `<input type="checkbox" v-model="newMapForm.fog_enabled" />` and the label `Enable Fog of War`.
2. **Remove Immediate Activation Checkbox**:
   - In `client/src/views/SpaceVttView.vue`, within the "Create New Tactical Space Map" modal, delete the `checkbox-group` containing `<input type="checkbox" v-model="newMapForm.is_active" />` and the label `Set as Active Map immediately`.
3. **Modal Form Layout**:
   - Retain all other existing controls: Map Name, Hex Dimensions (width/height), Hex Grid Size, Grid Line Color, Background Preset, and Custom Image URL/Upload/Browse buttons, followed by Cancel and Create Map action buttons.

### 2.2 Component State & Logic Requirements
1. **Form State**:
   - `newMapForm` removes `is_active`.
   - `newMapForm` maintains `fog_enabled: false` as a constant default sent to the server.
2. **Modal Open Helper**:
   - In `openCreateMapModal()`, remove assignment `newMapForm.is_active = true`.
   - Keep `newMapForm.fog_enabled = false`.
3. **Map Creation Submission**:
   - In `submitCreateMap()`, upon successful creation of the map:
     - Close the modal (`showCreateMapModal.value = false`).
     - Refresh the map list (`fetchMapList()`).
     - Do not call `activateMap(created.id)`; newly created maps remain in the list until explicitly activated by the GM via the "Activate" button.

### 2.3 Decoupling & Non-Goals
- **RPG VTT Unaffected**: The RPG VTT (`client/src/views/RpgVttView.vue`) supports ground exploration where Fog of War and immediate activation remain valid options. Do NOT modify `RpgVttView.vue`.
- **Backend Schema Unaffected**: The backend `maps` table and `/api/maps` endpoints remain unchanged. Space maps simply send `fog_enabled: false`.

---

## 3. Testing & Verification

1. **Unit Tests**:
   - Update `client/test/SpaceVttMapBrowser.test.js` to assert that the Create New Tactical Space Map modal slice does not contain "Enable Fog of War" or "Set as Active Map immediately".
   - Assert that `openCreateMapModal` does not initialize `newMapForm.is_active`.
2. **Regression Testing**:
   - Run client test suite (`npx vitest run`).
   - Run client production build (`npm run build`).
   - Run backend server test suite (`npm test`).

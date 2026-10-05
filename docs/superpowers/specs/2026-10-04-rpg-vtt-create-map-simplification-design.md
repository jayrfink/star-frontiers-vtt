# Design Spec: RPG VTT Create Tactical Map Modal Simplification

## 1. Overview
In the Star Frontiers Virtual Tabletop, creating a new tactical map in the RPG VTT currently presents a "Set as Active Map immediately" checkbox that defaults to checked. To match the behavior established in Space VTT and avoid unexpected view changes for game masters and players, game masters should have the map added to their list in the Map Manager drawer without automatically switching the active tactical view.

This specification details removing the "Set as Active Map immediately" checkbox and its auto-activation behavior from the RPG VTT client.

---

## 2. Scope & Requirements

### 2.1 User Interface Requirements
1. **Remove Immediate Activation Checkbox**:
   - In `client/src/views/RpgVttView.vue`, within the "Create New Tactical Map" modal (`showCreateMapModal`), delete the `checkbox-group` containing `<input type="checkbox" v-model="newMapForm.is_active" />` and the label `Set as Active Map immediately`.
2. **Modal Form Layout**:
   - Retain all other existing controls: Map Name, Dimensions (width/height), Grid Size, Grid Color, Background Preset, and Custom Image URL / Upload / Browse buttons, followed by Cancel and Create Map action buttons.

### 2.2 Component State & Logic Requirements
1. **Form State**:
   - `newMapForm` removes `is_active`.
2. **Modal Open Helper**:
   - In `openCreateMapModal()`, remove assignment `newMapForm.is_active = true`.
3. **Map Creation Submission**:
   - In `submitCreateMap()`, upon successful creation of the map:
     - Close the modal (`showCreateMapModal.value = false`).
     - Refresh the map list (`fetchMapList()`).
     - Do not call `activateMap(created.id)`; newly created maps remain in the list until explicitly activated by the GM via the "Activate" button.

### 2.3 Non-Goals
- **Backend Unchanged**: The backend `maps` table and `/api/maps` endpoints remain unchanged.
- **Space VTT Unaffected**: The Space VTT (`client/src/views/SpaceVttView.vue`) already had this change implemented.

---

## 3. Testing & Verification

1. **Unit Tests**:
   - Update `client/test/RpgVttMapBrowser.test.js` to assert:
     - The Create New Tactical Map modal slice does not contain "Set as Active Map immediately" or `newMapForm.is_active`.
     - `openCreateMapModal` does not initialize `newMapForm.is_active`.
     - `submitCreateMap` does not call `activateMap(created.id)`.
2. **Regression Testing**:
   - Run client test suite (`npx vitest run`).
   - Run client production build (`npm run build`).
   - Run backend server test suite (`npm test`).

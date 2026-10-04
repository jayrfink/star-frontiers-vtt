# Design Specification: Map Background Browser, Token Modal Layout, & Dynamic Tab Titles

## 1. Overview
This specification addresses three related UI and workflow improvements:
1. Enabling map background image selection from `data/uploads` (and subfolders) using `ImageBrowserModal` within Map Managers on both RPG VTT and Space VTT.
2. Correcting the Add Token modal layout to prevent form elements from overflowing the right border of the modal dialog.
3. Dynamically updating the browser tab / window title to `SFVTT: <Tab Name>` upon navigation.

## 2. Requirements & Constraints
- **Strict Decoupling**: Keep RPG VTT (`RpgVttView.vue`) and Space VTT (`SpaceVttView.vue`) completely independent with no shared VTT state or code entanglement.
- **Unified Image Browser**: Reuse `ImageBrowserModal` for map backgrounds, supporting directory navigation, image previews, search, and in-modal uploads.
- **Layout Safety**: Ensure modal cards and child flex containers never overflow horizontally on desktop or mobile viewports (`box-sizing: border-box`, `min-width: 0`, and `flex-wrap: wrap`).
- **Dynamic Titles**: Update `document.title` on every route change in format `SFVTT: <Tab Name>` matching the top navigation bar labels.

## 3. Detailed Component Designs

### 3.1 Map Background Browser Integration
Both `client/src/views/RpgVttView.vue` and `client/src/views/SpaceVttView.vue` will track the target of `ImageBrowserModal`:
- State: `imageBrowserTarget = ref('token')` ('token', 'active_map', or 'new_map').
- Computed Properties:
  - `imageBrowserTitle`:
    - `'Select Token Image'` when target is `'token'`
    - `'Select Map Background Image'` when target is `'active_map'` or `'new_map'`
  - `currentBrowserImage`:
    - `newTokenForm.avatar_url` for `'token'`
    - `activeMapForm.background_url` for `'active_map'`
    - `newMapForm.background_url` for `'new_map'`
- Actions:
  - `openTokenImageBrowser()`: sets `imageBrowserTarget.value = 'token'` and `showImageBrowser.value = true`.
  - `openMapImageBrowser(target)`: sets `imageBrowserTarget.value = target` and `showImageBrowser.value = true`.
  - `onImageSelected(url)`:
    - If `imageBrowserTarget.value === 'active_map'`: sets `activeMapForm.background_url = url` and calls `updateActiveMapSettings()`.
    - If `imageBrowserTarget.value === 'new_map'`: sets `newMapForm.background_url = url`.
    - If `imageBrowserTarget.value === 'token'`: sets `newTokenForm.avatar_url = url`.
- Template additions in both views:
  - In Map Manager Drawer (Active Map Settings): add a "Browse Uploads" button alongside the background image file input.
  - In Create Map Modal: add a "Browse Uploads" button alongside the custom image URL input.

### 3.2 Add Token Modal Layout & Boundary Fix
In both `RpgVttView.vue` and `SpaceVttView.vue`:
- Modal card styling:
  - `.modal-card { width: 500px; max-width: 95vw; box-sizing: border-box; overflow-x: hidden; }`
- Flex item bounds protection:
  - Add `min-width: 0; box-sizing: border-box;` to `.avatar-controls`, `.avatar-upload-box`, `.file-btn-wrapper`, `.form-group`, and `.form-row`.
  - On `.file-btn-wrapper`: set `flex-wrap: wrap; gap: 8px; align-items: center;`.
  - On `.avatar-url-input`: set `width: 100%; box-sizing: border-box;`.
  - Prevent raw file inputs from expanding beyond flex bounds: `.token-file-input { max-width: 100%; }`.

### 3.3 Dynamic Tab Document Titles
In `client/src/router.js`:
- Add `meta.title` to route definitions:
  - `/login`: `'Login'`
  - `/dashboard/rpg-vtt`: `'RPG VTT'`
  - `/dashboard/space-vtt`: `'Space VTT'`
  - `/dashboard/character-sheets`: `'Character Sheets'`
  - `/dashboard/ship-sheets`: `'Ship Sheets'`
  - `/dashboard/rulebooks`: `'Rulebooks'`
  - `/dashboard/admin`: `'Admin'`
- Hook:
  ```javascript
  router.afterEach((to) => {
    const tabTitle = to.meta?.title;
    document.title = tabTitle ? `SFVTT: ${tabTitle}` : 'Star Frontiers VTT';
  });
  ```

## 4. Testing & Verification
- **Router Tests**: Verify `document.title` updates to `SFVTT: <Tab>` on navigation across all routes.
- **VTT Component Tests**:
  - Verify "Browse Uploads" button triggers `openMapImageBrowser` for both active map and create map forms.
  - Verify selection updates `activeMapForm.background_url` and calls `updateActiveMapSettings()`.
  - Verify selection updates `newMapForm.background_url`.
- **Layout Verification**: Test that `.modal-card` and `.file-btn-wrapper` elements stay within container bounds.

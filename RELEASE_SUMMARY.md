# Star Frontiers VTT - Release v0.2.0 Summary

**Release Tag:** `v0.2.0`  
**Date:** October 4, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.2.0` is a major feature release for the Star Frontiers Virtual Tabletop (VTT). It introduces a comprehensive Image Browser & Uploads Explorer across sheets and map managers, decoupled 20-roll Die Roll Log HUDs for both tabletops, intelligent center-map token placement with collision avoidance, dynamic browser tab titles, simplified tactical map creation with automatic activation, and layout fixes across forms and modals.

---

## 2. Included Features & Capabilities in v0.2.0

### Image Browser & Uploads Explorer
- **Server Uploads API:** Added `GET /api/upload/files` recursively scanning the `data/uploads/` directory with path traversal protection. Supported subfolder uploads via `folder` parameter in `POST /api/upload`.
- **Reusable `ImageBrowserModal` Component:** 
  - Dynamic breadcrumb navigation (`Uploads > subfolder > ...`) and Back button.
  - Live search filtering for images.
  - Interactive folder navigation and image grid cards with selection highlight and double-click selection.
  - Direct file upload into the currently viewed subfolder.
- **Full Application Integration:**
  - **Character Sheets:** Header portrait click and Create Character modal avatar selection.
  - **Ship Sheets:** Header starship image click and Create Ship modal avatar selection.
  - **RPG VTT & Space VTT Tokens:** "Browse Uploads" button alongside file input in Add Token modals.
  - **Map Managers (RPG & Space):** Browse existing uploads or upload new backgrounds for Active Map settings and Create New Map modals.

### Decoupled Die Roll Log HUDs
- **Bottom-Corner Canvas HUD:** Collapsible floating panel docked at `bottom: 16px; left: 16px;` (`z-index: 105`) inside the VTT canvas wrapper.
- **Collapsed Pill State:** Unobtrusive pill button displaying live roll count (`🎲 Log (N) ▲`).
- **Expanded Card State:** Dark sci-fi card displaying capacity counter (`🎲 Roll Log (N/20)`), clear history button, minimize button, and scrollable chronological history (newest first).
- **Roll Details:** Displays formatted timestamps, colored badges (`d%` cyan, `Nd10` orange), total result, and individual dice breakdown.
- **Strict Decoupling & 20-Roll FIFO Cap:**
  - RPG VTT uses dedicated state and `sf_vtt_rpg_roll_log` localStorage key.
  - Space VTT uses dedicated state and `sf_vtt_space_roll_log` localStorage key.
  - Automatically evicts the oldest roll when roll 21 arrives; guarded by defensive `try/catch` error handling.

### Center Token Placement & Collision Avoidance
- **Map Center Placement:** Newly placed tokens on RPG and Space maps are pseudo-randomly assigned an unoccupied cell/hex within the 5x5 zone around the map center instead of stacking at `(0, 0)`.
- **Concentric Ring Expansion:** If the central 5x5 zone is fully saturated, an outward ring-by-ring search finds the nearest available unoccupied coordinate.
- **Strict Boundary Clamping:** All chosen coordinates are clamped within the active map width and height.

### Dynamic Browser Tab Titles
- Dynamic page title updates using Vue Router `meta.title` and navigation hooks.
- Automatically sets browser title to `SFVTT: <Tab Name>` on route transitions (e.g. `SFVTT: RPG VTT`, `SFVTT: Space VTT`, `SFVTT: Character Sheets`, `SFVTT: Ship Sheets`, `SFVTT: Rulebooks`, `SFVTT: Admin`, `SFVTT: Login`).

### Tactical Map Creation Simplification & Auto-Activation
- **Fog of War Removal in Space VTT:** Removed Fog of War checkbox and controls from the Create Tactical Space Map modal (space maps permanently default to fog disabled).
- **Modal Streamlining:** Removed the redundant "Set as Active Map immediately" checkbox from both RPG VTT and Space VTT Create Map modals.
- **Automatic Map Activation:** Creating a new tactical map automatically activates and switches the tabletop view to the newly created map immediately.

### Form Layout & Bounds Refinements
- Resolved form field right-boundary overflow in Add Token modals by expanding modal card width to 500px, constraining max-width to 95vw, and enabling responsive wrapping on file button containers.

---

## 3. Verification & Test Evidence

All tests and production builds were verified in a clean containerized environment prior to release tagging:

### Server Test Suite
- **Passed:** 75 / 75 tests across 6 test files
  - `auth.test.js` (33 tests): Auth, registration, session management, user deletion, password update
  - `maps.test.js` (13 tests): Map CRUD, independent RPG/Space types, token synchronization
  - `sheets.test.js` (12 tests): Character and ship sheet CRUD, validation, and PSA management
  - `upload.test.js` (8 tests): File upload, directory scanning, subfolder upload, traversal protection
  - `db.test.js` (5 tests): SQLite initialization, tables, migrations
  - `rulebooks.test.js` (4 tests): Rulebook metadata and PDF streaming
- **Exit Code:** `0`

### Client Test Suite
- **Passed:** 134 / 134 tests across 16 test files
  - `ImageBrowserModal.test.js` (21 tests): Breadcrumbs, search filter, folder navigation, select event
  - `diceUtils.test.js` (13 tests): Dice parsing, rolling algorithms, bounds
  - `CharacterSheetsView.test.js` (10 tests): Attribute calculations, inventory catalog, portrait browsing
  - `VttImageBrowserIntegration.test.js` (10 tests): ImageBrowserModal integration in Space & RPG VTTs
  - `RulebooksView.test.js` (9 tests): Tabs, Lunr search, snippet highlighting, page clamping
  - `RpgVttMapBrowser.test.js` (9 tests): Map browser drawer, modal bounds, auto-activation
  - `SpaceVttMapBrowser.test.js` (9 tests): Space map browser, modal bounds, auto-activation
  - `combatReference.test.js` (8 tests): Tactical reference tables and formulas
  - `RpgVttRollLog.test.js` (7 tests): Roll log HUD state, 20-entry FIFO eviction, persistence
  - `SpaceVttRollLog.test.js` (7 tests): Space roll log HUD state, decoupling, 20-entry FIFO eviction
  - `QuickReferenceTables.test.js` (6 tests): Tab switching, category filtering, search input
  - `RpgVttCenterPlacement.test.js` (6 tests): Center 5x5 placement, collision avoidance, ring expansion
  - `SpaceVttCenterPlacement.test.js` (6 tests): Hex center placement, collision avoidance, ring expansion
  - `NavBar.test.js` (5 tests): Compact header, role-based admin navigation, logout action
  - `ShipSheetsView.test.js` (5 tests): Tactical ship sheets, weapons, defense systems
  - `router.test.js` (3 tests): Dynamic `SFVTT: <Tab Name>` document titles
- **Exit Code:** `0`

### Client Production Build
- **Status:** Succeeded (`vite build` -> `dist/`)
- **Modules Transformed:** 101 modules
- **Build Time:** 2.64s
- **Exit Code:** `0`

---

## 4. Release History

- **v0.2.0 (October 4, 2026):** Major feature release: Image Browser & Uploads Explorer, Decoupled Die Roll Log HUDs, Center Token Placement with Collision Avoidance, Map Background Browsing, Dynamic Tab Titles, and Modal Form Simplification.
- **v0.1.1 (September 27, 2026):** Sub-release snapshot: Damage dice totals HUD, single source of truth HP refactor, fog removal, token ring color persistence, character portrait layout, ship token linking, and UI theme alignment.
- **v0.1.0 (September 22, 2026):** Initial stable release: RPG and Space VTTs, 3D physics dice box, character and starship sheets, searchable rulebooks, role-based user management, and sci-fi terminal design.

---

## 5. How to Fall Back or Inspect This Release

```bash
# Check out the tagged release in a detached HEAD state:
git checkout v0.2.0

# Or create a new branch from this release point:
git checkout -b release-v0.2.0 v0.2.0
```

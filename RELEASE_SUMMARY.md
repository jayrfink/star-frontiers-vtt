# Star Frontiers VTT - Release v0.11.0 Summary

**Release Tag:** `v0.11.0`  
**Date:** October 26, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.11.0` delivers user-configurable **Character and Starship Sheet Navigation Reordering** with drag-and-drop handles and 1-click step buttons across the left sidebar, backed by persistent SQLite database storage and real-time Socket.io multi-client synchronization. In addition, this release incorporates **3D Physics Dice Serialization & Rapid Roll Capture** ensuring zero lost rolls during rapid successive rolling, **Collapsible VTT Applets & HUDs** (collapsed Flip & Burn applet and collapsed Weapons widget defaults), along with full security hardening and origin boundary protections.

---

## 2. Key Features & Enhancements in v0.11.0

### Character & Ship Sheet Navigation Reordering
- **Persistent Global Ordering:**
  - Added `sort_order INTEGER NOT NULL DEFAULT 0` column to both `character_sheets` and `ship_sheets` in SQLite.
  - Automatically backfills existing sheets to maintain chronological sequence without duplicates.
  - Newly created sheets cleanly append to the end of lists (`SELECT COALESCE(MAX(sort_order), 0) + 1`).
  - `GET /api/characters` and `GET /api/ships` return sheets ordered by `ORDER BY sort_order ASC, id ASC`.
- **REST Endpoints & Security Boundaries:**
  - Added `PUT /api/characters/reorder` and `PUT /api/ships/reorder` endpoints.
  - Validates input arrays of sheet IDs and executes batched updates within an atomic database transaction.
  - Enforces role-based permissions: GameMasters can reorder all sheets; Players can reorder their own sheets (unauthorized moves return 403).
- **Interactive Drag-and-Drop & Accessible Controls:**
  - Added drag handles (`⋮⋮`) with native HTML5 drag-and-drop support, drag ghosting, and drop placement indicators.
  - Added accessible Move Up (`▲`) and Move Down (`▼`) buttons on each sheet item for quick 1-click step adjustment, with disabled states at list boundaries.
  - Features optimistic local UI updates with automatic rollback and error feedback on failure.
  - Real-time Socket.io event (`sheets:reordered`) synchronizes sidebar lists across all connected player and GM browser tabs while maintaining active sheet selection.

### 3D Dice Serialization & Rapid Roll Capture
- **FIFO Physics Serialization Queue:**
  - Added `DiceRollQueue` to serialize 3D dice calls and prevent `@3d-dice/dice-box` from clearing in-flight physics worker promises during rapid clicking.
- **Safe Fallback & Synthetic Roll Resolution:**
  - Implemented `executeQueuedDiceRoll` with synthetic roll generation. If rolls occur faster than the 3D physics animation can display each one or if an animation promise is superseded, all rolls are guaranteed to calculate accurately, log to the server (`/api/rolls`), and display in the Roll Log HUD.

### Collapsible VTT Widgets & UI Ergonomics
- **Space VTT Widget Ergonomics:**
  - Flip & Burn tactical applet is collapsible, defaulting to collapsed state to maximize canvas space.
  - Space VTT token inspector Weapons widget is collapsible, defaulting to collapsed state.

---

## 3. Verification & Test Metrics

- **Client Test Suite**: 52 test files passed, 700 total tests passed (100% passing).
- **Server Test Suite**: 18 test files passed, 240 total tests passed (100% passing).
- **Combined Total**: 940 automated tests passing cleanly across client and server.
- **Production Build**: Built cleanly with Vite in 2.10s.

---

## 4. Release History

- **v0.11.0 (October 26, 2026):** Minor feature release: Character & Ship sheet left navigation reordering (drag-and-drop handles, move up/down buttons, atomic SQLite persistence, real-time Socket.io sync), 3D dice physics serialization & rapid roll capture guarantee, collapsible Flip & Burn applet and Weapons widget defaults.
- **v0.10.1 (October 24, 2026):** Security and robustness update: Strict private network origin validation, prototype property traversal guard on rulebook lookups, GM layer guard on SEU sync, and linked space token HP synchronization.
- **v0.10.0 (October 24, 2026):** Major feature release: Rulebook-accurate Knight Hawks Master Physics, Combat Flip & Burn Maneuvers, Celestial Orbital Slingshots with Oberth Effect Burns, Real-Time Tactical Ping System, Tactical Wireframe Toolbar Icons, Plain ASCII Character Sheet Downloads, and Digital Sheet Recovery Tools.
- **v0.9.0 (October 23, 2026):** Major stability and performance release: Comprehensive 38-item codebase audit fixes, restored 3D percentile dice contrast, LAN private network CORS autodiscovery, direct WebSocket transport, Express HTTP gzip compression, 1-day asset caching, code-split 3D dice engine, and direct production static serving on port 3000.
- **v0.8.0 (October 22, 2026):** Minor feature release: GameMaster-only GM Notes tab (`/dashboard/gm-notes`) with session groups and editable note panels, Space Combat Flip & Burn maneuver (`MR >= 3`) with STA check & blackout rollers, and Star Frontiers Knight Hawks space weapon firing limitations/arcs (`FF`, `T`, `MPO`, `RD`, `LTD`) across rulebooks, custom weapon designer, ship sheets, and Space VTT.
- **v0.7.0 (October 22, 2026):** Minor feature and bugfix release: Adversary template deletion and live token artwork replacement (`PATCH /api/adversaries/:id/token`), missing/moved token image fallback resilience, RPG VTT bottom-up red damage and wounded token overlays, and project `README.md` screenshot gallery.
- **v0.6.0 (October 18, 2026):** Minor feature and polish release: Knight Hawks Ship Weapons Selection Modal & canonical 10-weapon catalog, prominent weapon titles with category limitation badges and inline renaming, ship sheet typography/layout refinements, and synchronized VTT dice & roll banner clearing.
- **v0.5.0 (October 17, 2026):** Major minor-feature release: RPG VTT Alpha Dawn vehicle support & tactical Vehicle HUD, Space VTT celestial tokens (asteroids, moons, planets), canonical Alpha Dawn equipment catalog expansion (117 items) with category filter tabs, player self-service password changes, and tabletop dice rolling sound effects.
- **v0.4.0 (October 16, 2026):** Minor feature release: Dynamic Adversary Stocking engine, Adversary Token HUD, AI token art generator & circular ring masking pipeline, and Admin Uploads & Assets File Manager with directory CRUD, file move, atomic database cascades, and real-time canvas asset sync.
- **v0.3.0 (October 16, 2026):** Minor feature release: shared dice rolls & roll log, per-user tab/view state persistence, Knight Hawks spaceship skills, sheet Notes, "Species" terminology, and Map Manager grid controls (dimensions, line thickness, visibility).
- **v0.2.0 (October 4, 2026):** Major feature release: Image Browser & Uploads Explorer, Decoupled Die Roll Log HUDs, Center Token Placement with Collision Avoidance, Map Background Browsing, Dynamic Tab Titles, and Modal Form Simplification.
- **v0.1.1 (September 27, 2026):** Sub-release snapshot: Damage dice totals HUD, single source of truth HP refactor, fog removal, token ring color persistence, character portrait layout, ship token linking, and UI theme alignment.
- **v0.1.0 (September 22, 2026):** Initial stable release: RPG and Space VTTs, 3D physics dice box, character and starship sheets, searchable rulebooks, role-based user management, and sci-fi terminal design.

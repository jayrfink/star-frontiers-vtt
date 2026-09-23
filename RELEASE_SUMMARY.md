# Star Frontiers VTT - Release v0.1.0 Summary

**Release Tag:** `v0.1.0`  
**Git Commit:** `b5fa9ed4a15a189c95f12d32c5ebd6293f101e0d`  
**Date:** September 22, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.1.0` establishes a stable, verified baseline for the Star Frontiers Virtual Tabletop (VTT). It brings together multi-user authentication and administration, independent RPG and Space tabletop sessions, 3D animated dice rolling with custom d100 percentage and damage dice, character and starship sheet management, searchable rulebooks with integrated PDF rendering, and an updated sci-fi terminal design system.

---

## 2. Included Features & Capabilities

### Virtual Tabletops (VTT)
- **Independent RPG & Space VTTs:** Separate map and token tracking per tabletop mode with synchronized Socket.io events.
- **Tokens & Miniatures:** Token creation, dragging/movement, rotation, speed indicators (`#69c79e`), default ring colors (`#3e636b` for RPG tokens, `#84d1d1` for Space tokens), and condition badge overlays.
- **Fog of War & Map Tools:** Pan, select, fog reveal/hide, and dedicated GM Map Manager with custom styling (`#3a9c83` / dark teal).
- **Map & Asset Uploads:** Secure authenticated uploads for map backgrounds and character tokens with static serving.

### 3D Physics Dice Box
- **Integrated 3D Physics:** Powered by Ammo.js wasm with smooth dice physics.
- **Percentile Roller (d100):** Custom dual-d10 configuration rolling tens and ones dice with centered '0' faces.
- **Damage Dice Roller ($Nd10$):** Dedicated counter roller for Star Frontiers $Nd10$ damage with adjustable +/- count, custom dark red-brown body (`#140409`), and vivid orange numbers (`#f29249`).
- **Toolbar Integration:** Persistent, isolated control that preserves active tool selections.

### Character & Starship Sheets
- **Character Sheets:** Full attribute tracking (STR, STA, DEX, RS, INT, LOG, PER, LDR), calculated sub-stats (IM, punch damage removed in favor of combat table references), equipment catalog with live search filtering, inventory management with custom item notes, and avatar uploads.
- **Ship Sheets (Knight Hawks):** Complete tactical ship management for fighters, frigates, cruisers, and stations. Hull Point (HP) tracking, ADF/MR propulsion, weapons battery controls, defensive screens with status toggles, and ICM launch controls with distinct color-coded actions.

### Searchable Rulebooks & Quick Reference
- **Quick Reference Tables:** In-app combat and tactical reference covering Ship Combat, Ranged Combat, and Melee Combat procedures with tabbed sub-categories and live text filtering.
- **PDF Rulebooks Viewer:** Integrated client-side Lunr full-text search indexing across Star Frontiers Alpha Dawn and Knight Hawks rulebooks. Direct page jumping via PDF iframe URL hash navigation.

### Authentication & User Administration
- **Role-Based Access Control:** Distinct `GameMaster` and `Player` roles with GM-only controls protected both in UI routes and API middleware.
- **Admin Panel (`/admin`):** User creation, password resets, account deletion safeguards (cannot delete the last GM), and session management.

### Sci-Fi Terminal Design System
- **Unified Header Navigation:** Compact ~48px navigation bar maximizing vertical play space.
- **Theme Palette:** High-contrast sci-fi dark palette with cyan/teal neon accents (`#3a859c`, `#3a9c83`, `#77d19e`, `#84d1d1`), customized button borders, and glowing interactive elements.

---

## 3. Verification & Test Evidence

All tests and production builds were verified in a clean state prior to tagging:

### Server Test Suite
- **Passed:** 69 / 69 tests across 6 test files
  - `auth.test.js` (33 tests): Auth, registration, session management, user deletion, password update
  - `maps.test.js` (13 tests): Map CRUD, independent RPG/Space types, token synchronization
  - `sheets.test.js` (11 tests): Character and ship sheet CRUD and validation
  - `db.test.js` (5 tests): SQLite initialization, tables, migrations
  - `rulebooks.test.js` (4 tests): Rulebook metadata and PDF streaming
  - `upload.test.js` (3 tests): File upload validation and static serving
- **Exit Code:** `0`

### Client Test Suite
- **Passed:** 32 / 32 tests across 5 test files
  - `combatReference.test.js` (8 tests): Tactical reference tables and formulas
  - `RulebooksView.test.js` (9 tests): Tabs, Lunr search, snippet highlighting, page clamping
  - `QuickReferenceTables.test.js` (6 tests): Tab switching, category filtering, search input
  - `NavBar.test.js` (5 tests): Compact header, role-based admin navigation, logout action
  - `CharacterSheetsView.test.js` (4 tests): Form fields, attribute calculations, inventory catalog
- **Exit Code:** `0`

### Client Production Build
- **Status:** Succeeded (`vite build` -> `dist/`)
- **Modules Transformed:** 98 modules
- **Build Time:** 2.44s
- **Exit Code:** `0`

---

## 4. How to Fall Back to This Release

To inspect, test, or restore the repository to this exact release point:

```bash
# Check out the tagged release in a detached HEAD state:
git checkout v0.1.0

# Or create a new branch from this release point:
git checkout -b rollback-to-v0.1.0 v0.1.0
```

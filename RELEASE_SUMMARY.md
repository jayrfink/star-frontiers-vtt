# Star Frontiers VTT - Release v0.14.3 Summary

**Release Tag:** `v0.14.3`  
**Date:** November 7, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.14.3` represents a major visual and ergonomic polish cycle across Star Frontiers VTT, introducing collapsible navigation sidebars, an interactive Skills Catalog modal, Holo-HUD translucent glass styling for VTT toolbars, sci-fi typography and backlight header glows, tactical starship system status grids with reactive alert glow, tuned 3D percentile & initiative dice palettes, and token sidebar layout resilience.

All automated test suites pass with 100% compliance: **908 client tests across 62 test files** and **275 server tests across 19 test suites**, with a clean Vite production build.

---

## 2. Key Enhancements in v0.14.3

### Collapsible Sliding Navigation Sidebars
- **Character & Ship Sheet Slide-Away Drawers ([`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue), [`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue)):**
  - Navigation side panels for Character Sheets and Ship Sheets can now slide off-screen to the left via a collapse toggle (`◀`), maximizing horizontal workspace for sheet details.
  - A persistent, floating chevron reveal tab (`▶`) appears docked to the left viewport edge when the sidebar is hidden, smoothly sliding the panel back into view on click.
  - Full keyboard accessibility and smooth CSS cubic-bezier slide transitions.

### Skills Catalog Modal & Inventory-Style Skills Layout
- **Available Skills Catalog Browser ([`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue)):**
  - Integrated modal catalog allowing players and GMs to browse and add skills organized by Primary Skill Area (PSA).
  - Real-time search filtering by skill name and description, instant add-to-sheet buttons, and duplicate skill prevention.
- **Inventory-Style Skills Card Formatting:**
  - Standardized skills list format matching inventory items with aligned success chance columns, abbreviated PSA attributes, standardized level badge widths, and responsive font scaling.

### Holo-HUD Glass Toolbars & Accent Theming
- **Frosted Translucent Toolbars ([`RpgVttView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/RpgVttView.vue), [`SpaceVttView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/SpaceVttView.vue)):**
  - Translucent glassmorphism Holo-HUD styling applied to both Space and RPG VTT toolbar panels with `backdrop-filter: blur(12px)` and subtle cyan-blue borders.
  - Shifted toolbar accent colors 20% toward deep blue for consistent sci-fi immersion.

### Sci-Fi Typography & Backlight Glow Theming
- **Orbitron Font Branding ([`App.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/App.vue), [`NavBar.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/components/NavBar.vue)):**
  - Integrated `Orbitron` Google Font for brand headers, navigation bar title, character sheet names, and ship names.
- **Header Backlight Glows & Title Blending:**
  - Added sci-fi backlight glow to VTT map titles, navigation side panels, Token Inspector headers, GM Map Manager, Stock Adversary modal, Deploy Vehicle modal, and System Administration headers.
  - Blended Character Sheet and Ship Sheet title input fields seamlessly into their card backgrounds (`background: transparent; border: 1px solid transparent;`) accented with a 20% bluer SFVTT cyan glow.
  - Standardized individual note panel headers across GM Notes and Character Sheets to `#c3c3c3`.

### Tactical Starship HUD & Status Tracking
- **HUD Grid Layout & Red Alert Glow ([`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue)):**
  - Grouped starship system damage tracking buttons into a 2-column HUD grid display.
  - Damaged systems activate a reactive crimson alert backlight glow (`box-shadow: 0 0 10px rgba(239, 68, 68, 0.45)`).
  - Aligned Class Preset and Player selector fields with Character Sheet palettes (`#c0c0c0` text and `#30363d` borders) and updated ADF / MR numeric values to `#d0d0d0`.
  - Re-saturated the Lumbering & Snap Flip tactical info banner to a richer cyan-green tone.

### Custom 3D Percentile & Initiative Dice Theming
- **Percentile Dice Palette ([`safeDiceRoller.js`](file:///Users/jrf/star-frontiers-vtt/client/src/utils/safeDiceRoller.js)):**
  - Tuned tens die to match the GM Map Manager button theme and darkened the ones die by 50% for high-contrast legibility during d100 rolls.
- **Initiative HUD & Opponent Dice Theming ([`InitiativeHud.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/components/InitiativeHud.vue)):**
  - Customized player vs adversary initiative 3D dice colors and results modal styling for crystal-clear turn order resolution.

### Token Inspector & Layout Ergonomics
- **Sidebar State Persistence & Dynamic Canvas Resizing ([`SpaceVttView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/SpaceVttView.vue), [`RpgVttView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/RpgVttView.vue)):**
  - Persisted Token Manager sidebar open/closed state across route transitions.
  - Fixed flex-shrink canvas behavior and hooked window resize listeners so VTT canvases immediately recalculate viewport bounds when sidebars toggle.
- **Standardized Action Buttons:**
  - Standardized action buttons (`+ Skill`, `+ Equipment`, `+ Custom Item`, `+ Defense`, `+ Weapon`, `+ Add Note Panel`) to inherit the active sheet's accent colors and styling.

### Documentation & Screenshot Showcase
- **Refreshed Visual Tour ([`docs/screenshots/`](file:///Users/jrf/star-frontiers-vtt/docs/screenshots/)):**
  - Re-captured all 8 primary application showcase screenshots to reflect the latest UI glows, HUD panels, and dark theme polish.

---

## 3. Verification & Test Metrics

- **Client Test Suite**: 62 test files passed, 908 total tests passed (100% passing).
- **Server Test Suite**: 19 test files passed, 275 total tests passed (100% passing).
- **Client Build**: Clean Vite production bundle compilation (`sf-vtt-client@0.14.3`).
- **Services**: Container `sf-vtt-dev` operational.

---

## 4. Git Artifacts & History

- Tag: `v0.14.3`
- Previous Tag: `v0.14.2`

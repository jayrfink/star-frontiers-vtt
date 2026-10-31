# Star Frontiers VTT - Release v0.14.0 Summary

**Release Tag:** `v0.14.0`  
**Date:** October 31, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.14.0` delivers extensive UI, ergonomic, and tactical layout upgrades across both Ship Sheets and Character Sheets. Highlights include an overhauled Ship Sheet header and middle section with a 40%/60% split, an ASCII starship export utility, an integrated Damage Control Rating (DCR) meter tracker with backend SQLite persistence, skill and inventory reordering controls, and unified styling across headers, buttons, traits, and notes sections.

All automated test suites pass with 100% compliance: **782 client tests across 57 test files** and **267 server tests across 19 test suites**, and the client production bundle compiles cleanly.

---

## 2. Key Enhancements in v0.14.0

### Ship Sheets UI & Tactical Ergonomics Redesign
- **Decluttered Header & ASCII Download ([`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue), [`shipExport.js`](file:///Users/jrf/star-frontiers-vtt/client/src/utils/shipExport.js)):**
  - **Top Row:** Reorganized into Ship Name input, Hull Size badge, and an ASCII text file download button (`.btn-action-download`).
  - **Sub-row:** Class Preset and Player assignment dropdown moved cleanly underneath the name row with `0.9rem` font sizing matching Character Sheets.
  - **Export Utility:** Exports full starship specifications, tactical flight stats, hull points, DCR, equipped defenses, weapons, ammo counts, and notes to `<ship_name>_sheet.txt`.
- **40% / 60% Middle Section Grid ([`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue)):**
  - **Left Half (40% width):** `FLIGHT STATS` vertical stack with ADF and MR inputs using light all-caps lettering (`tracker-label`).
  - **Right Half (60% width):** Compact trackers card housing:
    - **Hull Points Applet:** Light all-caps `HULL POINTS (HP)` header, `Full Repair` button, current/max HP inputs, thin 8px meter bar, stepper buttons (`-5`, `-1`, `+1`, `+5`), and freeform delta (`- Dmg`, `+ Heal`).
    - **Damage Control Rating (DCR) Meter Applet:** Positioned under Hull Points with light all-caps `DAMAGE CONTROL RATING (DCR)` header, `Restore DCR` button, current/max DCR inputs, thin 8px meter bar with color thresholds matching Hull Points (> 50% `#4caf50`, > 25% `#ff9800`, &le; 25% `#f44336`), stepper buttons (`-5`, `-1`, `+1`, `+5`), and freeform delta (`- Red`, `+ Rep`).
  - **Button Width Symmetry:** Standardized `min-width: 88px` and adjusted padding so the `Full Repair` button matches the exact width of `Restore DCR`.
- **DCR Backend Persistence & Migration ([`db.js`](file:///Users/jrf/star-frontiers-vtt/server/src/db.js), [`sheets.js`](file:///Users/jrf/star-frontiers-vtt/server/src/sheets.js)):**
  - Added `current_dcr` integer column to `ship_sheets` table with automatic database migration (`UPDATE ship_sheets SET current_dcr = dcr WHERE current_dcr IS NULL`).
  - Supported `current_dcr` on `POST /api/ships` and `PUT /api/ships/:id` with clamping between 0 and max DCR.

### Character Sheets Ergonomics & UI Polish
- **Special Traits & Abilities Banner ([`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue)):**
  - Styled species abilities as an immutable information banner mirroring the Ship Sheets Flip & Burn banner color scheme and border aesthetic.
- **Skill & Inventory Reordering ([`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue)):**
  - Added up/down buttons (`▲`, `▼`) and drag-and-drop reordering for both the Skills & Experience list and Inventory & Mass list.
  - Automatically persists new order to character sheet record upon reordering.
- **Compact XP Controls ([`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue)):**
  - Streamlined XP tracker row, moving spend and award controls next to the `EXPERIENCE POINTS (XP)` label for a cleaner, more compact profile.
- **Button Sizing & Icon Polish ([`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue)):**
  - Removed mini icons from `Rest` and `Reload` buttons, matching their widths using `min-width: 58px` and balanced padding.
  - Scaled sub-row font size (Species, PSA, Player) down 10% to `0.9rem`.
- **Notes Section Alignment ([`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue)):**
  - Applied the exact styling, cyan `#45acba` heading color, margin, and padding (`padding-bottom: 2%`) from Ship Sheets Notes to Character Sheets Notes.

---

## 3. Verification & Test Metrics

- **Client Test Suite**: 57 test files passed, 782 total tests passed (100% passing).
- **Server Test Suite**: 19 test files passed, 267 total tests passed (100% passing).
- **Client Build**: Clean Vite production bundle compilation (`sf-vtt-client@0.14.0`).
- **Services**: Dev server container `sf-vtt-dev` operational.

---

## 4. Git Artifacts & History

- Tag: `v0.14.0`
- Previous Tag: `v0.13.0`

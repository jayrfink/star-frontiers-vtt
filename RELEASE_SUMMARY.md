# Star Frontiers VTT - Release v0.13.0 Summary

**Release Tag:** `v0.13.0`  
**Date:** October 31, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.13.0` is a major feature update delivering comprehensive player assignment across character and ship sheets, an upgraded Knight Hawks ship defenses system with custom catalog defenses and delete controls, an integrated Experience Points (XP) tracker with direct skill progression spending, a major ergonomic redesign of the character sheet header and middle layout, auth session storage resilience hardening against cross-OS WAL lock contention, and unified typography.

All automated test suites pass with 100% compliance: **764 client tests across 56 test files** and **266 server tests across 19 test suites**, and the client production bundle compiles cleanly.

---

## 2. Key Enhancements in v0.13.0

### GM Player Assignment for Characters & Ships
- **Backend Ownership & Permissions ([`server/src/sheets.js`](file:///Users/jrf/star-frontiers-vtt/server/src/sheets.js)):**
  - Added user attribution (`user_id`) to `character_sheets` and `ship_sheets` database schemas with foreign key references to the `users` table.
  - Restricted sheet reassignment to GameMasters while allowing players to view their assigned sheets.
  - Broadcasted real-time Socket.io attribution updates (`sheets:updated`) to all connected clients upon player assignment changes.
- **Frontend Player Selection Controls ([`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue), [`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue)):**
  - Integrated a GM Player assignment dropdown in both character and ship sheet headers, as well as the respective Create modals.
  - Rendered a read-only badge (`👤 <owner_username>`) for players to easily identify sheet ownership without GM edit privileges.

### Knight Hawks Ship Defenses System Upgrade
- **Modular Defense Catalog & Custom Defenses ([`client/src/constants/shipDefenses.js`](file:///Users/jrf/star-frontiers-vtt/client/src/constants/shipDefenses.js)):**
  - Renamed the legacy "Defensive Screens" applet to "Defenses".
  - Established a canonical Knight Hawks defense catalog covering Reflective Hull, Masking Screen, ECM, ICM, and Proton Screen with accurate rulebook stats.
  - Added a `+ Add Defense` modal enabling GMs and players to equip catalog defenses or design custom screen systems with custom SEU drain, ammo, and defense rating parameters.
  - Added delete capability (`✕`) on equipped defenses with bidirectional synchronization to legacy defense state columns.

### Character Sheet XP Tracker & Skill Progression
- **Persistent XP Tracking ([`server/src/db.js`](file:///Users/jrf/star-frontiers-vtt/server/src/db.js), [`server/src/sheets.js`](file:///Users/jrf/star-frontiers-vtt/server/src/sheets.js)):**
  - Added `current_xp` integer column to `character_sheets` with automatic SQLite migration and range validation `[0, 1000000]`.
- **Streamlined XP Controls ([`client/src/views/CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue)):**
  - Placed an XP tracker with all-caps light lettering (`EXPERIENCE POINTS (XP)`) in the compact trackers card.
  - Provided a streamlined amount box with `[- Spend]` and `[+ Award]` buttons.
  - Integrated direct skill advancement spending, deducting XP in real time when increasing skill levels.

### Character Sheet Middle Layout & Header Redesign
- **Decluttered Sheet Header ([`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue)):**
  - Separated header into a top row (Name input, Tier badge, clean Download button) and a dedicated sub-row (Species, PSA, Player assignment).
  - Scaled character portrait up 10% (57&times;57px) and aligned its top edge directly with the name input.
- **Balanced Two-Column Middle Grid ([`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue)):**
  - **Left Box — Primary Attributes:** Stacked the 4 primary attribute pairs into a compact 2&times;2 grid (`STR / STA`, `DEX / RS`, `INT / LOG`, `PER / LDR`) located directly beneath the tactical bar.
  - **Right Box — Compact Trackers:** Grouped Stamina (STA), SEU Energy Pool, and XP into a matching compact column.
  - Thin 8px meter bars for STA and SEU harmonized with the Encumbrance bar.
  - Standardized tracker headers to use all-caps light lettering (`tracker-label`) rather than bulky `<h4>` headers.

### Auth & Session Storage Resilience
- **SQLite Session Crash Protection ([`server/src/middleware.js`](file:///Users/jrf/star-frontiers-vtt/server/src/middleware.js)):**
  - Hardened `BetterSqlite3Store.get()` and `touch()` against read and JSON parse errors, gracefully destroying corrupt sessions and returning null instead of throwing unhandled 500 crashes.
- **Isolated Status Inspections ([`sf-vtt-ctl.sh`](file:///Users/jrf/star-frontiers-vtt/sf-vtt-ctl.sh)):**
  - Shifted status inspection SQLite queries inside the Docker container via `docker exec`, preventing cross-OS WAL/SHM file locking contention on macOS bind mounts.

### Typography & Theme Polish
- **Branded Typography ([`client/src/main.css`](file:///Users/jrf/star-frontiers-vtt/client/src/main.css)):**
  - SFVTT brand title set to Modesto font.
  - Headers set to Modesto falling back to Consolas and Roboto.
  - Locally served Roboto applied sitewide for clean legibility.
  - Harmonized muted steel-cyan accent (`#45acba`) across character and ship sheet components.

---

## 3. Verification & Test Metrics

- **Client Test Suite**: 56 test files passed, 764 total tests passed (100% passing).
- **Server Test Suite**: 19 test files passed, 266 total tests passed (100% passing).
- **Client Build**: Clean Vite production bundle compilation (`sf-vtt-client@0.13.0`).
- **Services**: Dev server container `sf-vtt-dev` verified running with backend (port 3000) and frontend (port 3001) operational.

---

## 4. Git Artifacts & History

- Tag: `v0.13.0`
- Previous Tag: `v0.12.6`

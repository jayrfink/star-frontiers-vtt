# Star Frontiers VTT - Release v0.14.2 Summary

**Release Tag:** `v0.14.2`  
**Date:** October 31, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.14.2` brings major tactical, ergonomic, and infrastructure enhancements across both Space and RPG VTT gameplay, Ship Sheets, and container operations. Key highlights include dynamic damage overlays for starships on the Space VTT (with a gradual translucent orange gradient and a full light grey translucent hulk overlay for 0-HP derelicts), double-click activation and bottom scrolling fixes for token HUD applets, Game Master token visibility controls (allowing GMs to hide and reveal tokens dynamically from players across both VTTs), interactive ship system damage tracking buttons and defense status indicators on Ship Sheets, quick reference tables for DCR repair and selective targeting, persistent character and ship sheet sort order across server restarts, and integrated OrbStack lifecycle management in `sf-vtt-ctl.sh`.

All automated test suites pass with 100% compliance: **841 client tests across 60 test files** and **275 server tests across 19 test suites**, and the client production bundle compiles cleanly.

---

## 2. Key Enhancements in v0.14.2

### Space VTT Ship Damage & 0-HP Hulk Overlays
- **Gradual Translucent Orange Damage Overlay ([`SpaceVttCanvas.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/components/SpaceVttCanvas.vue), [`shipDamageOverlay.js`](file:///Users/jrf/star-frontiers-vtt/client/src/utils/shipDamageOverlay.js)):**
  - Renders a translucent orange vertical linear gradient rising from the bottom of ship tokens proportional to their damage ratio (curHp / maxHp) or tactical damage conditions (`damaged`, `adrift`, `disabled`, `burning`).
  - Color intensity and height scale smoothly from light damage to heavy damage to critical damage (< 20% HP).
- **Out of Commission (0-HP Derelict Hulk):**
  - Ships reaching 0 or negative Hull Points are completely covered with a full light grey translucent overlay (`rgba(210, 218, 226, 0.62)`).
  - Out-of-commission hulks remain capable of drifting/moving across the map with their speed badges, heading rotation, and colored ring borders visibly preserved on top of the grey overlay.
- **Celestial Immunity:**
  - Celestial tokens (planets, stars, moons, asteroids) are strictly immune to damage overlays.

### Token HUD Applets & Ergonomics
- **Double-Click Canvas Activation ([`RpgVttView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/RpgVttView.vue), [`SpaceVttView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/SpaceVttView.vue), [`AdversaryTokenHud.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/components/AdversaryTokenHud.vue), [`VehicleTokenHud.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/components/VehicleTokenHud.vue)):**
  - Token popup HUD applets for NPCs, adversaries, and vehicles now open via a double-click on the canvas token, allowing single-clicks to select and drag tokens cleanly without popping up the HUD window.
- **HUD Applet Scroll to Bottom Fix:**
  - Bounded HUD container max-height and configured `.hud-body` with flex overflow to guarantee users can scroll all the way down to see all stats, attacks, actions, and equipment.

### Game Master Token Visibility Controls
- **Hide / Reveal Tokens from Players ([`RpgVttView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/RpgVttView.vue), [`SpaceVttView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/SpaceVttView.vue), [`maps.js`](file:///Users/jrf/star-frontiers-vtt/server/src/maps.js)):**
  - GMs can toggle token visibility (layer: `token` vs `gm`) directly from Token Inspector panels and Adversary/Vehicle HUD applets, or spawn tokens directly hidden via an Add Token checkbox.
  - GM view renders dashed borders and hidden icons (`🙈`), while non-GM player clients completely filter out hidden tokens in real time via scoped socket events (`token:created` and `token:deleted`).

### Ship Sheets Tactical Systems & Layout
- **Interactive Ship System Damage Buttons ([`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue), [`db.js`](file:///Users/jrf/star-frontiers-vtt/server/src/db.js)):**
  - Added dedicated toggle buttons for starship sub-systems (Sub-Light Drive, Maneuver Steering, Weapons Control, Screens & Defenses, Sensors & Comms, Life Support & Power) with backend persistence in `damaged_systems`.
  - Palette states for operational vs damaged systems with hover glow effects.
- **Three-State Defense Indicators:**
  - Equipped ship defenses display distinct Online, Damaged, and Offline status states with visual pill badges.
- **Middle Section Grid Alignment:**
  - Structured the middle section into 15% Flight Stats, 35% two-column System Status buttons, and 1fr Hull Points & DCR Trackers.

### Rules Quick Reference Tables
- **Tactical Starship References ([`QuickReferenceTables.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/components/QuickReferenceTables.vue)):**
  - Integrated Damage Control Rating (DCR) repair rules reference table.
  - Integrated starship damaged systems and selective targeting quick reference tables with instant search filtering.

### Sheet Organization & Persistence
- **Persistent Sheet Reordering ([`db.js`](file:///Users/jrf/star-frontiers-vtt/server/src/db.js), [`sheets.js`](file:///Users/jrf/star-frontiers-vtt/server/src/sheets.js)):**
  - Custom drag-and-drop sort order for character sheets and ship sheets is persistently recorded in SQLite, surviving database re-initialization and server restarts.

### Infrastructure & Operations (`sf-vtt-ctl.sh`)
- **OrbStack Lifecycle Integration ([`sf-vtt-ctl.sh`](file:///Users/jrf/star-frontiers-vtt/sf-vtt-ctl.sh)):**
  - Integrated OrbStack management directly into the control script for automatic startup, health checks, and graceful shutdown on macOS.

---

## 3. Verification & Test Metrics

- **Client Test Suite**: 60 test files passed, 841 total tests passed (100% passing).
- **Server Test Suite**: 19 test files passed, 275 total tests passed (100% passing).
- **Client Build**: Clean Vite production bundle compilation (`sf-vtt-client@0.14.2`).
- **Services**: Dev server container `sf-vtt-dev` operational.

---

## 4. Git Artifacts & History

- Tag: `v0.14.2`
- Previous Tag: `v0.14.1`

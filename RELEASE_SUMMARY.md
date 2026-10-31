# Star Frontiers VTT - Release v0.14.1 Summary

**Release Tag:** `v0.14.1`  
**Date:** October 31, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.14.1` delivers note panels, reordering capabilities, and visual polish across GM Notes, Character Sheets, and Ship Sheets. Key highlights include modular and reorderable note panels on Character and Ship Sheets mirroring GM Notes (with a 4-panel cap and clean 0-panel default), GM Notes drag-and-drop reordering with persistent database sort order, ergonomic `Current:` and `Max:` weapon ammo indicators, a custom vector SVG weapon edit pencil icon, and dark theme consistency across armament and defense cards.

All automated test suites pass with 100% compliance: **803 client tests across 57 test files** and **268 server tests across 19 test suites**, and the client production bundle compiles cleanly.

---

## 2. Key Enhancements in v0.14.1

### Reorderable Note Panels for Character & Ship Sheets
- **GM Notes Parity ([`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue), [`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue)):**
  - Added modular note panels at the bottom of Character Sheets and Ship Sheets using the exact styling and responsive layout grid (`repeat(auto-fill, minmax(420px, 1fr))`) as GM Notes.
  - Each note panel includes inline title editing, a delete button with confirmation, and smooth up/down reorder buttons (`▲`, `▼`) as well as drag-and-drop reordering with visual grab indicators.
  - Character and ship export utilities ([`characterExport.js`](file:///Users/jrf/star-frontiers-vtt/client/src/utils/characterExport.js), [`shipExport.js`](file:///Users/jrf/star-frontiers-vtt/client/src/utils/shipExport.js)) serialize all note panels cleanly into downloaded ASCII text sheets.
- **4-Panel Limit & Zero Default ([`CharacterSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue), [`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue)):**
  - Default sheet state starts cleanly with 0 note panels, presenting an empty-state prompt until panels are added.
  - Enforced a hard maximum cap of 4 note panels per sheet to prevent unbounded DOM growth. The `+ Add Note Panel` button disables with a descriptive tooltip when 4 panels are reached, with guards preventing additions beyond the limit.

### GM Notes Reordering
- **Drag-and-Drop & Stepper Reordering ([`GmNotesView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/GmNotesView.vue)):**
  - Enabled reordering of GM Note panels using both up/down controls (`▲`, `▼`) and HTML5 drag-and-drop with drag handles (`⋮⋮`).
- **Backend Persistence API ([`gmNotes.js`](file:///Users/jrf/star-frontiers-vtt/server/src/gmNotes.js)):**
  - Implemented `PUT /api/gm-notes/sessions/:id/panels/reorder` endpoint that safely updates `sort_order` within an atomic transaction for authenticated Game Masters.

### Ship Sheets Visual & Ergonomic Polish
- **Weapon Ammo Indicators ([`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue)):**
  - Replaced ambiguous `Ammo:` / slash formatting on ship armament records with distinct, small `<label>Current:</label>` and `<label>Max:</label>` labels matching surrounding typography.
- **Custom Aqua & Cyan Pencil Icon ([`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue)):**
  - Replaced platform-dependent emoji pencil (`✏️`) with an inline vector SVG pencil icon featuring a custom aqua eraser (`.pencil-eraser`), cyan pencil body (`.pencil-body`), and subtle hover glow.
- **Armament Background Theme Match ([`ShipSheetsView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/ShipSheetsView.vue)):**
  - Updated weapon card background (`.weapon-card`) from `#000000` to `#0d1117`, establishing visual harmony with Defenses records (`.defense-toggle-row` and `.defense-counter-box`).

---

## 3. Verification & Test Metrics

- **Client Test Suite**: 57 test files passed, 803 total tests passed (100% passing).
- **Server Test Suite**: 19 test files passed, 268 total tests passed (100% passing).
- **Client Build**: Clean Vite production bundle compilation (`sf-vtt-client@0.14.1`).
- **Services**: Dev server container `sf-vtt-dev` operational.

---

## 4. Git Artifacts & History

- Tag: `v0.14.1`
- Previous Tag: `v0.14.0`

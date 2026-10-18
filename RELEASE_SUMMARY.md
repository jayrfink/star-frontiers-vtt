# Star Frontiers VTT - Release v0.6.0 Summary

**Release Tag:** `v0.6.0`  
**Date:** October 18, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.6.0` is a minor feature and polish release introducing the **Knight Hawks Ship Weapons Selection Modal & Catalog**, **Editable Ship Weapon Cards & Limitation Badges**, **Ship Sheet Typography & Layout Refinements**, and **Synchronized VTT Dice & Roll Banner Clearing** across both RPG and Space VTTs in preparation for the upcoming major release.

---

## 2. Included Features & Capabilities in v0.6.0

### Knight Hawks Ship Weapons Selection Modal & Catalog
- **Canonical Weapons Catalog (`client/src/constants/shipWeapons.js`):** 10 official Knight Hawks spaceship weapons (Laser Cannon, Laser Battery, Electron Battery, Proton Battery, Disruptor Cannon, Torpedoes, Assault Rockets, Rocket Battery, Mines, Seeker Missile) with rulebook-accurate damage dice, maximum hex ranges, ammunition capacities, and tactical limitation notes.
- **Interactive Equip Ship Weapon Modal (`ShipSheetsView.vue`):**
  - Category filter tabs (`All`, `Beams`, `Ordnance & Rockets`, `Custom Weapon`).
  - Stat preview cards displaying Damage, Range, Ammo limits, and rulebook usage notes.
  - One-click **Equip** action populating weapon statistics directly onto the active ship sheet.
  - Custom Weapon builder form with validation for bespoke starship armaments.

### Ship Sheet Weapon Cards & Layout Refinements
- **Prominent Weapon Titles & Limitation Badges:** Each equipped weapon displays its full name alongside a color-coded category badge (`BEAM` vs `ORDNANCE`) and tooltip explaining defensive screen interactions (e.g., whether stopped by Masking/Albedo/lemmer screens vs interceptable by ICMs).
- **Inline Rename Toggle:** Quick `✏️` edit button to rename any equipped weapon in-place with `Enter` / `Blur` auto-save and `Escape` cancel.
- **Streamlined Card Layout:** Single-row weapon header keeping the weapon name and category badge aligned to the left of the status selector (`Online` / `Damaged` / `Offline`) and delete button (`✕`), with sheet-level `Fire` buttons removed so all combat rolls take place on the VTT.
- **Typography & Spacing Polish:**
  - Updated font color for `ADF`, `MR`, `DCR`, defensive screen names, and weapon titles to `#d0d0d0` with matched font sizes (`0.9rem`).
  - Updated `Armament / Weapons` section label color to `#e6e6e6`.
  - Adjusted spacing between the **Notes** header and freeform textarea to a proportional `2%` padding.

### VTT Dice & Roll Banner Clearing
- **Complete UI & 3D Mesh Dismissal:** Clicking `✖ Clear Dice` now immediately dismisses active `Percentile Roll (d%)` and `Damage Roll (d10)` overlay banners, clears pending auto-hide timers, and closes the damage dice popover in addition to clearing 3D dice meshes from the canvas.
- **Synchronized Multi-Client Clearing:** Clearing the shared roll log (`DELETE /api/rolls`) or receiving the `roll:cleared` socket event automatically clears active dice and banners across all connected clients.
- **Keyboard Shortcut Support:** Pressing `Escape` dismisses active roll result banners and dice overlays on both RPG and Space VTTs.

---

## 3. Verification & Test Evidence

All tests and production builds were verified in the `sf-vtt-dev` development container:

- **Server test suite:** 162 / 162 tests across 14 test files passed.
- **Client test suite:** 331 / 331 tests across 35 test files passed.
- **Client production build:** Succeeded cleanly with Vite (`npm run build`).

---

## 4. Release History

- **v0.6.0 (October 18, 2026):** Minor feature and polish release: Knight Hawks Ship Weapons Selection Modal & canonical 10-weapon catalog, prominent weapon titles with category limitation badges and inline renaming, ship sheet typography/layout refinements, and synchronized VTT dice & roll banner clearing.
- **v0.5.0 (October 17, 2026):** Major minor-feature release: RPG VTT Alpha Dawn vehicle support & tactical Vehicle HUD, Space VTT celestial tokens (asteroids, moons, planets), canonical Alpha Dawn equipment catalog expansion (117 items) with category filter tabs, player self-service password changes, and tabletop dice rolling sound effects.
- **v0.4.0 (October 16, 2026):** Minor feature release: Dynamic Adversary Stocking engine, Adversary Token HUD, AI token art generator & circular ring masking pipeline, and Admin Uploads & Assets File Manager with directory CRUD, file move, atomic database cascades, and real-time canvas asset sync.
- **v0.3.0 (October 16, 2026):** Minor feature release: shared dice rolls & roll log, per-user tab/view state persistence, Knight Hawks spaceship skills, sheet Notes, "Species" terminology, and Map Manager grid controls (dimensions, line thickness, visibility).
- **v0.2.0 (October 4, 2026):** Major feature release: Image Browser & Uploads Explorer, Decoupled Die Roll Log HUDs, Center Token Placement with Collision Avoidance, Map Background Browsing, Dynamic Tab Titles, and Modal Form Simplification.
- **v0.1.1 (September 27, 2026):** Sub-release snapshot: Damage dice totals HUD, single source of truth HP refactor, fog removal, token ring color persistence, character portrait layout, ship token linking, and UI theme alignment.
- **v0.1.0 (September 22, 2026):** Initial stable release: RPG and Space VTTs, 3D physics dice box, character and starship sheets, searchable rulebooks, role-based user management, and sci-fi terminal design.

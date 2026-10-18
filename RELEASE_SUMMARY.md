# Star Frontiers VTT - Release v0.5.0 Summary

**Release Tag:** `v0.5.0`  
**Date:** October 17, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.5.0` is a major minor-feature release introducing **Alpha Dawn Expanded Vehicle Support** on the RPG VTT (canonical vehicles catalog, custom vehicle builder, tactical Vehicle Token HUD with speed controls and condition toggles), **Space VTT Celestial Tokens** (asteroids, moons, centurian moons, and planets with ringless, condition-less rendering and layer sorting), the **Canonical Alpha Dawn Equipment & Weapons Inventory Expansion** (117 rulebook-accurate items with category pill tabs), **Player Self-Service Password Changes**, and **Tabletop Dice Rolling Sound Effects**.

---

## 2. Included Features & Capabilities in v0.5.0

### RPG VTT Alpha Dawn Vehicle Support
- **Canonical Vehicles Catalog:** 10 official Alpha Dawn vehicles (Ground Car, Ground Transport, Ground Cycle, Hover Car, Hover Transport, Hover Cycle, Explorer, Glijet, Jetcopter, Aircar) with rulebook-accurate specifications (top/cruise speed, acceleration, deceleration, turn speed, passengers, cargo volume, parabatteries).
- **Custom Vehicle Builder:** Create, customize, and persist user-defined vehicles to the SQLite database (`vehicle_templates`) with GM deletion controls.
- **Deploy Vehicle Modal:** Dedicated dual-tab interface (`DeployVehicleModal.vue`) for browsing canonical specs or custom templates, setting spawn coordinates and ring colors, and adding crew/cargo notes.
- **Tactical Vehicle Token HUD (`VehicleTokenHud.vue`):**
  - Live speedometer with `+ Accel`, `- Decel`, and `Emergency Stop` buttons.
  - Parabattery energy gauge with quick drain chips (`-1`, `-5`, `-10`, `Recharge`).
  - 8 Vehicle Damage Table condition toggles (`Turn Speed -15`, `Accel -20`, `Top Speed -30`, `Steering Jammed`, `Decel -20/turn`, `Spin`, `🔥 Burning`, `Roll & Burn`).
  - Integrated quick action dice triggers: Control Table check (`d100`) and Vehicle Damage Table check (`2d10 + damage`) logged directly to the shared dice roll feed.
  - Read-only rulebook reference card.
- **Multi-Cell Canvas Overlays:** Multi-cell rendering (1x1, 2x2, 2x3) and tactical status badges (`m/t` speed and condition indicators) on `VttCanvas.vue`.

### Space VTT Celestial Tokens (Asteroids, Moons, Planets)
- **Special Astronomical Tokens:** Ability to place non-ship celestial bodies (Asteroids, Moons, Centurian Moons, Planets) taking up strictly 1 hex.
- **Zero-Migration Data Model:** Stored via `layer: 'celestial'` without requiring database schema changes.
- **Suppressed Tactical Indicators:** Renders cleanly without colored ring borders, speed badges, heading/rotation indicators, or status condition overlays.
- **Layer Sorting:** Celestial tokens render underneath ship tokens so spaceships visually maneuver above stellar bodies.
- **Add Token Modal & Inspector Integration:** Token Type switch (`🚀 Ship / Station` vs `🪐 Celestial Object`) with quick name preset chips and streamlined inspector showing only coordinates, avatar, and delete actions.

### Alpha Dawn Expanded Equipment & Weapons Inventory Expansion
- **Canonical 117-Item Catalog:** Fully expanded `data/inventory_items.json` matching the Alpha Dawn Expanded Game Rules (pp. 31, 38, 48–56) with accurate Credit costs, weights, ammunition capacities, and damage dice.
- **Standardized Categories:** Categorized into `Weapon`, `Ammunition`, `Defense`, `Toolkit`, `Medical`, `Gear`, and `Power`.
- **Category Filter Tabs:** Interactive category pill filter tabs with dynamic count badges in the Character Sheet Equipment Catalog modal.

### Player Self-Service Password Change
- **Secure API Endpoint:** `PUT /api/auth/password` requiring session authentication and verifying current password with bcrypt before updating credentials.
- **Accessible Modal Dialog:** `ChangePasswordModal.vue` with client-side validation, password length checks, matching confirmation, inline status alerts, and autofocus.
- **Navigation Bar Button:** `🔑 Password` button accessible to all authenticated players and GMs.

### Tabletop Dice Rolling Audio
- **Sound Effects Pipeline:** Dedicated audio assets and `diceAudio` manager service.
- **Tactile Sound Synchronization:** Plays realistic dice rolling sounds on 3D dice rolls across both RPG and Space VTT battle maps with mute controls and volume validation.

---

## 3. Verification & Test Evidence

All tests and production builds were verified in the `sf-vtt-dev` development container:

- **Server test suite:** 162 / 162 tests across 14 test files passed.
- **Client test suite:** 319 / 319 tests across 34 test files passed.
- **Client production build:** Succeeded cleanly with Vite (`npm run build`).

---

## 4. Release History

- **v0.5.0 (October 17, 2026):** Major minor-feature release: RPG VTT Alpha Dawn vehicle support & tactical Vehicle HUD, Space VTT celestial tokens (asteroids, moons, planets), canonical Alpha Dawn equipment catalog expansion (117 items) with category filter tabs, player self-service password changes, and tabletop dice rolling sound effects.
- **v0.4.0 (October 16, 2026):** Minor feature release: Dynamic Adversary Stocking engine, Adversary Token HUD, AI token art generator & circular ring masking pipeline, and Admin Uploads & Assets File Manager with directory CRUD, file move, atomic database cascades, and real-time canvas asset sync.
- **v0.3.0 (October 16, 2026):** Minor feature release: shared dice rolls & roll log, per-user tab/view state persistence, Knight Hawks spaceship skills, sheet Notes, "Species" terminology, and Map Manager grid controls (dimensions, line thickness, visibility).
- **v0.2.0 (October 4, 2026):** Major feature release: Image Browser & Uploads Explorer, Decoupled Die Roll Log HUDs, Center Token Placement with Collision Avoidance, Map Background Browsing, Dynamic Tab Titles, and Modal Form Simplification.
- **v0.1.1 (September 27, 2026):** Sub-release snapshot: Damage dice totals HUD, single source of truth HP refactor, fog removal, token ring color persistence, character portrait layout, ship token linking, and UI theme alignment.
- **v0.1.0 (September 22, 2026):** Initial stable release: RPG and Space VTTs, 3D physics dice box, character and starship sheets, searchable rulebooks, role-based user management, and sci-fi terminal design.

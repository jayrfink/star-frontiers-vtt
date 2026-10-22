# Star Frontiers VTT - Release v0.8.0 Summary

**Release Tag:** `v0.8.0`  
**Date:** October 22, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.8.0` is a minor feature release introducing a dedicated **GameMaster-Only GM Notes Tab**, the **Space Combat Flip and Burn Tactical Maneuver** (`MR >= 3`), and comprehensive **Knight Hawks Space Weapon Firing Limitations & Arcs** (`FF`, `T`, `MPO`, `RD`, `LTD`) integrated across rulebooks, custom weapon designing, starship sheets, and the Space VTT.

---

## 2. Included Features & Capabilities in v0.8.0

### GameMaster-Only GM Notes Tab
- **GM-Only Navigation & Security (`/dashboard/gm-notes`):**
  - Navigation tab `📓 GM Notes` is rendered exclusively for authenticated users with role `GameMaster`.
  - Frontend router guards (`requiresGm: true`) redirect non-GM users away from the route.
  - Backend REST API (`/api/gm-notes`) enforces authentication and GM authorization via `requireGM(db)`, returning `403 Forbidden` to non-GM requests.
- **Session Groups & Custom Note Panels:**
  - **Left Sidebar:** Create, rename, select, and delete campaign session groups (auto-seeds `Session 1` with starter panels).
  - **Note Panels Grid:** Add multiple customizable note panels per session (readouts, encounter setups, adversaries to add to maps) with quick-add presets (`+ Introduction`, `+ Part 1`, `+ Part 2`, `+ Readout`, `+ Adversaries`, or custom panels).
  - Inline title and note body editing automatically persists to SQLite database tables (`gm_sessions` and `gm_note_panels`).

### Space Combat: Flip and Burn (`MR >= 3`)
- **High-G Heading Reversal & Crew STA Blackout Mechanic:**
  - Any vessel with a Maneuver Rating of 3 or higher (`MR >= 3`) can perform a 180° Flip and Burn in space combat.
  - Reverses ship token rotation by 180° (`(rotation + 180) % 360`) and alerts crew to make high-G Stamina checks.
  - **1-Click Rollers on Space VTT:**
    - **🎲 Crew STA Check (d%):** Percentile dice roll with 3D animation, HUD toast, and shared roll log entry.
    - **💫 Roll Blackout (1d10×10s):** Rolls 1d10 scaled by 10 (`10s`–`100s`) to determine blackout duration for failing crew members.
  - **Ship Sheets Integration:** Flight & Tactical Stats displays an active `🔄 Flip & Burn Capable` or muted `🚫 Flip & Burn Unavailable` capability banner with rule reminder text.

### Space Weapon Firing Limitations & Arcs (`FF`, `T`, `MPO`, `RD`, `LTD`)
- **Rulebooks Quick Reference Table & Abbreviations Legend (`QuickReferenceTables.vue`):**
  - Added an **Arcs & Restrictions** column to the Ship Weapons table featuring color-coded badges for all canonical Knight Hawks weapons.
  - Responsive **Weapon Restrictions & Abbreviations Legend** box beneath the table defining:
    - **`FF` (Forward Firing):** Can only fire into the forward 60° arc along the ship's facing hex direction.
    - **`T` (Turret / 360°):** Can fire in all directions (any 360° hex arc).
    - **`MPO` (Moving Player Only):** Can only fire during attacking player's combat phase (no defensive fire during enemy turn).
    - **`RD` (Range Diffusion):** Accuracy decreases by -5% per hex of distance to target.
    - **`LTD` (Limited Supply):** Finite tracked ammunition.
- **Custom Ship Weapon Designer (`ShipSheetsView.vue`):**
  - Added an interactive **Firing Arcs & Limitations** selector with quick-toggle chips for `[FF]`, `[T]`, `[MPO]`, `[RD]`, and `[LTD]`, plus a freeform custom text field for custom arcs (e.g. `Aft Arc, Port Broadside`).
  - Merges and normalizes tags with automatic deduplication.
- **Ship Sheets & Space VTT Token Inspector:**
  - Catalog picker items and equipped armament cards display restriction badges.
  - Space VTT Token Inspector displays firing restriction badges on linked ship weapons for instant tactical verification during combat.

---

## 3. Verification & Test Evidence

All tests and production builds were verified in the `sf-vtt-dev` development container:

- **Server test suite:** 171 / 171 tests across 16 test files passed.
- **Client test suite:** 369 / 369 tests across 38 test files passed.
- **Combined total:** 540 / 540 automated tests passing cleanly.
- **Client production build:** Succeeded cleanly with Vite (`npm run build`).

---

## 4. Release History

- **v0.8.0 (October 22, 2026):** Minor feature release: GameMaster-only GM Notes tab (`/dashboard/gm-notes`) with session groups and editable note panels, Space Combat Flip & Burn maneuver (`MR >= 3`) with STA check & blackout rollers, and Star Frontiers Knight Hawks space weapon firing limitations/arcs (`FF`, `T`, `MPO`, `RD`, `LTD`) across rulebooks, custom weapon designer, ship sheets, and Space VTT.
- **v0.7.0 (October 22, 2026):** Minor feature and bugfix release: Adversary template deletion and live token artwork replacement (`PATCH /api/adversaries/:id/token`), missing/moved token image fallback resilience, RPG VTT bottom-up red damage and wounded token overlays, and project `README.md` screenshot gallery.
- **v0.6.0 (October 18, 2026):** Minor feature and polish release: Knight Hawks Ship Weapons Selection Modal & canonical 10-weapon catalog, prominent weapon titles with category limitation badges and inline renaming, ship sheet typography/layout refinements, and synchronized VTT dice & roll banner clearing.
- **v0.5.0 (October 17, 2026):** Major minor-feature release: RPG VTT Alpha Dawn vehicle support & tactical Vehicle HUD, Space VTT celestial tokens (asteroids, moons, planets), canonical Alpha Dawn equipment catalog expansion (117 items) with category filter tabs, player self-service password changes, and tabletop dice rolling sound effects.
- **v0.4.0 (October 16, 2026):** Minor feature release: Dynamic Adversary Stocking engine, Adversary Token HUD, AI token art generator & circular ring masking pipeline, and Admin Uploads & Assets File Manager with directory CRUD, file move, atomic database cascades, and real-time canvas asset sync.
- **v0.3.0 (October 16, 2026):** Minor feature release: shared dice rolls & roll log, per-user tab/view state persistence, Knight Hawks spaceship skills, sheet Notes, "Species" terminology, and Map Manager grid controls (dimensions, line thickness, visibility).
- **v0.2.0 (October 4, 2026):** Major feature release: Image Browser & Uploads Explorer, Decoupled Die Roll Log HUDs, Center Token Placement with Collision Avoidance, Map Background Browsing, Dynamic Tab Titles, and Modal Form Simplification.
- **v0.1.1 (September 27, 2026):** Sub-release snapshot: Damage dice totals HUD, single source of truth HP refactor, fog removal, token ring color persistence, character portrait layout, ship token linking, and UI theme alignment.
- **v0.1.0 (September 22, 2026):** Initial stable release: RPG and Space VTTs, 3D physics dice box, character and starship sheets, searchable rulebooks, role-based user management, and sci-fi terminal design.

# Star Frontiers VTT - Release v0.7.0 Summary

**Release Tag:** `v0.7.0`  
**Date:** October 22, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.7.0` is a minor feature and bugfix release introducing **Adversary Template Management & Live Token Artwork Replacement**, **RPG VTT Token Damage & Wounded Red Overlays**, **Missing Token File Resilience**, and **Project Documentation & Screenshot Gallery**.

---

## 2. Included Features & Capabilities in v0.7.0

### Adversary Template Management & Live Token Artwork Replacement
- **Token Artwork Update Endpoint (`PATCH /api/adversaries/:id/token`):**
  - Allows GameMasters to replace an existing adversary template's token image by uploading a new custom image, selecting an asset from the Uploads Library, or generating new AI token art.
  - Automatically applies the circular Threat Tier border ring mask (`generateTokenRingImage`) to standard portrait uploads while preserving pre-ringed assets from `/uploads/tokens/` as-is.
  - Appends a `?v=<timestamp>` cache-buster to `token_image_path` so browsers immediately refresh replaced token artwork.
  - Updates `avatar_url` on all active map tokens spawned from that template (`tokens.template_id = :id`) and broadcasts `adversary:saved` and `token:updated` socket events for real-time canvas synchronization.
- **Template Deletion & Safe Token Decoupling (`DELETE /api/adversaries/:id`):**
  - Added a **🗑️ Delete Template** button on the **Existing Templates** tab of `StockAdversaryModal.vue`.
  - Decouples any already-spawned map tokens (`SET template_id = NULL`) prior to deleting the template row, fixing SQLite foreign key constraint failures when deleting previously spawned templates.
- **Missing / Moved Token File Resilience:**
  - `POST /api/adversaries/spawn` now verifies whether an existing template's token file exists on disk (stripping `?v=` cache query strings) and automatically regenerates fallback circular Threat Tier token art if the file was moved or deleted.
  - `StockAdversaryModal.vue` detects broken preview images (`@error`) and displays a `⚠️ Missing Token Image` warning badge alongside one-click **⬆️ Upload Token**, **📁 Browse Uploads**, and **✨ AI Token Art** controls.

### RPG VTT Token Damage & Wounded Red Overlays
- **Dynamic STA & Wound Visual Feedback (`client/src/utils/tokenDamageOverlay.js` & `VttCanvas.vue`):**
  - **Bloodied (`< 50%` STA) & Wounded PCs (`🩸` / `wounded`):** Renders a transparent bright red linear gradient fading from the bottom of the token up to the middle (`cy - radius * 0.1`).
  - **Critical (`< 20%` STA):** Renders a higher, more intense transparent bright red linear gradient fading from the bottom up to ~82.5% of the token height (`cy - radius * 0.65`).
  - **Dead (`0` STA):** Covers the entire circular token face in a transparent bright red overlay (`rgba(230, 15, 15, 0.62)`) while keeping the outer colored ring and status icons crisp on top.

### Documentation & Visual Showcase
- **Comprehensive `README.md` & Screenshot Gallery (`docs/screenshots/`):**
  - Added project overview, feature highlights across Alpha Dawn and Knight Hawks, quickstart instructions, and an 8-screenshot visual gallery including AI adversary generation, RPG tactical maps, Space VTT combat, character sheets, starship sheets, and searchable rulebooks.

---

## 3. Verification & Test Evidence

All tests and production builds were verified in the `sf-vtt-dev` development container:

- **Server test suite:** 168 / 168 tests across 15 test files passed.
- **Client test suite:** 347 / 347 tests across 36 test files passed.
- **Client production build:** Succeeded cleanly with Vite (`npm run build`).

---

## 4. Release History

- **v0.7.0 (October 22, 2026):** Minor feature and bugfix release: Adversary template deletion and live token artwork replacement (`PATCH /api/adversaries/:id/token`), missing/moved token image fallback resilience, RPG VTT bottom-up red damage and wounded token overlays, and project `README.md` screenshot gallery.
- **v0.6.0 (October 18, 2026):** Minor feature and polish release: Knight Hawks Ship Weapons Selection Modal & canonical 10-weapon catalog, prominent weapon titles with category limitation badges and inline renaming, ship sheet typography/layout refinements, and synchronized VTT dice & roll banner clearing.
- **v0.5.0 (October 17, 2026):** Major minor-feature release: RPG VTT Alpha Dawn vehicle support & tactical Vehicle HUD, Space VTT celestial tokens (asteroids, moons, planets), canonical Alpha Dawn equipment catalog expansion (117 items) with category filter tabs, player self-service password changes, and tabletop dice rolling sound effects.
- **v0.4.0 (October 16, 2026):** Minor feature release: Dynamic Adversary Stocking engine, Adversary Token HUD, AI token art generator & circular ring masking pipeline, and Admin Uploads & Assets File Manager with directory CRUD, file move, atomic database cascades, and real-time canvas asset sync.
- **v0.3.0 (October 16, 2026):** Minor feature release: shared dice rolls & roll log, per-user tab/view state persistence, Knight Hawks spaceship skills, sheet Notes, "Species" terminology, and Map Manager grid controls (dimensions, line thickness, visibility).
- **v0.2.0 (October 4, 2026):** Major feature release: Image Browser & Uploads Explorer, Decoupled Die Roll Log HUDs, Center Token Placement with Collision Avoidance, Map Background Browsing, Dynamic Tab Titles, and Modal Form Simplification.
- **v0.1.1 (September 27, 2026):** Sub-release snapshot: Damage dice totals HUD, single source of truth HP refactor, fog removal, token ring color persistence, character portrait layout, ship token linking, and UI theme alignment.
- **v0.1.0 (September 22, 2026):** Initial stable release: RPG and Space VTTs, 3D physics dice box, character and starship sheets, searchable rulebooks, role-based user management, and sci-fi terminal design.

# Star Frontiers VTT - Release v0.4.0 Summary

**Release Tag:** `v0.4.0`  
**Date:** October 16, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.4.0` is a minor feature release introducing **Dynamic Adversary Stocking** (Star Frontiers Alpha Dawn NPC and Alien Creature generation, procedural Threat Tier 1-5 scaling, and interactive canvas Token HUDs), **AI Token Art Generation with Circular Token Masking**, and a full **Uploads & Assets File Manager** on the Admin panel with directory management, file moving, atomic database cascades, and real-time Socket.io battle map synchronization.

---

## 2. Included Features & Capabilities in v0.4.0

### Dynamic Adversary Stocking Engine & Canvas Drawer HUD
- **Core Math Engine & Validator:** Official Star Frontiers hit percentage calculations (`ceil(DEX / 2) + Skill_Level * 10 + Equipment_Mod`), Initiative Modifiers, and Creature multi-attack arrays.
- **Threat Tier 1-5 Procedural Scaling:** Stat budgets and gear for Alpha Dawn Sentient NPCs (Sathar, Human, Vrusk, Dralasite, Yazirian, Mechanon) and Volturnian Alien Creatures (Small to Very Large, custom attacks and predatory traits).
- **Interactive Click-to-Open Adversary Token HUD:**
  - Mutable top drawer for current/max HP, SEU tracking, and status/condition toggles with real-time server synchronization.
  - Read-only bottom reference card displaying adversary actions, traits, and combat statistics with interactive percentile attack rolls and damage rolls.
- **Stock Adversary Modal:** GM interface for browsing existing adversary templates or procedurally crafting custom encounters and spawning $N$ numbered token instances directly onto the active battle map.
- **Encounter Stocking Skill:** Workspace automation skill (`.agents/skills/stock-encounter/SKILL.md`) and CLI runner (`scripts/stock-encounter.js`).

### AI Token Art Generation & Circular Token Pipeline
- **AI Art Generation:** Integrated prompt builder and generation service for Star Frontiers characters and creatures with OpenAI DALL-E and free-tier Pollinations.ai providers.
- **Rate Limit & Cooldown Protection:** Automatic short-wait retry (≤ 8s) for free tier rate limits, countdown timer, and cooldown feedback on UI generation buttons.
- **Procedural Token Border Rings:** Clean circular masking pipeline with color-coded Threat Tier border rings (Tier 1 Green, Tier 2 Blue, Tier 3 Purple, Tier 4 Gold, Tier 5 Crimson) outputting battle-ready WebP/PNG tokens.

### Admin Uploads & Assets File Manager
- **Rooted at `/uploads/`:** Complete file and folder management on the Admin panel (`/dashboard/admin`) restricted strictly to GameMasters.
- **Directory Lifecycle:** Create subdirectories (`POST /api/upload/folder`) with recursive parent support; delete empty directories (`DELETE /api/upload/folder`) with non-empty directory and root folder protections.
- **Move Files Between Folders:** Move files across directories (`PUT /api/upload/move`) with destination folder dropdown selection and collision prevention (HTTP 409).
- **Atomic Database Cascades:** File rename and move operations atomically cascade across all 5 referencing database tables:
  1. `tokens.avatar_url`
  2. `maps.background_url`
  3. `adversary_templates.token_image_path`
  4. `character_sheets.avatar_url`
  5. `ship_sheets.avatar_url`
- **Real-Time Battle Map Synchronization:** Canvas components (`VttCanvas.vue` and `SpaceVttCanvas.vue`) listen to `token:asset-renamed`, `token:asset-deleted`, `map:asset-renamed`, and `map:asset-deleted` to update tokens and active map backgrounds in-place without redraw flicker.
- **Image Browser Quick Actions:** In-situ rename (✏️) and delete (🗑️) action buttons directly on image cards in `ImageBrowserModal.vue` for GameMasters.

---

## 3. Verification & Test Evidence

All tests and the production build were verified in the `sf-vtt-dev` container:

- **Server test suite:** 139 / 139 tests across 12 test files passed.
- **Client test suite:** 236 / 236 tests across 26 test files passed.
- **Client production build:** succeeded cleanly with Vite (`npm run build`).

---

## 4. Release History

- **v0.4.0 (October 16, 2026):** Minor feature release: Dynamic Adversary Stocking engine, Adversary Token HUD, AI token art generator & circular ring masking pipeline, and Admin Uploads & Assets File Manager with directory CRUD, file move, atomic database cascades, and real-time canvas asset sync.
- **v0.3.0 (October 16, 2026):** Minor feature release: shared dice rolls & roll log, per-user tab/view state persistence, Knight Hawks spaceship skills, sheet Notes, "Species" terminology, and Map Manager grid controls (dimensions, line thickness, visibility).
- **v0.2.0 (October 4, 2026):** Major feature release: Image Browser & Uploads Explorer, Decoupled Die Roll Log HUDs, Center Token Placement with Collision Avoidance, Map Background Browsing, Dynamic Tab Titles, and Modal Form Simplification.
- **v0.1.1 (September 27, 2026):** Sub-release snapshot: Damage dice totals HUD, single source of truth HP refactor, fog removal, token ring color persistence, character portrait layout, ship token linking, and UI theme alignment.
- **v0.1.0 (September 22, 2026):** Initial stable release: RPG and Space VTTs, 3D physics dice box, character and starship sheets, searchable rulebooks, role-based user management, and sci-fi terminal design.

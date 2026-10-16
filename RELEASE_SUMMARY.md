# Star Frontiers VTT - Release v0.3.0 Summary

**Release Tag:** `v0.3.0`  
**Date:** October 16, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.3.0` is a minor feature release. Dice rolls and the roll log are now shared in real time between all connected users, every user's tab and view state is remembered, character sheets gain the Knight Hawks spaceship skills, and both tabletops get richer per-map grid controls.

---

## 2. Included Features & Capabilities in v0.3.0

### Shared Dice Rolls & Roll Log
- New `roll_logs` table and `GET/POST/DELETE /api/rolls` endpoints, with `roll:created` / `roll:cleared` Socket.io broadcasts.
- Percentile and damage rolls appear on every connected user's HUD banner and Roll Log, attributed to the roller (name and GM/Player badge). 3D dice physics still roll only on the roller's own screen.
- RPG VTT and Space VTT keep separate logs; only the GameMaster can clear a log.
- 3D dice canvas and HUD banners now render above page widgets.

### Per-User Tab & View State Persistence
- Each user's last dashboard tab is restored on login/reload.
- RPG VTT and Space VTT restore pan, zoom, active tool, selected token and roll-log open state.
- Character Sheets and Ship Sheets restore the selected sheet and scroll positions; Rulebooks restores view mode, PDF book/page, filters and search.
- State is stored per user ID; high-frequency writes (panning, scrolling) are debounced.

### Character & Ship Sheets
- **Knight Hawks spaceship skills:** Piloting, Astrogation, Engineering and Gunnery with official flat XP costs and Reaction Speed base chance support.
- **Notes:** a free-form "Notes" box on both character and ship sheets.
- **Species:** user-facing "Race" labels renamed to "Species".
- **Custom species** option for character sheets.
- Stasis Screen added to the ship defenses combat reference.

### Map Manager Grid Controls (RPG VTT & Space VTT, per map)
- **Grid Dimensions:** editable Width and Height dropdowns (preset values or manual entry, 5-100).
- **Grid Line Thickness:** 0.1-10 px, so lines can be made thinner on small maps.
- **Show Grid Lines:** hide the grid while tokens still snap to it.
- Supported by new `grid_line_width` and `grid_visible` map columns, migrated automatically.

---

## 3. Verification & Test Evidence

All tests and the production build were run in the `sf-vtt-dev` container before tagging:

- **Server test suite:** 88 / 88 tests across 7 test files passed.
- **Client test suite:** 194 / 194 tests across 23 test files passed.
- **Client production build:** succeeded (`vite build`).

---

## 4. Release History

- **v0.3.0 (October 16, 2026):** Minor feature release: shared dice rolls & roll log, per-user tab/view state persistence, Knight Hawks spaceship skills, sheet Notes, "Species" terminology, and Map Manager grid controls (dimensions, line thickness, visibility).
- **v0.2.0 (October 4, 2026):** Major feature release: Image Browser & Uploads Explorer, Decoupled Die Roll Log HUDs, Center Token Placement with Collision Avoidance, Map Background Browsing, Dynamic Tab Titles, and Modal Form Simplification.
- **v0.1.1 (September 27, 2026):** Sub-release snapshot: Damage dice totals HUD, single source of truth HP refactor, fog removal, token ring color persistence, character portrait layout, ship token linking, and UI theme alignment.
- **v0.1.0 (September 22, 2026):** Initial stable release: RPG and Space VTTs, 3D physics dice box, character and starship sheets, searchable rulebooks, role-based user management, and sci-fi terminal design.

---

## 5. How to Fall Back or Inspect This Release

```bash
# Check out the tagged release in a detached HEAD state:
git checkout v0.3.0

# Or create a new branch from this release point:
git checkout -b release-v0.3.0 v0.3.0
```

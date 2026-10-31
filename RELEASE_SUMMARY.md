# Star Frontiers VTT - Release v0.12.6 Summary

**Release Tag:** `v0.12.6`  
**Date:** October 30, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.12.6` focuses on visual polish, theme consistency, and UI control fixes across the virtual tabletop. It darkens the character sheet SEU energy pool bar to align with the visual weight and luminance of the STA bar, resolves a background arrow tiling defect on custom `<select>` dropdown controls in character and ship sheets, restyles the GM Admin and GM Sessions applets to use the core VTT green, aqua, and teal palette, and removes the emoji icon from the GM Sessions drawer header.

All automated test suites (729 client tests across 54 files, and 256 server tests across 19 suites) pass with 100% compliance, and the client production build compiles cleanly.

---

## 2. Key Enhancements in v0.12.6

### Character Sheet SEU Energy Bar Harmonization
- **Darkened Luminance & Visual Weight:**
  - Darkened the SEU energy pool bar in [CharacterSheetsView.vue](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue) so its visual brightness is closely harmonized with the darkened STA stamina bar.
  - High SEU (>50%): Darkened base color to `#0097a7` with gradient `linear-gradient(90deg, #0097a7, #00838f)` and border `rgba(0, 151, 167, 0.5)`.
  - Mid SEU (>25%): Darkened base color to `#ff9800` with gradient `linear-gradient(90deg, #ff9800, #f57c00)` and border `rgba(255, 152, 0, 0.5)`.
  - Low SEU (<=25%): Darkened base color to `#f44336` with gradient `linear-gradient(90deg, #f44336, #d32f2f)` and border `rgba(244, 67, 54, 0.5)`.

### Form Dropdown Chevron Hardening & Anti-Tiling
- **Global & View-Level `<select>` Background Prevention:**
  - Fixed an issue where opening native `<select>` dropdowns (such as the Primary Skill Area selector in the `+ New Character` modal, or Ship Type selectors) caused custom SVG chevrons to tile repeatedly across the open menu.
  - Enforced `background-repeat: no-repeat !important`, `background-position: calc(100% - 10px) center !important`, and `background-size: 14px 10px !important` globally in [main.css](file:///Users/jrf/star-frontiers-vtt/client/src/main.css).
  - Explicitly stripped background images on `<option>` and `<optgroup>` tags (`background-image: none !important`) so OS dropdown viewports do not inherit parent arrow backgrounds.
  - Replaced shorthand `background: #000000` resets with explicit `background-color` and ensured standardized `padding-right: 28px !important` across `.input-type-select`, `.preset-select`, `.status-select`, `.select-race`, `.select-psa`, and `.select-official-skill`.

### GM Admin & GM Sessions Palette Realignment
- **Teal / Aqua Theme Integration:**
  - Restyled [AdminView.vue](file:///Users/jrf/star-frontiers-vtt/client/src/views/AdminView.vue) and [GmNotesView.vue](file:///Users/jrf/star-frontiers-vtt/client/src/views/GmNotesView.vue) to match the dark teal, aqua, and green aesthetic of the VTT interface.
  - Replaced legacy blue button backgrounds, borders, and hover states (`#1976d2`, `#2196f3`, `#0d47a1`) with dark cyan/aqua tones (`background: #082d33`, `border: 1px solid #2394a6`, `color: #00ffff`).
  - Standardized all headers, card titles, text elements, and input labels to `#cecece` and `#00ffff`.
  - Removed the notebook emoji icon (`📓`) from the `<h3>GM Sessions</h3>` sidebar header in [GmNotesView.vue](file:///Users/jrf/star-frontiers-vtt/client/src/views/GmNotesView.vue).

---

## 3. Verification & Test Metrics

- **Client Test Suite**: 54 test files passed, 729 total tests passed (100% passing).
- **Server Test Suite**: 19 test files passed, 256 total tests passed (100% passing).
- **Client Build**: Clean Vite production bundle compilation (`sf-vtt-client@0.12.6`).
- **Services**: Dev server container `sf-vtt-dev` verified running with backend (port 3000) and frontend (port 3001) operational.

---

## 4. Git Artifacts & History

- Tag: `v0.12.6`
- Previous Tag: `v0.12.5`

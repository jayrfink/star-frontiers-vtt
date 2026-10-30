# Star Frontiers VTT - Release v0.12.2 Summary

**Release Tag:** `v0.12.2`  
**Date:** October 29, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.12.2` enhances character sheet energy management with revamped Standard Energy Unit (SEU) stepper controls and a dedicated one-click SEU Reload action. The reload action is positioned and styled in full visual parity with the Stamina Full Rest control.

All automated test suites (256 server tests across 19 suites) pass with 100% compliance, and the client production build compiles cleanly.

---

## 2. Key Enhancements in v0.12.2

### SEU Quick-Step Controls
- **Reordered & Expanded Stepper Buttons:**
  - Updated fixed SEU decrement/increment stepper buttons from `-1, -2, -5, +5` to `-5, -1, +1, +5` in `CharacterSheetsView.vue`.
  - Tuned to common Star Frontiers combat costs (Heavy Laser / Screen at `-5`, Laser Pistol / Stunner at `-1`) and fast incremental recharges (`+1`, `+5`).
  - Added descriptive tooltip titles for each button.

### One-Click SEU Reload
- **Instant Power Pack Reload:**
  - Added `⚡ Reload` (`reloadSeu()`) action restoring `current_seu` directly to `max_seu` without modifying stamina or other character statistics.
  - Automatically bounds and clamps energy within `[0, max_seu]` and immediately persists to backend storage and websocket state.
- **Visual & Layout Parity with Full Rest:**
  - Positioned `⚡ Reload` in `.seu-header-right` immediately adjacent to the SEU numeric display (`current / max SEU`), exactly mirroring the placement of `🔄 Full Rest` in `.stamina-header-right`.
  - Unified styling with `.btn-action-reset` featuring the translucent sci-fi cyan highlight theme (`#38bdf8`) and hover glow effects.

### OpenSpec Change Integration
- Fully tracked and applied through OpenSpec change `seu-quick-buttons-and-reload`.

---

## 3. Verification & Test Metrics

- **Server Test Suite**: 19 test files passed, 256 total tests passed (100% passing).
- **Client Build**: Clean Vite production bundle compilation with zero errors or warnings.
- **Service Verification**: Backend API (port 3000) and Frontend UI (port 3001) verified running and responding.

---

## 4. Git Artifacts & History

- Tag: `v0.12.2`
- Previous Tag: `v0.12.1`

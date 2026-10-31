# Star Frontiers VTT - Release v0.12.5 Summary

**Release Tag:** `v0.12.5`  
**Date:** October 30, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.12.5` introduces official Star Frontiers character Tier and Knight Hawks starship Hull Size badges, modernizes and themes all number input steppers and select arrow widgets to match the dark sci-fi aesthetic, unifies font color across all views and fill-in fields to `#cecece`, refines toolbar button styling and modal color schemes, removes distracting emoji icons from drawer headers and action buttons, and enhances the `sf-vtt-ctl.sh` process manager with automatic OrbStack/Docker daemon detection and launch.

All automated test suites (723 client tests across 54 files, and 256 server tests across 19 suites) pass with 100% compliance, and the client production build compiles cleanly.

---

## 2. Key Enhancements in v0.12.5

### Character Sheet Tier & Starship Hull Size Badges
- **Player Character Tier Badges:**
  - Added a `.badge-tier` (`Tier {{ characterTier }}`) next to the PSA selector on character sheets and in sidebar list sub-labels.
  - Implements rulebook-accurate Skill Level tier benchmarks (Tier 1 starting/novice through Tier 5 master) with explicit `tier`/`threat_tier` overrides.
  - Styled to match the Full Rest / Reload badge palette (`background: rgba(56, 189, 248, 0.15)`, `border: 1px solid rgba(56, 189, 248, 0.4)`, `color: #38bdf8`).
- **Starship Hull Size Badges:**
  - Added a `.badge-hull-size` (`Hull Size {{ shipHullSize }}`) next to the Class Preset selector on starship sheets and in the sidebar list.
  - Defined official Knight Hawks hull sizes (Fighter: 1, Assault Scout: 3, Corvette: 4, Frigate: 5, Destroyer: 6, Minelayer: 7, Light Cruiser: 14, Heavy Cruiser: 16, Assault Carrier: 15, Battleship: 20, Freighters: 5–15, Space Station: 1) with fallback HP calculation (`Math.round(HP / 5)`).

### Sci-Fi Themed Number Steppers & Form Controls
- **Custom Spin Buttons:**
  - Enforced `color-scheme: dark` globally on `:root`, inputs, selects, and textareas, preventing the browser from falling back to light OS-default controls.
  - Styled `::-webkit-inner-spin-button` and `::-webkit-outer-spin-button` with a themed cyan filter (`sepia(100%) saturate(300%) hue-rotate(135deg) brightness(1.2)`) and glowing focus/hover state.
- **Custom Select Dropdown Chevrons:**
  - Replaced native OS dropdown arrows on `<select>` elements with clean sci-fi cyan dual-chevron SVG indicators (`#00ffff` / `#38bdf8`).

### Unified `#cecece` Font Theming
- **Global & View-Level Font Harmonization:**
  - Updated `--text-primary` from `#e6edf3` to `#cecece` in `main.css`.
  - Replaced all raw white and near-white font colors (`#ffffff`, `#fff`, `white`, `#f0f6fc`, `#f8fafc`, `#f1f5f9`, `#e6edf3`, `#e2e8f0`, `#e0e0e0`, `#d0d0d0`, `#c9d1d9`, `#cbd5e1`) across 128 locations in 15 files with `#cecece`.
  - Standardized font color across all fill-in inputs, textareas, headers, and modal fields.

### UI & Control Bar Polish
- **Button Border & Icon Cleanups:**
  - Updated button borders on GM Map Manager, Stock Adversary, and Deploy Vehicle buttons to `#2394a6`.
  - Removed emoji icons from GM Map Manager, Stock Adversary, Deploy Vehicle, and Tokens buttons.
  - Removed target icon (`🎯`) from Token Inspector drawer headers in RPG and Space VTTs.
  - Harmonized the Stock Adversary and Deploy Vehicle modal applets with dark gray, blue, and green interface styling.

### Service & Control Script Resilience (`sf-vtt-ctl.sh`)
- Enhanced `sf-vtt-ctl.sh` to automatically detect if Docker/OrbStack daemon is running and attempt auto-launch via `open -a OrbStack` or `open -a Docker` with graceful timeout and troubleshooting diagnostics.

---

## 3. Verification & Test Metrics

- **Client Test Suite**: 54 test files passed, 723 total tests passed (100% passing).
- **Server Test Suite**: 19 test files passed, 256 total tests passed (100% passing).
- **Client Build**: Clean Vite production bundle compilation (`sf-vtt-client@0.12.5`).
- **Services**: Dev server container `sf-vtt-dev` verified running with backend (port 3000) and frontend (port 3001) operational.

---

## 4. Git Artifacts & History

- Tag: `v0.12.5`
- Previous Tag: `v0.12.4`

# Star Frontiers VTT - Release v0.12.4 Summary

**Release Tag:** `v0.12.4`  
**Date:** October 29, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.12.4` upgrades the tactical visual styling of combat initiative results across both the RPG and Space VTTs, adding glowing ambient box shadows and text glows to the floating initiative HUD banner, die result cards, and roll log outcome pills to match the visual presentation of percentile and damage rolls.

All automated test suites (702 client tests across 52 files, and 256 server tests across 19 suites) pass with 100% compliance, and the client production build compiles cleanly.

---

## 2. Key Enhancements in v0.12.4

### Glowing Initiative HUD Banner
- **Visual Parity with Percentile & Damage Banners:**
  - Upgraded `.initiative-hud-banner` border to `2px solid #b5eeff`.
  - Added sci-fi ambient glow box shadow:
    `box-shadow: 0 0 20px rgba(181, 238, 255, 0.45), 0 8px 32px rgba(0, 0, 0, 0.8)`.
  - Added subtle text-shadow glow effects to header title and close buttons.

### Die Result Cards & Number Glows
- **Player Die Glow (`.init-player-die`):**
  - Card box-shadow: `0 0 12px rgba(181, 238, 255, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.1)`.
  - Number text-shadow: `0 0 10px rgba(181, 238, 255, 0.7)` on `.init-val`.
- **Opposition Die Glow (`.init-opp-die`):**
  - Card box-shadow: `0 0 12px rgba(201, 171, 185, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.1)`.
  - Number text-shadow: `0 0 10px rgba(201, 171, 185, 0.7)` on `.init-val`.

### Roll Log Pills & Badge Accents
- Added color-matched glow highlights (`box-shadow: 0 0 6px ...`) to `.init-pill-player`, `.init-pill-opp`, and `.roll-log-item.initiative .roll-item-badge`.

---

## 3. Verification & Test Metrics

- **Client Test Suite**: 52 test files passed, 702 total tests passed (100% passing).
- **Server Test Suite**: 19 test files passed, 256 total tests passed (100% passing).
- **Client Build**: Clean Vite production bundle compilation (`sf-vtt-client@0.12.4`).
- **Services**: Dev server container `sf-vtt-dev` verified running with backend (port 3000) and frontend (port 3001) operational.

---

## 4. Git Artifacts & History

- Tag: `v0.12.4`
- Previous Tag: `v0.12.3`

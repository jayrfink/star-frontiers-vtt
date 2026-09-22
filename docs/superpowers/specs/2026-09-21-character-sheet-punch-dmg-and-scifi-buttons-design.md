# Design Specification: Character Sheet Punch Damage Removal & Sci-Fi Button Styling

**Date:** 2026-09-21  
**Status:** Approved  

---

## 1. Overview & Purpose
1. **Remove Erroneous "Punch Dmg"**: The tactical sub-stats bar on `CharacterSheetsView.vue` currently shows an erroneous `Punch Dmg: Xd6` (Star Frontiers uses D10s and flat STR-bracketed punch damage, which is already correctly documented in the Quick Reference Tables). This block will be completely removed.
2. **Sci-Fi Glow Button Aesthetic**: Transform buttons across the application (in `client/src/main.css` and local views) into a cohesive, futuristic sci-fi terminal theme using glowing cyan/aqua, space blue, and emerald/matrix green accents with neon box-shadows.

---

## 2. Component & Style Changes

### 2.1 Character Sheet Updates (`client/src/views/CharacterSheetsView.vue`)
- In `<section class="tactical-bar card">`: Remove the `<div class="tactical-stat">` displaying `Punch Dmg`.
- Adjust the grid layout for `.tactical-bar` from `repeat(4, 1fr) 2fr` to `repeat(3, 1fr) 2fr` (for IM, Melee Base Hit, Movement, and Encumbrance) so remaining stats are cleanly balanced.
- Clean up unused `derivedPunchDmg` computed property and `calcPunchDamage` import.

### 2.2 Global Sci-Fi Button Theme (`client/src/main.css`)
- **Theme Variables**:
  - `--sci-blue: #0ea5e9`
  - `--sci-cyan: #06b6d4`
  - `--sci-aqua: #14b8a6`
  - `--sci-green: #10b981`
  - `--glow-cyan: 0 0 12px rgba(6, 182, 212, 0.45)`
  - `--glow-cyan-hover: 0 0 18px rgba(6, 182, 212, 0.7)`
  - `--glow-green: 0 0 12px rgba(16, 185, 129, 0.45)`
  - `--glow-green-hover: 0 0 18px rgba(16, 185, 129, 0.7)`
- **Base `button` & `.btn-secondary`**:
  - Sleek dark slate/cyan tinted background (`#131e2b`).
  - Subtle cyan/teal border (`1px solid rgba(6, 182, 212, 0.35)`).
  - Hover: subtle cyan border brightening and soft cyan glow (`box-shadow: 0 0 10px rgba(6, 182, 212, 0.35)`).
- **Primary Action Buttons (`button.primary`, `.btn-primary`)**:
  - Electric sci-fi gradient: `linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #14b8a6 100%)`.
  - Radiant aqua/cyan glow: `box-shadow: 0 0 14px rgba(6, 182, 212, 0.5)`.
  - Hover: brighter neon glow, slight elevation, and color shimmer.
- **Success / Upgrade Buttons (`.btn-xp-upgrade`, `.btn-success`)**:
  - Matrix/emerald green gradient: `linear-gradient(135deg, #059669 0%, #10b981 100%)` with neon emerald glow (`box-shadow: 0 0 12px rgba(16, 185, 129, 0.5)`).
- **Active / Toggle States (`.active`, `.btn-tool.active`, `.mode-toggle button.active`)**:
  - High-visibility cyber cyan glow with crisp borders.

---

## 3. Verification & Testing
- Vitest unit tests in `client`: Ensure all existing component tests pass with updated markup.
- Vite build verification: Ensure clean compilation with no syntax errors.
- Visual inspection via browser: Hard refresh and verify the sleek sci-fi button appearance across Character Sheets, Ship Sheets, VTTs, and Rulebooks.

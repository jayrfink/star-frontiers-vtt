# Design Spec: Sheet Title Blending, 20% Bluer Header Glow, and Ship Header/Stat Fields Alignment

**Date:** 2026-11-07  
**Status:** Approved by user

---

## 1. Overview
This specification details five visual alignment updates for Character and Ship Sheets:
1. Blending the text box of Ship sheets title and Character sheets title into their card background (`background: transparent; border: 1px solid transparent;`).
2. Adding the SFVTT header triple glow to both title inputs, shifted 20% more blue (`rgba(6, 150, 230, ...)`).
3. Aligning the Class Preset field on Ship sheets to match the Character Species field (`#c0c0c0` font color, `#30363d` border).
4. Aligning the Player field on Ship sheets to match the Player field on Character sheets (`#c0c0c0` font color, `#30363d` border).
5. Setting the ADF and MR values on Ship sheets to `#d0d0d0` while keeping the spinner arrows as is.

---

## 2. Title Text Box & Bluer SFVTT Glow

### 2.1 Files
- `client/src/views/CharacterSheetsView.vue`
- `client/src/views/ShipSheetsView.vue`

### 2.2 Styling
- Target: `.input-name`
- Card background blending:
  - `background: transparent;`
  - `border: 1px solid transparent;`
  - Focus state: `outline: none; background: rgba(13, 17, 23, 0.4); border-color: rgba(6, 150, 230, 0.4);`
- 20% Bluer SFVTT Glow:
  - Base SFVTT glow: `0 0 8px rgba(6, 182, 212, 0.9), 0 0 16px rgba(6, 182, 212, 0.7), 0 0 24px rgba(6, 182, 212, 0.5)`
  - 20% more blue: `text-shadow: 0 0 8px rgba(6, 150, 230, 0.9), 0 0 16px rgba(6, 150, 230, 0.7), 0 0 24px rgba(6, 150, 230, 0.5);`

---

## 3. Class Preset & Player Fields Alignment (Ship Sheets)

### 3.1 File
- `client/src/views/ShipSheetsView.vue`

### 3.2 Styling
- Target: `.input-type-select` and `.select-player`
- Palette matching Character Sheets:
  - `background-color: #000000 !important;`
  - `color: #c0c0c0 !important;`
  - `-webkit-text-fill-color: #c0c0c0;`
  - `border: 1px solid #30363d !important;`
  - Focus: `border-color: #8b949e !important; box-shadow: 0 0 4px rgba(255, 255, 255, 0.15);`

---

## 4. ADF & MR Values Styling

### 4.1 File
- `client/src/views/ShipSheetsView.vue`

### 4.2 Styling
- Target: `.stat-input`
- Font color: `color: #d0d0d0;`
- Spinner arrows (`::-webkit-inner-spin-button`) retain their custom filter/opacity rules untouched.

---

## 5. Verification & Testing
- Unit tests in `client/test/CharacterSheetsView.test.js` and `client/test/ShipSheetsView.test.js` verifying the updated styles.
- Full Vitest test suite (`cd client && npx vitest run`) verifying 905+ tests passing.

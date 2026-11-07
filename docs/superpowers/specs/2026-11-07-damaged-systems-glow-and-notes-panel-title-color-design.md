# Design Spec: Damaged Systems Reddish Glow and Notes Panel Title Color

**Date:** 2026-11-07  
**Status:** Approved by user

---

## 1. Overview
This specification covers two styling refinements:
1. Adding a reddish glow to selected damaged systems on the Ship Sheets System Status card (`.system-btn.is-damaged`).
2. Setting the font color of individual note panel titles (e.g. History, Notes, etc.) on all note cards across Character Sheets, Ship Sheets, and GM Notes to `#c3c3c3`, leaving the section header (`.notes-section h4`) untouched.

---

## 2. System Status Damaged Systems Glow

### 2.1 File
- `client/src/views/ShipSheetsView.vue`

### 2.2 Styling Details
- Target: `.system-btn.is-damaged`
- Properties:
  - `box-shadow: 0 0 8px rgba(248, 81, 73, 0.5), inset 0 0 6px rgba(248, 81, 73, 0.25);`
  - `text-shadow: 0 0 6px rgba(248, 81, 73, 0.5);`
- Hover state (`.system-btn.is-damaged:hover`):
  - `box-shadow: 0 0 12px rgba(248, 81, 73, 0.7), inset 0 0 8px rgba(248, 81, 73, 0.35);`

---

## 3. Notes Panel Title Font Color

### 3.1 Files
- `client/src/views/CharacterSheetsView.vue`
- `client/src/views/ShipSheetsView.vue`
- `client/src/views/GmNotesView.vue`

### 3.2 Styling Details
- Target: `.panel-title-input`
- Property: `color: #c3c3c3;` (changed from `#00ffff`)
- Constraint: Do NOT change `.notes-section h4` (preserve `#45acba`).

---

## 4. Verification & Testing
- Unit tests in `client/test/ShipSheetsView.test.js`, `client/test/CharacterSheetsView.test.js`, and `client/test/GmNotesView.test.js` verifying the red glow and title color `#c3c3c3`.
- Run full Vitest suite (`cd client && npx vitest run`) to confirm all 903+ tests pass.

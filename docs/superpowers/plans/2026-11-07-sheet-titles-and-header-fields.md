# Sheet Title Blending, Bluer SFVTT Glow, and Header Fields Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Blend Character & Ship sheet title text boxes into card background with a 20% bluer SFVTT triple glow, align Class Preset and Player fields on Ship sheets with Character sheets (#c0c0c0 font, #30363d border), and set ADF/MR values to #d0d0d0.

**Architecture:** Update CSS rules in `CharacterSheetsView.vue` and `ShipSheetsView.vue`. Verify with Vitest unit tests.

**Tech Stack:** Vue 3, Scoped CSS, Vitest.

## Global Constraints
- `.input-name`: `background: transparent; border: 1px solid transparent; text-shadow: 0 0 8px rgba(6, 150, 230, 0.9), 0 0 16px rgba(6, 150, 230, 0.7), 0 0 24px rgba(6, 150, 230, 0.5);`
- `.input-type-select` and `.select-player` in ShipSheetsView: `color: #c0c0c0 !important; border: 1px solid #30363d !important;`
- `.stat-input` in ShipSheetsView: `color: #d0d0d0;` (preserve spinner arrows)

---

### Task 1: Character Sheets Title Blending & Bluer Glow

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue`
- Test: `client/test/CharacterSheetsView.test.js`

- [ ] **Step 1: Write test assertions for .input-name blending and bluer glow**
  In `client/test/CharacterSheetsView.test.js`:
  - Assert `.input-name` has `background:\s*transparent` and `border:\s*1px\s+solid\s+transparent`.
  - Assert `.input-name` has `text-shadow` containing `rgba(6, 150, 230, 0.9)`.

- [ ] **Step 2: Run test to observe failure**
  Run `cd client && npx vitest run test/CharacterSheetsView.test.js`.

- [ ] **Step 3: Update .input-name in CharacterSheetsView.vue**
  Update `.input-name` and `.input-name:focus` styles.

- [ ] **Step 4: Run test to verify it passes**
  Run `cd client && npx vitest run test/CharacterSheetsView.test.js`.

- [ ] **Step 5: Commit changes**
  Run `git commit -am "style: blend character sheet title into card and add bluer SFVTT glow"`.

---

### Task 2: Ship Sheets Title Blending, Bluer Glow, Preset/Player Fields, and ADF/MR Values

**Files:**
- Modify: `client/src/views/ShipSheetsView.vue`
- Test: `client/test/ShipSheetsView.test.js`

- [ ] **Step 1: Write test assertions for ShipSheetsView title, fields, and ADF/MR values**
  In `client/test/ShipSheetsView.test.js`:
  - Assert `.input-name` has `background:\s*transparent` and bluer glow.
  - Assert `.input-type-select` and `.select-player` have `color: #c0c0c0` and `border: 1px solid #30363d`.
  - Assert `.stat-input` has `color: #d0d0d0`.

- [ ] **Step 2: Run test to observe failure**
  Run `cd client && npx vitest run test/ShipSheetsView.test.js`.

- [ ] **Step 3: Update styling in ShipSheetsView.vue**
  - Update `.input-name` to blend into card and use `rgba(6, 150, 230, ...)`.
  - Update `.input-type-select` and `.select-player` to `#c0c0c0` and `#30363d`.
  - Update `.stat-input` to `color: #d0d0d0;`.

- [ ] **Step 4: Run test to verify it passes**
  Run `cd client && npx vitest run test/ShipSheetsView.test.js`.

- [ ] **Step 5: Commit changes**
  Run `git commit -am "style: update ship title blending, header fields, and ADF/MR values"`.

---

### Task 3: Full Test Suite Verification

**Files:**
- All client tests

- [ ] **Step 1: Run full vitest suite**
  Run `cd client && npx vitest run`.
  Verify all 62 test files and 905+ tests pass cleanly.

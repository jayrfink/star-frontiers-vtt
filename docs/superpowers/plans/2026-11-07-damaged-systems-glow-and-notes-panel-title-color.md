# Damaged Systems Red Glow and Notes Panel Title Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reddish glow to selected damaged systems on the System Status card in Ship Sheets, and change individual note panel titles to font color `#c3c3c3` across Character Sheets, Ship Sheets, and GM Notes while preserving the Notes header.

**Architecture:** Update CSS in `ShipSheetsView.vue`, `CharacterSheetsView.vue`, and `GmNotesView.vue`. Verify with Vitest test assertions.

**Tech Stack:** Vue 3, Scoped CSS, Vitest.

## Global Constraints
- Selected damaged system button: `.system-btn.is-damaged` must have `box-shadow: 0 0 8px rgba(248, 81, 73, 0.5), inset 0 0 6px rgba(248, 81, 73, 0.25); text-shadow: 0 0 6px rgba(248, 81, 73, 0.5);`
- Individual note panel title input: `.panel-title-input` font color must be `#c3c3c3`.
- Do NOT change Notes header (`.notes-section h4` must remain `#45acba`).

---

### Task 1: Damaged Systems Reddish Glow & Ship Sheets Note Title Color

**Files:**
- Modify: `client/src/views/ShipSheetsView.vue`
- Test: `client/test/ShipSheetsView.test.js`

- [ ] **Step 1: Add test assertions for red glow on .system-btn.is-damaged and #c3c3c3 on .panel-title-input**
  In `client/test/ShipSheetsView.test.js`:
  - Assert `.system-btn.is-damaged` has `box-shadow: 0 0 8px rgba(248, 81, 73, 0.5)`.
  - Assert `.panel-title-input` has `color: #c3c3c3`.

- [ ] **Step 2: Run test to observe failure**
  Run `cd client && npx vitest run test/ShipSheetsView.test.js`.

- [ ] **Step 3: Update styling in ShipSheetsView.vue**
  - Add `box-shadow: 0 0 8px rgba(248, 81, 73, 0.5), inset 0 0 6px rgba(248, 81, 73, 0.25);` and `text-shadow: 0 0 6px rgba(248, 81, 73, 0.5);` to `.system-btn.is-damaged`.
  - Update `.system-btn.is-damaged:hover` to `box-shadow: 0 0 12px rgba(248, 81, 73, 0.7), inset 0 0 8px rgba(248, 81, 73, 0.35);`.
  - Change `.panel-title-input` `color: #00ffff;` to `color: #c3c3c3;`.

- [ ] **Step 4: Run test to verify it passes**
  Run `cd client && npx vitest run test/ShipSheetsView.test.js`.

- [ ] **Step 5: Commit changes**
  Run `git commit -am "style: add red glow to damaged ship systems and update note panel title color in ShipSheetsView"`.

---

### Task 2: Character Sheets and GM Notes Note Panel Title Color

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue`
- Modify: `client/src/views/GmNotesView.vue`
- Test: `client/test/CharacterSheetsView.test.js`
- Test: `client/test/GmNotesView.test.js`

- [ ] **Step 1: Add test assertions for #c3c3c3 on .panel-title-input**
  In `client/test/CharacterSheetsView.test.js` and `client/test/GmNotesView.test.js`:
  - Assert `.panel-title-input` has `color: #c3c3c3`.
  - Verify `.notes-section h4` remains `#45acba`.

- [ ] **Step 2: Run tests to observe failure**
  Run `cd client && npx vitest run test/CharacterSheetsView.test.js test/GmNotesView.test.js`.

- [ ] **Step 3: Update styling in CharacterSheetsView.vue and GmNotesView.vue**
  Change `.panel-title-input` `color: #00ffff;` to `color: #c3c3c3;` in both files.

- [ ] **Step 4: Run tests to verify they pass**
  Run `cd client && npx vitest run test/CharacterSheetsView.test.js test/GmNotesView.test.js`.

- [ ] **Step 5: Commit changes**
  Run `git commit -am "style: update note panel title color to #c3c3c3 in CharacterSheetsView and GmNotesView"`.

---

### Task 3: Full Test Suite Verification

**Files:**
- All client tests

- [ ] **Step 1: Run full vitest suite**
  Run `cd client && npx vitest run`.
  Verify all 62 test files and 903+ tests pass.

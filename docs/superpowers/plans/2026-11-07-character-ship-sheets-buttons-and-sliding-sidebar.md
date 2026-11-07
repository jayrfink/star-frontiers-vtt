# Character & Ship Sheet Action Buttons & Sliding Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recoloring action buttons to match the selected sheet card palette and adding a collapsible sliding navigation panel with floating chevron edge toggle tabs to both Character and Ship Sheets.

**Architecture:** Update Vue 3 SFCs (`CharacterSheetsView.vue` and `ShipSheetsView.vue`) with active-character button theming and a CSS margin-left / cubic-bezier transition controlled by a reactive `isSidebarCollapsed` state. Floating edge button stays accessible at the screen border when collapsed.

**Tech Stack:** Vue 3 Options API, CSS scoped transitions, Vitest unit testing.

## Global Constraints
- Button active-character palette: `background: #05282e !important; border: 1px solid aquamarine !important; color: #a8ffea !important; box-shadow: inset 0 0 10px rgba(6, 182, 212, 0.25), 0 0 8px rgba(6, 182, 212, 0.2); text-shadow: 0 0 8px rgba(6, 182, 212, 0.4); font-size: 0.8rem; font-weight: 700; padding: 4px 10px; border-radius: 4px;`
- Hover state: `background: #083841 !important; border-color: aquamarine !important; color: #a8ffea !important; box-shadow: inset 0 0 12px rgba(6, 182, 212, 0.4), 0 0 12px rgba(127, 255, 212, 0.4);`
- Active state: `transform: translateY(1px);`
- Preserve existing button labels (`+ Skill`, `+ Equipment`, `+ Custom Item`, `+ Add Note Panel`, `+ Defense`, `+ Weapon`).
- Preserve all existing tests and docstrings.

---

### Task 1: Action Button Recoloring (Character & Ship Sheets)

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue`
- Modify: `client/src/views/ShipSheetsView.vue`
- Test: `client/test/CharacterSheetsView.test.js`
- Test: `client/test/ShipSheetsView.test.js`

- [ ] **Step 1: Write test assertions for active-card button palette**
  Add tests in `client/test/CharacterSheetsView.test.js` and `client/test/ShipSheetsView.test.js` verifying that `.btn-secondary` and `.btn-add-note-panel` have `background: #05282e` and `border: 1px solid aquamarine`.

- [ ] **Step 2: Run tests to see them fail**
  Run `cd client && npx vitest run test/CharacterSheetsView.test.js test/ShipSheetsView.test.js`.

- [ ] **Step 3: Update button styling in CharacterSheetsView.vue and ShipSheetsView.vue**
  Update `.btn-secondary` and `.btn-add-note-panel` styles in both views to use `#05282e` background, `aquamarine` border, `#a8ffea` text, and matching glow/hover.

- [ ] **Step 4: Run tests to verify they pass**
  Run `cd client && npx vitest run test/CharacterSheetsView.test.js test/ShipSheetsView.test.js`.

- [ ] **Step 5: Commit changes**
  Run `git commit -am "style: update action buttons to match active sheet color scheme"`.

---

### Task 2: Collapsible Sliding Navigation Panel in CharacterSheetsView

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue`
- Test: `client/test/CharacterSheetsView.test.js`

- [ ] **Step 1: Write tests for Character Sheets collapsible sidebar**
  Test in `client/test/CharacterSheetsView.test.js` verifying:
  - `isSidebarCollapsed` reactive data property exists (default false)
  - `toggleSidebar` method toggles `isSidebarCollapsed`
  - `.sidebar-toggle-btn` button exists in the DOM with `◀` when open, `▶` when collapsed
  - `.sheets-layout` gets `sidebar-collapsed` class when `isSidebarCollapsed` is true
  - CSS contains `.sidebar-collapsed .sidebar` with `margin-left: -280px`

- [ ] **Step 2: Run tests to observe failure**
  Run `cd client && npx vitest run test/CharacterSheetsView.test.js`.

- [ ] **Step 3: Implement collapsible sidebar in CharacterSheetsView.vue**
  - Add `isSidebarCollapsed: false` to `data()`.
  - Add `toggleSidebar()` to `methods`.
  - Add `<button type="button" class="sidebar-toggle-btn" ...>` inside `<aside class="sidebar">`.
  - Add scoped CSS styles for `.sidebar` transition, `.sheets-layout.sidebar-collapsed .sidebar`, and `.sidebar-toggle-btn`.

- [ ] **Step 4: Run tests to verify they pass**
  Run `cd client && npx vitest run test/CharacterSheetsView.test.js`.

- [ ] **Step 5: Commit changes**
  Run `git commit -am "feat: add collapsible sliding navigation panel to CharacterSheetsView"`.

---

### Task 3: Collapsible Sliding Navigation Panel in ShipSheetsView

**Files:**
- Modify: `client/src/views/ShipSheetsView.vue`
- Test: `client/test/ShipSheetsView.test.js`

- [ ] **Step 1: Write tests for Ship Sheets collapsible sidebar**
  Test in `client/test/ShipSheetsView.test.js` verifying:
  - `isSidebarCollapsed` reactive data property exists (default false)
  - `toggleSidebar` method toggles `isSidebarCollapsed`
  - `.sidebar-toggle-btn` button exists in the DOM with `◀` when open, `▶` when collapsed
  - `.sheets-layout` gets `sidebar-collapsed` class when `isSidebarCollapsed` is true
  - CSS contains `.sidebar-collapsed .sidebar` with `margin-left: -280px`

- [ ] **Step 2: Run tests to observe failure**
  Run `cd client && npx vitest run test/ShipSheetsView.test.js`.

- [ ] **Step 3: Implement collapsible sidebar in ShipSheetsView.vue**
  - Add `isSidebarCollapsed: false` to `data()`.
  - Add `toggleSidebar()` to `methods`.
  - Add `<button type="button" class="sidebar-toggle-btn" ...>` inside `<aside class="sidebar">`.
  - Add scoped CSS styles for `.sidebar` transition, `.sheets-layout.sidebar-collapsed .sidebar`, and `.sidebar-toggle-btn`.

- [ ] **Step 4: Run tests to verify they pass**
  Run `cd client && npx vitest run test/ShipSheetsView.test.js`.

- [ ] **Step 5: Commit changes**
  Run `git commit -am "feat: add collapsible sliding navigation panel to ShipSheetsView"`.

---

### Task 4: Full Test Suite Verification

**Files:**
- All client tests

- [ ] **Step 1: Run full vitest suite**
  Run `cd client && npx vitest run`.
  Verify all 62 test files and 895+ tests pass cleanly with zero failures.

# Implementation Plan: Character & Ship Sheets Layout & Inventory Refinement

**Spec:** `docs/superpowers/specs/2026-11-06-character-ship-sheets-layout-and-inventory-refinement-design.md`  
**Target Files:**
- `client/src/views/CharacterSheetsView.vue`
- `client/src/views/ShipSheetsView.vue`
- `client/test/CharacterSheetsView.test.js`
- `client/test/ShipSheetsView.test.js`

---

## Task 1: Character Sheet Inventory Item Presentation
- [ ] In `client/src/views/CharacterSheetsView.vue`:
  - [ ] Add `editingItemIndex: null` to component data.
  - [ ] Add methods `startEditItemName(item, index)`, `finishEditItemName()`, and update `addInventoryItem()` to prompt user for the custom item name (`window.prompt('Enter item name:', 'Custom Item')`).
  - [ ] In inventory list template:
    - Replace input `<input type="text" v-model="item.name" ... class="item-name-input" />` with:
      - Display `<span class="item-name-text" @dblclick="startEditItemName(item, index)" title="Double-click to rename">{{ item.name }}</span>` when `editingItemIndex !== index`.
      - Display `<input ref="itemNameInput" type="text" v-model="item.name" @blur="finishEditItemName" @keydown.enter="finishEditItemName" class="item-name-input editing" />` when `editingItemIndex === index`.
    - Remove the `.item-weight-wrap` (`Kg: [input]`) element from the template.
    - Ensure attributes/capabilities notes `<input ... placeholder="Notes / Capabilities" />` and quantity `<div class="level-wrap"><label>Qty:</label>...</div>` remain present and functional.
  - [ ] Add `.item-name-text` styling in `<style>`: `color: #cecece; font-weight: 600; font-size: 0.9rem; cursor: pointer; user-select: text;`.
- [ ] In `client/test/CharacterSheetsView.test.js`:
  - [ ] Add unit test verifying `.item-name-text` renders item name as text, `.item-weight-wrap` / `Kg:` input is not in the DOM, and custom item prompts/renames correctly.
- [ ] Run vitest: `cd client && npx vitest run test/CharacterSheetsView.test.js`.

---

## Task 2: Inventory & Skills List Scrollbars
- [ ] In `client/src/views/CharacterSheetsView.vue`:
  - [ ] Add `.inventory-items-scroll` class to the inventory `ul.items-list`.
  - [ ] Add `.skills-items-scroll` class to the skills `ul.items-list`.
  - [ ] In `<style>`:
    - Add `.inventory-items-scroll, .skills-items-scroll { max-height: 310px; overflow-y: auto; overflow-x: hidden; padding-right: 4px; scrollbar-width: thin; scrollbar-color: rgba(0, 255, 255, 0.3) #0d1117; }`
    - Add matching `::-webkit-scrollbar` styling for `.inventory-items-scroll` and `.skills-items-scroll` using the site dark cyan theme.
- [ ] In `client/test/CharacterSheetsView.test.js`:
  - [ ] Add assertions verifying `.inventory-items-scroll` and `.skills-items-scroll` have `max-height: 310px` and scrollbar properties.
- [ ] Run vitest: `cd client && npx vitest run test/CharacterSheetsView.test.js`.

---

## Task 3: Vertical Card & Banner Spacing Parity on Character & Ship Sheets
- [ ] In `client/src/views/CharacterSheetsView.vue`:
  - [ ] Remove `margin-bottom: 20px;` from `.racial-panel.species-traits-banner`.
  - [ ] Remove `margin-top: 1.5rem;` from `.notes-section`.
- [ ] In `client/src/views/ShipSheetsView.vue`:
  - [ ] Remove `margin-top: 14px;` from `.flip-burn-ship-banner`.
  - [ ] Remove `margin-top: 1.5rem;` from `.notes-section`.
- [ ] In `client/test/CharacterSheetsView.test.js`:
  - [ ] Assert `.species-traits-banner` does not have `margin-bottom: 20px` and `.notes-section` does not have `margin-top: 1.5rem`.
- [ ] In `client/test/ShipSheetsView.test.js`:
  - [ ] Assert `.flip-burn-ship-banner` does not have `margin-top: 14px` and `.notes-section` does not have `margin-top: 1.5rem`.
- [ ] Run vitest for both test suites.

---

## Task 4: Full Suite Verification & Visual Snapshot
- [ ] Run complete client test suite: `cd client && npx vitest run`.
- [ ] Run client production build: `cd client && npm run build`.
- [ ] Capture Puppeteer screenshots of Character Sheets and Ship Sheets, save to artifacts directory, and verify visually.
- [ ] Commit all changes to git.

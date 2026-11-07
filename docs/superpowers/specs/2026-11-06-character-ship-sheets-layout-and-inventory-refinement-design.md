# Design Doc: Character & Ship Sheets Layout & Inventory Refinement

**Date:** 2026-11-06  
**Status:** Approved by User  
**Target Views:** `client/src/views/CharacterSheetsView.vue`, `client/src/views/ShipSheetsView.vue`

---

## 1. Objectives & Scope
Refine the layout, spacing, and inventory / skills presentation across the Character Sheets and Ship Sheets views:
1. **Inventory Presentation**:
   - Change inventory item name from an `<input>` field to plain text (`#cecece`, weight 600).
   - Support naming custom items upon clicking `+ Custom Item` (via prompt/dialog) and editing inline on double-click or edit action.
   - Remove the `Kg: [input]` element completely from the item row, while preserving the item attributes (the notes / capabilities field) and quantity (`Qty: [input]`).
2. **Scrollbars for Inventory & Skills**:
   - Limit visible height of inventory list after 5 items (~310px) with `overflow-y: auto`.
   - Apply matching scrollbar to the Skills & Experience list when matching the same card height (~310px).
   - Ensure scrollbars follow the site dark sci-fi cyan theme (`::-webkit-scrollbar` with teal glow on hover and dark track).
3. **Card & Banner Spacing Uniformity**:
   - Ensure the bottom spacing between the Species Traits infobox and the two cards underneath matches the spacing between the infobox and the two cards above (20px uniform gap).
   - Ensure the spacing between the bottom of the two cards (Skills & Inventory) and the Notes section title row matches the standard 20px gap.
   - Ensure all card-to-card and card-to-banner spacing on Ship Sheets matches this uniform 20px standard (eliminating conflicting rogue margins on Flip & Burn banner and Notes section).

---

## 2. Detailed Technical Specifications

### 2.1 Character Sheet Inventory Row
- **Template Changes**:
  - Replace `<input type="text" v-model="item.name" @change="updateCharacter" class="item-name-input" />` with:
    - Text mode: `<span class="item-name-text" @dblclick="startEditItemName(item, index)">{{ item.name }}</span>`
    - Inline edit mode (active when `editingItemIndex === index`): `<input ref="itemNameInput" type="text" v-model="item.name" @blur="finishEditItemName" @keydown.enter="finishEditItemName" class="item-name-input" />`
  - Remove `<div class="item-weight-wrap">...</div>` containing `Kg:` and the weight number input.
  - Retain `<input type="text" v-model="item.notes" @change="updateCharacter" placeholder="Notes / Capabilities" class="item-name-input" ... />`.
  - Retain `<div class="level-wrap"><label>Qty:</label><input type="number" v-model.number="item.quantity" ... /></div>`.
- **Custom Item Creation**:
  - In `addInventoryItem()`: Prompt user for item name (defaulting to "Custom Item"). If confirmed, push new item with the provided name, weight 1.0 (for default mass tracking), and empty notes, then call `updateCharacter()`.
- **CSS Additions**:
  - `.item-name-text`: `color: #cecece; font-weight: 600; font-size: 0.9rem; cursor: pointer; user-select: text;`.

### 2.2 Inventory & Skills Scrollbar Constraints
- **Inventory List Container**:
  - Add class or styling to `.items-list.inventory-items-list`:
    - `max-height: 310px;` (fits 5 standard two-line items + gaps).
    - `overflow-y: auto; overflow-x: hidden;`
    - `padding-right: 4px;`
- **Skills List Container**:
  - Add class or styling to `.items-list.skills-items-list`:
    - `max-height: 310px;` (matches inventory card height).
    - `overflow-y: auto; overflow-x: hidden;`
    - `padding-right: 4px;`
- **Themed Scrollbar**:
  - Apply standard site scrollbar properties to `.inventory-items-list` and `.skills-items-list`:
    - `scrollbar-width: thin;`
    - `scrollbar-color: rgba(0, 255, 255, 0.3) #0d1117;`
    - `::-webkit-scrollbar` width 6px-8px, track `#0d1117`, thumb `rgba(0, 255, 255, 0.25)` with hover `#00ffff` teal glow.

### 2.3 Character Sheets Spacing
- In `.sheet-container`: already defines `display: flex; flex-direction: column; gap: 20px;`.
- Remove `margin-bottom: 20px;` from `.racial-panel.species-traits-banner`. The distance above and below the banner will now both be exactly `20px`.
- Remove `margin-top: 1.5rem;` from `.notes-section`. The distance above Notes will now be exactly `20px`.

### 2.4 Ship Sheets Spacing Parity
- In `.sheet-container` in `ShipSheetsView.vue`: already defines `display: flex; flex-direction: column; gap: 20px;`.
- Remove `margin-top: 14px;` from `.flip-burn-ship-banner`.
- Remove `margin-top: 1.5rem;` from `.notes-section`.
- All top-level cards and banners in `ShipSheetsView.vue` now maintain consistent 20px spacing.

---

## 3. Verification & Testing
1. **Unit Tests**:
   - Update `client/test/CharacterSheetsView.test.js` to assert:
     - Inventory item row renders item name as text element (`.item-name-text`) instead of input.
     - `.item-weight-wrap` / `Kg:` input is removed from inventory item rows.
     - `.inventory-items-list` and `.skills-items-list` have `max-height` and themed scrollbars.
     - `.racial-panel.species-traits-banner` does not have conflicting `margin-bottom: 20px;`.
     - `.notes-section` does not have extra `margin-top: 1.5rem;`.
   - Update `client/test/ShipSheetsView.test.js` to assert:
     - `.flip-burn-ship-banner` does not have extra `margin-top: 14px;`.
     - `.notes-section` does not have extra `margin-top: 1.5rem;`.
2. **Visual Verification**:
   - Capture Puppeteer screenshots of Character Sheets (showing 5+ items with scrollbar, name as text, no Kg field, and uniform vertical spacing) and Ship Sheets (showing uniform card spacing).
3. **Full Suite**:
   - Execute all client unit tests (`npx vitest run`) and production build (`npm run build`).

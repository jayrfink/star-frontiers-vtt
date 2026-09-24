# Design Spec: Remove HP Tracking from VTT Token Inspectors & Canvas

**Date:** 2026-09-24  
**Status:** Approved  
**Author:** Pair Programming Assistant  

---

## 1. Background & Goals

Currently, the VTT Token Inspectors (both RPG VTT and Space VTT) contain Hit Points / Hull Points input fields and `[-5, -1, +1, +5]` modifier buttons. These token-level HP values are independent of the Character Sheets and Ship Sheets.

To establish the **Character Sheets** and **Ship Sheets** as the single source of truth for character Hit Points and starship Hull Points, and to prevent confusion or duplicate bookkeeping:
- Remove HP display, inputs, and quick-adjustment buttons from the Token Inspector drawers on both VTTs.
- Remove the HP input field from the "Add New Token" modals on both VTTs.
- Remove the floating HP bar rendering on canvas tokens in both VTTs.
- Preserve all other Token Inspector controls, including speed, rotation/heading, tactical status effects, ring color, and token sizing.
- Preserve backend database schemas and REST endpoints as backward-compatible (HP fields remain nullable/optional).

---

## 2. Requirements & UI Changes

### 2.1 Space VTT (`SpaceVttView.vue`)
- **Token Inspector Drawer:**
  - Remove `.hp-section` containing:
    - Label `Hull Points (HP):`
    - Inputs for `current_hp` and `max_hp`
    - Quick buttons `[-5, -1, +1, +5]`
  - Keep intact:
    - Token title row (`selectedToken.name`)
    - Linked ID row (if `selectedToken.character_id` exists)
    - Hex Position row (`selectedToken.x, selectedToken.y`)
    - Current Speed control (`current_speed`, with `[-1, +1]` buttons)
    - Heading / Rotation control (`rotation`, with `[⟲ -60°, ⟳ +60°]` buttons and hotkeys)
    - Status Effects toggles (💥 Damaged, 🛰️ Adrift, ⚡ Disabled, 🔥 Burning)
    - Ring Color picker
    - Delete Token button
- **Add New Token Modal:**
  - Remove the `Hull Points (HP):` input group.
- **Component Script:**
  - Remove `adjustSelectedHp()` function.
  - Remove `current_hp` and `max_hp` from `selectedTokenForm` and `newTokenForm`.
  - Remove `hp` assignments from ship counter preset spawn handlers (`spawnCounter`, `openAddTokenModal`).

### 2.2 RPG VTT (`RpgVttView.vue`)
- **Token Inspector Drawer:**
  - Remove `.hp-section` containing:
    - Label `Hit Points:`
    - Inputs for `current_hp` and `max_hp`
    - Quick buttons `[-5, -1, +1, +5]`
  - Keep intact:
    - Token title row (`selectedToken.name`)
    - Character Linked row (if `selectedToken.character_id` exists)
    - Position row (`selectedToken.x, selectedToken.y`)
    - Status Effects toggles (⚡ Stunned, 💀 Unconscious, 🩸 Wounded)
    - Ring Color picker
    - Size (grid cells) dropdown (`1x1`, `2x2`, `3x3`)
    - Delete Token button
- **Add New Token Modal:**
  - Remove the `Hit Points:` input group.
- **Component Script:**
  - Remove `adjustSelectedHp()` function.
  - Remove `current_hp` and `max_hp` from `selectedTokenForm` and `newTokenForm`.

### 2.3 Canvas Components
- **`SpaceVttCanvas.vue`:**
  - Remove the canvas drawing block for the floating HP bar (`token.max_hp !== null ...`).
  - Speed badge and status ring/indicators remain rendered as before.
- **`VttCanvas.vue`:**
  - Remove the canvas drawing block for the floating HP bar (`token.max_hp !== null ...`).
  - Status indicators and token name/ring remain rendered as before.

### 2.4 Backend Compatibility
- No changes required to `server/src/db.js` or `server/src/routes/maps.js`.
- Token records in SQLite retain existing columns, which are optional.

---

## 3. Verification & Testing

1. **Client Unit & Component Tests:**
   - Run Vitest suite: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run"`
2. **Server Test Suite:**
   - Run Server test suite: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
3. **Production Build:**
   - Run Vite build: `docker exec sf-vtt-dev bash -c "cd client && npm run build"`
4. **Manual / Functional Check:**
   - Verify Token Inspector opens cleanly on both RPG VTT and Space VTT.
   - Verify Speed, Heading, Status Effects, Ring Color, Size, and Delete Token still function without errors.
   - Verify adding tokens works without HP fields.
   - Verify canvas renders tokens without floating HP bars.

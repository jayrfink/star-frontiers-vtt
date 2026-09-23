# Design Specification: Damage Dice Total Calculation and Display

**Date:** 2026-09-22  
**Feature:** Damage Dice Total Display  
**Scope:** RPG VTT (`RpgVttView.vue`) and Space VTT (`SpaceVttView.vue`)  
**Status:** Approved

---

## 1. Overview & Goals

When rolling damage dice ($Nd10$) on either the RPG VTT or Space VTT, players currently see 3D dice animated on the canvas, but must manually sum the results. This feature automatically captures the final settled values of the dice, sums them up, and presents the total in two complementary locations:
1. A prominent, temporary floating HUD banner at the top-center of the tabletop canvas area.
2. A persistent "Last Roll" summary section inside the DMG Die dropdown menu.

---

## 2. Technical Design & Architecture

### 2.1 Result Interception
- `diceBoxInstance.roll(...)` returns a Promise that resolves when the physics engine completes and dice stop moving.
- In both `RpgVttView.vue` and `SpaceVttView.vue`:
  - When `rollDamage()` is invoked, we await the promise returned by `diceBoxInstance.roll(...)`.
  - The resolved array contains die objects with `.value`.
  - For standard 10-sided damage dice in Star Frontiers, values are 1–10 (if the physics engine returns 0 for a d10 face, it maps to 10: `v === 0 ? 10 : v`).
  - Compute:
    - `diceValues`: Array of individual numbers (e.g. `[6, 8, 10]`)
    - `total`: Sum of `diceValues` (e.g. `24`)
    - `count`: Quantity of dice rolled (e.g. `3`)
  - Store state in reactive ref:
    ```javascript
    const lastDamageRoll = ref(null);
    // Structure: { total: number, dice: number[], count: number, timestamp: number }
    const showDamageHud = ref(false);
    ```

### 2.2 Floating Canvas HUD Banner
- **Markup:** Rendered inside `.vtt-workspace` above the canvas:
  ```html
  <transition name="fade-slide">
    <div v-if="showDamageHud && lastDamageRoll" class="damage-hud-banner" @click="showDamageHud = false">
      <div class="hud-title">💥 DAMAGE ROLL ({{ lastDamageRoll.count }}d10)</div>
      <div class="hud-total">{{ lastDamageRoll.total }}</div>
      <div class="hud-dice">({{ lastDamageRoll.dice.join(' + ') }})</div>
      <button class="hud-close" @click.stop="showDamageHud = false" title="Dismiss">×</button>
    </div>
  </transition>
  ```
- **Styling:**
  - Matches the damage die theme (`#140409` background and `#f29249` orange numbers).
  - Background: `rgba(20, 4, 9, 0.95)` with backdrop filter blur.
  - Border: `2px solid #f29249`, with soft orange outer glow (`box-shadow: 0 0 16px rgba(242, 146, 73, 0.4)`).
  - Position: Fixed or absolute at top center (`top: 24px`, `left: 50%`, `transform: translateX(-50%)`), `z-index: 120`.
  - Pointer events: Enabled on the banner; click to dismiss immediately.
  - Timer: Auto-dismisses after 8000ms. If a new damage roll is triggered before then, timer is reset and existing banner updates.

### 2.3 DMG Die Dropdown Summary
- Inside `.dmg-menu-dropdown`, below the `🎲 Roll Nd10 Damage` button:
  ```html
  <div v-if="lastDamageRoll" class="dmg-last-roll-card">
    <span class="last-roll-label">Last Roll ({{ lastDamageRoll.count }}d10):</span>
    <span class="last-roll-total">{{ lastDamageRoll.total }}</span>
    <span class="last-roll-detail">[{{ lastDamageRoll.dice.join(', ') }}]</span>
  </div>
  ```
- Styled cleanly within the dropdown palette with dark red background and orange text.

---

## 3. Error Handling & Edge Cases
- If `diceBoxInstance.roll()` returns an empty array or throws, safely handle without crashing.
- If a roll is triggered while another roll is active, the latest roll updates `lastDamageRoll` cleanly and resets the auto-dismiss timer.
- Percentile rolls (`rollPercentile`) continue to function untouched and do not overwrite `lastDamageRoll`.

---

## 4. Verification & Testing Plan
1. **Unit / Component Tests:**
   - Test damage roll calculation logic: correctly sums array of die values, handles single die, multiple dice, and 0-as-10 mapping.
   - Verify HUD banner displays correct total and individual dice.
   - Verify dropdown summary renders last roll values.
2. **Container Build & Full Test Suite:**
   - Run Vitest client tests.
   - Run Vitest server tests.
   - Verify Vite production build passes.

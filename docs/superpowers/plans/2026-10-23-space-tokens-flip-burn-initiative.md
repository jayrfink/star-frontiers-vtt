# Implementation Plan: 1-Hex Space Tokens, Multi-Turn Flip & Burn, and Dual Initiative Dice

**Date:** October 23, 2026  
**Design Doc:** [`docs/superpowers/specs/2026-10-23-space-tokens-flip-burn-initiative-design.md`](file:///Users/jrf/star-frontiers-vtt/docs/superpowers/specs/2026-10-23-space-tokens-flip-burn-initiative-design.md)  
**Target:** Star Frontiers VTT Client & Server

---

## Proposed Changes

### 1. 3D Dice Themes Generation (`client/public/assets/dice-box/themes/`)
- Generate `custom-init-player` theme with body `#17304a` and numbers `#5f9fde`.
- Generate `custom-init-opp` theme with body `#400a22` and numbers `#c9abb9`.
- Script: `server/build_initiative_themes.js` using Sharp to produce diffuse and normal textures.

### 2. Dice Utilities (`client/src/utils/diceUtils.js`)
- Add `calculateInitiativeRoll(results)`:
  - Identifies player die and opposition die.
  - Maps 0 to 10 (Star Frontiers d10 rules).
  - Determines winner: `'players'`, `'opposition'`, or `'tie'`.
- Unit tests: `client/test/diceUtils.test.js`.

### 3. Flip & Burn Mechanics (`client/src/utils/flipAndBurn.js`)
- Add `canMultiTurnFlip(mr)`.
- Add `calculateTurn1Heading(rot)` and `calculateTurn2Heading(rot)`.
- Add `formatMultiTurnAlert(shipName, turn, heading)`.
- Unit tests: `client/test/flipAndBurn.test.js`.

### 4. Strict 1-Hex Space Tokens & Multi-Ship Stacking
- `SpaceVttView.vue`:
  - Remove Size select from Add Token modal.
  - Replace editable Size in Token Inspector with read-only `1 Hex (Standard)`.
- `SpaceVttCanvas.vue`:
  - Restrict token radius to 1 hex.
  - Implement click-to-cycle selection when multiple tokens occupy the same hex coordinates.
  - Render stacked vessel count indicator (e.g. `[2]`).
- Unit tests: `client/test/SpaceVttTokenSize.test.js` and `client/test/SpaceVttCanvasStacking.test.js`.

### 5. Multi-Turn Flip & Burn UI (`SpaceVttView.vue`)
- Token Inspector Flip & Burn box:
  - For `MR >= 3`: Standard 1-turn `🔄 Flip & Burn (180°)`.
  - For `MR < 3`: Multi-turn `🔄 Start Multi-Turn Flip (Turn 1/2)` / `🔄 Complete Flip & Burn (Turn 2/2)` + Cancel.
  - Applies status effect badge `🔄 Flip & Burn (Turn 1/2)`.
  - Prompts for STA Check #1 and STA Check #2 on respective turns.

### 6. Dual-Die Initiative System on Both VTTs
- `SpaceVttView.vue` and `RpgVttView.vue`:
  - Add `⚡ Initiative` button to top toolbar.
  - Implement `rollInitiative()` using `custom-init-player` and `custom-init-opp`.
  - Display floating HUD banner with user attribution and dual-color cards (`#17304a`/`#5f9fde` for players, `#400a22`/`#c9abb9` for opposition).
  - Broadcast and render in the shared Roll Log.
- Unit tests: `client/test/InitiativeHud.test.js`.

---

## Tasks

### Task 1: Generate 3D Dice Themes for Initiative Dice
1. Write `server/build_initiative_themes.js` to create:
   - `client/public/assets/dice-box/themes/custom-init-player/` (`#5f9fde` numbers)
   - `client/public/assets/dice-box/themes/custom-init-opp/` (`#c9abb9` numbers)
2. Execute the script inside Docker or host environment.
3. Verify texture files exist and are valid.

### Task 2: Implement Initiative Evaluation Logic & Tests
1. Add tests in `client/test/diceUtils.test.js` for `calculateInitiativeRoll`.
2. Implement `calculateInitiativeRoll` in `client/src/utils/diceUtils.js`.
3. Verify tests pass.

### Task 3: Implement Multi-Turn Flip & Burn Logic & Tests
1. Add tests in `client/test/flipAndBurn.test.js` for multi-turn mechanics.
2. Implement `canMultiTurnFlip`, `calculateTurn1Heading`, `calculateTurn2Heading`, `formatMultiTurnAlert` in `client/src/utils/flipAndBurn.js`.
3. Verify tests pass.

### Task 4: Enforce 1-Hex Rule & Multi-Ship Stacking on Space VTT
1. Update `SpaceVttView.vue` to remove multi-hex selector and lock size to 1.
2. Update `SpaceVttCanvas.vue` to enforce 1-hex rendering, multi-token cycle selection, and visual stack badge.
3. Add unit tests for 1-hex constraint and click-to-cycle selection.
4. Verify tests pass.

### Task 5: Implement Multi-Turn Flip & Burn UI in Space VTT
1. Update `SpaceVttView.vue` Token Inspector Flip & Burn section to support 2-turn state tracking for `MR < 3` ships.
2. Connect turn 1 and turn 2 rotations, status badge updates, STA checks, and roll log messages.
3. Test with both `MR >= 3` and `MR < 3` ships.

### Task 6: Implement Dual Initiative Dice Roller & HUD on Both VTTs
1. Add `⚡ Initiative` toolbar button and HUD banner in `SpaceVttView.vue`.
2. Add `⚡ Initiative` toolbar button and HUD banner in `RpgVttView.vue`.
3. Implement `rollInitiative()` method in both views.
4. Update Roll Log in both views to style initiative cards with Player and Opposition colors and show attribution.
5. Add unit tests for Initiative rolling and HUD display.

### Task 7: Full Test Suite & Production Build Verification
1. Run `npx vitest run` in `client/` (ensure 100% passing).
2. Run `npm test` in `server/` (ensure 100% passing).
3. Run `npm run build` in `client/` to verify production compilation.

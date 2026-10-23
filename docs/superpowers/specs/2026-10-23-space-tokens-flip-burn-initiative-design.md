# Space VTT 1-Hex Rule, Multi-Turn Flip & Burn, and Dual-Die Initiative System Design

**Date:** October 23, 2026  
**Status:** Approved by User  
**Target Version:** `v0.10.0` (or patch increment)

---

## 1. Overview & Goals

This specification details three new tactical enhancements to the Star Frontiers VTT:
1. **Space VTT 1-Hex Token Rule:** Strictly enforce the rule that no ship or celestial body may occupy more than 1 hex. All tokens on the Space VTT have a fixed size of 1 hex, while permitting multiple ships to occupy the same hex coordinates `(q, r)` with click-to-cycle selection and visual stack indication.
2. **Multi-Turn Flip & Burn for MR < 3:** Expand the tactical high-G Flip & Burn maneuver to allow lower-agility vessels (`MR < 3` / `MR 1` or `2`) to execute a multi-turn 180° flip tracked across 2 combat turns, requiring two separate Stamina (STA) checks and blackout durations.
3. **Dual-Die Initiative System (Both VTTs):** Implement a dedicated Initiative rolling system available on both the Space VTT and RPG VTT. It simultaneously rolls two 10-sided dice on the 3D physics canvas:
   - **Die #1 (Players):** Body color `#17304a`, numbers color `#5f9fde`.
   - **Die #2 (Opposition):** Body color `#400a22`, numbers color `#c9abb9`.
   - Evaluates the rolls (1–10, face `0` = 10), determines the winner, renders a color-matched floating HUD banner with user attribution ("Rolled by [username]"), and broadcasts to the shared Roll Log over WebSockets.

---

## 2. Feature 1: Strict 1-Hex Rule on Space VTT

### 2.1 Rule Rationale
Under Star Frontiers Knight Hawks rules, planets, moons, asteroids, starships, and stations each occupy 1 hex. Hex scale is tactical space. Multiple vessels can share a single hex.

### 2.2 UI & Schema Modifications
- **Add Token Modal (`SpaceVttView.vue`):**
  - Remove the Size dropdown (`1 Hex`, `2 Hexes`, `3 Hexes`, `4 Hexes`).
  - Lock `newTokenForm.size = 1`.
- **Token Inspector Sidebar (`SpaceVttView.vue`):**
  - Replace the editable Size `<select>` with a read-only badge: `1 Hex (Standard)`.
  - Lock `selectedTokenForm.size = 1`.
- **Space VTT Canvas (`SpaceVttCanvas.vue`):**
  - `renderSingleToken`: Constrain `size = hexSize.value * 0.8` (fixed 1 hex radius, disregarding any legacy multi-hex sizes on space tokens).

### 2.3 Multiple Tokens in 1 Hex
- **Click-to-Cycle Selection:**
  - In `SpaceVttCanvas.vue` `onMouseDown`:
    - Find all tokens occupying `(cell.q, cell.r)`.
    - If multiple tokens are found, and one of them is already selected (`props.selectedTokenId`), select the *next* token in the stack.
    - If none is selected or a token in another hex is selected, select the first ship in the stack.
- **Visual Stacking Indicator:**
  - When 2 or more ships occupy the exact same hex, render a small count badge (e.g., `[2]` or `[3]`) near the hex center or offset the tokens slightly so all vessels are visibly recognizable.

---

## 3. Feature 2: Multi-Turn Flip & Burn (MR < 3)

### 3.1 Maneuver Rules
- **Fast Vessels (`MR >= 3`):**
  - **1-Turn Maneuver:** Instantly reverses heading by 180° (`(rotation + 180) % 360`).
  - **1 STA Check:** Strapped-in crew roll d% vs STA. If failed, roll 1d10&times;10s blackout duration.
- **Lower-Agility Vessels (`MR < 3`):**
  - Cannot perform a 1-turn snap 180° flip. Instead, they can execute a **Multi-Turn Hi-G Flip** across **2 turns**:
    - **Turn 1 (Initiate):**
      - Rotates heading 90° (`(rotation + 90) % 360`).
      - Sets a token tracking property / status effect: `🔄 Flip & Burn (Turn 1/2)`.
      - Requires **STA Check #1** for crew (fail = 1d10&times;10s blackout).
      - Logs tactical announcement to Roll Log: `Turn 1/2 of Multi-Turn Flip initiated on [Ship]. Heading +90°. Crew must make STA Check 1/2.`
    - **Turn 2 (Complete):**
      - Rotates remaining 90° (`(rotation + 90) % 360`), completing the full 180° heading reversal.
      - Clears the multi-turn tracking state.
      - Requires **STA Check #2** for crew (fail = 1d10&times;10s blackout).
      - Logs tactical announcement to Roll Log: `Turn 2/2 completed for [Ship]. Heading reversed 180°. Crew must make STA Check 2/2.`
    - **Abort/Cancel Option:** The pilot/GM can cancel the flip before completing Turn 2 if tactics change.

### 3.2 Helper Functions (`client/src/utils/flipAndBurn.js`)
```javascript
export function canFlipAndBurn(mr) {
  const n = Number(mr);
  return Number.isFinite(n) && n >= 3;
}

export function canMultiTurnFlip(mr) {
  const n = Number(mr);
  return Number.isFinite(n) && n > 0 && n < 3;
}

export function calculateTurn1Heading(currentRotation) {
  const cur = Number(currentRotation) || 0;
  return (((cur + 90) % 360) + 360) % 360;
}

export function calculateTurn2Heading(currentRotation) {
  const cur = Number(currentRotation) || 0;
  return (((cur + 90) % 360) + 360) % 360;
}
```

---

## 4. Feature 3: Dual-Die Initiative System

### 4.1 3D Dice Themes & Color Specification
1. **Player Die (`custom-init-player`):**
   - Die Body: `#17304a` (Deep Navy)
   - Numbers: `#5f9fde` (Light Slate Blue)
   - Generated diffuse textures in `client/public/assets/dice-box/themes/custom-init-player/`.
2. **Opposition Die (`custom-init-opp`):**
   - Die Body: `#400a22` (Deep Burgundy / Wine)
   - Numbers: `#c9abb9` (Muted Lavender Rose)
   - Generated diffuse textures in `client/public/assets/dice-box/themes/custom-init-opp/`.

### 4.2 Roll Trigger & Physics
- **Toolbar Button on Both VTTs (`SpaceVttView.vue` and `RpgVttView.vue`):**
  - Button: `⚡ Initiative`
- **DiceBox Roll Call:**
  ```javascript
  const results = await diceBox.roll([
    { sides: 10, theme: 'custom-init-player', themeColor: '#17304a', qty: 1 },
    { sides: 10, theme: 'custom-init-opp', themeColor: '#400a22', qty: 1 }
  ]);
  ```

### 4.3 Evaluation Logic (`client/src/utils/diceUtils.js`)
- `calculateInitiativeRoll(results)`:
  - Extract flat results:
    - Players die: `theme === 'custom-init-player'` or `themeColor === '#17304a'`
    - Opposition die: `theme === 'custom-init-opp'` or `themeColor === '#400a22'`
  - Values normalized: `raw === 0 ? 10 : raw` (range 1–10).
  - Outcome determination:
    - `playerRoll > oppRoll`: `winner = 'players'`
    - `oppRoll > playerRoll`: `winner = 'opposition'`
    - `playerRoll === oppRoll`: `winner = 'tie'`
  - Return: `{ playerRoll, oppRoll, winner, valid: true }`.

### 4.4 HUD Banner Presentation
- Styled after the initiative dice colors:
  - Header: `⚡ INITIATIVE ROLL` with "Rolled by [username] ([role])".
  - **Player Die Box:**
    - Background: `#17304a`
    - Border & Number: `#5f9fde`
    - Label: `PLAYERS: [playerRoll]`
  - **Opposition Die Box:**
    - Background: `#400a22`
    - Border & Number: `#c9abb9`
    - Label: `OPPOSITION: [oppRoll]`
  - **Outcome Banner:**
    - Players win: `🎉 PLAYERS WIN INITIATIVE` (accent `#5f9fde`)
    - Opposition win: `💀 OPPOSITION WINS INITIATIVE` (accent `#c9abb9`)
    - Tie: `⚖️ TIE - REROLL REQUIRED` (accent `#ffc107`)
  - Auto-dismiss after 8 seconds or click ✕.

### 4.5 Socket Sync & Roll Log
- Sends roll to `/api/rolls`:
  - `mode: 'rpg'` or `mode: 'space'`
  - `type: 'initiative'`
  - `label: 'Combat Initiative (1d10 vs 1d10)'`
  - `total: playerRoll`
  - `breakdown`: `Players: ${playerRoll} vs Opposition: ${oppRoll} - ${winnerMsg}`
  - `roll_summary`: `{ playerRoll, oppRoll, winner, rolledBy: username }`
- Real-time `roll:created` broadcast to all connected clients.
- Rendered in the Roll Log sidebar with the dual-color badges and attribution.

---

## 5. Verification & Testing Plan

1. **Unit Tests:**
   - `client/test/diceUtils.test.js`: Test `calculateInitiativeRoll` with various die combinations (player wins, opp wins, tie, raw 0 -> 10 mapping).
   - `client/test/flipAndBurn.test.js`: Test `canMultiTurnFlip`, turn 1 heading (+90°), turn 2 heading (+90°), and alerts.
   - `client/test/SpaceVttTokenSize.test.js`: Test that space token forms and creation lock size to 1.
   - `client/test/InitiativeHud.test.js`: Test initiative roll execution, HUD display, color schemes, and attribution in both `SpaceVttView` and `RpgVttView`.
2. **Build & Regression Verification:**
   - Run `npx vitest run` in `client/` (ensure 440+ tests pass).
   - Run `npm test` in `server/` (ensure 225+ tests pass).
   - Build client production bundle (`npm run build`).

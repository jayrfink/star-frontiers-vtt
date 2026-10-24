# Combat Flip & Burn Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement rulebook-accurate Star Frontiers Knight Hawks Combat Flip & Burn mechanics and G-force physics, featuring Standard, Lumbering, and Emergency Snap Flips, High-G Braking Burns, posture and location STA check modifiers, automated G-LOC blackout/impact damage resolution, and an interactive Crew G-Load Check dialog on Space VTT.

**Architecture:**
- Pure rules utility in `client/src/utils/flipAndBurn.js` providing maneuver eligibility, STA target calculations with ΔV, posture, and extremity modifiers, and Margin of Failure outcome resolution (G-Stun vs. G-LOC).
- Ship flight stats card in `client/src/views/ShipSheetsView.vue` updated with rulebook physics for MR 3+, MR 1-2, and High-G burns.
- Space VTT Inspector in `client/src/views/SpaceVttView.vue` equipped with Standard Flip, Lumbering Flip (2-turn), Emergency Snap Flip, Braking Burn ΔV stepper, and interactive Crew G-Load Check modal.

**Tech Stack:** Vue 3, Vitest, JavaScript (ES6+), Vite.

## Global Constraints
- Rotational Independence: Current linear speed does not change 180° flip G-forces.
- Linear Deceleration: Safe up to 2 hexes ΔV. 3+ hexes ΔV causes -10% per hex over 2.
- MR 3+: Standard 1-turn in-hex flip. No STA check required.
- MR 1–2: Lumbering Flip (2 turns, 90°/turn at drift velocity, no STA check) or Emergency Snap Flip (1 turn, Pilot check, centrifugal whip STA check: -10% Bow/Stern, 0% Midships).
- Postures: Crash couch (+20%), Braced (0%), Unbraced (-20%).
- Margin of Failure: 1–19 = Grey-Out / G-Stun (1 turn stun, -20% next turn; unbraced takes 1d3 damage and prone). 20+ = Full G-LOC Blackout (1d6 turns unconscious; unbraced takes 1d6 damage, hurled 1d3m).

---

### Task 1: Rules Engine & Physics Calculations in `flipAndBurn.js`

**Files:**
- Modify: `client/src/utils/flipAndBurn.js`
- Modify: `client/test/flipAndBurn.test.js`

**Interfaces:**
- Produces:
  - `canStandardFlip(mr)`: boolean
  - `canLumberingFlip(mr)`: boolean
  - `canSnapFlip(mr)`: boolean
  - `calculateStaCheckTarget(baseSta, options)`: `{ target, gPenalty, postureMod, extremityMod, breakdown }`
  - `resolveStaCheckResult(roll, targetSta, posture)`: `{ success, margin, severity, condition, stunnedTurns, checkPenalty, damageDice, unconsciousTurnsDice, displacementMetersDice, summaryText }`
  - Alert formatters: `formatStandardFlipAlert`, `formatLumberingFlipAlert`, `formatSnapFlipAlert`, `formatBrakingBurnAlert`, `formatGLocResultAlert`.

- [ ] **Step 1.1: Write failing tests in `client/test/flipAndBurn.test.js`**
  - Test MR eligibility across MR 0, 1, 2, 3, 4.
  - Test STA target calculations: base 60 with ΔV 4 (-20%), couch (+20%), stern (-10%) = 50%.
  - Test G-Stun (margin 1–19) for secured vs. unbraced (1d3 damage, prone).
  - Test G-LOC (margin 20+) for secured vs. unbraced (1d6 damage, 1d3m hurled, 1d6 turns).
  - Test formatters.

- [ ] **Step 1.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/flipAndBurn.test.js"
  ```

- [ ] **Step 1.3: Implement functions in `client/src/utils/flipAndBurn.js`**
  - Implement maneuver classifiers and calculation functions matching the spec.

- [ ] **Step 1.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/flipAndBurn.test.js"
  ```

- [ ] **Step 1.5: Commit Task 1**
  ```bash
  git add client/src/utils/flipAndBurn.js client/test/flipAndBurn.test.js
  git commit -m "feat(physics): implement combat flip and burn rules and G-LOC calculations"
  ```

---

### Task 2: Ship Sheets Flight Stats Banner Update

**Files:**
- Modify: `client/src/views/ShipSheetsView.vue`
- Modify: `client/test/ShipSheetsView.test.js`

**Interfaces:**
- Consumes: `canStandardFlip`, `canLumberingFlip`, `canSnapFlip` from `../utils/flipAndBurn.js`.
- Produces: Updated template and rules descriptions in `.flip-burn-ship-banner`.

- [ ] **Step 2.1: Write test in `client/test/ShipSheetsView.test.js`**
  - Assert ship sheet displays Standard Flip Capable for MR 3+.
  - Assert ship sheet displays Lumbering & Snap Flip Capable for MR 1–2.
  - Assert High-G Braking Burn rule is listed.

- [ ] **Step 2.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/ShipSheetsView.test.js"
  ```

- [ ] **Step 2.3: Implement updated banner in `client/src/views/ShipSheetsView.vue`**
  - Update banner markup and imported helpers for MR 3+, MR 1-2, and High-G braking rules.

- [ ] **Step 2.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/ShipSheetsView.test.js"
  ```

- [ ] **Step 2.5: Commit Task 2**
  ```bash
  git add client/src/views/ShipSheetsView.vue client/test/ShipSheetsView.test.js
  git commit -m "feat(ships): update flip and burn flight stats banner with Knight Hawks physics"
  ```

---

### Task 3: Space VTT Token Inspector & Interactive Crew G-Load Check Dialog

**Files:**
- Modify: `client/src/views/SpaceVttView.vue`
- Create: `client/test/SpaceVttFlipBurn.test.js`

**Interfaces:**
- Consumes: `canStandardFlip`, `canLumberingFlip`, `canSnapFlip`, `calculateStaCheckTarget`, `resolveStaCheckResult`, alert formatters.
- Produces:
  - Token Inspector buttons: Standard Flip, Lumbering Flip, Emergency Snap Flip, Braking Burn ΔV controls.
  - Interactive modal: `showCrewGCheckModal` with posture toggles, location toggles, STA input/select, 3D d100 roll, and Roll Log logging.

- [ ] **Step 3.1: Write failing tests in `client/test/SpaceVttFlipBurn.test.js`**
  - Test maneuver button visibility based on MR (Standard vs Lumbering vs Snap).
  - Test executing Standard Flip reverses 180° and does not trigger STA dialog.
  - Test executing Snap Flip prompts dialog with snap flag.
  - Test High-G braking burn (ΔV > 2) prompts dialog with G-penalty.
  - Test rolling STA check logs correct Margin of Failure and G-LOC effects.

- [ ] **Step 3.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/SpaceVttFlipBurn.test.js"
  ```

- [ ] **Step 3.3: Implement controls and dialog in `client/src/views/SpaceVttView.vue`**
  - Integrate new maneuver buttons into `.flip-burn-box`.
  - Add braking burn ΔV input with Safe vs High-G indicators.
  - Add Crew G-Load Check modal markup, state, and roll handler.

- [ ] **Step 3.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/SpaceVttFlipBurn.test.js"
  ```

- [ ] **Step 3.5: Commit Task 3**
  ```bash
  git add client/src/views/SpaceVttView.vue client/test/SpaceVttFlipBurn.test.js
  git commit -m "feat(vtt): add interactive crew G-load check dialog and physics maneuvers to Space VTT"
  ```

---

### Task 4: Full Suite Verification & Build

- [ ] **Step 4.1: Run all client Vitest tests**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run"
  ```

- [ ] **Step 4.2: Run client production build**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npm run build"
  ```

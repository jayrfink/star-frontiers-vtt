# Master High-G Maneuvers & Orbital Slingshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the rulebook-accurate Star Frontiers: Knight Hawks Master Physics and Orbital Slingshot specification, featuring Safe 3 ΔV threshold, native d10/d5 dice resolution, failed Snap Flip mechanics, Celestial Slingshots (Moon, Planet, Gas Giant), Oberth ADF burns, Distance 0 hazards, and an interactive Slingshot Modal on Space VTT.

**Architecture:**
- Pure rules and orbital mechanics engine in `client/src/utils/flipAndBurn.js` providing zone parameters, Oberth compound ΔV, native d10/d5 G-LOC resolution, and Distance 0 pilot hazard evaluation.
- Flight stats banner in `client/src/views/ShipSheetsView.vue` updated with 3 ADF safe threshold and 4+ ADF High-G rules.
- Space VTT in `client/src/views/SpaceVttView.vue` equipped with celestial token proximity detection, an interactive Orbital Slingshot Modal with 3D Pilot Check & compound G-load handover, and updated Flip & Burn controls.

**Tech Stack:** Vue 3, Vitest, JavaScript (ES6+), Vite, @3d-dice/dice-box.

---

## Global Constraints
- Grid Scale: 1 Hex = 10,000 km. Minimum slingshot entry speed is 4 hexes/turn (40,000 km/turn).
- Rotational Independence: Linear speed does NOT alter 180° flip G-forces.
- Rotational Agility (MR): 180° flip = 3 hex-faces (60° each). MR 3+ executes 1 turn in-hex pivot.
- Linear Thrust (ADF) & Safe Compensator Threshold: Ship compensators absorb up to 3 ΔV (ADF braking/acceleration or gravity shear).
- High-G Load Penalty: -10% per point of ADF or Total ΔV spent above 3.
- Dice System: Strictly d10 and d100. Light rolls 1–5 use `ceil(1d10 / 2)` (`1d5`).
- Failed Snap Flip: Rotates native MR only (1–2 faces), blocks main engine braking this turn, forces crew whip STA check.
- Oberth Burn: At Distance 0, each 1 point of ADF spent yields +2 Hexes/Turn exit speed. Total ΔV = Base Gravity ΔV + (ADF spent × 2).
- Distance 0 Hazards: Margin 01–19 loses free speed bonus, Moon takes 1d10 (screens absorb), Planet/Gas Giant takes 2d10 structural, unbraced crew prone + 1d5 damage; Margin 20+ halves speed, Moon takes 3d10 with 60° deflection, Planet/Gas Giant trapped in hex with 4d10 structural damage.

---

### Task 1: Knight Hawks Core Physics, Safe 3 ΔV, Native d10 Dice & Slingshot Engine

**Files:**
- Modify: `client/src/utils/flipAndBurn.js`
- Modify: `client/test/flipAndBurn.test.js`

**Interfaces:**
- Produces:
  - `SAFE_COMPENSATOR_DELTA_V = 3`
  - `rollD5()`: number (1–5) via `Math.ceil(d10 / 2)`
  - `calculateStaCheckTarget(baseSta, options)`: updated with threshold 3 (penalty for ΔV > 3: `(deltaV - 3) * -10`)
  - `resolveStaCheckResult(roll, targetSta, posture)`:
    - G-Stun unbraced damage: `'ceil(1d10 / 2)'` (1–5)
    - G-LOC unconscious turns: `'ceil(1d10 / 2)'` turns (1–5)
    - G-LOC unbraced hurled distance: `'ceil(1d10 / 2)'` meters (1–5)
    - G-LOC unbraced impact damage: `'1d10'` damage
  - `calculateSlingshotParameters(bodyType, distanceHexes, entrySpeed, adfSpent)`:
    - Returns `{ eligible, zoneName, bonusMr, freeExitSpeed, baseGravityDeltaV, oberthExitSpeed, totalExitSpeed, totalDeltaV, isHighG, gPenalty, requiresPilotCheck, pilotModifier, breakdownText }`
  - `resolveSlingshotPilotCheck(roll, targetSkill, bodyType)`:
    - Returns `{ success, margin, isMinorHazard, isMajorHazard, hullDamageDice, ignoresScreens, crewDamageDice, crewProne, speedMultiplier, scatterFaces, trappedInHex, requiresEscapeAdf, statusEffect, summaryText }`
  - Alert formatters: `formatSlingshotSuccessAlert`, `formatSlingshotHazardAlert`.

- [ ] **Step 1.1: Write failing tests in `client/test/flipAndBurn.test.js`**
  - Test Safe threshold 3: ΔV 1, 2, 3 have 0% penalty; ΔV 4 has -10%; ΔV 5 has -20%.
  - Test G-Stun and G-LOC outcome strings reflect d10/d5 notation (`ceil(1d10 / 2)` and `1d10`).
  - Test Slingshot zone calculations for Moon Dist 0, Planet Dist 1 & 0, Gas Giant Dist 1-2 & 0.
  - Test Oberth compound ΔV: Planet Dist 0 (base 3) + 2 ADF (4 exit speed) = 7 ΔV (penalty -40%).
  - Test Distance 0 pilot check failure outcomes (Minor 01–19 vs Major 20+).

- [ ] **Step 1.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/flipAndBurn.test.js"
  ```

- [ ] **Step 1.3: Implement functions in `client/src/utils/flipAndBurn.js`**
  - Implement updated threshold, native dice, slingshot zone lookup, Oberth math, and hazard resolvers.

- [ ] **Step 1.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/flipAndBurn.test.js"
  ```

- [ ] **Step 1.5: Commit Task 1**
  ```bash
  git add client/src/utils/flipAndBurn.js client/test/flipAndBurn.test.js
  git commit -m "feat(physics): implement knight hawks safe 3 delta-v, native d10 dice, and orbital slingshot engine"
  ```

---

### Task 2: Ship Sheets Flight Stats Banner Update

**Files:**
- Modify: `client/src/views/ShipSheetsView.vue`
- Modify: `client/test/ShipSheetsView.test.js`

**Interfaces:**
- Consumes: `canStandardFlip`, `canLumberingFlip`, `canSnapFlip`, `SAFE_COMPENSATOR_DELTA_V` from `../utils/flipAndBurn.js`.
- Produces: Updated template rule text reflecting 3 ADF safe threshold and 4+ ADF High-G STA checks.

- [ ] **Step 2.1: Write test in `client/test/ShipSheetsView.test.js`**
  - Assert ship sheet displays safe braking up to 3 ADF.
  - Assert ship sheet displays High-G braking for 4+ ADF (-10% per ADF > 3).

- [ ] **Step 2.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/ShipSheetsView.test.js"
  ```

- [ ] **Step 2.3: Implement updated banner in `client/src/views/ShipSheetsView.vue`**
  - Update `.flip-burn-ship-banner` text and rules notes for MR 3+, MR 1-2, and High-G braking rules.

- [ ] **Step 2.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/ShipSheetsView.test.js"
  ```

- [ ] **Step 2.5: Commit Task 2**
  ```bash
  git add client/src/views/ShipSheetsView.vue client/test/ShipSheetsView.test.js
  git commit -m "feat(ships): update flight stats banner with safe 3 ADF threshold and slingshot rules"
  ```

---

### Task 3: Space VTT Celestial Token Proximity Detection & Orbital Slingshot Modal

**Files:**
- Modify: `client/src/views/SpaceVttView.vue`
- Create: `client/test/SpaceVttSlingshot.test.js`
- Modify: `client/test/SpaceVttFlipBurn.test.js`

**Interfaces:**
- Consumes: `calculateSlingshotParameters`, `resolveSlingshotPilotCheck`, `formatSlingshotSuccessAlert`, `formatSlingshotHazardAlert`, `SAFE_COMPENSATOR_DELTA_V`.
- Produces:
  - Token Inspector:
    - Celestial proximity detector for selected ship token (Moon, Planet, Gas Giant).
    - Orbital Slingshot banner and button when speed $\ge 4$ and within range ($d \le 1$ or $d \le 2$).
    - Updated braking burn stepper ($\le 3$ Safe, $\ge 4$ High-G).
    - Failed Snap Flip handling (rotates native MR only, blocks braking burn, prompts whip STA check).
  - Modal: `showSlingshotModal` with zone controls, Oberth ADF burn stepper, live calculation preview, 3D Pilot Check rolling, hazard damage application, and handover to `showCrewGCheckModal` if Total $\Delta\text{V} > 3$.

- [ ] **Step 3.1: Write failing tests in `client/test/SpaceVttSlingshot.test.js`**
  - Test proximity detection for Moon (dist 0), Planet (dist 0, dist 1), Gas Giant (dist 0, dist 1, dist 2).
  - Test slingshot button rendering when speed $\ge 4$ in valid zone.
  - Test routine slingshots apply speed/heading bonuses without pilot check.
  - Test Distance 0 slingshot rolls Pilot Check and triggers compound G-load modal when Total $\Delta\text{V} > 3$.
  - Test Distance 0 failed pilot check applies hazard damage and orbital decay status.

- [ ] **Step 3.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/SpaceVttSlingshot.test.js"
  ```

- [ ] **Step 3.3: Implement Slingshot detector, modal, and failed Snap Flip behavior in `client/src/views/SpaceVttView.vue`**
  - Implement celestial body proximity distance calculation.
  - Implement `.slingshot-box` in Token Inspector.
  - Implement `showSlingshotModal` markup, reactive state, Oberth stepper, and execution logic.
  - Update `executeBrakingBurn` and `executeSnapFlip` for safe 3 ΔV threshold and failed snap flip mechanics.

- [ ] **Step 3.4: Run tests to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/SpaceVttSlingshot.test.js test/SpaceVttFlipBurn.test.js"
  ```

- [ ] **Step 3.5: Commit Task 3**
  ```bash
  git add client/src/views/SpaceVttView.vue client/test/SpaceVttSlingshot.test.js client/test/SpaceVttFlipBurn.test.js
  git commit -m "feat(vtt): add celestial proximity detection and orbital slingshot modal to Space VTT"
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

- [ ] **Step 4.3: Run server tests to ensure zero backend regression**
  ```bash
  docker exec sf-vtt-dev sh -c "cd server && npm test"
  ```

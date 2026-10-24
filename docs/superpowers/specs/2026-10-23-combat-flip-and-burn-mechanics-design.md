# Star Frontiers VTT: Combat Flip & Burn Mechanics Design

## 1. Overview
This specification details the complete implementation of rulebook-accurate Combat Flip & Burn mechanics and G-force physics for the Star Frontiers Knight Hawks Virtual Tabletop. It establishes rotational independence from linear velocity, distinguishes maneuver execution by Maneuver Rating (Standard Flip vs. Lumbering Flip vs. Emergency Snap Flip), governs linear deceleration thresholds (Safe vs. High-G Braking Burns), and provides full automation for crew Stamina (STA) checks, G-LOC blackouts, and physical impact damage.

---

## 2. Core Physics Principles & Maneuver Execution

### 2.1 Physics Principles
- **Rotational Independence:** Attitude control thrusters (RCS) pivot a ship around its center of mass identically regardless of current linear speed. Speed does not affect the rotation itself.
- **Linear Deceleration (The Burn):** G-strain is determined strictly by the rate of deceleration ($\Delta V$ per turn), not total speed. Shedding 4 hexes of speed produces identical G-load regardless of initial speed.
- **Turn Scale:** 1 Combat Turn = 6 seconds.

### 2.2 Maneuvers by Maneuver Rating (MR)

| Maneuver Type | Ship MR | Execution Time | Vector & Hex Behavior | Crew STA Check Required? |
| :--- | :--- | :--- | :--- | :--- |
| **Standard Flip** | MR 3+ | 1 Turn (6s) | Pivots 180° in-hex; may spend remaining MR to decelerate against vector. | **No** (Inertial compensators absorb up to 2 hexes of braking). |
| **Lumbering Flip** | MR 1–2 | 2 Turns (12s) | **Turn 1:** Drifts along vector at full speed while rotating 90°.<br>**Turn 2:** Completes 180° pivot; may apply MR to decelerate. | **No** (Low angular and linear acceleration). |
| **Emergency "Snap" Flip** | MR 1–2 | 1 Turn (6s) | Pilot overloads RCS to force a 1-turn pivot in-hex. Requires **Pilot Spaceship Skill check** (or raw DEX check). | **Yes** (Centrifugal whip; crew rolls base STA check). |
| **High-G Braking Burn** | Any MR | 1 Turn (6s) | Pilot fires main drives past safe compensator threshold (decelerating by **3+ hexes** in a single turn). | **Yes** (Linear G-load; -10% per hex > 2). |

---

## 3. Crew Stamina (STA) Check Modifiers

When an Emergency "Snap" Flip or High-G Braking Burn ($\Delta V \ge 3$) occurs, crew members roll:
$$\text{Roll } d100 \le \text{Current STA} + \text{Modifiers}$$

| Condition / Factor | STA Check Modifier | Details |
| :--- | :--- | :--- |
| **Safe Burn Threshold (1–2 Hexes $\Delta V$)** | No Roll Needed | Ship compensators absorb up to 2 hexes seamlessly. |
| **High-G Burn (Per Hex of $\Delta V > 2$)** | **-10% per hex** | E.g., shedding 4 hexes = -20% penalty. |
| **Emergency "Snap" Flip (MR 1–2)** | **-10%** (Bow/Stern)<br>**0%** (Midships) | Centrifugal whip is worse at extremities than at center of gravity. |
| **Strapped into Crash Couch / Station** | **+20%** | Crew strapped in prior to or during the maneuver. |
| **Braced at Console / Grabbing Bulkhead** | **0%** | Standing crew braced and aware of maneuver. |
| **Unbraced / Moving / Boarding Party** | **-20%** | Caught mid-stride in corridors/bays without bracing. |

---

## 4. Failed STA Check Resolution (G-LOC & Physics)

$$\text{Margin of Failure} = \text{Roll} - \text{Modified STA Target}$$

### 4.1 Margin of Failure: 01–19 (Grey-Out / G-Stun)
- **Secured / Braced Crew:** Vision tunnels. Stunned for 1 Turn (no actions), -20% penalty to all checks on the following turn.
- **Unbraced Crew:** Knocked prone in current tile/hex, takes **1d3** hull-impact damage, and is Stunned for 1 Turn.

### 4.2 Margin of Failure: 20+ (Full G-LOC Blackout)
- **Secured / Braced Crew:** Passes out cold in crash couch for **1d6 Turns** (6–36 seconds).
- **Unbraced Crew:** Hurled **1d3 meters** toward ship's bow, takes **1d6** impact damage, and passes out for **1d6 Turns**.

---

## 5. UI & System Architecture

### 5.1 Pure Rules Utility (`client/src/utils/flipAndBurn.js`)
- `canStandardFlip(mr)`: `Number(mr) >= 3`.
- `canLumberingFlip(mr)`: `Number(mr) > 0 && Number(mr) < 3`.
- `canSnapFlip(mr)`: `Number(mr) > 0 && Number(mr) < 3`.
- `calculateStaCheckTarget(baseSta, options)`: Returns `{ target, gPenalty, postureMod, extremityMod, breakdown }`.
- `resolveStaCheckResult(roll, targetSta, posture)`: Calculates margin and returns structured outcome with damage, stun, and blackout duration dice.

### 5.2 Space VTT Token Inspector (`client/src/views/SpaceVttView.vue`)
- **Maneuver Options:**
  - Standard Flip (MR >= 3)
  - Lumbering Flip across 2 turns (MR 1-2)
  - Emergency Snap Flip (MR 1-2) with Pilot Check prompt
  - Braking Burn Deceleration stepper ($\Delta V$) with Safe vs. High-G indicator
- **Interactive Crew G-Load Check Dialog:**
  - Posture selector (`Couch +20%`, `Braced 0%`, `Unbraced -20%`)
  - Location selector (`Midships 0%`, `Bow/Stern -10%`)
  - Target STA input or character selection
  - 3D `d100` roll trigger and instant resolution logged to Roll Log

### 5.3 Ship Sheets View (`client/src/views/ShipSheetsView.vue`)
- Updated **Flip & Burn Maneuver** card in Flight & Tactical Stats showing Standard, Lumbering, Snap Flip, and High-G Burn rules.

---

## 6. Verification Plan
1. **Unit Tests (`client/test/flipAndBurn.test.js`):**
   - Test MR eligibility for Standard, Lumbering, and Snap Flips.
   - Test target STA calculations across combinations of $\Delta V$, posture, and extremity location.
   - Test Margin of Failure categorization (Success, G-Stun 1-19, G-LOC 20+).
   - Test damage and blackout turn determinations for secured vs. unbraced crew.
2. **Component Integration Tests (`client/test/SpaceVttFlipBurn.test.js` & `client/test/ShipSheetsView.test.js`):**
   - Verify maneuver buttons appear based on ship MR.
   - Verify Crew G-Load dialog opens with correct modifiers on Snap Flip and High-G Burn.
3. **Full Suite Verification:**
   - Client tests (`npx vitest run`) and client production build (`npm run build`).

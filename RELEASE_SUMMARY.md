# Star Frontiers VTT - Release v0.10.0 Summary

**Release Tag:** `v0.10.0`  
**Date:** October 24, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.10.0` introduces rulebook-accurate **Knight Hawks Master Physics**, **Combat Flip & Burn Mechanics**, and **Celestial Orbital Slingshots with Oberth Effect Burns** on the 10,000 km hex grid. It also delivers the **Real-Time Tactical Ping System**, **Tactical Wireframe Toolbar Icons**, **Plain ASCII Character Sheet Downloads**, **Character & Ship Freeform Healing/Restoration**, and **Global Dark Sci-Fi Contextual Scrollbars**.

---

## 2. Key Features & Capabilities in v0.10.0

### Master High-G Maneuvers & Knight Hawks Space Physics
- **Rotational Independence & Maneuver Agility:**
  - Angular pivot around center of mass is decoupled from linear speed vector.
  - Spends 3 MR for a canonical 180° pivot (3 hex-faces at 60° each).
  - **MR 3+**: Executes a 1-Turn in-hex Standard Flip & Burn (no check required).
  - **MR 1–2**: Supports 2-Turn Lumbering Flip (drifts at current speed rotating native MR on Turn 1, completing 180° on Turn 2) or 1-Turn Emergency Snap Flip (Pilot check required; crew rolls centrifugal whip STA check: -10% Bow/Stern, 0% Midships).
  - **Failed Snap Flip Resolution**: Pilot failure rotates native MR only (60° or 120°), blocks main engine braking, and subjects crew to thruster misfire whip STA check.
- **Safe 3 ΔV Compensator Threshold & High-G Deceleration:**
  - Standard ship inertial compensators safely absorb up to 3 points of total ΔV (braking, acceleration, or gravitational shear) in a single turn without requiring a crew check.
  - Decelerating by 4+ ADF applies a High-G Stamina check penalty of -10% per point spent above 3.
- **Native d10 / d100 G-LOC Physics Resolution:**
  - Strictly native d10/d100 dice mechanics with `ceil(1d10 / 2)` (1–5) light rolls.
  - Posture modifiers: Crash couch (+20%), Braced (0%), Unbraced (-20%).
  - **G-Stun (Margin 01–19)**: Secured crew stunned 1 turn and -20% next turn; unbraced crew knocked prone, takes `ceil(1d10 / 2)` (1–5) damage, stunned 1 turn.
  - **Full G-LOC Blackout (Margin 20+)**: Secured crew unconscious for `ceil(1d10 / 2)` turns (6–30s); unbraced crew hurled `ceil(1d10 / 2)` meters, takes 1d10 impact damage, unconscious `ceil(1d10 / 2)` turns.
- **Interactive Crew G-Load Check Dialog:**
  - Dedicated interactive modal with live formula breakdown, 3D dice rolls with audio/HUD, and automated tactical Roll Log reporting.

### Moon & Planet Gravitational Slingshots & Oberth Burns
- **Celestial Slingshot Zones (10,000 km Hex Grid):**
  - Minimum entry speed of 4 Hexes/Turn (40,000 km/turn).
  - **Moon: Crater Skim (Distance 0)**: +1 Hex-Face (60°) vector bend, +1 Hex/Turn exit speed, Pilot check (-5% per speed > 8), 2 ΔV (Safe).
  - **Planet: Outer Well (Distance 1)**: +1 Hex-Face (60°), +1 Hex/Turn exit speed, Routine (Safe).
  - **Planet: Low-Orbit Skim (Distance 0)**: +2 Hex-Faces (120°), +2 Hexes/Turn exit speed, Pilot check (-5% per speed > 6), 3 ΔV (Safe).
  - **Gas Giant: Outer Well (Distance 1–2)**: +1 Hex-Face (60°), +1 Hex/Turn exit speed, Routine (Safe).
  - **Gas Giant: Deep Skim (Distance 0)**: +3 Hex-Faces (180°), +3 Hexes/Turn exit speed, Pilot check at -20% (-5% per speed > 6), 4 ΔV (-10% Crew STA check).
- **The Oberth ADF Burn (Distance 0):**
  - Burning ADF forward at periapsis/perilune grants +2 Hexes/Turn exit speed per ADF spent.
  - Compound G-load: $\text{Total }\Delta\text{V} = \text{Base Gravity }\Delta\text{V} + (\text{ADF spent} \times 2)$.
  - Automatically transfers to the Crew G-Load dialog when Total ΔV > 3.
- **Distance 0 Hazard Engine:**
  - *Minor (01–19)*: Free turn completes, loses speed bonus, Moon takes 1d10 (screens absorb), Planet/Gas Giant takes 2d10 structural, unbraced crew prone + `ceil(1d10 / 2)` damage.
  - *Major (20+)*: Speed halved, Moon takes 3d10 (60° deflection), Planet/Gas Giant takes 4d10 structural, trapped in hex with `ORBITAL_DECAY_REQUIRES_2_ADF_ESCAPE`.
- **Proximity Detection**:
  - Automatically detects distance to Moon, Planet, or Gas Giant using canonical odd-r hex geometry while excluding non-gravitational tokens (asteroids, debris, stations).

### Tactical VTT Real-Time Ping System
- Interactive canvas ping tool on both RPG VTT and Space VTT.
- Synchronized via Socket.io with animated pulsing radial rings, color-coded user avatars/names, sound effects, auto-dismiss timers, and GM Clear All Pings control.

### UI & UX Polish
- **Tactical Wireframe Toolbar Icons**: Replaced emoji buttons with dynamic lined wireframe SVG icons featuring neon glowing vector aesthetic.
- **Dark Blue Rocket Tab**: Styled Space VTT navigation tab with a custom dark blue rocket icon.
- **Plain ASCII Character Export**: One-click download button on Character Sheets header producing clean 80-column plain ASCII `.txt` export formatted for terminals and notepad.
- **Digital Sheet Recovery Tools**: Freeform damage/heal steppers, Full Rest / Repair & Resupply actions, and dedicated SEU pool tracking.
- **Dark Contextual Scrollbars**: Styled sci-fi slim scrollbars across Roll Log, GM Notes, and Rulebooks panels.

---

## 3. Verification & Test Metrics
- **Client Test Suite**: 50 test files passed, 678 total tests passed (100% passing).
- **Server Test Suite**: 18 test files passed, 233 total tests passed (100% passing).
- **Production Build**: Built cleanly with Vite in 3.40s.

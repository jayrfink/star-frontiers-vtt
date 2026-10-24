# Star Frontiers VTT: Master High-G Maneuvers & Orbital Slingshot Design Spec

**System:** *Star Frontiers: Knight Hawks* (d10 / d100 Native)  
**Grid Scale:** `1 Hex = 10,000 km` | **Deck Scale:** `1 Tile = 1.5m / 2m` | **Internal Reaction Window:** `6 Seconds / Turn`  
**Date:** 2026-10-23

---

## 1. Core Physics Architecture & Knight Hawks Native Rules

* **Grid Scale:** `1 Hex = 10,000 km`. Velocity is measured in hexes per turn (where 1 turn = 6 seconds). Speed is cumulative and frictionless from turn to turn in deep space.
* **Rotational Independence:** Speed does **not** alter the G-forces of a 180° flip. Attitude control thrusters (RCS) pivot the ship around its center of mass identically regardless of current linear velocity.
* **Maneuver Rating (MR):** Measures rotational agility in 60° hex-faces per turn.
  * A full 180° flip spans **3 hex-faces** ($3 \times 60^\circ = 180^\circ$).
  * Vessels with **MR 3+** can naturally execute a 1-turn in-hex pivot.
  * Vessels with **MR 1–2** require either a 2-turn Lumbering Flip or an RCS-overloaded Emergency Snap Flip.
  * Gravitational slingshots award **Free Hex-Face Turns (Bonus MR)** that do not consume the ship's native MR allowance.
* **Acceleration/Deceleration Factor (ADF):** Measures linear thrust in hexes/turn that can be added or subtracted from speed during a single turn (typically ADF 1–3 for freighters and capital vessels; ADF 4–5 for scouts and fighters).
* **Safe Compensator Threshold ($3\ \Delta\text{V}$):** Standard ship inertial compensators safely absorb up to **3 points of total $\Delta\text{V}$** (ADF braking/acceleration or gravitational shear) in a single turn without requiring a Crew Stamina check.
* **Native Dice Rules:** Strictly $\text{d}10$ and $\text{d}100$ (percentile). Light rolls of $1\text{--}5$ use $\lceil \text{d}10 / 2 \rceil$ (`roll_d5`).

---

## 2. Combat Flip & Burn Mechanics

### 2.1 Maneuver Execution Table

| Maneuver Mode | Ship Agility & Thrust | Duration | VTT Hex & Vector Behavior | Crew STA Check Required? |
| :--- | :--- | :--- | :--- | :--- |
| **Standard Flip & Burn** | **MR 3+** (ADF 1–3) | 1 Turn (6s) | Spends 3 MR to pivot 180° in-hex; immediately applies up to 3 ADF braking against vector. | **No** (Within MR 3+ agility and safe 3 ADF compensator limits). |
| **Lumbering Flip & Burn** | **MR 1–2** (Any ADF) | 2 Turns (12s) | **Turn 1:** Drifts along current vector at full speed rotating $60^\circ\text{--}120^\circ$ (native MR).<br>**Turn 2:** Completes 180° pivot; may apply ADF to decelerate. | **No** (Unless braking with ADF 4+ on Turn 2). |
| **Emergency "Snap" Flip** | **MR 1–2** (Any ADF) | 1 Turn (6s) | Pilot overloads RCS attitude jets to force 180° pivot in 1 turn, then applies ADF braking. Requires **Pilot Spaceship Skill check**. | **Yes** (Centrifugal whip: all crew roll STA check). |
| **High-G Braking Burn** | **Any MR** (ADF 4–5 or Overload) | 1 Turn (6s) | Pilot decelerates by **4+ ADF** in a single turn. | **Yes** (Linear G-load: $-10\%$ per point of ADF spent above 3). |

### 2.2 Failed Snap Flip Resolution
If an MR 1–2 pilot fails the Spaceship Skill check to execute a 1-turn Snap Flip:
1. The ship only rotates its **native MR** (1–2 hex-faces: $60^\circ$ or $120^\circ$).
2. The ship **cannot fire main drives against its vector** this turn.
3. The crew **still rolls the Snap Flip centrifugal STA check** due to RCS thruster misfire and violent whip.

---

## 3. Celestial Body Slingshot Mechanics & Oberth Effect

### 3.1 Slingshot Interaction Zones

*Minimum Entry Speed:* A vessel must enter the slingshot hex with a speed of at least **4 Hexes/Turn ($40,000\text{ km/turn}$)**.

| Celestial Body & Zone | Hex Dist | Orbital Equivalent | Bonus MR (Free Vector Bend) | Bonus ADF (Free Exit Speed) | Base Pilot Check | Base Gravity $\Delta\text{V}$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Moon: Crater Skim** | 0 Hexes | Low Perilune ($< 100\text{ km}$) | **+1 Hex-Face** ($60^\circ$) | **+1 Hex/Turn** | Pilot Skill ($-5\%$ per speed $> 8$) | **2 $\Delta\text{V}$** (Safe) |
| **Planet: Outer Well** | 1 Hex | Medium / Geo Transfer | **+1 Hex-Face** ($60^\circ$) | **+1 Hex/Turn** | None (Routine) | **1 $\Delta\text{V}$** (Safe) |
| **Planet: Low-Orbit Skim** | 0 Hexes | Low Orbit / Atmosphere ($< 1,000\text{ km}$) | **+2 Hex-Faces** ($120^\circ$) | **+2 Hexes/Turn** | Pilot Skill ($-5\%$ per speed $> 6$) | **3 $\Delta\text{V}$** (Safe) |
| **Gas Giant: Outer Well** | 1–2 Hexes | Magnetosphere / Moons | **+1 Hex-Face** ($60^\circ$) | **+1 Hex/Turn** | None (Routine) | **2 $\Delta\text{V}$** (Safe) |
| **Gas Giant: Deep Skim** | 0 Hexes | Upper Cloud Deck | **+3 Hex-Faces** ($180^\circ$) | **+3 Hexes/Turn** | Pilot Skill at **$-20\%$** ($-5\%$ per speed $> 6$) | **4 $\Delta\text{V}$** ($-10\%$ STA Check) |

### 3.2 Powered Slingshots (Oberth ADF Burn at Distance 0)
* **ADF Thrust Multiplier:** Every 1 point of ADF spent on forward acceleration while inside the `Distance 0` hex yields **+2 Hexes/Turn** of exit speed (in addition to the zone's Free Exit Speed).
* **Compound G-Load Formula:**
  $$\text{Total }\Delta\text{V} = \text{Base Gravity }\Delta\text{V} + (\text{ADF Spent in Skim} \times 2)$$
  * Any $\text{Total }\Delta\text{V} > 3$ triggers the shared High-G Crew STA check at **$-10\%$ per point of $\Delta\text{V}$ over 3**.

### 3.3 Failed Pilot Checks at Distance 0 (Moon vs. Planet Hazards)
Calculate Margin of Failure ($\text{Roll} - \text{Target}$):

* **Margin 01–19 (Grazing Scrape / Atmospheric Skip):**
  * Ship completes free vector bend (Bonus MR) and exits the hex, but **loses the Free Exit Speed bonus**.
  * *Moon Hazard:* Ship takes **$1\text{d}10$ hull damage** (defensive screens absorb).
  * *Planet / Gas Giant Hazard:* Ship takes **$2\text{d}10$ structural hull damage** (ignores screens/shields).
  * *Crew Jolt:* Unbraced crew knocked **Prone** and take **$\lceil \text{d}10 / 2 \rceil$ (1–5) damage**.

* **Margin 20+ (Lithobraking Impact / Gravity Capture):**
  * Ship loses half current speed ($\lfloor \text{speed} / 2 \rfloor$).
  * *Moon Hazard (Ridge Impact):* Ship takes **$3\text{d}10$ structural damage** (ignores screens), exits on scatter vector ($60^\circ$ deflection).
  * *Planet / Gas Giant (Gravity Capture / Sub-Orbital Decay):* Ship is **trapped in Distance 0 hex**, takes **$4\text{d}10$ structural shear/heat damage** (ignores screens), and gains status `"ORBITAL_DECAY_REQUIRES_2_ADF_ESCAPE"` (must burn 2 ADF outward next turn to escape).

---

## 4. Shared Crew Stamina (STA) & G-LOC Resolution

### 4.1 Modifiers Table

| Condition / Factor | STA Check Modifier | Notes |
| :--- | :--- | :--- |
| **Safe Threshold ($\le 3\ \Delta\text{V}$)** | No Roll Needed | Unless executing Emergency Snap Flip. |
| **High-G Load ($\Delta\text{V} > 3$)** | **$-10\%$ per point $> 3$** | e.g. $4\ \Delta\text{V} = -10\%$; $5\ \Delta\text{V} = -20\%$. |
| **Emergency Snap Flip** | **$-10\%$** (Bow/Stern)<br>**$0\%$** (Midships) | Centrifugal whip at extremities. |
| **Strapped into Crash Couch** | **$+20\%$** | Strapped in at station. |
| **Braced at Console** | **$0\%$** | Standing crew holding handrails/bulkhead. |
| **Unbraced / Moving** | **$-20\%$** | Caught mid-stride in corridors or cargo bay. |

### 4.2 Failed STA Check Effects (Margin = $\text{Roll} - \text{Target}$)

* **Margin 01–19 (Grey-Out / G-Stun):**
  * *Secured Crew (Couch / Braced):* Stunned 1 Turn (no actions), $-20\%$ to checks on next turn.
  * *Unbraced Crew:* Knocked Prone, takes $\lceil \text{d}10 / 2 \rceil$ (1–5) hull-impact damage, Stunned 1 Turn.
* **Margin 20+ (Full G-LOC Blackout):**
  * *Secured Crew (Couch / Braced):* Unconscious for $\lceil \text{d}10 / 2 \rceil$ (1–5) Turns.
  * *Unbraced Crew:* Hurled $\lceil \text{d}10 / 2 \rceil$ (1–5) meters opposite thrust vector on deck map, takes **$1\text{d}10$ impact damage**, unconscious for $\lceil \text{d}10 / 2 \rceil$ (1–5) Turns.

---

## 5. UI Architecture & Components

1. **`client/src/utils/flipAndBurn.js` (Core Physics Engine):**
   - Safe threshold set to $3\ \Delta\text{V}$.
   - Dice functions using $\text{d}10$ native notation and $\lceil \text{d}10 / 2 \rceil$.
   - Maneuver classifiers (`canStandardFlip`, `canLumberingFlip`, `canSnapFlip`).
   - Slingshot calculation functions: `calculateSlingshotParameters`, `calculateCompoundDeltaV`, `resolveSlingshotPilotCheck`.
   - Alert formatters for all maneuvers and slingshot outcomes.

2. **`client/src/views/SpaceVttView.vue` (Space VTT Canvas & Inspector):**
   - **Proximity Detector:** Computes hex distance to nearest celestial body (`Moon`, `Planet`, `Gas Giant`).
   - **Token Inspector Slingshot Banner:** Appears when speed $\ge 4$ and within slingshot range ($d \le 1$ or $d \le 2$).
   - **Orbital Slingshot Modal (`showSlingshotModal`):**
     - Selects zone, Oberth ADF burn stepper ($0\dots\text{ADF}$).
     - Shows live Compound $\Delta\text{V}$, Exit Speed, Bonus MR, and Pilot Check Target.
     - Rolls 3D d100 Pilot Check with sound and logs outcome.
     - Automatically hands over to the Crew G-Load Check modal if Compound $\Delta\text{V} > 3$.
   - **Crew G-Load Check Modal (`showCrewGCheckModal`):**
     - Posture & location toggles, live formula breakdown, 3D dice roll, and tactical Roll Log reporting.

3. **`client/src/views/ShipSheetsView.vue` (Ship Flight Stats Banner):**
   - Displays updated Knight Hawks rules: Safe 3 ADF braking, 4+ ADF High-G checks, Standard Flip for MR 3+, Lumbering/Snap Flip for MR 1–2.

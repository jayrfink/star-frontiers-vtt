# Specification: Click-to-Open Token HUD Drawer Component

## 1. Overview
When a Game Master or player clicks on an adversary token on the VTT canvas, the interface must provide instant access to the token's mutable tactical state and combat action reference without obstructing map navigation. 

This specification defines the **`AdversaryTokenHud`** component: a high-efficiency tactical drawer/popover that splits into a **Top Mutable Tactical Bar** (for live combat adjustments) and a **Bottom Read-Only Reference Card** (for zero-math action resolution).

---

## 2. Component Architecture & UI Layout

```
+--------------------------------------------------------------+
| [●] Sathar Boarding Trooper #2          [Tier 2 Regular] [×] |
+--------------------------------------------------------------+
|  TOP MUTABLE TACTICAL BAR (Auto-Saves to Scene State)         |
|  STA (HP): [ 38 ] / 50   [ -12 ] [ +5 ]  [Delta: ______ ]     |
|  SEU Pool: [ 24 ] / 50   [ -1  ] [ -5 ]                       |
|  Conditions:                                                  |
|  [⚡ Stunned] [🩸 Wounded] [💀 Unconscious] [🎯 Pinned] [🛡️ Cover]|
+--------------------------------------------------------------+
|  BOTTOM REFERENCE CARD (From AdversaryTemplate)              |
|  IM: +5 (RS 50)  |  Move: 12 m/s  |  Defenses: Skein Suit     |
|--------------------------------------------------------------|
|  ACTIONS & ATTACKS (Pre-Calculated Target %)                 |
|  • Laser Rifle:  45% to Hit | 1d10 to 5d10 (1-5 SEU) | 100m   |
|    [Roll Attack] [Roll Damage]                                |
|  • Vibroknife:   35% to Hit | 1d10+2 | Melee                  |
|    [Roll Attack] [Roll Damage]                                |
|--------------------------------------------------------------|
|  SPECIAL TRAITS & SKILLS                                     |
|  • Hypnotic Gaze: Target within 5m must check INT or stunned |
|  • Military Training: +10% to surprise checks                |
+--------------------------------------------------------------+
```

---

## 3. Top Mutable Tactical Bar Specification

### 3.1 Delta Math Stamina / HP Input Engine
Combat in Star Frontiers and other TTRPGs frequently applies damage and healing adjustments. Requiring the GM to manually calculate arithmetic (e.g., "43 minus 17 is...") slows down combat.

The Stamina/HP input must accept:
1. **Direct Value Replacement:** Entering `35` sets `hp_current = 35`.
2. **Delta Subtraction:** Entering `-12` subtracts 12 from `hp_current`.
3. **Delta Addition:** Entering `+5` adds 5 to `hp_current`.
4. **Boundary Clamping:** Resulting Stamina is automatically clamped between `0` and `hp_max`. When `hp_current === 0`, the token automatically receives the `Unconscious` or `Dead` condition tag.

#### Delta Arithmetic Logic (JavaScript Algorithm)
```javascript
export function applyHpDelta(currentHp, maxHp, rawInput) {
  const str = String(rawInput).trim();
  if (!str) return currentHp;

  let nextHp = currentHp;
  if (str.startsWith('+')) {
    const delta = parseInt(str.substring(1), 10);
    if (!isNaN(delta)) nextHp += delta;
  } else if (str.startsWith('-')) {
    const delta = parseInt(str.substring(1), 10);
    if (!isNaN(delta)) nextHp -= delta;
  } else {
    const val = parseInt(str, 10);
    if (!isNaN(val)) nextHp = val;
  }

  return Math.max(0, Math.min(maxHp, nextHp));
}
```

### 3.2 Quick Delta Buttons
Beside the Stamina field, provide single-click tactical adjustment buttons:
- `-10`, `-5`, `-1` (Red/Amber decrement chips)
- `+1`, `+5` (Green healing chips)

### 3.3 Interactive Conditions Pill Selector
- Renders conditions as clickable badges:
  - `⚡ Stunned`
  - `💀 Unconscious`
  - `🩸 Wounded`
  - `🎯 Pinned`
  - `🛡️ In Cover`
  - `🧪 Poisoned`
  - `🔥 Burning`
- Clicking a condition pill toggles it in `token.conditions`.
- The active status icons are reflected immediately above the token on the canvas map (`renderSingleToken` in `VttCanvas.vue`).

### 3.4 SEU Energy Pool Tracker (For Sentient NPCs)
- If the adversary template includes an energy pool (`seu_max > 0`), renders an interactive counter: `[ current_seu ] / max_seu`.
- Firing energy weapons automatically checks and decrements the pool or warns the GM when depleted.

---

## 4. Bottom Reference Card Specification

### 4.1 Tactical Header Summary
- **Threat Tier Badge:** Colored chip (`Tier 1: Green`, `Tier 2: Blue`, `Tier 3: Purple`, `Tier 4: Gold`, `Tier 5: Crimson`).
- **Initiative & Reaction Speed:** Displays `IM: +X (RS YY)`.
- **Movement Rates:** Displays walk, run, and glide/flight speeds.
- **Defenses & Armor Summary:** Clear display of armor type and screen absorb capacities (e.g. `Skein Suit (half kinetic), Albedo Screen (40 SEU)`).

### 4.2 Actions & Attacks Display
- Each action card displays:
  - **Action Name** (e.g. `Laser Rifle`, `Bite`, `Acid Spit`)
  - **Pre-Calculated Hit Chance:** Prominently featured percentage pill: `🎯 45% to Hit`
  - **Damage Formula:** Clear dice notation: `💥 3d10` or `💥 1d10 to 5d10`
  - **Effective Range & Cost:** `📏 100m • ⚡ 3 SEU`
  - **Action Buttons:**
    - `[Roll To Hit]`: Triggers a 3D percentile roll against the pre-calculated target percentage and publishes the result to the shared roll log (`roll:created`).
    - `[Roll Damage]`: Triggers a 3D damage dice roll matching the damage formula.

### 4.3 Traits & Special Abilities
- Renders passive traits, special senses (e.g. `Night Vision`, `Vibration Sense`), and triggered counterattacks in clean, collapsible sci-fi callout panels.

---

## 5. Portability Contract (Porting to D&D 5e)
When this exact component is mounted in a fantasy D&D 5e VTT:
- The Top Mutable Bar operates identically (`HP`, delta math, `Concentration`, `Prone`, `Poisoned`, `Stunned`).
- The Action Card renders `+5 to Hit` (instead of `45% to Hit`) and `1d8+3 Piercing` (instead of `1d10`).
- The component does not contain any hardcoded Star Frontiers rules or tables—it renders entirely from `AdversaryTemplate.actions` and `TokenInstance`.

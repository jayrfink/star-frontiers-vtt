# Star Frontiers VTT — Alpha Dawn Character Sheet Refinement Design Spec

## Goal
Upgrade `CharacterSheetsView.vue` with official Alpha Dawn character generation and sheet rules, derived tactical sub-stats (IM, Punching Damage, Melee Hit %, Carrying Capacity, Movement), official 13-skill catalog with XP advancement calculator, encumbrance tracking, and full racial abilities integration.

## Components & Modules

### 1. Alpha Dawn Character Rules Module (`client/src/constants/characterRules.js`)
Export constants and calculators for Alpha Dawn rulebook specifications:
- **Racial Base Modifiers & Movement**:
  - `Human`: Modifiers `{ str_sta: 0, dex_rs: 0, int_log: 0, per_ldr: 0 }`, Movement `{ walk: 2, run: 6 }`
  - `Dralasite`: Modifiers `{ str_sta: 5, dex_rs: -5, int_log: 0, per_ldr: 0 }`, Movement `{ walk: 1, run: 4 }`
  - `Vrusk`: Modifiers `{ str_sta: -5, dex_rs: 5, int_log: 0, per_ldr: 0 }`, Movement `{ walk: 3, run: 7 }`
  - `Yazirian`: Modifiers `{ str_sta: -10, dex_rs: 5, int_log: 5, per_ldr: 0 }`, Movement `{ walk: 2, run: 6, glide: 4 }`
- **Derived Calculators**:
  - `calcIM(rs)`: `Math.ceil(rs / 10)`
  - `calcPunchDamage(str)`: `str <= 20 ? 1 : str <= 40 ? 2 : str <= 60 ? 3 : str <= 80 ? 4 : 5`
  - `calcMeleeHit(str, dex)`: `Math.max(Math.ceil(str / 2), Math.ceil(dex / 2))`
  - `calcMaxCarry(str)`: `str` (kg)
  - `calcMaxUnencumbered(str)`: `Math.floor(str / 2)` (kg)
- **13 Official Skills Catalog**:
  - `Military`: Beam Weapons, Gyrojet Weapons, Projectile Weapons, Melee Weapons, Thrown Weapons, Demolitions, Martial Arts (Base XP multiplier: 3)
  - `Technological`: Computer, Robotics, Technician (Base XP multiplier: 4)
  - `Biosocial`: Environmental, Medical, Psycho-Social (Base XP multiplier: 5)
  - `calcXPCost(skillName, targetLevel, characterPSA)`: Computes XP cost (doubled if outside character's PSA).

### 2. Character Sheet UI Enhancements (`CharacterSheetsView.vue`)
- **Header & Primary Stats**:
  - Primary d100 ability pairs (STR, STA, DEX, RS, INT, LOG, PER, LDR) with pair point shifting support (-10 to +10).
  - Live Stamina Tracker (-5, -1, +1, +5) with status state (*Conscious*, *Wounded/Half Speed* at ≤ 50% STA, *Unconscious* at 0 STA, *Dead* at < 0 STA without Staydose).
- **Tactical Sub-Stats Panel**: Real-time display of Initiative Modifier (IM), Punching Damage, Melee Hit %, Encumbrance Weight Gauge, and Movement Rates (Walk / Run / Glide).
- **Racial Abilities Panel**:
  - Dralasite: Elasticity (Max Limbs = `Math.ceil(DEX / 10)`), Lie Detection %
  - Vrusk: Comprehension %, Ambidexterity
  - Yazirian: Battle Rage %, Gliding, Night Vision
  - Human: Ability Bonus selector
- **Skills System**:
  - Official Skill dropdown picker, PSA alignment indicator, success rate display, level control (1-6), and XP Upgrade button.
- **Inventory & Encumbrance**:
  - Item listing with quantity and mass (kg). Total weight calculated and compared against Carrying Capacity (`STR / 2` kg) with visual warnings.

## Verification
- Verify sub-stat calculators match Alpha Dawn rules exactly.
- Verify real-time socket events sync character edits live across browsers.
- Verify client build succeeds with 0 errors and all server tests pass.

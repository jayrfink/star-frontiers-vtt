# Specification: Threat Tier Scaling (Star Frontiers Difficulty Benchmark)

## 1. Overview
Star Frontiers: Alpha Dawn does not utilize Challenge Rating (CR) or character class levels. To enable dynamic encounter stocking and automated balancing, this specification defines a **Threat Tier (1 to 5)** benchmark governing adversary statistics, combat skill levels, hit chances, defense equipment, and creature attack formulas.

Adversaries branch into two distinct procedural generation paths:
1. **Path A: Sentient NPCs** (Human, Vrusk, Dralasite, Yazirian, Sathar, Mechanon)
2. **Path B: Alien Creatures & Beasts** (Native frontier fauna, bio-engineered predators, vermin)

---

## 2. Path A: Sentient NPCs

### 2.1 Core Mathematical Rules
- **Ability Pairs:** `STR/STA`, `DEX/RS`, `INT/LOG`, `PER/LDR` (standard Star Frontiers D100 ratings).
- **Initiative Modifier (`IM`):** Calculated as `ceil(RS / 10)` (range: `+4` to `+9`).
- **Melee Base Chance:** Calculated as `ceil(max(STR, DEX) / 2)`.
- **Combat Skill Chances:**
  - Base skill success chance is half of the governing ability score:
    - Beam Weapons, Projectile Weapons, Gyrojet Weapons: `ceil(DEX / 2)`
    - Melee Weapons, Martial Arts: `Melee Base`
  - Each **Skill Level (1 to 6)** adds a flat **`+10%`** bonus to the base chance:
    $$\text{Target } \% = \left\lceil \frac{\text{Governing Stat}}{2} \right\rceil + (\text{Skill Level} \times 10)$$
  - *Example:* A Tier 2 Sathar with DEX 50 and Beam Weapons Level 2 has a target chance of $25 + 20 = 45\%$.
- **Punching / Unarmed Damage:** Derived from STR according to official Alpha Dawn rules:
  - STR 1–20: 1 pt
  - STR 21–40: 2 pts
  - STR 41–60: 1d10 (half damage, min 1) or 3 pts
  - STR 61–80: 1d10 or 4 pts
  - STR 81+: 1d10+1 or 5 pts

### 2.2 Sentient NPC Threat Tier Benchmark Table

| Tier | Label | Ability Score Range | Primary Combat Skill | Stamina (STA / HP) | Defenses & Armor | Weapons & Tactical Gear |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Green / Minion** | 35 – 45 | Level 0 – 1 (+0% to +10%) | 30 – 40 | Unarmored (0 DR) | Sonic Sword (1d10), Automatic Pistol (1d10), Laser Pistol (1d10 per 1 SEU), 20 SEU clip. |
| **2** | **Regular / Soldier** | 45 – 55 | Level 2 (+20%) | 45 – 55 | Skein Suit (half damage vs kinetic/fall/explosion) | Laser Rifle (1d10 to 5d10), Automatic Rifle (1d10 to 4d10 burst), 50 SEU clip, 1 Frag Grenade. |
| **3** | **Veteran / Sergeant** | 55 – 65 | Level 3 – 4 (+30% to +40%) | 60 – 75 | Albedo Screen (absorbs 40 pts beam) or Inertia Screen (absorbs 30 pts kinetic) + Skein Suit | Heavy Laser (2d10 to 10d10), Needler Pistol, Doze/Stun Grenades, 100 SEU belt pack. |
| **4** | **Elite / Officer** | 65 – 75 | Level 4 – 5 (+40% to +50%) | 80 – 100 | Powered Combat Armor (-20 to -30 damage reduction) or Dual Screen harness | Gyrojet Rifle with Explosive Shells (3d10), Heavy Laser, Vibroknife, smoke/gas countermeasures. |
| **5** | **Boss / Commander** | 75 – 85+ | Level 5 – 6 (+50% to +60%) | 100 – 130+ | Dual Deflection Screens + Powered Battle Armor + Cybernetic Sub-dermal plating | Customized Gauss/Particle Cannon, Electro-Stunner, Multi-Grenade Launcher, Tactical Command aura. |

---

## 3. Path B: Alien Creatures & Beasts

### 3.1 Core Mathematical Rules
Alien creatures do not use NPC weapon skill ratings or standard ability pairs. Instead, creatures follow the official Star Frontiers Creature Format:
- **Type / Diet:** `Carnivore`, `Omnivore`, `Herbivore`, `Scavenger`.
- **Size:** `Small` (0.5m – 1m, Token Size 1x1), `Medium` (1m – 2m, Token Size 1x1), `Large` (2m – 4m, Token Size 2x2), `Very Large` (4m+, Token Size 3x3).
- **Movement:** Standard walking/slithering/flying speed in meters per turn (e.g. `Walk: 12 m/s, Fly: 24 m/s`).
- **Base Attack Chance (%):** A flat percentile target number representing natural predatory accuracy.
- **Attacks & Damage:** Number of attacks per turn (e.g. `2 Claws / 1 Bite`) with explicit damage dice formulas (e.g. `2d10`, `3d10+4`).
- **Special Attacks & Traits:**
  - *Poison / Venom:* On hit, victim must roll `STA or less` on d100 or suffer extra poison damage / paralysis.
  - *Acid Spit:* Ranged attack with burning ongoing damage per turn until washed off.
  - *Carapace / Natural Armor:* Reduces kinetic and/or beam damage by a fixed value per hit (e.g. `-5 damage from ballistic attacks`).
  - *Burrowing / Ambusher:* Free surprise attack round when striking from beneath terrain.

### 3.2 Alien Creature Threat Tier Benchmark Table

| Tier | Label | Base Attack % | Stamina (STA / HP) | Attacks per Turn | Base Damage Formula | Special Abilities / Traits |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Vermin / Lesser** | 35% – 45% | 15 – 35 | 1 attack | 1d10 or 2d6 | Pack tactics, agile dodge (+10% defense). |
| **2** | **Predator / Swarm** | 50% – 60% | 40 – 75 | 1 – 2 attacks | 2d10 or 3d10 | Pounce / knockdown (requires DEX check or fall prone). |
| **3** | **Apex Stalker** | 65% – 75% | 80 – 130 | 2 – 3 attacks | 3d10 to 4d10+ | 1 Special Trait: Paralytic Venom (S12) or Acid Blood (1d10 on melee attackers). |
| **4** | **Behemoth / Terror** | 75% – 85% | 140 – 220 | 3 – 4 attacks | 4d10 to 6d10 | Chitinous Plating (reduces all damage by 10), Trample (area attack), Subterranean Burrowing. |
| **5** | **Gargantuan Boss** | 85% – 95% | 250 – 400+ | 4+ attacks | 6d10 to 8d10+ | Bio-Electric Shockwave (cone 15m, 5d10 stun/damage), Regenerating Flesh (10 STA/turn), Fearsome Roar. |

---

## 4. Pre-Calculation Guarantee
All generated actions must have their final target percentage, range, damage formula, and ammo/SEU consumption pre-calculated at template creation time. The VTT client during combat should never calculate skill formulas or stat modifiers dynamically on the fly—the GM should be able to look at the token action and roll immediately against the pre-calculated percentage.

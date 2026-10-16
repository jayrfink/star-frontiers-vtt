---
name: stock-encounter
description: Stocks tactical VTT maps with rulebook-accurate Star Frontiers Sentient NPCs or Alien Creatures using procedural Threat Tier scaling, circular token art generation, and collision-avoidant canvas placement.
---

# Stock Encounter Skill

This skill allows Game Masters to populate the active tactical battle map directly from conversational natural language prompts or structured CLI options during prep or live sessions.

## Architecture & Pipeline

When stocking an encounter, follow the 4-step pipeline:

```
[Prompt: "Create 3 Tier 2 Sathar Troopers..."]
       │
       ▼
 1. Parse Threat Tier, Category, Weapon/Armor/Attacks
       │
       ▼
 2. Math Engine: Pre-calculate Hit %, STA, IM, Defenses
       │
       ▼
 3. Token Image Pipeline: Generate 256x256 circular ringed PNG
       │
       ▼
 4. Spawner: Insert into active map with spiral collision avoidance
```

---

## Usage

### 1. Programmatic CLI Invocation

You can stock encounters directly using the workspace script `scripts/stock-encounter.js`:

```bash
# Sentient NPC Example
node scripts/stock-encounter.js \
  --name "Sathar Shock Trooper" \
  --tier 2 \
  --category npc \
  --species Sathar \
  --weapon "Laser Rifle" \
  --armor "Skein Suit" \
  --count 3

# Alien Creature Example
node scripts/stock-encounter.js \
  --name "Volturnian Stalker-Beast" \
  --tier 3 \
  --category creature \
  --attacks "Claw, Acid Spit" \
  --traits "Ambush Predator, Acid Spit" \
  --diet Carnivore \
  --size Large \
  --count 2
```

### 2. Available CLI Arguments

| Flag | Description | Default |
|------|-------------|---------|
| `--name <string>` | Name of the adversary or creature | `"Trooper"` / `"Alien Creature"` |
| `--tier <1-5>` | Threat Tier benchmark (1 to 5) | `2` |
| `--category <npc\|creature>` | Whether to use NPC skill math or creature attack matrices | `'npc'` |
| `--count <number>` | Number of tokens to spawn | `1` |
| `--species <string>` | NPC species (Human, Sathar, Vrusk, Dralasite, Yazirian, etc.) | `'Human'` |
| `--weapon <string>` | NPC primary weapon (Laser Rifle, Auto Rifle, Gyrojet Pistol, etc.) | Tier default |
| `--armor <string>` | NPC armor or screen defense (Skein Suit, Albedo Suit, etc.) | Tier default |
| `--attacks <string>` | Comma-separated list of creature natural attacks (Bite, Claws, Acid Spit) | `'Bite, Claws'` |
| `--traits <string>` | Comma-separated special traits or predatory skills | Pre-set |
| `--diet <string>` | Carnivore, Omnivore, Herbivore, Scavenger | `'Carnivore'` |
| `--size <string>` | Small, Medium, Large, Very Large | Tier default |
| `--map-id <id>` | Target map ID (defaults to active RPG map) | Active RPG map |
| `--json <string>` | Raw JSON string of an AdversaryTemplate object | None |

---

## Threat Tier Scaling Benchmark (Quick Reference)

### Path A: Sentient NPCs
- **Tier 1 (Green):** Stats 35–45, Skill Level 0–1 (+10%), STA 30–40, Basic Weapons.
- **Tier 2 (Regular / Blue):** Stats 45–55, Skill Level 2 (+20%), STA 45–55, Skein Suit, Military Weapons.
- **Tier 3 (Veteran / Purple):** Stats 55–65, Skill Level 3–4 (+30–40%), STA 60–75, Albedo/Inertia screens, Heavy weapons.
- **Tier 4 (Elite / Gold):** Stats 65–75, Skill Level 4–5 (+40–50%), STA 80–100, Powered/Security Armor.
- **Tier 5 (Boss / Crimson):** Stats 75–85+, Skill Level 5–6 (+50–60%), STA 100–130+, Top-tier screens.

### Path B: Alien Creatures & Beasts
- **Tier 1:** Attack 35–45%, STA 15–35, 1 attack (1d10 to 2d6).
- **Tier 2:** Attack 50–60%, STA 40–75, 1–2 attacks (2d10 to 3d10).
- **Tier 3:** Attack 65–75%, STA 80–130, 2–3 attacks (3d10 to 4d10) + 1 Special Trait.
- **Tier 4:** Attack 75–85%, STA 140–220, multi-attack + damage reduction/armor.
- **Tier 5:** Attack 85–95%, STA 250+, apex traits/area attacks.

---

## Token Border Ring Colors by Threat Tier

- **Tier 1:** `#2ecc71` (Emerald Green)
- **Tier 2:** `#3498db` (Cobalt Blue)
- **Tier 3:** `#9b59b6` (Amethyst Purple)
- **Tier 4:** `#f1c40f` (Imperial Gold)
- **Tier 5:** `#e74c3c` (Crimson Red)

All token assets are output to `/uploads/tokens/<template_id>.png` as standard 256x256 circular PNGs with transparency.

---

## 3. Natural Language Description & AI Art Generation Workflow

When the GM provides a descriptive prompt detailing the adversary's appearance, species, weapons, or armor:
1. **Prompt Synthesis**: The assistant formulates a detailed square character/creature prompt emphasizing species traits, weaponry, armor, dramatic lighting, and a centered composition for circular battle tokens.
2. **AI Art Generation**: Launch the `image-generator` subagent to generate a high-contrast square illustration.
3. **Circular Mask & Threat Tier Ring**: Run `generateTokenRingImage({ sourceImagePath, threatTier, outputPath })` to composite the portrait inside the color-coded border ring.
4. **Scene Instantiation**: Register the adversary blueprint and spawn tokens onto the active map using `scripts/stock-encounter.js` or `spawnAdversaries()`.
5. **In-App VTT UI**: GMs can also open the **"⚔️ Stock Adversary"** modal in the VTT to configure adversaries, specify visual descriptions and armament details, and select or upload custom token art.

# Tasks: Dynamic Encounter & Adversary Stocking Pipeline

## Overview
This task list tracks the implementation of the Dynamic Encounter & Adversary Stocking Pipeline for Star Frontiers VTT, designed with an architecture that allows seamless future porting to D&D 5e SRD.

---

### Milestone 1: Core Schema Validator & Star Frontiers Math Engine
- [x] 1.1 Create test suite `server/test/adversaryMathEngine.test.js` covering:
  - NPC hit percentage formula: `ceil(DEX / 2) + (skill_level * 10) + equip_mod`
  - Threat Tier 1–5 stat boundaries & validation for Sentient NPCs
  - Threat Tier 1–5 creature multi-attack arrays & damage formulas
  - HP / Stamina delta math parser (`"50"`, `"-12"`, `"+10"`, floor at 0, cap at `hp_max`)
  - Schema validator for `AdversaryTemplate` and `TokenInstance`
- [x] 1.2 Implement `server/src/adversaryMathEngine.js`:
  - `calculateNpcHitChance(dex, skillLevel, equipMod)`
  - `calculateInitiativeMod(rs)`
  - `parseHpDelta(currentHp, maxHp, deltaStr)`
  - `generateNpcStats(tier, options)`
  - `generateCreatureStats(tier, options)`
  - `validateAdversaryTemplate(template)`
  - `validateTokenInstance(instance)`
- [x] 1.3 Verify Milestone 1 tests pass in container (`docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/adversaryMathEngine.test.js"`).

---

### Milestone 2: Token Image & Circular Masking Pipeline
- [x] 2.1 Create test suite `server/test/tokenImagePipeline.test.js`:
  - Circular masking with transparent alpha channel
  - Threat Tier border ring color application (Tier 1 green through Tier 5 crimson)
  - Output formats (PNG/WebP) and dimension scaling (256x256)
  - Fallback avatar / stylized silhouette generation when source art is not provided
- [x] 2.2 Implement `server/src/tokenImagePipeline.js`:
  - Process source image or render SVG/Canvas silhouette
  - Apply ring border by Threat Tier or category (`npc` vs `creature`)
  - Save processed token asset to `data/uploads/tokens/<slug>.png`
- [x] 2.3 Verify Milestone 2 tests pass in container.

---

### Milestone 3: Database Storage, Spawner CLI & Scene State Injector
- [x] 3.1 Create test suite `server/test/adversarySpawner.test.js`:
  - Database schema extension in `server/src/db.js`: `adversary_templates` table and `tokens` columns (`template_id`, `conditions`, `seu_current`)
  - Registering an `AdversaryTemplate` via REST endpoint or spawner function
  - Spawning $N$ numbered `TokenInstance` records (`#1` to `#N`) with collision-free spiral coordinates around map center
  - Idempotency test: verify existing tokens, walls, and map settings are preserved
- [x] 3.2 Implement:
  - Database migration in `server/src/db.js`
  - REST endpoints in `server/src/adversaries.js` (`GET /api/adversaries`, `POST /api/adversaries`, etc.) and mount in `server/src/index.js`
  - Spawner module `server/src/adversarySpawner.js` (`spawnAdversaries({ mapId, template, count, options })`)
  - Update `server/src/maps.js` formatToken to include `template_id`, `conditions`, `seu_current`, and join `adversary_templates`
- [x] 3.3 Verify Milestone 3 tests pass in container.

---

### Milestone 4: Click-to-Open Token HUD / Stat Drawer UI
- [x] 4.1 Create test suite `client/test/AdversaryTokenHud.test.js`:
  - Renders top mutable bar: editable Stamina/HP field with delta math support
  - Quick delta buttons (`-10`, `-5`, `-1`, `+1`, `+5`) and SEU tracker
  - Condition pill toggles (`Stunned`, `Unconscious`, `Wounded`, `Pinned`, `Prone`, etc.)
  - Renders bottom reference card: Threat Tier badge, IM, Movement, Defenses, pre-calculated Actions (`% to Hit`, damage dice, roll buttons), and Traits
- [x] 4.2 Implement `client/src/components/AdversaryTokenHud.vue`:
  - Responsive sci-fi styled drawer/overlay bound to `selectedToken`
  - Emits real-time token updates on Stamina/Condition changes
- [x] 4.3 Integrate into `client/src/views/RpgVttView.vue`:
  - Clicking any adversary token on canvas opens `AdversaryTokenHud`
  - Socket.io synchronization for live multi-user updates
- [x] 4.4 Verify all client tests and build pass in container (`npx vitest run && npm run build`).

---

### Milestone 5: Workspace Stocking Skill (`.agents/skills/stock-encounter/SKILL.md`)
- [x] 5.1 Create `.agents/skills/stock-encounter/SKILL.md`:
  - Natural language parsing guidelines (Count, Tier 1–5, NPC/Creature, weapons/abilities)
  - Usage instructions for `node scripts/stock-encounter.js`
- [x] 5.2 Implement standalone CLI runner `scripts/stock-encounter.js`:
  - Integrates template generator, token image pipeline, and scene spawner
  - Accepts CLI arguments or JSON configuration
- [x] 5.3 Test CLI runner directly.

---

### Milestone 6: End-to-End Dry Run & Verification
- [x] 6.1 Stock Test 1 (Sentient NPCs): 3 Tier 2 Sathar Shock Troopers with Laser Rifles and Skein Suits on active map.
- [x] 6.2 Stock Test 2 (Alien Creatures): 2 Tier 3 Volturnian Stalker-Beasts (ambush predators with acid spit and claw attacks) on active map.
- [x] 6.3 Verify tokens appear in database and active map payload.
- [x] 6.4 Report coordinates and verification details for live VTT testing.

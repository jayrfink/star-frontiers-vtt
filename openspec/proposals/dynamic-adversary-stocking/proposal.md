# OpenSpec Proposal: Dynamic Encounter & Adversary Stocking Pipeline

## Summary
The **Dynamic Encounter & Adversary Stocking Pipeline** provides a modular, rulebook-agnostic engine for creating, stocking, and running combat encounters on tactical maps. It introduces a strict split between immutable adversary templates (`AdversaryTemplate`) and mutable map token instances (`TokenInstance`), a Star Frontiers Threat Tier (1–5) scaling system, a click-to-open interactive Token HUD drawer on the VTT canvas with delta math HP and condition tracking, and a session prep CLI stocking skill for automated adversary generation and placement.

## Architectural Goal: Rulebook-Agnostic Portability
To ensure this engine can be ported to a D&D 5e SRD fantasy VTT (or any other TTRPG system) with minimal effort:
1. **Core Token Engine & UI**: Operates exclusively on normalized contract fields:
   - `hp_max`, `hp_current`, `conditions`, `defense_summary`, `movement`, `initiative_mod`, `threat_tier`, and a normalized `actions[]` array containing pre-calculated success chances/target numbers and damage formulas.
2. **Rulebook-Specific System Data**: Stored in an isolated `system_data` JSON object (e.g. Star Frontiers ability pairs, creature diet/size, skill levels, SEU pools). When porting to 5e, only `system_data` and the stocking generator's scaling tables are swapped; the canvas rendering, token instance manager, hit-testing, socket synchronization, and Token HUD drawer remain completely unchanged.

## Proposal Contents & Specifications
1. [`specs/threat-tier-scaling.md`](./specs/threat-tier-scaling.md): Threat Tier (1 to 5) scaling benchmarks for Sentient NPCs (Path A) and Alien Creatures (Path B) in Star Frontiers Alpha Dawn.
2. [`specs/template-instance-schema.md`](./specs/template-instance-schema.md): Strict JSON schemas and SQLite database extensions separating immutable adversary templates from mutable token instances.
3. [`specs/token-hud-drawer.md`](./specs/token-hud-drawer.md): Click-to-open tactical Token HUD component specifications featuring delta math stamina adjustments, condition toggles, and pre-calculated action cards.
4. [`specs/token-generation-and-stocking-skill.md`](./specs/token-generation-and-stocking-skill.md): Agnostic CLI stocking workflow (`.agents/skills/stock-encounter/SKILL.md`) for prompting rapid adversary generation, top-down ringed token creation, and automatic map instantiation.

## Integration Impact on Existing SFVTT Codebase
- **Database (`server/src/db.js`)**:
  - New table `adversary_templates` storing reusable NPC and creature templates.
  - Table `tokens` augmented with `template_id` (TEXT/INTEGER FK), `conditions` (TEXT JSON DEFAULT '[]'), and `instance_data` (TEXT JSON DEFAULT '{}' for optional pools like SEU).
  - Existing `current_hp` and `max_hp` map directly to current/max Stamina.
- **REST & Socket API (`server/src/maps.js`, new `server/src/adversaries.js`)**:
  - `GET /api/adversaries` and `POST /api/adversaries` for managing templates.
  - `GET /api/maps/active` and `GET /api/tokens` return tokens with their resolved template data.
  - `PUT /api/tokens/:id` updates `current_hp`, `conditions`, and `instance_data` in real-time with `token:updated` broadcast.
- **Canvas & Views (`client/src/components/VttCanvas.vue`, `client/src/views/RpgVttView.vue`, `client/src/views/SpaceVttView.vue`)**:
  - Clicking any token selects it and opens the unified Token HUD Drawer.
  - Tokens with templates render their pre-calculated combat actions, conditions, and defenses seamlessly.

# Specification: Template/Instance Split State Contract & Schemas

## 1. Architectural Philosophy
In virtual tabletop combat systems, mixing immutable archetypes with mutable instance states creates severe synchronization bugs, bloats scene files, and makes rulebook porting difficult. 

This specification introduces a strict **Two-Tier State Contract**:
1. **`AdversaryTemplate` (Immutable Blueprint):** Contains baseline stats, identity, token art path, pre-calculated combat actions, and rulebook-specific raw attributes. Stored once per archetype and reused across multiple maps.
2. **`TokenInstance` (Mutable Tactical State):** Represents an individual token placed on a map grid. References `template_id` while maintaining only its volatile combat state: current position `(x, y)`, current Stamina/HP `hp_current`, resource pools (e.g., `seu_current`), active tactical conditions, and unique display label.

---

## 2. Core Schemas

### 2.1 AdversaryTemplate Schema (JSON Schema v7)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AdversaryTemplate",
  "type": "object",
  "required": [
    "template_id",
    "name",
    "category",
    "threat_tier",
    "token_image_path",
    "hp_max",
    "defense_summary",
    "movement",
    "initiative_mod",
    "actions",
    "traits",
    "system_data"
  ],
  "properties": {
    "template_id": {
      "type": "string",
      "description": "Unique slug or UUID identifying this archetype, e.g. 'sathar-trooper-t2' or 'subterranean-burrower-t3'."
    },
    "name": {
      "type": "string",
      "description": "Display name of the adversary archetype, e.g. 'Sathar Boarding Trooper'."
    },
    "category": {
      "type": "string",
      "enum": ["npc", "creature"],
      "description": "Category branch determining stat block conventions."
    },
    "threat_tier": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5,
      "description": "Difficulty benchmark tier (1: Green to 5: Boss)."
    },
    "token_image_path": {
      "type": "string",
      "description": "Relative URL path to transparent circular token image asset, e.g. '/uploads/tokens/sathar_trooper.png'."
    },
    "token_size": {
      "type": "integer",
      "minimum": 1,
      "maximum": 4,
      "default": 1,
      "description": "Grid cell footprint size (1: 1x1, 2: 2x2, 3: 3x3)."
    },
    "hp_max": {
      "type": "integer",
      "minimum": 1,
      "description": "Maximum hit points / stamina (maps to STA in Star Frontiers, HP in D&D 5e)."
    },
    "defense_summary": {
      "type": "string",
      "description": "Summary of active armor and defensive screens, e.g. 'Skein Suit (half damage vs kinetic) + Albedo Screen (40 pts)'."
    },
    "movement": {
      "type": "string",
      "description": "Tactical movement summary, e.g. '12 m/s (Walk: 2 / Run: 6)'."
    },
    "initiative_mod": {
      "type": "integer",
      "description": "Initiative Modifier bonus (+IM added to d10 roll)."
    },
    "actions": {
      "type": "array",
      "description": "List of pre-calculated offensive attacks and tactical actions.",
      "items": {
        "type": "object",
        "required": ["name", "type", "target_pct", "damage"],
        "properties": {
          "name": { "type": "string", "example": "Laser Rifle" },
          "type": { "type": "string", "enum": ["beam", "projectile", "melee", "special", "natural"], "example": "beam" },
          "target_pct": { "type": "integer", "description": "Pre-calculated d100 target number percentage, e.g. 55.", "example": 55 },
          "damage": { "type": "string", "description": "Standard damage dice formula, e.g. '3d10' or '2d10+4'.", "example": "3d10" },
          "range": { "type": "string", "description": "Effective range in meters or grid hexes.", "example": "100m" },
          "seu_cost": { "type": "integer", "description": "Standard energy units consumed per shot (if applicable).", "default": 0 },
          "description": { "type": "string", "description": "Special action rules or trigger conditions." }
        }
      }
    },
    "traits": {
      "type": "array",
      "description": "List of special abilities, skills, or passive creature features.",
      "items": {
        "type": "object",
        "required": ["name", "description"],
        "properties": {
          "name": { "type": "string", "example": "Acid Blood" },
          "description": { "type": "string", "example": "Melee attackers taking cutting damage suffer 1d10 acid splash." }
        }
      }
    },
    "system_data": {
      "type": "object",
      "description": "Rulebook-specific raw attributes. Swapped when porting between TTRPG systems.",
      "additionalProperties": true
    }
  }
}
```

#### Star Frontiers `system_data` Payload Example (Sentient NPC)
```json
{
  "str": 50,
  "sta": 50,
  "dex": 55,
  "rs": 50,
  "int": 45,
  "log": 45,
  "per": 40,
  "ldr": 40,
  "race": "Sathar",
  "skills": {
    "Beam Weapons": 2,
    "Martial Arts": 1,
    "Technician": 1
  },
  "seu_max": 50
}
```

#### Star Frontiers `system_data` Payload Example (Creature)
```json
{
  "diet": "Carnivore",
  "size_class": "Large",
  "habitat": "Subterranean",
  "natural_armor_dr": 5,
  "special_attacks": ["Paralytic Venom (S12)", "Burrowing Ambush"]
}
```

#### D&D 5e SRD `system_data` Payload Example (Future Portability Demonstration)
```json
{
  "str": 14,
  "dex": 12,
  "con": 14,
  "int": 10,
  "wis": 11,
  "cha": 8,
  "ac": 15,
  "cr": "1/2",
  "saving_throws": { "str": "+4", "con": "+4" },
  "spell_slots": {}
}
```

---

### 2.2 TokenInstance Schema (JSON Schema v7)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "TokenInstance",
  "type": "object",
  "required": ["instance_id", "map_id", "label", "x", "y", "hp_current", "hp_max"],
  "properties": {
    "instance_id": {
      "type": "integer",
      "description": "Primary key in SQLite tokens table."
    },
    "map_id": {
      "type": "integer",
      "description": "Foreign key to maps table."
    },
    "template_id": {
      "type": ["string", "null"],
      "description": "Foreign key referencing AdversaryTemplate.template_id."
    },
    "character_id": {
      "type": ["integer", "null"],
      "description": "Legacy/player character reference (if linked to PC character sheet)."
    },
    "label": {
      "type": "string",
      "description": "Instance display name on canvas and in inspector, e.g. 'Sathar Trooper #1'."
    },
    "x": { "type": "integer", "description": "Grid column coordinate." },
    "y": { "type": "integer", "description": "Grid row coordinate." },
    "size": { "type": "integer", "default": 1, "description": "Grid cell footprint size (1: 1x1, 2: 2x2, 3: 3x3)." },
    "color": { "type": "string", "default": "#e63946", "description": "Border halo color for this token ring." },
    "avatar_url": { "type": "string", "description": "Token image URL on canvas." },
    "hp_current": {
      "type": "integer",
      "description": "Current hit points / stamina."
    },
    "hp_max": {
      "type": "integer",
      "description": "Maximum hit points / stamina."
    },
    "seu_current": {
      "type": ["integer", "null"],
      "description": "Current standard energy units pool (for energy weapons/screens)."
    },
    "conditions": {
      "type": "array",
      "description": "List of active tactical condition tags.",
      "items": {
        "type": "string",
        "enum": ["Stunned", "Unconscious", "Wounded", "Pinned", "Prone", "Poisoned", "Burning", "Blinded", "Hidden"]
      }
    }
  }
}
```

---

## 3. Database Schema Extensions (`server/src/db.js`)

To maintain clean backward compatibility with existing maps and tokens, SQLite tables are updated as follows:

```sql
-- 1. Create adversary_templates table
CREATE TABLE IF NOT EXISTS adversary_templates (
  id TEXT PRIMARY KEY,                       -- template_id slug, e.g. 'sathar-trooper-t2'
  name TEXT NOT NULL,                        -- 'Sathar Boarding Trooper'
  category TEXT NOT NULL CHECK(category IN ('npc', 'creature')),
  threat_tier INTEGER NOT NULL CHECK(threat_tier BETWEEN 1 AND 5),
  token_image_path TEXT NOT NULL DEFAULT '',
  token_size INTEGER NOT NULL DEFAULT 1,
  hp_max INTEGER NOT NULL,
  defense_summary TEXT NOT NULL DEFAULT '',
  movement TEXT NOT NULL DEFAULT '12 m/s',
  initiative_mod INTEGER NOT NULL DEFAULT 0,
  actions TEXT NOT NULL DEFAULT '[]',        -- JSON array of action objects
  traits TEXT NOT NULL DEFAULT '[]',         -- JSON array of trait objects
  system_data TEXT NOT NULL DEFAULT '{}',    -- JSON object of system-specific stats
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Extend tokens table with template linkage and instance fields
-- (Auto-migrated via PRAGMA table_info inspection)
ALTER TABLE tokens ADD COLUMN template_id TEXT REFERENCES adversary_templates(id);
ALTER TABLE tokens ADD COLUMN conditions TEXT DEFAULT '[]';
ALTER TABLE tokens ADD COLUMN seu_current INTEGER;
```

---

## 4. API Endpoints Contract

### 4.1 Adversary Templates API (`/api/adversaries`)
- `GET /api/adversaries`: Returns list of all adversary templates.
- `GET /api/adversaries/:id`: Returns a single adversary template with full actions and `system_data`.
- `POST /api/adversaries`: Creates a new adversary template (validates against JSON schema).
- `PUT /api/adversaries/:id`: Updates an adversary template.
- `DELETE /api/adversaries/:id`: Deletes a template (tokens referencing it fallback cleanly to their cached instance state).

### 4.2 Map & Token API Integration (`/api/tokens`)
- When tokens are fetched via `GET /api/maps/active` or `GET /api/tokens`, the server joins `adversary_templates` (if `template_id` is present) and embeds the template definition in the returned token payload (`token.template`).
- Updating volatile token state via `PUT /api/tokens/:id` accepts `hp_current`, `conditions`, `seu_current`, and coordinates, broadcasting `token:updated` over Socket.io to all players and GM.

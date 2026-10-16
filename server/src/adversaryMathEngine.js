/**
 * Core Schema Validator & Star Frontiers Math Engine
 *
 * Implements rulebook-accurate calculations for Star Frontiers (Alpha Dawn)
 * and strict JSON contract validation for AdversaryTemplate and TokenInstance.
 */

/**
 * Calculates NPC attack success percentage:
 * Target % = ceil(DEX / 2) + (Skill_Level * 10) + Equipment_Modifier
 */
export function calculateNpcHitChance(dex, skillLevel = 0, equipMod = 0) {
  const base = Math.ceil((Number(dex) || 0) / 2);
  const skillBonus = (Number(skillLevel) || 0) * 10;
  return base + skillBonus + (Number(equipMod) || 0);
}

/**
 * Calculates Initiative Modifier: IM = ceil(RS / 10)
 */
export function calculateInitiativeMod(rs) {
  return Math.ceil((Number(rs) || 50) / 10);
}

/**
 * Parses and applies HP/Stamina delta input:
 * - "50"  -> direct set to 50
 * - "-12" -> subtract 12 (floored at 0)
 * - "+10" -> add 10 (capped at maxHp)
 */
export function parseHpDelta(currentHp, maxHp, deltaStr) {
  const cur = Number(currentHp) || 0;
  const max = Number(maxHp) || 0;
  if (deltaStr === null || deltaStr === undefined) return cur;

  const raw = String(deltaStr).trim();
  if (!raw) return cur;

  if (raw.startsWith('+')) {
    const val = parseInt(raw.slice(1), 10);
    if (isNaN(val)) return cur;
    return Math.min(max, Math.max(0, cur + val));
  }

  if (raw.startsWith('-')) {
    const val = parseInt(raw.slice(1), 10);
    if (isNaN(val)) return cur;
    return Math.min(max, Math.max(0, cur - val));
  }

  const direct = parseInt(raw, 10);
  if (isNaN(direct)) return cur;
  return Math.min(max, Math.max(0, direct));
}

// Threat Tier Preset Configurations
const NPC_TIER_CONFIGS = {
  1: {
    statRange: [35, 45],
    defaultStat: 40,
    skillLevel: 1,
    sta: 35,
    armor: 'Unarmored (0 DR)',
    defaultWeapon: 'Laser Pistol',
    damage: '1d10',
    range: '50m',
    seu: 1,
  },
  2: {
    statRange: [45, 55],
    defaultStat: 50,
    skillLevel: 2,
    sta: 50,
    armor: 'Skein Suit (half kinetic damage)',
    defaultWeapon: 'Laser Rifle',
    damage: '1d10 to 5d10',
    range: '100m',
    seu: 1,
  },
  3: {
    statRange: [55, 65],
    defaultStat: 60,
    skillLevel: 3,
    sta: 70,
    armor: 'Albedo Screen (40 SEU) + Skein Suit',
    defaultWeapon: 'Heavy Laser',
    damage: '2d10 to 10d10',
    range: '150m',
    seu: 2,
  },
  4: {
    statRange: [65, 75],
    defaultStat: 70,
    skillLevel: 4,
    sta: 90,
    armor: 'Powered Combat Armor (-20 DR)',
    defaultWeapon: 'Gyrojet Rifle',
    damage: '3d10',
    range: '200m',
    seu: 0,
  },
  5: {
    statRange: [75, 85],
    defaultStat: 80,
    skillLevel: 5,
    sta: 120,
    armor: 'Dual Deflection Screens + Powered Battle Armor',
    defaultWeapon: 'Particle Cannon',
    damage: '5d10',
    range: '300m',
    seu: 5,
  },
};

const CREATURE_TIER_CONFIGS = {
  1: {
    attackPct: 40,
    sta: 25,
    attacksCount: 1,
    damage: '1d10',
    size: 'Small',
  },
  2: {
    attackPct: 55,
    sta: 55,
    attacksCount: 2,
    damage: '2d10',
    size: 'Medium',
  },
  3: {
    attackPct: 70,
    sta: 100,
    attacksCount: 2,
    damage: '3d10',
    size: 'Large',
  },
  4: {
    attackPct: 80,
    sta: 180,
    attacksCount: 3,
    damage: '5d10',
    size: 'Large',
  },
  5: {
    attackPct: 90,
    sta: 300,
    attacksCount: 4,
    damage: '7d10',
    size: 'Very Large',
  },
};

/**
 * Procedurally generates an AdversaryTemplate for Sentient NPCs
 */
export function generateNpcStats(tier, options = {}) {
  const safeTier = Math.min(5, Math.max(1, parseInt(tier, 10) || 1));
  const cfg = NPC_TIER_CONFIGS[safeTier];

  const race = options.race || 'Sathar';
  const name = options.name || `${race} Trooper (T${safeTier})`;
  const baseStat = options.stat || cfg.defaultStat;
  const weapon = options.weapon || cfg.defaultWeapon;
  const armor = options.armor || cfg.armor;

  const hitPct = calculateNpcHitChance(baseStat, cfg.skillLevel, options.equipMod || 0);
  const im = calculateInitiativeMod(baseStat);

  const actions = [
    {
      name: weapon,
      type: weapon.toLowerCase().includes('laser') ? 'beam' : 'projectile',
      target_pct: hitPct,
      damage: options.damage || cfg.damage,
      range: options.range || cfg.range,
      seu_cost: cfg.seu,
      description: `Primary combat armament, Skill Level ${cfg.skillLevel}`,
    },
  ];

  return {
    template_id: options.template_id || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-t${safeTier}`,
    name,
    category: 'npc',
    threat_tier: safeTier,
    token_image_path: options.token_image_path || `/uploads/tokens/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`,
    token_size: 1,
    hp_max: options.sta || cfg.sta,
    defense_summary: armor,
    movement: options.movement || '12 m/s (Walk: 2 / Run: 6)',
    initiative_mod: im,
    actions,
    traits: options.traits || [
      { name: 'Tactical Coordination', description: 'Coordinated fire with allied squad members.' },
    ],
    system_data: {
      race,
      str: baseStat,
      sta: options.sta || cfg.sta,
      dex: baseStat,
      rs: baseStat,
      int: baseStat,
      log: baseStat,
      per: Math.max(30, baseStat - 10),
      ldr: Math.max(30, baseStat - 10),
      skills: {
        'Beam Weapons': cfg.skillLevel,
        'Technician': 1,
      },
      seu_max: 50,
    },
  };
}

/**
 * Procedurally generates an AdversaryTemplate for Alien Creatures & Beasts
 */
export function generateCreatureStats(tier, options = {}) {
  const safeTier = Math.min(5, Math.max(1, parseInt(tier, 10) || 1));
  const cfg = CREATURE_TIER_CONFIGS[safeTier];

  const name = options.name || `Frontier Predator (T${safeTier})`;
  const diet = options.diet || 'Carnivore';
  const size = options.size || cfg.size;
  const attackPct = options.attackPct || cfg.attackPct;
  const sta = options.sta || cfg.sta;

  const actions = [];
  const attacksList = options.attacks && options.attacks.length > 0 ? options.attacks : ['Bite', 'Claws'];

  attacksList.forEach((atkName) => {
    actions.push({
      name: atkName,
      type: atkName.toLowerCase().includes('spit') || atkName.toLowerCase().includes('acid') ? 'special' : 'natural',
      target_pct: attackPct,
      damage: options.damage || cfg.damage,
      range: atkName.toLowerCase().includes('spit') ? '20m' : 'Melee',
      seu_cost: 0,
      description: `Natural predatory attack.`,
    });
  });

  return {
    template_id: options.template_id || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-t${safeTier}`,
    name,
    category: 'creature',
    threat_tier: safeTier,
    token_image_path: options.token_image_path || `/uploads/tokens/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`,
    token_size: size === 'Large' ? 2 : size === 'Very Large' ? 3 : 1,
    hp_max: sta,
    defense_summary: options.defense || (safeTier >= 4 ? 'Chitinous Plating (-10 damage)' : 'Natural Hide (0 DR)'),
    movement: options.movement || '15 m/s (Gallop: 8)',
    initiative_mod: 4 + safeTier,
    actions,
    traits: options.traits || [
      { name: 'Predatory Reflexes', description: 'Surprise bonus when striking from stealth or high ground.' },
    ],
    system_data: {
      diet,
      size_class: size,
      habitat: options.habitat || 'Wilderness',
    },
  };
}

/**
 * Validates an AdversaryTemplate against the contract schema
 */
export function validateAdversaryTemplate(template) {
  const errors = [];
  if (!template || typeof template !== 'object') {
    return { valid: false, errors: ['Template must be an object'] };
  }

  const required = [
    'template_id',
    'name',
    'category',
    'threat_tier',
    'token_image_path',
    'hp_max',
    'defense_summary',
    'movement',
    'initiative_mod',
    'actions',
    'traits',
    'system_data',
  ];

  for (const field of required) {
    if (template[field] === undefined || template[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (template.category && !['npc', 'creature'].includes(template.category)) {
    errors.push(`Category must be 'npc' or 'creature'`);
  }

  if (template.threat_tier && (template.threat_tier < 1 || template.threat_tier > 5)) {
    errors.push(`Threat tier must be between 1 and 5`);
  }

  if (template.actions && !Array.isArray(template.actions)) {
    errors.push(`Actions must be an array`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a TokenInstance against the contract schema
 */
export function validateTokenInstance(instance) {
  const errors = [];
  if (!instance || typeof instance !== 'object') {
    return { valid: false, errors: ['Instance must be an object'] };
  }

  const required = ['label', 'x', 'y', 'hp_current', 'hp_max'];
  for (const field of required) {
    if (instance[field] === undefined || instance[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (instance.conditions && !Array.isArray(instance.conditions)) {
    errors.push(`Conditions must be an array`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Star Frontiers Combat Quick Reference Constants
 * Derived from Star Frontiers Alpha Dawn and Knight Hawks rulesets.
 */

export const WEAPON_RESTRICTIONS_LEGEND = {
  FF: {
    code: 'FF',
    name: 'Forward Firing',
    description: 'Weapon can only fire into the forward 60° arc along the ship\'s facing hex direction.'
  },
  T: {
    code: 'T',
    name: 'Turret (360°)',
    description: 'Weapon can fire in any direction (all 360° hex arcs). Standard for defensive and offensive beam batteries.'
  },
  MPO: {
    code: 'MPO',
    name: 'Moving Player Only',
    description: 'Weapon can only be fired during the attacking ship\'s own combat phase (cannot fire defensive fire during enemy movement).'
  },
  RD: {
    code: 'RD',
    name: 'Range Diffusion',
    description: 'Beam diffusion reduces accuracy by -5% per hex of distance to target.'
  },
  LTD: {
    code: 'LTD',
    name: 'Limited Supply',
    description: 'Ammunition is finite and consumed upon firing (tracked on ship record sheet).'
  }
};

export const SHIP_COMBAT_REF = {
  sequenceOfPlay: [
    {
      step: 1,
      name: 'Initiative',
      description: 'Each side rolls 1d10. High roller moves second and fires first in combat phases.'
    },
    {
      step: 2,
      name: 'Movement Phase',
      description: 'Ships move in reverse initiative order. Accelerate or decelerate up to ADF hexes; turn facing up to MR.'
    },
    {
      step: 3,
      name: 'Defensive Fire Phase',
      description: 'Non-moving ships fire at moving ships that enter weapons range and arc of fire.'
    },
    {
      step: 4,
      name: 'Offensive Fire Phase',
      description: 'Moving ships fire at designated targets within weapon range and valid fire arc.'
    },
    {
      step: 5,
      name: 'Damage & Repair Phase',
      description: 'Apply damage to hull points, check for critical hits on penetrating damage, and make DCR damage control rolls.'
    }
  ],

  weapons: [
    {
      name: 'Laser Cannon',
      type: 'Beam',
      damage: '2d10',
      rangeHexes: 10,
      ammo: 'Unlimited',
      rof: 1,
      notes: 'Heavy forward-mount or turret beam weapon',
      restrictions: ['FF', 'RD']
    },
    {
      name: 'Laser Battery',
      type: 'Beam',
      damage: '1d10',
      rangeHexes: 9,
      ammo: 'Unlimited',
      rof: 1,
      notes: 'Standard light defensive and offensive beam turret',
      restrictions: ['T', 'RD']
    },
    {
      name: 'Electron Battery',
      type: 'Beam',
      damage: '1d10',
      rangeHexes: 10,
      ammo: 'Unlimited',
      rof: 1,
      notes: 'Medium beam weapon with high armor penetration',
      restrictions: ['T', 'RD']
    },
    {
      name: 'Proton Battery',
      type: 'Beam',
      damage: '1d10',
      rangeHexes: 12,
      ammo: 'Unlimited',
      rof: 1,
      notes: 'High-energy beam weapon with maximum effective beam range',
      restrictions: ['T', 'RD']
    },
    {
      name: 'Disruptor Cannon',
      type: 'Energy',
      damage: '3d10',
      rangeHexes: 9,
      ammo: 'Unlimited',
      rof: 1,
      notes: 'High-yield particle disruption beam',
      restrictions: ['FF', 'RD']
    },
    {
      name: 'Torpedo',
      type: 'Heavy Ordnance',
      damage: '4d10',
      rangeHexes: 4,
      ammo: 'Limited',
      rof: 1,
      notes: 'Self-guided heavy anti-ship projectile; target can intercept with ICMs',
      restrictions: ['MPO', 'LTD']
    },
    {
      name: 'Assault Rocket',
      type: 'Rocket',
      damage: '2d10+4',
      rangeHexes: 4,
      ammo: 'Limited',
      rof: 1,
      notes: 'High acceleration tactical rocket',
      restrictions: ['FF', 'MPO', 'LTD']
    },
    {
      name: 'Rocket Battery',
      type: 'Rocket',
      damage: '2d10',
      rangeHexes: 3,
      ammo: 'Limited',
      rof: 1,
      notes: 'Multiple-launch rocket pods',
      restrictions: ['LTD']
    },
    {
      name: 'Mine',
      type: 'Hazard',
      damage: '3d10+5',
      rangeHexes: 0,
      ammo: 'Limited',
      rof: 1,
      notes: 'Stationary hex hazard; detonates upon ship entry',
      restrictions: ['LTD']
    },
    {
      name: 'Seeker Missile',
      type: 'Heavy Ordnance',
      damage: '5d10',
      rangeHexes: 99,
      ammo: 'Limited',
      rof: 1,
      notes: 'Autonomous extreme-range pursuit missile with massive explosive payload',
      restrictions: ['LTD']
    }
  ],

  defenses: [
    {
      name: 'Reflective Hull',
      type: 'Passive Armor',
      effect: 'Deflects laser and energy attacks; halves all Laser/Beam weapon damage rounded down',
      limitations: 'No effect against kinetic weapons (rockets, torpedoes, collisions)'
    },
    {
      name: 'Masking Screen',
      type: 'ECM Screen',
      effect: 'Generates false signatures and sensor clutter; disrupts enemy fire control (+10% or -10% hit penalty)',
      limitations: 'Consumes screen generator charges per combat turn'
    },
    {
      name: 'Proton Screen',
      type: 'Energy Screen',
      effect: 'Absorbs energy attacks; reduces damage from Laser Cannon, Laser Battery, Electron Battery',
      limitations: 'Consumes screen generator charges per combat turn'
    },
    {
      name: 'Electron Screen',
      type: 'Energy Screen',
      effect: 'Absorbs energy attacks; reduces damage from Proton Battery',
      limitations: 'Consumes screen generator charges per combat turn'
    },
    {
      name: 'Stasis Screen',
      type: 'Energy Screen',
      effect: 'Moderately deflects all electrical beam weapons (Proton Beams, Electron Beams, Disruptor Cannons; base 40% hit chance)',
      limitations: 'Electrical pulse attracts kinetic ordinance (+25% to-hit for Torpedoes); only one screen active at a time'
    },
    {
      name: 'Interceptor Missiles (ICM)',
      type: 'Countermeasure',
      effect: 'Kinetic defense launched to intercept incoming torpedoes and rockets',
      limitations: 'Single-use projectiles per launcher per salvo'
    }
  ],

  criticalHits: [
    {
      roll: '1-2',
      location: 'Bridge',
      effect: 'Command hit: -1 ADF and -1 MR. Ship loses helm or fire control coordination.'
    },
    {
      roll: '3-4',
      location: 'Drive',
      effect: 'Sub-light engine damaged: -1 ADF, -1 MR permanently until repaired.'
    },
    {
      roll: '5-6',
      location: 'Weapons',
      effect: 'One random weapon system destroyed or knocked offline.'
    },
    {
      roll: '7',
      location: 'Sensors',
      effect: 'Sensors blinded: -10% on all gunnery hit rolls; masking screens ineffective.'
    },
    {
      roll: '8',
      location: 'Life Support',
      effect: 'Life support breached: Crew must don vacc suits within 1d10 turns.'
    },
    {
      roll: '9-10',
      location: 'Cargo / Hull Breach',
      effect: 'Catastrophic hull rupture: Additional 1d10 damage applied directly to hull.'
    }
  ],

  damagedSystems: [
    {
      system: 'Hull',
      category: 'Structural',
      effect: 'Reduces Hull Points (HP). Ship is destroyed when HP reaches 0.',
      repair: 'Cannot be repaired during combat'
    },
    {
      system: 'Drives (ADF)',
      category: 'Mobility',
      effect: '-1 ADF, lose 1/2 ADF (round up), or lose all ADF. If ADF is 0, ship cannot accelerate/decelerate and maintains current speed.',
      repair: 'DCR roll restores 1 ADF per success'
    },
    {
      system: 'Steering (MR)',
      category: 'Mobility',
      effect: '-1 MR or lose all MR. If MR is 0, ship cannot turn. If both ADF and MR reach 0, ship drifts indefinitely in a straight line.',
      repair: 'DCR roll restores 1 MR per success'
    },
    {
      system: 'Weapons',
      category: 'Tactical',
      effect: 'Destroys weapons in fixed priority: LC > LB > PB > EB > DC > T > AR > RB. Limited ammo (LTD) launcher/tube is destroyed if hit.',
      repair: 'DCR roll can restore knocked-out weapon'
    },
    {
      system: 'Defenses',
      category: 'Tactical',
      effect: 'Destroys defenses in fixed priority: PS > ES > SS > MS > ICM.',
      repair: 'DCR roll can repair defense system'
    },
    {
      system: 'Power Short Circuit',
      category: 'Electrical',
      effect: 'All active screens (PS, ES, SS) immediately collapse; ICMs offline; no new MS generated.',
      repair: 'DCR roll repairs short; screens must be reactivated'
    },
    {
      system: 'Electrical Fire',
      category: 'Hazard',
      effect: 'Ship on fire. Roll on Damage Table (+20 modifier) at start of each turn until extinguished. Hull hits inflict 1d10 HP damage.',
      repair: 'DCR roll extinguishes fire'
    },
    {
      system: 'Combat Control',
      category: 'Avionics',
      effect: '-10% to-hit penalty on all ship weapon attacks. Non-cumulative with multiple hits.',
      repair: 'DCR roll restores targeting computer'
    },
    {
      system: 'Navigation',
      category: 'Avionics',
      effect: 'Erratic helm. Roll 1d10 each turn: 1–5 = forced left turn 1 hex every hex moved; 6–10 = forced right turn 1 hex every hex moved, until MR is spent.',
      repair: 'DCR roll restores helm control'
    },
    {
      system: 'Damage Control',
      category: 'Operations',
      effect: 'Ship\'s DCR (Damage Control Rating) is cut in half (round up).',
      repair: 'Cannot be repaired during combat'
    },
    {
      system: 'Disastrous Fire',
      category: 'Catastrophic',
      effect: 'DCR halved (round up), lose all ADF and MR, -10% on all weapon attacks, and roll on Damage Table (+20 modifier) each turn.',
      repair: 'DCR roll (at halved rating) extinguishes fire'
    }
  ],

  selectiveTargeting: [
    {
      topic: 'Requirement',
      rule: 'Same Hex Only',
      detail: 'Attacking ship and target must occupy the exact same hex on the tactical combat map.'
    },
    {
      topic: 'Attack Modifier',
      rule: '-30% Penalty',
      detail: 'Subtracted from the final to-hit chance. Multiple gunners or combat computers cannot negate this penalty.'
    },
    {
      topic: 'Component Targeting',
      rule: 'Damage Table Bypass',
      detail: 'Attacker designates a specific external system (Drives, specific Weapon, Steering, or Hull) before firing. Hits bypass the random Damage Table.'
    },
    {
      topic: 'Targeted Hull Hit',
      rule: 'Guaranteed HP Damage',
      detail: 'Bypasses internal systems; 100% of weapon damage applies directly to Hull Points (HP).'
    },
    {
      topic: 'Targeted Hull Critical',
      rule: '50% Double Damage',
      detail: 'Roll 1d10 upon hit: 1–5 normal damage; 6–10 deals DOUBLE damage directly to Hull Points.'
    },
    {
      topic: 'Reflective Hull Durability',
      rule: 'Indestructible Coating',
      detail: 'Reflective Hull is a passive surface paint/coating, not an active electronic screen. It cannot be broken, stripped, or disabled by targeted shots, power shorts, or component damage, and permanently halves Laser Cannon and Laser Battery beam damage.'
    }
  ]
};

export const SHIP_DAMAGED_SYSTEMS = SHIP_COMBAT_REF.damagedSystems;
export const SELECTIVE_TARGETING_REF = SHIP_COMBAT_REF.selectiveTargeting;

export const RANGED_COMBAT_REF = {
  sequenceOfPlay: [
    {
      step: 1,
      name: 'Initiative',
      description: 'Compare Reaction Speed (IM = ceil(RS / 10)). Highest initiative acts first.'
    },
    {
      step: 2,
      name: 'Movement',
      description: 'Characters may walk up to their walking speed or sprint up to running speed in meters.'
    },
    {
      step: 3,
      name: 'Actions',
      description: 'Perform combat actions: Aim (+10%), Shoot/Fire weapon, Reload clip/battery, Throw grenade, or change stance.'
    },
    {
      step: 4,
      name: 'Damage & Effects',
      description: 'Roll weapon damage, deduct armor/screens absorption, and apply remaining damage to Stamina.'
    }
  ],

  weapons: [
    {
      name: 'Laser Pistol',
      category: 'Beam Weapon',
      damage: '1d10 to 10d10 (dial)',
      rof: 1,
      shortRange: '10m',
      medRange: '25m',
      longRange: '50m',
      ammo: '20 SEU clip',
      notes: 'Dial setting determines SEU drained and damage dice rolled'
    },
    {
      name: 'Laser Rifle',
      category: 'Beam Weapon',
      damage: '1d10 to 20d10 (dial)',
      rof: 1,
      shortRange: '30m',
      medRange: '75m',
      longRange: '150m',
      ammo: '20 SEU clip or Backpack (100 SEU)',
      notes: 'High-power dialable beam weapon'
    },
    {
      name: 'Electrostunner',
      category: 'Energy Weapon',
      damage: 'Stun',
      rof: 1,
      shortRange: '5m',
      medRange: '15m',
      longRange: '30m',
      ammo: '20 SEU clip',
      notes: 'Non-lethal electrical discharge; causes unconsciousness on failed STA check'
    },
    {
      name: 'Automatic Pistol',
      category: 'Projectile Weapon',
      damage: '1d10',
      rof: 2,
      shortRange: '10m',
      medRange: '25m',
      longRange: '50m',
      ammo: '20 bullets',
      notes: 'Semi-automatic slug thrower'
    },
    {
      name: 'Automatic Rifle',
      category: 'Projectile Weapon',
      damage: '1d10',
      rof: 3,
      shortRange: '30m',
      medRange: '75m',
      longRange: '150m',
      ammo: '20 bullets',
      notes: 'Burst fire: +10% to hit, +1d10 damage (expends 3 rounds)'
    },
    {
      name: 'Gyrojet Pistol',
      category: 'Gyrojet Weapon',
      damage: '1d10',
      rof: 2,
      shortRange: '10m',
      medRange: '25m',
      longRange: '50m',
      ammo: '10 rockets',
      notes: 'Micro-rocket launcher pistol; low recoil'
    },
    {
      name: 'Gyrojet Rifle',
      category: 'Gyrojet Weapon',
      damage: '1d10',
      rof: 2,
      shortRange: '30m',
      medRange: '75m',
      longRange: '150m',
      ammo: '10 rockets',
      notes: 'Micro-rocket long rifle with extended range'
    },
    {
      name: 'Needler',
      category: 'Special Weapon',
      damage: 'Poison / Sleep',
      rof: 3,
      shortRange: '5m',
      medRange: '15m',
      longRange: '30m',
      ammo: '10 needles',
      notes: 'Silent flechette weapon loaded with tranquilizer or toxin'
    },
    {
      name: 'Frag Grenade',
      category: 'Grenade',
      damage: '5d10',
      rof: 1,
      shortRange: 'STR / 2 meters',
      medRange: '-',
      longRange: '-',
      ammo: '1 grenade',
      notes: 'Blast radius 5m; halved damage outside 2m radius'
    },
    {
      name: 'Doze Grenade',
      category: 'Grenade',
      damage: 'Sleep Gas',
      rof: 1,
      shortRange: 'STR / 2 meters',
      medRange: '-',
      longRange: '-',
      ammo: '1 grenade',
      notes: 'Blast radius 5m; produces sleep-inducing gas cloud'
    },
    {
      name: 'Smoke Grenade',
      category: 'Grenade',
      damage: 'Obscuration',
      rof: 1,
      shortRange: 'STR / 2 meters',
      medRange: '-',
      longRange: '-',
      ammo: '1 grenade',
      notes: 'Blast radius 10m; blocks vision and laser lines of sight'
    },
    {
      name: 'Tangler Grenade',
      category: 'Grenade',
      damage: 'Restraining fibers',
      rof: 1,
      shortRange: 'STR / 2 meters',
      medRange: '-',
      longRange: '-',
      ammo: '1 grenade',
      notes: 'Blast radius 3m; immobilizes targets caught in strong polymer threads'
    }
  ],

  modifiers: [
    {
      condition: 'Point Blank range',
      modifier: '+20%',
      notes: 'Target within 2 meters'
    },
    {
      condition: 'Short range',
      modifier: '0%',
      notes: 'Standard base weapon range'
    },
    {
      condition: 'Medium range',
      modifier: '-10%',
      notes: 'Beyond short range up to medium range limit'
    },
    {
      condition: 'Long range',
      modifier: '-20%',
      notes: 'Beyond medium range up to long range limit'
    },
    {
      condition: 'Extreme range',
      modifier: '-30%',
      notes: 'Beyond long range limit up to maximum effective weapon range'
    },
    {
      condition: 'Target moving fast / running',
      modifier: '-10%',
      notes: 'Target is sprinting or executing evasive dash'
    },
    {
      condition: 'Target in soft cover',
      modifier: '-10%',
      notes: 'Foliage, light furniture, translucent barriers'
    },
    {
      condition: 'Target in hard cover',
      modifier: '-20%',
      notes: 'Stone walls, metal bulkheads, armor plates'
    },
    {
      condition: 'Partial darkness / smoke',
      modifier: '-15%',
      notes: 'Dim lighting, mist, light smoke screens'
    },
    {
      condition: 'Total darkness / blind',
      modifier: '-30%',
      notes: 'Zero-visibility environments'
    },
    {
      condition: 'Careful Aim (1 turn)',
      modifier: '+10%',
      notes: 'Spend full turn aiming without moving (max +20% for 2 turns)'
    },
    {
      condition: 'Target Prone',
      modifier: '+10% within 10m, -10% at distance',
      notes: 'Easier to hit up close, harder to silhouette at long distance'
    }
  ],

  armor: [
    {
      name: 'Skeinsuit',
      type: 'Ballistic Cloth',
      protection: 'Halves projectile, bullet, and blast damage',
      notes: 'Flexible lightweight weave; no effect on laser or energy weapons'
    },
    {
      name: 'Albedo Suit',
      type: 'Ablative Suit',
      protection: 'Absorbs up to 20 pts of laser damage before degradation',
      notes: 'Reflective surface; ineffective against bullets or kinetic trauma'
    },
    {
      name: 'Albedo Screen',
      type: 'Energy Shield',
      protection: 'Absorbs laser damage (1 SEU per 2 pts absorbed)',
      notes: 'Belt-mounted powered field; protects against laser and beam attacks'
    },
    {
      name: 'Inertia Screen',
      type: 'Kinetic Shield',
      protection: 'Absorbs kinetic and blast damage',
      notes: 'Belt-mounted force field; cushions against bullets, shrapnel, and falls'
    }
  ]
};

export const MELEE_COMBAT_REF = {
  attackBaseFormula: 'Higher of ceil(STR / 2) or ceil(DEX / 2) + (Melee Weapons skill level * 10%)',

  unarmedDamage: [
    {
      strBracket: 'STR 1-20',
      punchDamage: '1 pt punch',
      kickDamage: '1d10/2 kick'
    },
    {
      strBracket: 'STR 21-40',
      punchDamage: '2 pts punch',
      kickDamage: '1d10 kick'
    },
    {
      strBracket: 'STR 41-60',
      punchDamage: '3 pts punch',
      kickDamage: '1d10+1 kick'
    },
    {
      strBracket: 'STR 61-80',
      punchDamage: '4 pts punch',
      kickDamage: '1d10+2 kick'
    },
    {
      strBracket: 'STR 81+',
      punchDamage: '5 pts punch',
      kickDamage: '1d10+3 kick'
    }
  ],

  weapons: [
    {
      name: 'Knife',
      damage: '1d10 / 2',
      weight: '0.5 kg',
      special: 'Can be thrown (short range 5m)'
    },
    {
      name: 'Vibroknife',
      damage: '1d10',
      weight: '1 kg',
      special: 'Powered blade (1 SEU per minute of combat)'
    },
    {
      name: 'Stun Baton',
      damage: 'Stun damage',
      weight: '1 kg',
      special: 'Non-lethal electrical shock (uses 2 SEU per hit)'
    },
    {
      name: 'Club / Staff',
      damage: '1d10 / 2',
      weight: '1-2 kg',
      special: 'Simple bludgeoning weapon; can parry'
    },
    {
      name: 'Sword / Machete',
      damage: '1d10',
      weight: '2 kg',
      special: 'Edged blade; standard one-handed weapon'
    },
    {
      name: 'Axe',
      damage: '1d10+1',
      weight: '2.5 kg',
      special: 'Heavy cleaving weapon'
    }
  ],

  modifiers: [
    {
      situation: 'Charging into melee',
      modifier: '+10%',
      notes: '+10% to hit, but opponent attacks first'
    },
    {
      situation: 'Defending / dodging',
      modifier: '-10%',
      notes: '-10% to attacker\'s hit chance; defender forfeit own attack'
    },
    {
      situation: 'Multiple attackers',
      modifier: '+5% per additional attacker',
      notes: 'Applies up to maximum of +20%'
    },
    {
      situation: 'Target prone / pinned',
      modifier: '+20%',
      notes: 'Target cannot dodge effectively while on ground or held'
    },
    {
      situation: 'Yazirian Battle Rage',
      modifier: '+20%',
      notes: '+20% to hit in melee; enraged Yazirians fight without fear'
    }
  ]
};

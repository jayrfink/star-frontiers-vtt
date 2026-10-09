export const RACES_DATA = {
  Human: {
    modifiers: { str: 0, sta: 0, dex: 0, rs: 0, int: 0, log: 0, per: 0, ldr: 0 },
    movement: { walk: 2, run: 6, glide: 0 },
    abilitiesDescription: 'Versatile race. Receives a +5 bonus to any single ability score during creation.'
  },
  Dralasite: {
    modifiers: { str: 5, sta: 5, dex: -5, rs: -5, int: 0, log: 0, per: 0, ldr: 0 },
    movement: { walk: 1, run: 4, glide: 0 },
    abilitiesDescription: 'Elasticity (grows limbs up to DEX/10), Lie Detection (5% base).'
  },
  Vrusk: {
    modifiers: { str: -5, sta: -5, dex: 5, rs: 5, int: 0, log: 0, per: 0, ldr: 0 },
    movement: { walk: 3, run: 7, glide: 0 },
    abilitiesDescription: 'Comprehension (15% base), Ambidexterity.'
  },
  Yazirian: {
    modifiers: { str: -10, sta: -10, dex: 5, rs: 5, int: 5, log: 5, per: 0, ldr: 0 },
    movement: { walk: 2, run: 6, glide: 4 },
    abilitiesDescription: 'Battle Rage (5% base, +20 to hit in melee), Gliding, Night Vision.'
  }
};

export const OFFICIAL_SKILLS = [
  // Military
  { name: 'Beam Weapons', psa: 'Military', baseChance: 'Dexterity' },
  { name: 'Gyrojet Weapons', psa: 'Military', baseChance: 'Dexterity' },
  { name: 'Projectile Weapons', psa: 'Military', baseChance: 'Dexterity' },
  { name: 'Melee Weapons', psa: 'Military', baseChance: 'Melee Base (STR/DEX)' },
  { name: 'Thrown Weapons', psa: 'Military', baseChance: 'Dexterity' },
  { name: 'Demolitions', psa: 'Military', baseChance: 'Logic' },
  { name: 'Martial Arts', psa: 'Military', baseChance: 'Melee Base (STR/DEX)' },
  // Technological
  { name: 'Computer', psa: 'Technological', baseChance: 'Logic' },
  { name: 'Robotics', psa: 'Technological', baseChance: 'Logic' },
  { name: 'Technician', psa: 'Technological', baseChance: 'Logic' },
  // Biosocial
  { name: 'Environmental', psa: 'Biosocial', baseChance: 'Intuition' },
  { name: 'Medical', psa: 'Biosocial', baseChance: 'Logic' },
  { name: 'Psycho-Social', psa: 'Biosocial', baseChance: 'Personality' },
  // Spaceship (Knight Hawks Expansion Rules)
  { name: 'Piloting', psa: 'Spaceship', baseChance: 'Reaction Speed' },
  { name: 'Astrogation', psa: 'Spaceship', baseChance: 'Logic' },
  { name: 'Engineering', psa: 'Spaceship', baseChance: 'Logic' },
  { name: 'Gunnery', psa: 'Spaceship', baseChance: 'Dexterity' }
];

export const SPACESHIP_SKILL_COSTS = {
  Piloting: [10, 20, 40, 70, 100, 150],
  Astrogation: [8, 16, 36, 60, 80, 120],
  Engineering: [8, 16, 36, 60, 80, 120],
  Gunnery: [6, 12, 20, 30, 50, 75]
};

export function calcIM(rs) {
  return Math.ceil((rs || 50) / 10);
}

export function calcPunchDamage(str) {
  const val = str || 50;
  if (val <= 20) return '1';
  if (val <= 40) return '2';
  if (val <= 60) return '3';
  if (val <= 80) return '4';
  return '5';
}

export function calcMeleeHit(str, dex) {
  return Math.max(Math.ceil((str || 50) / 2), Math.ceil((dex || 50) / 2));
}

export function calcMaxCarry(str) {
  return str || 50; // kg
}

export function calcUnencumberedMax(str) {
  return Math.floor((str || 50) / 2); // kg
}

export function calcXPCost(skillName, nextLevel, charPSA) {
  if (SPACESHIP_SKILL_COSTS[skillName]) {
    if (nextLevel >= 1 && nextLevel <= 6) {
      return SPACESHIP_SKILL_COSTS[skillName][nextLevel - 1];
    }
    return 0;
  }
  const sk = OFFICIAL_SKILLS.find(s => s.name === skillName);
  if (!sk) return nextLevel * 3;
  let baseMult = 3;
  if (sk.psa === 'Technological') baseMult = 4;
  if (sk.psa === 'Biosocial') baseMult = 5;
  const inPSA = sk.psa === charPSA;
  const cost = nextLevel * baseMult;
  return inPSA ? cost : cost * 2;
}

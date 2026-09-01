# Alpha Dawn Character Sheet Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `CharacterSheetsView.vue` with official Alpha Dawn rules, derived sub-stats (IM, Punching Damage, Melee Hit %, Carrying Capacity, Movement), 13 official skills catalog with XP advancement calculator, encumbrance tracking, and full racial abilities integration.

**Architecture:** Create `client/src/constants/characterRules.js` with rulebook calculators and skill catalogs. Enhance `CharacterSheetsView.vue` to compute derived stats dynamically, display tactical sub-stats, manage racial abilities, support official skill pickers, and track item encumbrance.

**Tech Stack:** Vue 3, Socket.io-client, Vite

---

### Task 1: Alpha Dawn Character Rules Constants & Enhanced CharacterSheetsView UI

**Files:**
- Create: `client/src/constants/characterRules.js`
- Modify: `client/src/views/CharacterSheetsView.vue`

**Interfaces:**
- Produces: `characterRules.js` module exporting `RACES_DATA`, `OFFICIAL_SKILLS`, `calcIM`, `calcPunchDamage`, `calcMeleeHit`, `calcMaxCarry`, `calcXPCost`, and enhanced `CharacterSheetsView.vue` UI.

- [ ] **Step 1: Create client/src/constants/characterRules.js**

```js
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
  { name: 'Psycho-Social', psa: 'Biosocial', baseChance: 'Personality' }
];

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
  const sk = OFFICIAL_SKILLS.find(s => s.name === skillName);
  if (!sk) return nextLevel * 3;
  let baseMult = 3;
  if (sk.psa === 'Technological') baseMult = 4;
  if (sk.psa === 'Biosocial') baseMult = 5;
  const inPSA = sk.psa === charPSA;
  const cost = nextLevel * baseMult;
  return inPSA ? cost : cost * 2;
}
```

- [ ] **Step 2: Update CharacterSheetsView.vue**

Import `RACES_DATA`, `OFFICIAL_SKILLS`, and calculator functions in `CharacterSheetsView.vue`.
Enhance the template to include:
- Derived tactical sub-stats bar (IM, Punching Dmg, Melee Base Hit %, Encumbrance Weight Gauge, Movement Rates).
- Point-shift sliders/inputs for primary stat pairs (STR/STA, DEX/RS, INT/LOG, PER/LDR).
- Official Skill Selector dropdown with XP level-up button.
- Detailed Racial Traits controls (Dralasite Elasticity limbs, Lie Detection %, Vrusk Comprehension %, Yazirian Battle Rage %).
- Inventory mass calculator showing total kg carried vs unencumbered limit (`STR / 2` kg).

- [ ] **Step 3: Verification**

Run client build and server test suite:
```bash
docker exec sf-vtt-dev bash -c "cd client && npm run build"
docker exec sf-vtt-dev bash -c "cd server && npx vitest run"
```

- [ ] **Step 4: Commit**

```bash
git add client/
git commit -m "feat: upgrade CharacterSheetsView with official Alpha Dawn rules, derived sub-stats, and skill XP calculator"
```

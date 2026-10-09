# Knight Hawks Spaceship Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 4 spaceship skills (Piloting, Astrogation, Engineering, Gunnery) from the Knight Hawks Expansion Rules to character sheets, with governing attribute base chances and official flat XP progression costs.

**Architecture:** Extend `OFFICIAL_SKILLS` in `characterRules.js` with `'Spaceship'` PSA category, add `SPACESHIP_SKILL_COSTS` lookup table, update `calcXPCost` to return flat XP costs for spaceship skills, and support `Reaction Speed` base chance in `CharacterSheetsView.vue`.

**Tech Stack:** Vue 3, Vitest, JavaScript (ES modules).

## Global Constraints
- Run all test and build commands in the container: `docker exec sf-vtt-dev bash -c "<command>"`
- Spaceship skills are: `Piloting`, `Astrogation`, `Engineering`, and `Gunnery`.
- PSA category label is `'Spaceship'`.
- Base chances: Piloting: `'Reaction Speed'`, Astrogation: `'Logic'`, Engineering: `'Logic'`, Gunnery: `'Dexterity'`.
- Official flat XP costs from Knight Hawks page 28:
  - Piloting: `[10, 20, 40, 70, 100, 150]`
  - Astrogation: `[8, 16, 36, 60, 80, 120]`
  - Engineering: `[8, 16, 36, 60, 80, 120]`
  - Gunnery: `[6, 12, 20, 30, 50, 75]`
- Flat XP costs apply to spaceship skills regardless of the character's Primary Skill Area (PSA).

---

### Task 1: Add Spaceship Skills, Cost Table, and XP Cost Calculation to `characterRules.js` & Unit Tests

**Files:**
- Create: `client/src/constants/characterRules.test.js`
- Modify: `client/src/constants/characterRules.js`

**Interfaces:**
- Consumes: none
- Produces: `OFFICIAL_SKILLS` (containing 4 new spaceship skills), `SPACESHIP_SKILL_COSTS`, and `calcXPCost(skillName, nextLevel, charPSA)` supporting spaceship skills.

- [ ] **Step 1: Write the failing tests in `client/src/constants/characterRules.test.js`**

```javascript
import { describe, it, expect } from 'vitest';
import {
  OFFICIAL_SKILLS,
  SPACESHIP_SKILL_COSTS,
  calcXPCost,
} from './characterRules.js';

describe('Knight Hawks Spaceship Skills in characterRules.js', () => {
  it('includes all 4 spaceship skills in OFFICIAL_SKILLS', () => {
    const spaceSkills = OFFICIAL_SKILLS.filter(s => s.psa === 'Spaceship');
    expect(spaceSkills.map(s => s.name)).toEqual([
      'Piloting',
      'Astrogation',
      'Engineering',
      'Gunnery',
    ]);

    expect(OFFICIAL_SKILLS.find(s => s.name === 'Piloting')).toEqual({
      name: 'Piloting',
      psa: 'Spaceship',
      baseChance: 'Reaction Speed',
    });
    expect(OFFICIAL_SKILLS.find(s => s.name === 'Astrogation')).toEqual({
      name: 'Astrogation',
      psa: 'Spaceship',
      baseChance: 'Logic',
    });
    expect(OFFICIAL_SKILLS.find(s => s.name === 'Engineering')).toEqual({
      name: 'Engineering',
      psa: 'Spaceship',
      baseChance: 'Logic',
    });
    expect(OFFICIAL_SKILLS.find(s => s.name === 'Gunnery')).toEqual({
      name: 'Gunnery',
      psa: 'Spaceship',
      baseChance: 'Dexterity',
    });
  });

  it('exports SPACESHIP_SKILL_COSTS with correct Knight Hawks progression', () => {
    expect(SPACESHIP_SKILL_COSTS).toBeDefined();
    expect(SPACESHIP_SKILL_COSTS.Piloting).toEqual([10, 20, 40, 70, 100, 150]);
    expect(SPACESHIP_SKILL_COSTS.Astrogation).toEqual([8, 16, 36, 60, 80, 120]);
    expect(SPACESHIP_SKILL_COSTS.Engineering).toEqual([8, 16, 36, 60, 80, 120]);
    expect(SPACESHIP_SKILL_COSTS.Gunnery).toEqual([6, 12, 20, 30, 50, 75]);
  });

  it('calculates flat XP cost for spaceship skills regardless of character PSA', () => {
    // Level 1
    expect(calcXPCost('Piloting', 1, 'Military')).toBe(10);
    expect(calcXPCost('Piloting', 1, 'Technological')).toBe(10);
    expect(calcXPCost('Piloting', 1, 'Biosocial')).toBe(10);

    // Level 2
    expect(calcXPCost('Astrogation', 2, 'Military')).toBe(16);
    expect(calcXPCost('Engineering', 2, 'Biosocial')).toBe(16);
    expect(calcXPCost('Gunnery', 2, 'Technological')).toBe(12);

    // Level 6
    expect(calcXPCost('Piloting', 6, 'Military')).toBe(150);
    expect(calcXPCost('Astrogation', 6, 'Technological')).toBe(120);
    expect(calcXPCost('Engineering', 6, 'Military')).toBe(120);
    expect(calcXPCost('Gunnery', 6, 'Biosocial')).toBe(75);
  });

  it('continues calculating standard PSA costs for ground skills', () => {
    // Beam Weapons (Military): in-PSA = nextLevel * 3, out-of-PSA = nextLevel * 6
    expect(calcXPCost('Beam Weapons', 2, 'Military')).toBe(6);
    expect(calcXPCost('Beam Weapons', 2, 'Technological')).toBe(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npx vitest run src/constants/characterRules.test.js"
```
Expected: FAIL (missing exports/skills).

- [ ] **Step 3: Update `client/src/constants/characterRules.js`**

1. Add spaceship skills to `OFFICIAL_SKILLS`:
```javascript
  // Spaceship (Knight Hawks Expansion Rules)
  { name: 'Piloting', psa: 'Spaceship', baseChance: 'Reaction Speed' },
  { name: 'Astrogation', psa: 'Spaceship', baseChance: 'Logic' },
  { name: 'Engineering', psa: 'Spaceship', baseChance: 'Logic' },
  { name: 'Gunnery', psa: 'Spaceship', baseChance: 'Dexterity' }
```

2. Add `SPACESHIP_SKILL_COSTS`:
```javascript
export const SPACESHIP_SKILL_COSTS = {
  Piloting: [10, 20, 40, 70, 100, 150],
  Astrogation: [8, 16, 36, 60, 80, 120],
  Engineering: [8, 16, 36, 60, 80, 120],
  Gunnery: [6, 12, 20, 30, 50, 75]
};
```

3. Update `calcXPCost`:
```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npx vitest run src/constants/characterRules.test.js"
```
Expected: PASS all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add client/src/constants/characterRules.js client/src/constants/characterRules.test.js
git commit -m "feat(character-rules): add Knight Hawks spaceship skills and flat XP cost table"
```

---

### Task 2: Character Sheet UI Integration: Reaction Speed Base Chance, Spaceship Skill Options, and Component Tests

**Files:**
- Create: `client/test/CharacterSheetsSpaceshipSkills.test.js`
- Modify: `client/src/views/CharacterSheetsView.vue`

**Interfaces:**
- Consumes: `OFFICIAL_SKILLS`, `calcXPCost` from `characterRules.js`
- Produces: Correct display and success chance calculation for spaceship skills on character sheets.

- [ ] **Step 1: Write the failing tests in `client/test/CharacterSheetsSpaceshipSkills.test.js`**

```javascript
import { describe, it, expect } from 'vitest';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';
import { OFFICIAL_SKILLS } from '../src/constants/characterRules.js';

describe('CharacterSheetsView - Spaceship Skills Integration', () => {
  it('exposes spaceship skills in officialSkills data', () => {
    const defaultData = CharacterSheetsView.data();
    const spaceSkills = defaultData.officialSkills.filter(s => s.psa === 'Spaceship');
    expect(spaceSkills.length).toBe(4);
    expect(spaceSkills.map(s => s.name)).toContain('Piloting');
    expect(spaceSkills.map(s => s.name)).toContain('Astrogation');
    expect(spaceSkills.map(s => s.name)).toContain('Engineering');
    expect(spaceSkills.map(s => s.name)).toContain('Gunnery');
  });

  it('calculates Piloting success chance using Reaction Speed (rs)', () => {
    const vm = {
      selectedChar: {
        rs: 65,
        dex: 40,
        log: 45,
      },
      derivedMeleeHit: 50,
    };

    const skill = { name: 'Piloting', level: 2 };
    // Base RS (65) + level bonus (2 * 10 = 20) = 85%
    const chance = CharacterSheetsView.methods.getSkillSuccessChance.call(vm, skill);
    expect(chance).toBe(85);
  });

  it('calculates Astrogation and Engineering success chance using Logic (log)', () => {
    const vm = {
      selectedChar: {
        rs: 40,
        dex: 50,
        log: 60,
      },
      derivedMeleeHit: 50,
    };

    const astroSkill = { name: 'Astrogation', level: 1 };
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, astroSkill)).toBe(70);

    const engSkill = { name: 'Engineering', level: 3 };
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, engSkill)).toBe(90);
  });

  it('calculates Gunnery success chance using Dexterity (dex)', () => {
    const vm = {
      selectedChar: {
        rs: 40,
        dex: 70,
        log: 50,
      },
      derivedMeleeHit: 50,
    };

    const gunnerySkill = { name: 'Gunnery', level: 1 };
    expect(CharacterSheetsView.methods.getSkillSuccessChance.call(vm, gunnerySkill)).toBe(80);
  });

  it('returns official Knight Hawks XP cost for spaceship skills via getXPCost', () => {
    const vm = {
      selectedChar: { psa: 'Military' },
    };

    // Piloting Level 2 = 20 XP
    expect(CharacterSheetsView.methods.getXPCost.call(vm, 'Piloting', 2)).toBe(20);
    // Gunnery Level 4 = 30 XP
    expect(CharacterSheetsView.methods.getXPCost.call(vm, 'Gunnery', 4)).toBe(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/CharacterSheetsSpaceshipSkills.test.js"
```
Expected: FAIL (Reaction Speed not supported in `getSkillSuccessChance`).

- [ ] **Step 3: Update `client/src/views/CharacterSheetsView.vue`**

In `getSkillSuccessChance(skill)`:
```javascript
    getSkillSuccessChance(skill) {
      if (!this.selectedChar) return 0;
      const offSk = OFFICIAL_SKILLS.find((s) => s.name === skill.name);
      let baseVal = 50;
      if (offSk) {
        if (offSk.baseChance === 'Dexterity') baseVal = this.selectedChar.dex || 50;
        else if (offSk.baseChance === 'Reaction Speed') baseVal = this.selectedChar.rs || 50;
        else if (offSk.baseChance === 'Logic') baseVal = this.selectedChar.log || 50;
        else if (offSk.baseChance === 'Intuition') baseVal = this.selectedChar.int || 50;
        else if (offSk.baseChance === 'Personality') baseVal = this.selectedChar.per || 50;
        else if (offSk.baseChance.includes('Melee Base')) baseVal = this.derivedMeleeHit;
      }
      const lvlBonus = (skill.level || 1) * 10;
      return baseVal + lvlBonus;
    },
```

- [ ] **Step 4: Run tests and client build**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/CharacterSheetsSpaceshipSkills.test.js && npm run build"
```
Expected: PASS and build succeeds.

- [ ] **Step 5: Run full client and server test suites**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npx vitest run"
docker exec sf-vtt-dev bash -c "cd server && npm test"
```
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/views/CharacterSheetsView.vue client/test/CharacterSheetsSpaceshipSkills.test.js
git commit -m "feat(character-sheets): support Reaction Speed base chance and spaceship skills in character sheet"
```

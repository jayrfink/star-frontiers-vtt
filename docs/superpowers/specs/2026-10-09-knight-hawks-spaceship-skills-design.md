# Knight Hawks Spaceship Skills Design

## Overview
Add the 4 spaceship skills from the *Star Frontiers: Knight Hawks Expansion Rules* (page 28 / rules page 24) to the character sheet: **Piloting**, **Astrogation**, **Engineering**, and **Gunnery**. These skills are categorized under the `'Spaceship'` area, use their respective governing ability scores for base success chance, and follow the official flat XP cost progression per skill level regardless of character Primary Skill Area (PSA).

---

## 1. Rules & Constants (`client/src/constants/characterRules.js`)

### 1.1 `OFFICIAL_SKILLS`
Add the 4 spaceship skills with `psa: 'Spaceship'`:
- **Piloting**: `baseChance: 'Reaction Speed'` (governs reaction timing and vehicle control)
- **Astrogation**: `baseChance: 'Logic'` (governs complex interstellar navigational calculations)
- **Engineering**: `baseChance: 'Logic'` (governs starship maintenance, construction, and damage control)
- **Gunnery**: `baseChance: 'Dexterity'` (governs manual weapon targeting and tracking)

### 1.2 `SPACESHIP_SKILL_COSTS`
Define the flat XP cost table from *Knight Hawks Expansion Rules* (page 28):
```javascript
export const SPACESHIP_SKILL_COSTS = {
  Piloting: [10, 20, 40, 70, 100, 150],
  Astrogation: [8, 16, 36, 60, 80, 120],
  Engineering: [8, 16, 36, 60, 80, 120],
  Gunnery: [6, 12, 20, 30, 50, 75]
};
```

### 1.3 `calcXPCost(skillName, nextLevel, charPSA)`
Update `calcXPCost` to check `SPACESHIP_SKILL_COSTS`:
- If `SPACESHIP_SKILL_COSTS[skillName]` exists:
  - If `nextLevel >= 1 && nextLevel <= 6`, return `SPACESHIP_SKILL_COSTS[skillName][nextLevel - 1]`.
  - Otherwise return 0.
- Otherwise, retain standard Alpha Dawn PSA multiplier calculations (base multiplier 3/4/5; 2x cost if outside character PSA).

---

## 2. Character Sheet UI (`client/src/views/CharacterSheetsView.vue`)

### 2.1 Skill Selection
The skill dropdown already maps through `officialSkills: OFFICIAL_SKILLS`:
```html
<option v-for="offSk in officialSkills" :key="offSk.name" :value="offSk.name">
  {{ offSk.name }} ({{ offSk.psa }})
</option>
```
With the new skills added, it will seamlessly include:
- `Piloting (Spaceship)`
- `Astrogation (Spaceship)`
- `Engineering (Spaceship)`
- `Gunnery (Spaceship)`

### 2.2 Base Success Chance Calculation
In `getSkillSuccessChance(skill)`:
```javascript
if (offSk.baseChance === 'Dexterity') baseVal = this.selectedChar.dex || 50;
else if (offSk.baseChance === 'Reaction Speed') baseVal = this.selectedChar.rs || 50;
else if (offSk.baseChance === 'Logic') baseVal = this.selectedChar.log || 50;
else if (offSk.baseChance === 'Intuition') baseVal = this.selectedChar.int || 50;
else if (offSk.baseChance === 'Personality') baseVal = this.selectedChar.per || 50;
else if (offSk.baseChance.includes('Melee Base')) baseVal = this.derivedMeleeHit;
```
Adding `'Reaction Speed'` ensures Piloting calculates using `selectedChar.rs`.

### 2.3 XP Cost Display
The level upgrade button calls `getXPCost(skill.name, skill.level + 1)` which forwards to `calcXPCost(skillName, nextLevel, this.selectedChar.psa)`. With the updated `calcXPCost`, it will correctly display the official Knight Hawks XP cost on the button (e.g., `+Lvl (20 XP)`).

---

## 3. Automated Testing

1. **`client/src/constants/characterRules.test.js`**:
   - Verify `OFFICIAL_SKILLS` contains all 4 spaceship skills with `psa: 'Spaceship'`.
   - Verify `SPACESHIP_SKILL_COSTS` exists with exact Knight Hawks XP values for all 6 levels.
   - Verify `calcXPCost` returns the exact flat table values for Piloting, Astrogation, Engineering, and Gunnery, regardless of `charPSA`.
2. **`client/test/CharacterSheetsSpaceshipSkills.test.js`**:
   - Verify that adding a spaceship skill displays the `(Spaceship)` area tag.
   - Verify that Piloting uses Reaction Speed for its base success chance calculation.
   - Verify that upgrade buttons display the proper Knight Hawks XP values.

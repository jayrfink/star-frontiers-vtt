# Damage Dice Total Calculation and Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically sum $Nd10$ damage dice rolls and display the total in both a floating HUD canvas banner and inside the DMG Die dropdown on RPG and Space VTTs.

**Architecture:** A reusable pure function `calculateDamageRoll(results)` processes settled dice objects from `@3d-dice/dice-box`, calculates individual die values (mapping 0 to 10 for d10 damage) and the total sum. `RpgVttView.vue` and `SpaceVttView.vue` consume this utility on `rollDamage()`, updating a reactive `lastDamageRoll` state that renders a floating top-center HUD banner and a dropdown history card.

**Tech Stack:** Vue 3 (Composition API `<script setup>`), `@3d-dice/dice-box`, Vitest.

## Global Constraints

- Run all test and build commands in the container: `docker exec sf-vtt-dev bash -c "<command>"`
- Match the established damage die color palette: body `#140409`, lettering/border `#f29249`, glow `rgba(242, 146, 73, 0.4)`.
- Zero regressions in existing percentile rolls (`d%`) or map controls.

---

### Task 1: Create `calculateDamageRoll` Utility & Unit Tests

**Files:**
- Create: `client/src/utils/diceUtils.js`
- Test: `client/test/diceUtils.test.js`

**Interfaces:**
- Produces: `calculateDamageRoll(results: Array<{ value: number }>): { total: number, dice: number[], count: number }`

- [ ] **Step 1: Write the failing unit tests**

Create `client/test/diceUtils.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { calculateDamageRoll } from '../src/utils/diceUtils.js';

describe('calculateDamageRoll', () => {
  it('calculates total for a single die', () => {
    const raw = [{ value: 7 }];
    const result = calculateDamageRoll(raw);
    expect(result).toEqual({
      total: 7,
      dice: [7],
      count: 1
    });
  });

  it('calculates sum across multiple dice', () => {
    const raw = [{ value: 4 }, { value: 6 }, { value: 9 }];
    const result = calculateDamageRoll(raw);
    expect(result).toEqual({
      total: 19,
      dice: [4, 6, 9],
      count: 3
    });
  });

  it('maps 0 value to 10 for Star Frontiers d10 damage', () => {
    const raw = [{ value: 0 }, { value: 5 }];
    const result = calculateDamageRoll(raw);
    expect(result).toEqual({
      total: 15,
      dice: [10, 5],
      count: 2
    });
  });

  it('handles empty or missing input safely', () => {
    expect(calculateDamageRoll(null)).toEqual({ total: 0, dice: [], count: 0 });
    expect(calculateDamageRoll([])).toEqual({ total: 0, dice: [], count: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/diceUtils.test.js"`
Expected: FAIL (Cannot find module '../src/utils/diceUtils.js')

- [ ] **Step 3: Implement `calculateDamageRoll`**

Create `client/src/utils/diceUtils.js`:
```javascript
/**
 * Processes an array of settled die objects from @3d-dice/dice-box for damage rolls.
 * In Star Frontiers, d10 damage values range from 1 to 10. If the physics engine
 * returns 0 on a 10-sided die face, it represents a 10.
 *
 * @param {Array<{ value?: number }>} results
 * @returns {{ total: number, dice: number[], count: number }}
 */
export function calculateDamageRoll(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return { total: 0, dice: [], count: 0 };
  }

  const dice = results.map((d) => {
    const rawVal = Number(d?.value) || 0;
    return rawVal === 0 ? 10 : rawVal;
  });

  const total = dice.reduce((sum, val) => sum + val, 0);

  return {
    total,
    dice,
    count: dice.length
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/diceUtils.test.js"`
Expected: PASS (4 tests passing)

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/diceUtils.js client/test/diceUtils.test.js
git commit -m "feat: add calculateDamageRoll utility and tests"
```

---

### Task 2: Implement Damage Total HUD Banner & Dropdown Display in `RpgVttView.vue`

**Files:**
- Modify: `client/src/views/RpgVttView.vue`

**Interfaces:**
- Consumes: `calculateDamageRoll` from `client/src/utils/diceUtils.js`

- [ ] **Step 1: Import utility and add reactive damage state**

In `client/src/views/RpgVttView.vue`:
```javascript
import { calculateDamageRoll } from '../utils/diceUtils.js';

const lastDamageRoll = ref(null);
const showDamageHud = ref(false);
let damageHudTimeout = null;
```

Update `rollDamage()`:
```javascript
async function rollDamage() {
  if (diceBoxInstance) {
    showDamageHud.value = false;
    if (damageHudTimeout) clearTimeout(damageHudTimeout);

    try {
      const results = await diceBoxInstance.roll([
        { sides: 10, theme: 'custom-dmg', themeColor: '#140409', qty: damageDiceCount.value }
      ]);
      const rollSummary = calculateDamageRoll(results);
      if (rollSummary.count > 0) {
        lastDamageRoll.value = rollSummary;
        showDamageHud.value = true;
        damageHudTimeout = setTimeout(() => {
          showDamageHud.value = false;
        }, 8000);
      }
    } catch (err) {
      console.error('Damage dice roll failed:', err);
    }
  }
}
```

- [ ] **Step 2: Add HUD Banner markup and Dropdown Summary markup**

In template under `.vtt-workspace`:
```html
        <!-- Floating Damage HUD Banner -->
        <transition name="hud-pop">
          <div
            v-if="showDamageHud && lastDamageRoll"
            class="damage-hud-banner"
            @click="showDamageHud = false"
          >
            <div class="hud-header">
              <span class="hud-title">💥 DAMAGE TOTAL ({{ lastDamageRoll.count }}d10)</span>
              <button class="hud-close" @click.stop="showDamageHud = false">×</button>
            </div>
            <div class="hud-body">
              <span class="hud-total">{{ lastDamageRoll.total }}</span>
              <span class="hud-dice">({{ lastDamageRoll.dice.join(' + ') }})</span>
            </div>
          </div>
        </transition>
```

In `.dmg-menu-dropdown` under the roll button:
```html
          <div v-if="lastDamageRoll" class="dmg-last-roll-card">
            <div class="last-roll-header">Last Roll ({{ lastDamageRoll.count }}d10):</div>
            <div class="last-roll-result">
              <span class="last-roll-total">{{ lastDamageRoll.total }}</span>
              <span class="last-roll-breakdown">[{{ lastDamageRoll.dice.join(', ') }}]</span>
            </div>
          </div>
```

- [ ] **Step 3: Add CSS styling for HUD Banner and Dropdown Summary**

In `<style scoped>`:
```css
/* Damage HUD Banner */
.damage-hud-banner {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 4, 9, 0.94);
  border: 2px solid #f29249;
  border-radius: 8px;
  padding: 10px 18px;
  color: #f29249;
  z-index: 120;
  box-shadow: 0 0 20px rgba(242, 146, 73, 0.45), 0 8px 32px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  backdrop-filter: blur(4px);
}

.damage-hud-banner .hud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.damage-hud-banner .hud-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #f29249aa;
  text-transform: uppercase;
}

.damage-hud-banner .hud-close {
  background: transparent;
  border: none;
  color: #f29249;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.damage-hud-banner .hud-body {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.damage-hud-banner .hud-total {
  font-size: 32px;
  font-weight: 900;
  color: #f29249;
  text-shadow: 0 0 10px rgba(242, 146, 73, 0.7);
  line-height: 1;
}

.damage-hud-banner .hud-dice {
  font-size: 13px;
  color: #e5c07b;
  font-weight: 600;
}

/* Transitions */
.hud-pop-enter-active,
.hud-pop-leave-active {
  transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.hud-pop-enter-from,
.hud-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px) scale(0.9);
}

/* DMG Menu Dropdown Card */
.dmg-last-roll-card {
  margin-top: 8px;
  padding: 6px 8px;
  background: #140409;
  border: 1px solid #f2924966;
  border-radius: 4px;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dmg-last-roll-card .last-roll-header {
  color: #8b949e;
}

.dmg-last-roll-card .last-roll-result {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.dmg-last-roll-card .last-roll-total {
  color: #f29249;
  font-weight: 800;
  font-size: 14px;
}

.dmg-last-roll-card .last-roll-breakdown {
  color: #e5c07b;
  font-size: 11px;
}
```

- [ ] **Step 4: Verify client tests and build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/views/RpgVttView.vue
git commit -m "feat(rpg-vtt): add damage dice total HUD banner and dropdown summary"
```

---

### Task 3: Implement Damage Total HUD Banner & Dropdown Display in `SpaceVttView.vue`

**Files:**
- Modify: `client/src/views/SpaceVttView.vue`

**Interfaces:**
- Consumes: `calculateDamageRoll` from `client/src/utils/diceUtils.js`

- [ ] **Step 1: Import utility and add reactive damage state**

In `client/src/views/SpaceVttView.vue`:
```javascript
import { calculateDamageRoll } from '../utils/diceUtils.js';

const lastDamageRoll = ref(null);
const showDamageHud = ref(false);
let damageHudTimeout = null;
```

Update `rollDamage()` with async/await, HUD reveal, and auto-dismiss timer identical to Task 2.

- [ ] **Step 2: Add HUD Banner markup and Dropdown Summary markup**

Add the `<transition name="hud-pop">` banner inside `.vtt-workspace` and `.dmg-last-roll-card` inside `.dmg-menu-dropdown`.

- [ ] **Step 3: Add CSS styling for HUD Banner and Dropdown Summary**

Include the matching scoped styles in `SpaceVttView.vue`.

- [ ] **Step 4: Run full verification (client tests, server tests, build)**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test && cd ../client && npx vitest run && npm run build"`
Expected: PASS (all tests pass, production bundle compiles cleanly)

- [ ] **Step 5: Commit**

```bash
git add client/src/views/SpaceVttView.vue
git commit -m "feat(space-vtt): add damage dice total HUD banner and dropdown summary"
```

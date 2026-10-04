# VTT Die Roll Log (RPG VTT & Space VTT) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement separate, collapsible, bottom-left Die Roll Log HUDs in RPG VTT and Space VTT that record and display the last 20 dice rolls with local storage persistence.

**Architecture:** 
- In `client/src/views/RpgVttView.vue`, add roll log state, `localStorage` synchronization with key `sf_vtt_rpg_roll_log`, capture hooks in `rollPercentile()` and `rollDamage()`, and a collapsible bottom-left docked HUD component.
- In `client/src/views/SpaceVttView.vue`, implement identical capabilities completely decoupled using key `sf_vtt_space_roll_log`.
- Cap logs strictly at 20 entries.

**Tech Stack:** Vue 3 (Composition API), Vitest, LocalStorage, CSS

## Global Constraints
- Decoupled implementations: RPG VTT (`RpgVttView.vue`) and Space VTT (`SpaceVttView.vue`) must maintain strict independence; no shared state or coupled helpers.
- Cap: Exactly the last 20 rolls.
- Storage keys:
  - RPG VTT: `sf_vtt_rpg_roll_log`
  - Space VTT: `sf_vtt_space_roll_log`
- Location: Positioned inside `.vtt-canvas-wrapper` at `bottom: 16px; left: 16px;` (`z-index: 105`).
- All container test commands: `docker exec sf-vtt-dev bash -c "<command>"`.

---

### Task 1: RPG VTT: Implement Die Roll Log & Unit Tests

**Files:**
- Modify: `client/src/views/RpgVttView.vue`
- Create: `client/test/RpgVttRollLog.test.js`

**Interfaces:**
- Produces: `rollLog` reactive ref (max 20 entries), `isRollLogOpen` reactive ref, `addRollToLog`, `clearRollLog`.
- Storage key: `sf_vtt_rpg_roll_log`.

- [ ] **Step 1: Write failing unit test for RPG VTT roll log**

Create `client/test/RpgVttRollLog.test.js`:
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('RpgVttView Roll Log', () => {
  const filePath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('declares rollLog and isRollLogOpen state', () => {
    expect(content).toMatch(/const rollLog\s*=\s*ref\(\[\]\)/);
    expect(content).toMatch(/const isRollLogOpen\s*=\s*ref\(false\)/);
  });

  it('uses sf_vtt_rpg_roll_log storage key', () => {
    expect(content).toMatch(/sf_vtt_rpg_roll_log/);
  });

  it('caps roll log at 20 items', () => {
    expect(content).toMatch(/rollLog\.value\.length\s*>\s*20/);
  });

  it('includes roll log markup in template with collapsed and expanded states', () => {
    expect(content).toMatch(/class="roll-log-hud"/);
    expect(content).toMatch(/class="btn-roll-log-pill"/);
    expect(content).toMatch(/class="roll-log-card"/);
  });

  it('hooks into rollPercentile and rollDamage', () => {
    const rollPercentileFn = content.slice(content.indexOf('async function rollPercentile'), content.indexOf('async function rollDamage'));
    expect(rollPercentileFn).toMatch(/addRollToLog\(/);

    const rollDamageFn = content.slice(content.indexOf('async function rollDamage'), content.indexOf('function clearDice'));
    expect(rollDamageFn).toMatch(/addRollToLog\(/);
  });
});

describe('Roll Log helper simulation logic', () => {
  function createRollLogManager(maxItems = 20) {
    let log = [];
    return {
      get: () => log,
      add: (entry) => {
        log.unshift(entry);
        if (log.length > maxItems) {
          log = log.slice(0, maxItems);
        }
      },
      clear: () => {
        log = [];
      }
    };
  }

  it('caps entries strictly at 20', () => {
    const mgr = createRollLogManager(20);
    for (let i = 1; i <= 25; i++) {
      mgr.add({ id: String(i), total: i });
    }
    expect(mgr.get().length).toBe(20);
    expect(mgr.get()[0].total).toBe(25);
    expect(mgr.get()[19].total).toBe(6);
  });

  it('clears log completely', () => {
    const mgr = createRollLogManager(20);
    mgr.add({ id: '1', total: 50 });
    expect(mgr.get().length).toBe(1);
    mgr.clear();
    expect(mgr.get().length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/RpgVttRollLog.test.js"`
Expected: FAIL

- [ ] **Step 3: Implement Roll Log in `client/src/views/RpgVttView.vue`**

1. In `<script setup>`:
Add storage key, state, and management functions:
```javascript
const RPG_ROLL_LOG_KEY = 'sf_vtt_rpg_roll_log';
const rollLog = ref([]);
const isRollLogOpen = ref(false);

function loadRollLog() {
  try {
    const raw = localStorage.getItem(RPG_ROLL_LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        rollLog.value = parsed.slice(0, 20);
      }
    }
  } catch (err) {
    console.error('Failed to load RPG roll log:', err);
  }
}

function saveRollLog() {
  try {
    localStorage.setItem(RPG_ROLL_LOG_KEY, JSON.stringify(rollLog.value.slice(0, 20)));
  } catch (err) {
    console.error('Failed to save RPG roll log:', err);
  }
}

function addRollToLog(entry) {
  rollLog.value.unshift(entry);
  if (rollLog.value.length > 20) {
    rollLog.value = rollLog.value.slice(0, 20);
  }
  saveRollLog();
}

function clearRollLog() {
  rollLog.value = [];
  try {
    localStorage.removeItem(RPG_ROLL_LOG_KEY);
  } catch (err) {
    console.error('Failed to clear RPG roll log:', err);
  }
}
```

In `onMounted()`:
Call `loadRollLog()`.

In `rollPercentile()`:
After `if (rollSummary.valid)`:
```javascript
const now = new Date();
const timeStr = now.toTimeString().split(' ')[0];
addRollToLog({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  timestamp: timeStr,
  type: 'percentile',
  label: 'd%',
  total: rollSummary.total,
  breakdown: `[Tens: ${rollSummary.tens * 10}, Ones: ${rollSummary.ones}]`
});
```

In `rollDamage()`:
After `if (rollSummary.count > 0)`:
```javascript
const now = new Date();
const timeStr = now.toTimeString().split(' ')[0];
addRollToLog({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  timestamp: timeStr,
  type: 'damage',
  label: `${rollSummary.count}d10`,
  total: rollSummary.total,
  breakdown: `[${rollSummary.dice.join(', ')}]`
});
```

2. In `<template>`:
Inside `.vtt-canvas-wrapper` (above or alongside other HUD elements):
```html
<!-- Collapsible Die Roll Log HUD -->
<div class="roll-log-hud">
  <button
    v-if="!isRollLogOpen"
    type="button"
    class="btn-roll-log-pill"
    @click="isRollLogOpen = true"
    title="Open Die Roll Log"
  >
    🎲 Log ({{ rollLog.length }}) ▲
  </button>
  <div v-else class="roll-log-card">
    <div class="roll-log-header">
      <div class="roll-log-title">🎲 Roll Log ({{ rollLog.length }}/20)</div>
      <div class="roll-log-actions">
        <button type="button" class="btn-roll-log-clear" @click="clearRollLog" :disabled="rollLog.length === 0" title="Clear log">Clear</button>
        <button type="button" class="btn-roll-log-toggle" @click="isRollLogOpen = false" title="Minimize log">▼</button>
      </div>
    </div>
    <div class="roll-log-body">
      <div v-if="rollLog.length === 0" class="roll-log-empty">
        No rolls recorded yet.
      </div>
      <ul v-else class="roll-log-list">
        <li v-for="item in rollLog" :key="item.id" class="roll-log-item" :class="item.type">
          <div class="roll-item-meta">
            <span class="roll-item-time">{{ item.timestamp }}</span>
            <span class="roll-item-badge">{{ item.label }}</span>
          </div>
          <div class="roll-item-result">
            <span class="roll-item-total">{{ item.total }}</span>
            <span class="roll-item-breakdown">{{ item.breakdown }}</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</div>
```

3. In `<style scoped>`:
Add retro sci-fi styles:
```css
/* Bottom-Corner Die Roll Log HUD */
.roll-log-hud {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 105;
  pointer-events: auto;
}

.btn-roll-log-pill {
  background: #000000 !important;
  border: 1px solid rgba(0, 128, 128, 0.7) !important;
  color: #00ffff !important;
  -webkit-text-fill-color: #00ffff;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-roll-log-pill:hover {
  background: #051414 !important;
  border-color: aqua !important;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
}

.roll-log-card {
  width: 290px;
  max-height: 290px;
  background: #000000;
  border: 1px solid rgba(0, 128, 128, 0.8);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.roll-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #051414;
  border-bottom: 1px solid rgba(0, 128, 128, 0.5);
}

.roll-log-title {
  font-size: 12px;
  font-weight: 700;
  color: #00ffff;
  letter-spacing: 0.5px;
}

.roll-log-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-roll-log-clear {
  background: transparent !important;
  border: 1px solid rgba(0, 128, 128, 0.5) !important;
  color: #8b949e !important;
  -webkit-text-fill-color: #8b949e;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-roll-log-clear:hover:not(:disabled) {
  border-color: #f85149 !important;
  color: #f85149 !important;
  -webkit-text-fill-color: #f85149;
}

.btn-roll-log-toggle {
  background: transparent !important;
  border: none !important;
  color: #00ffff !important;
  -webkit-text-fill-color: #00ffff;
  font-size: 11px;
  padding: 2px 4px;
}

.roll-log-body {
  padding: 6px 10px;
  max-height: 240px;
  overflow-y: auto;
}

.roll-log-empty {
  font-size: 11px;
  color: #8b949e;
  text-align: center;
  padding: 12px 0;
  font-style: italic;
}

.roll-log-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.roll-log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  background: rgba(10, 25, 25, 0.5);
  border: 1px solid rgba(0, 128, 128, 0.25);
  border-radius: 4px;
}

.roll-log-item.percentile {
  border-left: 3px solid #00ffff;
}

.roll-log-item.damage {
  border-left: 3px solid #f29249;
}

.roll-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.roll-item-time {
  font-size: 10px;
  color: #8b949e;
  font-family: monospace;
}

.roll-item-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  background: #021a1e;
  color: #a8ffea;
  border: 1px solid rgba(0, 128, 128, 0.5);
}

.roll-log-item.damage .roll-item-badge {
  background: #140409;
  color: #f29249;
  border-color: rgba(242, 146, 73, 0.5);
}

.roll-item-result {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.roll-item-total {
  font-size: 14px;
  font-weight: 800;
  color: #00ffff;
}

.roll-log-item.damage .roll-item-total {
  color: #f29249;
}

.roll-item-breakdown {
  font-size: 10px;
  color: #a0a0a0;
  font-family: monospace;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/RpgVttRollLog.test.js"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/views/RpgVttView.vue client/test/RpgVttRollLog.test.js
git commit -m "feat(rpg-vtt): add collapsible 20-roll log HUD with localStorage persistence"
```

---

### Task 2: Space VTT: Implement Die Roll Log & Unit Tests

**Files:**
- Modify: `client/src/views/SpaceVttView.vue`
- Create: `client/test/SpaceVttRollLog.test.js`

**Interfaces:**
- Produces: `rollLog` reactive ref (max 20 entries), `isRollLogOpen` reactive ref, `addRollToLog`, `clearRollLog`.
- Storage key: `sf_vtt_space_roll_log`.

- [ ] **Step 1: Write failing unit test for Space VTT roll log**

Create `client/test/SpaceVttRollLog.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SpaceVttView Roll Log', () => {
  const filePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('declares rollLog and isRollLogOpen state', () => {
    expect(content).toMatch(/const rollLog\s*=\s*ref\(\[\]\)/);
    expect(content).toMatch(/const isRollLogOpen\s*=\s*ref\(false\)/);
  });

  it('uses sf_vtt_space_roll_log storage key', () => {
    expect(content).toMatch(/sf_vtt_space_roll_log/);
  });

  it('caps roll log at 20 items', () => {
    expect(content).toMatch(/rollLog\.value\.length\s*>\s*20/);
  });

  it('includes roll log markup in template with collapsed and expanded states', () => {
    expect(content).toMatch(/class="roll-log-hud"/);
    expect(content).toMatch(/class="btn-roll-log-pill"/);
    expect(content).toMatch(/class="roll-log-card"/);
  });

  it('hooks into rollPercentile and rollDamage', () => {
    const rollPercentileFn = content.slice(content.indexOf('async function rollPercentile'), content.indexOf('async function rollDamage'));
    expect(rollPercentileFn).toMatch(/addRollToLog\(/);

    const rollDamageFn = content.slice(content.indexOf('async function rollDamage'), content.indexOf('function clearDice'));
    expect(rollDamageFn).toMatch(/addRollToLog\(/);
  });
});

describe('Space Roll Log helper simulation logic', () => {
  function createRollLogManager(maxItems = 20) {
    let log = [];
    return {
      get: () => log,
      add: (entry) => {
        log.unshift(entry);
        if (log.length > maxItems) {
          log = log.slice(0, maxItems);
        }
      },
      clear: () => {
        log = [];
      }
    };
  }

  it('caps entries strictly at 20', () => {
    const mgr = createRollLogManager(20);
    for (let i = 1; i <= 25; i++) {
      mgr.add({ id: String(i), total: i });
    }
    expect(mgr.get().length).toBe(20);
    expect(mgr.get()[0].total).toBe(25);
    expect(mgr.get()[19].total).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttRollLog.test.js"`
Expected: FAIL

- [ ] **Step 3: Implement Roll Log in `client/src/views/SpaceVttView.vue`**

1. In `<script setup>`:
Add storage key `SPACE_ROLL_LOG_KEY = 'sf_vtt_space_roll_log'`, state, and helper functions identical to Task 1 with `SPACE_ROLL_LOG_KEY`.
Call `loadRollLog()` in `onMounted()`.
Hook `addRollToLog(...)` into `rollPercentile()` and `rollDamage()`.

2. In `<template>`:
Inside `.vtt-canvas-wrapper`, add the `.roll-log-hud` markup identical to Task 1.

3. In `<style scoped>`:
Add the `.roll-log-hud` CSS styles identical to Task 1.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttRollLog.test.js"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/views/SpaceVttView.vue client/test/SpaceVttRollLog.test.js
git commit -m "feat(space-vtt): add collapsible 20-roll log HUD with localStorage persistence"
```

---

### Task 3: Full Verification & Integration Testing

**Files:**
- All client and server test suites.

- [ ] **Step 1: Run complete server test suite**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: PASS (75/75 tests)

- [ ] **Step 2: Run complete client test suite and production build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: PASS (all test files pass, Vite production build succeeds)

- [ ] **Step 3: Verify live background services**

Run: `curl -s -I http://localhost:3000/api/auth/me && curl -s -I http://localhost:3001`
Expected: HTTP 401 on backend, HTTP 200 on client.

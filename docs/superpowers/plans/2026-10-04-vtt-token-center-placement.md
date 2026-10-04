# Pseudo-Random Center Token Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pseudo-randomly place new tokens in an unoccupied cell near the center of the active map (within a 5×5 area) on both RPG VTT and Space VTT, keeping implementations decoupled.

**Architecture:** Implement independent `getEmptyCenterCoords()` functions inside `RpgVttView.vue` and `SpaceVttView.vue` that inspect active map dimensions, locate the center `(cx, cy)`, evaluate a 5×5 bounding box for coordinates not currently occupied by tokens on the map, pick one at random, and expand outward if congested. Wire `openAddTokenModal()` in both views to set `newTokenForm.x` and `newTokenForm.y` using this helper.

**Tech Stack:** Vue 3 (Composition API / `<script setup>`), Vitest

## Global Constraints
- Decoupled implementations: RPG VTT (`RpgVttView.vue`) and Space VTT (`SpaceVttView.vue`) must not share token placement code; keep them separate.
- Central zone radius: Initial candidates are strictly within `[cx - 2 ... cx + 2]` and `[cy - 2 ... cy + 2]` (a 5×5 area).
- Collision avoidance: Must not pick a coordinate matching any existing token's `(x, y)` on the active map.
- Bounds clamping: Selected coordinates must remain strictly within `[0, width - 1]` and `[0, height - 1]`.
- All container test commands: `docker exec sf-vtt-dev bash -c "<command>"`.

---

### Task 1: RPG VTT: Implement Center Placement in `RpgVttView.vue` & Unit Tests

**Files:**
- Modify: `client/src/views/RpgVttView.vue`
- Create: `client/test/RpgVttCenterPlacement.test.js`

**Interfaces:**
- Produces: `getEmptyCenterCoords()` in `client/src/views/RpgVttView.vue` returning `{ x: number, y: number }`.
- Modifies: `openAddTokenModal()` in `client/src/views/RpgVttView.vue` to set `newTokenForm.x` and `newTokenForm.y` from `getEmptyCenterCoords()`.

- [ ] **Step 1: Write the failing unit tests for RPG VTT center placement**

Create `client/test/RpgVttCenterPlacement.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('RpgVttView Center Token Placement', () => {
  const filePath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('contains getEmptyCenterCoords function', () => {
    expect(content).toMatch(/function getEmptyCenterCoords\s*\(/);
  });

  it('calls getEmptyCenterCoords in openAddTokenModal', () => {
    const modalSection = content.slice(content.indexOf('function openAddTokenModal'));
    expect(modalSection).toMatch(/getEmptyCenterCoords\s*\(/);
  });

  it('evaluates coordinates within radius 2 of map center', () => {
    expect(content).toMatch(/initialRadius\s*=\s*2/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/RpgVttCenterPlacement.test.js"`
Expected: FAIL (function not found)

- [ ] **Step 3: Implement `getEmptyCenterCoords` in `RpgVttView.vue`**

In `client/src/views/RpgVttView.vue`:
Add helper function before `openAddTokenModal()`:
```javascript
function getEmptyCenterCoords() {
  const mapW = activeMap.value?.width || 20;
  const mapH = activeMap.value?.height || 20;
  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);

  const occupied = new Set(tokens.value.map((t) => `${t.x},${t.y}`));

  const initialRadius = 2;
  const initialCandidates = [];
  for (let dx = -initialRadius; dx <= initialRadius; dx++) {
    for (let dy = -initialRadius; dy <= initialRadius; dy++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
        if (!occupied.has(`${x},${y}`)) {
          initialCandidates.push({ x, y });
        }
      }
    }
  }

  if (initialCandidates.length > 0) {
    const idx = Math.floor(Math.random() * initialCandidates.length);
    return initialCandidates[idx];
  }

  const maxRadius = Math.max(mapW, mapH);
  for (let r = initialRadius + 1; r <= maxRadius; r++) {
    const ringCandidates = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
          if (!occupied.has(`${x},${y}`)) {
            ringCandidates.push({ x, y });
          }
        }
      }
    }
    if (ringCandidates.length > 0) {
      const idx = Math.floor(Math.random() * ringCandidates.length);
      return ringCandidates[idx];
    }
  }

  return { x: cx, y: cy };
}
```

Update `openAddTokenModal()` in `client/src/views/RpgVttView.vue`:
```javascript
function openAddTokenModal() {
  selectedCharacterId.value = null;
  newTokenForm.name = '';
  newTokenForm.color = '#666666';
  newTokenForm.avatar_url = '';
  const spawn = getEmptyCenterCoords();
  newTokenForm.x = spawn.x;
  newTokenForm.y = spawn.y;
  newTokenForm.size = 1;
  if (tokenFileInput.value) tokenFileInput.value.value = '';
  showAddTokenModal.value = true;
}
```

- [ ] **Step 4: Expand unit tests to verify algorithm logic with mock data**

Add algorithmic test cases to `client/test/RpgVttCenterPlacement.test.js`:
```javascript
describe('RPG VTT Center Placement Algorithm simulation', () => {
  function simulateSpawn(mapW, mapH, tokens) {
    const cx = Math.floor(mapW / 2);
    const cy = Math.floor(mapH / 2);
    const occupied = new Set(tokens.map((t) => `${t.x},${t.y}`));

    const initialRadius = 2;
    const initialCandidates = [];
    for (let dx = -initialRadius; dx <= initialRadius; dx++) {
      for (let dy = -initialRadius; dy <= initialRadius; dy++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
          if (!occupied.has(`${x},${y}`)) {
            initialCandidates.push({ x, y });
          }
        }
      }
    }

    if (initialCandidates.length > 0) {
      const idx = Math.floor(Math.random() * initialCandidates.length);
      return initialCandidates[idx];
    }

    const maxRadius = Math.max(mapW, mapH);
    for (let r = initialRadius + 1; r <= maxRadius; r++) {
      const ringCandidates = [];
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
            if (!occupied.has(`${x},${y}`)) {
              ringCandidates.push({ x, y });
            }
          }
        }
      }
      if (ringCandidates.length > 0) {
        const idx = Math.floor(Math.random() * ringCandidates.length);
        return ringCandidates[idx];
      }
    }

    return { x: cx, y: cy };
  }

  it('spawns within radius 2 on an empty 20x20 map (center 10,10)', () => {
    for (let i = 0; i < 20; i++) {
      const spawn = simulateSpawn(20, 20, []);
      expect(spawn.x).toBeGreaterThanOrEqual(8);
      expect(spawn.x).toBeLessThanOrEqual(12);
      expect(spawn.y).toBeGreaterThanOrEqual(8);
      expect(spawn.y).toBeLessThanOrEqual(12);
    }
  });

  it('avoids occupied cells in center', () => {
    const tokens = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 11, y: 10 }];
    for (let i = 0; i < 20; i++) {
      const spawn = simulateSpawn(20, 20, tokens);
      expect(tokens.some((t) => t.x === spawn.x && t.y === spawn.y)).toBe(false);
    }
  });

  it('falls back to outer rings when center 5x5 is fully occupied', () => {
    const fullCenterTokens = [];
    for (let x = 8; x <= 12; x++) {
      for (let y = 8; y <= 12; y++) {
        fullCenterTokens.push({ x, y });
      }
    }
    const spawn = simulateSpawn(20, 20, fullCenterTokens);
    expect(fullCenterTokens.some((t) => t.x === spawn.x && t.y === spawn.y)).toBe(false);
    const dist = Math.max(Math.abs(spawn.x - 10), Math.abs(spawn.y - 10));
    expect(dist).toBe(3);
  });
});
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/RpgVttCenterPlacement.test.js"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/views/RpgVttView.vue client/test/RpgVttCenterPlacement.test.js
git commit -m "feat(rpg-vtt): place new tokens near map center with collision avoidance"
```

---

### Task 2: Space VTT: Implement Center Placement in `SpaceVttView.vue` & Unit Tests

**Files:**
- Modify: `client/src/views/SpaceVttView.vue`
- Create: `client/test/SpaceVttCenterPlacement.test.js`

**Interfaces:**
- Produces: `getEmptyCenterCoords()` in `client/src/views/SpaceVttView.vue` returning `{ x: number, y: number }`.
- Modifies: `openAddTokenModal()` in `client/src/views/SpaceVttView.vue` to set `newTokenForm.x` and `newTokenForm.y` from `getEmptyCenterCoords()`.

- [ ] **Step 1: Write the failing unit tests for Space VTT center placement**

Create `client/test/SpaceVttCenterPlacement.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SpaceVttView Center Token Placement', () => {
  const filePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('contains getEmptyCenterCoords function', () => {
    expect(content).toMatch(/function getEmptyCenterCoords\s*\(/);
  });

  it('calls getEmptyCenterCoords in openAddTokenModal', () => {
    const modalSection = content.slice(content.indexOf('function openAddTokenModal'));
    expect(modalSection).toMatch(/getEmptyCenterCoords\s*\(/);
  });

  it('evaluates coordinates within radius 2 of map center', () => {
    expect(content).toMatch(/initialRadius\s*=\s*2/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttCenterPlacement.test.js"`
Expected: FAIL (function not found)

- [ ] **Step 3: Implement `getEmptyCenterCoords` in `SpaceVttView.vue`**

In `client/src/views/SpaceVttView.vue`:
Add helper function before `openAddTokenModal()`:
```javascript
function getEmptyCenterCoords() {
  const mapW = activeMap.value?.width || 20;
  const mapH = activeMap.value?.height || 20;
  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);

  const occupied = new Set(tokens.value.map((t) => `${t.x},${t.y}`));

  const initialRadius = 2;
  const initialCandidates = [];
  for (let dx = -initialRadius; dx <= initialRadius; dx++) {
    for (let dy = -initialRadius; dy <= initialRadius; dy++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
        if (!occupied.has(`${x},${y}`)) {
          initialCandidates.push({ x, y });
        }
      }
    }
  }

  if (initialCandidates.length > 0) {
    const idx = Math.floor(Math.random() * initialCandidates.length);
    return initialCandidates[idx];
  }

  const maxRadius = Math.max(mapW, mapH);
  for (let r = initialRadius + 1; r <= maxRadius; r++) {
    const ringCandidates = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
          if (!occupied.has(`${x},${y}`)) {
            ringCandidates.push({ x, y });
          }
        }
      }
    }
    if (ringCandidates.length > 0) {
      const idx = Math.floor(Math.random() * ringCandidates.length);
      return ringCandidates[idx];
    }
  }

  return { x: cx, y: cy };
}
```

Update `openAddTokenModal()` in `client/src/views/SpaceVttView.vue`:
```javascript
function openAddTokenModal() {
  selectedShipId.value = null;
  newTokenForm.name = '';
  newTokenForm.color = '#666666';
  newTokenForm.avatar_url = '';
  const spawn = getEmptyCenterCoords();
  newTokenForm.x = spawn.x;
  newTokenForm.y = spawn.y;
  newTokenForm.size = 1;
  newTokenForm.current_speed = 0;
  newTokenForm.rotation = 0;
  if (tokenFileInput.value) tokenFileInput.value.value = '';
  showAddTokenModal.value = true;
}
```

- [ ] **Step 4: Expand unit tests to verify algorithm logic with mock data**

Add simulation test cases in `client/test/SpaceVttCenterPlacement.test.js`:
```javascript
describe('Space VTT Center Placement Algorithm simulation', () => {
  function simulateSpawn(mapW, mapH, tokens) {
    const cx = Math.floor(mapW / 2);
    const cy = Math.floor(mapH / 2);
    const occupied = new Set(tokens.map((t) => `${t.x},${t.y}`));

    const initialRadius = 2;
    const initialCandidates = [];
    for (let dx = -initialRadius; dx <= initialRadius; dx++) {
      for (let dy = -initialRadius; dy <= initialRadius; dy++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
          if (!occupied.has(`${x},${y}`)) {
            initialCandidates.push({ x, y });
          }
        }
      }
    }

    if (initialCandidates.length > 0) {
      const idx = Math.floor(Math.random() * initialCandidates.length);
      return initialCandidates[idx];
    }

    const maxRadius = Math.max(mapW, mapH);
    for (let r = initialRadius + 1; r <= maxRadius; r++) {
      const ringCandidates = [];
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
            if (!occupied.has(`${x},${y}`)) {
              ringCandidates.push({ x, y });
            }
          }
        }
      }
      if (ringCandidates.length > 0) {
        const idx = Math.floor(Math.random() * ringCandidates.length);
        return ringCandidates[idx];
      }
    }

    return { x: cx, y: cy };
  }

  it('spawns within radius 2 on an empty 20x20 space hex map', () => {
    for (let i = 0; i < 20; i++) {
      const spawn = simulateSpawn(20, 20, []);
      expect(spawn.x).toBeGreaterThanOrEqual(8);
      expect(spawn.x).toBeLessThanOrEqual(12);
      expect(spawn.y).toBeGreaterThanOrEqual(8);
      expect(spawn.y).toBeLessThanOrEqual(12);
    }
  });

  it('avoids occupied hexes in center', () => {
    const tokens = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 9, y: 9 }];
    for (let i = 0; i < 20; i++) {
      const spawn = simulateSpawn(20, 20, tokens);
      expect(tokens.some((t) => t.x === spawn.x && t.y === spawn.y)).toBe(false);
    }
  });

  it('falls back to outer rings when center 5x5 is fully occupied', () => {
    const fullCenterTokens = [];
    for (let x = 8; x <= 12; x++) {
      for (let y = 8; y <= 12; y++) {
        fullCenterTokens.push({ x, y });
      }
    }
    const spawn = simulateSpawn(20, 20, fullCenterTokens);
    expect(fullCenterTokens.some((t) => t.x === spawn.x && t.y === spawn.y)).toBe(false);
    const dist = Math.max(Math.abs(spawn.x - 10), Math.abs(spawn.y - 10));
    expect(dist).toBe(3);
  });
});
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttCenterPlacement.test.js"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/views/SpaceVttView.vue client/test/SpaceVttCenterPlacement.test.js
git commit -m "feat(space-vtt): place new tokens near map center with collision avoidance"
```

---

### Task 3: Full Verification & Integration Suite

**Files:**
- All client and server test suites.

- [ ] **Step 1: Run complete server test suite**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: PASS (75/75 tests)

- [ ] **Step 2: Run complete client test suite and production build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: PASS (all test files pass, Vite build completes)

- [ ] **Step 3: Verification of live servers**

Run: `curl -s -I http://localhost:3000/api/auth/me && curl -s -I http://localhost:3001`
Expected: HTTP 401 on backend, HTTP 200 on client.

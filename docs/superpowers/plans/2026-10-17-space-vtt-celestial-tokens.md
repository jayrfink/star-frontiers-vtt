# Space VTT Celestial Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable adding special celestial tokens (asteroids, moons, centurian moons, planets) to the Space VTT tactical map with 1-hex size, no ring border, no speed indicator, no rotation/heading, and no tactical conditions.

**Architecture:**
- Uses the existing `layer: 'celestial'` attribute on the `tokens` table (supported by SQLite and backend API without schema migrations).
- Adds a shared utility (`client/src/utils/spaceTokens.js`) defining `isCelestialToken` and canonical preset names.
- Updates `client/src/views/SpaceVttView.vue` with a Token Type selector and quick preset chips in the Add Token modal, and a streamlined inspector sidebar for celestial tokens.
- Updates `client/src/components/SpaceVttCanvas.vue` to suppress ring border strokes, speed badges, status icons, and rotation for celestial tokens while preserving image clipping and selection glow.

**Tech Stack:**
- Vue 3 (Composition API / Options API), Vite
- HTML5 Canvas 2D Rendering
- Express.js, Better-SQLite3
- Vitest, Supertest, @vue/test-utils

## Global Constraints
- Run all test and build commands inside the container: `docker exec sf-vtt-dev bash -c "<command>"`
- Client tests: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run <test-path>"`
- Full client suite & build: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
- Full server suite: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
- Celestial tokens must strictly occupy 1 hex (`size: 1`).
- Celestial tokens must have no ring, no speed, no heading rotation, and no status conditions rendered on canvas or inspector.
- Images can be stored and browsed from standard `/uploads/tokens` media assets via `ImageBrowserModal`.

---

### Task 1: Backend API Celestial Layer Verification & Space Tokens Shared Utility

**Files:**
- Modify: `server/test/maps.test.js`
- Create: `client/src/utils/spaceTokens.js`
- Create: `client/test/spaceTokens.test.js`

**Interfaces:**
- Produces:
  - `isCelestialToken(token)`: `(token: object | null | undefined) => boolean`
  - `CELESTIAL_PRESET_NAMES`: `['Asteroid', 'Moon', 'Centurian Moon', 'Planet']`

- [ ] **Step 1: Write the failing backend test in `server/test/maps.test.js`**

Add test to `server/test/maps.test.js` under `describe('Maps & Tokens API & Socket.io')`:

```javascript
    it('creates and persists celestial token with layer: "celestial"', async () => {
      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Centurian Moon',
        layer: 'celestial',
        size: 1,
        color: '',
        rotation: 0,
        current_speed: null,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.layer).toBe('celestial');
      expect(createRes.body.name).toBe('Centurian Moon');
      expect(createRes.body.size).toBe(1);

      const fetchRes = await agent.get(`/api/tokens/${createRes.body.id}`);
      expect(fetchRes.status).toBe(200);
      expect(fetchRes.body.layer).toBe('celestial');
    });
```

- [ ] **Step 2: Run test in container to verify it passes or fails**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/maps.test.js"`
Expected: PASS (verifies backend already handles `layer` cleanly, or reveals any edge cases).

- [ ] **Step 3: Write failing unit test in `client/test/spaceTokens.test.js`**

```javascript
import { describe, it, expect } from 'vitest';
import { isCelestialToken, CELESTIAL_PRESET_NAMES } from '../src/utils/spaceTokens.js';

describe('spaceTokens utility', () => {
  it('exports canonical preset names', () => {
    expect(CELESTIAL_PRESET_NAMES).toEqual(['Asteroid', 'Moon', 'Centurian Moon', 'Planet']);
  });

  it('correctly identifies celestial tokens by layer', () => {
    expect(isCelestialToken({ layer: 'celestial' })).toBe(true);
    expect(isCelestialToken({ layer: 'character' })).toBe(false);
    expect(isCelestialToken({ layer: '' })).toBe(false);
    expect(isCelestialToken({})).toBe(false);
    expect(isCelestialToken(null)).toBe(false);
    expect(isCelestialToken(undefined)).toBe(false);
  });

  it('identifies celestial tokens if token_type is celestial for fallback', () => {
    expect(isCelestialToken({ token_type: 'celestial' })).toBe(true);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/spaceTokens.test.js"`
Expected: FAIL with "Cannot find module '../src/utils/spaceTokens.js'"

- [ ] **Step 5: Implement `client/src/utils/spaceTokens.js`**

```javascript
export const CELESTIAL_PRESET_NAMES = [
  'Asteroid',
  'Moon',
  'Centurian Moon',
  'Planet',
];

export function isCelestialToken(token) {
  if (!token) return false;
  return token.layer === 'celestial' || token.token_type === 'celestial';
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/spaceTokens.test.js"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/test/maps.test.js client/src/utils/spaceTokens.js client/test/spaceTokens.test.js
git commit -m "feat(space): add celestial layer test and spaceTokens utility"
```

---

### Task 2: Space VTT Add Token Modal & Inspector Updates in `SpaceVttView.vue`

**Files:**
- Modify: `client/src/views/SpaceVttView.vue`
- Create: `client/test/SpaceVttCelestialTokens.test.js`

**Interfaces:**
- Consumes:
  - `isCelestialToken`, `CELESTIAL_PRESET_NAMES` from `../utils/spaceTokens.js`
- Produces:
  - Add Token modal with Token Type toggle (`'ship'` vs `'celestial'`).
  - Name preset chips (`Asteroid`, `Moon`, `Centurian Moon`, `Planet`).
  - Dispatches `layer: 'celestial'` on celestial token creation.
  - Streamlined inspector sidebar for celestial tokens hiding speed, rotation, status effects, and ring color.

- [ ] **Step 1: Write failing test in `client/test/SpaceVttCelestialTokens.test.js`**

```javascript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isCelestialToken } from '../src/utils/spaceTokens.js';

describe('SpaceVttView Celestial Tokens Integration', () => {
  const filePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('imports spaceTokens utilities', () => {
    expect(content).toMatch(/import\s*\{[^}]*isCelestialToken[^}]*\}\s*from\s*['"]\.\.\/utils\/spaceTokens(\.js)?['"]/);
  });

  it('contains token_type in newTokenForm or add token state', () => {
    expect(content).toMatch(/token_type:\s*['"](ship|celestial)['"]/);
  });

  it('includes celestial preset buttons or chips in Add Token Modal', () => {
    expect(content).toContain('CELESTIAL_PRESET_NAMES');
  });

  it('sends layer celestial when submitting celestial token', () => {
    const submitSection = content.slice(content.indexOf('async function submitAddToken'));
    expect(submitSection).toMatch(/layer:\s*.*celestial/);
  });

  it('guards speed, rotation, and status effects in sidebar inspector with isCelestialToken', () => {
    const inspectorSection = content.slice(content.indexOf('<!-- Selected Token Inspector -->'), content.indexOf('<!-- Token List When None Selected -->'));
    expect(inspectorSection).toMatch(/isCelestialToken/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttCelestialTokens.test.js"`
Expected: FAIL on import or template assertions.

- [ ] **Step 3: Update `client/src/views/SpaceVttView.vue`**

1. Import `isCelestialToken, CELESTIAL_PRESET_NAMES` from `../utils/spaceTokens.js`.
2. In `newTokenForm` reactive state:
   - Add `token_type: 'ship'` (or `'celestial'`).
3. In `openAddTokenModal`:
   - Reset `newTokenForm.token_type = 'ship'`.
4. In Add Token Modal template:
   - Add Token Type selector radio/button group at the top:
     ```html
     <div class="form-group">
       <label>Token Type</label>
       <div class="token-type-toggle">
         <button
           type="button"
           class="type-btn"
           :class="{ active: newTokenForm.token_type === 'ship' }"
           @click="newTokenForm.token_type = 'ship'"
         >
           🚀 Ship / Station
         </button>
         <button
           type="button"
           class="type-btn"
           :class="{ active: newTokenForm.token_type === 'celestial' }"
           @click="newTokenForm.token_type = 'celestial'"
         >
           🪐 Celestial Object
         </button>
       </div>
     </div>
     ```
   - If `newTokenForm.token_type === 'celestial'`:
     - Render quick-preset chips under Name:
       ```html
       <div class="preset-chips">
         <button
           v-for="preset in CELESTIAL_PRESET_NAMES"
           :key="preset"
           type="button"
           class="btn-chip"
           @click="newTokenForm.name = preset"
         >
           {{ preset }}
         </button>
       </div>
       ```
     - Hide "Link to Ship Sheet", "Ring Color", "Initial Speed", "Initial Rotation".
   - If `newTokenForm.token_type === 'ship'`:
     - Render existing ship sheet, ring color, speed, rotation fields as normal.
5. In `submitAddToken`:
   ```javascript
   const isCelestial = newTokenForm.token_type === 'celestial';
   const payload = {
     map_id: activeMap.value.id,
     character_id: isCelestial ? null : (selectedShipId.value || null),
     name: newTokenForm.name,
     color: isCelestial ? '' : newTokenForm.color,
     avatar_url: newTokenForm.avatar_url,
     x: newTokenForm.x,
     y: newTokenForm.y,
     size: 1,
     rotation: isCelestial ? 0 : (newTokenForm.rotation || 0),
     current_speed: isCelestial ? null : (newTokenForm.current_speed || 0),
     layer: isCelestial ? 'celestial' : 'character',
   };
   ```
6. In Selected Token Inspector template:
   - When `isCelestialToken(selectedToken)`:
     - Show badge: `<div class="celestial-badge">🪐 Celestial Object</div>`
     - Hide `Linked ID`, `Current Speed Control`, `Heading / Rotation Control`, `Tactical Status Effects`, and `Ring Color`.
     - Keep `Name`, `Hex Position: (x, y)`, and `Delete Token` button.
7. Add CSS classes for `.token-type-toggle`, `.type-btn`, `.preset-chips`, `.btn-chip`, and `.celestial-badge`.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttCelestialTokens.test.js"`
Expected: PASS

- [ ] **Step 5: Verify client build compiles cleanly**

Run: `docker exec sf-vtt-dev bash -c "cd client && npm run build"`
Expected: PASS with 0 build errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/views/SpaceVttView.vue client/test/SpaceVttCelestialTokens.test.js
git commit -m "feat(space): add celestial token type selector and inspector in SpaceVttView"
```

---

### Task 3: Space VTT Canvas Rendering for Celestial Tokens & Tests

**Files:**
- Modify: `client/src/components/SpaceVttCanvas.vue`
- Create: `client/test/SpaceVttCanvasCelestial.test.js`

**Interfaces:**
- Consumes:
  - `isCelestialToken` from `../utils/spaceTokens.js`
- Produces:
  - `renderSingleToken(ctx, token, q, r, isSelected)`:
    - Suppresses ring border for celestial tokens (`!isCelestial`).
    - Suppresses speed badge for celestial tokens (`!isCelestial`).
    - Suppresses status effect icons for celestial tokens (`!isCelestial`).
    - Suppresses rotation (`rotation = isCelestial ? 0 : (token.rotation || 0)`).
    - Preserves selection halo for celestial tokens when `isSelected === true`.
    - Preserves circular image clipping for avatar image.

- [ ] **Step 1: Write failing tests in `client/test/SpaceVttCanvasCelestial.test.js`**

```javascript
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SpaceVttCanvas Celestial Token Rendering', () => {
  const filePath = path.resolve(__dirname, '../src/components/SpaceVttCanvas.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('imports isCelestialToken in SpaceVttCanvas', () => {
    expect(content).toMatch(/import\s*\{[^}]*isCelestialToken[^}]*\}\s*from\s*['"]\.\.\/utils\/spaceTokens(\.js)?['"]/);
  });

  it('checks isCelestialToken in renderSingleToken', () => {
    const renderSection = content.slice(content.indexOf('function renderSingleToken'));
    expect(renderSection).toMatch(/const\s+isCelestial\s*=\s*isCelestialToken\(token\)/);
  });

  it('guards ring border with !isCelestial', () => {
    const renderSection = content.slice(content.indexOf('function renderSingleToken'));
    expect(renderSection).toMatch(/if\s*\(!isCelestial\)\s*\{[^}]*token\.color/);
  });

  it('guards speed badge with !isCelestial', () => {
    const renderSection = content.slice(content.indexOf('function renderSingleToken'));
    expect(renderSection).toMatch(/!isCelestial\s*&&\s*speed\s*!==\s*null/);
  });

  it('guards status effects with !isCelestial', () => {
    const renderSection = content.slice(content.indexOf('function renderSingleToken'));
    expect(renderSection).toMatch(/!isCelestial\s*&&\s*statusEffects\.length\s*>\s*0/);
  });

  it('resets rotation to 0 for celestial tokens', () => {
    const renderSection = content.slice(content.indexOf('function renderSingleToken'));
    expect(renderSection).toMatch(/isCelestial\s*\?\s*0\s*:\s*\(token\.rotation\s*\|\|\s*0\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttCanvasCelestial.test.js"`
Expected: FAIL on canvas rendering checks.

- [ ] **Step 3: Update `client/src/components/SpaceVttCanvas.vue`**

1. Import `isCelestialToken` from `../utils/spaceTokens.js`.
2. In `renderSingleToken(ctx, token, q, r, isSelected)`:
   ```javascript
   const isCelestial = isCelestialToken(token);
   ```
3. Update rotation:
   ```javascript
   const rotation = isCelestial ? 0 : (token.rotation || 0);
   ```
4. Update colored ring border:
   ```javascript
   if (!isCelestial) {
     ctx.beginPath();
     ctx.arc(0, 0, size, 0, Math.PI * 2);
     ctx.strokeStyle = token.color || '#666666';
     ctx.lineWidth = 3.5;
     ctx.stroke();
   }
   ```
5. Update speed badge:
   ```javascript
   const speed = token.current_speed ?? token.speed;
   if (!isCelestial && speed !== null && speed !== undefined) {
     // render speed badge
   }
   ```
6. Update status icons:
   ```javascript
   if (!isCelestial && statusEffects.length > 0) {
     // render status icons
   }
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttCanvasCelestial.test.js"`
Expected: PASS

- [ ] **Step 5: Run full test suites and build inside container**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: ALL test suites PASS and client build succeeds.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/SpaceVttCanvas.vue client/test/SpaceVttCanvasCelestial.test.js
git commit -m "feat(space): suppress ring, speed, rotation, and status effects for celestial tokens on canvas"
```

# RPG VTT Token Damage & Wounded Red Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a transparent bright red damage overlay on RPG VTT tokens that fades from the bottom up when an adversary/NPC is below 50% STA or when a PC is marked Wounded, fades further up when below 20% STA, and covers the entire token when dead (0 STA).

**Architecture:** Extract pure state calculation (`getTokenDamageOverlayState`) and canvas drawing (`drawTokenDamageOverlay`) into `client/src/utils/tokenDamageOverlay.js`, then call them inside `renderSingleToken` in `client/src/components/VttCanvas.vue` immediately after rendering the token avatar/initials and before drawing the outer colored border ring and status icons.

**Tech Stack:** Vue 3, HTML5 Canvas 2D API, Vitest.

## Global Constraints

- All tests must be executed inside the running Docker container `sf-vtt-dev` using `docker exec sf-vtt-dev bash -c "cd client && npx vitest run ..."`.
- Thresholds for STA (`current_hp / max_hp` when `max_hp > 0` and `current_hp` is numeric):
  - `current_hp <= 0` → `'dead'` (covers entire token in transparent red)
  - `current_hp > 0 && current_hp / max_hp < 0.20` → `'critical'` (fades from bottom further up to `cy - radius * 0.65`)
  - `current_hp / max_hp >= 0.20 && current_hp / max_hp < 0.50` → `'bloodied'` (fades from bottom up to `cy - radius * 0.10`)
- Wounded status (`status_effects` or `conditions` containing `'wounded'`, `'Wounded'`, or `'🩸'`) on a PC token (or any non-vehicle token not already `'dead'` or `'critical'`) produces `'bloodied'`.
- Vehicle tokens (`Boolean(token.vehicle_data)`) must return `null`.

---

### Task 1: Token Damage Overlay Utility & VttCanvas Integration

**Files:**
- Create: `client/src/utils/tokenDamageOverlay.js`
- Modify: `client/src/components/VttCanvas.vue:16-19,420-435`
- Create: `client/test/tokenDamageOverlay.test.js`

**Interfaces:**
- Produces:
  - `getTokenDamageOverlayState(token)` in `client/src/utils/tokenDamageOverlay.js` -> `'dead' | 'critical' | 'bloodied' | null`
  - `drawTokenDamageOverlay(ctx, state, cx, cy, radius)` in `client/src/utils/tokenDamageOverlay.js`

- [ ] **Step 1: Write the failing unit tests in `client/test/tokenDamageOverlay.test.js`**

```javascript
import { describe, it, expect, vi } from 'vitest';
import { getTokenDamageOverlayState, drawTokenDamageOverlay } from '../src/utils/tokenDamageOverlay.js';

describe('Token Damage & Wounded Red Overlay', () => {
  describe('getTokenDamageOverlayState', () => {
    it('returns null for null/undefined or vehicle tokens', () => {
      expect(getTokenDamageOverlayState(null)).toBeNull();
      expect(
        getTokenDamageOverlayState({
          current_hp: 5,
          max_hp: 50,
          vehicle_data: { hull_points: 5 },
        })
      ).toBeNull();
    });

    it('returns null when adversary STA is 50% or higher and not wounded', () => {
      expect(getTokenDamageOverlayState({ current_hp: 50, max_hp: 50 })).toBeNull();
      expect(getTokenDamageOverlayState({ current_hp: 25, max_hp: 50 })).toBeNull();
    });

    it('returns "bloodied" when adversary STA is strictly less than 50% and at least 20%', () => {
      expect(getTokenDamageOverlayState({ current_hp: 24, max_hp: 50 })).toBe('bloodied');
      expect(getTokenDamageOverlayState({ current_hp: 10, max_hp: 50 })).toBe('bloodied');
    });

    it('returns "critical" when adversary STA is strictly less than 20% and greater than 0', () => {
      expect(getTokenDamageOverlayState({ current_hp: 9, max_hp: 50 })).toBe('critical');
      expect(getTokenDamageOverlayState({ current_hp: 1, max_hp: 50 })).toBe('critical');
    });

    it('returns "dead" when adversary STA is 0 or negative', () => {
      expect(getTokenDamageOverlayState({ current_hp: 0, max_hp: 50 })).toBe('dead');
      expect(getTokenDamageOverlayState({ current_hp: -5, max_hp: 50 })).toBe('dead');
    });

    it('returns "bloodied" for PC tokens marked wounded in status_effects or conditions', () => {
      expect(
        getTokenDamageOverlayState({
          name: 'Captain Carter',
          character_id: 1,
          status_effects: ['wounded'],
        })
      ).toBe('bloodied');

      expect(
        getTokenDamageOverlayState({
          name: 'Dralasite Medic',
          status_effects: ['🩸'],
        })
      ).toBe('bloodied');

      expect(
        getTokenDamageOverlayState({
          name: 'NPC Ally',
          conditions: ['Wounded'],
        })
      ).toBe('bloodied');
    });

    it('prioritizes "dead" and "critical" over "wounded" status when STA is below 20% or 0', () => {
      expect(
        getTokenDamageOverlayState({
          current_hp: 5,
          max_hp: 50,
          status_effects: ['wounded'],
          conditions: ['Wounded'],
        })
      ).toBe('critical');

      expect(
        getTokenDamageOverlayState({
          current_hp: 0,
          max_hp: 50,
          status_effects: ['wounded'],
        })
      ).toBe('dead');
    });
  });

  describe('drawTokenDamageOverlay', () => {
    function createMockCtx() {
      const stops = [];
      const gradientMock = {
        addColorStop: vi.fn((offset, color) => stops.push({ offset, color })),
      };
      return {
        stops,
        gradientMock,
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        clip: vi.fn(),
        fill: vi.fn(),
        createLinearGradient: vi.fn(() => gradientMock),
        fillStyle: null,
      };
    }

    it('draws full transparent red circle when state is "dead"', () => {
      const ctx = createMockCtx();
      drawTokenDamageOverlay(ctx, 'dead', 100, 100, 20);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalledWith(100, 100, 20, 0, Math.PI * 2);
      expect(ctx.fillStyle).toBe('rgba(230, 15, 15, 0.62)');
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('draws bottom-up linear gradient to mid-token when state is "bloodied"', () => {
      const ctx = createMockCtx();
      drawTokenDamageOverlay(ctx, 'bloodied', 100, 100, 20);

      // bottomY = 120, endY = 100 - 20 * 0.10 = 98
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(100, 120, 100, 98);
      expect(ctx.stops[0].offset).toBe(0);
      expect(ctx.stops[ctx.stops.length - 1]).toEqual({ offset: 1, color: 'rgba(255, 25, 25, 0)' });
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('draws higher bottom-up linear gradient when state is "critical"', () => {
      const ctx = createMockCtx();
      drawTokenDamageOverlay(ctx, 'critical', 100, 100, 20);

      // bottomY = 120, endY = 100 - 20 * 0.65 = 87
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(100, 120, 100, 87);
      expect(ctx.stops[0].offset).toBe(0);
      expect(ctx.stops[ctx.stops.length - 1]).toEqual({ offset: 1, color: 'rgba(255, 20, 20, 0)' });
      expect(ctx.fill).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/tokenDamageOverlay.test.js"`
Expected: FAIL (`Cannot find module '../src/utils/tokenDamageOverlay.js'`).

- [ ] **Step 3: Implement `client/src/utils/tokenDamageOverlay.js` and wire into `client/src/components/VttCanvas.vue`**

1. Create `client/src/utils/tokenDamageOverlay.js`:
```javascript
/**
 * Determines the damage/wound red overlay tier for an RPG VTT token.
 *
 * @param {Object} token
 * @returns {'dead' | 'critical' | 'bloodied' | null}
 */
export function getTokenDamageOverlayState(token) {
  if (!token || token.vehicle_data) return null;

  const hasMaxHp =
    token.max_hp !== null &&
    token.max_hp !== undefined &&
    token.max_hp !== '' &&
    Number(token.max_hp) > 0;
  const hasCurHp =
    token.current_hp !== null &&
    token.current_hp !== undefined &&
    token.current_hp !== '';

  if (hasMaxHp && hasCurHp) {
    const cur = Number(token.current_hp);
    const max = Number(token.max_hp);
    if (Number.isFinite(cur) && Number.isFinite(max) && max > 0) {
      if (cur <= 0) return 'dead';
      const ratio = cur / max;
      if (ratio < 0.2) return 'critical';
      if (ratio < 0.5) return 'bloodied';
    }
  }

  const isWoundedEntry = (val) => {
    if (typeof val !== 'string') return false;
    const lower = val.trim().toLowerCase();
    return lower === 'wounded' || lower === '🩸';
  };

  const statusEffects = Array.isArray(token.status_effects) ? token.status_effects : [];
  const conditions = Array.isArray(token.conditions) ? token.conditions : [];

  if (statusEffects.some(isWoundedEntry) || conditions.some(isWoundedEntry)) {
    return 'bloodied';
  }

  return null;
}

/**
 * Renders the red damage/wound overlay inside the token's circular bounds.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {'dead' | 'critical' | 'bloodied' | null} state
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 */
export function drawTokenDamageOverlay(ctx, state, cx, cy, radius) {
  if (!ctx || !state) return;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const bottomY = cy + radius;

  if (state === 'dead') {
    ctx.fillStyle = 'rgba(230, 15, 15, 0.62)';
    ctx.fill();
  } else if (state === 'critical') {
    const endY = cy - radius * 0.65;
    const grad = ctx.createLinearGradient(cx, bottomY, cx, endY);
    grad.addColorStop(0, 'rgba(255, 20, 20, 0.78)');
    grad.addColorStop(0.7, 'rgba(255, 20, 20, 0.42)');
    grad.addColorStop(1, 'rgba(255, 20, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  } else if (state === 'bloodied') {
    const endY = cy - radius * 0.1;
    const grad = ctx.createLinearGradient(cx, bottomY, cx, endY);
    grad.addColorStop(0, 'rgba(255, 25, 25, 0.68)');
    grad.addColorStop(0.6, 'rgba(255, 25, 25, 0.30)');
    grad.addColorStop(1, 'rgba(255, 25, 25, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  ctx.restore();
}
```

2. Modify `client/src/components/VttCanvas.vue`:
- Import `getTokenDamageOverlayState, drawTokenDamageOverlay` from `../utils/tokenDamageOverlay.js`.
- In `renderSingleToken(ctx, token, cellX, cellY, gSize, isSelected)` (right after the `if (token.avatar_url) { ... } else { drawInitials(...); }` block and before `// Token Colored Ring Border`):
```javascript
  // Damage / Wounded Red Overlay
  const damageOverlayState = getTokenDamageOverlayState(token);
  if (damageOverlayState) {
    drawTokenDamageOverlay(ctx, damageOverlayState, cx, cy, radius);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/tokenDamageOverlay.test.js"`
Expected: PASS (all 9 tests passing).

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/tokenDamageOverlay.js client/src/components/VttCanvas.vue client/test/tokenDamageOverlay.test.js
git commit -m "feat(vtt): add transparent red damage and wounded overlays on RPG tokens"
```

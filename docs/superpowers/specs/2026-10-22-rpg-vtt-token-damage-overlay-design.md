# RPG VTT Token Damage & Wounded Red Overlay Design

**Date:** 2026-10-22
**Status:** Approved

## 1. Overview & Goals
On the RPG VTT tactical canvas (`client/src/components/VttCanvas.vue`), GameMasters and Players need immediate visual feedback on token health and wound status directly on the tokens:
1. **Adversary / NPC Tokens (tracked via `current_hp` and `max_hp`):**
   - **< 50% STA (`bloodied`):** Transparent bright red overlay that fades from the bottom up to roughly the middle of the token.
   - **< 20% STA (`critical`):** Transparent bright red overlay that fades from the bottom further up the token (~80% height).
   - **0 STA (`dead`):** Transparent bright red overlay covering the entire token circle.
2. **PC / Character Tokens (or tokens marked Wounded):**
   - When marked **Wounded** (`status_effects` or `conditions` includes `'wounded'`, `'Wounded'`, or `'🩸'`), render the same bottom-up transparent bright red fade as the `< 50% STA` (`bloodied`) state (unless the token already qualifies for `critical` or `dead` via STA).

---

## 2. Architecture & Component Design

### 2.1 Damage Overlay Utility (`client/src/utils/tokenDamageOverlay.js`)
Create a focused, pure helper module `client/src/utils/tokenDamageOverlay.js` exported for use in `VttCanvas.vue` and unit tests:

- **`getTokenDamageOverlayState(token)`**:
  - Returns `'dead' | 'critical' | 'bloodied' | null`.
  - If `!token` or `token.vehicle_data` is truthy, returns `null`.
  - Checks if the token has valid numeric `max_hp > 0` and numeric `current_hp !== null && current_hp !== undefined && current_hp !== ''`:
    - Let `cur = Number(token.current_hp)` and `max = Number(token.max_hp)`.
    - If `Number.isFinite(cur)` and `Number.isFinite(max)` and `max > 0`:
      - If `cur <= 0`: return `'dead'`.
      - Let `ratio = cur / max`.
      - If `ratio < 0.20`: return `'critical'`.
      - If `ratio < 0.50`: return `'bloodied'`.
  - Checks if the token is marked wounded in `token.status_effects` or `token.conditions`:
    - If either array contains `'wounded'`, `'Wounded'`, or `'🩸'`, return `'bloodied'`.
  - Otherwise returns `null`.

- **`drawTokenDamageOverlay(ctx, state, cx, cy, radius)`**:
  - If `!state || !ctx`, does nothing.
  - Saves canvas context (`ctx.save()`), begins a circular path `ctx.arc(cx, cy, radius, 0, Math.PI * 2)`, and clips (`ctx.clip()`).
  - Let `bottomY = cy + radius`.
  - If `state === 'dead'`:
    - Fills the entire clipped circle with `'rgba(230, 15, 15, 0.62)'`.
  - If `state === 'critical'` (< 20% STA):
    - Creates a vertical linear gradient from `bottomY` (`cy + radius`) to `cy - radius * 0.65` (82.5% of the way up the token):
      - `0.0`: `'rgba(255, 20, 20, 0.78)'`
      - `0.7`: `'rgba(255, 20, 20, 0.42)'`
      - `1.0`: `'rgba(255, 20, 20, 0.0)'`
    - Fills the clipped circle with the gradient.
  - If `state === 'bloodied'` (< 50% STA or Wounded PC):
    - Creates a vertical linear gradient from `bottomY` (`cy + radius`) to `cy - radius * 0.10` (55% of the way up the token):
      - `0.0`: `'rgba(255, 25, 25, 0.68)'`
      - `0.6`: `'rgba(255, 25, 25, 0.30)'`
      - `1.0`: `'rgba(255, 25, 25, 0.0)'`
    - Fills the clipped circle with the gradient.
  - Restores canvas context (`ctx.restore()`).

### 2.2 Integration in `client/src/components/VttCanvas.vue`
In `renderSingleToken(ctx, token, cellX, cellY, gSize, isSelected)`:
- Right after drawing the token's avatar image or initials (line 424) and before drawing the `Token Colored Ring Border` (line 426) and `Status Icons` (line 434):
  ```javascript
  const damageOverlayState = getTokenDamageOverlayState(token);
  if (damageOverlayState) {
    drawTokenDamageOverlay(ctx, damageOverlayState, cx, cy, radius);
  }
  ```
- This ensures the red overlay sits directly over the token artwork/initials, while the token's colored ring and status icons (`⚡`, `💀`, `🩸`) remain crisp on top.

---

## 3. Testing Strategy
- **Unit Tests (`client/test/tokenDamageOverlay.test.js`):**
  - Verify `getTokenDamageOverlayState` returns `null` for healthy adversary (`current_hp: 30, max_hp: 50`, 60%), `null` at exact 50% (`25/50`), `'bloodied'` below 50% (`24/50`), `'bloodied'` at exact 20% (`10/50`), `'critical'` below 20% (`9/50`), and `'dead'` at `0/50` or negative HP.
  - Verify PC token (no `max_hp` or full HP) with `status_effects: ['wounded']` or `conditions: ['Wounded']` returns `'bloodied'`.
  - Verify an adversary with `< 20%` HP or `0` HP who also has `'Wounded'` still returns `'critical'` or `'dead'` (severity precedence).
  - Verify vehicle tokens (`vehicle_data: { ... }`) return `null`.
  - Verify `drawTokenDamageOverlay` invokes canvas gradient stops and fills appropriately for `'bloodied'`, `'critical'`, and `'dead'`.

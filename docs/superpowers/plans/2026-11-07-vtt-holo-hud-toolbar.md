# VTT Holo-HUD Translucent Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the floating toolbars on both RPG and Space Tactical VTTs into a translucent, sci-fi "Holo-HUD Glass" design.

**Architecture:** Update CSS definitions in `RpgVttView.vue` and `SpaceVttView.vue` scoped styles for `.vtt-toolbar`, `.vtt-toolbar button`, `.toolbar-divider`, and `.btn-clear-ping`, and add automated style validation in `VttToolbarIcons.test.js`.

**Tech Stack:** Vue 3, CSS (scoped, backdrop-filter, linear-gradient), Vitest.

## Global Constraints
- Preserve `z-index: 10` on `.vtt-toolbar` to maintain proper layering below `#dice-box` (z: 200) and HUD banners (z: 250).
- Keep wireframe SVG icons intact with enhanced drop-shadow glow effects.
- Maintain identical visual and functional behavior between `RpgVttView.vue` and `SpaceVttView.vue`.

---

### Task 1: Add Automated Style Tests in `VttToolbarIcons.test.js`

**Files:**
- Modify: `client/test/VttToolbarIcons.test.js`

**Interfaces:**
- Validates `.vtt-toolbar` styling in both `RpgVttView.vue` and `SpaceVttView.vue` for `rgba(5, 18, 24, 0.68)`, `backdrop-filter: blur(12px)`, `rgba(45, 212, 191, 0.35)`, and holographic divider gradient.

- [ ] **Step 1: Write tests in `client/test/VttToolbarIcons.test.js`**
Add assertions for Holo-HUD toolbar styling:
```javascript
describe('Holo-HUD Glass Toolbar Styling', () => {
  it('applies translucent cyan-glass background and backdrop blur to .vtt-toolbar in RpgVttView', () => {
    expect(rpgContent).toMatch(/background:\s*rgba\(5,\s*18,\s*24,\s*0\.68\)/);
    expect(rpgContent).toMatch(/backdrop-filter:\s*blur\(12px\)/);
    expect(rpgContent).toMatch(/border:\s*1px\s+solid\s+rgba\(45,\s*212,\s*191,\s*0\.35\)/);
    expect(rpgContent).toMatch(/linear-gradient\(90deg,\s*transparent,\s*rgba\(45,\s*212,\s*191,\s*0\.45\),\s*transparent\)/);
  });

  it('applies translucent cyan-glass background and backdrop blur to .vtt-toolbar in SpaceVttView', () => {
    expect(spaceContent).toMatch(/background:\s*rgba\(5,\s*18,\s*24,\s*0\.68\)/);
    expect(spaceContent).toMatch(/backdrop-filter:\s*blur\(12px\)/);
    expect(spaceContent).toMatch(/border:\s*1px\s+solid\s+rgba\(45,\s*212,\s*191,\s*0\.35\)/);
    expect(spaceContent).toMatch(/linear-gradient\(90deg,\s*transparent,\s*rgba\(45,\s*212,\s*191,\s*0\.45\),\s*transparent\)/);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**
```bash
cd client && npx vitest run test/VttToolbarIcons.test.js
```
Expected: FAILS on new style assertions.

- [ ] **Step 3: Commit test file**
```bash
git add client/test/VttToolbarIcons.test.js && git commit -m "test(toolbar): add style tests for Holo-HUD glass toolbar"
```

---

### Task 2: Implement Holo-HUD Toolbar Styling in `RpgVttView.vue`

**Files:**
- Modify: `client/src/views/RpgVttView.vue`

- [ ] **Step 1: Update `.vtt-toolbar`, `.vtt-toolbar button`, `.toolbar-divider`, and `.btn-clear-ping` CSS**
In `<style scoped>`:
```css
/* Floating Toolbar */
.vtt-toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(5, 18, 24, 0.68);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 8px;
  border-radius: var(--radius);
  border: 1px solid rgba(45, 212, 191, 0.35);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7), 0 0 15px rgba(20, 184, 166, 0.2);
}

.vtt-toolbar button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.3px;
  border-radius: 4px;
  text-align: left;
  background: rgba(13, 59, 68, 0.25);
  border: 1px solid rgba(45, 212, 191, 0.15);
  color: #99f6e4;
  transition: all 0.15s ease-in-out;
}

.vtt-toolbar button:hover {
  background: rgba(13, 59, 68, 0.55);
  border-color: rgba(45, 212, 191, 0.5);
  color: #ccfbf1;
  box-shadow: 0 0 10px rgba(45, 212, 191, 0.3);
}

.vtt-toolbar > button.active {
  background: rgba(8, 45, 51, 0.85);
  color: #2dd4bf;
  font-weight: 600;
  border: 1px solid #14b8a6;
  box-shadow: 0 0 12px rgba(20, 184, 166, 0.5);
}

.vtt-toolbar > button.active:hover {
  background: rgba(13, 59, 68, 0.95);
  color: #5eead4;
  border-color: #2dd4bf;
  box-shadow: 0 0 16px rgba(45, 212, 191, 0.7);
}

.toolbar-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(45, 212, 191, 0.45), transparent);
  margin: 4px 0;
}

.btn-clear-ping {
  color: #f87171;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.btn-clear-ping:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.6);
  color: #fca5a5;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.35);
}
```

- [ ] **Step 2: Run targeted tests**
```bash
cd client && npx vitest run test/VttToolbarIcons.test.js test/VttDiceLayering.test.js
```
Confirm `RpgVttView` assertion passes.

- [ ] **Step 3: Commit changes**
```bash
git add client/src/views/RpgVttView.vue && git commit -m "style(rpg-vtt): apply holo-hud glass styling to toolbar"
```

---

### Task 3: Implement Holo-HUD Toolbar Styling in `SpaceVttView.vue`

**Files:**
- Modify: `client/src/views/SpaceVttView.vue`

- [ ] **Step 1: Update `.vtt-toolbar`, `.vtt-toolbar button`, `.toolbar-divider`, and `.btn-clear-ping` CSS**
Apply identical styles in `<style scoped>` of `SpaceVttView.vue`.

- [ ] **Step 2: Run targeted tests**
```bash
cd client && npx vitest run test/VttToolbarIcons.test.js test/VttDiceLayering.test.js
```
Confirm all assertions pass for both VTTs.

- [ ] **Step 3: Commit changes**
```bash
git add client/src/views/SpaceVttView.vue && git commit -m "style(space-vtt): apply holo-hud glass styling to toolbar"
```

---

### Task 4: Full Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full Vitest test suite**
```bash
cd client && npx vitest run
```
Confirm all 61 test files and 880+ tests pass with 0 failures.

- [ ] **Step 2: Check git status to ensure working directory is clean**
```bash
git status
```

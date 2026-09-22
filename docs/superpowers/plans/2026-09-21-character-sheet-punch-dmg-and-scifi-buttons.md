# Character Sheet Punch Dmg Removal & Sci-Fi Button Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the inaccurate "Punch Dmg: Xd6" display from the Character Sheet tactical bar, and style all application buttons with a futuristic sci-fi terminal aesthetic (glows, deep blues, aquas, cyans, and emerald greens).

**Architecture:**
1. Update `client/src/views/CharacterSheetsView.vue` to remove the punch damage display and balance the remaining tactical stats grid.
2. Update `client/src/main.css` to add sci-fi color/glow CSS variables and upgrade all base and primary buttons with cyan/aqua/blue gradients and neon drop-shadows.
3. Update local button classes in `CharacterSheetsView.vue` (`.btn-primary`, `.btn-secondary`, `.btn-xp-upgrade`, `.btn-shift`, `.btn-delete-small`) to harmoniously match the sci-fi terminal aesthetic.

**Tech Stack:** Vue 3, CSS3 gradients & box-shadows, Vitest.

## Global Constraints
- Run all test and build commands in the container: `docker exec sf-vtt-dev bash -c "<command>"`
- Keep styling cohesive with the dark theme design system (`--bg-primary`, `--bg-secondary`, `--border`, `--radius`).

---

### Task 1: Remove Punch Damage from Character Sheet

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue:87-90, 511, 561-564, 1148-1155`

- [ ] **Step 1: Remove Punch Dmg markup and adjust grid**
  - Delete lines 87-90 (`<div class="tactical-stat"><span class="tactical-label">Punch Dmg</span>...</div>`).
  - Update `.tactical-bar` grid template from `repeat(4, 1fr) 2fr` to `repeat(3, 1fr) 2fr`.
  - Remove unused `derivedPunchDmg` computed property and unused `calcPunchDamage` import.

- [ ] **Step 2: Run tests & build**
  - Run `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
  - Verify 0 errors.

- [ ] **Step 3: Commit**
  - `git add client/src/views/CharacterSheetsView.vue`
  - `git commit -m "fix: remove inaccurate punch damage from character sheet tactical bar"`

---

### Task 2: Implement Sci-Fi Terminal Button Styling

**Files:**
- Modify: `client/src/main.css:1-65`
- Modify: `client/src/views/CharacterSheetsView.vue` button styles

- [ ] **Step 1: Add sci-fi CSS variables and update global button styles in main.css**
  - Define `--sci-blue`, `--sci-cyan`, `--sci-aqua`, `--sci-green`, `--glow-cyan`, `--glow-cyan-hover`, `--glow-green`.
  - Style standard `button` with cyan-tinted slate background, sleek border, and soft cyan hover glow.
  - Style `button.primary` / `.btn-primary` with vibrant aqua/cyan gradient and glowing box-shadow.
  - Style active/toggle states with crisp cyan outlines and neon glows.

- [ ] **Step 2: Enhance CharacterSheetsView button styles**
  - Update `.btn-primary`, `.btn-secondary`, `.btn-xp-upgrade`, `.btn-shift` with cyan/aqua/emerald sci-fi glow styling.

- [ ] **Step 3: Run tests & build**
  - Run `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
  - Verify clean build and passing tests.

- [ ] **Step 4: Commit**
  - `git add client/src/main.css client/src/views/CharacterSheetsView.vue`
  - `git commit -m "style: apply futuristic sci-fi glowing button theme with blues, cyans, and aquas"`

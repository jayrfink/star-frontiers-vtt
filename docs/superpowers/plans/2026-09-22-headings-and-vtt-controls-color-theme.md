# Headings and VTT Controls Color Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update heading font colors matching "Ship Sheets" and "Hull Points (HP)" to `#3a859c`, set VTT active control button highlight to `#3a859c` (leaving unhighlighted buttons unchanged), and set Map Manager button background to `#3a9c83`.

**Architecture:** Update `--accent` in `client/src/main.css` to `#3a859c` to propagate across all accent headings and active states. Replace hardcoded `#58a6ff` heading and badge text colors in `ShipSheetsView.vue` and `CharacterSheetsView.vue` with `#3a859c`. Update `.vtt-toolbar button.active` to use `#3a859c` and `.btn-gm` to use `#3a9c83` in both `RpgVttView.vue` and `SpaceVttView.vue`.

**Tech Stack:** Vue 3, CSS Variables, Vite, Vitest.

## Global Constraints

- Run all testing and verification commands inside the container: `docker exec sf-vtt-dev bash -c "<command>"`
- The heading color must be `#3a859c`.
- The active VTT control toolbar button highlight color must be `#3a859c`.
- Unhighlighted buttons in `.vtt-toolbar` must remain in their neutral dark state (`var(--bg-secondary)` / `var(--border)`).
- The Map Manager buttons (`.btn-gm`) must have background color `#3a9c83`.

---

### Task 1: Update Global Theme Accent & Sheet Headings

**Files:**
- Modify: `client/src/main.css:7`
- Modify: `client/src/views/ShipSheetsView.vue:722-1264`
- Modify: `client/src/views/CharacterSheetsView.vue:975-1681`

**Interfaces:**
- Consumes: CSS variables in `client/src/main.css`
- Produces: Updated CSS colors across sheets and global `--accent`

- [ ] **Step 1: Update global accent in `client/src/main.css`**
In `client/src/main.css`, update `--accent`:
```css
  --accent: #3a859c;
  --accent-hover: #4ea2bb;
```

- [ ] **Step 2: Update heading and label colors in `client/src/views/ShipSheetsView.vue`**
Replace occurrences of `#58a6ff` with `#3a859c` in the `<style>` block:
- Line ~722: `.sidebar-header h3 { color: #3a859c; }`
- Line ~757: `.ship-list li.active { border-left: 4px solid #3a859c; }`
- Line ~855: `.input-type-select { color: #3a859c; }`
- Line ~870: `.hull-header h4 { color: #3a859c; }`
- Line ~934: `.stats-section h4 { color: #3a859c; }`
- Line ~972: `.stat-input { color: #3a859c; }`
- Line ~993: `.list-header h4 { color: #3a859c; }`
- Line ~1262: `.modal-card h3 { color: #3a859c; }`

- [ ] **Step 3: Update heading and label colors in `client/src/views/CharacterSheetsView.vue`**
Replace occurrences of `#58a6ff` with `#3a859c` in the `<style>` block:
- Line ~975: `.sidebar-header h3 { color: #3a859c; }`
- Line ~1010: `.character-list li.active { border-left: 4px solid #3a859c; }`
- Line ~1120: `.select-race, .select-psa { color: #3a859c; }`
- Line ~1128: `.race-ability-banner { border-left: 3px solid #3a859c; }`
- Line ~1163: `.tactical-value { color: #3a859c; }`
- Line ~1203: `.stamina-header h4 { color: #3a859c; }`
- Line ~1273: `.stats-section h4 { color: #3a859c; }`
- Line ~1326: `.stat-input { color: #3a859c; }`
- Line ~1360: `.racial-panel h4 { color: #3a859c; }`
- Line ~1384: `.list-header h4 { color: #3a859c; }`
- Line ~1588: `.modal-card h3 { color: #3a859c; }`
- Line ~1678-1681: `.eq-tag { background: rgba(58, 133, 156, 0.15); color: #3a859c; }`

- [ ] **Step 4: Verify client builds and tests pass**
Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: All tests pass and build succeeds.

- [ ] **Step 5: Commit changes**
```bash
git add client/src/main.css client/src/views/ShipSheetsView.vue client/src/views/CharacterSheetsView.vue
git commit -m "style: update heading font colors to #3a859c across ship and character sheets"
```

---

### Task 2: Update VTT Controls Active Highlight & Map Manager Buttons

**Files:**
- Modify: `client/src/views/RpgVttView.vue:1141-1191`
- Modify: `client/src/views/SpaceVttView.vue:1208-1258`

**Interfaces:**
- Consumes: `.vtt-toolbar`, `.btn-gm` classes
- Produces: Updated styles for active tool highlighting and GM Map Manager buttons

- [ ] **Step 1: Update `.btn-gm` and `.vtt-toolbar button.active` in `client/src/views/RpgVttView.vue`**
Update `.btn-gm`:
```css
.btn-gm {
  background: #3a9c83;
  border-color: #3a9c83;
  color: #fff;
}

.btn-gm:hover {
  background: #45b497;
  border-color: #45b497;
}
```
Update `.vtt-toolbar button.active`:
```css
.vtt-toolbar button.active {
  background: #3a859c;
  color: #ffffff;
  font-weight: 600;
  border-color: #3a859c;
  box-shadow: 0 0 8px rgba(58, 133, 156, 0.4);
}
```

- [ ] **Step 2: Update `.btn-gm` and `.vtt-toolbar button.active` in `client/src/views/SpaceVttView.vue`**
Update `.btn-gm`:
```css
.btn-gm {
  background: #3a9c83;
  border-color: #3a9c83;
  color: #fff;
}

.btn-gm:hover {
  background: #45b497;
  border-color: #45b497;
}
```
Update `.vtt-toolbar button.active`:
```css
.vtt-toolbar button.active {
  background: #3a859c;
  color: #ffffff;
  font-weight: 600;
  border-color: #3a859c;
  box-shadow: 0 0 8px rgba(58, 133, 156, 0.4);
}
```

- [ ] **Step 3: Verify client builds and tests pass**
Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: All tests pass and build succeeds.

- [ ] **Step 4: Commit changes**
```bash
git add client/src/views/RpgVttView.vue client/src/views/SpaceVttView.vue
git commit -m "style: set active VTT controls highlight to #3a859c and map manager buttons to #3a9c83"
```

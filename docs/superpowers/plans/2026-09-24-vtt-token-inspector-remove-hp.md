# Remove HP Tracking from VTT Token Inspectors & Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Hit Points / Hull Points tracking, inputs, and modifier buttons from the Token Inspector drawers, Add Token modals, and canvas floating HP bars on both RPG VTT and Space VTT, maintaining Character Sheets and Ship Sheets as the single source of truth.

**Architecture:** Update Vue template and script in `SpaceVttView.vue` and `RpgVttView.vue` to remove the `.hp-section` and Add Token modal HP inputs, and remove the floating HP bar rendering from `SpaceVttCanvas.vue` and `VttCanvas.vue`. Leave backend REST APIs and database schema backward-compatible.

**Tech Stack:** Vue 3, HTML5 Canvas 2D, Vite, Vitest.

## Global Constraints

- Run all testing and build commands inside the container: `docker exec sf-vtt-dev bash -c "<command>"`
- Keep Speed controls, Heading / Rotation controls, Status Effects toggles, Ring Color picker, and Delete Token button intact in Space VTT.
- Keep Status Effects toggles, Ring Color picker, Size dropdown, and Delete Token button intact in RPG VTT.
- Character Sheets and Ship Sheets remain untouched and the sole source of truth for HP/Hull.
- Server API and database schema remain fully backward-compatible.

---

### Task 1: Remove HP Tracking from Space VTT & Canvas

**Files:**
- Modify: `client/src/views/SpaceVttView.vue`
- Modify: `client/src/components/SpaceVttCanvas.vue`

**Interfaces:**
- Consumes: Token data objects from `/api/tokens`
- Produces: Token Inspector drawer and Add Token modal without HP inputs or adjustment buttons, and canvas rendering without floating HP bars.

- [ ] **Step 1: Update `SpaceVttCanvas.vue` to remove the floating HP bar drawing**

In `client/src/components/SpaceVttCanvas.vue`, locate lines 334-358:
```javascript
  // Draw Floating HP Bar
  if (token.max_hp !== null && token.max_hp !== undefined && token.max_hp > 0) {
    const currentHp = Math.max(0, token.current_hp ?? token.max_hp);
    const hpRatio = Math.max(0, Math.min(1, currentHp / token.max_hp));
    const barW = size * 1.5;
    const barH = 5;
    const barX = cx - barW / 2;
    const barY = cy + size + 2;

    // HP background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(barX, barY, barW, barH);

    // HP fill color
    let hpColor = '#3fb950'; // Green
    if (hpRatio < 0.25) hpColor = '#f85149'; // Red
    else if (hpRatio < 0.5) hpColor = '#e3b341'; // Yellow

    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
  }
```
Remove this entire block.

- [ ] **Step 2: Update `SpaceVttView.vue` template**

1. In Token Inspector drawer (lines ~362-386), remove `.hp-section`:
```html
            <!-- Hull Points (HP) Adjuster -->
            <div class="hp-section">
              <label>Hull Points (HP):</label>
              <div class="hp-inputs">
                <input
                  type="number"
                  v-model.number="selectedTokenForm.current_hp"
                  placeholder="Current"
                  @change="updateSelectedToken"
                />
                <span>/</span>
                <input
                  type="number"
                  v-model.number="selectedTokenForm.max_hp"
                  placeholder="Max"
                  @change="updateSelectedToken"
                />
              </div>
              <div class="hp-quick-buttons">
                <button @click="adjustSelectedHp(-5)">-5</button>
                <button @click="adjustSelectedHp(-1)">-1</button>
                <button @click="adjustSelectedHp(1)">+1</button>
                <button @click="adjustSelectedHp(5)">+5</button>
              </div>
            </div>
```
2. In Add Token modal (lines ~596-599), remove the Hull Points form group:
```html
          <div class="form-group">
            <label>Hull Points (HP):</label>
            <input type="number" v-model.number="newTokenForm.current_hp" placeholder="15" />
          </div>
```

- [ ] **Step 3: Update `SpaceVttView.vue` script**

1. Remove `adjustSelectedHp()` function.
2. Remove `current_hp` and `max_hp` properties from `selectedTokenForm` and `newTokenForm` state initializations and resets.
3. In `spawnCounter(preset)`, remove `newTokenForm.current_hp = preset.hp;`.
4. In `openAddTokenModal()`, remove `newTokenForm.current_hp = 15;`.
5. In token selection watcher / click handler, remove `selectedTokenForm.current_hp` assignment.
6. In `updateSelectedToken()`, remove `current_hp: selectedTokenForm.current_hp` from payload.

- [ ] **Step 4: Verify tests and build pass**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: All tests pass, build succeeds with 0 errors.

- [ ] **Step 5: Commit changes**

```bash
git add client/src/views/SpaceVttView.vue client/src/components/SpaceVttCanvas.vue
git commit -m "feat(space-vtt): remove HP tracking from token inspector and canvas"
```

---

### Task 2: Remove HP Tracking from RPG VTT & Canvas

**Files:**
- Modify: `client/src/views/RpgVttView.vue`
- Modify: `client/src/components/VttCanvas.vue`

**Interfaces:**
- Consumes: Token data objects from `/api/tokens`
- Produces: Token Inspector drawer and Add Token modal without HP inputs or adjustment buttons, and canvas rendering without floating HP bars.

- [ ] **Step 1: Update `VttCanvas.vue` to remove the floating HP bar drawing**

In `client/src/components/VttCanvas.vue`, locate lines 367-391:
```javascript
  // Draw Floating HP Bar
  if (token.max_hp !== null && token.max_hp !== undefined && token.max_hp > 0) {
    const currentHp = Math.max(0, token.current_hp ?? token.max_hp);
    const hpRatio = Math.max(0, Math.min(1, currentHp / token.max_hp));
    const barW = size * 1.5;
    const barH = 5;
    const barX = cx - barW / 2;
    const barY = cy + size + 2;

    // HP background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(barX, barY, barW, barH);

    // HP fill color
    let hpColor = '#3fb950'; // Green
    if (hpRatio < 0.25) hpColor = '#f85149'; // Red
    else if (hpRatio < 0.5) hpColor = '#e3b341'; // Yellow

    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
  }
```
Remove this entire block.

- [ ] **Step 2: Update `RpgVttView.vue` template**

1. In Token Inspector drawer (lines ~365-390), remove `.hp-section`:
```html
            <!-- HP Adjuster -->
            <div class="hp-section">
              <label>Hit Points:</label>
              <div class="hp-inputs">
                <input
                  type="number"
                  v-model.number="selectedTokenForm.current_hp"
                  placeholder="Current"
                  @change="updateSelectedToken"
                />
                <span>/</span>
                <input
                  type="number"
                  v-model.number="selectedTokenForm.max_hp"
                  placeholder="Max"
                  @change="updateSelectedToken"
                />
              </div>
              <div class="hp-quick-buttons">
                <button @click="adjustSelectedHp(-5)">-5</button>
                <button @click="adjustSelectedHp(-1)">-1</button>
                <button @click="adjustSelectedHp(1)">+1</button>
                <button @click="adjustSelectedHp(5)">+5</button>
              </div>
            </div>
```
2. In Add Token modal (lines ~550-555), remove the Hit Points form group:
```html
          <div class="form-group">
            <label>Hit Points:</label>
            <input type="number" v-model.number="newTokenForm.current_hp" placeholder="30" />
          </div>
```

- [ ] **Step 3: Update `RpgVttView.vue` script**

1. Remove `adjustSelectedHp()` function.
2. Remove `current_hp` and `max_hp` properties from `selectedTokenForm` and `newTokenForm` state initializations and resets.
3. In `openAddTokenModal()`, remove `newTokenForm.current_hp = 30;` and character HP lookup.
4. In token selection watcher / click handler, remove `selectedTokenForm.current_hp` assignment.
5. In `updateSelectedToken()`, remove `current_hp: selectedTokenForm.current_hp` from payload.

- [ ] **Step 4: Verify tests and build pass**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: All tests pass, build succeeds with 0 errors.

- [ ] **Step 5: Commit changes**

```bash
git add client/src/views/RpgVttView.vue client/src/components/VttCanvas.vue
git commit -m "feat(rpg-vtt): remove HP tracking from token inspector and canvas"
```

---

### Task 3: Full End-to-End Verification

**Files:**
- All touched files in client

- [ ] **Step 1: Run complete test suite and build in container**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test && cd ../client && npx vitest run && npm run build"`
Expected:
- Server tests: 69/69 passing
- Client tests: 45/45 passing
- Production build: exit 0 with clean bundle

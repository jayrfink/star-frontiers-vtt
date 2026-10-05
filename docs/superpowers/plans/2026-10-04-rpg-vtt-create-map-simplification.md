# RPG VTT Create Tactical Map Modal Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove "Set as Active Map immediately" checkbox from the Create New Tactical Map modal in RPG VTT, ensuring newly created maps are added to the drawer list without automatic activation.

**Architecture:** Client-only modification strictly isolated to `RpgVttView.vue` and its unit tests. In `RpgVttView.vue`, remove the checkbox markup from the Create New Map modal, remove `is_active` from `newMapForm`, and update `submitCreateMap()` to refresh the map list without auto-activating.

**Tech Stack:** Vue 3 Composition API, Vite, Vitest, Node.js / Express.

## Global Constraints

- Space VTT (`client/src/views/SpaceVttView.vue`) must NOT be modified.
- Backend API endpoints and database schema must NOT be modified.
- All container commands must run via `docker exec sf-vtt-dev bash -c "<command>"`.
- Client test command: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/RpgVttMapBrowser.test.js"`.
- Full verification command: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`.

---

### Task 1: RPG VTT: Remove Immediate Activation from Create Map Modal & Logic

**Files:**
- Modify: `client/src/views/RpgVttView.vue`
- Test: `client/test/RpgVttMapBrowser.test.js`

**Interfaces:**
- Consumes: `RpgVttView.vue` Create New Map modal (`showCreateMapModal`), `newMapForm`, `openCreateMapModal()`, `submitCreateMap()`.
- Produces: Simplified modal without `is_active` checkbox; non-auto-activating `submitCreateMap()`.

- [ ] **Step 1: Write failing tests in `client/test/RpgVttMapBrowser.test.js`**

Add tests to assert that:
1. The Create New Map modal slice of `RpgVttView.vue` does not contain the "Set as Active Map immediately" checkbox or label or `newMapForm.is_active`.
2. `openCreateMapModal` does not assign `newMapForm.is_active`.
3. `submitCreateMap` does not call `activateMap` when creating a new map.

Add to `client/test/RpgVttMapBrowser.test.js`:
```javascript
  it('does not include Set Active Map checkbox in Create New Map modal', () => {
    const createMapSection = content.slice(content.indexOf('<!-- Modal: Create New Map -->'), content.indexOf('<!-- Modal: Add Token -->'));
    expect(createMapSection).not.toMatch(/Set as Active Map immediately/);
    expect(createMapSection).not.toMatch(/newMapForm\.is_active/);
  });

  it('does not initialize is_active in openCreateMapModal', () => {
    const openFnSection = content.slice(content.indexOf('function openCreateMapModal()'), content.indexOf('async function submitCreateMap()'));
    expect(openFnSection).not.toMatch(/newMapForm\.is_active/);
  });

  it('does not auto-activate newly created map in submitCreateMap', () => {
    const submitMapSection = content.slice(content.indexOf('async function submitCreateMap()'), content.indexOf('function openAddTokenModal()'));
    expect(submitMapSection).not.toMatch(/activateMap\(created\.id\)/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/RpgVttMapBrowser.test.js"
```
Expected: FAIL due to existing checkbox, `newMapForm.is_active`, and `activateMap(created.id)` in `RpgVttView.vue`.

- [ ] **Step 3: Modify `client/src/views/RpgVttView.vue`**

1. In the template for `<!-- Modal: Create New Map -->`, remove lines 490-495:
```html
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="newMapForm.is_active" />
              Set as Active Map immediately
            </label>
          </div>
```

2. In the script:
Update `newMapForm` declaration:
```javascript
const newMapForm = reactive({
  name: '',
  map_type: 'rpg',
  width: 20,
  height: 20,
  grid_size: 40,
  grid_color: '#333333',
  preset_bg: 'grid_only',
  background_url: '',
});
```

Update `openCreateMapModal()`:
```javascript
function openCreateMapModal() {
  newMapForm.name = '';
  newMapForm.map_type = 'rpg';
  newMapForm.width = 20;
  newMapForm.height = 20;
  newMapForm.grid_size = 40;
  newMapForm.grid_color = '#333333';
  newMapForm.preset_bg = 'grid_only';
  newMapForm.background_url = '';
  showCreateMapModal.value = true;
}
```

Update `submitCreateMap()`:
```javascript
async function submitCreateMap() {
  try {
    const res = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newMapForm),
    });
    if (res.ok) {
      showCreateMapModal.value = false;
      fetchMapList();
    }
  } catch (err) {
    console.error('Failed to create map:', err);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/RpgVttMapBrowser.test.js"
```
Expected: PASS (all 9 tests in `RpgVttMapBrowser.test.js` pass).

- [ ] **Step 5: Commit changes**

```bash
git add client/src/views/RpgVttView.vue client/test/RpgVttMapBrowser.test.js
git commit -m "feat(rpg-vtt): remove auto-activation from create map modal"
```

---

### Task 2: Full Verification & Final Review

**Files:**
- Verify: Full client test suite, production build, server test suite

- [ ] **Step 1: Run full server test suite**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npm test"
```
Expected: 75/75 tests pass.

- [ ] **Step 2: Run full client test suite and production build**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"
```
Expected: All client test files pass (131+ tests); Vite build succeeds with zero errors.

- [ ] **Step 3: Dispatch Final Code Reviewer**

Dispatch `research` subagent with `pro` model to perform a whole-branch final review comparing base commit before Task 1 to HEAD.
Fix any findings if raised.

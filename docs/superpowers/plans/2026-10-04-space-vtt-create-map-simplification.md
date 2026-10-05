# Space VTT Create Tactical Map Modal Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove "Enable Fog of War" and "Set as Active Map immediately" checkboxes from the Create New Tactical Space Map modal in Space VTT, ensuring space maps default to fog disabled and newly created maps are added to the drawer list without automatic activation.

**Architecture:** Client-only modification strictly isolated to `SpaceVttView.vue` and its unit tests. In `SpaceVttView.vue`, remove the obsolete checkbox markup from the Create New Map modal, remove `is_active` from `newMapForm`, keep `fog_enabled: false` as the constant default for space maps, and update `submitCreateMap()` to refresh the map list without auto-activating.

**Tech Stack:** Vue 3 Composition API, Vite, Vitest, Node.js / Express.

## Global Constraints

- RPG VTT (`client/src/views/RpgVttView.vue`) must NOT be modified. Ground maps retain Fog of War and immediate activation options.
- Backend API endpoints and database schema must NOT be modified.
- All container commands must run via `docker exec sf-vtt-dev bash -c "<command>"`.
- Client test command: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttMapBrowser.test.js"`.
- Full verification command: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`.

---

### Task 1: Space VTT: Remove Fog of War and Immediate Activation from Create Map Modal & Logic

**Files:**
- Modify: `client/src/views/SpaceVttView.vue`
- Test: `client/test/SpaceVttMapBrowser.test.js`

**Interfaces:**
- Consumes: `SpaceVttView.vue` Create New Map modal (`showCreateMapModal`), `newMapForm`, `openCreateMapModal()`, `submitCreateMap()`.
- Produces: Simplified modal without `is_active` or `fog_enabled` checkboxes; non-auto-activating `submitCreateMap()`.

- [ ] **Step 1: Write failing tests in `client/test/SpaceVttMapBrowser.test.js`**

Add tests to assert that:
1. The Create New Map modal slice of `SpaceVttView.vue` does not contain the "Enable Fog of War" checkbox or label.
2. The Create New Map modal slice does not contain the "Set as Active Map immediately" checkbox or label.
3. `openCreateMapModal` does not assign `newMapForm.is_active`.
4. `submitCreateMap` does not call `activateMap` when creating a new map.

Add to `client/test/SpaceVttMapBrowser.test.js`:
```javascript
  it('does not include Fog of War or Set Active Map checkboxes in Create New Map modal', () => {
    const createMapSection = content.slice(content.indexOf('<!-- Modal: Create New Map -->'), content.indexOf('<!-- Modal: Add Token -->'));
    expect(createMapSection).not.toMatch(/Enable Fog of War/);
    expect(createMapSection).not.toMatch(/Set as Active Map immediately/);
    expect(createMapSection).not.toMatch(/newMapForm\.fog_enabled/);
    expect(createMapSection).not.toMatch(/newMapForm\.is_active/);
  });

  it('does not auto-activate newly created map in submitCreateMap', () => {
    const submitMapSection = content.slice(content.indexOf('async function submitCreateMap()'), content.indexOf('function openAddTokenModal()'));
    expect(submitMapSection).not.toMatch(/activateMap\(created\.id\)/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttMapBrowser.test.js"
```
Expected: FAIL due to existing checkboxes and `activateMap(created.id)` in `SpaceVttView.vue`.

- [ ] **Step 3: Modify `client/src/views/SpaceVttView.vue`**

1. In the template for `<!-- Modal: Create New Map -->`, remove lines 533-545:
```html
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="newMapForm.is_active" />
              Set as Active Map immediately
            </label>
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="newMapForm.fog_enabled" />
              Enable Fog of War
            </label>
          </div>
```

2. In the script:
Update `newMapForm` declaration:
```javascript
const newMapForm = reactive({
  name: '',
  map_type: 'space',
  width: 20,
  height: 20,
  grid_size: 40,
  grid_color: '#334155',
  preset_bg: 'starfield',
  background_url: '',
  fog_enabled: false,
});
```

Update `openCreateMapModal()`:
```javascript
function openCreateMapModal() {
  newMapForm.name = '';
  newMapForm.map_type = 'space';
  newMapForm.width = 20;
  newMapForm.height = 20;
  newMapForm.grid_size = 40;
  newMapForm.grid_color = '#334155';
  newMapForm.preset_bg = 'starfield';
  newMapForm.background_url = '';
  newMapForm.fog_enabled = false;
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
      await res.json();
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
docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttMapBrowser.test.js"
```
Expected: PASS (all 8 tests in `SpaceVttMapBrowser.test.js` pass).

- [ ] **Step 5: Commit changes**

```bash
git add client/src/views/SpaceVttView.vue client/test/SpaceVttMapBrowser.test.js
git commit -m "feat(space-vtt): remove fog of war and auto-activation from create map modal"
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
Expected: All client test files pass (128+ tests); Vite build succeeds with zero errors.

- [ ] **Step 3: Dispatch Final Code Reviewer**

Dispatch `research` subagent with `pro` model to perform a whole-branch final review comparing base commit before Task 1 to HEAD.
Fix any findings if raised.

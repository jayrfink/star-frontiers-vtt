# Map Background Browser, Token Modal Layout, & Dynamic Tab Titles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable map background selection via `ImageBrowserModal` in Map Managers, fix the right-edge form element overflow in the Add Token modal, and dynamically update the document title to `SFVTT: <Tab Name>`.

**Architecture:** 
- In `client/src/router.js`, attach `meta.title` to route declarations and an `afterEach` navigation hook that synchronizes `document.title = 'SFVTT: ' + title`.
- In `client/src/views/RpgVttView.vue` and `client/src/views/SpaceVttView.vue` (kept strictly separate), enhance `ImageBrowserModal` integration with `imageBrowserTarget` support (`'token'`, `'active_map'`, `'new_map'`), add "Browse Uploads" buttons to the map manager forms, and correct modal layout with flex wrapping, `min-width: 0`, and card bounds.

**Tech Stack:** Vue 3, Vue Router 4, Vitest, CSS Flexbox

## Global Constraints
- Decoupled implementations: RPG VTT (`RpgVttView.vue`) and Space VTT (`SpaceVttView.vue`) must maintain strict separation.
- Title format: Exactly `SFVTT: <Tab Name>` matching navigation bar labels.
- Layout bounds: Modal cards and internal form inputs must not overflow the modal container horizontally.
- All container test commands: `docker exec sf-vtt-dev bash -c "<command>"`.

---

### Task 1: Dynamic Tab Titles in `router.js` & Unit Tests

**Files:**
- Modify: `client/src/router.js`
- Create: `client/test/router.test.js`

**Interfaces:**
- Produces: `router.afterEach` updating `document.title` to `SFVTT: <Tab Name>`.
- Consumes: route `meta.title` property.

- [ ] **Step 1: Write failing unit test for dynamic document titles**

Create `client/test/router.test.js`:
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import router from '../src/router.js';

describe('Router Dynamic Tab Titles', () => {
  beforeEach(async () => {
    document.title = 'Default';
  });

  it('sets document.title to SFVTT: Login on login route', async () => {
    await router.push('/login');
    expect(document.title).toBe('SFVTT: Login');
  });

  it('defines correct meta.title for all dashboard routes', () => {
    const routeMap = {
      'RpgVtt': 'RPG VTT',
      'SpaceVtt': 'Space VTT',
      'CharacterSheets': 'Character Sheets',
      'ShipSheets': 'Ship Sheets',
      'Rulebooks': 'Rulebooks',
      'Admin': 'Admin',
    };

    const routes = router.getRoutes();
    for (const [name, expectedTitle] of Object.entries(routeMap)) {
      const route = routes.find((r) => r.name === name);
      expect(route, `Route ${name} should exist`).toBeDefined();
      expect(route.meta?.title).toBe(expectedTitle);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/router.test.js"`
Expected: FAIL (document.title not set to `SFVTT: Login`)

- [ ] **Step 3: Update `client/src/router.js` with titles and `afterEach` hook**

Update `client/src/router.js`:
```javascript
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth.js';
import LoginView from './views/LoginView.vue';
import DashboardView from './views/DashboardView.vue';
import RpgVttView from './views/RpgVttView.vue';
import SpaceVttView from './views/SpaceVttView.vue';
import CharacterSheetsView from './views/CharacterSheetsView.vue';
import ShipSheetsView from './views/ShipSheetsView.vue';
import RulebooksView from './views/RulebooksView.vue';
import AdminView from './views/AdminView.vue';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: LoginView, meta: { guest: true, title: 'Login' } },
  {
    path: '/dashboard',
    component: DashboardView,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard/rpg-vtt' },
      { path: 'rpg-vtt', name: 'RpgVtt', component: RpgVttView, meta: { title: 'RPG VTT' } },
      { path: 'space-vtt', name: 'SpaceVtt', component: SpaceVttView, meta: { title: 'Space VTT' } },
      { path: 'character-sheets', name: 'CharacterSheets', component: CharacterSheetsView, meta: { title: 'Character Sheets' } },
      { path: 'ship-sheets', name: 'ShipSheets', component: ShipSheetsView, meta: { title: 'Ship Sheets' } },
      { path: 'rulebooks', name: 'Rulebooks', component: RulebooksView, meta: { title: 'Rulebooks' } },
      { path: 'admin', name: 'Admin', component: AdminView, meta: { requiresAuth: true, requiresGm: true, title: 'Admin' } },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();
  if (!auth.checked) {
    await auth.fetchUser();
  }
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresGm = to.matched.some((record) => record.meta.requiresGm);

  if (requiresAuth && !auth.isAuthenticated) {
    next('/login');
  } else if (to.meta.guest && auth.isAuthenticated) {
    next('/dashboard');
  } else if (requiresGm && auth.user?.role !== 'GameMaster') {
    next('/dashboard');
  } else {
    next();
  }
});

router.afterEach((to) => {
  const tabTitle = to.meta?.title;
  document.title = tabTitle ? `SFVTT: ${tabTitle}` : 'Star Frontiers VTT';
});

export default router;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/router.test.js"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/router.js client/test/router.test.js
git commit -m "feat(router): dynamically update document title to SFVTT: <Tab Name>"
```

---

### Task 2: RPG VTT: Map Background Browser & Token Modal Layout Fix

**Files:**
- Modify: `client/src/views/RpgVttView.vue`
- Create: `client/test/RpgVttMapBrowser.test.js`

**Interfaces:**
- Produces: `imageBrowserTarget` support in `RpgVttView.vue` for `'token'`, `'active_map'`, and `'new_map'`.
- Produces: CSS flexbox constraints on `.modal-card` and `.file-btn-wrapper` preventing right boundary overflow.

- [ ] **Step 1: Write failing unit test for RPG VTT map browser and modal styling**

Create `client/test/RpgVttMapBrowser.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('RpgVttView Map Background Browser & Modal Layout', () => {
  const filePath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('defines imageBrowserTarget state with map target support', () => {
    expect(content).toMatch(/imageBrowserTarget\s*=\s*ref\(['"]token['"]\)/);
  });

  it('has openMapImageBrowser function', () => {
    expect(content).toMatch(/function openMapImageBrowser\s*\(/);
  });

  it('includes Browse Uploads button for active map in Map Manager drawer', () => {
    const activeMapSection = content.slice(content.indexOf('<!-- Active Map Settings -->'), content.indexOf('<!-- Map List -->'));
    expect(activeMapSection).toMatch(/openMapImageBrowser\(['"]active_map['"]\)/);
  });

  it('includes Browse Uploads button in Create New Map modal', () => {
    const createMapSection = content.slice(content.indexOf('<!-- Modal: Create New Map -->'), content.indexOf('<!-- Modal: Add Token -->'));
    expect(createMapSection).toMatch(/openMapImageBrowser\(['"]new_map['"]\)/);
  });

  it('updates activeMapForm and calls updateActiveMapSettings when active_map image selected', () => {
    expect(content).toMatch(/activeMapForm\.background_url\s*=\s*url/);
    expect(content).toMatch(/updateActiveMapSettings\s*\(\)/);
  });

  it('includes flex-wrap and bounds on file-btn-wrapper to prevent overflow', () => {
    expect(content).toMatch(/\.file-btn-wrapper\s*\{[^}]*flex-wrap:\s*wrap/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/RpgVttMapBrowser.test.js"`
Expected: FAIL

- [ ] **Step 3: Update `client/src/views/RpgVttView.vue`**

1. In `<script setup>`:
Add `imageBrowserTarget` and computed properties:
```javascript
const imageBrowserTarget = ref('token');

const imageBrowserTitle = computed(() => {
  if (imageBrowserTarget.value === 'active_map' || imageBrowserTarget.value === 'new_map') {
    return 'Select Map Background Image';
  }
  return 'Select Token Image';
});

const currentBrowserImage = computed(() => {
  if (imageBrowserTarget.value === 'active_map') return activeMapForm.background_url;
  if (imageBrowserTarget.value === 'new_map') return newMapForm.background_url;
  return newTokenForm.avatar_url;
});

function openTokenImageBrowser() {
  imageBrowserTarget.value = 'token';
  showImageBrowser.value = true;
}

function openMapImageBrowser(target) {
  imageBrowserTarget.value = target;
  showImageBrowser.value = true;
}
```

Update `onImageSelected(url)`:
```javascript
function onImageSelected(url) {
  if (imageBrowserTarget.value === 'active_map') {
    activeMapForm.background_url = url;
    updateActiveMapSettings();
  } else if (imageBrowserTarget.value === 'new_map') {
    newMapForm.background_url = url;
  } else {
    newTokenForm.avatar_url = url;
  }
}
```

2. In `<template>`:
- Active Map Settings:
```html
<div class="form-group">
  <label>Background Image:</label>
  <input
    type="text"
    v-model="activeMapForm.background_url"
    placeholder="Image URL or upload file"
    @change="updateActiveMapSettings"
  />
  <div class="map-bg-btn-row">
    <input type="file" accept="image/*" @change="onActiveMapUpload" class="map-file-input" />
    <button type="button" class="btn-browse-avatar" @click="openMapImageBrowser('active_map')">Browse Uploads</button>
  </div>
</div>
```

- Create New Map Modal:
```html
<div class="form-group">
  <label>Custom Image URL (Optional)</label>
  <input type="text" v-model="newMapForm.background_url" placeholder="Image URL or upload file" />
  <div class="map-bg-btn-row">
    <input type="file" accept="image/*" @change="e => uploadMapImage(e, newMapForm)" class="map-file-input" />
    <button type="button" class="btn-browse-avatar" @click="openMapImageBrowser('new_map')">Browse Uploads</button>
  </div>
</div>
```

- Add Token Modal:
Change `@click="showImageBrowser = true"` to `@click="openTokenImageBrowser"`.
Update `<ImageBrowserModal>` binding:
```html
<ImageBrowserModal
  v-model="showImageBrowser"
  :title="imageBrowserTitle"
  :current-image="currentBrowserImage"
  @select="onImageSelected"
/>
```

3. In `<style scoped>`:
Update `.modal-card` and add bounds protections:
```css
.modal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  width: 500px;
  max-width: 95vw;
  box-sizing: border-box;
  overflow-x: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.map-bg-btn-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.avatar-upload-box {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px;
  box-sizing: border-box;
  max-width: 100%;
}

.avatar-controls {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
}

.file-btn-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  box-sizing: border-box;
}

.token-file-input {
  max-width: 100%;
  min-width: 0;
}

.avatar-url-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 12px;
  padding: 6px 10px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/RpgVttMapBrowser.test.js"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/views/RpgVttView.vue client/test/RpgVttMapBrowser.test.js
git commit -m "feat(rpg-vtt): add map background image browser and fix token modal overflow"
```

---

### Task 3: Space VTT: Map Background Browser & Token Modal Layout Fix

**Files:**
- Modify: `client/src/views/SpaceVttView.vue`
- Create: `client/test/SpaceVttMapBrowser.test.js`

**Interfaces:**
- Produces: `imageBrowserTarget` support in `SpaceVttView.vue` for `'token'`, `'active_map'`, and `'new_map'`.
- Produces: CSS flexbox constraints on `.modal-card` and `.file-btn-wrapper` preventing right boundary overflow.

- [ ] **Step 1: Write failing unit test for Space VTT map browser and modal styling**

Create `client/test/SpaceVttMapBrowser.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SpaceVttView Map Background Browser & Modal Layout', () => {
  const filePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('defines imageBrowserTarget state with map target support', () => {
    expect(content).toMatch(/imageBrowserTarget\s*=\s*ref\(['"]token['"]\)/);
  });

  it('has openMapImageBrowser function', () => {
    expect(content).toMatch(/function openMapImageBrowser\s*\(/);
  });

  it('includes Browse Uploads button for active map in Map Manager drawer', () => {
    const activeMapSection = content.slice(content.indexOf('<!-- Active Map Settings -->'), content.indexOf('<!-- Map List -->'));
    expect(activeMapSection).toMatch(/openMapImageBrowser\(['"]active_map['"]\)/);
  });

  it('includes Browse Uploads button in Create New Map modal', () => {
    const createMapSection = content.slice(content.indexOf('<!-- Modal: Create New Map -->'), content.indexOf('<!-- Modal: Add Token -->'));
    expect(createMapSection).toMatch(/openMapImageBrowser\(['"]new_map['"]\)/);
  });

  it('updates activeMapForm and calls updateActiveMapSettings when active_map image selected', () => {
    expect(content).toMatch(/activeMapForm\.background_url\s*=\s*url/);
    expect(content).toMatch(/updateActiveMapSettings\s*\(\)/);
  });

  it('includes flex-wrap and bounds on file-btn-wrapper to prevent overflow', () => {
    expect(content).toMatch(/\.file-btn-wrapper\s*\{[^}]*flex-wrap:\s*wrap/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttMapBrowser.test.js"`
Expected: FAIL

- [ ] **Step 3: Update `client/src/views/SpaceVttView.vue`**

1. In `<script setup>`:
Add `imageBrowserTarget` and computed properties:
```javascript
const imageBrowserTarget = ref('token');

const imageBrowserTitle = computed(() => {
  if (imageBrowserTarget.value === 'active_map' || imageBrowserTarget.value === 'new_map') {
    return 'Select Map Background Image';
  }
  return 'Select Token Image';
});

const currentBrowserImage = computed(() => {
  if (imageBrowserTarget.value === 'active_map') return activeMapForm.background_url;
  if (imageBrowserTarget.value === 'new_map') return newMapForm.background_url;
  return newTokenForm.avatar_url;
});

function openTokenImageBrowser() {
  imageBrowserTarget.value = 'token';
  showImageBrowser.value = true;
}

function openMapImageBrowser(target) {
  imageBrowserTarget.value = target;
  showImageBrowser.value = true;
}
```

Update `onImageSelected(url)`:
```javascript
function onImageSelected(url) {
  if (imageBrowserTarget.value === 'active_map') {
    activeMapForm.background_url = url;
    updateActiveMapSettings();
  } else if (imageBrowserTarget.value === 'new_map') {
    newMapForm.background_url = url;
  } else {
    newTokenForm.avatar_url = url;
  }
}
```

2. In `<template>`:
- Active Map Settings:
```html
<div class="form-group">
  <label>Background Image:</label>
  <input
    type="text"
    v-model="activeMapForm.background_url"
    placeholder="Image URL or upload file"
    @change="updateActiveMapSettings"
  />
  <div class="map-bg-btn-row">
    <input type="file" accept="image/*" @change="onActiveMapUpload" class="map-file-input" />
    <button type="button" class="btn-browse-avatar" @click="openMapImageBrowser('active_map')">Browse Uploads</button>
  </div>
</div>
```

- Create New Map Modal:
```html
<div class="form-group">
  <label>Custom Image URL (Optional)</label>
  <input type="text" v-model="newMapForm.background_url" placeholder="Image URL or upload file" />
  <div class="map-bg-btn-row">
    <input type="file" accept="image/*" @change="e => uploadMapImage(e, newMapForm)" class="map-file-input" />
    <button type="button" class="btn-browse-avatar" @click="openMapImageBrowser('new_map')">Browse Uploads</button>
  </div>
</div>
```

- Add Token Modal:
Change `@click="showImageBrowser = true"` to `@click="openTokenImageBrowser"`.
Update `<ImageBrowserModal>` binding:
```html
<ImageBrowserModal
  v-model="showImageBrowser"
  :title="imageBrowserTitle"
  :current-image="currentBrowserImage"
  @select="onImageSelected"
/>
```

3. In `<style scoped>`:
Update `.modal-card` and add bounds protections:
```css
.modal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  width: 500px;
  max-width: 95vw;
  box-sizing: border-box;
  overflow-x: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.map-bg-btn-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.avatar-upload-box {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px;
  box-sizing: border-box;
  max-width: 100%;
}

.avatar-controls {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
}

.file-btn-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  box-sizing: border-box;
}

.token-file-input {
  max-width: 100%;
  min-width: 0;
}

.avatar-url-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 12px;
  padding: 6px 10px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SpaceVttMapBrowser.test.js"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/views/SpaceVttView.vue client/test/SpaceVttMapBrowser.test.js
git commit -m "feat(space-vtt): add map background image browser and fix token modal overflow"
```

---

### Task 4: Full Verification & Integration Testing

**Files:**
- All client and server test suites.

- [ ] **Step 1: Run complete server test suite**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: PASS (75/75 tests)

- [ ] **Step 2: Run complete client test suite and production build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: PASS (all test files pass, Vite production build succeeds)

- [ ] **Step 3: Verify live background services**

Run: `curl -s -I http://localhost:3000/api/auth/me && curl -s -I http://localhost:3001`
Expected: HTTP 401 on backend, HTTP 200 on client.

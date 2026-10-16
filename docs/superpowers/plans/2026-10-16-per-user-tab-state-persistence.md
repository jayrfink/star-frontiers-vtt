# Per-User Tab and View State Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and restore each individual user's tab and view state (VTT pan/zoom/tool/token/roll-log, selected Character & Ship sheets + scroll positions, Rulebooks mode/category/book/page/filters, and last active navigation tab) scoped by user ID.

**Architecture:** A centralized client state utility (`client/src/utils/userState.js`) persists per-user state slices (`navigation`, `rpgVtt`, `spaceVtt`, `characterSheets`, `shipSheets`, `rulebooks`) under `sf_vtt_user_state_${userId}` in `localStorage` (with an in-memory fallback for non-browser test environments). `VttCanvas.vue` and `SpaceVttCanvas.vue` expose `panX` and `panY` via two-way `v-model` props alongside `zoomLevel`. Each view loads the active user's saved state on initialization/mount and saves updates reactively.

**Tech Stack:** Vue 3 (Composition API & Options API), Vue Router, Pinia, Vitest.

## Global Constraints

- Run all test and build commands in container: `docker exec sf-vtt-dev bash -c "<command>"`
- Client tests: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/UserStatePersistence.test.js && npm run build"`
- Full client suite: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run"`
- Server suite: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
- All state must be isolated per user ID (`sf_vtt_user_state_${userId}`).
- Safe Pinia access (`try { return useAuthStore()?.user?.id ?? 'guest'; } catch { return 'guest'; }`) must be used in views/components so unit tests that invoke methods or SSR render without an active Pinia instance do not throw errors.

---

### Task 1: Per-User State Utility (`userState.js`), Router Tab Persistence (`router.js`), and Unit Tests

**Files:**
- Create: `client/src/utils/userState.js`
- Modify: `client/src/router.js`
- Create: `client/test/UserStatePersistence.test.js`

**Interfaces:**
- Produces:
  - `getStorageKey(userId)`: returns `'sf_vtt_user_state_' + (userId ?? 'guest')`
  - `getUserState(userId, section, defaults = {})`: returns merged state object for `section`
  - `saveUserState(userId, section, partialState)`: merges `partialState` into `section` for `userId`
  - `clearUserStateMemory()`: clears fallback memory store (for testing)
  - `getSafeUserId()`: safely retrieves `useAuthStore()?.user?.id ?? 'guest'` without throwing if Pinia is inactive

- [ ] **Step 1: Write the failing tests for `userState.js` and `router.js`**

Create `client/test/UserStatePersistence.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { getStorageKey, getUserState, saveUserState, clearUserStateMemory } from '../src/utils/userState.js';
import router from '../src/router.js';
import { useAuthStore } from '../src/stores/auth.js';

describe('Per-User Tab and View State Persistence', () => {
  beforeEach(() => {
    if (typeof document === 'undefined') {
      globalThis.document = { title: '' };
    }
    setActivePinia(createPinia());
    clearUserStateMemory();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('Task 1: userState utility & Router navigation persistence', () => {
    it('isolates state between different user IDs', () => {
      saveUserState(101, 'spaceVtt', { panX: -240, panY: 180, zoomLevel: 1.5 });
      saveUserState(202, 'spaceVtt', { panX: 50, panY: 50, zoomLevel: 0.75 });

      const user1State = getUserState(101, 'spaceVtt', { panX: 50, panY: 50, zoomLevel: 1.0 });
      const user2State = getUserState(202, 'spaceVtt', { panX: 50, panY: 50, zoomLevel: 1.0 });

      expect(getStorageKey(101)).toBe('sf_vtt_user_state_101');
      expect(getStorageKey(202)).toBe('sf_vtt_user_state_202');
      expect(user1State).toEqual({ panX: -240, panY: 180, zoomLevel: 1.5 });
      expect(user2State).toEqual({ panX: 50, panY: 50, zoomLevel: 0.75 });
    });

    it('merges partial updates into existing section state without overwriting other sections', () => {
      saveUserState(101, 'characterSheets', { selectedCharId: 7 });
      saveUserState(101, 'shipSheets', { selectedShipId: 3 });
      saveUserState(101, 'characterSheets', { mainScrollTop: 320 });

      expect(getUserState(101, 'characterSheets', { selectedCharId: null, mainScrollTop: 0 })).toEqual({
        selectedCharId: 7,
        mainScrollTop: 320,
      });
      expect(getUserState(101, 'shipSheets', { selectedShipId: null })).toEqual({
        selectedShipId: 3,
      });
    });

    it('saves last visited dashboard tab per user and redirects /dashboard to it', async () => {
      const auth = useAuthStore();
      auth.user = { id: 101, username: 'alice', role: 'Player' };
      auth.checked = true;

      await router.push('/dashboard/space-vtt');
      expect(router.currentRoute.value.path).toBe('/dashboard/space-vtt');

      const navState = getUserState(101, 'navigation', {});
      expect(navState.lastPath).toBe('/dashboard/space-vtt');

      // Navigating to /dashboard root restores /dashboard/space-vtt for user 101
      await router.push('/dashboard');
      expect(router.currentRoute.value.path).toBe('/dashboard/space-vtt');

      // Switching to user 202 who has no saved tab defaults to /dashboard/rpg-vtt
      auth.user = { id: 202, username: 'bob', role: 'Player' };
      await router.push('/dashboard');
      expect(router.currentRoute.value.path).toBe('/dashboard/rpg-vtt');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/UserStatePersistence.test.js"`
Expected: FAIL (cannot find module `../src/utils/userState.js`)

- [ ] **Step 3: Implement `client/src/utils/userState.js` and update `client/src/router.js`**

Create `client/src/utils/userState.js`:
```js
import { useAuthStore } from '../stores/auth.js';

const STORAGE_PREFIX = 'sf_vtt_user_state_';
const memoryFallback = new Map();

function readRaw(key) {
  if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
    return localStorage.getItem(key);
  }
  return memoryFallback.get(key) || null;
}

function writeRaw(key, value) {
  if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
    localStorage.setItem(key, value);
  } else {
    memoryFallback.set(key, value);
  }
}

export function clearUserStateMemory() {
  memoryFallback.clear();
}

export function getStorageKey(userId) {
  const id = userId !== undefined && userId !== null && userId !== '' ? userId : 'guest';
  return `${STORAGE_PREFIX}${id}`;
}

export function getSafeUserId() {
  try {
    const auth = useAuthStore();
    return auth?.user?.id ?? 'guest';
  } catch {
    return 'guest';
  }
}

export function getUserState(userId, section, defaults = {}) {
  try {
    const raw = readRaw(getStorageKey(userId));
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...defaults };
    const sectionData = parsed[section];
    if (!sectionData || typeof sectionData !== 'object') return { ...defaults };
    return { ...defaults, ...sectionData };
  } catch (err) {
    console.error(`Failed to load user state for section "${section}":`, err);
    return { ...defaults };
  }
}

export function saveUserState(userId, section, partialState) {
  try {
    const key = getStorageKey(userId);
    const raw = readRaw(key);
    const parsed = raw ? JSON.parse(raw) : {};
    const root = parsed && typeof parsed === 'object' ? parsed : {};
    const currentSection = root[section] && typeof root[section] === 'object' ? root[section] : {};
    root[section] = { ...currentSection, ...partialState };
    writeRaw(key, JSON.stringify(root));
  } catch (err) {
    console.error(`Failed to save user state for section "${section}":`, err);
  }
}
```

Update `client/src/router.js`:
1. Import `{ getUserState, saveUserState }` from `./utils/userState.js`.
2. Add helper `getSavedDashboardPath(user)`:
```js
function getSavedDashboardPath(user) {
  const defaultPath = '/dashboard/rpg-vtt';
  if (!user || user.id === undefined) return defaultPath;
  const { lastPath } = getUserState(user.id, 'navigation', { lastPath: defaultPath });
  if (!lastPath || typeof lastPath !== 'string' || !lastPath.startsWith('/dashboard/')) {
    return defaultPath;
  }
  if (lastPath.startsWith('/dashboard/admin') && user.role !== 'GameMaster') {
    return defaultPath;
  }
  return lastPath;
}
```
3. In `routes`, update `{ path: '', redirect: () => { const auth = useAuthStore(); return getSavedDashboardPath(auth.user); } }`.
4. In `router.beforeEach`, when `to.meta.guest && auth.isAuthenticated`, call `next(getSavedDashboardPath(auth.user))`.
5. In `router.afterEach((to) => ...)`:
```js
  try {
    const auth = useAuthStore();
    if (auth.user?.id !== undefined && to.path.startsWith('/dashboard/') && to.path !== '/dashboard/') {
      saveUserState(auth.user.id, 'navigation', { lastPath: to.path });
    }
  } catch {
    // Ignore if Pinia is not active
  }
```

- [ ] **Step 4: Run tests to verify Task 1 passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/UserStatePersistence.test.js test/router.test.js"`
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add client/src/utils/userState.js client/src/router.js client/test/UserStatePersistence.test.js
git commit -m "feat(client): add per-user state utility and persist active dashboard tab"
```

---

### Task 2: VTT Canvas Pan/Zoom Props & RPG/Space VTT View State Persistence

**Files:**
- Modify: `client/src/components/VttCanvas.vue`
- Modify: `client/src/components/SpaceVttCanvas.vue`
- Modify: `client/src/views/RpgVttView.vue`
- Modify: `client/src/views/SpaceVttView.vue`
- Modify: `client/test/UserStatePersistence.test.js`

**Interfaces:**
- Consumes: `getUserState`, `saveUserState`, `getSafeUserId` from `client/src/utils/userState.js`
- Produces:
  - `VttCanvas.vue` & `SpaceVttCanvas.vue` props: `panX` (Number, default 50), `panY` (Number, default 50); emits: `'update:panX'`, `'update:panY'`
  - `RpgVttView.vue`: persists `{ panX, panY, zoomLevel, activeTool, selectedTokenId, isRollLogOpen }` under section `'rpgVtt'`
  - `SpaceVttView.vue`: persists `{ panX, panY, zoomLevel, activeTool, selectedTokenId, isRollLogOpen }` under section `'spaceVtt'`

- [ ] **Step 1: Add failing tests for VTT Canvas & VTT Views in `client/test/UserStatePersistence.test.js`**

Append Task 2 test suite to `client/test/UserStatePersistence.test.js`:
```js
  describe('Task 2: VTT Canvas & RpgVttView / SpaceVttView pan, zoom, and tool state persistence', () => {
    it('VttCanvas and SpaceVttCanvas define panX and panY props and update:panX / update:panY emits', async () => {
      const VttCanvas = (await import('../src/components/VttCanvas.vue')).default;
      const SpaceVttCanvas = (await import('../src/components/SpaceVttCanvas.vue')).default;

      expect(VttCanvas.props.panX).toBeDefined();
      expect(VttCanvas.props.panY).toBeDefined();
      expect(VttCanvas.emits).toContain('update:panX');
      expect(VttCanvas.emits).toContain('update:panY');

      expect(SpaceVttCanvas.props.panX).toBeDefined();
      expect(SpaceVttCanvas.props.panY).toBeDefined();
      expect(SpaceVttCanvas.emits).toContain('update:panX');
      expect(SpaceVttCanvas.emits).toContain('update:panY');
    });

    it('RpgVttView and SpaceVttView bind v-model:pan-x and v-model:pan-y and persist state via userState', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const rpgContent = fs.readFileSync(path.resolve(__dirname, '../src/views/RpgVttView.vue'), 'utf8');
      const spaceContent = fs.readFileSync(path.resolve(__dirname, '../src/views/SpaceVttView.vue'), 'utf8');

      expect(rpgContent).toContain('v-model:pan-x="panX"');
      expect(rpgContent).toContain('v-model:pan-y="panY"');
      expect(rpgContent).toContain("getUserState(");
      expect(rpgContent).toContain("'rpgVtt'");
      expect(rpgContent).toContain("saveUserState(");

      expect(spaceContent).toContain('v-model:pan-x="panX"');
      expect(spaceContent).toContain('v-model:pan-y="panY"');
      expect(spaceContent).toContain("getUserState(");
      expect(spaceContent).toContain("'spaceVtt'");
      expect(spaceContent).toContain("saveUserState(");
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/UserStatePersistence.test.js"`
Expected: FAIL (`VttCanvas.props.panX` is undefined)

- [ ] **Step 3: Update `VttCanvas.vue` and `SpaceVttCanvas.vue`**

In both `client/src/components/VttCanvas.vue` and `client/src/components/SpaceVttCanvas.vue`:
1. Add `panX` and `panY` to `defineProps`:
```js
  panX: {
    type: Number,
    default: 50,
  },
  panY: {
    type: Number,
    default: 50,
  },
```
2. Add `'update:panX'` and `'update:panY'` to `defineEmits`:
```js
const emit = defineEmits([
  'update:zoomLevel',
  'update:panX',
  'update:panY',
  'token-moved',
  'token-selected',
]);
```
3. Initialize `panX` and `panY` from props and watch props for external updates (make sure `watch` is imported from `'vue'` in `SpaceVttCanvas.vue` too):
```js
const panX = ref(props.panX);
const panY = ref(props.panY);

watch(() => props.panX, (val) => {
  if (typeof val === 'number' && val !== panX.value) panX.value = val;
});
watch(() => props.panY, (val) => {
  if (typeof val === 'number' && val !== panY.value) panY.value = val;
});
```
4. In `onMouseMove` when `isPanning.value` is true:
```js
  if (isPanning.value) {
    panX.value = e.clientX - panStart.x;
    panY.value = e.clientY - panStart.y;
    emit('update:panX', panX.value);
    emit('update:panY', panY.value);
    return;
  }
```
5. In `onWheel` when `panX.value` and `panY.value` are updated:
```js
    panX.value = mouseX - ((mouseX - panX.value) * newZoom) / props.zoomLevel;
    panY.value = mouseY - ((mouseY - panY.value) * newZoom) / props.zoomLevel;
    emit('update:panX', panX.value);
    emit('update:panY', panY.value);
```

- [ ] **Step 4: Update `RpgVttView.vue` and `SpaceVttView.vue`**

In `client/src/views/RpgVttView.vue`:
1. Import `{ getUserState, saveUserState, getSafeUserId }` from `'../utils/userState.js'`.
2. Load initial saved state:
```js
const initialVttState = getUserState(getSafeUserId(), 'rpgVtt', {
  panX: 50,
  panY: 50,
  zoomLevel: 1.0,
  activeTool: 'select',
  selectedTokenId: null,
  isRollLogOpen: false,
});
```
3. Initialize refs from `initialVttState`:
- `const panX = ref(initialVttState.panX ?? 50);`
- `const panY = ref(initialVttState.panY ?? 50);`
- `const zoomLevel = ref(initialVttState.zoomLevel ?? 1.0);`
- `const activeTool = ref(initialVttState.activeTool || 'select');`
- `const selectedTokenId = ref(initialVttState.selectedTokenId ?? null);`
- `const isRollLogOpen = ref(!!initialVttState.isRollLogOpen);`
4. Add helper `persistVttState()` and watcher:
```js
function persistVttState() {
  saveUserState(getSafeUserId(), 'rpgVtt', {
    panX: panX.value,
    panY: panY.value,
    zoomLevel: zoomLevel.value,
    activeTool: activeTool.value,
    selectedTokenId: selectedTokenId.value,
    isRollLogOpen: isRollLogOpen.value,
  });
}

watch([panX, panY, zoomLevel, activeTool, selectedTokenId, isRollLogOpen], () => {
  persistVttState();
});
```
5. Also call `persistVttState()` in `onBeforeUnmount()`.
6. In template, bind `v-model:pan-x="panX"` and `v-model:pan-y="panY"` on `<VttCanvas>`, and update the Reset button to reset `zoomLevel = 1.0; panX = 50; panY = 50`:
```html
<button title="Reset Zoom" class="btn-sm" @click="zoomLevel = 1.0; panX = 50; panY = 50">Reset</button>
```
```html
        <VttCanvas
          :map="activeMap"
          :tokens="tokens"
          :active-tool="activeTool"
          v-model:zoom-level="zoomLevel"
          v-model:pan-x="panX"
          v-model:pan-y="panY"
          :is-gm="isGm"
          :selected-token-id="selectedTokenId"
          @token-moved="onTokenMoved"
          @token-selected="onTokenSelected"
        />
```
7. In `SpaceVttView.vue`, apply the exact same changes using section key `'spaceVtt'` and `<SpaceVttCanvas>`.

- [ ] **Step 5: Run tests to verify Task 2 passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/UserStatePersistence.test.js"`
Expected: PASS

- [ ] **Step 6: Commit Task 2**

```bash
git add client/src/components/VttCanvas.vue client/src/components/SpaceVttCanvas.vue client/src/views/RpgVttView.vue client/src/views/SpaceVttView.vue client/test/UserStatePersistence.test.js
git commit -m "feat(vtt): persist per-user pan, zoom, tool, token, and roll log state in RPG and Space VTT"
```

---

### Task 3: Character Sheets, Ship Sheets, and Rulebooks State Persistence & Tests

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue`
- Modify: `client/src/views/ShipSheetsView.vue`
- Modify: `client/src/views/RulebooksView.vue`
- Modify: `client/src/components/QuickReferenceTables.vue`
- Modify: `client/test/UserStatePersistence.test.js`

**Interfaces:**
- Consumes: `getUserState`, `saveUserState`, `getSafeUserId` from `client/src/utils/userState.js`
- Produces:
  - `CharacterSheetsView.vue`: persists `{ selectedCharId, sidebarScrollTop, mainScrollTop }` under `'characterSheets'`
  - `ShipSheetsView.vue`: persists `{ selectedShipId, sidebarScrollTop, mainScrollTop }` under `'shipSheets'`
  - `RulebooksView.vue` & `QuickReferenceTables.vue`: persists `{ viewMode, pdfBookId, pdfPage, selectedSystem, selectedBook, searchQuery, quickRefCategory, quickRefSearch }` under `'rulebooks'`

- [ ] **Step 1: Add failing tests for Character Sheets, Ship Sheets, and Rulebooks in `client/test/UserStatePersistence.test.js`**

Append Task 3 tests to `client/test/UserStatePersistence.test.js`:
```js
  describe('Task 3: CharacterSheetsView, ShipSheetsView, and RulebooksView state persistence', () => {
    it('CharacterSheetsView restores saved selectedCharId per user instead of resetting to first character', async () => {
      const CharacterSheetsView = (await import('../src/views/CharacterSheetsView.vue')).default;
      const auth = useAuthStore();
      auth.user = { id: 303, username: 'charPlayer', role: 'Player' };

      // Save character ID 22 as the user's selected character
      saveUserState(303, 'characterSheets', { selectedCharId: 22 });

      const mockChars = [
        { id: 11, name: 'Alpha First', race: 'Human', psa: 'Military' },
        { id: 22, name: 'Beta Second', race: 'Vrusk', psa: 'Technological' },
        { id: 33, name: 'Gamma Third', race: 'Yazirian', psa: 'Biosocial' },
      ];

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: true,
        json: async () => mockChars,
      });

      try {
        const vm = {
          characters: [],
          selectedChar: null,
          loading: false,
          normalizeCharacterData: CharacterSheetsView.methods.normalizeCharacterData,
          getCurrentUserId: CharacterSheetsView.methods.getCurrentUserId,
          selectCharacter: CharacterSheetsView.methods.selectCharacter,
          restoreScrollPositions: () => {},
        };

        await CharacterSheetsView.methods.fetchCharacters.call(vm);
        expect(vm.selectedChar).not.toBeNull();
        expect(vm.selectedChar.id).toBe(22);
        expect(vm.selectedChar.name).toBe('Beta Second');

        // Selecting character 33 updates saved state for user 303
        CharacterSheetsView.methods.selectCharacter.call(vm, mockChars[2]);
        expect(getUserState(303, 'characterSheets', {}).selectedCharId).toBe(33);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('ShipSheetsView restores saved selectedShipId per user instead of resetting to first ship', async () => {
      const ShipSheetsView = (await import('../src/views/ShipSheetsView.vue')).default;
      const auth = useAuthStore();
      auth.user = { id: 404, username: 'shipCaptain', role: 'GameMaster' };

      saveUserState(404, 'shipSheets', { selectedShipId: 99 });

      const mockShips = [
        { id: 88, name: 'UPF Vanguard', ship_type: 'Frigate', hull_points: 60 },
        { id: 99, name: 'Star Talon', ship_type: 'Assault Scout', hull_points: 15 },
      ];

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: true,
        json: async () => mockShips,
      });

      try {
        const vm = {
          ships: [],
          selectedShip: null,
          loading: false,
          normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
          normalizeWeapons: ShipSheetsView.methods.normalizeWeapons,
          normalizeShip: ShipSheetsView.methods.normalizeShip,
          getCurrentUserId: ShipSheetsView.methods.getCurrentUserId,
          selectShip: ShipSheetsView.methods.selectShip,
          restoreScrollPositions: () => {},
        };

        await ShipSheetsView.methods.fetchShips.call(vm);
        expect(vm.selectedShip).not.toBeNull();
        expect(vm.selectedShip.id).toBe(99);
        expect(vm.selectedShip.name).toBe('Star Talon');

        // Selecting ship 88 updates saved state for user 404
        ShipSheetsView.methods.selectShip.call(vm, vm.ships[0]);
        expect(getUserState(404, 'shipSheets', {}).selectedShipId).toBe(88);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('RulebooksView and QuickReferenceTables restore saved mode, PDF book/page, and category per user', async () => {
      const { createSSRApp } = await import('vue');
      const { renderToString } = await import('vue/server-renderer');
      const RulebooksView = (await import('../src/views/RulebooksView.vue')).default;
      const QuickReferenceTables = (await import('../src/components/QuickReferenceTables.vue')).default;

      const auth = useAuthStore();
      auth.user = { id: 505, username: 'loremaster', role: 'Player' };

      saveUserState(505, 'rulebooks', {
        viewMode: 'pdf',
        pdfBookId: 'kh-expansion',
        pdfPage: 25,
        quickRefCategory: 'melee',
      });

      const rbApp = createSSRApp(RulebooksView);
      const rbHtml = await renderToString(rbApp);
      expect(rbHtml).toContain('src="/api/rulebooks/pdf/kh-expansion#page=25"');

      const qrApp = createSSRApp(QuickReferenceTables);
      const qrHtml = await renderToString(qrApp);
      expect(qrHtml).toContain('Unarmed Combat');
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/UserStatePersistence.test.js"`
Expected: FAIL (`vm.selectedChar.id` is 11 instead of 22)

- [ ] **Step 3: Implement state persistence in `CharacterSheetsView.vue` and `ShipSheetsView.vue`**

In `client/src/views/CharacterSheetsView.vue`:
1. Import `{ getUserState, saveUserState, getSafeUserId }` from `'../utils/userState.js'`.
2. Add template refs or query selectors on `.sheet-list` and `.sheet-detail` (and `@scroll="onScrollSave"`):
   - Add `getCurrentUserId()` method returning `getSafeUserId()`.
   - In `fetchCharacters()`:
     ```js
     const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
     const saved = getUserState(uid, 'characterSheets', { selectedCharId: null, sidebarScrollTop: 0, mainScrollTop: 0 });
     if (this.characters.length > 0 && !this.selectedChar) {
       const match = saved.selectedCharId != null
         ? this.characters.find((c) => String(c.id) === String(saved.selectedCharId))
         : null;
       this.selectedChar = JSON.parse(JSON.stringify(match || this.characters[0]));
       if (this.restoreScrollPositions) {
         this.restoreScrollPositions(saved);
       }
     }
     ```
   - In `selectCharacter(char)`:
     ```js
     selectCharacter(char) {
       this.selectedChar = JSON.parse(JSON.stringify(this.normalizeCharacterData(char)));
       if (this.selectedChar && this.selectedChar.id !== undefined) {
         const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
         saveUserState(uid, 'characterSheets', { selectedCharId: this.selectedChar.id });
       }
     },
     ```
   - Also when creating a new character in `createCharacter()`, save its `selectedCharId`.
   - Add `saveScrollPositions()` and `restoreScrollPositions(saved)` methods to persist/restore `.sheet-list` and `.sheet-detail` `scrollTop` on scroll and in `beforeUnmount()`.

In `client/src/views/ShipSheetsView.vue`:
1. Import `{ getUserState, saveUserState, getSafeUserId }` from `'../utils/userState.js'`.
2. Add `getCurrentUserId()` method returning `getSafeUserId()`.
3. In `fetchShips()`:
   ```js
   const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
   const saved = getUserState(uid, 'shipSheets', { selectedShipId: null, sidebarScrollTop: 0, mainScrollTop: 0 });
   if (this.ships.length > 0 && !this.selectedShip) {
     const match = saved.selectedShipId != null
       ? this.ships.find((s) => String(s.id) === String(saved.selectedShipId))
       : null;
     this.selectShip(match || this.ships[0]);
     if (this.restoreScrollPositions) {
       this.restoreScrollPositions(saved);
     }
   }
   ```
4. In `selectShip(ship)`:
   ```js
   selectShip(ship) {
     this.selectedShip = this.normalizeShip(ship);
     if (this.selectedShip && this.selectedShip.id !== undefined) {
       const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
       saveUserState(uid, 'shipSheets', { selectedShipId: this.selectedShip.id });
     }
   },
   ```
5. Add `saveScrollPositions()` and `restoreScrollPositions(saved)` for `.sheet-list` and `.sheet-detail`.

- [ ] **Step 4: Implement state persistence in `RulebooksView.vue` and `QuickReferenceTables.vue`**

In `client/src/views/RulebooksView.vue`:
1. Import `{ getUserState, saveUserState, getSafeUserId }` from `'../utils/userState.js'`.
2. Change `defineProps` defaults to `undefined` or check whether props were passed vs saved state:
```js
const props = defineProps({
  initialViewMode: { type: String, default: undefined },
  initialPdfBook: { type: String, default: undefined },
  initialPdfPage: { type: Number, default: undefined },
  initialDocs: { type: Array, default: () => [] },
  initialSearch: { type: String, default: undefined },
  initialSystem: { type: String, default: undefined },
  initialBook: { type: String, default: undefined },
});

const savedRulebooks = getUserState(getSafeUserId(), 'rulebooks', {
  viewMode: 'quickref',
  pdfBookId: 'ad-basic',
  pdfPage: 1,
  searchQuery: '',
  selectedSystem: 'All',
  selectedBook: 'All',
});

const viewMode = ref(props.initialViewMode ?? savedRulebooks.viewMode ?? 'quickref');
const pdfBookId = ref(props.initialPdfBook ?? savedRulebooks.pdfBookId ?? 'ad-basic');
const pdfPage = ref(props.initialPdfPage ?? savedRulebooks.pdfPage ?? 1);
const searchQuery = ref(props.initialSearch ?? savedRulebooks.searchQuery ?? '');
const selectedSystem = ref(props.initialSystem ?? savedRulebooks.selectedSystem ?? 'All');
const selectedBook = ref(props.initialBook ?? savedRulebooks.selectedBook ?? 'All');

watch([viewMode, pdfBookId, pdfPage, searchQuery, selectedSystem, selectedBook], () => {
  saveUserState(getSafeUserId(), 'rulebooks', {
    viewMode: viewMode.value,
    pdfBookId: pdfBookId.value,
    pdfPage: pdfPage.value,
    searchQuery: searchQuery.value,
    selectedSystem: selectedSystem.value,
    selectedBook: selectedBook.value,
  });
});
```
(Also ensure when `watch(pdfBookId, () => { pdfPage.value = 1; })` runs, it only resets `pdfPage` when `pdfBookId` actually changes after initialization).

In `client/src/components/QuickReferenceTables.vue`:
1. Import `{ watch }` from `'vue'` and `{ getUserState, saveUserState, getSafeUserId }` from `'../utils/userState.js'`.
2. Update `props`:
```js
const props = defineProps({
  initialCategory: { type: String, default: undefined },
  initialSearch: { type: String, default: undefined },
});

const savedQuickRef = getUserState(getSafeUserId(), 'rulebooks', {
  quickRefCategory: 'ship',
  quickRefSearch: '',
});

const activeCategory = ref(props.initialCategory ?? savedQuickRef.quickRefCategory ?? 'ship');
const searchQuery = ref(props.initialSearch ?? savedQuickRef.quickRefSearch ?? '');

watch([activeCategory, searchQuery], () => {
  saveUserState(getSafeUserId(), 'rulebooks', {
    quickRefCategory: activeCategory.value,
    quickRefSearch: searchQuery.value,
  });
});
```

- [ ] **Step 5: Run tests and client build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: All client tests pass and production build succeeds.

- [ ] **Step 6: Commit Task 3**

```bash
git add client/src/views/CharacterSheetsView.vue client/src/views/ShipSheetsView.vue client/src/views/RulebooksView.vue client/src/components/QuickReferenceTables.vue client/test/UserStatePersistence.test.js
git commit -m "feat(client): persist per-user selected character, ship, and rulebook states"
```

# Remove Fog Capability from RPG VTT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Fog of War capabilities, GM toolbar buttons (Reveal/Hide Fog), Map Manager fog controls, canvas darkness rendering, and socket listeners from the RPG VTT.

**Architecture:** Update `VttCanvas.vue` to remove fog rendering and brush logic, and update `RpgVttView.vue` to remove the toolbar buttons, Map Manager controls, and socket sync logic. Keep backend API and database schemas backward-compatible.

**Tech Stack:** Vue 3, HTML5 Canvas 2D, Socket.io-client, Vite, Vitest.

## Global Constraints

- Run all testing and build commands inside container: `docker exec sf-vtt-dev bash -c "<command>"`
- Keep Move, Pan, Ruler, Roll d%, and DMG Die tools intact in RPG VTT.
- Keep map loading, token management, zooming, and all other VTT features fully functional.
- Server API and database schema remain fully backward-compatible.

---

### Task 1: Remove Fog Rendering and Brush Interaction from VttCanvas.vue

**Files:**
- Modify: `client/src/components/VttCanvas.vue`

**Interfaces:**
- Consumes: `map` object, `activeTool` string prop
- Produces: Canvas component without fog overlay rendering, fog brush event listeners, or `fog-changed` events.

- [ ] **Step 1: Remove `fog-changed` from `defineEmits`**

In `client/src/components/VttCanvas.vue`, lines ~27-33:
```javascript
const emit = defineEmits([
  'token-moved',
  'token-selected',
  'fog-changed',
  'update:zoomLevel',
]);
```
Remove `'fog-changed'`.

- [ ] **Step 2: Remove fog state and drawing logic**

1. Remove `const isDrawingFog = ref(false);`.
2. In `render()`, remove `// 5. Draw Fog of War` and `drawFogOfWar(ctx, mapW, mapH);`.
3. Remove the entire `drawFogOfWar(ctx, mapW, mapH)` function.

- [ ] **Step 3: Remove fog brush event handling**

1. In `handleMouseDown(e)`:
   Remove the branch:
   ```javascript
   } else if ((props.activeTool === 'fog_reveal' || props.activeTool === 'fog_hide') && props.isGm) {
     isDrawingFog.value = true;
     applyFogBrush(cell);
   }
   ```
2. In `handleMouseMove(e)`:
   Remove the block:
   ```javascript
   if (isDrawingFog.value && props.isGm) {
     applyFogBrush(cell);
   }
   ```
3. In `handleMouseUp()`:
   Remove the block:
   ```javascript
   if (isDrawingFog.value) {
     isDrawingFog.value = false;
   }
   ```
4. Remove the entire `applyFogBrush(cell)` function.
5. In prop documentation/defaults for `activeTool`, update comment from `'select', 'pan', 'measure', 'fog_reveal', 'fog_hide'` to `'select', 'pan', 'measure'`.

- [ ] **Step 4: Verify client tests and build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: All tests pass, build succeeds with 0 errors.

- [ ] **Step 5: Commit changes**

```bash
git add client/src/components/VttCanvas.vue
git commit -m "feat(rpg-vtt): remove fog rendering and brush logic from VttCanvas"
```

---

### Task 2: Remove Fog Toolbar Buttons, Map Controls, and Sockets from RpgVttView.vue

**Files:**
- Modify: `client/src/views/RpgVttView.vue`

**Interfaces:**
- Consumes: VttCanvas component
- Produces: RPG VTT view without Reveal/Hide Fog toolbar buttons, Map Manager fog controls, or fog socket listeners.

- [ ] **Step 1: Remove Reveal Fog and Hide Fog toolbar buttons**

In `client/src/views/RpgVttView.vue` lines ~130-145:
```html
        <!-- GM Tools -->
        <template v-if="isGm">
          <button
            :class="{ active: activeTool === 'fog_reveal' }"
            title="Fog of War: Reveal Area"
            @click="activeTool = 'fog_reveal'"
          >
            👁️ Reveal Fog
          </button>
          <button
            :class="{ active: activeTool === 'fog_hide' }"
            title="Fog of War: Hide Area"
            @click="activeTool = 'fog_hide'"
          >
            🙈 Hide Fog
          </button>
        </template>
```
Remove this entire `<template v-if="isGm">` block containing Reveal Fog and Hide Fog.

- [ ] **Step 2: Remove `@fog-changed` event binding on VttCanvas**

In `client/src/views/RpgVttView.vue` line ~197:
```html
        <VttCanvas
          :map="activeMap"
          :tokens="tokens"
          :active-tool="activeTool"
          v-model:zoom-level="zoomLevel"
          :is-gm="isGm"
          :selected-token-id="selectedTokenId"
          @token-moved="onTokenMoved"
          @token-selected="onTokenSelected"
          @fog-changed="onFogChanged"
        />
```
Remove `@fog-changed="onFogChanged"`.

- [ ] **Step 3: Remove Fog Controls and checkboxes from Map Manager**

1. Remove Fog Controls action buttons (lines ~227-231):
```html
              <!-- Fog Controls -->
              <div class="fog-actions">
                <button @click="clearFog">Clear Fog (Reveal All)</button>
                <button @click="resetFog">Reset Fog (Hide All)</button>
              </div>
```
2. Remove "Enable Fog of War" checkbox from Active Map form (lines ~233-236):
```html
              <label class="checkbox-label">
                <input type="checkbox" v-model="activeMapForm.fog_enabled" @change="updateMapSettings" />
                Enable Fog of War
              </label>
```
3. Remove "Enable Fog of War" checkbox from Create New Map form (lines ~265-268):
```html
            <label class="checkbox-label">
              <input type="checkbox" v-model="newMapForm.fog_enabled" />
              Enable Fog of War
            </label>
```

- [ ] **Step 4: Remove Fog script methods, state, and socket listeners**

1. In `activeMapForm` and `newMapForm` reactive state definitions, remove `fog_enabled: false`.
2. In `watch(() => activeMap.value, ...)`, remove `activeMapForm.fog_enabled = Boolean(map.fog_enabled);`.
3. In `updateMapSettings()`, remove `fog_enabled: activeMapForm.fog_enabled`.
4. In `createMap()`, remove `newMapForm.fog_enabled = false;`.
5. Remove `clearFog()`, `resetFog()`, `fogSaveTimer`, `saveFog()`, and `onFogChanged()`.
6. In `setupSocketListeners()`, remove `socket.on('fog:updated', ...)`.
7. In `cleanupSocketListeners()`, remove `socket.off('fog:updated');`.
8. In `<style scoped>`, remove `.fog-actions` and `.fog-actions button` rules.

- [ ] **Step 5: Verify client tests and build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: All tests pass, build succeeds with 0 errors.

- [ ] **Step 6: Commit changes**

```bash
git add client/src/views/RpgVttView.vue
git commit -m "feat(rpg-vtt): remove fog toolbar buttons, map controls, and socket sync"
```

---

### Task 3: Full End-to-End Verification

**Files:**
- All modified files

- [ ] **Step 1: Run complete verification in container**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test && cd ../client && npx vitest run && npm run build"`
Expected:
- Server tests: 69/69 passing
- Client tests: 45/45 passing
- Production build: exit code 0

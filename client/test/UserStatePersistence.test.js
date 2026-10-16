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
});


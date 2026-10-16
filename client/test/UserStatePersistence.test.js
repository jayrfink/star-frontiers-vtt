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

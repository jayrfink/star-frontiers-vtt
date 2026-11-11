/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import fs from 'fs';
import path from 'path';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';
import ShipSheetsView from '../src/views/ShipSheetsView.vue';
import { useAuthStore } from '../src/stores/auth.js';
import { getUserState, saveUserState, clearUserStateMemory } from '../src/utils/userState.js';

describe('Sheet Background Image Optimization and Toggle', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    clearUserStateMemory();
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  describe('CharacterSheetsView Background Toggle', () => {
    it('verifies CSS contains optimized starfiel-cyan.jpg fixed background rule and translucent sidebar', () => {
      const vueFile = fs.readFileSync(
        path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'),
        'utf-8'
      );
      expect(vueFile).toContain('/uploads/sheet-backgrounds/starfiel-cyan.jpg');
      expect(vueFile).toContain('.sheet-main.has-sheet-bg');
      expect(vueFile).toContain('.sheets-layout.has-sheet-bg');
      expect(vueFile).toContain('.sheet-bg-checkbox');
      expect(vueFile).toMatch(/\.sidebar\s*\{[^}]*background:\s*rgba\(22,\s*27,\s*34,\s*0\.72\);/);
      expect(vueFile).toMatch(/\.sidebar\s*\{[^}]*backdrop-filter:\s*blur\(12px\);/);
    });

    it('renders the background toggle checkbox and applies has-sheet-bg by default', async () => {
      const auth = useAuthStore();
      auth.user = { id: 42, username: 'starfarer', role: 'Player' };

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 1,
                name: 'Captain Harrison',
                race: 'Human',
                owner_username: 'starfarer',
                user_id: 42,
              },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const mainEl = wrapper.find('.sheet-main');
        expect(mainEl.exists()).toBe(true);
        expect(mainEl.classes()).toContain('has-sheet-bg');

        const checkbox = wrapper.find('.sheet-bg-checkbox');
        expect(checkbox.exists()).toBe(true);
        expect(checkbox.element.checked).toBe(true);

        // Toggle checkbox to off
        await checkbox.setValue(false);
        await flushPromises();

        expect(mainEl.classes()).not.toContain('has-sheet-bg');

        // Check user state persistence
        const state = getUserState(42, 'characterSheets');
        expect(state.showSheetBackground).toBe(false);

        // Toggle back to on
        await checkbox.setValue(true);
        await flushPromises();

        expect(mainEl.classes()).toContain('has-sheet-bg');
        const updatedState = getUserState(42, 'characterSheets');
        expect(updatedState.showSheetBackground).toBe(true);
      } finally {
        global.fetch = origFetch;
      }
    });

    it('restores disabled background preference from saved userState', async () => {
      const auth = useAuthStore();
      auth.user = { id: 99, username: 'recon', role: 'Player' };
      saveUserState(99, 'characterSheets', { showSheetBackground: false });

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 2,
                name: 'Scout Larry',
                race: 'Yazirian',
                owner_username: 'recon',
                user_id: 99,
              },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const mainEl = wrapper.find('.sheet-main');
        expect(mainEl.classes()).not.toContain('has-sheet-bg');

        const checkbox = wrapper.find('.sheet-bg-checkbox');
        expect(checkbox.element.checked).toBe(false);
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  describe('ShipSheetsView Background Toggle', () => {
    it('verifies CSS contains optimized azure-green-cyan.jpg fixed background rule and translucent sidebar', () => {
      const vueFile = fs.readFileSync(
        path.resolve(__dirname, '../src/views/ShipSheetsView.vue'),
        'utf-8'
      );
      expect(vueFile).toContain('/uploads/sheet-backgrounds/azure-green-cyan.jpg');
      expect(vueFile).toContain('.sheet-main.has-sheet-bg');
      expect(vueFile).toContain('.sheets-layout.has-sheet-bg');
      expect(vueFile).toContain('.sheet-bg-checkbox');
      expect(vueFile).toMatch(/\.sidebar\s*\{[^}]*background:\s*rgba\(22,\s*27,\s*34,\s*0\.72\);/);
      expect(vueFile).toMatch(/\.sidebar\s*\{[^}]*backdrop-filter:\s*blur\(12px\);/);
    });

    it('renders the background toggle checkbox and applies has-sheet-bg by default', async () => {
      const auth = useAuthStore();
      auth.user = { id: 77, username: 'admiral', role: 'Player' };

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/ships') {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 10,
                name: 'Gullstrike',
                ship_type: 'Assault Scout',
                owner_username: 'admiral',
                user_id: 77,
              },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      try {
        const wrapper = mount(ShipSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const mainEl = wrapper.find('.sheet-main');
        expect(mainEl.exists()).toBe(true);
        expect(mainEl.classes()).toContain('has-sheet-bg');

        const checkbox = wrapper.find('.sheet-bg-checkbox');
        expect(checkbox.exists()).toBe(true);
        expect(checkbox.element.checked).toBe(true);

        // Toggle checkbox to off
        await checkbox.setValue(false);
        await flushPromises();

        expect(mainEl.classes()).not.toContain('has-sheet-bg');

        // Check user state persistence
        const state = getUserState(77, 'shipSheets');
        expect(state.showSheetBackground).toBe(false);

        // Toggle back on
        await checkbox.setValue(true);
        await flushPromises();

        expect(mainEl.classes()).toContain('has-sheet-bg');
        const updatedState = getUserState(77, 'shipSheets');
        expect(updatedState.showSheetBackground).toBe(true);
      } finally {
        global.fetch = origFetch;
      }
    });

    it('restores disabled background preference from saved userState', async () => {
      const auth = useAuthStore();
      auth.user = { id: 88, username: 'pilot88', role: 'Player' };
      saveUserState(88, 'shipSheets', { showSheetBackground: false });

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/ships') {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 20,
                name: 'Nightwind',
                ship_type: 'Fighter',
                owner_username: 'pilot88',
                user_id: 88,
              },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      try {
        const wrapper = mount(ShipSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const mainEl = wrapper.find('.sheet-main');
        expect(mainEl.classes()).not.toContain('has-sheet-bg');

        const checkbox = wrapper.find('.sheet-bg-checkbox');
        expect(checkbox.element.checked).toBe(false);
      } finally {
        global.fetch = origFetch;
      }
    });
  });
});

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
import { clearUserStateMemory } from '../src/utils/userState.js';

describe('Sheet Background Always-On & Card Translucency', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    clearUserStateMemory();
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  describe('CharacterSheetsView Translucent Cards and Always-On Background', () => {
    it('verifies CSS contains optimized starfiel-cyan.jpg background, translucent cards, and translucent sidebar', () => {
      const vueFile = fs.readFileSync(
        path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'),
        'utf-8'
      );
      // Background rules
      expect(vueFile).toContain('/uploads/sheet-backgrounds/starfiel-cyan.jpg');
      expect(vueFile).toContain('.sheet-main');
      expect(vueFile).toContain('.sheets-layout');

      // Card translucency (increased by 10% to 0.55) with tuned blur
      expect(vueFile).toMatch(/\.card\s*\{[^}]*background:\s*rgba\(22,\s*27,\s*34,\s*0\.55\);/);
      expect(vueFile).toMatch(/\.card\s*\{[^}]*backdrop-filter:\s*blur\(4px\);/);
      expect(vueFile).toMatch(/\.sheet-header\s*\{[^}]*background:\s*rgba\(22,\s*27,\s*34,\s*0\.55\);/);
      expect(vueFile).toMatch(/\.sheet-header\s*\{[^}]*backdrop-filter:\s*blur\(4px\);/);

      // Species infobox preserves its specific styling
      expect(vueFile).toMatch(/\.racial-panel\.species-traits-banner\s*\{[^}]*background:\s*rgba\(56,\s*189,\s*248,\s*0\.05\);/);

      // Sidebar translucency
      expect(vueFile).toMatch(/\.sidebar\s*\{[^}]*background:\s*rgba\(22,\s*27,\s*34,\s*0\.32\);/);
      expect(vueFile).toMatch(/\.sidebar\s*\{[^}]*backdrop-filter:\s*blur\(6px\);/);

      // Toggle button removed
      expect(vueFile).not.toContain('.sheet-bg-checkbox');
      expect(vueFile).not.toContain('.sheet-bg-toggle-wrap');
    });

    it('renders with background always on and no toggle checkbox', async () => {
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

        // Main element has background class
        const mainEl = wrapper.find('.sheet-main');
        expect(mainEl.exists()).toBe(true);
        expect(mainEl.classes()).toContain('has-sheet-bg');

        // Layout element has background class
        const layoutEl = wrapper.find('.sheets-layout');
        expect(layoutEl.exists()).toBe(true);
        expect(layoutEl.classes()).toContain('has-sheet-bg');

        // Checkbox toggle does NOT exist
        const checkbox = wrapper.find('.sheet-bg-checkbox');
        expect(checkbox.exists()).toBe(false);

        // Header and cards exist and render
        const header = wrapper.find('.sheet-header');
        expect(header.exists()).toBe(true);
        const cards = wrapper.findAll('.card');
        expect(cards.length).toBeGreaterThan(0);
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  describe('ShipSheetsView Translucent Cards and Always-On Background', () => {
    it('verifies CSS contains optimized azure-green-cyan.jpg background, translucent cards, and translucent sidebar', () => {
      const vueFile = fs.readFileSync(
        path.resolve(__dirname, '../src/views/ShipSheetsView.vue'),
        'utf-8'
      );
      // Background rules
      expect(vueFile).toContain('/uploads/sheet-backgrounds/azure-green-cyan.jpg');
      expect(vueFile).toContain('.sheet-main');
      expect(vueFile).toContain('.sheets-layout');

      // Card translucency (increased by 10% to 0.55)
      expect(vueFile).toMatch(/\.card\s*\{[^}]*background:\s*rgba\(22,\s*27,\s*34,\s*0\.55\);/);
      expect(vueFile).toMatch(/\.card\s*\{[^}]*backdrop-filter:\s*blur\(10px\);/);

      // Flip/Burn infobox preserves its specific styling
      expect(vueFile).toMatch(/\.flip-burn-ship-banner\s*\{[^}]*background:\s*rgba\(22,\s*27,\s*34,\s*0\.65\);/);
      expect(vueFile).toMatch(/\.flip-burn-ship-banner\s*\{[^}]*backdrop-filter:\s*blur\(10px\);/);

      // Sidebar translucency
      expect(vueFile).toMatch(/\.sidebar\s*\{[^}]*background:\s*rgba\(22,\s*27,\s*34,\s*0\.32\);/);
      expect(vueFile).toMatch(/\.sidebar\s*\{[^}]*backdrop-filter:\s*blur\(6px\);/);

      // Toggle button removed
      expect(vueFile).not.toContain('.sheet-bg-checkbox');
      expect(vueFile).not.toContain('.sheet-bg-toggle-wrap');
    });

    it('renders with background always on and no toggle checkbox', async () => {
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

        // Main element has background class
        const mainEl = wrapper.find('.sheet-main');
        expect(mainEl.exists()).toBe(true);
        expect(mainEl.classes()).toContain('has-sheet-bg');

        // Layout element has background class
        const layoutEl = wrapper.find('.sheets-layout');
        expect(layoutEl.exists()).toBe(true);
        expect(layoutEl.classes()).toContain('has-sheet-bg');

        // Checkbox toggle does NOT exist
        const checkbox = wrapper.find('.sheet-bg-checkbox');
        expect(checkbox.exists()).toBe(false);

        // Header and cards exist and render
        const header = wrapper.find('.sheet-header');
        expect(header.exists()).toBe(true);
        const cards = wrapper.findAll('.card');
        expect(cards.length).toBeGreaterThan(0);
      } finally {
        global.fetch = origFetch;
      }
    });
  });
});

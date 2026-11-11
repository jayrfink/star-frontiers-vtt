import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createPinia, setActivePinia } from 'pinia';
import {
  getUserState,
  saveUserState,
  clearUserStateMemory,
} from '../src/utils/userState.js';
import { useAuthStore } from '../src/stores/auth.js';

describe('Token Sidebar / Manager State Persistence & Toggle', () => {
  const rpgViewSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/views/RpgVttView.vue'),
    'utf8'
  );
  const spaceViewSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/views/SpaceVttView.vue'),
    'utf8'
  );

  beforeEach(() => {
    setActivePinia(createPinia());
    clearUserStateMemory();
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  describe('RpgVttView token sidebar persistence', () => {
    it('initializes showTokenSidebar from userState with true default fallback', () => {
      expect(rpgViewSrc).toMatch(/initialVttState\s*=\s*getUserState\([\s\S]*?showTokenSidebar:\s*true/);
      expect(rpgViewSrc).toMatch(/const\s+showTokenSidebar\s*=\s*ref\(initialVttState\.showTokenSidebar\s*\?\?\s*true\)/);
    });

    it('persists showTokenSidebar in persistVttStateNow and includes it in watcher', () => {
      expect(rpgViewSrc).toMatch(/persistVttStateNow\(\)\s*\{[\s\S]*showTokenSidebar:\s*showTokenSidebar\.value/);
      expect(rpgViewSrc).toMatch(/watch\(\[[^\]]*showTokenSidebar[^\]]*\],/);
    });

    it('binds toggleTokenSidebar and active class to .btn-sidebar in header', () => {
      expect(rpgViewSrc).toMatch(/<button[^>]*class="[^"]*btn-sidebar[^"]*"[^>]*:class="\{\s*active:\s*showTokenSidebar\s*\}"[^>]*@click="toggleTokenSidebar"/);
    });

    it('uses closeTokenSidebar method on sidebar close button', () => {
      expect(rpgViewSrc).toMatch(/<button[^>]*class="close-btn"[^>]*@click="closeTokenSidebar"/);
    });
  });

  describe('SpaceVttView token sidebar persistence', () => {
    it('initializes showTokenSidebar from userState with true default fallback', () => {
      expect(spaceViewSrc).toMatch(/initialVttState\s*=\s*getUserState\([\s\S]*?showTokenSidebar:\s*true/);
      expect(spaceViewSrc).toMatch(/const\s+showTokenSidebar\s*=\s*ref\(initialVttState\.showTokenSidebar\s*\?\?\s*true\)/);
    });

    it('persists showTokenSidebar in persistVttStateNow and includes it in watcher', () => {
      expect(spaceViewSrc).toMatch(/persistVttStateNow\(\)\s*\{[\s\S]*showTokenSidebar:\s*showTokenSidebar\.value/);
      expect(spaceViewSrc).toMatch(/watch\(\[[^\]]*showTokenSidebar[^\]]*\],/);
    });

    it('binds toggleTokenSidebar and active class to .btn-sidebar in header', () => {
      expect(spaceViewSrc).toMatch(/<button[^>]*class="[^"]*btn-sidebar[^"]*"[^>]*:class="\{\s*active:\s*showTokenSidebar\s*\}"[^>]*@click="toggleTokenSidebar"/);
    });

    it('uses closeTokenSidebar method on sidebar close button', () => {
      expect(spaceViewSrc).toMatch(/<button[^>]*class="close-btn"[^>]*@click="closeTokenSidebar"/);
    });
  });

  describe('User state retention behavior across tab navigation', () => {
    it('retains showTokenSidebar: false when closed, staying closed on return', () => {
      const auth = useAuthStore();
      auth.user = { id: 701, username: 'scout', role: 'Player' };

      // User closes sidebar on RPG VTT
      saveUserState(701, 'rpgVtt', { showTokenSidebar: false });
      expect(getUserState(701, 'rpgVtt', { showTokenSidebar: true }).showTokenSidebar).toBe(false);

      // User closes sidebar on Space VTT
      saveUserState(701, 'spaceVtt', { showTokenSidebar: false });
      expect(getUserState(701, 'spaceVtt', { showTokenSidebar: true }).showTokenSidebar).toBe(false);

      // User opens sidebar on RPG VTT
      saveUserState(701, 'rpgVtt', { showTokenSidebar: true });
      expect(getUserState(701, 'rpgVtt', { showTokenSidebar: false }).showTokenSidebar).toBe(true);
    });
  });

  describe('Canvas resizing and sidebar flex layout', () => {
    const rpgCanvasSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/components/VttCanvas.vue'),
      'utf8'
    );
    const spaceCanvasSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/components/SpaceVttCanvas.vue'),
      'utf8'
    );

    it('ensures VttCanvas calls requestRender in resizeCanvas', () => {
      expect(rpgCanvasSrc).toMatch(/function resizeCanvas\(\)\s*\{[\s\S]*requestRender\(\);?\s*\}/);
    });

    it('ensures SpaceVttCanvas calls requestRender in resizeCanvas', () => {
      expect(spaceCanvasSrc).toMatch(/function resizeCanvas\(\)\s*\{[\s\S]*requestRender\(\);?\s*\}/);
    });

    it('ensures .vtt-canvas-wrapper has min-width: 0 in both VTT views', () => {
      expect(rpgViewSrc).toMatch(/\.vtt-canvas-wrapper\s*\{[^}]*min-width:\s*0/);
      expect(spaceViewSrc).toMatch(/\.vtt-canvas-wrapper\s*\{[^}]*min-width:\s*0/);
    });

    it('ensures .token-sidebar has flex-shrink: 0 in both VTT views', () => {
      expect(rpgViewSrc).toMatch(/\.token-sidebar\s*\{[^}]*flex-shrink:\s*0/);
      expect(spaceViewSrc).toMatch(/\.token-sidebar\s*\{[^}]*flex-shrink:\s*0/);
    });

    it('styles .token-sidebar and .gm-drawer with translucent backdrop-filter in both VTT views', () => {
      expect(rpgViewSrc).toMatch(/\.token-sidebar\s*\{[^}]*position:\s*absolute;[^}]*background:\s*rgba\(5,\s*14,\s*28,\s*0\.72\);[^}]*backdrop-filter:\s*blur\(12px\);/);
      expect(spaceViewSrc).toMatch(/\.token-sidebar\s*\{[^}]*position:\s*absolute;[^}]*background:\s*rgba\(5,\s*14,\s*28,\s*0\.72\);[^}]*backdrop-filter:\s*blur\(12px\);/);
      expect(rpgViewSrc).toMatch(/\.gm-drawer\s*\{[^}]*position:\s*absolute;[^}]*background:\s*rgba\(5,\s*14,\s*28,\s*0\.72\);[^}]*backdrop-filter:\s*blur\(12px\);/);
      expect(spaceViewSrc).toMatch(/\.gm-drawer\s*\{[^}]*position:\s*absolute;[^}]*background:\s*rgba\(5,\s*14,\s*28,\s*0\.72\);[^}]*backdrop-filter:\s*blur\(12px\);/);
    });
  });
});

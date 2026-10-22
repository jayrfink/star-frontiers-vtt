import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import router from '../src/router.js';
import { useAuthStore } from '../src/stores/auth.js';

describe('Router Dynamic Tab Titles', () => {
  beforeEach(async () => {
    if (typeof document === 'undefined') {
      globalThis.document = { title: '' };
    }
    setActivePinia(createPinia());
    document.title = 'Default';
  });

  it('sets document.title to SFVTT: Login on login route', async () => {
    await router.push('/login');
    expect(document.title).toBe('SFVTT: Login');
  });

  it('sets document.title to SFVTT: RPG VTT when navigating to authenticated dashboard route', async () => {
    const auth = useAuthStore();
    auth.user = { username: 'testuser', role: 'Player' };
    auth.checked = true;

    await router.push('/dashboard/rpg-vtt');
    expect(document.title).toBe('SFVTT: RPG VTT');
  });

  it('defines correct meta.title for all dashboard routes', () => {
    const routeMap = {
      'RpgVtt': 'RPG VTT',
      'SpaceVtt': 'Space VTT',
      'CharacterSheets': 'Character Sheets',
      'ShipSheets': 'Ship Sheets',
      'Rulebooks': 'Rulebooks',
      'GmNotes': 'GM Notes',
      'Admin': 'Admin',
    };

    const routes = router.getRoutes();
    for (const [name, expectedTitle] of Object.entries(routeMap)) {
      const route = routes.find((r) => r.name === name);
      expect(route, `Route ${name} should exist`).toBeDefined();
      expect(route.meta?.title).toBe(expectedTitle);
    }
  });

  it('requiresGm on GmNotes route and blocks non-GM navigation', async () => {
    const auth = useAuthStore();
    auth.user = { id: 2, username: 'player', role: 'Player' };
    auth.checked = true;

    await router.push('/dashboard/gm-notes');
    expect(router.currentRoute.value.path).not.toBe('/dashboard/gm-notes');
    expect(router.currentRoute.value.path).toBe('/dashboard/rpg-vtt');
  });

  it('allows GameMaster navigation to /dashboard/gm-notes', async () => {
    const auth = useAuthStore();
    auth.user = { id: 1, username: 'gm', role: 'GameMaster' };
    auth.checked = true;

    await router.push('/dashboard/gm-notes');
    expect(router.currentRoute.value.path).toBe('/dashboard/gm-notes');
    expect(document.title).toBe('SFVTT: GM Notes');
  });
});

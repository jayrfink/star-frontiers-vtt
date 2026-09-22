import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import NavBar from '../src/components/NavBar.vue';
import { useAuthStore } from '../src/stores/auth.js';

describe('NavBar.vue', () => {
  async function renderNavBar(userData = null) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore();
    if (userData) {
      auth.user = userData;
    }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/dashboard/rpg-vtt', component: { template: '<div />' } },
        { path: '/dashboard/space-vtt', component: { template: '<div />' } },
        { path: '/dashboard/character-sheets', component: { template: '<div />' } },
        { path: '/dashboard/ship-sheets', component: { template: '<div />' } },
        { path: '/dashboard/rulebooks', component: { template: '<div />' } },
        { path: '/dashboard/admin', component: { template: '<div />' } },
        { path: '/login', component: { template: '<div />' } },
      ]
    });
    const app = createSSRApp(NavBar);
    app.use(pinia);
    app.use(router);
    const html = await renderToString(app);
    return html;
  }

  it('renders SFVTT brand text without star icon', async () => {
    const html = await renderNavBar();
    expect(html).toContain('SFVTT');
    expect(html).not.toContain('⭐');
    expect(html).not.toContain('Star Frontiers VTT');
  });

  it('renders standard navigation tabs for all users', async () => {
    const html = await renderNavBar({ username: 'PlayerOne', role: 'Player' });
    expect(html).toContain('RPG VTT');
    expect(html).toContain('/dashboard/rpg-vtt');
    expect(html).toContain('Space VTT');
    expect(html).toContain('/dashboard/space-vtt');
    expect(html).toContain('Character Sheets');
    expect(html).toContain('/dashboard/character-sheets');
    expect(html).toContain('Ship Sheets');
    expect(html).toContain('/dashboard/ship-sheets');
    expect(html).toContain('Rulebooks');
    expect(html).toContain('/dashboard/rulebooks');
  });

  it('does not render Admin tab for non-GM users', async () => {
    const html = await renderNavBar({ username: 'PlayerOne', role: 'Player' });
    expect(html).not.toContain('Admin');
    expect(html).not.toContain('/dashboard/admin');
  });

  it('renders Admin tab for GameMaster users', async () => {
    const html = await renderNavBar({ username: 'GMUser', role: 'GameMaster' });
    expect(html).toContain('Admin');
    expect(html).toContain('/dashboard/admin');
  });

  it('renders user info, role badge, and logout button', async () => {
    const htmlGM = await renderNavBar({ username: 'TheGM', role: 'GameMaster' });
    expect(htmlGM).toContain('TheGM');
    expect(htmlGM).toContain('GM');
    expect(htmlGM).toContain('Logout');

    const htmlPlayer = await renderNavBar({ username: 'Cadet', role: 'Player' });
    expect(htmlPlayer).toContain('Cadet');
    expect(htmlPlayer).toContain('Player');
    expect(htmlPlayer).toContain('Logout');
  });
});

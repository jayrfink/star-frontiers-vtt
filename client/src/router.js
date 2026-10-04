import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
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
  history: typeof window !== 'undefined' ? createWebHistory() : createMemoryHistory(),
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

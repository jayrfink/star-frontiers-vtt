import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import { useAuthStore } from './stores/auth.js';
import { getUserState, saveUserState } from './utils/userState.js';
import LoginView from './views/LoginView.vue';
import DashboardView from './views/DashboardView.vue';
import RpgVttView from './views/RpgVttView.vue';
import SpaceVttView from './views/SpaceVttView.vue';
import CharacterSheetsView from './views/CharacterSheetsView.vue';
import ShipSheetsView from './views/ShipSheetsView.vue';
import RulebooksView from './views/RulebooksView.vue';
import AdminView from './views/AdminView.vue';

const ALLOWED_DASHBOARD_PATHS = [
  '/dashboard/rpg-vtt',
  '/dashboard/space-vtt',
  '/dashboard/character-sheets',
  '/dashboard/ship-sheets',
  '/dashboard/rulebooks',
  '/dashboard/admin',
];

const ALLOWED_DASHBOARD_NAMES = [
  'RpgVtt',
  'SpaceVtt',
  'CharacterSheets',
  'ShipSheets',
  'Rulebooks',
  'Admin',
];

function getSavedDashboardPath(user) {
  const defaultPath = '/dashboard/rpg-vtt';
  if (!user || user.id === undefined) return defaultPath;
  const { lastPath } = getUserState(user.id, 'navigation', { lastPath: defaultPath });
  if (!lastPath || typeof lastPath !== 'string' || !ALLOWED_DASHBOARD_PATHS.includes(lastPath)) {
    return defaultPath;
  }
  if (lastPath === '/dashboard/admin' && user.role !== 'GameMaster') {
    return defaultPath;
  }
  return lastPath;
}

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: LoginView, meta: { guest: true, title: 'Login' } },
  {
    path: '/dashboard',
    component: DashboardView,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: () => {
          const auth = useAuthStore();
          return getSavedDashboardPath(auth.user);
        },
      },
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
    next(getSavedDashboardPath(auth.user));
  } else if (requiresGm && auth.user?.role !== 'GameMaster') {
    next('/dashboard');
  } else {
    next();
  }
});

router.afterEach((to) => {
  const tabTitle = to.meta?.title;
  document.title = tabTitle ? `SFVTT: ${tabTitle}` : 'Star Frontiers VTT';
  try {
    const auth = useAuthStore();
    if (auth.user?.id !== undefined && ALLOWED_DASHBOARD_NAMES.includes(to.name)) {
      saveUserState(auth.user.id, 'navigation', { lastPath: to.path });
    }
  } catch {
    // Ignore if Pinia is not active
  }
});

export default router;

import { createRouter, createWebHistory } from 'vue-router';
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
  { path: '/login', name: 'Login', component: LoginView, meta: { guest: true } },
  {
    path: '/dashboard',
    component: DashboardView,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard/rpg-vtt' },
      { path: 'rpg-vtt', name: 'RpgVtt', component: RpgVttView },
      { path: 'space-vtt', name: 'SpaceVtt', component: SpaceVttView },
      { path: 'character-sheets', name: 'CharacterSheets', component: CharacterSheetsView },
      { path: 'ship-sheets', name: 'ShipSheets', component: ShipSheetsView },
      { path: 'rulebooks', name: 'Rulebooks', component: RulebooksView },
      { path: 'admin', name: 'Admin', component: AdminView, meta: { requiresAuth: true, requiresGm: true } },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
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

export default router;

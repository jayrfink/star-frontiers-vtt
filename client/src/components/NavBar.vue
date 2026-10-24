<template>
  <nav class="navbar">
    <div class="navbar-brand">SFVTT</div>
    <div class="navbar-tabs">
      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="tab"
        active-class="tab-active"
      >
        <svg
          v-if="tab.path === '/dashboard/space-vtt'"
          class="tab-icon-svg rocket-icon"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- Rocket Body -->
          <path
            d="M12 2.5C9.5 7 8 11.5 8 16h8c0-4.5-1.5-9-4-13.5z"
            fill="#1d4ed8"
          />
          <!-- Fins -->
          <path
            d="M8 13.5c-2.5 1-4.5 3-5 5.5 2 .5 4 0 5-2v-3.5zm8 0c2.5 1 4.5 3 5 5.5-2 .5-4 0-5-2v-3.5z"
            fill="#1e3a8a"
          />
          <!-- Engine Nozzle -->
          <path
            d="M10 16h4v2h-4z"
            fill="#1e3a8a"
          />
          <!-- Porthole Window -->
          <circle
            cx="12"
            cy="9"
            r="2"
            fill="#60a5fa"
          />
        </svg>
        <span v-else class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </router-link>
    </div>
    <div class="navbar-user">
      <span
        class="role-badge"
        :class="auth.user?.role === 'GameMaster' ? 'gm' : 'player'"
      >
        {{ auth.user?.role === 'GameMaster' ? 'GM' : 'Player' }}
      </span>
      <span class="username">{{ auth.user?.username }}</span>
      <button
        v-if="auth.isAuthenticated"
        class="change-password-btn"
        title="Change your password"
        @click="openPasswordModal"
      >
        🔑 Password
      </button>
      <button class="logout-btn" @click="handleLogout">Logout</button>
    </div>
    <ChangePasswordModal
      v-if="showPasswordModal"
      @close="showPasswordModal = false"
    />
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import ChangePasswordModal from './ChangePasswordModal.vue';

const auth = useAuthStore();
const router = useRouter();
const showPasswordModal = ref(false);

function openPasswordModal() {
  showPasswordModal.value = true;
}

defineExpose({
  showPasswordModal,
  openPasswordModal,
});

const baseTabs = [
  { path: '/dashboard/rpg-vtt', label: 'RPG VTT', icon: '🗺️' },
  { path: '/dashboard/space-vtt', label: 'Space VTT' },
  { path: '/dashboard/character-sheets', label: 'Character Sheets', icon: '📋' },
  { path: '/dashboard/ship-sheets', label: 'Ship Sheets', icon: '🛸' },
  { path: '/dashboard/rulebooks', label: 'Rulebooks', icon: '📖' },
];

const tabs = computed(() => {
  if (auth.user?.role === 'GameMaster') {
    return [
      ...baseTabs,
      { path: '/dashboard/gm-notes', label: 'GM Notes', icon: '📓' },
      { path: '/dashboard/admin', label: 'Admin', icon: '⚙️' },
    ];
  }
  return baseTabs;
});

async function handleLogout() {
  await auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  box-sizing: border-box;
  flex-shrink: 0;
  user-select: none;
}

.navbar-brand {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
  white-space: nowrap;
  flex-shrink: 0;
}

.navbar-tabs {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 4px;
  overflow-x: auto;
}

.tab {
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, text-shadow 0.15s;
}

.tab:hover {
  color: var(--text-primary);
}

.tab-active {
  color: var(--text-primary);
  border-bottom-color: var(--sci-cyan);
  text-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}

.tab-icon {
  margin-right: 6px;
  font-size: 14px;
}

.tab-icon-svg {
  margin-right: 6px;
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.username {
  font-size: 13px;
  color: var(--text-secondary);
}

.role-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.role-badge.gm {
  background: rgba(210, 153, 34, 0.2);
  color: #d29922;
  border: 1px solid rgba(210, 153, 34, 0.4);
}

.role-badge.player {
  background: rgba(63, 185, 80, 0.2);
  color: #3fb950;
  border: 1px solid rgba(63, 185, 80, 0.4);
}

.change-password-btn {
  padding: 4px 12px;
  font-size: 12px;
  background-color: #000000;
  border: 1px solid teal;
  color: teal;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.change-password-btn:hover {
  background-color: #051414;
  border-color: #00a8a8;
  color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
}

.logout-btn {
  padding: 4px 12px;
  font-size: 12px;
  background-color: #000000;
  border: 1px solid teal;
  color: teal;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.logout-btn:hover {
  background-color: #051414;
  border-color: #00a8a8;
  color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
}
</style>

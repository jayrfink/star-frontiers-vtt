<template>
  <nav class="navbar">
    <div class="navbar-brand">⭐ Star Frontiers VTT</div>
    <div class="navbar-user">
      <span class="role-badge" :class="auth.user?.role === 'GameMaster' ? 'gm' : 'player'">
        {{ auth.user?.role === 'GameMaster' ? 'GM' : 'Player' }}
      </span>
      <span class="username">{{ auth.user?.username }}</span>
      <button @click="handleLogout">Logout</button>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();

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
  padding: 12px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.navbar-brand {
  font-size: 18px;
  font-weight: 700;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
  color: var(--text-secondary);
}

.role-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 12px;
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
</style>

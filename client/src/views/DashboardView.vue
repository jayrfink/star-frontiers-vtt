<template>
  <div class="dashboard">
    <NavBar />
    <div class="tab-bar">
      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="tab"
        active-class="tab-active"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </router-link>
    </div>
    <main class="dashboard-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import NavBar from '../components/NavBar.vue';

const tabs = [
  { path: '/dashboard/rpg-vtt', label: 'RPG VTT', icon: '🗺️' },
  { path: '/dashboard/space-vtt', label: 'Space VTT', icon: '🚀' },
  { path: '/dashboard/character-sheets', label: 'Character Sheets', icon: '📋' },
  { path: '/dashboard/ship-sheets', label: 'Ship Sheets', icon: '🛸' },
  { path: '/dashboard/rulebooks', label: 'Rulebooks', icon: '📖' },
];
</script>

<style scoped>
.dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-bar {
  display: flex;
  gap: 0;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
  overflow-x: auto;
}

.tab {
  padding: 12px 20px;
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
}

.tab:hover {
  color: var(--text-primary);
}

.tab-active {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
}

.tab-icon {
  margin-right: 6px;
}

.dashboard-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>

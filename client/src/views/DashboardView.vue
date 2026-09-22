<template>
  <div class="dashboard">
    <NavBar />
    <main class="dashboard-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import NavBar from '../components/NavBar.vue';
</script>

<style scoped>
.dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dashboard-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>

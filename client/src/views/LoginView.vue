<template>
  <div class="login-page">
    <div class="login-card">
      <h1>⭐ Star Frontiers VTT</h1>
      <p class="subtitle">{{ isRegister ? 'Create your account' : 'Sign in to continue' }}</p>
      <AuthForm
        :mode="isRegister ? 'register' : 'login'"
        @submit="handleAuth"
      />
      <p class="toggle">
        {{ isRegister ? 'Already have an account?' : "Don't have an account?" }}
        <a href="#" @click.prevent="isRegister = !isRegister">
          {{ isRegister ? 'Sign in' : 'Create one' }}
        </a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import AuthForm from '../components/AuthForm.vue';

const auth = useAuthStore();
const router = useRouter();
const isRegister = ref(false);

async function handleAuth({ username, password }) {
  if (isRegister.value) {
    await auth.register(username, password);
  } else {
    await auth.login(username, password);
  }
  router.push('/dashboard');
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.login-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

h1 {
  font-size: 24px;
  font-weight: 700;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.toggle {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>

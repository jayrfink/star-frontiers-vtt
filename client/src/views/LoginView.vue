<template>
  <div class="login-page">
    <div class="login-card">
      <h1>⭐ Star Frontiers VTT</h1>
      <p class="subtitle">{{ isRegister ? 'Create your account' : 'Sign in to continue' }}</p>
      <AuthForm
        :mode="isRegister ? 'register' : 'login'"
        :error="error"
        :loading="loading"
        @submit="handleAuth"
      />
      <p class="toggle">
        {{ isRegister ? 'Already have an account?' : "Don't have an account?" }}
        <a href="#" @click.prevent="toggleMode">
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
const error = ref('');
const loading = ref(false);

function toggleMode() {
  isRegister.value = !isRegister.value;
  error.value = '';
}

async function handleAuth({ username, password }) {
  error.value = '';
  loading.value = true;
  try {
    if (isRegister.value) {
      await auth.register(username, password);
    } else {
      await auth.login(username, password);
    }
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message || 'An error occurred during authentication.';
  } finally {
    loading.value = false;
  }
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

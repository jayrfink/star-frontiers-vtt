<template>
  <form class="auth-form" @submit.prevent="onSubmit">
    <div class="form-group">
      <label for="username">Username</label>
      <input
        id="username"
        v-model="username"
        type="text"
        autocomplete="username"
        required
      />
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input
        id="password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        minlength="6"
        required
      />
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <button type="submit" class="primary" :disabled="loading">
      {{ loading ? 'Please wait...' : (mode === 'register' ? 'Create Account' : 'Log In') }}
    </button>
  </form>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  mode: { type: String, default: 'login' },
});

const emit = defineEmits(['submit']);

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await emit('submit', { username: username.value, password: password.value });
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 360px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
}

.error {
  color: var(--danger);
  font-size: 13px;
}
</style>

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const checked = ref(false);
  const requiresSetup = ref(false);
  const isAuthenticated = computed(() => !!user.value);

  async function checkSetup() {
    try {
      const res = await fetch('/api/auth/setup');
      if (res.ok) {
        const data = await res.json();
        requiresSetup.value = !!data.requiresSetup;
        return data;
      }
    } catch (err) {
      console.error('Failed to check setup status:', err);
    }
    return { requiresSetup: requiresSetup.value };
  }

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        user.value = await res.json();
      } else {
        user.value = null;
      }
    } catch {
      user.value = null;
    }
    checked.value = true;
  }

  async function login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    user.value = await res.json();
  }

  async function register(username, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Registration failed');
    }
    await login(username, password);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    user.value = null;
    checked.value = false;
  }

  return { user, checked, requiresSetup, isAuthenticated, fetchUser, login, register, logout, checkSetup };
});

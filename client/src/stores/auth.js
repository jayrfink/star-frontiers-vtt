import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { socket } from '../services/socket.js';

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
        if (socket && !socket.connected) {
          socket.connect();
        }
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
    if (socket && !socket.connected) {
      socket.connect();
    }
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
    if (socket && socket.connected) {
      socket.disconnect();
    }
  }

  async function changePassword(currentPassword, newPassword) {
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update password');
    }
    return data;
  }

  return { user, checked, requiresSetup, isAuthenticated, fetchUser, login, register, logout, checkSetup, changePassword };
});

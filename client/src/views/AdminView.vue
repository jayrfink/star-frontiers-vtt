<template>
  <div class="admin-container">
    <header class="admin-header">
      <h2>⚙️ System Administration</h2>
      <p class="subtitle">Manage user accounts, roles, and access permissions.</p>
    </header>

    <!-- Feedback Banners -->
    <div v-if="error" class="alert alert-error">
      <span>{{ error }}</span>
      <button class="alert-close" @click="error = ''">✕</button>
    </div>
    <div v-if="successMessage" class="alert alert-success">
      <span>{{ successMessage }}</span>
      <button class="alert-close" @click="successMessage = ''">✕</button>
    </div>

    <!-- Create User Card -->
    <section class="admin-card">
      <h3>Create New User</h3>
      <form class="create-user-form" @submit.prevent="createUser">
        <div class="form-row">
          <div class="form-group">
            <label for="new-username">Username</label>
            <input
              id="new-username"
              v-model.trim="newUsername"
              type="text"
              required
              placeholder="Username"
              autocomplete="off"
            />
          </div>
          <div class="form-group">
            <label for="new-password">Password</label>
            <input
              id="new-password"
              v-model="newPassword"
              type="password"
              minlength="6"
              required
              placeholder="Min 6 characters"
              autocomplete="new-password"
            />
          </div>
          <div class="form-group">
            <label for="new-role">Role</label>
            <select id="new-role" v-model="newRole" class="role-select">
              <option value="Player">Player</option>
              <option value="GameMaster">GameMaster</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="primary" :disabled="creating">
            {{ creating ? 'Creating...' : '+ Create User' }}
          </button>
        </div>
      </form>
    </section>

    <!-- Existing Users Card -->
    <section class="admin-card">
      <div class="card-header-row">
        <h3>Existing Users</h3>
        <button class="btn-secondary" @click="fetchUsers" :disabled="loading">
          {{ loading ? 'Refreshing...' : '↻ Refresh' }}
        </button>
      </div>

      <div v-if="loading && users.length === 0" class="loading-state">
        Loading users...
      </div>
      <div v-else-if="users.length === 0" class="empty-state">
        No users found.
      </div>
      <div v-else class="table-wrapper">
        <table class="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td class="col-id">#{{ user.id }}</td>
              <td class="col-username">
                <span class="user-name-text">{{ user.username }}</span>
                <span v-if="user.id === auth.user?.id" class="current-badge">(You)</span>
              </td>
              <td>
                <span
                  class="role-badge"
                  :class="user.role === 'GameMaster' ? 'gm' : 'player'"
                >
                  {{ user.role === 'GameMaster' ? 'GM' : 'Player' }}
                </span>
              </td>
              <td class="actions-cell">
                <button
                  class="btn-secondary btn-small"
                  title="Reset password for this user"
                  @click="resetPassword(user)"
                >
                  Reset Password
                </button>
                <button
                  class="btn-danger btn-small"
                  title="Delete user"
                  @click="deleteUser(user)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();

const users = ref([]);
const loading = ref(false);
const creating = ref(false);
const error = ref('');
const successMessage = ref('');

const newUsername = ref('');
const newPassword = ref('');
const newRole = ref('Player');

async function fetchUsers() {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/auth/users', { credentials: 'include' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to retrieve users');
    }
    users.value = await res.json();
  } catch (err) {
    error.value = err.message || 'Failed to load users';
  } finally {
    loading.value = false;
  }
}

async function createUser() {
  if (!newUsername.value || !newPassword.value) {
    error.value = 'Username and password are required';
    return;
  }
  if (newPassword.value.length < 6) {
    error.value = 'Password must be at least 6 characters';
    return;
  }

  creating.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: newUsername.value,
        password: newPassword.value,
        role: newRole.value,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create user');
    }

    successMessage.value = `User "${data.username}" created successfully as ${data.role}.`;
    newUsername.value = '';
    newPassword.value = '';
    newRole.value = 'Player';
    await fetchUsers();
  } catch (err) {
    error.value = err.message || 'Failed to create user';
  } finally {
    creating.value = false;
  }
}

async function resetPassword(user) {
  const newPass = window.prompt(`Enter new password for "${user.username}" (minimum 6 characters):`);
  if (newPass === null) return; // user cancelled

  if (!newPass || newPass.length < 6) {
    error.value = 'Password must be at least 6 characters';
    return;
  }

  error.value = '';
  successMessage.value = '';

  try {
    const res = await fetch(`/api/auth/users/${user.id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password: newPass }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update password');
    }

    successMessage.value = `Password for user "${user.username}" updated successfully.`;
  } catch (err) {
    error.value = err.message || 'Failed to update password';
  }
}

async function deleteUser(user) {
  if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
    return;
  }

  error.value = '';
  successMessage.value = '';

  try {
    const res = await fetch(`/api/auth/users/${user.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete user');
    }

    successMessage.value = `User "${user.username}" deleted successfully.`;
    users.value = users.value.filter((u) => u.id !== user.id);
  } catch (err) {
    error.value = err.message || 'Failed to delete user';
  }
}

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.admin-container {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-header h2 {
  font-size: 22px;
  margin-bottom: 4px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.alert {
  padding: 12px 16px;
  border-radius: var(--radius);
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-error {
  background: rgba(248, 81, 73, 0.15);
  border: 1px solid rgba(248, 81, 73, 0.4);
  color: var(--danger);
}

.alert-success {
  background: rgba(63, 185, 80, 0.15);
  border: 1px solid rgba(63, 185, 80, 0.4);
  color: var(--success);
}

.alert-close {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 14px;
  padding: 0 4px;
  cursor: pointer;
}

.admin-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
}

.admin-card h3 {
  font-size: 16px;
  margin-bottom: 16px;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header-row h3 {
  margin-bottom: 0;
}

.create-user-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 140px;
  gap: 12px;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
}

.role-select,
.role-select option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
}

.role-select {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 14px;
  height: 38px;
}

.role-select:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.loading-state,
.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.table-wrapper {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.users-table th,
.users-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.users-table th {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.col-id {
  width: 60px;
  color: var(--text-secondary);
  font-family: monospace;
}

.col-username {
  font-weight: 500;
}

.current-badge {
  margin-left: 8px;
  font-size: 11px;
  color: var(--text-secondary);
  font-style: italic;
}

.role-badge {
  display: inline-block;
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

.actions-header {
  text-align: right !important;
}

.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-small {
  padding: 4px 10px;
  font-size: 12px;
}

.btn-secondary {
  background-color: #000000 !important;
  background: #000000 !important;
  color: teal !important;
  -webkit-text-fill-color: teal;
  border: 1px solid teal !important;
  font-weight: 600;
  transition: all 0.15s ease-in-out;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #051414 !important;
  border-color: #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
}

.btn-danger {
  background-color: #340c0e !important;
  color: #f85149 !important;
  -webkit-text-fill-color: #f85149;
  border: 1px solid #da3633 !important;
  border-radius: var(--radius);
  cursor: pointer;
  box-shadow: 0 0 6px rgba(218, 54, 51, 0.25);
  transition: all 0.15s ease-in-out;
}

.btn-danger:hover:not(:disabled) {
  background-color: #4a1316 !important;
  border-color: #ff6b6b !important;
  color: #ff8585 !important;
  -webkit-text-fill-color: #ff8585;
  box-shadow: 0 0 10px rgba(248, 81, 73, 0.45);
}
</style>

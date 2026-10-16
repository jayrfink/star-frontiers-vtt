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

    <!-- Uploads & Assets Manager Card -->
    <section class="admin-card">
      <div class="card-header-row">
        <h3>Uploads &amp; Assets Manager</h3>
        <div class="header-actions">
          <button class="btn-secondary" @click="createFolder">
            + New Folder
          </button>
          <button class="btn-secondary" @click="triggerUploadInput" :disabled="uploading">
            {{ uploading ? 'Uploading...' : 'Upload File Here' }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            class="hidden-file-input"
            @change="handleFileUpload"
          />
          <button class="btn-secondary" @click="fetchFiles" :disabled="loadingFiles">
            {{ loadingFiles ? 'Refreshing...' : '↻ Refresh' }}
          </button>
        </div>
      </div>

      <!-- Breadcrumbs Bar -->
      <nav class="breadcrumbs-bar" aria-label="Breadcrumb">
        <span class="breadcrumb-label">Path:</span>
        <ol class="breadcrumbs-list">
          <li v-for="(crumb, idx) in breadcrumbs" :key="crumb.path" class="breadcrumb-item">
            <span v-if="idx > 0" class="breadcrumb-separator">/</span>
            <button
              type="button"
              class="breadcrumb-btn"
              :class="{ active: currentFolder === crumb.path }"
              @click="navigateToFolder(crumb.path)"
            >
              {{ crumb.name }}
            </button>
          </li>
        </ol>
      </nav>

      <!-- Search Row -->
      <div class="search-row">
        <input
          v-model.trim="searchQuery"
          type="text"
          class="search-input token-search-input"
          placeholder="Search files and folders in current directory..."
        />
      </div>

      <div v-if="loadingFiles && files.length === 0" class="loading-state">
        Loading files and folders...
      </div>
      <div
        v-else-if="filteredSubfolders.length === 0 && filteredFiles.length === 0 && !currentFolder"
        class="empty-state"
      >
        {{ searchQuery ? 'No files or folders matching search.' : 'This folder is empty.' }}
      </div>
      <div
        v-else-if="filteredSubfolders.length === 0 && filteredFiles.length === 0 && currentFolder"
        class="table-wrapper"
      >
        <table class="assets-table tokens-table">
          <thead>
            <tr>
              <th class="col-preview">Type</th>
              <th>Name</th>
              <th>Size</th>
              <th>Modified / Items</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr class="folder-row folder-up-row" @click="goUpOneLevel">
              <td class="col-preview"><span class="folder-icon">📁</span></td>
              <td colspan="3" class="col-name">
                <span class="folder-name-link">.. (Go up one level)</span>
              </td>
              <td class="actions-cell">
                <button class="btn-secondary btn-small" @click.stop="goUpOneLevel">
                  Up
                </button>
              </td>
            </tr>
            <tr>
              <td colspan="5" class="empty-state-cell">
                {{ searchQuery ? 'No files or folders matching search.' : 'This folder is empty.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="table-wrapper">
        <table class="assets-table tokens-table">
          <thead>
            <tr>
              <th class="col-preview">Type</th>
              <th>Name</th>
              <th>Size</th>
              <th>Modified / Items</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Up one level row if inside a subfolder -->
            <tr v-if="currentFolder" class="folder-row folder-up-row" @click="goUpOneLevel">
              <td class="col-preview"><span class="folder-icon">📁</span></td>
              <td colspan="3" class="col-name">
                <span class="folder-name-link">.. (Go up one level)</span>
              </td>
              <td class="actions-cell">
                <button class="btn-secondary btn-small" @click.stop="goUpOneLevel">
                  Up
                </button>
              </td>
            </tr>

            <!-- Subfolders -->
            <tr
              v-for="subfolder in filteredSubfolders"
              :key="'folder-' + subfolder.path"
              class="folder-row"
              @click="navigateToFolder(subfolder.path)"
            >
              <td class="col-preview"><span class="folder-icon">📁</span></td>
              <td class="col-name">
                <span class="folder-name-link">{{ subfolder.name }}/</span>
              </td>
              <td class="col-size">
                <span class="asset-meta">—</span>
              </td>
              <td class="col-meta">
                <span class="asset-meta">
                  {{ subfolder.count === 1 ? '1 item' : `${subfolder.count} items` }}
                </span>
              </td>
              <td class="actions-cell">
                <button
                  class="btn-danger btn-small"
                  :disabled="subfolder.count > 0"
                  :title="subfolder.count > 0 ? 'Folder must be empty to delete' : 'Delete folder'"
                  @click.stop="deleteFolder(subfolder)"
                >
                  Delete Folder
                </button>
              </td>
            </tr>

            <!-- Files -->
            <tr v-for="file in filteredFiles" :key="'file-' + file.relativePath" class="file-row">
              <td class="col-preview">
                <img
                  v-if="isImageFile(file.name)"
                  :src="file.url"
                  :alt="file.name"
                  class="file-thumb token-thumb"
                />
                <span v-else class="file-icon">📄</span>
              </td>
              <td class="col-filename">
                <span class="file-name-text token-name-text">{{ file.name }}</span>
              </td>
              <td class="col-size">
                <span class="asset-meta token-meta">{{ formatFileSize(file.size) }}</span>
              </td>
              <td class="col-date">
                <span class="asset-meta token-meta">{{ formatDate(file.mtime) }}</span>
              </td>
              <td class="actions-cell">
                <button
                  class="btn-secondary btn-small"
                  title="Rename file"
                  @click="renameFile(file)"
                >
                  Rename
                </button>
                <button
                  class="btn-secondary btn-small"
                  title="Move file"
                  @click="openMoveModal(file)"
                >
                  Move
                </button>
                <button
                  class="btn-danger btn-small"
                  title="Delete file"
                  @click="deleteFile(file)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Move File Modal -->
    <div v-if="moveModalOpen" class="modal-overlay" @click.self="closeMoveModal">
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="move-modal-title">
        <div class="modal-header">
          <h4 id="move-modal-title">Move File</h4>
          <button class="modal-close" @click="closeMoveModal">✕</button>
        </div>
        <div class="modal-body">
          <p class="move-target-info">
            Moving: <strong class="move-filename">{{ fileToMove?.name }}</strong>
          </p>
          <div class="form-group">
            <label for="move-destination">Destination Folder</label>
            <select
              id="move-destination"
              v-model="destinationFolder"
              class="folder-select role-select"
            >
              <option
                v-for="folder in availableDestinationFolders"
                :key="folder"
                :value="folder"
                :disabled="folder === (fileToMove?.folder || '')"
              >
                {{ folder === '' ? 'Root (uploads/)' : folder }}{{ folder === (fileToMove?.folder || '') ? ' (current)' : '' }}
              </option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary btn-small" @click="closeMoveModal" :disabled="moving">
            Cancel
          </button>
          <button
            class="primary btn-small"
            @click="confirmMove"
            :disabled="moving || (!destinationFolder && destinationFolder !== '') || destinationFolder === (fileToMove?.folder || '')"
          >
            {{ moving ? 'Moving...' : 'Move File' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();

// User management state
const users = ref([]);
const loading = ref(false);
const creating = ref(false);
const error = ref('');
const successMessage = ref('');

const newUsername = ref('');
const newPassword = ref('');
const newRole = ref('Player');

// Uploads & Assets File Manager state
const files = ref([]);
const allFolders = ref([]);
const currentFolder = ref('');
const loadingFiles = ref(false);
const searchQuery = ref('');
const uploading = ref(false);
const fileInputRef = ref(null);

// Move modal state
const moveModalOpen = ref(false);
const fileToMove = ref(null);
const destinationFolder = ref('');
const moving = ref(false);

// Computed breadcrumbs
const breadcrumbs = computed(() => {
  const crumbs = [{ name: 'uploads', path: '' }];
  if (!currentFolder.value) return crumbs;
  const parts = currentFolder.value.split('/').filter(Boolean);
  let cumulative = '';
  for (const part of parts) {
    cumulative = cumulative ? `${cumulative}/${part}` : part;
    crumbs.push({ name: part, path: cumulative });
  }
  return crumbs;
});

// Computed direct subfolders in current folder
const immediateSubfolders = computed(() => {
  const folderSet = new Set(allFolders.value || []);
  (files.value || []).forEach((f) => {
    if (f.folder) folderSet.add(f.folder);
  });

  const currentPrefix = currentFolder.value ? `${currentFolder.value}/` : '';
  const prefixLen = currentPrefix.length;
  const subfolderMap = new Map();

  for (const f of folderSet) {
    if (!f || f === currentFolder.value) continue;
    let immediateName = '';
    let fullSubPath = '';

    if (currentPrefix === '') {
      const slashIdx = f.indexOf('/');
      immediateName = slashIdx === -1 ? f : f.substring(0, slashIdx);
      fullSubPath = immediateName;
    } else if (f.startsWith(currentPrefix)) {
      const remainder = f.slice(prefixLen);
      const slashIdx = remainder.indexOf('/');
      immediateName = slashIdx === -1 ? remainder : remainder.substring(0, slashIdx);
      fullSubPath = `${currentPrefix}${immediateName}`;
    }

    if (immediateName && !subfolderMap.has(fullSubPath)) {
      const fileCount = (files.value || []).filter(
        (file) => file.folder === fullSubPath || (file.folder && file.folder.startsWith(`${fullSubPath}/`))
      ).length;
      const subDirCount = Array.from(folderSet).filter(
        (folder) => folder !== fullSubPath && folder.startsWith(`${fullSubPath}/`)
      ).length;
      const count = fileCount + subDirCount;

      subfolderMap.set(fullSubPath, {
        name: immediateName,
        path: fullSubPath,
        count,
      });
    }
  }

  return Array.from(subfolderMap.values()).sort((a, b) => a.name.localeCompare(b.name));
});

// Filtered subfolders by search query
const filteredSubfolders = computed(() => {
  if (!searchQuery.value) return immediateSubfolders.value;
  const q = searchQuery.value.toLowerCase();
  return immediateSubfolders.value.filter((sub) => sub.name.toLowerCase().includes(q));
});

// Computed direct files in current folder
const currentFiles = computed(() => {
  if (!files.value || !Array.isArray(files.value)) return [];
  const curr = currentFolder.value || '';
  return files.value.filter((file) => (file.folder || '') === curr);
});

// Filtered files by search query
const filteredFiles = computed(() => {
  if (!searchQuery.value) return currentFiles.value;
  const q = searchQuery.value.toLowerCase();
  return currentFiles.value.filter((f) => f.name && f.name.toLowerCase().includes(q));
});

// Available destination folders for move modal
const availableDestinationFolders = computed(() => {
  const set = new Set(allFolders.value || []);
  set.add('');
  (files.value || []).forEach((f) => {
    if (f.folder) set.add(f.folder);
  });
  const arr = Array.from(set);
  return arr.sort((a, b) => {
    if (a === '') return -1;
    if (b === '') return 1;
    return a.localeCompare(b);
  });
});

// Backward compatibility references
const tokens = computed(() => files.value);
const loadingTokens = computed(() => loadingFiles.value);

// Navigation functions
function navigateToFolder(path) {
  currentFolder.value = path || '';
}

function goUpOneLevel() {
  if (!currentFolder.value) return;
  const idx = currentFolder.value.lastIndexOf('/');
  if (idx === -1) {
    currentFolder.value = '';
  } else {
    currentFolder.value = currentFolder.value.slice(0, idx);
  }
}

// User management API functions
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
  if (newPass === null) return;

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

// Uploads & Assets API functions
async function fetchFiles() {
  loadingFiles.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/upload/files', { credentials: 'include' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to retrieve uploads');
    }
    const data = await res.json();
    files.value = Array.isArray(data.files) ? data.files : [];
    allFolders.value = Array.isArray(data.folders) ? data.folders : [];
  } catch (err) {
    error.value = err.message || 'Failed to load uploads';
  } finally {
    loadingFiles.value = false;
  }
}

const fetchTokens = fetchFiles;

function triggerUploadInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

async function handleFileUpload(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  uploading.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolder.value) {
      formData.append('folder', currentFolder.value);
    }

    const res = await fetch('/api/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload file');
    }

    successMessage.value = `File "${file.name}" uploaded successfully.`;
    await fetchFiles();
  } catch (err) {
    error.value = err.message || 'Failed to upload file';
  } finally {
    uploading.value = false;
    if (event.target) {
      event.target.value = '';
    }
  }
}

async function createFolder() {
  const folderName = window.prompt('Enter new folder name:');
  if (folderName === null) return;
  const trimmed = folderName.trim();
  if (!trimmed) return;

  const targetPath = currentFolder.value ? `${currentFolder.value}/${trimmed}` : trimmed;

  error.value = '';
  successMessage.value = '';
  try {
    const res = await fetch('/api/upload/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ folder: targetPath }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create folder');
    }

    successMessage.value = `Folder "${trimmed}" created successfully.`;
    await fetchFiles();
  } catch (err) {
    error.value = err.message || 'Failed to create folder';
  }
}

async function deleteFolder(folder) {
  if (folder.count > 0) {
    error.value = 'Cannot delete non-empty folder';
    return;
  }

  if (!window.confirm(`Are you sure you want to delete folder "${folder.name}"?`)) {
    return;
  }

  error.value = '';
  successMessage.value = '';
  try {
    const res = await fetch(`/api/upload/folder?folder=${encodeURIComponent(folder.path)}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete folder');
    }

    successMessage.value = `Folder "${folder.name}" deleted successfully.`;
    await fetchFiles();
  } catch (err) {
    error.value = err.message || 'Failed to delete folder';
  }
}

async function renameFile(file) {
  const newName = window.prompt(`Enter new filename for "${file.name}":`, file.name);
  if (newName === null) return;
  const trimmed = newName.trim();
  if (!trimmed || trimmed === file.name) return;

  error.value = '';
  successMessage.value = '';

  try {
    const res = await fetch('/api/upload/rename', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        oldPath: file.relativePath,
        newName: trimmed,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to rename file');
    }

    successMessage.value = `File renamed to "${trimmed}" successfully.`;
    await fetchFiles();
  } catch (err) {
    error.value = err.message || 'Failed to rename file';
  }
}

const renameToken = renameFile;

async function deleteFile(file) {
  if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
    return;
  }

  error.value = '';
  successMessage.value = '';

  try {
    const res = await fetch(`/api/upload/file?path=${encodeURIComponent(file.relativePath)}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete file');
    }

    successMessage.value = `File "${file.name}" deleted successfully.`;
    files.value = files.value.filter((f) => f.relativePath !== file.relativePath);
  } catch (err) {
    error.value = err.message || 'Failed to delete file';
  }
}

const deleteToken = deleteFile;

function openMoveModal(file) {
  fileToMove.value = file;
  const current = file.folder || '';
  const firstValid = availableDestinationFolders.value.find((f) => f !== current);
  destinationFolder.value = firstValid !== undefined ? firstValid : '';
  moveModalOpen.value = true;
}

function closeMoveModal() {
  moveModalOpen.value = false;
  fileToMove.value = null;
  destinationFolder.value = '';
}

async function confirmMove() {
  if (!fileToMove.value) return;
  moving.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    const res = await fetch('/api/upload/move', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        sourcePath: fileToMove.value.relativePath,
        destinationFolder: destinationFolder.value,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to move file');
    }

    successMessage.value = `File "${fileToMove.value.name}" moved successfully.`;
    closeMoveModal();
    await fetchFiles();
  } catch (err) {
    error.value = err.message || 'Failed to move file';
  } finally {
    moving.value = false;
  }
}

function formatFileSize(bytes) {
  if (!bytes || typeof bytes !== 'number') return '0 KB';
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString();
}

function isImageFile(filename) {
  if (!filename) return false;
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(filename);
}

onMounted(() => {
  fetchUsers();
  fetchFiles();
});

defineExpose({
  // Uploads File Manager state & methods
  files,
  allFolders,
  currentFolder,
  loadingFiles,
  searchQuery,
  breadcrumbs,
  immediateSubfolders,
  filteredSubfolders,
  currentFiles,
  filteredFiles,
  availableDestinationFolders,
  navigateToFolder,
  goUpOneLevel,
  createFolder,
  deleteFolder,
  renameFile,
  deleteFile,
  openMoveModal,
  closeMoveModal,
  confirmMove,
  moveModalOpen,
  fileToMove,
  destinationFolder,
  moving,
  handleFileUpload,
  triggerUploadInput,
  fetchFiles,
  formatFileSize,
  formatDate,
  isImageFile,

  // Backward compatibility
  tokens,
  loadingTokens,
  tokenSearchQuery: searchQuery,
  filteredTokens: filteredFiles,
  fetchTokens,
  renameToken,
  deleteToken,

  // User Management
  users,
  loading,
  creating,
  newUsername,
  newPassword,
  newRole,
  fetchUsers,
  createUser,
  resetPassword,
  deleteUser,
  error,
  successMessage,
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
  flex-wrap: wrap;
  gap: 10px;
}

.card-header-row h3 {
  margin-bottom: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.hidden-file-input {
  display: none;
}

.breadcrumbs-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  background: rgba(0, 0, 0, 0.35);
  padding: 8px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.breadcrumb-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.breadcrumbs-list {
  display: flex;
  align-items: center;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.breadcrumb-separator {
  color: var(--text-secondary);
  font-size: 13px;
  user-select: none;
}

.breadcrumb-btn {
  background: transparent;
  border: none;
  color: aqua;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: inherit;
  transition: background 0.15s ease-in-out;
}

.breadcrumb-btn:hover:not(.active) {
  text-decoration: underline;
  background: rgba(0, 255, 255, 0.1);
}

.breadcrumb-btn.active {
  font-weight: 700;
  color: #ffffff;
  cursor: default;
  text-decoration: none;
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

.users-table,
.assets-table,
.tokens-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.users-table th,
.users-table td,
.assets-table th,
.assets-table td,
.tokens-table th,
.tokens-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.users-table th,
.assets-table th,
.tokens-table th {
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

.search-row {
  margin-bottom: 16px;
}

.search-input,
.token-search-input {
  width: 100%;
  padding: 8px 12px;
  background-color: #000000;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 14px;
  box-sizing: border-box;
}

.search-input:focus,
.token-search-input:focus {
  outline: none;
  border-color: aqua;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.col-preview {
  width: 50px;
  text-align: center;
}

.file-thumb,
.token-thumb {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(0, 255, 255, 0.4);
  background: #000;
  display: block;
  margin: 0 auto;
}

.file-icon {
  font-size: 22px;
  display: block;
  text-align: center;
}

.folder-icon {
  font-size: 20px;
  display: block;
  text-align: center;
}

.folder-row {
  cursor: pointer;
}

.folder-row:hover {
  background-color: rgba(0, 255, 255, 0.04);
}

.folder-name-link {
  color: aqua;
  font-weight: 600;
}

.folder-up-row .folder-name-link {
  color: var(--text-secondary);
}

.folder-row:hover .folder-name-link {
  text-decoration: underline;
}

.file-name-text,
.token-name-text {
  font-weight: 500;
  word-break: break-all;
}

.asset-meta,
.token-meta {
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.empty-state-cell {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid aqua;
  border-radius: 8px;
  width: 440px;
  max-width: 90vw;
  padding: 20px;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.25);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}

.modal-header h4 {
  margin: 0;
  font-size: 16px;
  color: aqua;
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}

.modal-close:hover {
  color: #fff;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.move-target-info {
  font-size: 14px;
  margin: 0;
}

.move-filename {
  color: aqua;
  word-break: break-all;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
</style>

<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="closeModal">
    <div class="modal-card image-browser-card">
      <!-- Header -->
      <div class="modal-header">
        <h3 class="modal-title">{{ title }}</h3>
        <button class="btn-close" title="Close" @click="closeModal">✕</button>
      </div>

      <!-- Toolbar: Breadcrumbs, Back, Upload Button -->
      <div class="browser-toolbar">
        <div class="breadcrumb-container">
          <button
            v-if="isInSubfolder"
            class="btn-nav btn-back"
            title="Go to parent directory"
            @click="goUp"
          >
            ← Back
          </button>
          <nav class="breadcrumbs" aria-label="Folder Navigation">
            <template v-for="(crumb, idx) in breadcrumbs" :key="crumb.path">
              <span
                class="crumb-link"
                :class="{ active: idx === breadcrumbs.length - 1 }"
                @click="navigateToFolder(crumb.path)"
              >
                {{ crumb.name }}
              </span>
              <span v-if="idx < breadcrumbs.length - 1" class="crumb-separator">&gt;</span>
            </template>
          </nav>
        </div>

        <div class="toolbar-actions">
          <input
            type="file"
            ref="fileInput"
            class="hidden-file-input"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            @change="handleUpload"
          />
          <button
            class="btn-primary-action btn-upload"
            :disabled="uploading"
            @click="$refs.fileInput.click()"
          >
            {{ uploading ? 'Uploading...' : '+ Upload New Image' }}
          </button>
        </div>
      </div>

      <!-- Search Input -->
      <div class="search-bar-wrap">
        <input
          type="text"
          v-model="searchQuery"
          class="input-search"
          placeholder="Search images by filename..."
        />
        <button
          v-if="searchQuery"
          class="btn-clear-search"
          title="Clear search"
          @click="searchQuery = ''"
        >
          ✕
        </button>
      </div>

      <!-- Gallery Grid Area -->
      <div class="gallery-container">
        <div v-if="loading" class="state-message loading-state">
          Loading images...
        </div>
        <div v-else-if="errorMessage" class="state-message error-state">
          {{ errorMessage }}
        </div>
        <div
          v-else-if="immediateSubfolders.length === 0 && filteredFiles.length === 0"
          class="state-message empty-state"
        >
          No images or folders found.
        </div>
        <div v-else class="gallery-grid">
          <!-- Folder Cards -->
          <div
            v-for="subfolder in immediateSubfolders"
            :key="'folder-' + subfolder.path"
            class="grid-item folder-card"
            @click="navigateToFolder(subfolder.path)"
            :title="'Open folder: ' + subfolder.name"
          >
            <div class="folder-icon">📁</div>
            <div class="folder-name">{{ subfolder.name }}</div>
          </div>

          <!-- Image File Cards -->
          <div
            v-for="file in filteredFiles"
            :key="'file-' + file.relativePath"
            class="grid-item image-card"
            :class="{ selected: selectedUrl === file.url }"
            @click="selectImage(file)"
            @dblclick="handleDoubleClick(file)"
            :title="file.name"
          >
            <div class="thumbnail-wrap">
              <img :src="file.url" :alt="file.name" class="thumbnail-img" loading="lazy" />
            </div>
            <div class="image-name" :title="file.name">{{ file.name }}</div>
          </div>
        </div>
      </div>

      <!-- Footer Area -->
      <div class="modal-footer">
        <div class="selected-info">
          <span v-if="selectedUrl" class="selected-text" :title="selectedUrl">
            Selected: <span class="selected-path">{{ selectedUrl }}</span>
          </span>
          <span v-else class="selected-none">No image selected</span>
        </div>
        <div class="footer-buttons">
          <button class="btn-footer-cancel" @click="closeModal">Cancel</button>
          <button
            class="btn-footer-use"
            :disabled="!selectedUrl"
            @click="confirmSelection"
          >
            Use Image
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ImageBrowserModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: 'Select Token / Portrait Image',
    },
    currentImage: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'select'],
  data() {
    return {
      files: [],
      folders: [''],
      currentFolder: '',
      searchQuery: '',
      selectedUrl: this.currentImage || '',
      loading: false,
      uploading: false,
      errorMessage: '',
    };
  },
  watch: {
    modelValue(newVal) {
      if (newVal) {
        this.selectedUrl = this.currentImage || '';
        this.searchQuery = '';
        this.fetchFiles();
      }
    },
    currentImage(newVal) {
      if (newVal) {
        this.selectedUrl = newVal;
      }
    },
  },
  computed: {
    breadcrumbs() {
      const crumbs = [{ name: 'Uploads', path: '' }];
      if (!this.currentFolder) {
        return crumbs;
      }
      const parts = this.currentFolder.split('/').filter(Boolean);
      let cumulative = '';
      for (const part of parts) {
        cumulative = cumulative ? `${cumulative}/${part}` : part;
        crumbs.push({ name: part, path: cumulative });
      }
      return crumbs;
    },
    isInSubfolder() {
      return Boolean(this.currentFolder);
    },
    immediateSubfolders() {
      if (!this.folders || !Array.isArray(this.folders)) return [];

      const currentPrefix = this.currentFolder ? `${this.currentFolder}/` : '';
      const prefixLen = currentPrefix.length;
      const subfolderNames = new Set();
      const result = [];

      for (const f of this.folders) {
        if (!f || f === this.currentFolder) continue;
        if (currentPrefix === '') {
          // In root: child must not contain slash
          const slashIdx = f.indexOf('/');
          const immediateName = slashIdx === -1 ? f : f.substring(0, slashIdx);
          if (!subfolderNames.has(immediateName)) {
            subfolderNames.add(immediateName);
            result.push({ name: immediateName, path: immediateName });
          }
        } else if (f.startsWith(currentPrefix)) {
          const remainder = f.slice(prefixLen);
          const slashIdx = remainder.indexOf('/');
          const immediateName = slashIdx === -1 ? remainder : remainder.substring(0, slashIdx);
          if (immediateName && !subfolderNames.has(immediateName)) {
            subfolderNames.add(immediateName);
            result.push({ name: immediateName, path: `${currentPrefix}${immediateName}` });
          }
        }
      }

      return result.sort((a, b) => a.name.localeCompare(b.name));
    },
    filteredFiles() {
      if (!this.files || !Array.isArray(this.files)) return [];

      const query = this.searchQuery ? this.searchQuery.trim().toLowerCase() : '';

      return this.files.filter((file) => {
        const matchesFolder = (file.folder || '') === this.currentFolder;
        if (!matchesFolder) return false;

        if (query) {
          return (file.name || '').toLowerCase().includes(query);
        }
        return true;
      });
    },
  },
  methods: {
    async fetchFiles() {
      this.loading = true;
      this.errorMessage = '';
      try {
        const res = await fetch('/api/upload/files', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          this.files = Array.isArray(data.files) ? data.files : [];
          this.folders = Array.isArray(data.folders) ? data.folders : [''];
        } else {
          this.errorMessage = 'Failed to load images from server';
        }
      } catch (err) {
        this.errorMessage = err.message || 'Error fetching images';
      } finally {
        this.loading = false;
      }
    },
    navigateToFolder(folderPath) {
      this.currentFolder = folderPath || '';
    },
    goUp() {
      if (!this.currentFolder) return;
      const parts = this.currentFolder.split('/').filter(Boolean);
      parts.pop();
      this.currentFolder = parts.join('/');
    },
    selectImage(file) {
      if (file && file.url) {
        this.selectedUrl = file.url;
      }
    },
    confirmSelection() {
      if (this.selectedUrl) {
        this.$emit('select', this.selectedUrl);
        this.closeModal();
      }
    },
    handleDoubleClick(file) {
      this.selectImage(file);
      this.confirmSelection();
    },
    closeModal() {
      this.$emit('update:modelValue', false);
    },
    async handleUpload(event) {
      const file = event.target?.files?.[0];
      if (!file) return;

      this.uploading = true;
      this.errorMessage = '';

      const formData = new FormData();
      formData.append('file', file);
      if (this.currentFolder) {
        formData.append('folder', this.currentFolder);
      }

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const uploadedUrl = data.url;
          this.selectedUrl = uploadedUrl;
          await this.fetchFiles();
          this.$emit('select', uploadedUrl);
          this.closeModal();
        } else {
          const errData = await res.json().catch(() => ({}));
          this.errorMessage = errData.error || 'Upload failed';
        }
      } catch (err) {
        this.errorMessage = err.message || 'Upload error';
      } finally {
        this.uploading = false;
        if (event.target) {
          event.target.value = '';
        }
      }
    },
  },
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  backdrop-filter: blur(2px);
}

.image-browser-card {
  background-color: #000000;
  border: 1px solid rgba(0, 128, 128, 0.6);
  border-radius: 8px;
  width: 800px;
  max-width: 95vw;
  height: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 24px rgba(0, 128, 128, 0.25), 0 8px 32px rgba(0, 0, 0, 0.9);
  overflow: hidden;
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(0, 128, 128, 0.4);
  background: #021214;
}

.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #00ffff;
  letter-spacing: 0.5px;
}

.btn-close {
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.15s, background-color 0.15s;
}

.btn-close:hover {
  color: #ff6b6b;
  background-color: rgba(255, 107, 107, 0.1);
}

/* Toolbar */
.browser-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #010a0c;
  border-bottom: 1px solid rgba(0, 128, 128, 0.3);
  gap: 12px;
  flex-wrap: wrap;
}

.breadcrumb-container {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.btn-nav {
  background: #000000;
  border: 1px solid rgba(0, 128, 128, 0.6);
  color: aquamarine;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease-in-out;
}

.btn-nav:hover {
  background: #04272d;
  border-color: aquamarine;
  box-shadow: 0 0 8px rgba(127, 255, 212, 0.3);
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  overflow-x: auto;
  white-space: nowrap;
}

.crumb-link {
  color: #00ffff;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: color 0.15s, background-color 0.15s;
}

.crumb-link:hover {
  color: #a8ffea;
  text-decoration: underline;
  background-color: rgba(0, 255, 255, 0.08);
}

.crumb-link.active {
  color: #e0e0e0;
  font-weight: 600;
  cursor: default;
  text-decoration: none;
}

.crumb-link.active:hover {
  background-color: transparent;
}

.crumb-separator {
  color: #557780;
  font-size: 11px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
}

.hidden-file-input {
  display: none;
}

.btn-primary-action {
  background-color: #021a1e;
  border: 1px solid aquamarine;
  color: aquamarine;
  padding: 6px 14px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  box-shadow: 0 0 8px rgba(127, 255, 212, 0.2);
  white-space: nowrap;
}

.btn-primary-action:hover:not(:disabled) {
  background-color: #04272d;
  border-color: #a8ffea;
  color: #a8ffea;
  box-shadow: 0 0 14px rgba(127, 255, 212, 0.4);
}

.btn-primary-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

/* Search Bar */
.search-bar-wrap {
  position: relative;
  padding: 10px 20px;
  background: #000000;
  border-bottom: 1px solid rgba(0, 128, 128, 0.2);
}

.input-search {
  width: 100%;
  background: #000000;
  border: 1px solid rgba(0, 128, 128, 0.6);
  border-radius: 4px;
  color: #00ffff;
  padding: 7px 32px 7px 12px;
  font-size: 13px;
  box-sizing: border-box;
}

.input-search:focus {
  outline: none;
  border-color: #00ffff;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.35);
}

.input-search::placeholder {
  color: #4f6a72;
}

.btn-clear-search {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  font-size: 12px;
  padding: 4px;
}

.btn-clear-search:hover {
  color: #00ffff;
}

/* Gallery Container */
.gallery-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background: #000000;
}

.state-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 180px;
  font-size: 14px;
  color: #8b949e;
}

.error-state {
  color: #ff6b6b;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 14px;
}

.grid-item {
  background: #010d10;
  border: 1px solid rgba(0, 128, 128, 0.4);
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  user-select: none;
}

.grid-item:hover {
  border-color: #00ffff;
  background: #031c22;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.25);
  transform: translateY(-2px);
}

.folder-card {
  height: 130px;
  justify-content: center;
  gap: 8px;
}

.folder-icon {
  font-size: 40px;
  line-height: 1;
}

.folder-name {
  font-size: 12px;
  font-weight: 600;
  color: aquamarine;
  text-align: center;
  word-break: break-all;
  max-width: 100%;
}

.image-card {
  height: 130px;
}

.image-card.selected {
  border-color: aquamarine;
  box-shadow: 0 0 14px rgba(127, 255, 212, 0.6);
  background: #04242a;
}

.thumbnail-wrap {
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
  background: #000000;
}

.thumbnail-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-name {
  margin-top: 6px;
  font-size: 11px;
  color: #e0e0e0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #010a0c;
  border-top: 1px solid rgba(0, 128, 128, 0.4);
  gap: 12px;
}

.selected-info {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-text {
  color: #8b949e;
}

.selected-path {
  color: aquamarine;
  font-family: monospace;
}

.selected-none {
  color: #557780;
  font-style: italic;
}

.footer-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-footer-cancel {
  background: #000000;
  border: 1px solid teal;
  color: teal;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-footer-cancel:hover {
  background: #051414;
  border-color: #00a8a8;
  color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
}

.btn-footer-use {
  background-color: #021a1e;
  border: 1px solid aquamarine;
  color: aquamarine;
  padding: 6px 16px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(127, 255, 212, 0.25);
  transition: all 0.15s ease-in-out;
}

.btn-footer-use:hover:not(:disabled) {
  background-color: #04272d;
  border-color: #a8ffea;
  color: #a8ffea;
  box-shadow: 0 0 16px rgba(127, 255, 212, 0.5);
}

.btn-footer-use:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}
</style>

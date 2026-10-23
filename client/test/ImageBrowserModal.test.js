/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import ImageBrowserModal from '../src/components/ImageBrowserModal.vue';
import { useAuthStore } from '../src/stores/auth.js';
import fs from 'node:fs';
import path from 'node:path';

describe('ImageBrowserModal.vue', () => {
  const sampleFiles = [
    { name: 'alpha.png', relativePath: 'alpha.png', folder: '', url: '/uploads/alpha.png', size: 1024, mtime: '2026-09-27T00:00:00Z' },
    { name: 'beta.jpg', relativePath: 'beta.jpg', folder: '', url: '/uploads/beta.jpg', size: 2048, mtime: '2026-09-27T00:00:00Z' },
    { name: 'scout.png', relativePath: 'upf/scout.png', folder: 'upf', url: '/uploads/upf/scout.png', size: 4096, mtime: '2026-09-27T00:00:00Z' },
    { name: 'frigate.png', relativePath: 'upf/frigate.png', folder: 'upf', url: '/uploads/upf/frigate.png', size: 8192, mtime: '2026-09-27T00:00:00Z' },
    { name: 'fighter.png', relativePath: 'upf/heavy/fighter.png', folder: 'upf/heavy', url: '/uploads/upf/heavy/fighter.png', size: 16384, mtime: '2026-09-27T00:00:00Z' },
    { name: 'destroyer.png', relativePath: 'sathar/destroyer.png', folder: 'sathar', url: '/uploads/sathar/destroyer.png', size: 32768, mtime: '2026-09-27T00:00:00Z' },
  ];

  const sampleFolders = ['', 'upf', 'upf/heavy', 'sathar'];

  describe('Breadcrumb computation', () => {
    it('computes breadcrumbs correctly for root folder', () => {
      const vm = { currentFolder: '' };
      const crumbs = ImageBrowserModal.computed.breadcrumbs.call(vm);
      expect(crumbs).toEqual([
        { name: 'Uploads', path: '' }
      ]);
    });

    it('computes breadcrumbs correctly for nested folder "upf/heavy"', () => {
      const vm = { currentFolder: 'upf/heavy' };
      const crumbs = ImageBrowserModal.computed.breadcrumbs.call(vm);
      expect(crumbs).toEqual([
        { name: 'Uploads', path: '' },
        { name: 'upf', path: 'upf' },
        { name: 'heavy', path: 'upf/heavy' }
      ]);
    });

    it('determines isInSubfolder correctly', () => {
      const rootVm = { currentFolder: '' };
      expect(ImageBrowserModal.computed.isInSubfolder.call(rootVm)).toBe(false);

      const subVm = { currentFolder: 'upf' };
      expect(ImageBrowserModal.computed.isInSubfolder.call(subVm)).toBe(true);
    });
  });

  describe('Immediate subfolders computation', () => {
    it('computes immediate subfolders for root folder', () => {
      const vm = {
        currentFolder: '',
        folders: sampleFolders,
      };
      const sub = ImageBrowserModal.computed.immediateSubfolders.call(vm);
      expect(sub).toEqual([
        { name: 'sathar', path: 'sathar' },
        { name: 'upf', path: 'upf' }
      ]);
    });

    it('computes immediate subfolders for nested folder "upf"', () => {
      const vm = {
        currentFolder: 'upf',
        folders: sampleFolders,
      };
      const sub = ImageBrowserModal.computed.immediateSubfolders.call(vm);
      expect(sub).toEqual([
        { name: 'heavy', path: 'upf/heavy' }
      ]);
    });

    it('returns empty array when folder has no subfolders', () => {
      const vm = {
        currentFolder: 'upf/heavy',
        folders: sampleFolders,
      };
      const sub = ImageBrowserModal.computed.immediateSubfolders.call(vm);
      expect(sub).toEqual([]);
    });
  });

  describe('Filtering currentFiles by folder and search query', () => {
    it('returns only files in root when at root with empty search', () => {
      const vm = {
        currentFolder: '',
        searchQuery: '',
        files: sampleFiles,
      };
      const files = ImageBrowserModal.computed.filteredFiles.call(vm);
      expect(files.map(f => f.name)).toEqual(['alpha.png', 'beta.jpg']);
    });

    it('returns only files in subfolder when currentFolder is "upf"', () => {
      const vm = {
        currentFolder: 'upf',
        searchQuery: '',
        files: sampleFiles,
      };
      const files = ImageBrowserModal.computed.filteredFiles.call(vm);
      expect(files.map(f => f.name)).toEqual(['scout.png', 'frigate.png']);
    });

    it('filters files by search query within current folder', () => {
      const vm = {
        currentFolder: 'upf',
        searchQuery: 'scout',
        files: sampleFiles,
      };
      const files = ImageBrowserModal.computed.filteredFiles.call(vm);
      expect(files.map(f => f.name)).toEqual(['scout.png']);
    });

    it('matches search query case-insensitively', () => {
      const vm = {
        currentFolder: '',
        searchQuery: 'ALPHA',
        files: sampleFiles,
      };
      const files = ImageBrowserModal.computed.filteredFiles.call(vm);
      expect(files.map(f => f.name)).toEqual(['alpha.png']);
    });
  });

  describe('Navigation methods', () => {
    it('navigateToFolder sets currentFolder and clears active selection if needed', () => {
      const vm = {
        currentFolder: '',
        selectedUrl: '',
      };
      ImageBrowserModal.methods.navigateToFolder.call(vm, 'upf');
      expect(vm.currentFolder).toBe('upf');
    });

    it('goUp navigates to parent folder', () => {
      const vm = {
        currentFolder: 'upf/heavy',
      };
      ImageBrowserModal.methods.goUp.call(vm);
      expect(vm.currentFolder).toBe('upf');

      ImageBrowserModal.methods.goUp.call(vm);
      expect(vm.currentFolder).toBe('');

      // Calling goUp at root stays at root
      ImageBrowserModal.methods.goUp.call(vm);
      expect(vm.currentFolder).toBe('');
    });
  });

  describe('Selection and Confirmation methods', () => {
    it('selectImage selects the file url', () => {
      const vm = {
        selectedUrl: '',
      };
      ImageBrowserModal.methods.selectImage.call(vm, { url: '/uploads/alpha.png' });
      expect(vm.selectedUrl).toBe('/uploads/alpha.png');
    });

    it('confirmSelection emits select and closes modal', () => {
      const emitted = {};
      const vm = {
        selectedUrl: '/uploads/upf/scout.png',
        closeModal: ImageBrowserModal.methods.closeModal,
        $emit: (event, payload) => {
          emitted[event] = payload;
        },
      };
      ImageBrowserModal.methods.confirmSelection.call(vm);
      expect(emitted['select']).toBe('/uploads/upf/scout.png');
      expect(emitted['update:modelValue']).toBe(false);
    });

    it('confirmSelection does nothing if selectedUrl is empty', () => {
      const emitted = {};
      const vm = {
        selectedUrl: '',
        closeModal: ImageBrowserModal.methods.closeModal,
        $emit: (event, payload) => {
          emitted[event] = payload;
        },
      };
      ImageBrowserModal.methods.confirmSelection.call(vm);
      expect(emitted['select']).toBeUndefined();
      expect(emitted['update:modelValue']).toBeUndefined();
    });

    it('handleDoubleClick selects image and confirms immediately', () => {
      const emitted = {};
      const vm = {
        selectedUrl: '',
        selectImage: ImageBrowserModal.methods.selectImage,
        confirmSelection: ImageBrowserModal.methods.confirmSelection,
        closeModal: ImageBrowserModal.methods.closeModal,
        $emit: (event, payload) => {
          emitted[event] = payload;
        },
      };
      ImageBrowserModal.methods.handleDoubleClick.call(vm, { url: '/uploads/alpha.png' });
      expect(vm.selectedUrl).toBe('/uploads/alpha.png');
      expect(emitted['select']).toBe('/uploads/alpha.png');
      expect(emitted['update:modelValue']).toBe(false);
    });

    it('closeModal emits update:modelValue false', () => {
      const emitted = {};
      const vm = {
        $emit: (event, payload) => {
          emitted[event] = payload;
        },
      };
      ImageBrowserModal.methods.closeModal.call(vm);
      expect(emitted['update:modelValue']).toBe(false);
    });
  });

  describe('Upload and Fetch API handling', () => {
    it('fetchFiles retrieves files and folders from /api/upload/files', async () => {
      const mockData = {
        files: sampleFiles,
        folders: sampleFolders,
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const vm = {
        files: [],
        folders: [],
        loading: false,
        errorMessage: '',
      };

      await ImageBrowserModal.methods.fetchFiles.call(vm);
      expect(global.fetch).toHaveBeenCalledWith('/api/upload/files', { credentials: 'include' });
      expect(vm.files).toEqual(sampleFiles);
      expect(vm.folders).toEqual(sampleFolders);
      expect(vm.loading).toBe(false);
    });

    it('handleUpload uploads file with currentFolder and selects newly uploaded image', async () => {
      const newFileUrl = '/uploads/upf/new_scout.png';
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: newFileUrl }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            files: [...sampleFiles, { name: 'new_scout.png', url: newFileUrl, folder: 'upf', relativePath: 'upf/new_scout.png' }],
            folders: sampleFolders,
          }),
        });

      const emitted = {};
      const vm = {
        currentFolder: 'upf',
        uploading: false,
        errorMessage: '',
        selectedUrl: '',
        fetchFiles: ImageBrowserModal.methods.fetchFiles,
        closeModal: ImageBrowserModal.methods.closeModal,
        $emit: (event, payload) => {
          emitted[event] = payload;
        },
      };

      const fileObj = new Blob(['fake image'], { type: 'image/png' });
      fileObj.name = 'new_scout.png';
      const event = {
        target: {
          files: [fileObj],
          value: 'C:\\fake\\new_scout.png',
        },
      };

      await ImageBrowserModal.methods.handleUpload.call(vm, event);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upload',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
      expect(vm.selectedUrl).toBe(newFileUrl);
      expect(emitted['select']).toBe(newFileUrl);
      expect(emitted['update:modelValue']).toBe(false);
      expect(event.target.value).toBe('');
    });
  });

  describe('Mounted & watch lifecycle', () => {
    it('fetches files exactly once on mount when modelValue is true (Bug 3.3)', () => {
      const fetchSpy = vi.spyOn(ImageBrowserModal.methods, 'fetchFiles').mockImplementation(() => Promise.resolve());
      const wrapper = mount(ImageBrowserModal, {
        props: {
          modelValue: true,
        },
      });
      try {
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      } finally {
        fetchSpy.mockRestore();
        wrapper.unmount();
      }
    });

    it('does not fetch files on mount when modelValue is false', () => {
      const fetchSpy = vi.spyOn(ImageBrowserModal.methods, 'fetchFiles').mockImplementation(() => Promise.resolve());
      const wrapper = mount(ImageBrowserModal, {
        props: {
          modelValue: false,
        },
      });
      try {
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
        wrapper.unmount();
      }
    });

    it('fetches files when modelValue changes from false to true', async () => {
      const fetchSpy = vi.spyOn(ImageBrowserModal.methods, 'fetchFiles').mockImplementation(() => Promise.resolve());
      const wrapper = mount(ImageBrowserModal, {
        props: {
          modelValue: false,
        },
      });
      try {
        expect(fetchSpy).not.toHaveBeenCalled();
        await wrapper.setProps({ modelValue: true });
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      } finally {
        fetchSpy.mockRestore();
        wrapper.unmount();
      }
    });

    it('has immediate watcher on modelValue', () => {
      expect(ImageBrowserModal.watch.modelValue.immediate).toBe(true);
      const fetchFilesMock = vi.fn();
      const vm = {
        modelValue: true,
        currentImage: '/uploads/ship.png',
        selectedUrl: '',
        searchQuery: 'something',
        fetchFiles: fetchFilesMock,
      };
      ImageBrowserModal.watch.modelValue.handler.call(vm, true);
      expect(vm.selectedUrl).toBe('/uploads/ship.png');
      expect(vm.searchQuery).toBe('');
      expect(fetchFilesMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('GM Quick Actions (Rename & Delete)', () => {
    let pinia;
    let authStore;

    beforeEach(() => {
      pinia = createPinia();
      setActivePinia(pinia);
      authStore = useAuthStore();
      global.window = global.window || {};
      global.window.prompt = vi.fn();
      global.window.confirm = vi.fn();
    });

    it('computes isGm safely without throwing even if pinia is uninitialized', () => {
      setActivePinia(undefined);
      const isGm = ImageBrowserModal.computed.isGm.call({});
      expect(isGm).toBe(false);
    });

    it('computes isGm true when user role is GameMaster', () => {
      authStore.user = { id: 1, username: 'gm', role: 'GameMaster' };
      const isGm = ImageBrowserModal.computed.isGm.call({});
      expect(isGm).toBe(true);
    });

    it('computes isGm false when user role is Player', () => {
      authStore.user = { id: 2, username: 'player', role: 'Player' };
      const isGm = ImageBrowserModal.computed.isGm.call({});
      expect(isGm).toBe(false);
    });

    it('displays rename and delete buttons on image cards when auth user is GameMaster', async () => {
      authStore.user = { id: 1, username: 'gm', role: 'GameMaster' };
      const ModalWithFiles = {
        ...ImageBrowserModal,
        data() {
          return {
            ...ImageBrowserModal.data(),
            files: sampleFiles,
            folders: sampleFolders,
            loading: false,
          };
        },
        methods: {
          ...ImageBrowserModal.methods,
          fetchFiles: vi.fn(),
        },
      };
      const app = createSSRApp(ModalWithFiles, {
        modelValue: true,
      });
      app.use(pinia);
      const html = await renderToString(app);
      expect(html).toContain('btn-card-rename');
      expect(html).toContain('btn-card-delete');
    });

    it('does not display rename and delete buttons when auth user is Player', async () => {
      authStore.user = { id: 2, username: 'player', role: 'Player' };
      const ModalWithFiles = {
        ...ImageBrowserModal,
        data() {
          return {
            ...ImageBrowserModal.data(),
            files: sampleFiles,
            folders: sampleFolders,
            loading: false,
          };
        },
        methods: {
          ...ImageBrowserModal.methods,
          fetchFiles: vi.fn(),
        },
      };
      const app = createSSRApp(ModalWithFiles, {
        modelValue: true,
      });
      app.use(pinia);
      const html = await renderToString(app);
      expect(html).not.toContain('btn-card-rename');
      expect(html).not.toContain('btn-card-delete');
    });

    it('handles GM rename action and triggers PUT /api/upload/rename', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          oldUrl: '/uploads/alpha.png',
          newUrl: '/uploads/renamed_alpha.png',
        }),
      });
      global.fetch = mockFetch;
      global.window.prompt.mockReturnValue('renamed_alpha.png');
      const fetchFilesMock = vi.fn();

      const vm = {
        selectedUrl: '/uploads/alpha.png',
        errorMessage: '',
        fetchFiles: fetchFilesMock,
      };

      const targetFile = {
        name: 'alpha.png',
        relativePath: 'alpha.png',
        url: '/uploads/alpha.png',
      };

      await ImageBrowserModal.methods.handleRename.call(vm, targetFile);

      expect(global.window.prompt).toHaveBeenCalledWith(
        'Enter new filename for "alpha.png":',
        'alpha.png'
      );
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/upload/rename',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            oldPath: 'alpha.png',
            newName: 'renamed_alpha.png',
          }),
        })
      );
      expect(vm.selectedUrl).toBe('/uploads/renamed_alpha.png');
      expect(fetchFilesMock).toHaveBeenCalledTimes(1);
    });

    it('handles GM delete action and triggers DELETE /api/upload/file', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;
      global.window.confirm.mockReturnValue(true);
      const fetchFilesMock = vi.fn();

      const vm = {
        selectedUrl: '/uploads/alpha.png',
        errorMessage: '',
        fetchFiles: fetchFilesMock,
      };

      const targetFile = {
        name: 'alpha.png',
        relativePath: 'alpha.png',
        url: '/uploads/alpha.png',
      };

      await ImageBrowserModal.methods.handleDelete.call(vm, targetFile);

      expect(global.window.confirm).toHaveBeenCalledWith('Are you sure you want to delete "alpha.png"?');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/upload/file?path=alpha.png',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
        })
      );
      expect(vm.selectedUrl).toBe('');
      expect(fetchFilesMock).toHaveBeenCalledTimes(1);
    });

    it('cancels rename if prompt is cancelled or empty', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;
      global.window.prompt.mockReturnValue(null);

      const vm = {
        selectedUrl: '/uploads/alpha.png',
        errorMessage: '',
        fetchFiles: vi.fn(),
      };

      await ImageBrowserModal.methods.handleRename.call(vm, {
        name: 'alpha.png',
        relativePath: 'alpha.png',
        url: '/uploads/alpha.png',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('cancels delete if confirmation is rejected', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;
      global.window.confirm.mockReturnValue(false);

      const vm = {
        selectedUrl: '/uploads/alpha.png',
        errorMessage: '',
        fetchFiles: vi.fn(),
      };

      await ImageBrowserModal.methods.handleDelete.call(vm, {
        name: 'alpha.png',
        relativePath: 'alpha.png',
        url: '/uploads/alpha.png',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('template binds @click.stop on rename and delete buttons to avoid triggering card selection', () => {
      const modalSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/ImageBrowserModal.vue'), 'utf-8');
      expect(modalSrc).toMatch(/@click\.stop=["']handleRename\(file\)["']/);
      expect(modalSrc).toMatch(/@click\.stop=["']handleDelete\(file\)["']/);
    });

    it('leaves selectedUrl intact when a non-selected image is renamed or deleted', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          oldUrl: '/uploads/beta.png',
          newUrl: '/uploads/renamed_beta.png',
        }),
      });
      global.window.prompt.mockReturnValue('renamed_beta.png');
      const vm = {
        selectedUrl: '/uploads/alpha.png',
        errorMessage: '',
        fetchFiles: vi.fn(),
      };
      await ImageBrowserModal.methods.handleRename.call(vm, {
        name: 'beta.png',
        relativePath: 'beta.png',
        url: '/uploads/beta.png',
      });
      expect(vm.selectedUrl).toBe('/uploads/alpha.png');

      global.window.confirm.mockReturnValue(true);
      await ImageBrowserModal.methods.handleDelete.call(vm, {
        name: 'beta.png',
        relativePath: 'beta.png',
        url: '/uploads/renamed_beta.png',
      });
      expect(vm.selectedUrl).toBe('/uploads/alpha.png');
    });
  });

  describe('Canvas Real-Time Asset Update (VttCanvas & SpaceVttCanvas)', () => {
    it('VttCanvas.vue includes socket listeners for token:asset-renamed, token:asset-deleted, map:asset-renamed, and map:asset-deleted', () => {
      const vttSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/VttCanvas.vue'), 'utf-8');
      expect(vttSrc).toContain("token:asset-renamed");
      expect(vttSrc).toContain("token:asset-deleted");
      expect(vttSrc).toContain("map:asset-renamed");
      expect(vttSrc).toContain("map:asset-deleted");
      expect(vttSrc).toContain("socket.on('token:asset-renamed', handleAssetRenamed)");
      expect(vttSrc).toContain("socket.on('token:asset-deleted', handleAssetDeleted)");
      expect(vttSrc).toContain("socket.on('map:asset-renamed', handleMapAssetRenamed)");
      expect(vttSrc).toContain("socket.on('map:asset-deleted', handleMapAssetDeleted)");
      expect(vttSrc).toContain("socket.off('token:asset-renamed', handleAssetRenamed)");
      expect(vttSrc).toContain("socket.off('token:asset-deleted', handleAssetDeleted)");
      expect(vttSrc).toContain("socket.off('map:asset-renamed', handleMapAssetRenamed)");
      expect(vttSrc).toContain("socket.off('map:asset-deleted', handleMapAssetDeleted)");
      expect(vttSrc).toContain("emit('tokens-updated', updatedTokens)");
      expect(vttSrc).toContain("emit('map-updated'");
      expect(vttSrc).toContain("drawCanvas()");
    });

    it('SpaceVttCanvas.vue includes socket listeners for token:asset-renamed, token:asset-deleted, map:asset-renamed, and map:asset-deleted', () => {
      const spaceSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/SpaceVttCanvas.vue'), 'utf-8');
      expect(spaceSrc).toContain("token:asset-renamed");
      expect(spaceSrc).toContain("token:asset-deleted");
      expect(spaceSrc).toContain("map:asset-renamed");
      expect(spaceSrc).toContain("map:asset-deleted");
      expect(spaceSrc).toContain("socket.on('token:asset-renamed', handleAssetRenamed)");
      expect(spaceSrc).toContain("socket.on('token:asset-deleted', handleAssetDeleted)");
      expect(spaceSrc).toContain("socket.on('map:asset-renamed', handleMapAssetRenamed)");
      expect(spaceSrc).toContain("socket.on('map:asset-deleted', handleMapAssetDeleted)");
      expect(spaceSrc).toContain("socket.off('token:asset-renamed', handleAssetRenamed)");
      expect(spaceSrc).toContain("socket.off('token:asset-deleted', handleAssetDeleted)");
      expect(spaceSrc).toContain("socket.off('map:asset-renamed', handleMapAssetRenamed)");
      expect(spaceSrc).toContain("socket.off('map:asset-deleted', handleMapAssetDeleted)");
      expect(spaceSrc).toContain("emit('tokens-updated', updatedTokens)");
      expect(spaceSrc).toContain("emit('map-updated'");
      expect(spaceSrc).toContain("drawCanvas()");
    });
  });
});

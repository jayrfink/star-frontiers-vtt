import { describe, it, expect, vi } from 'vitest';
import ImageBrowserModal from '../src/components/ImageBrowserModal.vue';

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
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as vue from 'vue';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia, setActivePinia } from 'pinia';
import AdminView from '../src/views/AdminView.vue';
import { useAuthStore } from '../src/stores/auth.js';

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    onMounted: vi.fn(),
    useSSRContext: () => ({ modules: new Set() }),
  };
});

describe('AdminView.vue - Uploads & Assets File Manager', () => {
  let mockFetch;

  const mockUploadsData = {
    files: [
      {
        name: 'dralasite.png',
        relativePath: 'tokens/dralasite.png',
        folder: 'tokens',
        url: '/uploads/tokens/dralasite.png',
        size: 20480,
        mtime: '2026-10-16T12:00:00.000Z'
      },
      {
        name: 'vrusk.png',
        relativePath: 'tokens/vrusk.png',
        folder: 'tokens',
        url: '/uploads/tokens/vrusk.png',
        size: 40960,
        mtime: '2026-10-16T14:30:00.000Z'
      },
      {
        name: 'map1.jpg',
        relativePath: 'maps/map1.jpg',
        folder: 'maps',
        url: '/uploads/maps/map1.jpg',
        size: 1048576,
        mtime: '2026-10-15T09:00:00.000Z'
      },
      {
        name: 'other.png',
        relativePath: 'other.png',
        folder: '',
        url: '/uploads/other.png',
        size: 1024,
        mtime: '2026-10-15T10:00:00.000Z'
      }
    ],
    folders: ['', 'tokens', 'maps', 'empty-folder']
  };

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore();
    auth.user = { id: 1, username: 'admin', role: 'GameMaster' };

    mockFetch = vi.fn((url, options = {}) => {
      if (url === '/api/auth/users') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 1, username: 'admin', role: 'GameMaster' }
          ]),
        });
      }
      if (url === '/api/upload/files') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(JSON.parse(JSON.stringify(mockUploadsData))),
        });
      }
      if (url === '/api/upload/folder') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, folder: 'new-folder' }),
        });
      }
      if (typeof url === 'string' && url.startsWith('/api/upload/folder?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      if (url === '/api/upload/move') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            oldUrl: '/uploads/other.png',
            newUrl: '/uploads/tokens/other.png'
          }),
        });
      }
      if (url === '/api/upload/rename') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            oldUrl: '/uploads/tokens/dralasite.png',
            newUrl: '/uploads/tokens/dralasite-warrior.png'
          }),
        });
      }
      if (typeof url === 'string' && url.startsWith('/api/upload/file')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            url: '/uploads/tokens/vrusk.png'
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    global.fetch = mockFetch;
    global.window = global.window || {};
    global.window.prompt = vi.fn();
    global.window.confirm = vi.fn();
  });

  function getSetupInstance() {
    let exposed = {};
    AdminView.setup({}, {
      expose: (obj) => {
        Object.assign(exposed, obj);
      },
      emit: () => {},
      slots: {},
      attrs: {}
    });
    return exposed;
  }

  describe('UI Template & File Manager Structure', () => {
    it('1. renders File Manager card with breadcrumbs starting at uploads', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);
      const app = createSSRApp(AdminView);
      app.use(pinia);
      const html = await renderToString(app);

      expect(html).toContain('Uploads &amp; Assets Manager');
      expect(html).toContain('uploads');
      expect(html).toContain('+ New Folder');
      expect(html).toContain('Upload File Here');
      expect(html).toContain('search-input');
      expect(html).toContain('Refresh');
    });

    it('2. lists direct child folders and files for current directory', async () => {
      const instance = getSetupInstance();
      await instance.fetchFiles();

      // At root directory (currentFolder === '')
      expect(instance.currentFolder.value).toBe('');

      // Direct child folders should be 'tokens', 'maps', 'empty-folder'
      const folderNames = instance.filteredSubfolders.value.map(f => f.name);
      expect(folderNames).toContain('tokens');
      expect(folderNames).toContain('maps');
      expect(folderNames).toContain('empty-folder');

      // Item counts
      const tokensFolder = instance.filteredSubfolders.value.find(f => f.name === 'tokens');
      expect(tokensFolder.count).toBe(2); // dralasite.png and vrusk.png

      const emptyFolder = instance.filteredSubfolders.value.find(f => f.name === 'empty-folder');
      expect(emptyFolder.count).toBe(0);

      // Direct files in root: only other.png
      const fileNames = instance.filteredFiles.value.map(f => f.name);
      expect(fileNames).toEqual(['other.png']);
    });

    it('3. navigating into a subfolder updates breadcrumbs and shows .. (Go up one level)', async () => {
      const instance = getSetupInstance();
      await instance.fetchFiles();

      // Navigate into 'tokens'
      instance.navigateToFolder('tokens');
      expect(instance.currentFolder.value).toBe('tokens');

      // Breadcrumbs should now be 'uploads' and 'tokens'
      expect(instance.breadcrumbs.value).toEqual([
        { name: 'uploads', path: '' },
        { name: 'tokens', path: 'tokens' }
      ]);

      // Direct files in 'tokens'
      const tokenFileNames = instance.filteredFiles.value.map(f => f.name);
      expect(tokenFileNames).toEqual(['dralasite.png', 'vrusk.png']);

      // Subfolders in 'tokens' should be empty
      expect(instance.filteredSubfolders.value).toEqual([]);

      // Go up one level
      instance.goUpOneLevel();
      expect(instance.currentFolder.value).toBe('');
      expect(instance.breadcrumbs.value).toEqual([
        { name: 'uploads', path: '' }
      ]);
    });

    it('4. clicking breadcrumb segment navigates directly to that folder', async () => {
      const instance = getSetupInstance();
      await instance.fetchFiles();

      // Simulate being deep in a folder: 'tokens/aliens/dralasite'
      instance.currentFolder.value = 'tokens/aliens/dralasite';
      expect(instance.breadcrumbs.value).toEqual([
        { name: 'uploads', path: '' },
        { name: 'tokens', path: 'tokens' },
        { name: 'aliens', path: 'tokens/aliens' },
        { name: 'dralasite', path: 'tokens/aliens/dralasite' }
      ]);

      // Click 'tokens' breadcrumb
      instance.navigateToFolder('tokens');
      expect(instance.currentFolder.value).toBe('tokens');

      // Click 'uploads' root breadcrumb
      instance.navigateToFolder('');
      expect(instance.currentFolder.value).toBe('');
    });

    it('5. create new folder flow prompts and calls POST /api/upload/folder', async () => {
      const instance = getSetupInstance();
      await instance.fetchFiles();
      mockFetch.mockClear();

      // At root, user creates 'scenarios'
      window.prompt.mockReturnValue('scenarios');
      await instance.createFolder();

      expect(window.prompt).toHaveBeenCalledWith(expect.stringContaining('folder name'));
      expect(mockFetch).toHaveBeenCalledWith('/api/upload/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folder: 'scenarios' })
      });
      expect(instance.successMessage.value).toMatch(/created successfully/i);

      // In a subfolder 'tokens', user creates 'npcs'
      instance.currentFolder.value = 'tokens';
      window.prompt.mockReturnValue('npcs');
      await instance.createFolder();

      expect(mockFetch).toHaveBeenCalledWith('/api/upload/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folder: 'tokens/npcs' })
      });

      // Canceling prompt does not call API
      mockFetch.mockClear();
      window.prompt.mockReturnValue(null);
      await instance.createFolder();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('6. delete empty folder flow confirms and calls DELETE /api/upload/folder', async () => {
      const instance = getSetupInstance();
      await instance.fetchFiles();
      mockFetch.mockClear();

      const emptyFolder = instance.filteredSubfolders.value.find(f => f.name === 'empty-folder');
      window.confirm.mockReturnValue(true);

      await instance.deleteFolder(emptyFolder);

      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('empty-folder'));
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/upload/folder?folder=${encodeURIComponent('empty-folder')}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );
      expect(instance.successMessage.value).toMatch(/deleted successfully/i);

      // Attempting to delete a non-empty folder is rejected
      const nonEmptyFolder = instance.filteredSubfolders.value.find(f => f.name === 'tokens');
      mockFetch.mockClear();
      await instance.deleteFolder(nonEmptyFolder);
      expect(instance.error.value).toMatch(/empty/i);
      expect(mockFetch).not.toHaveBeenCalled();

      // Canceling confirmation does not call API
      window.confirm.mockReturnValue(false);
      await instance.deleteFolder(emptyFolder);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('7. move file modal opening, folder select dropdown, and move submission', async () => {
      const instance = getSetupInstance();
      await instance.fetchFiles();

      const fileToMove = instance.filteredFiles.value[0]; // other.png at root (folder: '')
      expect(fileToMove.name).toBe('other.png');

      // Open move modal
      expect(instance.moveModalOpen.value).toBe(false);
      instance.openMoveModal(fileToMove);

      expect(instance.moveModalOpen.value).toBe(true);
      expect(instance.fileToMove.value).toEqual(fileToMove);
      // destinationFolder is initialized to an allowed destination that is not the file's current folder
      expect(instance.destinationFolder.value).not.toBe(fileToMove.folder || '');
      expect(instance.destinationFolder.value).toBe('empty-folder');

      // Check available destination folders list includes root, tokens, maps, empty-folder
      expect(instance.availableDestinationFolders.value).toContain('');
      expect(instance.availableDestinationFolders.value).toContain('tokens');
      expect(instance.availableDestinationFolders.value).toContain('maps');
      expect(instance.availableDestinationFolders.value).toContain('empty-folder');

      // If opened for a file inside 'tokens', destinationFolder defaults to root ''
      const tokenFile = instance.files.value.find(f => f.folder === 'tokens');
      instance.openMoveModal(tokenFile);
      expect(instance.fileToMove.value).toEqual(tokenFile);
      expect(instance.destinationFolder.value).toBe(''); // first destination != 'tokens' is ''

      // Select 'tokens' as destination and confirm move for other.png
      instance.openMoveModal(fileToMove);
      instance.destinationFolder.value = 'tokens';
      await instance.confirmMove();

      expect(mockFetch).toHaveBeenCalledWith('/api/upload/move', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sourcePath: 'other.png',
          destinationFolder: 'tokens'
        })
      });
      expect(instance.moveModalOpen.value).toBe(false);
      expect(instance.successMessage.value).toMatch(/moved successfully/i);

      // Close modal cancels move
      instance.openMoveModal(fileToMove);
      expect(instance.moveModalOpen.value).toBe(true);
      instance.closeMoveModal();
      expect(instance.moveModalOpen.value).toBe(false);
      expect(instance.fileToMove.value).toBeNull();
    });

    it('7b. move modal has proper accessibility attributes and disables current folder option', () => {
      const src = fs.readFileSync(path.resolve(__dirname, '../src/views/AdminView.vue'), 'utf-8');
      expect(src).toContain('role="dialog"');
      expect(src).toContain('aria-modal="true"');
      expect(src).toContain('aria-labelledby="move-modal-title"');
      expect(src).toContain('id="move-modal-title"');
      expect(src).toContain(':disabled="folder === (fileToMove?.folder || \'\')"');
      expect(src).toContain('{{ folder === (fileToMove?.folder || \'\') ? \' (current)\' : \'\' }}');
      expect(src).toContain('destinationFolder === (fileToMove?.folder || \'\')');
    });

    it('8. search filtering within current folder', async () => {
      const instance = getSetupInstance();
      await instance.fetchFiles();

      // At root: searching for 'other' keeps other.png
      instance.searchQuery.value = 'oth';
      expect(instance.filteredFiles.value.map(f => f.name)).toEqual(['other.png']);
      expect(instance.filteredSubfolders.value).toEqual([]); // no folder matches 'oth'

      instance.searchQuery.value = 'map';
      expect(instance.filteredFiles.value).toEqual([]);
      expect(instance.filteredSubfolders.value.map(f => f.name)).toEqual(['maps']);

      // Navigate to 'tokens'
      instance.currentFolder.value = 'tokens';
      instance.searchQuery.value = 'dral';
      expect(instance.filteredFiles.value.map(f => f.name)).toEqual(['dralasite.png']);

      instance.searchQuery.value = 'vrusk';
      expect(instance.filteredFiles.value.map(f => f.name)).toEqual(['vrusk.png']);

      instance.searchQuery.value = 'nomatch';
      expect(instance.filteredFiles.value).toEqual([]);
    });
  });

  describe('formatFileSize & formatDate helpers', () => {
    it('formats file sizes accurately in KB', () => {
      const instance = getSetupInstance();
      expect(instance.formatFileSize(0)).toBe('0 KB');
      expect(instance.formatFileSize(null)).toBe('0 KB');
      expect(instance.formatFileSize(1024)).toBe('1.0 KB');
      expect(instance.formatFileSize(20480)).toBe('20.0 KB');
      expect(instance.formatFileSize(512)).toBe('0.5 KB');
    });

    it('formats ISO dates into readable date string', () => {
      const instance = getSetupInstance();
      expect(instance.formatDate(null)).toBe('');
      expect(instance.formatDate('')).toBe('');
      const dateStr = instance.formatDate('2026-10-16T12:00:00.000Z');
      expect(dateStr).toBeTruthy();
      expect(typeof dateStr).toBe('string');
    });
  });

  describe('renameFile and deleteFile', () => {
    it('renames file with PUT /api/upload/rename', async () => {
      const instance = getSetupInstance();
      await instance.fetchFiles();

      instance.currentFolder.value = 'tokens';
      const fileToRename = instance.filteredFiles.value[0]; // dralasite.png
      window.prompt.mockReturnValue('dralasite-warrior.png');

      await instance.renameFile(fileToRename);

      expect(window.prompt).toHaveBeenCalledWith(
        expect.stringContaining('Enter new filename'),
        'dralasite.png'
      );
      expect(mockFetch).toHaveBeenCalledWith('/api/upload/rename', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          oldPath: 'tokens/dralasite.png',
          newName: 'dralasite-warrior.png'
        })
      });
      expect(instance.successMessage.value).toMatch(/renamed/i);
    });

    it('deletes file with DELETE /api/upload/file?path=...', async () => {
      const instance = getSetupInstance();
      await instance.fetchFiles();

      instance.currentFolder.value = 'tokens';
      const fileToDelete = instance.filteredFiles.value[1]; // vrusk.png
      window.confirm.mockReturnValue(true);

      await instance.deleteFile(fileToDelete);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('vrusk.png')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/upload/file?path=${encodeURIComponent('tokens/vrusk.png')}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );
      expect(instance.successMessage.value).toMatch(/deleted/i);
    });
  });

  describe('file upload into current folder', () => {
    it('uploads a file into the current folder using FormData', async () => {
      const instance = getSetupInstance();
      await instance.fetchFiles();

      instance.currentFolder.value = 'maps';
      const fakeFile = new File(['fake image content'], 'newmap.png', { type: 'image/png' });
      const event = {
        target: {
          files: [fakeFile],
          value: 'C:\\fakepath\\newmap.png'
        }
      };

      mockFetch.mockClear();
      await instance.handleFileUpload(event);

      expect(mockFetch).toHaveBeenCalledWith('/api/upload', expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }));

      const callArgs = mockFetch.mock.calls.find(call => call[0] === '/api/upload');
      expect(callArgs).toBeDefined();
      const body = callArgs[1].body;
      expect(body).toBeInstanceOf(FormData);
      expect(body.get('file')).toBe(fakeFile);
      expect(body.get('folder')).toBe('maps');
      expect(instance.successMessage.value).toMatch(/uploaded successfully/i);
      expect(event.target.value).toBe('');
    });

    it('handles file upload error gracefully', async () => {
      const instance = getSetupInstance();
      mockFetch.mockImplementationOnce((url) => {
        if (url === '/api/upload') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'File too large' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const fakeFile = new File(['oversized content'], 'huge.png', { type: 'image/png' });
      await instance.handleFileUpload({ target: { files: [fakeFile], value: 'huge.png' } });

      expect(instance.error.value).toBe('File too large');
    });
  });

  describe('User Management', () => {
    it('fetches existing users', async () => {
      const instance = getSetupInstance();
      await instance.fetchUsers();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/users', { credentials: 'include' });
      expect(instance.users.value).toHaveLength(1);
      expect(instance.users.value[0].username).toBe('admin');
    });

    it('creates a new user', async () => {
      const instance = getSetupInstance();
      instance.newUsername.value = 'newplayer';
      instance.newPassword.value = 'password123';
      instance.newRole.value = 'Player';

      mockFetch.mockImplementationOnce((url) => {
        if (url === '/api/auth/register') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ username: 'newplayer', role: 'Player' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      await instance.createUser();
      expect(instance.successMessage.value).toMatch(/created successfully/i);
      expect(instance.newUsername.value).toBe('');
      expect(instance.newPassword.value).toBe('');
    });

    it('resets user password', async () => {
      const instance = getSetupInstance();
      const user = { id: 2, username: 'player2' };
      window.prompt.mockReturnValue('newsecret123');

      await instance.resetPassword(user);
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/users/2/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: 'newsecret123' })
      });
      expect(instance.successMessage.value).toMatch(/updated successfully/i);
    });

    it('deletes user after confirmation', async () => {
      const instance = getSetupInstance();
      instance.users.value = [{ id: 2, username: 'player2' }];
      window.confirm.mockReturnValue(true);

      await instance.deleteUser({ id: 2, username: 'player2' });
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/users/2', {
        method: 'DELETE',
        credentials: 'include'
      });
      expect(instance.successMessage.value).toMatch(/deleted successfully/i);
      expect(instance.users.value).toEqual([]);
    });
  });
});


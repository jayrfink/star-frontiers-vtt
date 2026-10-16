import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('AdminView.vue - Token Assets Management', () => {
  let mockFetch;

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
          json: () => Promise.resolve({
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
            folders: ['', 'tokens', 'maps']
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

  describe('UI Template & Structure', () => {
    it('renders Token Assets Manager card in template with empty state', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);
      const app = createSSRApp(AdminView);
      app.use(pinia);
      const html = await renderToString(app);

      expect(html).toContain('Token Assets Manager');
      expect(html).toContain('token-search-input');
      expect(html).toContain('Refresh');
      expect(html).toContain('No token assets found.');
    });

    it('renders tokens table with preview, filename, metadata and action buttons', () => {
      const instance = getSetupInstance();
      const mockTokens = [
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
        }
      ];
      instance.tokens.value = mockTokens;

      const proxy = {
        error: '',
        successMessage: '',
        users: [],
        loading: false,
        creating: false,
        newUsername: '',
        newPassword: '',
        newRole: 'Player',
        tokens: mockTokens,
        filteredTokens: mockTokens,
        loadingTokens: false,
        tokenSearchQuery: '',
        formatFileSize: instance.formatFileSize,
        formatDate: instance.formatDate,
        fetchTokens: instance.fetchTokens,
        renameToken: instance.renameToken,
        deleteToken: instance.deleteToken,
      };

      const chunks = [];
      const _push = (chunk) => chunks.push(chunk);
      AdminView.ssrRender(proxy, _push, null, {}, {}, proxy);
      const html = chunks.join('');

      expect(html).toContain('Preview');
      expect(html).toContain('Filename');
      expect(html).toContain('Size');
      expect(html).toContain('Modified');
      expect(html).toContain('Actions');
      expect(html).toContain('dralasite.png');
      expect(html).toContain('vrusk.png');
      expect(html).toContain('token-thumb');
      expect(html).toContain('20.0 KB');
      expect(html).toContain('Rename');
      expect(html).toContain('Delete');
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

  describe('fetchTokens and token filtering', () => {
    it('fetches files from /api/upload/files and filters to only tokens folder', async () => {
      const instance = getSetupInstance();
      expect(instance.fetchTokens).toBeDefined();

      await instance.fetchTokens();
      expect(mockFetch).toHaveBeenCalledWith('/api/upload/files', { credentials: 'include' });
      expect(instance.tokens.value).toHaveLength(2);
      expect(instance.tokens.value.map(t => t.name)).toEqual(['dralasite.png', 'vrusk.png']);
    });

    it('handles fetchTokens API error gracefully', async () => {
      const instance = getSetupInstance();
      mockFetch.mockImplementationOnce((url) => {
        if (url === '/api/upload/files') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Server error loading uploads' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      await instance.fetchTokens();
      expect(instance.error.value).toBe('Server error loading uploads');
      expect(instance.tokens.value).toEqual([]);
    });

    it('filters tokens by filename search query', async () => {
      const instance = getSetupInstance();
      await instance.fetchTokens();

      instance.tokenSearchQuery.value = 'vrusk';
      expect(instance.filteredTokens.value).toHaveLength(1);
      expect(instance.filteredTokens.value[0].name).toBe('vrusk.png');

      instance.tokenSearchQuery.value = 'nonexistent';
      expect(instance.filteredTokens.value).toHaveLength(0);

      instance.tokenSearchQuery.value = '';
      expect(instance.filteredTokens.value).toHaveLength(2);
    });
  });

  describe('renameToken', () => {
    it('prompts for new name and calls PUT /api/upload/rename with trimmed new name', async () => {
      const instance = getSetupInstance();
      await instance.fetchTokens();

      const tokenToRename = instance.tokens.value[0]; // dralasite.png
      window.prompt.mockReturnValue('dralasite-warrior.png');

      await instance.renameToken(tokenToRename);

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

    it('cancels rename if prompt returns null or empty', async () => {
      const instance = getSetupInstance();
      await instance.fetchTokens();
      mockFetch.mockClear();

      const token = instance.tokens.value[0];
      window.prompt.mockReturnValue(null);
      await instance.renameToken(token);
      expect(mockFetch).not.toHaveBeenCalled();

      window.prompt.mockReturnValue('   ');
      await instance.renameToken(token);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles rename API error gracefully', async () => {
      const instance = getSetupInstance();
      await instance.fetchTokens();

      mockFetch.mockImplementationOnce((url) => {
        if (url === '/api/upload/rename') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Target file already exists' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      window.prompt.mockReturnValue('existing.png');
      await instance.renameToken(instance.tokens.value[0]);

      expect(instance.error.value).toBe('Target file already exists');
    });
  });

  describe('deleteToken', () => {
    it('prompts confirmation and calls DELETE /api/upload/file?path=...', async () => {
      const instance = getSetupInstance();
      await instance.fetchTokens();

      const tokenToDelete = instance.tokens.value[1]; // vrusk.png
      window.confirm.mockReturnValue(true);

      await instance.deleteToken(tokenToDelete);

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
      expect(instance.tokens.value.map(t => t.name)).not.toContain('vrusk.png');
    });

    it('does not call DELETE if user cancels confirmation', async () => {
      const instance = getSetupInstance();
      await instance.fetchTokens();
      mockFetch.mockClear();

      const token = instance.tokens.value[0];
      window.confirm.mockReturnValue(false);

      await instance.deleteToken(token);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles delete API error gracefully', async () => {
      const instance = getSetupInstance();
      await instance.fetchTokens();

      mockFetch.mockImplementationOnce((url) => {
        if (typeof url === 'string' && url.startsWith('/api/upload/file')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'File not found' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      window.confirm.mockReturnValue(true);
      await instance.deleteToken(instance.tokens.value[0]);

      expect(instance.error.value).toBe('File not found');
    });
  });
});

/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import GmNotesView from '../src/views/GmNotesView.vue';
import { useAuthStore } from '../src/stores/auth.js';

describe('GmNotesView Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const auth = useAuthStore();
    auth.user = { id: 1, username: 'gm', role: 'GameMaster' };
  });

  it('loads sessions and note panels on mount and renders editable panel titles and contents', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async (url) => {
      if (url === '/api/gm-notes/sessions') {
        return {
          ok: true,
          json: async () => [
            { id: 1, title: 'Session 1: Crash on Volturnus' },
            { id: 2, title: 'Session 2: Kurabanda Caves' },
          ],
        };
      }
      if (url === '/api/gm-notes/sessions/1/panels') {
        return {
          ok: true,
          json: async () => [
            { id: 10, session_id: 1, title: 'Introduction', content: 'Read aloud to players...' },
            { id: 11, session_id: 1, title: 'Part 1', content: 'Spawn 3 Sathar Troopers' },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });

    try {
      const wrapper = mount(GmNotesView);
      await flushPromises();

      const sessionItems = wrapper.findAll('.gm-session-item');
      expect(sessionItems).toHaveLength(2);
      expect(sessionItems[0].text()).toContain('Session 1: Crash on Volturnus');

      const panelCards = wrapper.findAll('.note-panel-card');
      expect(panelCards).toHaveLength(2);

      const titleInputs = wrapper.findAll('.panel-title-input');
      expect(titleInputs[0].element.value).toBe('Introduction');
      expect(titleInputs[1].element.value).toBe('Part 1');

      const contentAreas = wrapper.findAll('.panel-content-textarea');
      expect(contentAreas[0].element.value).toBe('Read aloud to players...');
      expect(contentAreas[1].element.value).toBe('Spawn 3 Sathar Troopers');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('creates a new note panel with preset or custom title and updates panel title/content', async () => {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = vi.fn(async (url, options = {}) => {
      calls.push({ url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null });
      if (url === '/api/gm-notes/sessions') {
        return { ok: true, json: async () => [{ id: 1, title: 'Session 1' }] };
      }
      if (url === '/api/gm-notes/sessions/1/panels' && (!options.method || options.method === 'GET')) {
        return {
          ok: true,
          json: async () => [{ id: 10, session_id: 1, title: 'Introduction', content: 'Initial' }],
        };
      }
      if (url === '/api/gm-notes/sessions/1/panels' && options.method === 'POST') {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({ id: 12, session_id: 1, title: body.title, content: body.content || '' }),
        };
      }
      if (url === '/api/gm-notes/panels/10' && options.method === 'PUT') {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({ id: 10, session_id: 1, title: body.title, content: body.content }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    try {
      const wrapper = mount(GmNotesView);
      await flushPromises();

      // Click "+ Part 1" preset button
      const addPartBtn = wrapper.find('[data-test="add-preset-Part 1"]');
      await addPartBtn.trigger('click');
      await flushPromises();

      expect(wrapper.findAll('.note-panel-card')).toHaveLength(2);
      expect(calls.some((c) => c.url === '/api/gm-notes/sessions/1/panels' && c.method === 'POST' && c.body.title === 'Part 1')).toBe(true);

      // Edit first panel's title and trigger change
      const firstTitleInput = wrapper.findAll('.panel-title-input')[0];
      await firstTitleInput.setValue('Act I: Briefing');
      await firstTitleInput.trigger('change');
      await flushPromises();

      expect(calls.some((c) => c.url === '/api/gm-notes/panels/10' && c.method === 'PUT' && c.body.title === 'Act I: Briefing')).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('guards against async session panel fetch race conditions and ignores out-of-order responses', async () => {
    const originalFetch = global.fetch;

    let resolveSession1;
    const session1Promise = new Promise((resolve) => {
      resolveSession1 = resolve;
    });

    let resolveSession2;
    const session2Promise = new Promise((resolve) => {
      resolveSession2 = resolve;
    });

    global.fetch = vi.fn(async (url) => {
      if (url === '/api/gm-notes/sessions') {
        return {
          ok: true,
          json: async () => [
            { id: 1, title: 'Session 1' },
            { id: 2, title: 'Session 2' },
          ],
        };
      }
      if (url === '/api/gm-notes/sessions/1/panels') {
        return session1Promise;
      }
      if (url === '/api/gm-notes/sessions/2/panels') {
        return session2Promise;
      }
      return { ok: true, json: async () => [] };
    });

    try {
      const wrapper = mount(GmNotesView);
      await flushPromises();

      // Session 1 is selected on mount and is waiting on session1Promise
      // User clicks on Session 2
      const sessionItems = wrapper.findAll('.gm-session-item');
      await sessionItems[1].trigger('click');

      // Session 2 resolves FIRST
      resolveSession2({
        ok: true,
        json: async () => [
          { id: 201, session_id: 2, title: 'Session 2 Panel', content: 'Correct active content' },
        ],
      });
      await flushPromises();

      expect(wrapper.findAll('.note-panel-card')).toHaveLength(1);
      expect(wrapper.find('.panel-title-input').element.value).toBe('Session 2 Panel');

      // The slow Session 1 response finally resolves LATER
      resolveSession1({
        ok: true,
        json: async () => [
          { id: 101, session_id: 1, title: 'Session 1 Stale Panel', content: 'Stale content' },
        ],
      });
      await flushPromises();

      // Active panels must STILL be Session 2's panels, not overwritten by Session 1
      expect(wrapper.findAll('.note-panel-card')).toHaveLength(1);
      expect(wrapper.find('.panel-title-input').element.value).toBe('Session 2 Panel');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('does not contain invalid list-style: border-box CSS typo (Bug 3.6)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../src/views/GmNotesView.vue'), 'utf-8');
    expect(source).not.toContain('list-style: border-box');
    expect(source).toContain('box-sizing: border-box');
  });
});

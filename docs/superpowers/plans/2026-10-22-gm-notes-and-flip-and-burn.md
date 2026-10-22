# GM Notes Tab & Space Combat Flip and Burn Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GameMaster-only "GM Notes" tab with session management and renamable note panels ("Introduction", "Part 1", etc.), and implement the Space Combat "Flip and Burn" mechanic (`MR > 3` eligibility, 180° token flip, crew STA check, and `1d10 × 10` seconds blackout duration roller).

**Architecture:**
1. **Backend GM Notes (`server/src/db.js`, `server/src/gmNotes.js`, `server/src/index.js`):** Add `gm_sessions` and `gm_note_panels` tables in SQLite and expose `/api/gm-notes` CRUD endpoints guarded by `requireAuth` and `requireGM`.
2. **Frontend GM Notes (`client/src/views/GmNotesView.vue`, `client/src/components/NavBar.vue`, `client/src/router.js`):** Add the GM-only route `/dashboard/gm-notes` and navbar tab `📓 GM Notes`, with a session sidebar and a main workspace of renamable, auto-saving note panel cards.
3. **Space Combat Flip & Burn (`client/src/utils/flipAndBurn.js`, `client/src/views/SpaceVttView.vue`, `client/src/views/ShipSheetsView.vue`):** Add pure helpers for `MR > 3` eligibility, 180° heading reversal, and `1d10 × 10`s blackout math; wire the Flip & Burn action and crew STA / blackout rollers into the Space VTT Token Inspector and add a Flip & Burn capability banner to the Ship Sheets view.

**Tech Stack:** Node.js, Express, better-sqlite3, Vue 3, Vue Router, Pinia, Vitest, Supertest.

## Global Constraints

- All tests must be executed inside the running Docker container `sf-vtt-dev` (whose working directory is `/Users/jrf/star-frontiers-vtt`).
- If `sf-vtt-dev` is stopped after a host restart, start it first (`docker start sf-vtt-dev`).
- `/api/gm-notes` routes must be strictly restricted to users with `role === 'GameMaster'` (`401` if unauthenticated, `403` if `Player`).
- Flip and Burn requires `MR > 3` (`Number(mr) > 3`, i.e., `MR >= 4`).
- Failing a Flip and Burn STA check causes strapped-in PCs to pass out for `1d10 * 10` seconds (`10` to `100` seconds).

---

### Task 1: Backend GM Notes Schema & REST API (`/api/gm-notes`)

**Files:**
- Modify: `server/src/db.js:155-175`
- Create: `server/src/gmNotes.js`
- Modify: `server/src/index.js:14-56`
- Create: `server/test/gmNotes.test.js`

**Interfaces:**
- Consumes:
  - `requireAuth`, `requireGM` from `server/src/middleware.js`
- Produces:
  - `createGmNotesRouter(db)` in `server/src/gmNotes.js`, mounted at `/api/gm-notes` in `server/src/index.js`:
    - `GET /api/gm-notes/sessions` -> returns array of sessions (seeds default `"Session 1"` with `"Introduction"` and `"Part 1"` panels if none exist)
    - `POST /api/gm-notes/sessions` -> `{ title }` -> returns `201` session object (seeds `"Introduction"` panel)
    - `PUT /api/gm-notes/sessions/:id` -> `{ title }` -> returns `200` updated session
    - `DELETE /api/gm-notes/sessions/:id` -> returns `200` `{ ok: true }`
    - `GET /api/gm-notes/sessions/:id/panels` -> returns array of note panels for session `:id`
    - `POST /api/gm-notes/sessions/:id/panels` -> `{ title, content }` -> returns `201` created panel
    - `PUT /api/gm-notes/panels/:id` -> `{ title, content }` -> returns `200` updated panel
    - `DELETE /api/gm-notes/panels/:id` -> returns `200` `{ ok: true }`

- [ ] **Step 1: Write the failing backend tests in `server/test/gmNotes.test.js`**

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';

describe('GM Notes API (/api/gm-notes)', () => {
  let db, app, server, gmAgent, playerAgent;

  beforeEach(async () => {
    db = createTestDb();
    const result = createApp(db, ':memory:');
    app = result.app;
    server = result.server;

    gmAgent = request.agent(app);
    await gmAgent.post('/api/auth/register').send({ username: 'gm_notes_user', password: 'password123' });
    await gmAgent.post('/api/auth/login').send({ username: 'gm_notes_user', password: 'password123' });

    playerAgent = request.agent(app);
    await gmAgent.post('/api/auth/register').send({ username: 'player_notes_user', password: 'password123' });
    await playerAgent.post('/api/auth/login').send({ username: 'player_notes_user', password: 'password123' });
  });

  afterEach(() => {
    if (db) db.close();
    if (server && server.close) server.close();
  });

  it('denies unauthenticated (401) and Player (403) access to /api/gm-notes', async () => {
    const unauthRes = await request(app).get('/api/gm-notes/sessions');
    expect(unauthRes.status).toBe(401);

    const playerRes = await playerAgent.get('/api/gm-notes/sessions');
    expect(playerRes.status).toBe(403);
  });

  it('auto-seeds a default Session 1 with "Introduction" and "Part 1" panels on first GET', async () => {
    const sessionsRes = await gmAgent.get('/api/gm-notes/sessions');
    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body).toHaveLength(1);
    expect(sessionsRes.body[0].title).toBe('Session 1');

    const sessionId = sessionsRes.body[0].id;
    const panelsRes = await gmAgent.get(`/api/gm-notes/sessions/${sessionId}/panels`);
    expect(panelsRes.status).toBe(200);
    expect(panelsRes.body).toHaveLength(2);
    expect(panelsRes.body[0].title).toBe('Introduction');
    expect(panelsRes.body[1].title).toBe('Part 1');
  });

  it('allows GM to create, rename, and delete sessions and note panels', async () => {
    // Create new session
    const createSessionRes = await gmAgent
      .post('/api/gm-notes/sessions')
      .send({ title: 'Session 2: Escape from Volturnus' });
    expect(createSessionRes.status).toBe(201);
    const sessionId = createSessionRes.body.id;
    expect(createSessionRes.body.title).toBe('Session 2: Escape from Volturnus');

    // Rename session
    const renameSessionRes = await gmAgent
      .put(`/api/gm-notes/sessions/${sessionId}`)
      .send({ title: 'Session 2: Sathar Ambush' });
    expect(renameSessionRes.status).toBe(200);
    expect(renameSessionRes.body.title).toBe('Session 2: Sathar Ambush');

    // Create note panel
    const createPanelRes = await gmAgent
      .post(`/api/gm-notes/sessions/${sessionId}/panels`)
      .send({ title: 'Adversaries to Spawn', content: '3x Sathar Shock Troopers (Tier 2)' });
    expect(createPanelRes.status).toBe(201);
    const panelId = createPanelRes.body.id;
    expect(createPanelRes.body.title).toBe('Adversaries to Spawn');
    expect(createPanelRes.body.content).toBe('3x Sathar Shock Troopers (Tier 2)');

    // Update note panel title and content
    const updatePanelRes = await gmAgent
      .put(`/api/gm-notes/panels/${panelId}`)
      .send({ title: 'Part 2: Docking Bay', content: 'Readout: The airlock hisses open...' });
    expect(updatePanelRes.status).toBe(200);
    expect(updatePanelRes.body.title).toBe('Part 2: Docking Bay');
    expect(updatePanelRes.body.content).toBe('Readout: The airlock hisses open...');

    // Delete note panel
    const deletePanelRes = await gmAgent.delete(`/api/gm-notes/panels/${panelId}`);
    expect(deletePanelRes.status).toBe(200);
    expect(deletePanelRes.body.ok).toBe(true);

    // Delete session
    const deleteSessionRes = await gmAgent.delete(`/api/gm-notes/sessions/${sessionId}`);
    expect(deleteSessionRes.status).toBe(200);
    expect(deleteSessionRes.body.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/gmNotes.test.js"`
Expected: FAIL (`404` on `/api/gm-notes/sessions`).

- [ ] **Step 3: Add `gm_sessions` and `gm_note_panels` tables in `server/src/db.js`, create `server/src/gmNotes.js`, and mount in `server/src/index.js`**

1. In `server/src/db.js`, inside `migrate(db)` right after the `roll_logs` table creation (around line 170):
```sql
    CREATE TABLE IF NOT EXISTS gm_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT 'Session 1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gm_note_panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT 'New Note',
      content TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES gm_sessions(id) ON DELETE CASCADE
    );
```

2. Create `server/src/gmNotes.js`:
```javascript
import { Router } from 'express';
import { requireAuth, requireGM } from './middleware.js';

export function createGmNotesRouter(db) {
  const router = Router();
  router.use(requireAuth, requireGM);

  // GET /api/gm-notes/sessions - List all GM sessions (seeds default Session 1 if empty)
  router.get('/sessions', (req, res) => {
    try {
      let sessions = db.prepare('SELECT * FROM gm_sessions ORDER BY id ASC').all();
      if (sessions.length === 0) {
        const userId = req.session.user.id;
        const info = db
          .prepare('INSERT INTO gm_sessions (user_id, title) VALUES (?, ?)')
          .run(userId, 'Session 1');
        const sessionId = info.lastInsertRowid;

        const insertPanel = db.prepare(
          'INSERT INTO gm_note_panels (session_id, title, content, sort_order) VALUES (?, ?, ?, ?)'
        );
        insertPanel.run(sessionId, 'Introduction', '', 0);
        insertPanel.run(sessionId, 'Part 1', '', 1);

        sessions = db.prepare('SELECT * FROM gm_sessions ORDER BY id ASC').all();
      }
      res.json(sessions);
    } catch (err) {
      console.error('Error listing GM sessions:', err);
      res.status(500).json({ error: 'Failed to list GM sessions' });
    }
  });

  // POST /api/gm-notes/sessions - Create a new session
  router.post('/sessions', (req, res) => {
    try {
      const userId = req.session.user.id;
      const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      const title = rawTitle || 'New Session';

      const info = db
        .prepare('INSERT INTO gm_sessions (user_id, title) VALUES (?, ?)')
        .run(userId, title);
      const sessionId = info.lastInsertRowid;

      db.prepare(
        'INSERT INTO gm_note_panels (session_id, title, content, sort_order) VALUES (?, ?, ?, ?)'
      ).run(sessionId, 'Introduction', '', 0);

      const created = db.prepare('SELECT * FROM gm_sessions WHERE id = ?').get(sessionId);
      res.status(201).json(created);
    } catch (err) {
      console.error('Error creating GM session:', err);
      res.status(500).json({ error: 'Failed to create GM session' });
    }
  });

  // PUT /api/gm-notes/sessions/:id - Rename a session
  router.put('/sessions/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM gm_sessions WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'GM session not found' });
      }
      const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      const title = rawTitle || existing.title;

      db.prepare(
        'UPDATE gm_sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(title, req.params.id);

      const updated = db.prepare('SELECT * FROM gm_sessions WHERE id = ?').get(req.params.id);
      res.json(updated);
    } catch (err) {
      console.error('Error updating GM session:', err);
      res.status(500).json({ error: 'Failed to update GM session' });
    }
  });

  // DELETE /api/gm-notes/sessions/:id - Delete a session and its panels
  router.delete('/sessions/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT id FROM gm_sessions WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'GM session not found' });
      }
      db.prepare('DELETE FROM gm_sessions WHERE id = ?').run(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error('Error deleting GM session:', err);
      res.status(500).json({ error: 'Failed to delete GM session' });
    }
  });

  // GET /api/gm-notes/sessions/:id/panels - List panels for a session
  router.get('/sessions/:id/panels', (req, res) => {
    try {
      const session = db.prepare('SELECT id FROM gm_sessions WHERE id = ?').get(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'GM session not found' });
      }
      const panels = db
        .prepare('SELECT * FROM gm_note_panels WHERE session_id = ? ORDER BY sort_order ASC, id ASC')
        .all(req.params.id);
      res.json(panels);
    } catch (err) {
      console.error('Error listing GM note panels:', err);
      res.status(500).json({ error: 'Failed to list GM note panels' });
    }
  });

  // POST /api/gm-notes/sessions/:id/panels - Create a new panel in a session
  router.post('/sessions/:id/panels', (req, res) => {
    try {
      const session = db.prepare('SELECT id FROM gm_sessions WHERE id = ?').get(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'GM session not found' });
      }
      const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      const title = rawTitle || 'New Note';
      const content = typeof req.body?.content === 'string' ? req.body.content : '';

      const maxOrderRow = db
        .prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM gm_note_panels WHERE session_id = ?')
        .get(req.params.id);
      const nextOrder = (maxOrderRow?.max_order ?? -1) + 1;

      const info = db
        .prepare(
          'INSERT INTO gm_note_panels (session_id, title, content, sort_order) VALUES (?, ?, ?, ?)'
        )
        .run(req.params.id, title, content, nextOrder);

      const created = db
        .prepare('SELECT * FROM gm_note_panels WHERE id = ?')
        .get(info.lastInsertRowid);
      res.status(201).json(created);
    } catch (err) {
      console.error('Error creating GM note panel:', err);
      res.status(500).json({ error: 'Failed to create GM note panel' });
    }
  });

  // PUT /api/gm-notes/panels/:id - Update a note panel's title and/or content
  router.put('/panels/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM gm_note_panels WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Note panel not found' });
      }
      const rawTitle =
        req.body?.title !== undefined ? String(req.body.title).trim() : existing.title;
      const title = rawTitle || existing.title;
      const content =
        req.body?.content !== undefined ? String(req.body.content) : existing.content;

      db.prepare(
        'UPDATE gm_note_panels SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(title, content, req.params.id);

      const updated = db.prepare('SELECT * FROM gm_note_panels WHERE id = ?').get(req.params.id);
      res.json(updated);
    } catch (err) {
      console.error('Error updating GM note panel:', err);
      res.status(500).json({ error: 'Failed to update GM note panel' });
    }
  });

  // DELETE /api/gm-notes/panels/:id - Delete a note panel
  router.delete('/panels/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT id FROM gm_note_panels WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Note panel not found' });
      }
      db.prepare('DELETE FROM gm_note_panels WHERE id = ?').run(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error('Error deleting GM note panel:', err);
      res.status(500).json({ error: 'Failed to delete GM note panel' });
    }
  });

  return router;
}
```

3. In `server/src/index.js`:
- Import `createGmNotesRouter` from `./gmNotes.js`
- Mount `app.use('/api/gm-notes', createGmNotesRouter(db));` right after `app.use('/api/vehicles', createVehiclesRouter(db, io));`.

- [ ] **Step 4: Run the backend test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/gmNotes.test.js"`
Expected: PASS (all 3 tests passing).

- [ ] **Step 5: Commit Task 1**

```bash
git add server/src/db.js server/src/gmNotes.js server/src/index.js server/test/gmNotes.test.js
git commit -m "feat(server): add GM-only sessions and note panels API (/api/gm-notes)"
```

---

### Task 2: Frontend GM-Only "GM Notes" Tab (`GmNotesView.vue`, `NavBar.vue`, `router.js`)

**Files:**
- Create: `client/src/views/GmNotesView.vue`
- Modify: `client/src/components/NavBar.vue:60-78`
- Modify: `client/src/router.js:11-67`
- Create: `client/test/GmNotesView.test.js`
- Modify: `client/test/NavBar.test.js`
- Modify: `client/test/router.test.js`

**Interfaces:**
- Consumes:
  - `/api/gm-notes/sessions`, `/api/gm-notes/sessions/:id/panels`, `/api/gm-notes/panels/:id` from Task 1
- Produces:
  - `GmNotesView.vue` with session list sidebar and customizable Note Panel cards (`Introduction`, `Part 1`, etc.)
  - `NavBar.vue` showing `📓 GM Notes` (`/dashboard/gm-notes`) only when `auth.user?.role === 'GameMaster'`
  - `router.js` route `/dashboard/gm-notes` with `meta: { requiresAuth: true, requiresGm: true, title: 'GM Notes' }`

- [ ] **Step 1: Write the failing frontend tests in `client/test/GmNotesView.test.js`**

```javascript
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
});
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/GmNotesView.test.js"`
Expected: FAIL (`Failed to resolve import "../src/views/GmNotesView.vue"`).

- [ ] **Step 3: Implement `GmNotesView.vue` and update `NavBar.vue`, `router.js`, and existing nav/router tests**

1. Create `client/src/views/GmNotesView.vue`:
```vue
<template>
  <div class="gm-notes-layout">
    <!-- Left Sidebar: Campaign Sessions -->
    <aside class="sessions-sidebar">
      <div class="sidebar-header">
        <h3>📓 GM Sessions</h3>
        <button type="button" class="btn-primary btn-new-session" @click="createNewSession">
          + New Session
        </button>
      </div>

      <div v-if="loadingSessions" class="sidebar-loading">Loading sessions...</div>
      <div v-else-if="sessions.length === 0" class="sidebar-empty">
        No sessions yet. Click "+ New Session" to start planning!
      </div>
      <ul v-else class="session-list">
        <li
          v-for="sess in sessions"
          :key="sess.id"
          class="gm-session-item"
          :class="{ active: selectedSession && selectedSession.id === sess.id }"
          @click="selectSession(sess)"
        >
          <span class="session-title-text">{{ sess.title }}</span>
          <button
            type="button"
            class="btn-delete-small"
            title="Delete Session"
            @click.stop="deleteSession(sess.id)"
          >
            ✕
          </button>
        </li>
      </ul>
    </aside>

    <!-- Main Workspace: Session Note Panels -->
    <main class="notes-workspace">
      <div v-if="!selectedSession" class="no-selection">
        <div class="stub-icon">📓</div>
        <h2>GameMaster Private Session Notes</h2>
        <p>Select a session from the sidebar or create a new session to organize your readouts, encounter notes, and adversaries.</p>
      </div>

      <div v-else class="workspace-container">
        <!-- Session Header Bar -->
        <header class="session-header card">
          <div class="session-title-group">
            <span class="gm-only-pill" title="Visible only to the GameMaster">🔒 GM ONLY</span>
            <input
              type="text"
              v-model="selectedSession.title"
              @change="updateSelectedSessionTitle"
              class="session-title-input"
              placeholder="Session Title (e.g. Session 1: Outpost on Volturnus)"
            />
          </div>

          <div class="panel-actions-bar">
            <button type="button" class="btn-add-panel" @click="createNotePanel('New Note')">
              + Add Note Panel
            </button>
            <div class="preset-chips">
              <span class="preset-label">Quick Add:</span>
              <button
                v-for="preset in panelPresets"
                :key="preset"
                type="button"
                class="btn-preset-chip"
                :data-test="`add-preset-${preset}`"
                @click="createNotePanel(preset)"
              >
                + {{ preset }}
              </button>
            </div>
          </div>
        </header>

        <!-- Note Panels Grid -->
        <div v-if="loadingPanels" class="panels-loading">Loading note panels...</div>
        <div v-else-if="panels.length === 0" class="panels-empty card">
          <p>No note panels in this session yet. Click <strong>+ Add Note Panel</strong> or one of the quick-add buttons above!</p>
        </div>
        <div v-else class="note-panels-grid">
          <section
            v-for="panel in panels"
            :key="panel.id"
            class="note-panel-card card"
          >
            <div class="panel-card-header">
              <input
                type="text"
                v-model="panel.title"
                @change="savePanel(panel)"
                class="panel-title-input"
                placeholder="Note Title (e.g. Introduction, Part 1)"
              />
              <span v-if="savingPanelId === panel.id" class="save-status">Saving...</span>
              <button
                type="button"
                class="btn-delete-panel"
                title="Delete Note Panel"
                @click="deletePanel(panel.id)"
              >
                ✕
              </button>
            </div>
            <textarea
              v-model="panel.content"
              @change="savePanel(panel)"
              class="panel-content-textarea"
              rows="8"
              placeholder="Write box-text readouts, adversaries to spawn, clues, or tactical reminders..."
            ></textarea>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';

const sessions = ref([]);
const selectedSession = ref(null);
const panels = ref([]);
const loadingSessions = ref(false);
const loadingPanels = ref(false);
const savingPanelId = ref(null);

const panelPresets = ['Introduction', 'Part 1', 'Part 2', 'Readout', 'Adversaries'];

function getSavedSessionId() {
  const state = getUserState(getSafeUserId(), 'gmNotes', { selectedSessionId: null });
  return state.selectedSessionId;
}

function persistSelectedSessionId(id) {
  saveUserState(getSafeUserId(), 'gmNotes', { selectedSessionId: id });
}

async function fetchSessions() {
  loadingSessions.value = true;
  try {
    const res = await fetch('/api/gm-notes/sessions', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      sessions.value = data || [];
      if (sessions.value.length > 0) {
        const savedId = getSavedSessionId();
        const found = sessions.value.find((s) => s.id === savedId) || sessions.value[0];
        await selectSession(found);
      } else {
        selectedSession.value = null;
        panels.value = [];
      }
    }
  } catch (err) {
    console.error('Failed to fetch GM sessions:', err);
  } finally {
    loadingSessions.value = false;
  }
}

async function selectSession(sess) {
  selectedSession.value = sess;
  persistSelectedSessionId(sess?.id ?? null);
  if (!sess) {
    panels.value = [];
    return;
  }
  loadingPanels.value = true;
  try {
    const res = await fetch(`/api/gm-notes/sessions/${sess.id}/panels`, { credentials: 'include' });
    if (res.ok) {
      panels.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load session note panels:', err);
  } finally {
    loadingPanels.value = false;
  }
}

async function createNewSession() {
  const nextNum = sessions.value.length + 1;
  try {
    const res = await fetch('/api/gm-notes/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: `Session ${nextNum}` }),
    });
    if (res.ok) {
      const created = await res.json();
      sessions.value.push(created);
      await selectSession(created);
    }
  } catch (err) {
    console.error('Failed to create GM session:', err);
  }
}

async function updateSelectedSessionTitle() {
  if (!selectedSession.value) return;
  try {
    const res = await fetch(`/api/gm-notes/sessions/${selectedSession.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: selectedSession.value.title }),
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = sessions.value.findIndex((s) => s.id === updated.id);
      if (idx !== -1) sessions.value[idx] = updated;
      selectedSession.value = updated;
    }
  } catch (err) {
    console.error('Failed to update session title:', err);
  }
}

async function deleteSession(sessionId) {
  if (typeof confirm === 'function' && !confirm('Delete this session and all its note panels?')) {
    return;
  }
  try {
    const res = await fetch(`/api/gm-notes/sessions/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      sessions.value = sessions.value.filter((s) => s.id !== sessionId);
      if (selectedSession.value && selectedSession.value.id === sessionId) {
        const next = sessions.value[0] || null;
        await selectSession(next);
      }
    }
  } catch (err) {
    console.error('Failed to delete session:', err);
  }
}

async function createNotePanel(defaultTitle = 'New Note') {
  if (!selectedSession.value) return;
  try {
    const res = await fetch(`/api/gm-notes/sessions/${selectedSession.value.id}/panels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: defaultTitle, content: '' }),
    });
    if (res.ok) {
      const created = await res.json();
      panels.value.push(created);
    }
  } catch (err) {
    console.error('Failed to create note panel:', err);
  }
}

async function savePanel(panel) {
  if (!panel || !panel.id) return;
  savingPanelId.value = panel.id;
  try {
    const res = await fetch(`/api/gm-notes/panels/${panel.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: panel.title,
        content: panel.content,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = panels.value.findIndex((p) => p.id === updated.id);
      if (idx !== -1) panels.value[idx] = updated;
    }
  } catch (err) {
    console.error('Failed to save note panel:', err);
  } finally {
    savingPanelId.value = null;
  }
}

async function deletePanel(panelId) {
  if (typeof confirm === 'function' && !confirm('Delete this note panel?')) {
    return;
  }
  try {
    const res = await fetch(`/api/gm-notes/panels/${panelId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      panels.value = panels.value.filter((p) => p.id !== panelId);
    }
  } catch (err) {
    console.error('Failed to delete note panel:', err);
  }
}

onMounted(() => {
  fetchSessions();
});
</script>

<style scoped>
.gm-notes-layout {
  display: flex;
  height: calc(100vh - 48px);
  background: var(--bg-primary, #0d1117);
  color: var(--text-primary, #f0f6fc);
  overflow: hidden;
}

.sessions-sidebar {
  width: 270px;
  background: var(--bg-secondary, #161b22);
  border-right: 1px solid var(--border, #30363d);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border, #30363d);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #38bdf8;
}

.btn-new-session {
  background: #0284c7;
  color: #ffffff;
  border: 1px solid #38bdf8;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-new-session:hover {
  background: #0369a1;
}

.session-list {
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}

.gm-session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.15s;
}

.gm-session-item:hover {
  background: rgba(56, 189, 248, 0.08);
}

.gm-session-item.active {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
}

.session-title-text {
  font-weight: 600;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-delete-small {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-delete-small:hover {
  color: #f87171;
  background: rgba(239, 68, 68, 0.15);
}

.notes-workspace {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.workspace-container {
  max-width: 1300px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.card {
  background: var(--bg-secondary, #161b22);
  border: 1px solid var(--border, #30363d);
  border-radius: 8px;
  padding: 16px;
}

.session-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.session-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gm-only-pill {
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid #f59e0b;
  color: #fcd34d;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.session-title-input {
  flex: 1;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #f8fafc;
  font-size: 1.2rem;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: 6px;
}

.panel-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.btn-add-panel {
  background: #0284c7;
  border: 1px solid #38bdf8;
  color: #ffffff;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-add-panel:hover {
  background: #0369a1;
}

.preset-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-label {
  font-size: 0.78rem;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 600;
}

.btn-preset-chip {
  background: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-preset-chip:hover {
  border-color: #38bdf8;
  color: #38bdf8;
}

.note-panels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 16px;
}

.note-panel-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title-input {
  flex: 1;
  background: #0d1117;
  border: 1px solid #334155;
  color: #38bdf8;
  font-size: 1rem;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 6px;
}

.save-status {
  font-size: 0.75rem;
  color: #94a3b8;
}

.btn-delete-panel {
  background: transparent;
  border: 1px solid transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-delete-panel:hover {
  color: #f87171;
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}

.panel-content-textarea {
  width: 100%;
  box-sizing: border-box;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #e2e8f0;
  border-radius: 6px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 0.92rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 160px;
}

.no-selection,
.sidebar-loading,
.sidebar-empty,
.panels-loading,
.panels-empty {
  text-align: center;
  color: #94a3b8;
  padding: 32px 16px;
}

.stub-icon {
  font-size: 2.5rem;
  margin-bottom: 8px;
}
</style>
```

2. In `client/src/components/NavBar.vue` (lines 68-76), add `{ path: '/dashboard/gm-notes', label: 'GM Notes', icon: '📓' }` for GameMaster users:
```javascript
const tabs = computed(() => {
  if (auth.user?.role === 'GameMaster') {
    return [
      ...baseTabs,
      { path: '/dashboard/gm-notes', label: 'GM Notes', icon: '📓' },
      { path: '/dashboard/admin', label: 'Admin', icon: '⚙️' },
    ];
  }
  return baseTabs;
});
```

3. In `client/src/router.js`:
- Import `GmNotesView` from `./views/GmNotesView.vue`.
- Add `'/dashboard/gm-notes'` to `ALLOWED_DASHBOARD_PATHS` and `'GmNotes'` to `ALLOWED_DASHBOARD_NAMES`.
- In `getSavedDashboardPath(user)`:
  ```javascript
  if ((lastPath === '/dashboard/admin' || lastPath === '/dashboard/gm-notes') && user.role !== 'GameMaster') {
    return defaultPath;
  }
  ```
- In `routes` children of `/dashboard`, add:
  ```javascript
  { path: 'gm-notes', name: 'GmNotes', component: GmNotesView, meta: { requiresAuth: true, requiresGm: true, title: 'GM Notes' } },
  ```

4. Update `client/test/NavBar.test.js` and `client/test/router.test.js` if needed to assert that `GM Notes` is visible for `GameMaster` and hidden/blocked for `Player`.

- [ ] **Step 4: Run the frontend tests to verify they pass**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/GmNotesView.test.js test/NavBar.test.js test/router.test.js"`
Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add client/src/views/GmNotesView.vue client/src/components/NavBar.vue client/src/router.js client/test/GmNotesView.test.js client/test/NavBar.test.js client/test/router.test.js
git commit -m "feat(client): add GM-only GM Notes tab with sessions and editable note panels"
```

---

### Task 3: Space Combat "Flip and Burn" Maneuver (`MR > 3`) & Crew STA / Blackout Rollers

**Files:**
- Create: `client/src/utils/flipAndBurn.js`
- Modify: `client/src/views/SpaceVttView.vue:500-550,1200-1250`
- Modify: `client/src/views/ShipSheetsView.vue:112-138`
- Create: `client/test/flipAndBurn.test.js`

**Interfaces:**
- Produces:
  - `canFlipAndBurn(mr)` in `client/src/utils/flipAndBurn.js` -> `boolean` (`Number(mr) > 3`)
  - `calculateFlipHeading(currentRotation)` in `client/src/utils/flipAndBurn.js` -> `number` (`(rot + 180) % 360`)
  - `calculateBlackoutSeconds(d10Value)` in `client/src/utils/flipAndBurn.js` -> `number` (`d10Value * 10`)
  - `formatFlipAndBurnAlert(shipName, newHeading)` in `client/src/utils/flipAndBurn.js` -> `string`

- [ ] **Step 1: Write the failing unit tests in `client/test/flipAndBurn.test.js`**

```javascript
import { describe, it, expect } from 'vitest';
import {
  canFlipAndBurn,
  calculateFlipHeading,
  calculateBlackoutSeconds,
  formatFlipAndBurnAlert,
} from '../src/utils/flipAndBurn.js';

describe('Space Combat: Flip and Burn Mechanics', () => {
  describe('canFlipAndBurn', () => {
    it('returns false when MR is 3 or less', () => {
      expect(canFlipAndBurn(0)).toBe(false);
      expect(canFlipAndBurn(1)).toBe(false);
      expect(canFlipAndBurn(2)).toBe(false);
      expect(canFlipAndBurn(3)).toBe(false);
      expect(canFlipAndBurn(null)).toBe(false);
      expect(canFlipAndBurn(undefined)).toBe(false);
    });

    it('returns true when MR is strictly greater than 3', () => {
      expect(canFlipAndBurn(4)).toBe(true);
      expect(canFlipAndBurn(5)).toBe(true);
      expect(canFlipAndBurn('4')).toBe(true);
    });
  });

  describe('calculateFlipHeading', () => {
    it('rotates heading by 180 degrees modulo 360', () => {
      expect(calculateFlipHeading(0)).toBe(180);
      expect(calculateFlipHeading(60)).toBe(240);
      expect(calculateFlipHeading(120)).toBe(300);
      expect(calculateFlipHeading(180)).toBe(0);
      expect(calculateFlipHeading(240)).toBe(60);
      expect(calculateFlipHeading(300)).toBe(120);
    });
  });

  describe('calculateBlackoutSeconds', () => {
    it('calculates 1d10 * 10 seconds (10s to 100s)', () => {
      expect(calculateBlackoutSeconds(1)).toBe(10);
      expect(calculateBlackoutSeconds(5)).toBe(50);
      expect(calculateBlackoutSeconds(10)).toBe(100);
    });
  });

  describe('formatFlipAndBurnAlert', () => {
    it('includes ship name, new heading, STA check requirement, and 1d10*10s blackout duration', () => {
      const msg = formatFlipAndBurnAlert('UPF Interceptor', 180);
      expect(msg).toContain('UPF Interceptor');
      expect(msg).toContain('180°');
      expect(msg).toContain('STA');
      expect(msg).toContain('1d10');
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/flipAndBurn.test.js"`
Expected: FAIL (`Cannot find module '../src/utils/flipAndBurn.js'`).

- [ ] **Step 3: Implement `client/src/utils/flipAndBurn.js`, update `SpaceVttView.vue`, and update `ShipSheetsView.vue`**

1. Create `client/src/utils/flipAndBurn.js`:
```javascript
export const FLIP_AND_BURN_MIN_MR = 4;

/**
 * Any ship with an MR strictly higher than 3 (MR >= 4) can execute a Flip and Burn.
 * @param {number|string} mr
 * @returns {boolean}
 */
export function canFlipAndBurn(mr) {
  const n = Number(mr);
  return Number.isFinite(n) && n > 3;
}

/**
 * Reverses a ship's heading by 180 degrees (normalized to 0..359).
 * @param {number} currentRotation
 * @returns {number}
 */
export function calculateFlipHeading(currentRotation) {
  const cur = Number(currentRotation) || 0;
  return (((cur + 180) % 360) + 360) % 360;
}

/**
 * Strapped-in PCs who fail their STA check pass out for 1d10 * 10 seconds.
 * @param {number} dieValue (1-10)
 * @returns {number}
 */
export function calculateBlackoutSeconds(dieValue) {
  const d = Math.max(1, Math.min(10, Math.round(Number(dieValue) || 1)));
  return d * 10;
}

/**
 * Formats the tactical roll log announcement for a Flip and Burn maneuver.
 * @param {string} shipName
 * @param {number} newHeading
 * @returns {string}
 */
export function formatFlipAndBurnAlert(shipName, newHeading) {
  const name = shipName || 'Ship';
  return `Heading reversed to ${newHeading}°. Strapped-in PCs aboard ${name} must pass a STA check (d% <= STA) or pass out for 1d10×10 seconds!`;
}
```

2. In `client/src/views/SpaceVttView.vue`:
- Import `{ canFlipAndBurn, calculateFlipHeading, calculateBlackoutSeconds, formatFlipAndBurnAlert } from '../utils/flipAndBurn.js';`
- Add computed properties near `selectedToken`:
```javascript
const selectedTokenLinkedShip = computed(() => {
  if (!selectedToken.value || isCelestialToken(selectedToken.value) || !selectedToken.value.character_id) {
    return null;
  }
  return ships.value.find((s) => s.id === selectedToken.value.character_id) || null;
});

const selectedTokenCanFlipAndBurn = computed(() => {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return false;
  if (selectedTokenLinkedShip.value) {
    return canFlipAndBurn(selectedTokenLinkedShip.value.mr);
  }
  return true;
});
```
- Add methods `executeFlipAndBurn`, `rollFlipAndBurnStaCheck`, and `rollFlipAndBurnBlackout`:
```javascript
async function executeFlipAndBurn() {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return;
  if (!selectedTokenCanFlipAndBurn.value) return;

  const newRotation = calculateFlipHeading(selectedToken.value.rotation || 0);
  await rotateSelectedToken(180);

  sendRollToServer({
    type: 'percentile',
    label: `${selectedToken.value.name}: 🔄 Flip & Burn (180°)`,
    total: newRotation,
    breakdown: formatFlipAndBurnAlert(selectedToken.value.name, newRotation),
  });
}

async function rollFlipAndBurnStaCheck() {
  const shipName = selectedToken.value?.name || 'Ship';
  playDiceSound({ isRemote: false });
  if (diceBoxInstance) {
    showPercentileHud.value = false;
    showDamageHud.value = false;
    if (percentileHudTimeout) clearTimeout(percentileHudTimeout);

    try {
      const results = await diceBoxInstance.roll([
        { sides: 10, theme: 'custom-ones', themeColor: '#77d19e', qty: 1 },
        { sides: 10, theme: 'custom-tens', themeColor: '#22384a', qty: 1 },
      ]);
      const rollSummary = calculatePercentileRoll(results);
      if (rollSummary.valid) {
        lastPercentileRoll.value = {
          ...rollSummary,
          username: authStore.user?.username,
          role: authStore.user?.role,
        };
        showPercentileHud.value = true;
        sendRollToServer({
          type: 'percentile',
          label: `${shipName}: Flip & Burn STA Check (d%)`,
          total: rollSummary.total,
          breakdown: `[Tens: ${rollSummary.tens * 10}, Ones: ${rollSummary.ones}] Pass if <= STA, or pass out for 1d10×10s`,
          rollSummary,
        });
        percentileHudTimeout = setTimeout(() => {
          showPercentileHud.value = false;
        }, 8000);
      }
    } catch (err) {
      console.error('Flip & Burn STA check roll failed:', err);
    }
  } else {
    const roll = Math.floor(Math.random() * 100) + 1;
    sendRollToServer({
      type: 'percentile',
      label: `${shipName}: Flip & Burn STA Check (d%)`,
      total: roll,
      breakdown: `Roll: ${roll} (Pass if <= STA, or pass out for 1d10×10s)`,
    });
  }
}

async function rollFlipAndBurnBlackout() {
  const shipName = selectedToken.value?.name || 'Ship';
  playDiceSound({ isRemote: false });
  if (diceBoxInstance) {
    showDamageHud.value = false;
    showPercentileHud.value = false;
    if (damageHudTimeout) clearTimeout(damageHudTimeout);

    try {
      const results = await diceBoxInstance.roll([
        { sides: 10, theme: 'custom-dmg', themeColor: '#140409', qty: 1 },
      ]);
      const rollSummary = calculateDamageRoll(results);
      if (rollSummary.count > 0) {
        const dieVal = rollSummary.total;
        const seconds = calculateBlackoutSeconds(dieVal);
        lastDamageRoll.value = {
          ...rollSummary,
          total: seconds,
          username: authStore.user?.username,
          role: authStore.user?.role,
        };
        showDamageHud.value = true;
        sendRollToServer({
          type: 'damage',
          label: `${shipName}: Flip & Burn Blackout (1d10×10s)`,
          total: seconds,
          breakdown: `[Die: ${dieVal} × 10 = ${seconds} seconds passed out]`,
          rollSummary: { ...rollSummary, total: seconds },
        });
        damageHudTimeout = setTimeout(() => {
          showDamageHud.value = false;
        }, 8000);
      }
    } catch (err) {
      console.error('Flip & Burn blackout roll failed:', err);
    }
  } else {
    const dieVal = Math.floor(Math.random() * 10) + 1;
    const seconds = calculateBlackoutSeconds(dieVal);
    sendRollToServer({
      type: 'damage',
      label: `${shipName}: Flip & Burn Blackout (1d10×10s)`,
      total: seconds,
      breakdown: `[Die: ${dieVal} × 10 = ${seconds} seconds passed out]`,
    });
  }
}
```
- In `SpaceVttView.vue` template inside the Token Inspector (right below the Heading / Rotation control around line 502):
```html
              <!-- Flip & Burn Maneuver (MR > 3) -->
              <div class="flip-burn-box">
                <div class="flip-burn-header">
                  <label>🔄 Flip &amp; Burn (MR &gt; 3)</label>
                  <span v-if="selectedTokenLinkedShip" class="mr-pill" :class="{ eligible: selectedTokenCanFlipAndBurn }">
                    MR {{ selectedTokenLinkedShip.mr }}
                  </span>
                </div>
                <button
                  type="button"
                  class="btn-flip-burn full-width"
                  :disabled="!selectedTokenCanFlipAndBurn"
                  :title="selectedTokenCanFlipAndBurn ? 'Reverse heading 180° and alert crew for STA check' : 'Requires ship with Maneuver Rating (MR) > 3'"
                  @click="executeFlipAndBurn"
                >
                  🔄 Execute Flip &amp; Burn (180°)
                </button>
                <small v-if="selectedTokenLinkedShip && !selectedTokenCanFlipAndBurn" class="flip-burn-ineligible">
                  Requires MR &gt; 3 (Linked ship MR: {{ selectedTokenLinkedShip.mr }})
                </small>
                <small v-else class="flip-burn-hint">
                  Strapped-in PCs must pass a STA check or pass out for 1d10×10s.
                </small>
                <div class="flip-burn-roll-btns">
                  <button type="button" class="btn-fb-roll" @click="rollFlipAndBurnStaCheck" title="Roll d% STA Check">
                    🎲 STA Check (d%)
                  </button>
                  <button type="button" class="btn-fb-roll blackout" @click="rollFlipAndBurnBlackout" title="Roll 1d10 × 10 seconds blackout duration">
                    💫 Blackout (1d10×10s)
                  </button>
                </div>
              </div>
```

3. In `client/src/views/ShipSheetsView.vue` (inside `.stats-section` right below `.stats-grid` around line 136):
- Import `{ canFlipAndBurn } from '../utils/flipAndBurn.js';`
- Add the Flip & Burn capability banner:
```html
          <div class="flip-burn-ship-banner" :class="{ capable: canFlipAndBurn(selectedShip.mr) }">
            <template v-if="canFlipAndBurn(selectedShip.mr)">
              <span class="fb-badge capable">🔄 Flip &amp; Burn Capable (MR {{ selectedShip.mr }} &gt; 3)</span>
              <span class="fb-rule-text">
                Can execute a 180° Flip &amp; Burn in combat. Any strapped-in PCs on board must pass a STA check or pass out for <strong>1d10 × 10 seconds</strong>.
              </span>
            </template>
            <template v-else>
              <span class="fb-badge incapable">🚫 Flip &amp; Burn Unavailable (Requires MR &gt; 3)</span>
              <span class="fb-rule-text">
                Ships must have a Maneuver Rating (MR) higher than 3 to perform a Flip &amp; Burn maneuver.
              </span>
            </template>
          </div>
```

- [ ] **Step 4: Run all client and server tests to verify everything passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/flipAndBurn.test.js test/ShipSheetsView.test.js && cd ../server && npx vitest run test/gmNotes.test.js"`
Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add client/src/utils/flipAndBurn.js client/src/views/SpaceVttView.vue client/src/views/ShipSheetsView.vue client/test/flipAndBurn.test.js
git commit -m "feat(space): add Flip and Burn (MR > 3) maneuver and 1d10x10s STA blackout rollers"
```

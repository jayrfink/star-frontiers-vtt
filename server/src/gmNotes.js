import { Router } from 'express';
import { requireAuth, requireGM } from './middleware.js';

export function createGmNotesRouter(db) {
  const router = Router();
  router.use(requireAuth, requireGM(db));

  // GET /api/gm-notes/sessions - List all GM sessions (seeds default Session 1 if empty)
  router.get('/sessions', (req, res) => {
    try {
      let sessions = db.prepare('SELECT * FROM gm_sessions ORDER BY id ASC').all();
      if (sessions.length === 0) {
        const userId = req.session.userId ?? req.session.user?.id;
        const seedSessionTx = db.transaction(() => {
          const info = db
            .prepare('INSERT INTO gm_sessions (user_id, title) VALUES (?, ?)')
            .run(userId, 'Session 1');
          const sessionId = info.lastInsertRowid;

          const insertPanel = db.prepare(
            'INSERT INTO gm_note_panels (session_id, title, content, sort_order) VALUES (?, ?, ?, ?)'
          );
          insertPanel.run(sessionId, 'Introduction', '', 0);
          insertPanel.run(sessionId, 'Part 1', '', 1);
        });
        seedSessionTx();

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
      const userId = req.session.userId ?? req.session.user?.id;
      const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      const title = rawTitle || 'New Session';

      const createSessionTx = db.transaction(() => {
        const info = db
          .prepare('INSERT INTO gm_sessions (user_id, title) VALUES (?, ?)')
          .run(userId, title);
        const sessionId = info.lastInsertRowid;

        db.prepare(
          'INSERT INTO gm_note_panels (session_id, title, content, sort_order) VALUES (?, ?, ?, ?)'
        ).run(sessionId, 'Introduction', '', 0);

        return sessionId;
      });

      const sessionId = createSessionTx();

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
        req.body?.title !== undefined && req.body?.title !== null
          ? String(req.body.title).trim()
          : existing.title;
      const title = rawTitle || existing.title;
      const content =
        req.body?.content !== undefined
          ? (req.body.content === null ? '' : String(req.body.content))
          : existing.content;

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

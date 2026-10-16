import { Router } from 'express';
import { requireAuth, requireGM } from './middleware.js';

export function createRollRouter(db, io) {
  const router = Router();

  // GET /api/rolls?mode=rpg|space
  router.get('/', requireAuth, (req, res) => {
    const mode = req.query.mode;
    if (mode !== 'rpg' && mode !== 'space') {
      return res.status(400).json({ error: 'Valid mode ("rpg" or "space") is required' });
    }

    try {
      const rows = db.prepare(`
        SELECT id, mode, user_id AS userId, username, role, type, label, total, breakdown, roll_summary AS rollSummary, created_at AS createdAt
        FROM roll_logs
        WHERE mode = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 20
      `).all(mode);

      const formatted = rows.map(r => ({
        ...r,
        rollSummary: r.rollSummary ? JSON.parse(r.rollSummary) : {},
        timestamp: r.createdAt ? r.createdAt.split(' ')[1] || r.createdAt : ''
      }));

      res.json(formatted);
    } catch (err) {
      console.error('Failed to get rolls:', err);
      res.status(500).json({ error: 'Failed to retrieve rolls' });
    }
  });

  // POST /api/rolls
  router.post('/', requireAuth, (req, res) => {
    const { mode, type, label, total, breakdown, rollSummary } = req.body;

    if (mode !== 'rpg' && mode !== 'space') {
      return res.status(400).json({ error: 'Valid mode ("rpg" or "space") is required' });
    }
    if (type !== 'percentile' && type !== 'damage') {
      return res.status(400).json({ error: 'Valid type ("percentile" or "damage") is required' });
    }
    if (!label || typeof total !== 'number' || typeof breakdown !== 'string') {
      return res.status(400).json({ error: 'label, numeric total, and breakdown are required' });
    }

    try {
      const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const summaryStr = rollSummary ? JSON.stringify(rollSummary) : null;
      const stmt = db.prepare(`
        INSERT INTO roll_logs (mode, user_id, username, role, type, label, total, breakdown, roll_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(mode, user.id, user.username, user.role, type, label, total, breakdown, summaryStr);

      const inserted = db.prepare(`
        SELECT id, mode, user_id AS userId, username, role, type, label, total, breakdown, roll_summary AS rollSummary, created_at AS createdAt
        FROM roll_logs WHERE id = ?
      `).get(info.lastInsertRowid);

      // Prune entries older than latest 100 per mode
      db.prepare(`
        DELETE FROM roll_logs
        WHERE mode = ? AND id NOT IN (
          SELECT id FROM roll_logs WHERE mode = ? ORDER BY created_at DESC, id DESC LIMIT 100
        )
      `).run(mode, mode);

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      const rollPayload = {
        id: inserted.id,
        mode: inserted.mode,
        userId: inserted.userId,
        username: inserted.username,
        role: inserted.role,
        type: inserted.type,
        label: inserted.label,
        total: inserted.total,
        breakdown: inserted.breakdown,
        rollSummary: inserted.rollSummary ? JSON.parse(inserted.rollSummary) : {},
        timestamp: timeStr,
        createdAt: inserted.createdAt
      };

      if (io) {
        io.emit('roll:created', { mode, roll: rollPayload });
      }

      res.status(201).json(rollPayload);
    } catch (err) {
      console.error('Failed to create roll:', err);
      res.status(500).json({ error: 'Failed to record roll' });
    }
  });

  // DELETE /api/rolls?mode=rpg|space (GM only)
  router.delete('/', requireGM(db), (req, res) => {
    const mode = req.query.mode;
    if (mode !== 'rpg' && mode !== 'space') {
      return res.status(400).json({ error: 'Valid mode ("rpg" or "space") is required' });
    }

    try {
      db.prepare('DELETE FROM roll_logs WHERE mode = ?').run(mode);

      if (io) {
        io.emit('roll:cleared', { mode });
      }

      res.json({ success: true, mode });
    } catch (err) {
      console.error('Failed to clear rolls:', err);
      res.status(500).json({ error: 'Failed to clear rolls' });
    }
  });

  return router;
}

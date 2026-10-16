import { Router } from 'express';
import { requireAuth, requireGM } from './middleware.js';

function toIsoString(dateVal) {
  if (!dateVal) return new Date().toISOString();
  if (dateVal instanceof Date) return dateVal.toISOString();
  if (typeof dateVal === 'string') {
    if (dateVal.includes('T') && (dateVal.endsWith('Z') || dateVal.includes('+') || dateVal.includes('-'))) {
      return dateVal;
    }
    return dateVal.replace(' ', 'T') + 'Z';
  }
  return new Date(dateVal).toISOString();
}

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

      const formatted = rows.map(r => {
        const createdAtIso = toIsoString(r.createdAt);
        return {
          ...r,
          rollSummary: r.rollSummary ? JSON.parse(r.rollSummary) : {},
          createdAt: createdAtIso,
          timestamp: createdAtIso
        };
      });

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
      const createdAt = new Date().toISOString();
      const stmt = db.prepare(`
        INSERT INTO roll_logs (mode, user_id, username, role, type, label, total, breakdown, roll_summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(mode, user.id, user.username, user.role, type, label, total, breakdown, summaryStr, createdAt);

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

      const createdAtIso = toIsoString(inserted.createdAt);

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
        timestamp: createdAtIso,
        createdAt: createdAtIso
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

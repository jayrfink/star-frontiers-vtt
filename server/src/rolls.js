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

function safeJsonParse(str, fallback = {}) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
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
          rollSummary: safeJsonParse(r.rollSummary, {}),
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
    if (typeof total !== 'number' || Number.isNaN(total) || !Number.isFinite(total)) {
      return res.status(400).json({ error: 'Invalid roll total: must be a finite number' });
    }
    if (type === 'percentile' && (total < 1 || total > 100)) {
      return res.status(400).json({ error: 'Percentile roll total must be between 1 and 100' });
    }
    if (type === 'damage' && (total < 0 || total > 100000)) {
      return res.status(400).json({ error: 'Damage roll total must be a non-negative finite number' });
    }
    if (rollSummary && typeof rollSummary === 'object') {
      if (rollSummary.count !== undefined && (!Number.isFinite(rollSummary.count) || rollSummary.count < 0 || rollSummary.count > 1000)) {
        return res.status(400).json({ error: 'Invalid roll count parameter' });
      }
      if (rollSummary.tens !== undefined && (!Number.isFinite(rollSummary.tens) || rollSummary.tens < 0 || rollSummary.tens > 10)) {
        return res.status(400).json({ error: 'Invalid roll tens parameter' });
      }
      if (rollSummary.ones !== undefined && (!Number.isFinite(rollSummary.ones) || rollSummary.ones < 0 || rollSummary.ones > 9)) {
        return res.status(400).json({ error: 'Invalid roll ones parameter' });
      }
      if (Array.isArray(rollSummary.dice)) {
        for (const die of rollSummary.dice) {
          if (!Number.isFinite(die) || die < 0 || die > 1000) {
            return res.status(400).json({ error: 'Invalid dice value in rollSummary' });
          }
        }
      }
    }
    if (!label || typeof breakdown !== 'string') {
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

      // Optimized roll history pruning: find cutoff row via index if total rows exceed 100
      const cutoff = db.prepare(`
        SELECT id, created_at FROM roll_logs
        WHERE mode = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1 OFFSET 100
      `).get(mode);

      if (cutoff) {
        db.prepare(`
          DELETE FROM roll_logs
          WHERE mode = ? AND (created_at < ? OR (created_at = ? AND id <= ?))
        `).run(mode, cutoff.created_at, cutoff.created_at, cutoff.id);
      }

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
        rollSummary: safeJsonParse(inserted.rollSummary, {}),
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

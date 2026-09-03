import { Router } from 'express';
import { requireAuth } from './middleware.js';

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function formatMap(row) {
  if (!row) return null;
  return {
    ...row,
    fog_data: safeJsonParse(row.fog_data, []),
  };
}

function formatToken(row) {
  if (!row) return null;
  return {
    ...row,
    status_effects: safeJsonParse(row.status_effects, []),
  };
}

function isGameMaster(db, userId) {
  if (!userId) return false;
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  return user && user.role === 'GameMaster';
}

function requireGM(db) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isGameMaster(db, req.session.userId)) {
      return res.status(403).json({ error: 'GameMaster access required' });
    }
    next();
  };
}

export function createMapRouter(db, io) {
  const router = Router();

  router.use(requireAuth);

  // GET /api/maps - List all maps
  router.get('/', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM maps ORDER BY created_at DESC, id DESC').all();
      res.json(rows.map(formatMap));
    } catch (err) {
      console.error('Error listing maps:', err);
      res.status(500).json({ error: 'Failed to list maps' });
    }
  });

  // GET /api/maps/active - Get currently active map with its tokens
  router.get('/active', (req, res) => {
    try {
      const mapRow = db.prepare('SELECT * FROM maps WHERE is_active = 1 LIMIT 1').get();
      if (!mapRow) {
        return res.json({ map: null, tokens: [] });
      }
      const map = formatMap(mapRow);
      const tokenRows = db.prepare('SELECT * FROM tokens WHERE map_id = ? ORDER BY id ASC').all(map.id);
      const tokens = tokenRows.map(formatToken);
      res.json({ map, tokens });
    } catch (err) {
      console.error('Error fetching active map:', err);
      res.status(500).json({ error: 'Failed to fetch active map' });
    }
  });

  // GET /api/maps/:id - Get specific map with its tokens
  router.get('/:id', (req, res) => {
    try {
      const row = db.prepare('SELECT * FROM maps WHERE id = ?').get(req.params.id);
      if (!row) {
        return res.status(404).json({ error: 'Map not found' });
      }
      const map = formatMap(row);
      const tokenRows = db.prepare('SELECT * FROM tokens WHERE map_id = ? ORDER BY id ASC').all(map.id);
      const tokens = tokenRows.map(formatToken);
      res.json({ map, tokens });
    } catch (err) {
      console.error('Error fetching map:', err);
      res.status(500).json({ error: 'Failed to fetch map' });
    }
  });

  // POST /api/maps - Create map (GM only)
  router.post('/', requireGM(db), (req, res) => {
    try {
      const {
        name,
        background_url = '',
        preset_bg = 'grid_only',
        width = 20,
        height = 20,
        grid_size = 40,
        grid_color = '#333333',
        is_active = 0,
        fog_data = [],
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Map name is required' });
      }

      const fogDataStr = typeof fog_data === 'string' ? fog_data : JSON.stringify(fog_data);

      const stmt = db.prepare(`
        INSERT INTO maps (
          user_id, name, background_url, preset_bg, width, height,
          grid_size, grid_color, is_active, fog_data
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      const result = stmt.run(
        req.session.userId, name, background_url, preset_bg, width, height,
        grid_size, grid_color, is_active ? 1 : 0, fogDataStr
      );

      const created = db.prepare('SELECT * FROM maps WHERE id = ?').get(result.lastInsertRowid);
      const map = formatMap(created);

      if (io) {
        io.emit('map:created', { map });
      }

      res.status(201).json(map);
    } catch (err) {
      console.error('Error creating map:', err);
      res.status(500).json({ error: 'Failed to create map' });
    }
  });

  // POST /api/maps/:id/activate - Activate map (GM only)
  router.post('/:id/activate', requireGM(db), (req, res) => {
    try {
      const mapRow = db.prepare('SELECT * FROM maps WHERE id = ?').get(req.params.id);
      if (!mapRow) {
        return res.status(404).json({ error: 'Map not found' });
      }

      const activateTransaction = db.transaction((mapId) => {
        db.prepare('UPDATE maps SET is_active = 0').run();
        db.prepare('UPDATE maps SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(mapId);
      });
      activateTransaction(req.params.id);

      const updated = db.prepare('SELECT * FROM maps WHERE id = ?').get(req.params.id);
      const map = formatMap(updated);

      const tokenRows = db.prepare('SELECT * FROM tokens WHERE map_id = ? ORDER BY id ASC').all(req.params.id);
      const tokens = tokenRows.map(formatToken);

      if (io) {
        io.emit('map:activated', { map, tokens });
      }

      res.json({ map, tokens });
    } catch (err) {
      console.error('Error activating map:', err);
      res.status(500).json({ error: 'Failed to activate map' });
    }
  });

  // PUT /api/maps/:id - Update map (GM only)
  router.put('/:id', requireGM(db), (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM maps WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Map not found' });
      }

      const {
        name = existing.name,
        background_url = existing.background_url,
        preset_bg = existing.preset_bg,
        width = existing.width,
        height = existing.height,
        grid_size = existing.grid_size,
        grid_color = existing.grid_color,
        is_active = existing.is_active,
        fog_data = safeJsonParse(existing.fog_data, []),
      } = req.body;

      const fogDataStr = typeof fog_data === 'string' ? fog_data : JSON.stringify(fog_data);

      const stmt = db.prepare(`
        UPDATE maps SET
          name = ?, background_url = ?, preset_bg = ?, width = ?, height = ?,
          grid_size = ?, grid_color = ?, is_active = ?, fog_data = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(
        name, background_url, preset_bg, width, height,
        grid_size, grid_color, is_active ? 1 : 0, fogDataStr,
        req.params.id
      );

      const updated = db.prepare('SELECT * FROM maps WHERE id = ?').get(req.params.id);
      const map = formatMap(updated);

      if (io) {
        io.emit('map:updated', { map });
        if (req.body.fog_data !== undefined) {
          io.emit('fog:updated', { mapId: map.id, fog_data: map.fog_data });
        }
      }

      res.json(map);
    } catch (err) {
      console.error('Error updating map:', err);
      res.status(500).json({ error: 'Failed to update map' });
    }
  });

  // DELETE /api/maps/:id - Delete map (GM only)
  router.delete('/:id', requireGM(db), (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM maps WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Map not found' });
      }

      db.prepare('DELETE FROM maps WHERE id = ?').run(req.params.id);

      if (io) {
        io.emit('map:deleted', { id: Number(req.params.id) });
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('Error deleting map:', err);
      res.status(500).json({ error: 'Failed to delete map' });
    }
  });

  return router;
}

export function createTokenRouter(db, io) {
  const router = Router();

  router.use(requireAuth);

  // GET /api/tokens - List tokens for a map (or all tokens)
  router.get('/', (req, res) => {
    try {
      const { map_id } = req.query;
      let rows;
      if (map_id) {
        rows = db.prepare('SELECT * FROM tokens WHERE map_id = ? ORDER BY id ASC').all(map_id);
      } else {
        rows = db.prepare('SELECT * FROM tokens ORDER BY id ASC').all();
      }
      res.json(rows.map(formatToken));
    } catch (err) {
      console.error('Error listing tokens:', err);
      res.status(500).json({ error: 'Failed to list tokens' });
    }
  });

  // GET /api/tokens/:id - Fetch token by id
  router.get('/:id', (req, res) => {
    try {
      const row = db.prepare('SELECT * FROM tokens WHERE id = ?').get(req.params.id);
      if (!row) {
        return res.status(404).json({ error: 'Token not found' });
      }
      res.json(formatToken(row));
    } catch (err) {
      console.error('Error fetching token:', err);
      res.status(500).json({ error: 'Failed to fetch token' });
    }
  });

  // POST /api/tokens - Create token
  router.post('/', (req, res) => {
    try {
      const {
        map_id,
        character_id = null,
        name,
        color = '#ff0000',
        avatar_url = '',
        x = 0,
        y = 0,
        size = 1,
        current_hp = null,
        max_hp = null,
        status_effects = [],
        layer = 'character',
      } = req.body;

      if (!map_id || !name) {
        return res.status(400).json({ error: 'map_id and name are required' });
      }

      const mapExists = db.prepare('SELECT id FROM maps WHERE id = ?').get(map_id);
      if (!mapExists) {
        return res.status(404).json({ error: 'Map not found' });
      }

      const statusEffectsStr = typeof status_effects === 'string' ? status_effects : JSON.stringify(status_effects);

      const stmt = db.prepare(`
        INSERT INTO tokens (
          map_id, character_id, name, color, avatar_url,
          x, y, size, current_hp, max_hp, status_effects, layer
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?
        )
      `);

      const result = stmt.run(
        map_id, character_id, name, color, avatar_url,
        x, y, size, current_hp, max_hp, statusEffectsStr, layer
      );

      const created = db.prepare('SELECT * FROM tokens WHERE id = ?').get(result.lastInsertRowid);
      const token = formatToken(created);

      if (io) {
        io.emit('token:created', { token });
      }

      res.status(201).json(token);
    } catch (err) {
      console.error('Error creating token:', err);
      res.status(500).json({ error: 'Failed to create token' });
    }
  });

  // PUT /api/tokens/:id - Update token
  router.put('/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM tokens WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Token not found' });
      }

      const {
        map_id = existing.map_id,
        character_id = existing.character_id,
        name = existing.name,
        color = existing.color,
        avatar_url = existing.avatar_url,
        x = existing.x,
        y = existing.y,
        size = existing.size,
        current_hp = existing.current_hp,
        max_hp = existing.max_hp,
        status_effects = safeJsonParse(existing.status_effects, []),
        layer = existing.layer,
      } = req.body;

      const positionChanged = (req.body.x !== undefined && req.body.x !== existing.x) ||
                              (req.body.y !== undefined && req.body.y !== existing.y);

      const statusEffectsStr = typeof status_effects === 'string' ? status_effects : JSON.stringify(status_effects);

      const stmt = db.prepare(`
        UPDATE tokens SET
          map_id = ?, character_id = ?, name = ?, color = ?, avatar_url = ?,
          x = ?, y = ?, size = ?, current_hp = ?, max_hp = ?, status_effects = ?,
          layer = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(
        map_id, character_id, name, color, avatar_url,
        x, y, size, current_hp, max_hp, statusEffectsStr,
        layer, req.params.id
      );

      const updated = db.prepare('SELECT * FROM tokens WHERE id = ?').get(req.params.id);
      const token = formatToken(updated);

      if (io) {
        if (positionChanged) {
          io.emit('token:moved', { token, id: token.id, x: token.x, y: token.y });
        }
        io.emit('token:updated', { token });
      }

      res.json(token);
    } catch (err) {
      console.error('Error updating token:', err);
      res.status(500).json({ error: 'Failed to update token' });
    }
  });

  // DELETE /api/tokens/:id - Delete token
  router.delete('/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM tokens WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Token not found' });
      }

      db.prepare('DELETE FROM tokens WHERE id = ?').run(req.params.id);

      if (io) {
        io.emit('token:deleted', { id: Number(req.params.id) });
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('Error deleting token:', err);
      res.status(500).json({ error: 'Failed to delete token' });
    }
  });

  return router;
}

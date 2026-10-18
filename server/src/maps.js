import { Router } from 'express';
import { requireAuth, requireGM, isGameMaster } from './middleware.js';

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function clampLineWidth(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(10, Math.max(0.1, n));
}

function formatMap(row) {
  if (!row) return null;
  return {
    ...row,
    fog_enabled: Boolean(row.fog_enabled),
    grid_visible: row.grid_visible === undefined ? true : Boolean(row.grid_visible),
    fog_data: safeJsonParse(row.fog_data, []),
  };
}

export function formatToken(row, db = null) {
  if (!row) return null;
  const token = {
    ...row,
    color: row.color || '#666666',
    status_effects: safeJsonParse(row.status_effects, []),
    conditions: safeJsonParse(row.conditions, []),
    template_id: row.template_id || null,
    seu_current: row.seu_current !== undefined ? row.seu_current : null,
    vehicle_data: safeJsonParse(row.vehicle_data, null),
  };

  if (db && row.template_id) {
    try {
      const tRow = db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(row.template_id);
      if (tRow) {
        token.template = {
          template_id: tRow.id,
          name: tRow.name,
          category: tRow.category,
          threat_tier: tRow.threat_tier,
          token_image_path: tRow.token_image_path,
          token_size: tRow.token_size,
          hp_max: tRow.hp_max,
          defense_summary: tRow.defense_summary,
          movement: tRow.movement,
          initiative_mod: tRow.initiative_mod,
          actions: safeJsonParse(tRow.actions, []),
          traits: safeJsonParse(tRow.traits, []),
          system_data: safeJsonParse(tRow.system_data, {}),
        };
      }
    } catch {
      // Table might not exist or error
    }
  }

  return token;
}


export function createMapRouter(db, io) {
  const router = Router();

  router.use(requireAuth);

  // GET /api/maps - List maps (optionally filtered by type)
  router.get('/', (req, res) => {
    try {
      const type = req.query.type;
      let rows;
      if (type) {
        rows = db.prepare('SELECT * FROM maps WHERE map_type = ? ORDER BY created_at DESC').all(type);
      } else {
        rows = db.prepare('SELECT * FROM maps ORDER BY created_at DESC').all();
      }
      res.json(rows.map(formatMap));
    } catch (err) {
      console.error('Error listing maps:', err);
      res.status(500).json({ error: 'Failed to list maps' });
    }
  });

  // GET /api/maps/active - Get currently active map with its tokens
  router.get('/active', (req, res) => {
    try {
      const type = req.query.type || 'rpg';
      const mapRow = db.prepare('SELECT * FROM maps WHERE is_active = 1 AND map_type = ? LIMIT 1').get(type);
      if (!mapRow) {
        return res.json({ map: null, tokens: [] });
      }
      const map = formatMap(mapRow);
      const tokenRows = db.prepare('SELECT * FROM tokens WHERE map_id = ? ORDER BY id ASC').all(map.id);
      const tokens = tokenRows.map(r => formatToken(r, db));
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
      const tokens = tokenRows.map(r => formatToken(r, db));
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
        map_type = 'rpg',
        background_url = '',
        preset_bg = 'grid_only',
        fog_enabled = false,
        width = 20,
        height = 20,
        grid_size = 40,
        grid_color = '#333333',
        grid_line_width = 1,
        grid_visible = true,
        is_active = 0,
        fog_data = [],
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Map name is required' });
      }

      const fogDataStr = typeof fog_data === 'string' ? fog_data : JSON.stringify(fog_data);

      if (is_active) {
        db.prepare('UPDATE maps SET is_active = 0 WHERE map_type = ?').run(map_type);
      }

      const stmt = db.prepare(`
        INSERT INTO maps (
          user_id, name, map_type, background_url, preset_bg, width, height,
          grid_size, grid_color, grid_line_width, grid_visible, is_active, fog_enabled, fog_data
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      const result = stmt.run(
        req.session.userId, name, map_type, background_url, preset_bg, width, height,
        grid_size, grid_color, clampLineWidth(grid_line_width), grid_visible ? 1 : 0, is_active ? 1 : 0, fog_enabled ? 1 : 0, fogDataStr
      );

      const created = db.prepare('SELECT * FROM maps WHERE id = ?').get(result.lastInsertRowid);
      const map = formatMap(created);

      if (io) {
        io.emit('map:created', { map });
        if (is_active) {
          io.emit('map:activated', { map, tokens: [] });
        }
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

      const activateTransaction = db.transaction((mapId, mapType) => {
        db.prepare('UPDATE maps SET is_active = 0 WHERE map_type = ?').run(mapType);
        db.prepare('UPDATE maps SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(mapId);
      });
      activateTransaction(req.params.id, mapRow.map_type);

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
        grid_line_width = existing.grid_line_width,
        grid_visible = existing.grid_visible,
        fog_enabled = existing.fog_enabled,
        is_active = existing.is_active,
        fog_data = safeJsonParse(existing.fog_data, []),
      } = req.body;

      const fogDataStr = typeof fog_data === 'string' ? fog_data : JSON.stringify(fog_data);

      const stmt = db.prepare(`
        UPDATE maps SET
          name = ?, background_url = ?, preset_bg = ?, width = ?, height = ?,
          grid_size = ?, grid_color = ?, grid_line_width = ?, grid_visible = ?, is_active = ?, fog_enabled = ?, fog_data = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(
        name, background_url, preset_bg, width, height,
        grid_size, grid_color, clampLineWidth(grid_line_width, existing.grid_line_width ?? 1), grid_visible ? 1 : 0, is_active ? 1 : 0, fog_enabled ? 1 : 0, fogDataStr,
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
      res.json(rows.map(r => formatToken(r, db)));
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
      res.json(formatToken(row, db));
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
        color = '#666666',
        avatar_url = '',
        x = 0,
        y = 0,
        size = 1,
        current_hp = null,
        max_hp = null,
        status_effects = [],
        conditions = [],
        template_id = null,
        seu_current = null,
        layer = 'character',
        rotation = 0,
        current_speed = 0,
        vehicle_data = null,
      } = req.body;

      if (!map_id || !name) {
        return res.status(400).json({ error: 'map_id and name are required' });
      }

      const mapExists = db.prepare('SELECT id FROM maps WHERE id = ?').get(map_id);
      if (!mapExists) {
        return res.status(404).json({ error: 'Map not found' });
      }

      const statusEffectsStr = typeof status_effects === 'string' ? status_effects : JSON.stringify(status_effects);
      const conditionsStr = typeof conditions === 'string' ? conditions : JSON.stringify(conditions);
      const vehicleDataStr = vehicle_data ? (typeof vehicle_data === 'string' ? vehicle_data : JSON.stringify(vehicle_data)) : null;

      const stmt = db.prepare(`
        INSERT INTO tokens (
          map_id, character_id, template_id, name, color, avatar_url,
          x, y, size, current_hp, max_hp, seu_current, conditions, status_effects, layer,
          rotation, current_speed, vehicle_data
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?
        )
      `);

      const result = stmt.run(
        map_id, character_id, template_id, name, color, avatar_url,
        x, y, size, current_hp, max_hp, seu_current, conditionsStr, statusEffectsStr, layer,
        rotation, current_speed, vehicleDataStr
      );

      const created = db.prepare('SELECT * FROM tokens WHERE id = ?').get(result.lastInsertRowid);
      const token = formatToken(created, db);

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
        template_id = existing.template_id,
        name = existing.name,
        color = existing.color,
        avatar_url = existing.avatar_url,
        x = existing.x,
        y = existing.y,
        size = existing.size,
        current_hp = existing.current_hp,
        max_hp = existing.max_hp,
        seu_current = existing.seu_current,
        status_effects = safeJsonParse(existing.status_effects, []),
        conditions = safeJsonParse(existing.conditions, []),
        layer = existing.layer,
        rotation = existing.rotation ?? 0,
        current_speed = existing.current_speed ?? 0,
        vehicle_data = safeJsonParse(existing.vehicle_data, null),
      } = req.body;

      const positionChanged = (req.body.x !== undefined && req.body.x !== existing.x) ||
                              (req.body.y !== undefined && req.body.y !== existing.y);

      const statusEffectsStr = typeof status_effects === 'string' ? status_effects : JSON.stringify(status_effects);
      const conditionsStr = typeof conditions === 'string' ? conditions : JSON.stringify(conditions);
      const vehicleDataStr = vehicle_data ? (typeof vehicle_data === 'string' ? vehicle_data : JSON.stringify(vehicle_data)) : null;

      const stmt = db.prepare(`
        UPDATE tokens SET
          map_id = ?, character_id = ?, template_id = ?, name = ?, color = ?, avatar_url = ?,
          x = ?, y = ?, size = ?, current_hp = ?, max_hp = ?, seu_current = ?, conditions = ?, status_effects = ?,
          layer = ?, rotation = ?, current_speed = ?, vehicle_data = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(
        map_id, character_id, template_id, name, color, avatar_url,
        x, y, size, current_hp, max_hp, seu_current, conditionsStr, statusEffectsStr,
        layer, rotation, current_speed, vehicleDataStr, req.params.id
      );

      const updated = db.prepare('SELECT * FROM tokens WHERE id = ?').get(req.params.id);
      const token = formatToken(updated, db);

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

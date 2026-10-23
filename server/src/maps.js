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

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isValidHexColor(color) {
  return typeof color === 'string' && HEX_COLOR_REGEX.test(color.trim());
}

function clampDimension(value, fallback = 20, min = 5, max = 250) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampGridSize(value, fallback = 40, min = 10, max = 200) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampLineWidth(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(10, Math.max(0.1, n));
}

function clampSize(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(10, Math.max(1, Math.round(n)));
}

function clampRotation(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const mod = Math.round(n) % 360;
  return mod < 0 ? mod + 360 : mod;
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
      let tokens = tokenRows.map(r => formatToken(r, db));
      if (!isGameMaster(db, req.session?.userId)) {
        tokens = tokens.filter(t => t.layer !== 'gm');
      }
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
      let tokens = tokenRows.map(r => formatToken(r, db));
      if (!isGameMaster(db, req.session?.userId)) {
        tokens = tokens.filter(t => t.layer !== 'gm');
      }
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

      if (req.body.grid_color !== undefined && req.body.grid_color && !isValidHexColor(req.body.grid_color)) {
        return res.status(400).json({ error: 'Invalid grid_color format. Hex color required (e.g. #333333 or #fff)' });
      }

      const cleanWidth = clampDimension(width, 20, 5, 250);
      const cleanHeight = clampDimension(height, 20, 5, 250);
      const cleanGridSize = clampGridSize(grid_size, 40, 10, 200);
      const cleanGridColor = grid_color ? grid_color.trim() : '#333333';

      const fogDataStr = typeof fog_data === 'string' ? fog_data : JSON.stringify(fog_data);

      const createMapTx = db.transaction(() => {
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

        return stmt.run(
          req.session.userId, name, map_type, background_url, preset_bg, cleanWidth, cleanHeight,
          cleanGridSize, cleanGridColor, clampLineWidth(grid_line_width), grid_visible ? 1 : 0, is_active ? 1 : 0, fog_enabled ? 1 : 0, fogDataStr
        );
      });

      const result = createMapTx();

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
      const tokens = tokenRows.map((row) => formatToken(row, db));

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

      if (req.body.grid_color !== undefined && req.body.grid_color && !isValidHexColor(req.body.grid_color)) {
        return res.status(400).json({ error: 'Invalid grid_color format. Hex color required (e.g. #333333 or #fff)' });
      }

      const cleanWidth = clampDimension(req.body.width !== undefined ? req.body.width : existing.width, existing.width, 5, 250);
      const cleanHeight = clampDimension(req.body.height !== undefined ? req.body.height : existing.height, existing.height, 5, 250);
      const cleanGridSize = clampGridSize(req.body.grid_size !== undefined ? req.body.grid_size : existing.grid_size, existing.grid_size, 10, 200);
      const cleanGridColor = req.body.grid_color !== undefined
        ? (req.body.grid_color ? req.body.grid_color.trim() : '#333333')
        : existing.grid_color;

      const fogDataStr = typeof fog_data === 'string' ? fog_data : JSON.stringify(fog_data);

      const updateMapTx = db.transaction(() => {
        if (is_active) {
          db.prepare('UPDATE maps SET is_active = 0 WHERE map_type = ? AND id != ?').run(existing.map_type, req.params.id);
        }

        const stmt = db.prepare(`
          UPDATE maps SET
            name = ?, background_url = ?, preset_bg = ?, width = ?, height = ?,
            grid_size = ?, grid_color = ?, grid_line_width = ?, grid_visible = ?, is_active = ?, fog_enabled = ?, fog_data = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);

        stmt.run(
          name, background_url, preset_bg, cleanWidth, cleanHeight,
          cleanGridSize, cleanGridColor, clampLineWidth(grid_line_width, existing.grid_line_width ?? 1), grid_visible ? 1 : 0, is_active ? 1 : 0, fog_enabled ? 1 : 0, fogDataStr,
          req.params.id
        );
      });

      updateMapTx();

      const updated = db.prepare('SELECT * FROM maps WHERE id = ?').get(req.params.id);
      const map = formatMap(updated);

      if (io) {
        io.emit('map:updated', { map });
        if (req.body.fog_data !== undefined) {
          io.emit('fog:updated', { mapId: map.id, fog_data: map.fog_data });
        }
        if (Boolean(is_active) && (req.body.is_active !== undefined || !existing.is_active)) {
          const tokenRows = db.prepare('SELECT * FROM tokens WHERE map_id = ? ORDER BY id ASC').all(map.id);
          const tokens = tokenRows.map(r => formatToken(r, db));
          io.emit('map:activated', { map, tokens });
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

function canManageToken(db, userId, token) {
  if (!userId) return false;
  if (isGameMaster(db, userId)) return true;
  if (!token || !token.character_id) return false;
  let mapType = 'rpg';
  if (token.map_id) {
    const mapRow = db.prepare('SELECT map_type FROM maps WHERE id = ?').get(token.map_id);
    if (mapRow && mapRow.map_type) {
      mapType = mapRow.map_type;
    }
  }
  if (mapType === 'space') {
    const ship = db.prepare('SELECT user_id FROM ship_sheets WHERE id = ?').get(token.character_id);
    return Boolean(ship && ship.user_id === userId);
  } else {
    const char = db.prepare('SELECT user_id FROM character_sheets WHERE id = ?').get(token.character_id);
    return Boolean(char && char.user_id === userId);
  }
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
      let tokens = rows.map(r => formatToken(r, db));
      if (!isGameMaster(db, req.session?.userId)) {
        tokens = tokens.filter(t => t.layer !== 'gm');
      }
      res.json(tokens);
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
      if (!isGameMaster(db, req.session?.userId) && row.layer === 'gm') {
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

      if (req.body.color !== undefined && req.body.color && !isValidHexColor(req.body.color)) {
        return res.status(400).json({ error: 'Invalid color format. Hex color required (e.g. #333333 or #fff)' });
      }

      const mapExists = db.prepare('SELECT id, map_type FROM maps WHERE id = ?').get(map_id);
      if (!mapExists) {
        return res.status(404).json({ error: 'Map not found' });
      }

      const isGM = isGameMaster(db, req.session?.userId);
      if (!isGM) {
        if (!character_id) {
          return res.status(403).json({ error: 'Only GameMasters can create non-character tokens' });
        }
        if (template_id) {
          return res.status(403).json({ error: 'Only GameMasters can spawn adversary templates' });
        }
        if (mapExists.map_type === 'space') {
          const ship = db.prepare('SELECT user_id FROM ship_sheets WHERE id = ?').get(character_id);
          if (!ship || ship.user_id !== req.session?.userId) {
            return res.status(403).json({ error: 'You do not own this character or ship' });
          }
        } else {
          const char = db.prepare('SELECT user_id FROM character_sheets WHERE id = ?').get(character_id);
          if (!char || char.user_id !== req.session?.userId) {
            return res.status(403).json({ error: 'You do not own this character or ship' });
          }
        }
      }

      // Enforce layer: non-GMs can only create tokens on the 'character' layer
      const cleanLayer = isGM ? layer : 'character';
      const cleanColor = color ? color.trim() : '#666666';
      const cleanX = Number.isFinite(Number(x)) ? Math.max(-1000, Math.min(10000, Math.round(Number(x)))) : 0;
      const cleanY = Number.isFinite(Number(y)) ? Math.max(-1000, Math.min(10000, Math.round(Number(y)))) : 0;
      const cleanSize = clampSize(size, 1);
      const cleanRotation = clampRotation(rotation, 0);
      const cleanSpeed = Number.isFinite(Number(current_speed)) ? Number(current_speed) : 0;
      const cleanSeu = Number.isFinite(Number(seu_current)) ? Number(seu_current) : null;

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
        map_id, character_id, template_id, name, cleanColor, avatar_url,
        cleanX, cleanY, cleanSize, current_hp, max_hp, cleanSeu, conditionsStr, statusEffectsStr, cleanLayer,
        cleanRotation, cleanSpeed, vehicleDataStr
      );

      const created = db.prepare('SELECT * FROM tokens WHERE id = ?').get(result.lastInsertRowid);
      const token = formatToken(created, db);

      if (io) {
        if (token.layer === 'gm') {
          io.to('role:GameMaster').emit('token:created', { token });
        } else {
          io.emit('token:created', { token });
        }
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

      if (!canManageToken(db, req.session?.userId, existing)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (req.body.color !== undefined && req.body.color && !isValidHexColor(req.body.color)) {
        return res.status(400).json({ error: 'Invalid color format. Hex color required (e.g. #333333 or #fff)' });
      }

      const isGM = isGameMaster(db, req.session?.userId);

      const status_effects = isGM
        ? (Array.isArray(req.body.status_effects) ? req.body.status_effects : safeJsonParse(existing.status_effects, []))
        : safeJsonParse(existing.status_effects, []);
      const conditions = isGM
        ? (Array.isArray(req.body.conditions) ? req.body.conditions : safeJsonParse(existing.conditions, []))
        : safeJsonParse(existing.conditions, []);

      // If the user is not a GameMaster, prevent modifying map_id, template_id, layer, size, max_hp, and vehicle_data.
      // Non-GM players can update position (x, y), rotation, color, avatar_url, current_hp, seu_current, and current_speed.
      const map_id = !isGM ? existing.map_id : (req.body.map_id ?? existing.map_id);
      const character_id = !isGM ? existing.character_id : (req.body.character_id ?? existing.character_id);
      const template_id = !isGM ? existing.template_id : (req.body.template_id ?? existing.template_id);
      const name = req.body.name ?? existing.name;
      const color = req.body.color !== undefined
        ? (req.body.color ? req.body.color.trim() : '#666666')
        : existing.color;
      const avatar_url = req.body.avatar_url ?? existing.avatar_url;
      const x = req.body.x ?? existing.x;
      const y = req.body.y ?? existing.y;
      const rawSize = !isGM ? existing.size : (req.body.size ?? existing.size);
      const size = clampSize(rawSize, existing.size ?? 1);
      const current_hp = req.body.current_hp ?? existing.current_hp;
      const max_hp = !isGM ? existing.max_hp : (req.body.max_hp ?? existing.max_hp);
      const seu_current = req.body.seu_current !== undefined ? req.body.seu_current : existing.seu_current;
      const layer = !isGM ? existing.layer : (req.body.layer ?? existing.layer);
      const rawRotation = req.body.rotation ?? existing.rotation ?? 0;
      const rotation = clampRotation(rawRotation, existing.rotation ?? 0);
      const current_speed = req.body.current_speed !== undefined ? req.body.current_speed : (existing.current_speed ?? 0);
      const vehicle_data = !isGM
        ? safeJsonParse(existing.vehicle_data, null)
        : (req.body.vehicle_data !== undefined ? req.body.vehicle_data : safeJsonParse(existing.vehicle_data, null));

      const cleanX = Number.isFinite(Number(x)) ? Math.max(-1000, Math.min(10000, Math.round(Number(x)))) : existing.x;
      const cleanY = Number.isFinite(Number(y)) ? Math.max(-1000, Math.min(10000, Math.round(Number(y)))) : existing.y;

      const positionChanged = (req.body.x !== undefined && cleanX !== existing.x) ||
                              (req.body.y !== undefined && cleanY !== existing.y);

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
        cleanX, cleanY, size, current_hp, max_hp, seu_current, conditionsStr, statusEffectsStr,
        layer, rotation, current_speed, vehicleDataStr, req.params.id
      );

      const updated = db.prepare('SELECT * FROM tokens WHERE id = ?').get(req.params.id);
      const token = formatToken(updated, db);

      if (io) {
        if (token.layer === 'gm') {
          if (positionChanged) {
            io.to('role:GameMaster').emit('token:moved', { token, id: token.id, x: token.x, y: token.y });
          }
          io.to('role:GameMaster').emit('token:updated', { token });
        } else {
          if (positionChanged) {
            io.emit('token:moved', { token, id: token.id, x: token.x, y: token.y });
          }
          io.emit('token:updated', { token });
        }
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

      if (!canManageToken(db, req.session?.userId, existing)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      db.prepare('DELETE FROM tokens WHERE id = ?').run(req.params.id);

      if (io) {
        if (existing.layer === 'gm') {
          io.to('role:GameMaster').emit('token:deleted', { id: Number(req.params.id) });
        } else {
          io.emit('token:deleted', { id: Number(req.params.id) });
        }
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('Error deleting token:', err);
      res.status(500).json({ error: 'Failed to delete token' });
    }
  });

  return router;
}

import { Router } from 'express';
import { requireAuth, requireGM, isGameMaster } from './middleware.js';
import { formatToken } from './maps.js';

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function clampStat(val, fallback, min = 1, max = 200) {
  if (val === undefined || val === null) return fallback;
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function formatCharacterSheet(row) {
  if (!row) return null;
  return {
    ...row,
    user_id: Number(row.user_id),
    owner_username: row.owner_username || '',
    max_seu: row.max_seu !== undefined && row.max_seu !== null ? Number(row.max_seu) : 50,
    current_seu: row.current_seu !== undefined && row.current_seu !== null ? Number(row.current_seu) : 50,
    current_xp: row.current_xp !== undefined && row.current_xp !== null ? Number(row.current_xp) : 0,
    psa: row.psa || 'Military',
    racial_abilities: safeJsonParse(row.racial_abilities, {}),
    skills: safeJsonParse(row.skills, []),
    inventory: safeJsonParse(row.inventory, []),
  };
}

function formatShipSheet(row) {
  if (!row) return null;
  return {
    ...row,
    user_id: Number(row.user_id),
    owner_username: row.owner_username || '',
    avatar_url: row.avatar_url || '',
    weapons: safeJsonParse(row.weapons, []),
    defenses: safeJsonParse(row.defenses, []),
    damaged_systems: safeJsonParse(row.damaged_systems, []),
  };
}

export function createCharacterRouter(db, io) {
  const router = Router();

  router.use(requireAuth);

  router.get('/', (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT c.*, u.username AS owner_username
        FROM character_sheets c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.sort_order ASC, c.id ASC
      `).all();
      res.json(rows.map(formatCharacterSheet));
    } catch (err) {
      console.error('Error listing characters:', err);
      res.status(500).json({ error: 'Failed to list character sheets' });
    }
  });

  router.put('/reorder', requireGM(db), (req, res) => {
    try {
      const { order } = req.body || {};
      if (!Array.isArray(order) || order.length === 0) {
        return res.status(400).json({ error: 'Order must be a non-empty array of sheet IDs' });
      }

      // Check numeric IDs and duplicates
      const seen = new Set();
      for (const id of order) {
        if (typeof id !== 'number' || !Number.isInteger(id)) {
          return res.status(400).json({ error: 'All IDs in order must be valid integers' });
        }
        if (seen.has(id)) {
          return res.status(400).json({ error: 'Duplicate IDs found in order array' });
        }
        seen.add(id);
      }

      const updateOrderTx = db.transaction((sheetIds) => {
        const stmt = db.prepare('UPDATE character_sheets SET sort_order = ? WHERE id = ?');
        sheetIds.forEach((id, index) => {
          stmt.run(index, id);
        });
      });

      updateOrderTx(order);

      if (io) {
        io.emit('sheets:reordered', { type: 'character', order });
      }

      res.json({ success: true, order });
    } catch (err) {
      console.error('Error reordering character sheets:', err);
      res.status(500).json({ error: 'Failed to reorder character sheets' });
    }
  });

  router.get('/:id', (req, res) => {
    try {
      const row = db.prepare(`
        SELECT c.*, u.username AS owner_username
        FROM character_sheets c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `).get(req.params.id);
      if (!row) {
        return res.status(404).json({ error: 'Character sheet not found' });
      }
      res.json(formatCharacterSheet(row));
    } catch (err) {
      console.error('Error fetching character:', err);
      res.status(500).json({ error: 'Failed to fetch character sheet' });
    }
  });

  router.post('/', (req, res) => {
    try {
      let { race } = req.body;
      const {
        name,
        psa = 'Military',
        user_id,
        gender = null,
        height = null,
        weight = null,
        str = 50,
        sta = 50,
        current_sta = sta ?? 50,
        max_seu = 50,
        current_seu = max_seu ?? 50,
        current_xp = 0,
        dex = 50,
        rs = 50,
        int_stat = 50,
        log_stat = 50,
        per = 50,
        ldr = 50,
        racial_abilities = {},
        skills = [],
        inventory = [],
        notes = '',
      } = req.body;

      if (!name || typeof name !== 'string' || !name.trim() || !race || typeof race !== 'string' || !race.trim()) {
        return res.status(400).json({ error: 'Name and race are required' });
      }

      const isGM = isGameMaster(db, req.session.userId);
      let ownerId = req.session.userId;
      if (isGM && user_id !== undefined && user_id !== null) {
        const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(user_id);
        if (!targetUser) {
          return res.status(400).json({ error: 'Assigned user does not exist' });
        }
        ownerId = targetUser.id;
      }

      const characterName = name.trim();
      race = race.trim();

      const validPsas = ['Military', 'Technological', 'Biosocial'];
      const characterPsa = validPsas.includes(psa) ? psa : 'Military';

      const strVal = clampStat(str, 50, 1, 200);
      const staVal = clampStat(sta, 50, 1, 200);
      const curStaVal = clampStat(current_sta, staVal, 0, 200);
      const maxSeuVal = clampStat(max_seu, 50, 0, 100000);
      const curSeuVal = clampStat(current_seu, maxSeuVal, 0, maxSeuVal);
      const curXpVal = clampStat(current_xp, 0, 0, 1000000);
      const dexVal = clampStat(dex, 50, 1, 200);
      const rsVal = clampStat(rs, 50, 1, 200);
      const intVal = clampStat(int_stat, 50, 1, 200);
      const logVal = clampStat(log_stat, 50, 1, 200);
      const perVal = clampStat(per, 50, 1, 200);
      const ldrVal = clampStat(ldr, 50, 1, 200);

      const racialAbilitiesStr = typeof racial_abilities === 'string' ? racial_abilities : JSON.stringify(racial_abilities);
      const skillsStr = typeof skills === 'string' ? skills : JSON.stringify(skills);
      const inventoryStr = typeof inventory === 'string' ? inventory : JSON.stringify(inventory);

      const nextSortOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM character_sheets').get()?.next_order) || 1;

      const stmt = db.prepare(`
        INSERT INTO character_sheets (
          user_id, name, race, psa, gender, height, weight,
          str, sta, current_sta, max_seu, current_seu, current_xp, dex, rs, int_stat, log_stat, per, ldr,
          racial_abilities, skills, inventory, notes, avatar_url, sort_order
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `);

      const result = stmt.run(
        ownerId, characterName, race, characterPsa, gender, height, weight,
        strVal, staVal, curStaVal, maxSeuVal, curSeuVal, curXpVal, dexVal, rsVal, intVal, logVal, perVal, ldrVal,
        racialAbilitiesStr, skillsStr, inventoryStr, notes, req.body.avatar_url || '', nextSortOrder
      );

      const created = db.prepare(`
        SELECT c.*, u.username AS owner_username
        FROM character_sheets c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `).get(result.lastInsertRowid);
      const sheet = formatCharacterSheet(created);

      if (io) {
        io.emit('sheet:created', { type: 'character', sheet });
      }

      res.status(201).json(sheet);
    } catch (err) {
      console.error('Error creating character sheet:', err);
      res.status(500).json({ error: 'Failed to create character sheet' });
    }
  });

  router.put('/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM character_sheets WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Character sheet not found' });
      }

      const isOwner = existing.user_id === req.session.userId;
      const isGM = isGameMaster(db, req.session.userId);
      if (!isOwner && !isGM) {
        return res.status(403).json({ error: 'Access denied' });
      }

      let ownerId = existing.user_id;
      if (isGM && req.body.user_id !== undefined && req.body.user_id !== null) {
        const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.body.user_id);
        if (!targetUser) {
          return res.status(400).json({ error: 'Assigned user does not exist' });
        }
        ownerId = targetUser.id;
      }

      let race = req.body.race !== undefined ? req.body.race : existing.race;
      const {
        psa = existing.psa || 'Military',
        gender = existing.gender,
        height = existing.height,
        weight = existing.weight,
        str = existing.str,
        sta = existing.sta,
        current_sta = existing.current_sta,
        dex = existing.dex,
        rs = existing.rs,
        int_stat = existing.int_stat,
        log_stat = existing.log_stat,
        per = existing.per,
        ldr = existing.ldr,
        racial_abilities = safeJsonParse(existing.racial_abilities, {}),
        skills = safeJsonParse(existing.skills, []),
        inventory = safeJsonParse(existing.inventory, []),
        notes = existing.notes,
      } = req.body;

      if (req.body.name !== undefined) {
        if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
          return res.status(400).json({ error: 'Valid character name is required' });
        }
      }
      const name = req.body.name !== undefined ? req.body.name.trim() : existing.name;

      if (!race || typeof race !== 'string' || !race.trim()) {
        return res.status(400).json({ error: 'Valid race is required' });
      }

      race = race.trim();

      const validPsas = ['Military', 'Technological', 'Biosocial'];
      const characterPsa = validPsas.includes(psa) ? psa : (existing.psa || 'Military');

      const strVal = clampStat(str, existing.str, 1, 200);
      const staVal = clampStat(sta, existing.sta, 1, 200);
      const curStaVal = clampStat(current_sta, existing.current_sta, 0, 200);
      const max_seu = req.body.max_seu !== undefined ? req.body.max_seu : (existing.max_seu ?? 50);
      const maxSeuVal = clampStat(max_seu, existing.max_seu ?? 50, 0, 100000);
      const current_seu = req.body.current_seu !== undefined ? req.body.current_seu : (existing.current_seu ?? maxSeuVal);
      const curSeuVal = clampStat(current_seu, existing.current_seu ?? maxSeuVal, 0, maxSeuVal);
      const current_xp = req.body.current_xp !== undefined ? req.body.current_xp : (existing.current_xp ?? 0);
      const curXpVal = clampStat(current_xp, existing.current_xp ?? 0, 0, 1000000);
      const dexVal = clampStat(dex, existing.dex, 1, 200);
      const rsVal = clampStat(rs, existing.rs, 1, 200);
      const intVal = clampStat(int_stat, existing.int_stat, 1, 200);
      const logVal = clampStat(log_stat, existing.log_stat, 1, 200);
      const perVal = clampStat(per, existing.per, 1, 200);
      const ldrVal = clampStat(ldr, existing.ldr, 1, 200);

      const racialAbilitiesStr = typeof racial_abilities === 'string' ? racial_abilities : JSON.stringify(racial_abilities);
      const skillsStr = typeof skills === 'string' ? skills : JSON.stringify(skills);
      const inventoryStr = typeof inventory === 'string' ? inventory : JSON.stringify(inventory);

      const stmt = db.prepare(`
        UPDATE character_sheets SET
          user_id = ?, name = ?, race = ?, psa = ?, gender = ?, height = ?, weight = ?,
          str = ?, sta = ?, current_sta = ?, max_seu = ?, current_seu = ?, current_xp = ?, dex = ?, rs = ?,
          int_stat = ?, log_stat = ?, per = ?, ldr = ?,
          racial_abilities = ?, skills = ?, inventory = ?, notes = ?, avatar_url = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const avatarUrl = req.body.avatar_url !== undefined ? req.body.avatar_url : (existing.avatar_url || '');

      stmt.run(
        ownerId, name, race, characterPsa, gender, height, weight,
        strVal, staVal, curStaVal, maxSeuVal, curSeuVal, curXpVal, dexVal, rsVal,
        intVal, logVal, perVal, ldrVal,
        racialAbilitiesStr, skillsStr, inventoryStr, notes, avatarUrl,
        req.params.id
      );

      if (req.body.current_seu !== undefined) {
        const linkedTokens = db.prepare('SELECT id FROM tokens WHERE character_id = ?').all(existing.id);
        if (linkedTokens.length > 0) {
          db.prepare('UPDATE tokens SET seu_current = ? WHERE character_id = ?').run(curSeuVal, existing.id);
          if (io) {
            for (const t of linkedTokens) {
              const updatedRow = db.prepare('SELECT * FROM tokens WHERE id = ?').get(t.id);
              if (updatedRow) {
                const formatted = formatToken(updatedRow);
                if (formatted.layer === 'gm') {
                  io.to('role:GameMaster').emit('token:updated', { token: formatted });
                } else {
                  io.emit('token:updated', { token: formatted });
                }
              }
            }
          }
        }
      }

      const updated = db.prepare(`
        SELECT c.*, u.username AS owner_username
        FROM character_sheets c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `).get(req.params.id);
      const sheet = formatCharacterSheet(updated);

      if (io) {
        io.emit('sheet:updated', { type: 'character', sheet });
      }

      res.json(sheet);
    } catch (err) {
      console.error('Error updating character sheet:', err);
      res.status(500).json({ error: 'Failed to update character sheet' });
    }
  });

  router.delete('/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM character_sheets WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Character sheet not found' });
      }

      const isOwner = existing.user_id === req.session.userId;
      const isGM = isGameMaster(db, req.session.userId);
      if (!isOwner && !isGM) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const deleteCharacterTx = db.transaction((id) => {
        db.prepare(`
          UPDATE tokens SET character_id = NULL
          WHERE character_id = ? AND map_id IN (SELECT id FROM maps WHERE map_type != 'space')
        `).run(id);
        db.prepare('DELETE FROM character_sheets WHERE id = ?').run(id);
      });
      deleteCharacterTx(req.params.id);

      if (io) {
        io.emit('sheet:deleted', { type: 'character', id: Number(req.params.id) });
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('Error deleting character sheet:', err);
      res.status(500).json({ error: 'Failed to delete character sheet' });
    }
  });

  return router;
}

export function createShipRouter(db, io) {
  const router = Router();

  router.use(requireAuth);

  router.get('/', (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT s.*, u.username AS owner_username
        FROM ship_sheets s
        LEFT JOIN users u ON s.user_id = u.id
        ORDER BY s.sort_order ASC, s.id ASC
      `).all();
      res.json(rows.map(formatShipSheet));
    } catch (err) {
      console.error('Error listing ships:', err);
      res.status(500).json({ error: 'Failed to list ship sheets' });
    }
  });

  router.put('/reorder', requireGM(db), (req, res) => {
    try {
      const { order } = req.body || {};
      if (!Array.isArray(order) || order.length === 0) {
        return res.status(400).json({ error: 'Order must be a non-empty array of sheet IDs' });
      }

      // Check numeric IDs and duplicates
      const seen = new Set();
      for (const id of order) {
        if (typeof id !== 'number' || !Number.isInteger(id)) {
          return res.status(400).json({ error: 'All IDs in order must be valid integers' });
        }
        if (seen.has(id)) {
          return res.status(400).json({ error: 'Duplicate IDs found in order array' });
        }
        seen.add(id);
      }

      const updateOrderTx = db.transaction((sheetIds) => {
        const stmt = db.prepare('UPDATE ship_sheets SET sort_order = ? WHERE id = ?');
        sheetIds.forEach((id, index) => {
          stmt.run(index, id);
        });
      });

      updateOrderTx(order);

      if (io) {
        io.emit('sheets:reordered', { type: 'ship', order });
      }

      res.json({ success: true, order });
    } catch (err) {
      console.error('Error reordering ship sheets:', err);
      res.status(500).json({ error: 'Failed to reorder ship sheets' });
    }
  });

  router.get('/:id', (req, res) => {
    try {
      const row = db.prepare(`
        SELECT s.*, u.username AS owner_username
        FROM ship_sheets s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `).get(req.params.id);
      if (!row) {
        return res.status(404).json({ error: 'Ship sheet not found' });
      }
      res.json(formatShipSheet(row));
    } catch (err) {
      console.error('Error fetching ship:', err);
      res.status(500).json({ error: 'Failed to fetch ship sheet' });
    }
  });

  router.post('/', (req, res) => {
    try {
      const {
        name,
        ship_type,
        hull_points = 50,
        current_hp = hull_points ?? 50,
        adf = 2,
        mr = 2,
        dcr = 50,
        current_dcr,
        weapons = [],
        defenses = [],
        damaged_systems = [],
        notes = '',
        avatar_url = '',
      } = req.body;

      if (!name || !ship_type) {
        return res.status(400).json({ error: 'Name and ship_type are required' });
      }

      const isGM = isGameMaster(db, req.session.userId);
      let ownerId = req.session.userId;
      if (isGM && req.body.user_id !== undefined && req.body.user_id !== null) {
        const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.body.user_id);
        if (!targetUser) {
          return res.status(400).json({ error: 'Assigned user does not exist' });
        }
        ownerId = targetUser.id;
      }

      const clampedHullPoints = clampStat(hull_points, 50, 1, 10000);
      const clampedCurrentHp = current_hp !== undefined && current_hp !== null
        ? clampStat(current_hp, clampedHullPoints, 0, clampedHullPoints)
        : clampedHullPoints;
      const clampedAdf = clampStat(adf, 2, 0, 1000);
      const clampedMr = clampStat(mr, 2, 0, 1000);
      const clampedDcr = clampStat(dcr, 50, 0, 1000);
      const clampedCurrentDcr = current_dcr !== undefined && current_dcr !== null
        ? clampStat(current_dcr, clampedDcr, 0, clampedDcr)
        : clampedDcr;

      const weaponsStr = typeof weapons === 'string' ? weapons : JSON.stringify(weapons);
      const defensesStr = typeof defenses === 'string' ? defenses : JSON.stringify(defenses);
      const damagedSystemsStr = typeof damaged_systems === 'string' ? damaged_systems : JSON.stringify(damaged_systems);

      const nextSortOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM ship_sheets').get()?.next_order) || 1;

      const stmt = db.prepare(`
        INSERT INTO ship_sheets (
          user_id, name, ship_type, hull_points, current_hp, adf, mr, dcr, current_dcr,
          weapons, defenses, damaged_systems, notes, avatar_url, sort_order
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `);

      const result = stmt.run(
        ownerId, name, ship_type, clampedHullPoints, clampedCurrentHp, clampedAdf, clampedMr, clampedDcr, clampedCurrentDcr,
        weaponsStr, defensesStr, damagedSystemsStr, notes, req.body.avatar_url || '', nextSortOrder
      );

      const created = db.prepare(`
        SELECT s.*, u.username AS owner_username
        FROM ship_sheets s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `).get(result.lastInsertRowid);
      const sheet = formatShipSheet(created);

      if (io) {
        io.emit('sheet:created', { type: 'ship', sheet });
      }

      res.status(201).json(sheet);
    } catch (err) {
      console.error('Error creating ship sheet:', err);
      res.status(500).json({ error: 'Failed to create ship sheet' });
    }
  });

  router.put('/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM ship_sheets WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Ship sheet not found' });
      }

      const isOwner = existing.user_id === req.session.userId;
      const isGM = isGameMaster(db, req.session.userId);
      if (!isOwner && !isGM) {
        return res.status(403).json({ error: 'Access denied' });
      }

      let ownerId = existing.user_id;
      if (isGM && req.body.user_id !== undefined && req.body.user_id !== null) {
        const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.body.user_id);
        if (!targetUser) {
          return res.status(400).json({ error: 'Assigned user does not exist' });
        }
        ownerId = targetUser.id;
      }

      const {
        name = existing.name,
        ship_type = existing.ship_type,
        hull_points = existing.hull_points,
        current_hp = existing.current_hp,
        adf = existing.adf,
        mr = existing.mr,
        dcr = existing.dcr,
        current_dcr,
        weapons = safeJsonParse(existing.weapons, []),
        defenses = safeJsonParse(existing.defenses, []),
        damaged_systems = safeJsonParse(existing.damaged_systems, []),
        notes = existing.notes,
      } = req.body;

      const avatarUrl = req.body.avatar_url !== undefined ? req.body.avatar_url : (existing.avatar_url || '');

      const clampedHullPoints = clampStat(hull_points, existing.hull_points, 1, 10000);
      const clampedCurrentHp = current_hp !== undefined && current_hp !== null
        ? clampStat(current_hp, existing.current_hp, 0, clampedHullPoints)
        : clampStat(existing.current_hp, clampedHullPoints, 0, clampedHullPoints);
      const clampedAdf = clampStat(adf, existing.adf, 0, 1000);
      const clampedMr = clampStat(mr, existing.mr, 0, 1000);
      const clampedDcr = clampStat(dcr, existing.dcr, 0, 1000);
      const clampedCurrentDcr = current_dcr !== undefined && current_dcr !== null
        ? clampStat(current_dcr, existing.current_dcr ?? clampedDcr, 0, clampedDcr)
        : clampStat(existing.current_dcr ?? clampedDcr, clampedDcr, 0, clampedDcr);

      const weaponsStr = typeof weapons === 'string' ? weapons : JSON.stringify(weapons);
      const defensesStr = typeof defenses === 'string' ? defenses : JSON.stringify(defenses);
      const damagedSystemsStr = typeof damaged_systems === 'string' ? damaged_systems : JSON.stringify(damaged_systems);

      const stmt = db.prepare(`
        UPDATE ship_sheets SET
          user_id = ?, name = ?, ship_type = ?, hull_points = ?, current_hp = ?,
          adf = ?, mr = ?, dcr = ?, current_dcr = ?, weapons = ?, defenses = ?, damaged_systems = ?, notes = ?, avatar_url = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(
        ownerId, name, ship_type, clampedHullPoints, clampedCurrentHp,
        clampedAdf, clampedMr, clampedDcr, clampedCurrentDcr, weaponsStr, defensesStr, damagedSystemsStr, notes, avatarUrl,
        req.params.id
      );

      // Sync linked space tokens if HP or max HP changed (tokens on space maps link via character_id to ship_sheets)
      const linkedShipTokens = db.prepare(`
        SELECT t.id FROM tokens t
        JOIN maps m ON t.map_id = m.id
        WHERE m.map_type = 'space' AND t.character_id = ?
      `).all(req.params.id);
      if (linkedShipTokens.length > 0) {
        db.prepare(`
          UPDATE tokens SET current_hp = ?, max_hp = ?
          WHERE id IN (
            SELECT t.id FROM tokens t
            JOIN maps m ON t.map_id = m.id
            WHERE m.map_type = 'space' AND t.character_id = ?
          )
        `).run(clampedCurrentHp, clampedHullPoints, req.params.id);
        if (io) {
          for (const t of linkedShipTokens) {
            const updatedRow = db.prepare('SELECT * FROM tokens WHERE id = ?').get(t.id);
            if (updatedRow) {
              const formatted = formatToken(updatedRow);
              if (formatted.layer === 'gm') {
                io.to('role:GameMaster').emit('token:updated', { token: formatted });
              } else {
                io.emit('token:updated', { token: formatted });
              }
            }
          }
        }
      }

      const updated = db.prepare(`
        SELECT s.*, u.username AS owner_username
        FROM ship_sheets s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `).get(req.params.id);
      const sheet = formatShipSheet(updated);

      if (io) {
        io.emit('sheet:updated', { type: 'ship', sheet });
      }

      res.json(sheet);
    } catch (err) {
      console.error('Error updating ship sheet:', err);
      res.status(500).json({ error: 'Failed to update ship sheet' });
    }
  });

  router.delete('/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM ship_sheets WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Ship sheet not found' });
      }

      const isOwner = existing.user_id === req.session.userId;
      const isGM = isGameMaster(db, req.session.userId);
      if (!isOwner && !isGM) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const deleteShipTx = db.transaction((id) => {
        db.prepare(`
          UPDATE tokens SET character_id = NULL
          WHERE character_id = ? AND map_id IN (SELECT id FROM maps WHERE map_type = 'space')
        `).run(id);
        db.prepare('DELETE FROM ship_sheets WHERE id = ?').run(id);
      });
      deleteShipTx(req.params.id);

      if (io) {
        io.emit('sheet:deleted', { type: 'ship', id: Number(req.params.id) });
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('Error deleting ship sheet:', err);
      res.status(500).json({ error: 'Failed to delete ship sheet' });
    }
  });

  return router;
}

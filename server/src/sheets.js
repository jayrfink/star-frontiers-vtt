import { Router } from 'express';
import { requireAuth, isGameMaster } from './middleware.js';

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
    avatar_url: row.avatar_url || '',
    weapons: safeJsonParse(row.weapons, []),
    defenses: safeJsonParse(row.defenses, []),
  };
}

export function createCharacterRouter(db, io) {
  const router = Router();

  router.use(requireAuth);

  router.get('/', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM character_sheets ORDER BY created_at DESC, id DESC').all();
      res.json(rows.map(formatCharacterSheet));
    } catch (err) {
      console.error('Error listing characters:', err);
      res.status(500).json({ error: 'Failed to list character sheets' });
    }
  });

  router.get('/:id', (req, res) => {
    try {
      const row = db.prepare('SELECT * FROM character_sheets WHERE id = ?').get(req.params.id);
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
        gender = null,
        height = null,
        weight = null,
        str = 50,
        sta = 50,
        current_sta = sta ?? 50,
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

      const characterName = name.trim();
      race = race.trim();

      const validPsas = ['Military', 'Technological', 'Biosocial'];
      const characterPsa = validPsas.includes(psa) ? psa : 'Military';

      const strVal = clampStat(str, 50, 1, 200);
      const staVal = clampStat(sta, 50, 1, 200);
      const curStaVal = clampStat(current_sta, staVal, 0, 200);
      const dexVal = clampStat(dex, 50, 1, 200);
      const rsVal = clampStat(rs, 50, 1, 200);
      const intVal = clampStat(int_stat, 50, 1, 200);
      const logVal = clampStat(log_stat, 50, 1, 200);
      const perVal = clampStat(per, 50, 1, 200);
      const ldrVal = clampStat(ldr, 50, 1, 200);

      const racialAbilitiesStr = typeof racial_abilities === 'string' ? racial_abilities : JSON.stringify(racial_abilities);
      const skillsStr = typeof skills === 'string' ? skills : JSON.stringify(skills);
      const inventoryStr = typeof inventory === 'string' ? inventory : JSON.stringify(inventory);

      const stmt = db.prepare(`
        INSERT INTO character_sheets (
          user_id, name, race, psa, gender, height, weight,
          str, sta, current_sta, dex, rs, int_stat, log_stat, per, ldr,
          racial_abilities, skills, inventory, notes, avatar_url
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `);

      const result = stmt.run(
        req.session.userId, characterName, race, characterPsa, gender, height, weight,
        strVal, staVal, curStaVal, dexVal, rsVal, intVal, logVal, perVal, ldrVal,
        racialAbilitiesStr, skillsStr, inventoryStr, notes, req.body.avatar_url || ''
      );

      const created = db.prepare('SELECT * FROM character_sheets WHERE id = ?').get(result.lastInsertRowid);
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
          name = ?, race = ?, psa = ?, gender = ?, height = ?, weight = ?,
          str = ?, sta = ?, current_sta = ?, dex = ?, rs = ?,
          int_stat = ?, log_stat = ?, per = ?, ldr = ?,
          racial_abilities = ?, skills = ?, inventory = ?, notes = ?, avatar_url = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const avatarUrl = req.body.avatar_url !== undefined ? req.body.avatar_url : (existing.avatar_url || '');

      stmt.run(
        name, race, characterPsa, gender, height, weight,
        strVal, staVal, curStaVal, dexVal, rsVal,
        intVal, logVal, perVal, ldrVal,
        racialAbilitiesStr, skillsStr, inventoryStr, notes, avatarUrl,
        req.params.id
      );

      const updated = db.prepare('SELECT * FROM character_sheets WHERE id = ?').get(req.params.id);
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
      const rows = db.prepare('SELECT * FROM ship_sheets ORDER BY created_at DESC, id DESC').all();
      res.json(rows.map(formatShipSheet));
    } catch (err) {
      console.error('Error listing ships:', err);
      res.status(500).json({ error: 'Failed to list ship sheets' });
    }
  });

  router.get('/:id', (req, res) => {
    try {
      const row = db.prepare('SELECT * FROM ship_sheets WHERE id = ?').get(req.params.id);
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
        weapons = [],
        defenses = [],
        notes = '',
        avatar_url = '',
      } = req.body;

      if (!name || !ship_type) {
        return res.status(400).json({ error: 'Name and ship_type are required' });
      }

      const clampedHullPoints = clampStat(hull_points, 50, 1, 10000);
      const clampedCurrentHp = current_hp !== undefined && current_hp !== null
        ? clampStat(current_hp, clampedHullPoints, 0, clampedHullPoints)
        : clampedHullPoints;
      const clampedAdf = clampStat(adf, 2, 0, 1000);
      const clampedMr = clampStat(mr, 2, 0, 1000);
      const clampedDcr = clampStat(dcr, 50, 0, 1000);

      const weaponsStr = typeof weapons === 'string' ? weapons : JSON.stringify(weapons);
      const defensesStr = typeof defenses === 'string' ? defenses : JSON.stringify(defenses);

      const stmt = db.prepare(`
        INSERT INTO ship_sheets (
          user_id, name, ship_type, hull_points, current_hp, adf, mr, dcr,
          weapons, defenses, notes, avatar_url
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `);

      const result = stmt.run(
        req.session.userId, name, ship_type, clampedHullPoints, clampedCurrentHp, clampedAdf, clampedMr, clampedDcr,
        weaponsStr, defensesStr, notes, req.body.avatar_url || ''
      );

      const created = db.prepare('SELECT * FROM ship_sheets WHERE id = ?').get(result.lastInsertRowid);
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

      const {
        name = existing.name,
        ship_type = existing.ship_type,
        hull_points = existing.hull_points,
        current_hp = existing.current_hp,
        adf = existing.adf,
        mr = existing.mr,
        dcr = existing.dcr,
        weapons = safeJsonParse(existing.weapons, []),
        defenses = safeJsonParse(existing.defenses, []),
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

      const weaponsStr = typeof weapons === 'string' ? weapons : JSON.stringify(weapons);
      const defensesStr = typeof defenses === 'string' ? defenses : JSON.stringify(defenses);

      const stmt = db.prepare(`
        UPDATE ship_sheets SET
          name = ?, ship_type = ?, hull_points = ?, current_hp = ?,
          adf = ?, mr = ?, dcr = ?, weapons = ?, defenses = ?, notes = ?, avatar_url = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(
        name, ship_type, clampedHullPoints, clampedCurrentHp,
        clampedAdf, clampedMr, clampedDcr, weaponsStr, defensesStr, notes, avatarUrl,
        req.params.id
      );

      const updated = db.prepare('SELECT * FROM ship_sheets WHERE id = ?').get(req.params.id);
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

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

function formatCharacterSheet(row) {
  if (!row) return null;
  return {
    ...row,
    racial_abilities: safeJsonParse(row.racial_abilities, {}),
    skills: safeJsonParse(row.skills, []),
    inventory: safeJsonParse(row.inventory, []),
  };
}

function formatShipSheet(row) {
  if (!row) return null;
  return {
    ...row,
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
      const {
        name,
        race,
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

      if (!name || !race) {
        return res.status(400).json({ error: 'Name and race are required' });
      }

      const validRaces = ['Human', 'Dralasite', 'Vrusk', 'Yazirian'];
      if (!validRaces.includes(race)) {
        return res.status(400).json({ error: 'Invalid race' });
      }

      const racialAbilitiesStr = typeof racial_abilities === 'string' ? racial_abilities : JSON.stringify(racial_abilities);
      const skillsStr = typeof skills === 'string' ? skills : JSON.stringify(skills);
      const inventoryStr = typeof inventory === 'string' ? inventory : JSON.stringify(inventory);

      const stmt = db.prepare(`
        INSERT INTO character_sheets (
          user_id, name, race, gender, height, weight,
          str, sta, current_sta, dex, rs, int_stat, log_stat, per, ldr,
          racial_abilities, skills, inventory, notes
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `);

      const result = stmt.run(
        req.session.userId, name, race, gender, height, weight,
        str, sta, current_sta, dex, rs, int_stat, log_stat, per, ldr,
        racialAbilitiesStr, skillsStr, inventoryStr, notes
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

      const {
        name = existing.name,
        race = existing.race,
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

      const validRaces = ['Human', 'Dralasite', 'Vrusk', 'Yazirian'];
      if (!validRaces.includes(race)) {
        return res.status(400).json({ error: 'Invalid race' });
      }

      const racialAbilitiesStr = typeof racial_abilities === 'string' ? racial_abilities : JSON.stringify(racial_abilities);
      const skillsStr = typeof skills === 'string' ? skills : JSON.stringify(skills);
      const inventoryStr = typeof inventory === 'string' ? inventory : JSON.stringify(inventory);

      const stmt = db.prepare(`
        UPDATE character_sheets SET
          name = ?, race = ?, gender = ?, height = ?, weight = ?,
          str = ?, sta = ?, current_sta = ?, dex = ?, rs = ?,
          int_stat = ?, log_stat = ?, per = ?, ldr = ?,
          racial_abilities = ?, skills = ?, inventory = ?, notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(
        name, race, gender, height, weight,
        str, sta, current_sta, dex, rs,
        int_stat, log_stat, per, ldr,
        racialAbilitiesStr, skillsStr, inventoryStr, notes,
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

      db.prepare('DELETE FROM character_sheets WHERE id = ?').run(req.params.id);

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
      } = req.body;

      if (!name || !ship_type) {
        return res.status(400).json({ error: 'Name and ship_type are required' });
      }

      const weaponsStr = typeof weapons === 'string' ? weapons : JSON.stringify(weapons);
      const defensesStr = typeof defenses === 'string' ? defenses : JSON.stringify(defenses);

      const stmt = db.prepare(`
        INSERT INTO ship_sheets (
          user_id, name, ship_type, hull_points, current_hp, adf, mr, dcr,
          weapons, defenses, notes
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?
        )
      `);

      const result = stmt.run(
        req.session.userId, name, ship_type, hull_points, current_hp, adf, mr, dcr,
        weaponsStr, defensesStr, notes
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

      const weaponsStr = typeof weapons === 'string' ? weapons : JSON.stringify(weapons);
      const defensesStr = typeof defenses === 'string' ? defenses : JSON.stringify(defenses);

      const stmt = db.prepare(`
        UPDATE ship_sheets SET
          name = ?, ship_type = ?, hull_points = ?, current_hp = ?,
          adf = ?, mr = ?, dcr = ?, weapons = ?, defenses = ?, notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(
        name, ship_type, hull_points, current_hp,
        adf, mr, dcr, weaponsStr, defensesStr, notes,
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

      db.prepare('DELETE FROM ship_sheets WHERE id = ?').run(req.params.id);

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

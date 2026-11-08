import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { requireAuth, requireGM } from './middleware.js';
import { formatToken } from './maps.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VEHICLES_JSON_PATH = path.join(__dirname, '../../data/vehicles.json');

let canonicalVehiclesCache = null;

export function loadCanonicalVehicles() {
  if (canonicalVehiclesCache !== null) {
    return canonicalVehiclesCache;
  }
  try {
    if (fs.existsSync(VEHICLES_JSON_PATH)) {
      const raw = fs.readFileSync(VEHICLES_JSON_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        canonicalVehiclesCache = parsed.map(v => ({ ...v, is_canonical: true }));
        return canonicalVehiclesCache;
      }
    }
  } catch (err) {
    console.error('Error loading canonical vehicles:', err);
  }
  return [];
}


function sanitizeNumber(val, fallback) {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export function formatVehicleTemplate(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type || 'Ground',
    cost: Number(row.cost ?? 5000),
    top_speed_kph: Number(row.top_speed_kph ?? 100),
    top_speed_m_turn: Number(row.top_speed_m_turn ?? 175),
    cruise_speed_kph: Number(row.cruise_speed_kph ?? 60),
    accel: Number(row.accel ?? 60),
    decel: Number(row.decel ?? 40),
    turn_speed: Number(row.turn_speed ?? 80),
    passengers: Number(row.passengers ?? 4),
    cargo_kg: Number(row.cargo_kg ?? 150),
    cargo_m3: Number(row.cargo_m3 ?? 1.0),
    battery_type: row.battery_type || 'Type 2 (100 SEU)',
    max_seu: Number(row.max_seu ?? 100),
    token_size: Number(row.token_size ?? 2),
    avatar_url: row.avatar_url || '',
    description: row.description || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_canonical: false,
  };
}

export function createVehiclesRouter(db, io) {
  const router = Router();
  router.use(requireAuth);

  // GET /api/vehicles - List canonical and custom vehicle templates
  router.get('/', (req, res) => {
    try {
      const canonical = loadCanonicalVehicles();
      const customRows = db.prepare('SELECT * FROM vehicle_templates ORDER BY created_at ASC').all();
      const custom = customRows.map(formatVehicleTemplate);
      res.json([...canonical, ...custom]);
    } catch (err) {
      console.error('Error listing vehicles:', err);
      res.status(500).json({ error: 'Failed to list vehicles' });
    }
  });

  // POST /api/vehicles - Create custom vehicle template (GM only)
  router.post('/', requireGM(db), (req, res) => {
    try {
      const {
        name,
        type = 'Ground',
        cost = 5000,
        top_speed_kph = 100,
        top_speed_m_turn = 175,
        cruise_speed_kph = 60,
        accel = 60,
        decel = 40,
        turn_speed = 80,
        passengers = 4,
        cargo_kg = 150,
        cargo_m3 = 1.0,
        battery_type = 'Type 2 (100 SEU)',
        max_seu = 100,
        token_size = 2,
        avatar_url = '',
        description = '',
      } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Vehicle name is required' });
      }

      const numCost = sanitizeNumber(cost, 5000);
      const numTopSpeedKph = sanitizeNumber(top_speed_kph, 100);
      const numTopSpeedMTurn = sanitizeNumber(top_speed_m_turn, 175);
      const numCruiseSpeedKph = sanitizeNumber(cruise_speed_kph, 60);
      const numAccel = sanitizeNumber(accel, 60);
      const numDecel = sanitizeNumber(decel, 40);
      const numTurnSpeed = sanitizeNumber(turn_speed, 80);
      const numPassengers = sanitizeNumber(passengers, 4);
      const numCargoKg = sanitizeNumber(cargo_kg, 150);
      const numCargoM3 = sanitizeNumber(cargo_m3, 1.0);
      const numMaxSeu = sanitizeNumber(max_seu, 100);
      const numTokenSize = sanitizeNumber(token_size, 2);

      const id = `veh_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
      const userId = req.session.userId;

      const stmt = db.prepare(`
        INSERT INTO vehicle_templates (
          id, user_id, name, type, cost,
          top_speed_kph, top_speed_m_turn, cruise_speed_kph,
          accel, decel, turn_speed, passengers, cargo_kg,
          cargo_m3, battery_type, max_seu, token_size, avatar_url, description
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `);

      stmt.run(
        id, userId, name.trim(), type, numCost,
        numTopSpeedKph, numTopSpeedMTurn, numCruiseSpeedKph,
        numAccel, numDecel, numTurnSpeed, numPassengers, numCargoKg,
        numCargoM3, battery_type, numMaxSeu, numTokenSize, avatar_url, description
      );

      const createdRow = db.prepare('SELECT * FROM vehicle_templates WHERE id = ?').get(id);
      const vehicle = formatVehicleTemplate(createdRow);

      if (io) {
        io.emit('vehicle:created', { vehicle });
      }

      res.status(201).json(vehicle);
    } catch (err) {
      console.error('Error creating vehicle template:', err);
      res.status(500).json({ error: 'Failed to create vehicle template' });
    }
  });

  // PATCH /api/vehicles/:id/token - Update vehicle template token/avatar (GM only)
  router.patch('/:id/token', requireGM(db), (req, res) => {
    try {
      const vehicleId = req.params.id;
      const { avatar_url = '' } = req.body || {};
      const cleanAvatarUrl = typeof avatar_url === 'string' ? avatar_url.trim() : '';

      const existingCustom = db.prepare('SELECT * FROM vehicle_templates WHERE id = ?').get(vehicleId);
      let updatedVehicle = null;

      if (existingCustom) {
        db.prepare(`
          UPDATE vehicle_templates
          SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(cleanAvatarUrl, vehicleId);
        const updatedRow = db.prepare('SELECT * FROM vehicle_templates WHERE id = ?').get(vehicleId);
        updatedVehicle = formatVehicleTemplate(updatedRow);
      } else {
        const canonical = loadCanonicalVehicles();
        const canonVeh = canonical.find((v) => v.id === vehicleId);
        if (!canonVeh) {
          return res.status(404).json({ error: 'Vehicle template not found' });
        }
        canonVeh.avatar_url = cleanAvatarUrl;
        updatedVehicle = { ...canonVeh };
      }

      // Sync any active map tokens deployed from this vehicle template
      try {
        const allVehicleTokens = db.prepare('SELECT * FROM tokens WHERE vehicle_data IS NOT NULL').all();
        for (const tRow of allVehicleTokens) {
          let vData;
          try {
            vData = JSON.parse(tRow.vehicle_data);
          } catch {
            continue;
          }
          if (vData && (vData.template_id === vehicleId || vData.id === vehicleId)) {
            vData.avatar_url = cleanAvatarUrl;
            db.prepare('UPDATE tokens SET avatar_url = ?, vehicle_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
              cleanAvatarUrl,
              JSON.stringify(vData),
              tRow.id
            );
            if (io) {
              const updatedTokenRow = db.prepare('SELECT * FROM tokens WHERE id = ?').get(tRow.id);
              io.emit('token:updated', { token: formatToken(updatedTokenRow, db) });
            }
          }
        }
      } catch {}

      if (io) {
        io.emit('vehicle:updated', { vehicle: updatedVehicle });
      }

      res.status(200).json({ ...updatedVehicle, vehicle: updatedVehicle });
    } catch (err) {
      console.error('Error updating vehicle template token:', err);
      res.status(500).json({ error: 'Failed to update vehicle template token' });
    }
  });

  // DELETE /api/vehicles/:id - Delete custom vehicle template (GM only)
  router.delete('/:id', requireGM(db), (req, res) => {
    try {
      const canonical = loadCanonicalVehicles();
      if (canonical.some(v => v.id === req.params.id)) {
        return res.status(400).json({ error: 'Cannot delete canonical vehicle template' });
      }

      const existing = db.prepare('SELECT id FROM vehicle_templates WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Vehicle template not found' });
      }

      db.prepare('DELETE FROM vehicle_templates WHERE id = ?').run(req.params.id);

      if (io) {
        io.emit('vehicle:deleted', { id: req.params.id });
      }

      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error deleting vehicle template:', err);
      res.status(500).json({ error: 'Failed to delete vehicle template' });
    }
  });

  return router;
}

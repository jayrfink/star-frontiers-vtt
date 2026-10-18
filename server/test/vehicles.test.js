import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { createDb } from '../src/db.js';

describe('Vehicles API & Token Vehicle Support', () => {
  let app;
  let server;
  let db;
  let gmAgent;
  let playerAgent;
  let mapId;

  beforeAll(async () => {
    db = createDb(':memory:');
    const result = createApp(db, ':memory:');
    app = result.app;
    server = result.server;

    gmAgent = request.agent(app);
    playerAgent = request.agent(app);

    // Register GM and Login GM
    await gmAgent.post('/api/auth/register').send({ username: 'vehiclegm', password: 'password123', role: 'GameMaster' });
    await gmAgent.post('/api/auth/login').send({ username: 'vehiclegm', password: 'password123' });

    // Register Player (as GM) and Login Player
    await gmAgent.post('/api/auth/register').send({ username: 'vehicleplayer', password: 'password123', role: 'Player' });
    await playerAgent.post('/api/auth/login').send({ username: 'vehicleplayer', password: 'password123' });

    // Create a map for token tests
    const mapRes = await gmAgent.post('/api/maps').send({ name: 'Vehicle Map', width: 20, height: 20 });
    mapId = mapRes.body.id;
  });

  afterAll(() => {
    if (db) db.close();
    if (server && server.close) server.close();
  });

  describe('GET /api/vehicles', () => {
    it('returns HTTP 200 with list of canonical vehicles including all 10 Alpha Dawn vehicles', async () => {
      const res = await gmAgent.get('/api/vehicles');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(10);

      const names = res.body.map(v => v.name);
      expect(names).toContain('Ground Car');
      expect(names).toContain('Ground Transport');
      expect(names).toContain('Ground Cycle');
      expect(names).toContain('Hover Car');
      expect(names).toContain('Hover Transport');
      expect(names).toContain('Hover Cycle');
      expect(names).toContain('Explorer');
      expect(names).toContain('Glijet');
      expect(names).toContain('Jetcopter');
      expect(names).toContain('Aircar');

      // Verify Ground Car attributes
      const car = res.body.find(v => v.name === 'Ground Car');
      expect(car.type).toBe('Ground');
      expect(car.cost).toBe(5000);
      expect(car.top_speed_kph).toBe(100);
      expect(car.top_speed_m_turn).toBe(175);
      expect(car.cruise_speed_kph).toBe(60);
      expect(car.accel).toBe(60);
      expect(car.decel).toBe(40);
      expect(car.turn_speed).toBe(80);
      expect(car.passengers).toBe(6);
      expect(car.cargo_kg).toBe(150);
      expect(car.max_seu).toBe(100);
      expect(car.token_size).toBe(2);
      expect(car.is_canonical).toBe(true);
    });
  });

  describe('POST /api/vehicles and DELETE /api/vehicles/:id', () => {
    it('rejects custom vehicle creation from Player with 403', async () => {
      const res = await playerAgent.post('/api/vehicles').send({
        name: 'Player Buggy',
        type: 'Ground',
        top_speed_m_turn: 150,
      });
      expect(res.status).toBe(403);
    });

    it('rejects custom vehicle creation with missing required name', async () => {
      const res = await gmAgent.post('/api/vehicles').send({
        type: 'Ground',
      });
      expect(res.status).toBe(400);
    });

    it('allows GM to create a custom vehicle template and persists it', async () => {
      const payload = {
        name: 'Armored Patrol Scout',
        type: 'Ground',
        cost: 12000,
        top_speed_kph: 110,
        top_speed_m_turn: 180,
        cruise_speed_kph: 70,
        accel: 70,
        decel: 50,
        turn_speed: 90,
        passengers: 4,
        cargo_kg: 500,
        cargo_m3: 2.5,
        battery_type: 'Type 2 (100 SEU)',
        max_seu: 100,
        token_size: 2,
        avatar_url: '/uploads/patrol_scout.png',
        description: 'Reinforced frontier patrol vehicle',
      };

      const res = await gmAgent.post('/api/vehicles').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^veh_/);
      expect(res.body.name).toBe('Armored Patrol Scout');
      expect(res.body.is_canonical).toBe(false);

      // Verify it appears in GET /api/vehicles
      const listRes = await gmAgent.get('/api/vehicles');
      const found = listRes.body.find(v => v.id === res.body.id);
      expect(found).toBeDefined();
      expect(found.name).toBe('Armored Patrol Scout');
      expect(found.is_canonical).toBe(false);
    });

    it('rejects deleting canonical vehicles with 400', async () => {
      const res = await gmAgent.delete('/api/vehicles/ground_car');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('canonical');
    });

    it('allows GM to delete custom vehicle template', async () => {
      const createRes = await gmAgent.post('/api/vehicles').send({
        name: 'Temporary Buggy',
        type: 'Ground',
      });
      const id = createRes.body.id;

      const delRes = await gmAgent.delete(`/api/vehicles/${id}`);
      expect(delRes.status).toBe(200);

      const listRes = await gmAgent.get('/api/vehicles');
      expect(listRes.body.find(v => v.id === id)).toBeUndefined();
    });
  });

  describe('Tokens with vehicle_data integration', () => {
    let tokenId;

    it('spawns a vehicle token with vehicle_data', async () => {
      const vehicleData = {
        template_id: 'ground_car',
        name: 'Ground Car',
        type: 'Ground',
        current_speed: 0,
        top_speed: 175,
        accel: 60,
        decel: 40,
        turn_speed: 80,
        current_seu: 100,
        max_seu: 100,
        damage_conditions: [],
        passengers: 'Driver: Ace',
        cargo_notes: 'Survival kit',
      };

      const res = await gmAgent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Ground Car',
        color: '#ff9800',
        size: 2,
        x: 5,
        y: 5,
        vehicle_data: vehicleData,
      });

      expect(res.status).toBe(201);
      expect(res.body.vehicle_data).toBeDefined();
      expect(res.body.vehicle_data.template_id).toBe('ground_car');
      expect(res.body.vehicle_data.current_speed).toBe(0);
      expect(res.body.vehicle_data.current_seu).toBe(100);
      tokenId = res.body.id;
    });

    it('updates vehicle_data (speed, SEU, damage conditions) via PUT /api/tokens/:id', async () => {
      const updatedVehicleData = {
        template_id: 'ground_car',
        name: 'Ground Car',
        type: 'Ground',
        current_speed: 60,
        top_speed: 175,
        accel: 60,
        decel: 40,
        turn_speed: 80,
        current_seu: 90,
        max_seu: 100,
        damage_conditions: ['Turn Speed -15'],
        passengers: 'Driver: Ace',
        cargo_notes: 'Survival kit',
      };

      const res = await gmAgent.put(`/api/tokens/${tokenId}`).send({
        x: 8,
        y: 5,
        vehicle_data: updatedVehicleData,
      });

      expect(res.status).toBe(200);
      expect(res.body.vehicle_data.current_speed).toBe(60);
      expect(res.body.vehicle_data.current_seu).toBe(90);
      expect(res.body.vehicle_data.damage_conditions).toEqual(['Turn Speed -15']);
    });
  });
});

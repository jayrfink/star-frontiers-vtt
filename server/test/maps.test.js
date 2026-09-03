import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';

describe('Maps & Tokens API & Socket.io', () => {
  let db, app, server, io;

  beforeEach(() => {
    db = createTestDb();
    const result = createApp(db, ':memory:');
    app = result.app;
    server = result.server;
    io = result.io;
  });

  afterEach(() => {
    if (db) db.close();
    if (server && server.close) server.close();
  });

  describe('Maps API', () => {
    it('returns 401 when unauthenticated on GET /api/maps', async () => {
      const res = await request(app).get('/api/maps');
      expect(res.status).toBe(401);
    });

    it('returns 200 list when authenticated on GET /api/maps', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      const res = await agent.get('/api/maps');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('creates map (GM only) and emits map:created', async () => {
      const gmAgent = request.agent(app);
      // First user registered becomes GameMaster
      await gmAgent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      const playerAgent = request.agent(app);
      // Second user registered becomes Player
      await playerAgent.post('/api/auth/register').send({ username: 'player_user', password: 'password123' });
      await playerAgent.post('/api/auth/login').send({ username: 'player_user', password: 'password123' });

      // Player attempting to create map should get 403
      const playerCreateRes = await playerAgent.post('/api/maps').send({ name: 'Player Map' });
      expect(playerCreateRes.status).toBe(403);

      const emitSpy = vi.spyOn(io, 'emit');

      // GM creating map
      const gmCreateRes = await gmAgent.post('/api/maps').send({
        name: 'Volturnus Outpost',
        preset_bg: 'volturnus_desert',
        width: 30,
        height: 30,
        grid_size: 40,
        grid_color: '#ff9900',
      });

      expect(gmCreateRes.status).toBe(201);
      expect(gmCreateRes.body.name).toBe('Volturnus Outpost');
      expect(gmCreateRes.body.preset_bg).toBe('volturnus_desert');
      expect(gmCreateRes.body.width).toBe(30);
      expect(gmCreateRes.body.fog_data).toEqual([]);
      expect(emitSpy).toHaveBeenCalledWith('map:created', expect.objectContaining({
        map: expect.objectContaining({ name: 'Volturnus Outpost' }),
      }));
    });

    it('activates map and emits map:activated', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      const map1Res = await gmAgent.post('/api/maps').send({ name: 'Map 1' });
      const map2Res = await gmAgent.post('/api/maps').send({ name: 'Map 2' });

      const emitSpy = vi.spyOn(io, 'emit');

      const activateRes = await gmAgent.post(`/api/maps/${map2Res.body.id}/activate`);
      expect(activateRes.status).toBe(200);
      expect(activateRes.body.map.id).toBe(map2Res.body.id);
      expect(activateRes.body.map.is_active).toBe(1);

      expect(emitSpy).toHaveBeenCalledWith('map:activated', expect.objectContaining({
        map: expect.objectContaining({ id: map2Res.body.id, is_active: 1 }),
      }));

      // Verify in DB map1 is not active and map2 is active
      const mapsRes = await gmAgent.get('/api/maps');
      const map1 = mapsRes.body.find(m => m.id === map1Res.body.id);
      const map2 = mapsRes.body.find(m => m.id === map2Res.body.id);
      expect(map1.is_active).toBe(0);
      expect(map2.is_active).toBe(1);
    });

    it('updates map and fog_data', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      const createRes = await gmAgent.post('/api/maps').send({ name: 'Ship Interior' });
      const mapId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const fogData = [{ x: 5, y: 5, w: 2, h: 2 }];
      const updateRes = await gmAgent.put(`/api/maps/${mapId}`).send({
        name: 'Ship Deck 1',
        fog_data: fogData,
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe('Ship Deck 1');
      expect(updateRes.body.fog_data).toEqual(fogData);
      expect(emitSpy).toHaveBeenCalledWith('map:updated', expect.objectContaining({
        map: expect.objectContaining({ id: mapId, name: 'Ship Deck 1' }),
      }));
    });

    it('deletes map and emits map:deleted', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      const createRes = await gmAgent.post('/api/maps').send({ name: 'Temp Map' });
      const mapId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const delRes = await gmAgent.delete(`/api/maps/${mapId}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.ok).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('map:deleted', { id: mapId });
    });
  });

  describe('Tokens API', () => {
    let agent, mapId;

    beforeEach(async () => {
      agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      const mapRes = await agent.post('/api/maps').send({ name: 'Battlefield' });
      mapId = mapRes.body.id;
    });

    it('creates token and emits token:created', async () => {
      const emitSpy = vi.spyOn(io, 'emit');

      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Sathras Warrior',
        color: '#ff0055',
        x: 5,
        y: 10,
        size: 1,
        current_hp: 30,
        max_hp: 30,
        status_effects: ['Stunned'],
        layer: 'character',
      });

      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe('Sathras Warrior');
      expect(createRes.body.x).toBe(5);
      expect(createRes.body.y).toBe(10);
      expect(createRes.body.status_effects).toEqual(['Stunned']);
      expect(emitSpy).toHaveBeenCalledWith('token:created', expect.objectContaining({
        token: expect.objectContaining({ name: 'Sathras Warrior' }),
      }));
    });

    it('moves and updates token, emitting token:moved and token:updated', async () => {
      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Hero',
        x: 0,
        y: 0,
      });
      const tokenId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const updateRes = await agent.put(`/api/tokens/${tokenId}`).send({
        x: 3,
        y: 4,
        current_hp: 25,
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.x).toBe(3);
      expect(updateRes.body.y).toBe(4);

      expect(emitSpy).toHaveBeenCalledWith('token:moved', expect.objectContaining({
        token: expect.objectContaining({ id: tokenId, x: 3, y: 4 }),
      }));
      expect(emitSpy).toHaveBeenCalledWith('token:updated', expect.objectContaining({
        token: expect.objectContaining({ id: tokenId, current_hp: 25 }),
      }));
    });

    it('updates token rotation and speed', async () => {
      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Starship',
      });
      const tokenId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const res = await agent.put(`/api/tokens/${tokenId}`).send({
        rotation: 60,
        current_speed: 10,
      });
      expect(res.status).toBe(200);
      expect(res.body.rotation).toBe(60);
      expect(res.body.current_speed).toBe(10);
      expect(emitSpy).toHaveBeenCalledWith('token:updated', expect.objectContaining({
        token: expect.objectContaining({ id: tokenId, rotation: 60, current_speed: 10 }),
      }));
    });

    it('creates token with rotation and speed', async () => {
      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Fighter',
        rotation: 180,
        current_speed: 6,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.rotation).toBe(180);
      expect(createRes.body.current_speed).toBe(6);
    });

    it('deletes token and emits token:deleted', async () => {
      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Enemy',
      });
      const tokenId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const delRes = await agent.delete(`/api/tokens/${tokenId}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.ok).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('token:deleted', { id: tokenId });
    });

    it('returns 400 when missing required fields on token creation', async () => {
      const res = await agent.post('/api/tokens').send({
        color: '#00ff00',
      });
      expect(res.status).toBe(400);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';

describe('Sheets API & Socket.io', () => {
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

  describe('Character Sheets API', () => {
    it('creates and lists character sheets', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const emitSpy = vi.spyOn(io, 'emit');

      const createRes = await agent.post('/api/characters').send({
        name: 'Wilks',
        race: 'Vrusk',
        str: 45, sta: 50, current_sta: 50, dex: 60, rs: 55,
        int_stat: 50, log_stat: 50, per: 40, ldr: 40,
        skills: [{ name: 'Gyropistol', level: 2 }],
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe('Wilks');
      expect(createRes.body.race).toBe('Vrusk');
      expect(createRes.body.skills).toEqual([{ name: 'Gyropistol', level: 2 }]);
      expect(emitSpy).toHaveBeenCalledWith('sheet:created', {
        type: 'character',
        sheet: expect.objectContaining({ name: 'Wilks', race: 'Vrusk' }),
      });

      const listRes = await agent.get('/api/characters');
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].name).toBe('Wilks');
    });

    it('gets character sheet by id', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const createRes = await agent.post('/api/characters').send({
        name: 'Jane',
        race: 'Human',
      });
      const charId = createRes.body.id;

      const getRes = await agent.get(`/api/characters/${charId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.name).toBe('Jane');
      expect(getRes.body.race).toBe('Human');
    });

    it('returns 404 for non-existent character', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await agent.get('/api/characters/999');
      expect(res.status).toBe(404);
    });

    it('updates character sheet and emits sheet:updated', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const createRes = await agent.post('/api/characters').send({
        name: 'Wilks',
        race: 'Vrusk',
        sta: 50,
        current_sta: 50,
      });
      const charId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const updateRes = await agent.put(`/api/characters/${charId}`).send({
        current_sta: 30,
        notes: 'Injured in combat',
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.current_sta).toBe(30);
      expect(updateRes.body.notes).toBe('Injured in combat');
      expect(emitSpy).toHaveBeenCalledWith('sheet:updated', {
        type: 'character',
        sheet: expect.objectContaining({ id: charId, current_sta: 30 }),
      });
    });

    it('creates character with specified PSA and allows updating PSA', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      // Create with Technological PSA
      const createRes = await agent.post('/api/characters').send({
        name: 'Tech Specialist',
        race: 'Yazirian',
        psa: 'Technological',
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.psa).toBe('Technological');
      const charId = createRes.body.id;

      // Fetch by ID
      const getRes = await agent.get(`/api/characters/${charId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.psa).toBe('Technological');

      // Update to Biosocial PSA
      const emitSpy = vi.spyOn(io, 'emit');
      const updateRes = await agent.put(`/api/characters/${charId}`).send({
        psa: 'Biosocial',
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.psa).toBe('Biosocial');
      expect(emitSpy).toHaveBeenCalledWith('sheet:updated', {
        type: 'character',
        sheet: expect.objectContaining({ id: charId, psa: 'Biosocial' }),
      });

      // Verify persistence via GET
      const verifyRes = await agent.get(`/api/characters/${charId}`);
      expect(verifyRes.body.psa).toBe('Biosocial');
    });

    it('deletes character sheet and emits sheet:deleted', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const createRes = await agent.post('/api/characters').send({
        name: 'Wilks',
        race: 'Vrusk',
      });
      const charId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const delRes = await agent.delete(`/api/characters/${charId}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.ok).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('sheet:deleted', {
        type: 'character',
        id: charId,
      });

      const getRes = await agent.get(`/api/characters/${charId}`);
      expect(getRes.status).toBe(404);
    });

    it('allows creating a character sheet with a custom race', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await agent.post('/api/characters').send({
        name: 'Gronk',
        race: 'Saurian',
        psa: 'Military',
        str: 60,
        sta: 60,
        dex: 40,
        rs: 40,
        int_stat: 45,
        log_stat: 45,
        per: 50,
        ldr: 50,
      });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Gronk');
      expect(res.body.race).toBe('Saurian');
    });

    it('allows updating a character sheet to a custom race', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const createRes = await agent.post('/api/characters').send({
        name: 'Torg',
        race: 'Human',
        psa: 'Military',
        str: 50, sta: 50, dex: 50, rs: 50, int_stat: 50, log_stat: 50, per: 50, ldr: 50,
      });

      const updateRes = await agent.put(`/api/characters/${createRes.body.id}`).send({
        race: 'Cyborg-Alpha',
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.race).toBe('Cyborg-Alpha');
    });

    it('rejects empty or whitespace-only race', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await agent.post('/api/characters').send({
        name: 'Blanko',
        race: '   ',
        psa: 'Military',
      });

      expect(res.status).toBe(400);
    });

    it('trims leading and trailing whitespace from race on create and update', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const createRes = await agent.post('/api/characters').send({
        name: 'Trimmy',
        race: '   Custom Alien   ',
        psa: 'Military',
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.race).toBe('Custom Alien');

      const updateRes = await agent.put(`/api/characters/${createRes.body.id}`).send({
        race: '   Cyber Human   ',
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.race).toBe('Cyber Human');
    });

    it('validates invalid race or missing fields', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const invalidRaceRes = await agent.post('/api/characters').send({
        name: 'Invalid',
        race: '   ',
      });
      expect(invalidRaceRes.status).toBe(400);

      const missingNameRes = await agent.post('/api/characters').send({
        race: 'Human',
      });
      expect(missingNameRes.status).toBe(400);
    });
  });

  describe('Ship Sheets API', () => {
    it('creates and lists ship sheets', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const emitSpy = vi.spyOn(io, 'emit');

      const createRes = await agent.post('/api/ships').send({
        name: 'UPF Strike Cruiser',
        ship_type: 'Cruiser',
        hull_points: 120, current_hp: 120, adf: 3, mr: 2, dcr: 75,
        weapons: [{ name: 'Laser Cannon', damage: '3d10' }],
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe('UPF Strike Cruiser');
      expect(createRes.body.weapons).toEqual([{ name: 'Laser Cannon', damage: '3d10' }]);
      expect(emitSpy).toHaveBeenCalledWith('sheet:created', {
        type: 'ship',
        sheet: expect.objectContaining({ name: 'UPF Strike Cruiser' }),
      });

      const listRes = await agent.get('/api/ships');
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
    });

    it('gets ship sheet by id', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const createRes = await agent.post('/api/ships').send({
        name: 'Scout Ship',
        ship_type: 'Scout',
      });
      const shipId = createRes.body.id;

      const getRes = await agent.get(`/api/ships/${shipId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.name).toBe('Scout Ship');
    });

    it('updates ship sheet and emits sheet:updated', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const createRes = await agent.post('/api/ships').send({
        name: 'Scout Ship',
        ship_type: 'Scout',
        hull_points: 50,
        current_hp: 50,
      });
      const shipId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const updateRes = await agent.put(`/api/ships/${shipId}`).send({
        current_hp: 35,
        notes: 'Hull damaged',
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.current_hp).toBe(35);
      expect(emitSpy).toHaveBeenCalledWith('sheet:updated', {
        type: 'ship',
        sheet: expect.objectContaining({ id: shipId, current_hp: 35 }),
      });
    });

    it('deletes ship sheet and emits sheet:deleted', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const createRes = await agent.post('/api/ships').send({
        name: 'Scout Ship',
        ship_type: 'Scout',
      });
      const shipId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const delRes = await agent.delete(`/api/ships/${shipId}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.ok).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('sheet:deleted', {
        type: 'ship',
        id: shipId,
      });
    });

    it('validates missing name or ship_type', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const res = await agent.post('/api/ships').send({
        name: 'No Type',
      });
      expect(res.status).toBe(400);
    });
  });
});

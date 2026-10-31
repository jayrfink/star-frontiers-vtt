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

    it('manages max_seu and current_seu, clamps them, and cascades current_seu to active map tokens', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      // Default values when not specified
      const res1 = await agent.post('/api/characters').send({ name: 'DefaultSEU', race: 'Human' });
      expect(res1.status).toBe(201);
      expect(res1.body.max_seu).toBe(50);
      expect(res1.body.current_seu).toBe(50);

      // Create with explicit SEU
      const createRes = await agent.post('/api/characters').send({
        name: 'Garth',
        race: 'Dralasite',
        max_seu: 100,
        current_seu: 75,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.max_seu).toBe(100);
      expect(createRes.body.current_seu).toBe(75);
      const charId = createRes.body.id;

      // Create a map and token linked to Garth
      const mapStmt = db.prepare("INSERT INTO maps (user_id, name, width, height) VALUES (1, 'Arena', 20, 20)");
      const mapInfo = mapStmt.run();
      const tokenStmt = db.prepare(`
        INSERT INTO tokens (map_id, character_id, name, seu_current)
        VALUES (?, ?, 'Garth Token', 75)
      `);
      const tokenInfo = tokenStmt.run(mapInfo.lastInsertRowid, charId);

      const emitSpy = vi.spyOn(io, 'emit');

      // Update current_seu (spend 15 SEU)
      const updateRes = await agent.put(`/api/characters/${charId}`).send({
        current_seu: 60,
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.current_seu).toBe(60);

      // Verify token.seu_current was cascaded
      const tokenAfter = db.prepare('SELECT seu_current FROM tokens WHERE id = ?').get(tokenInfo.lastInsertRowid);
      expect(tokenAfter.seu_current).toBe(60);
      expect(emitSpy).toHaveBeenCalledWith('token:updated', expect.objectContaining({
        token: expect.objectContaining({ id: tokenInfo.lastInsertRowid, seu_current: 60 }),
      }));

      // Clamps current_seu between 0 and max_seu
      const clampLow = await agent.put(`/api/characters/${charId}`).send({ current_seu: -10 });
      expect(clampLow.body.current_seu).toBe(0);

      const clampHigh = await agent.put(`/api/characters/${charId}`).send({ current_seu: 500 });
      expect(clampHigh.body.current_seu).toBe(100);
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

    it('includes owner_username in character sheet responses', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmUser', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmUser', password: 'password123' });

      const res = await gmAgent.post('/api/characters').send({ name: 'Hero', race: 'Human' });
      expect(res.status).toBe(201);
      expect(res.body.owner_username).toBe('gmUser');

      const listRes = await gmAgent.get('/api/characters');
      expect(listRes.body[0].owner_username).toBe('gmUser');
    });

    it('allows GM to assign character to another player login on create and update', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmBoss', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmBoss', password: 'password123' });

      // Register player account
      const playerReg = await gmAgent.post('/api/auth/register').send({ username: 'playerAlice', password: 'password123' });
      const playerUser = playerReg.body;

      // GM creates sheet assigned to playerAlice
      const createRes = await gmAgent.post('/api/characters').send({
        name: 'AliceChar',
        race: 'Yazirian',
        user_id: playerUser.id,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.user_id).toBe(playerUser.id);
      expect(createRes.body.owner_username).toBe('playerAlice');

      // GM reassigns sheet back to GM
      const gmInfo = (await gmAgent.get('/api/auth/me')).body;
      const updateRes = await gmAgent.put(`/api/characters/${createRes.body.id}`).send({
        user_id: gmInfo.id,
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.user_id).toBe(gmInfo.id);
      expect(updateRes.body.owner_username).toBe('gmBoss');
    });

    it('rejects assignment to non-existent user_id with 400', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmRoot', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmRoot', password: 'password123' });

      const res = await gmAgent.post('/api/characters').send({
        name: 'GhostChar',
        race: 'Human',
        user_id: 99999,
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/user.*exist/i);
    });

    it('prevents non-GM players from changing user_id', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmAdmin', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmAdmin', password: 'password123' });

      const p1 = (await gmAgent.post('/api/auth/register').send({ username: 'playerOne', password: 'password123' })).body;
      const p2 = (await gmAgent.post('/api/auth/register').send({ username: 'playerTwo', password: 'password123' })).body;

      const p1Agent = request.agent(app);
      await p1Agent.post('/api/auth/login').send({ username: 'playerOne', password: 'password123' });

      const char = (await p1Agent.post('/api/characters').send({ name: 'P1Char', race: 'Human' })).body;
      expect(char.user_id).toBe(p1.id);

      // Player attempts to reassign sheet to playerTwo
      const putRes = await p1Agent.put(`/api/characters/${char.id}`).send({
        user_id: p2.id,
        name: 'RenamedChar',
      });
      expect(putRes.status).toBe(200);
      expect(putRes.body.user_id).toBe(p1.id); // Must remain playerOne
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

    it('updates existing tokens character_id to NULL when deleting ship sheet', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gmShip', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gmShip', password: 'password123' });

      // Create a map
      const mapRes = await agent.post('/api/maps').send({ name: 'Space Battle', map_type: 'space' });
      const mapId = mapRes.body.id;

      // Create a ship sheet
      const shipRes = await agent.post('/api/ships').send({
        name: 'Void Raider',
        ship_type: 'Frigate',
      });
      expect(shipRes.status).toBe(201);
      const shipId = shipRes.body.id;

      // Create token linked to ship sheet
      const tokenRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        character_id: shipId,
        name: 'Void Raider Token',
      });
      expect(tokenRes.status).toBe(201);
      const tokenId = tokenRes.body.id;

      // Delete the ship sheet
      const delRes = await agent.delete(`/api/ships/${shipId}`);
      expect(delRes.status).toBe(200);

      // Verify token's character_id is now NULL
      const checkToken = db.prepare('SELECT character_id FROM tokens WHERE id = ?').get(tokenId);
      expect(checkToken.character_id).toBeNull();
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

    it('includes owner_username in ship sheet responses', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmShipUser', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmShipUser', password: 'password123' });

      const res = await gmAgent.post('/api/ships').send({ name: 'Explorer', ship_type: 'Scout' });
      expect(res.status).toBe(201);
      expect(res.body.owner_username).toBe('gmShipUser');

      const listRes = await gmAgent.get('/api/ships');
      expect(listRes.body[0].owner_username).toBe('gmShipUser');

      const getRes = await gmAgent.get(`/api/ships/${res.body.id}`);
      expect(getRes.body.owner_username).toBe('gmShipUser');
    });

    it('allows GM to assign ship to another player login on create and update', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmBossShip', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmBossShip', password: 'password123' });

      // Register player account
      const playerReg = await gmAgent.post('/api/auth/register').send({ username: 'playerShipAlice', password: 'password123' });
      const playerUser = playerReg.body;

      // GM creates ship assigned to playerShipAlice
      const createRes = await gmAgent.post('/api/ships').send({
        name: 'AliceShip',
        ship_type: 'Fighter',
        user_id: playerUser.id,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.user_id).toBe(playerUser.id);
      expect(createRes.body.owner_username).toBe('playerShipAlice');

      // GM reassigns ship back to GM
      const gmInfo = (await gmAgent.get('/api/auth/me')).body;
      const updateRes = await gmAgent.put(`/api/ships/${createRes.body.id}`).send({
        user_id: gmInfo.id,
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.user_id).toBe(gmInfo.id);
      expect(updateRes.body.owner_username).toBe('gmBossShip');
    });

    it('rejects ship assignment to non-existent user_id with 400', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmShipRoot', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmShipRoot', password: 'password123' });

      const res = await gmAgent.post('/api/ships').send({
        name: 'GhostShip',
        ship_type: 'Scout',
        user_id: 99999,
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/user.*exist/i);

      // Also on update
      const validShip = await gmAgent.post('/api/ships').send({
        name: 'RealShip',
        ship_type: 'Scout',
      });
      const updateRes = await gmAgent.put(`/api/ships/${validShip.body.id}`).send({
        user_id: 99999,
      });
      expect(updateRes.status).toBe(400);
      expect(updateRes.body.error).toMatch(/user.*exist/i);
    });

    it('prevents non-GM players from changing user_id on PUT /api/ships/:id', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmShipAdmin', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmShipAdmin', password: 'password123' });

      const p1 = (await gmAgent.post('/api/auth/register').send({ username: 'playerShipOne', password: 'password123' })).body;
      const p2 = (await gmAgent.post('/api/auth/register').send({ username: 'playerShipTwo', password: 'password123' })).body;

      const p1Agent = request.agent(app);
      await p1Agent.post('/api/auth/login').send({ username: 'playerShipOne', password: 'password123' });

      const ship = (await p1Agent.post('/api/ships').send({ name: 'P1Ship', ship_type: 'Fighter' })).body;
      expect(ship.user_id).toBe(p1.id);

      // Player attempts to reassign ship to playerShipTwo
      const putRes = await p1Agent.put(`/api/ships/${ship.id}`).send({
        user_id: p2.id,
        name: 'RenamedShip',
      });
      expect(putRes.status).toBe(200);
      expect(putRes.body.user_id).toBe(p1.id); // Must remain playerShipOne
    });

    it('enforces ownership on character and ship update/delete, clears avatar, and decouples tokens', async () => {
      // First user is GM
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmUser', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmUser', password: 'password123' });

      // GM creates player1 and player2
      await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123', role: 'Player' });
      await gmAgent.post('/api/auth/register').send({ username: 'player2', password: 'password123', role: 'Player' });

      const p1Agent = request.agent(app);
      await p1Agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const p2Agent = request.agent(app);
      await p2Agent.post('/api/auth/login').send({ username: 'player2', password: 'password123' });

      // player1 creates a character and a ship
      const p1Char = (await p1Agent.post('/api/characters').send({
        name: 'P1 Char',
        race: 'Human',
        avatar_url: '/uploads/char1.png',
      })).body;

      const p1Ship = (await p1Agent.post('/api/ships').send({
        name: 'P1 Ship',
        ship_type: 'Fighter',
        avatar_url: '/uploads/ship1.png',
      })).body;

      // player2 attempts to update player1's character (IDOR attempt) -> 403
      const badCharUpdate = await p2Agent.put(`/api/characters/${p1Char.id}`).send({ name: 'Hacked Char' });
      expect(badCharUpdate.status).toBe(403);

      // player2 attempts to delete player1's character -> 403
      const badCharDelete = await p2Agent.delete(`/api/characters/${p1Char.id}`);
      expect(badCharDelete.status).toBe(403);

      // player2 attempts to update player1's ship -> 403
      const badShipUpdate = await p2Agent.put(`/api/ships/${p1Ship.id}`).send({ name: 'Hacked Ship' });
      expect(badShipUpdate.status).toBe(403);

      // player2 attempts to delete player1's ship -> 403
      const badShipDelete = await p2Agent.delete(`/api/ships/${p1Ship.id}`);
      expect(badShipDelete.status).toBe(403);

      // player1 clears avatar URL to empty string -> should persist empty string
      const clearAvatarRes = await p1Agent.put(`/api/characters/${p1Char.id}`).send({ avatar_url: '' });
      expect(clearAvatarRes.status).toBe(200);
      expect(clearAvatarRes.body.avatar_url).toBe('');

      // Create a map and token linked to p1Char
      const mapRes = await gmAgent.post('/api/maps').send({ name: 'Battle Map', map_type: 'rpg' });
      const mapId = mapRes.body.id;
      const tokenRes = await gmAgent.post('/api/tokens').send({
        map_id: mapId,
        character_id: p1Char.id,
        name: 'P1 Token',
      });
      const tokenId = tokenRes.body.id;

      // When player1 deletes character, linked token's character_id should become NULL
      const delRes = await p1Agent.delete(`/api/characters/${p1Char.id}`);
      expect(delRes.status).toBe(200);

      const checkToken = db.prepare('SELECT character_id FROM tokens WHERE id = ?').get(tokenId);
      expect(checkToken.character_id).toBeNull();
    });

    it('rejects empty name and clamps numeric stats on PUT /api/characters/:id', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'charClampUser', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'charClampUser', password: 'password123' });

      const created = (await agent.post('/api/characters').send({
        name: 'Normal Hero',
        race: 'Human',
        str: 50,
        sta: 50,
      })).body;

      // Reject empty or whitespace-only name
      const emptyNameRes = await agent.put(`/api/characters/${created.id}`).send({ name: '   ' });
      expect(emptyNameRes.status).toBe(400);

      // Clamp stats to 1..200 (and current_sta to 0..200)
      const clampedRes = await agent.put(`/api/characters/${created.id}`).send({
        name: 'Super Hero',
        str: 999,
        sta: -50,
        current_sta: -10,
        dex: 500,
        rs: 0,
      });

      expect(clampedRes.status).toBe(200);
      expect(clampedRes.body.name).toBe('Super Hero');
      expect(clampedRes.body.str).toBe(200);
      expect(clampedRes.body.sta).toBe(1);
      expect(clampedRes.body.current_sta).toBe(0);
      expect(clampedRes.body.dex).toBe(200);
      expect(clampedRes.body.rs).toBe(1);
    });

    it('disambiguates token decoupling between characters and ships on delete', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmDelink', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmDelink', password: 'password123' });

      const rpgMap = (await gmAgent.post('/api/maps').send({ name: 'Ground Base', map_type: 'rpg' })).body;
      const spaceMap = (await gmAgent.post('/api/maps').send({ name: 'Orbit Station', map_type: 'space' })).body;

      // Create a character (e.g. ID 1) and a ship (e.g. ID 1)
      const char = (await gmAgent.post('/api/characters').send({ name: 'Captain Star', race: 'Human' })).body;
      const ship = (await gmAgent.post('/api/ships').send({ name: 'Star Cruiser', ship_type: 'Cruiser' })).body;

      // Create token for character on RPG map
      const charToken = (await gmAgent.post('/api/tokens').send({
        map_id: rpgMap.id,
        character_id: char.id,
        name: 'Captain Token',
      })).body;

      // Create token for ship on Space map
      const shipToken = (await gmAgent.post('/api/tokens').send({
        map_id: spaceMap.id,
        character_id: ship.id,
        name: 'Cruiser Token',
      })).body;

      // Delete character sheet: MUST decouple charToken on RPG map, but NOT shipToken on Space map
      await gmAgent.delete(`/api/characters/${char.id}`);

      const checkCharToken = db.prepare('SELECT character_id FROM tokens WHERE id = ?').get(charToken.id);
      const checkShipToken = db.prepare('SELECT character_id FROM tokens WHERE id = ?').get(shipToken.id);

      expect(checkCharToken.character_id).toBeNull();
      expect(checkShipToken.character_id).toBe(ship.id); // preserved!

      // Delete ship sheet: MUST decouple shipToken on Space map
      await gmAgent.delete(`/api/ships/${ship.id}`);
      const checkShipTokenAfter = db.prepare('SELECT character_id FROM tokens WHERE id = ?').get(shipToken.id);
      expect(checkShipTokenAfter.character_id).toBeNull();
    });

    it('Bug 14: clamps ship stats on POST and PUT (hull_points >= 1, adf >= 0, mr >= 0, dcr >= 0)', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'shipClamper', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'shipClamper', password: 'password123' });

      // Create with negative values
      const createRes = await gmAgent.post('/api/ship-sheets').send({
        name: 'Dreadnought Minus',
        ship_type: 'Battleship',
        hull_points: -50,
        current_hp: -20,
        adf: -5,
        mr: -3,
        dcr: -100,
      });

      expect(createRes.status).toBe(201);
      expect(createRes.body.hull_points).toBe(1); // clamped to >= 1
      expect(createRes.body.current_hp).toBe(0); // clamped to >= 0
      expect(createRes.body.adf).toBe(0); // clamped to >= 0
      expect(createRes.body.mr).toBe(0); // clamped to >= 0
      expect(createRes.body.dcr).toBe(0); // clamped to >= 0

      // Update with out-of-range values on /api/ship-sheets/:id
      const updateRes = await gmAgent.put(`/api/ship-sheets/${createRes.body.id}`).send({
        hull_points: 0,
        adf: -10,
        mr: -2,
        dcr: -5,
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.hull_points).toBe(1);
      expect(updateRes.body.adf).toBe(0);
      expect(updateRes.body.mr).toBe(0);
      expect(updateRes.body.dcr).toBe(0);
    });

    it('reorders character sheets updates sort_order, returns new order, and emits sheets:reordered', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmUser', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmUser', password: 'password123' });

      const c1 = (await gmAgent.post('/api/characters').send({ name: 'Alpha', race: 'Human' })).body;
      const c2 = (await gmAgent.post('/api/characters').send({ name: 'Beta', race: 'Vrusk' })).body;
      const c3 = (await gmAgent.post('/api/characters').send({ name: 'Gamma', race: 'Yazirian' })).body;

      const emitSpy = vi.spyOn(io, 'emit');

      // Reorder: Gamma, Alpha, Beta
      const reorderRes = await gmAgent.put('/api/characters/reorder').send({
        order: [c3.id, c1.id, c2.id],
      });

      expect(reorderRes.status).toBe(200);
      expect(reorderRes.body).toEqual({ success: true, order: [c3.id, c1.id, c2.id] });
      expect(emitSpy).toHaveBeenCalledWith('sheets:reordered', {
        type: 'character',
        order: [c3.id, c1.id, c2.id],
      });

      const listRes = await gmAgent.get('/api/characters');
      expect(listRes.status).toBe(200);
      expect(listRes.body.map(c => c.id)).toEqual([c3.id, c1.id, c2.id]);
    });

    it('rejects unauthenticated requests to reorder character sheets with 401', async () => {
      const res = await request(app).put('/api/characters/reorder').send({ order: [1, 2] });
      expect(res.status).toBe(401);
    });

    it('rejects invalid payloads on character reorder with 400', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmValidate', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmValidate', password: 'password123' });

      // Non-array
      let res = await gmAgent.put('/api/characters/reorder').send({ order: 'not-an-array' });
      expect(res.status).toBe(400);

      // Empty array
      res = await gmAgent.put('/api/characters/reorder').send({ order: [] });
      expect(res.status).toBe(400);

      // Non-numeric IDs
      res = await gmAgent.put('/api/characters/reorder').send({ order: [1, 'abc'] });
      expect(res.status).toBe(400);

      // Duplicate IDs
      res = await gmAgent.put('/api/characters/reorder').send({ order: [1, 1] });
      expect(res.status).toBe(400);
    });

    it('enforces character reorder permissions (GM allowed, non-GM forbidden)', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmAuth', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmAuth', password: 'password123' });

      const gmChar = (await gmAgent.post('/api/characters').send({ name: 'GM Char', race: 'Human' })).body;

      // GM creates playerAuth
      await gmAgent.post('/api/auth/register').send({ username: 'playerAuth', password: 'password123', role: 'Player' });

      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'playerAuth', password: 'password123' });

      const pChar1 = (await playerAgent.post('/api/characters').send({ name: 'Player Char 1', race: 'Vrusk' })).body;
      const pChar2 = (await playerAgent.post('/api/characters').send({ name: 'Player Char 2', race: 'Dralasite' })).body;

      // Player attempting to reorder receives 403 Forbidden
      const playerForbiddenRes = await playerAgent.put('/api/characters/reorder').send({
        order: [pChar2.id, pChar1.id],
      });
      expect(playerForbiddenRes.status).toBe(403);

      // GM can reorder all sheets
      const gmSuccessRes = await gmAgent.put('/api/characters/reorder').send({
        order: [pChar1.id, gmChar.id, pChar2.id],
      });
      expect(gmSuccessRes.status).toBe(200);
      expect(gmSuccessRes.body.order).toEqual([pChar1.id, gmChar.id, pChar2.id]);
    });

    it('reorders ship sheets updates sort_order, returns new order, and emits sheets:reordered', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmShipReorder', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmShipReorder', password: 'password123' });

      const s1 = (await gmAgent.post('/api/ships').send({ name: 'Ship 1', ship_type: 'Fighter' })).body;
      const s2 = (await gmAgent.post('/api/ships').send({ name: 'Ship 2', ship_type: 'Frigate' })).body;
      const s3 = (await gmAgent.post('/api/ships').send({ name: 'Ship 3', ship_type: 'Cruiser' })).body;

      const emitSpy = vi.spyOn(io, 'emit');

      // Reorder: Ship 3, Ship 1, Ship 2
      const reorderRes = await gmAgent.put('/api/ships/reorder').send({
        order: [s3.id, s1.id, s2.id],
      });

      expect(reorderRes.status).toBe(200);
      expect(reorderRes.body).toEqual({ success: true, order: [s3.id, s1.id, s2.id] });
      expect(emitSpy).toHaveBeenCalledWith('sheets:reordered', {
        type: 'ship',
        order: [s3.id, s1.id, s2.id],
      });

      const listRes = await gmAgent.get('/api/ships');
      expect(listRes.status).toBe(200);
      expect(listRes.body.map(s => s.id)).toEqual([s3.id, s1.id, s2.id]);
    });

    it('rejects unauthenticated and invalid requests on ship reorder', async () => {
      const unauthRes = await request(app).put('/api/ships/reorder').send({ order: [1, 2] });
      expect(unauthRes.status).toBe(401);

      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmShipVal', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmShipVal', password: 'password123' });

      let res = await gmAgent.put('/api/ships/reorder').send({ order: null });
      expect(res.status).toBe(400);

      res = await gmAgent.put('/api/ships/reorder').send({ order: [] });
      expect(res.status).toBe(400);

      res = await gmAgent.put('/api/ships/reorder').send({ order: ['one'] });
      expect(res.status).toBe(400);
    });

    it('enforces ship reorder permissions (GM allowed, non-GM forbidden)', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmShipPerm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmShipPerm', password: 'password123' });

      const gmShip = (await gmAgent.post('/api/ships').send({ name: 'GM Cruiser', ship_type: 'Cruiser' })).body;

      // GM creates playerShipPerm
      await gmAgent.post('/api/auth/register').send({ username: 'playerShipPerm', password: 'password123', role: 'Player' });

      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'playerShipPerm', password: 'password123' });

      const pShip1 = (await playerAgent.post('/api/ships').send({ name: 'Player Scout 1', ship_type: 'Scout' })).body;
      const pShip2 = (await playerAgent.post('/api/ships').send({ name: 'Player Scout 2', ship_type: 'Scout' })).body;

      // Player attempting to reorder receives 403 Forbidden
      const playerForbiddenRes = await playerAgent.put('/api/ships/reorder').send({
        order: [pShip2.id, pShip1.id],
      });
      expect(playerForbiddenRes.status).toBe(403);

      // GM reordering all ships
      const gmSuccessRes = await gmAgent.put('/api/ships/reorder').send({
        order: [pShip1.id, gmShip.id, pShip2.id],
      });
      expect(gmSuccessRes.status).toBe(200);
      expect(gmSuccessRes.body.order).toEqual([pShip1.id, gmShip.id, pShip2.id]);
    });
  });
});

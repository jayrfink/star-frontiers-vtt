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
  });
});

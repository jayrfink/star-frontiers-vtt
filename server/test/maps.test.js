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

    it('defaults, updates, and clamps grid_line_width', async () => {
      const gm = request.agent(app);
      await gm.post('/api/auth/register').send({ username: 'gm_lw', password: 'password123' });
      await gm.post('/api/auth/login').send({ username: 'gm_lw', password: 'password123' });

      const created = await gm.post('/api/maps').send({ name: 'Thin Lines' });
      expect(created.status).toBe(201);
      expect(created.body.grid_line_width).toBe(1);

      const thin = await gm.put(`/api/maps/${created.body.id}`).send({ grid_line_width: 0.25 });
      expect(thin.body.grid_line_width).toBe(0.25);

      const tooBig = await gm.put(`/api/maps/${created.body.id}`).send({ grid_line_width: 99 });
      expect(tooBig.body.grid_line_width).toBe(10);

      const invalid = await gm.put(`/api/maps/${created.body.id}`).send({ grid_line_width: -3 });
      expect(invalid.body.grid_line_width).toBe(10); // invalid input keeps existing value
    });

    it('defaults grid_visible to true and allows toggling it', async () => {
      const gm = request.agent(app);
      await gm.post('/api/auth/register').send({ username: 'gm_gv', password: 'password123' });
      await gm.post('/api/auth/login').send({ username: 'gm_gv', password: 'password123' });

      const created = await gm.post('/api/maps').send({ name: 'Hidden Grid' });
      expect(created.body.grid_visible).toBe(true);

      const hidden = await gm.put(`/api/maps/${created.body.id}`).send({ grid_visible: false });
      expect(hidden.body.grid_visible).toBe(false);

      const untouched = await gm.put(`/api/maps/${created.body.id}`).send({ grid_color: '#ffffff' });
      expect(untouched.body.grid_visible).toBe(false);

      const shown = await gm.put(`/api/maps/${created.body.id}`).send({ grid_visible: true });
      expect(shown.body.grid_visible).toBe(true);
    });

    it('creates map (GM only) and emits map:created', async () => {
      const gmAgent = request.agent(app);
      // First user registered becomes GameMaster
      await gmAgent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      const playerAgent = request.agent(app);
      // Second user registered becomes Player (registered by GM)
      await gmAgent.post('/api/auth/register').send({ username: 'player_user', password: 'password123' });
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

    it('supports independent active maps and filtering for rpg and space map types', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm_user', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_user', password: 'password123' });

      // Create RPG map 1 and 2
      const rpg1 = await gmAgent.post('/api/maps').send({ name: 'RPG Map 1', map_type: 'rpg', is_active: 1 });
      const rpg2 = await gmAgent.post('/api/maps').send({ name: 'RPG Map 2', map_type: 'rpg', is_active: 0 });

      // Create Space map 1 and 2
      const space1 = await gmAgent.post('/api/maps').send({ name: 'Space Map 1', map_type: 'space', is_active: 1 });
      const space2 = await gmAgent.post('/api/maps').send({ name: 'Space Map 2', map_type: 'space', is_active: 0 });

      // Check active maps
      const activeRpg = await gmAgent.get('/api/maps/active?type=rpg');
      expect(activeRpg.body.map.id).toBe(rpg1.body.id);

      const activeSpace = await gmAgent.get('/api/maps/active?type=space');
      expect(activeSpace.body.map.id).toBe(space1.body.id);

      // Activate Space Map 2
      await gmAgent.post(`/api/maps/${space2.body.id}/activate`);

      // RPG Map 1 should STILL be active!
      const activeRpgAfter = await gmAgent.get('/api/maps/active?type=rpg');
      expect(activeRpgAfter.body.map.id).toBe(rpg1.body.id);

      // Space Map 2 should now be active!
      const activeSpaceAfter = await gmAgent.get('/api/maps/active?type=space');
      expect(activeSpaceAfter.body.map.id).toBe(space2.body.id);

      // Verify filtering GET /api/maps?type=rpg and GET /api/maps?type=space
      const rpgList = await gmAgent.get('/api/maps?type=rpg');
      expect(rpgList.body.every(m => m.map_type === 'rpg')).toBe(true);
      expect(rpgList.body.length).toBe(2);

      const spaceList = await gmAgent.get('/api/maps?type=space');
      expect(spaceList.body.every(m => m.map_type === 'space')).toBe(true);
      expect(spaceList.body.length).toBe(2);
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
      expect(createRes.body.color).toBe('#666666');
      const tokenId = createRes.body.id;

      const emitSpy = vi.spyOn(io, 'emit');

      const updateRes = await agent.put(`/api/tokens/${tokenId}`).send({
        x: 3,
        y: 4,
        current_hp: 25,
        color: '#123456',
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.x).toBe(3);
      expect(updateRes.body.y).toBe(4);
      expect(updateRes.body.color).toBe('#123456');

      expect(emitSpy).toHaveBeenCalledWith('token:moved', expect.objectContaining({
        token: expect.objectContaining({ id: tokenId, x: 3, y: 4 }),
      }));
      expect(emitSpy).toHaveBeenCalledWith('token:updated', expect.objectContaining({
        token: expect.objectContaining({ id: tokenId, current_hp: 25, color: '#123456' }),
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

    it('creates and persists celestial token with layer: "celestial"', async () => {
      const createRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Centurian Moon',
        layer: 'celestial',
        size: 1,
        color: '',
        rotation: 0,
        current_speed: null,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.layer).toBe('celestial');
      expect(createRes.body.name).toBe('Centurian Moon');
      expect(createRes.body.size).toBe(1);

      const fetchRes = await agent.get(`/api/tokens/${createRes.body.id}`);
      expect(fetchRes.status).toBe(200);
      expect(fetchRes.body.layer).toBe('celestial');
    });

    it('returns 400 when missing required fields on token creation', async () => {
      const res = await agent.post('/api/tokens').send({
        color: '#00ff00',
      });
      expect(res.status).toBe(400);
    });

    it('enforces token permissions and formats templates on map activation', async () => {
      // agent is already logged in as gm_user from beforeEach
      // Register a player account using agent (GM)
      await agent.post('/api/auth/register').send({ username: 'playerTok', password: 'password123', role: 'Player' });
      const pAgent = request.agent(app);
      await pAgent.post('/api/auth/login').send({ username: 'playerTok', password: 'password123' });

      // Player creates a character
      const charRes = await pAgent.post('/api/characters').send({ name: 'My Hero', race: 'Human' });
      expect(charRes.status).toBe(201);
      const charId = charRes.body.id;

      // GM creates a map
      const mapRes = await agent.post('/api/maps').send({ name: 'Active Battle', map_type: 'rpg' });
      const activeMapId = mapRes.body.id;

      // Player creates token for their own character -> allowed
      const pTokenRes = await pAgent.post('/api/tokens').send({
        map_id: activeMapId,
        character_id: charId,
        name: 'My Hero Token',
        x: -5000,
        y: 50000,
      });
      expect(pTokenRes.status).toBe(201);
      expect(pTokenRes.body.x).toBe(-1000); // clamped
      expect(pTokenRes.body.y).toBe(10000); // clamped
      const pTokenId = pTokenRes.body.id;

      // GM creates an NPC token
      const npcRes = await agent.post('/api/tokens').send({
        map_id: activeMapId,
        name: 'Sathar Spy',
      });
      const npcId = npcRes.body.id;

      // Player attempts to delete or update GM's NPC token -> 403
      const badPut = await pAgent.put(`/api/tokens/${npcId}`).send({ name: 'Hacked NPC' });
      expect(badPut.status).toBe(403);

      const badDel = await pAgent.delete(`/api/tokens/${npcId}`);
      expect(badDel.status).toBe(403);

      // Player CAN update their own token
      const goodPut = await pAgent.put(`/api/tokens/${pTokenId}`).send({ name: 'My Hero Renamed' });
      expect(goodPut.status).toBe(200);
      expect(goodPut.body.name).toBe('My Hero Renamed');

      // Create adversary template and add 2 adversary tokens
      db.prepare(`
        INSERT INTO adversary_templates (id, name, category, threat_tier, hp_max)
        VALUES ('tpl_test', 'Sathar Trooper', 'npc', 2, 45)
      `).run();

      await agent.post('/api/tokens').send({
        map_id: activeMapId,
        template_id: 'tpl_test',
        name: 'Sathar 1',
      });
      await agent.post('/api/tokens').send({
        map_id: activeMapId,
        template_id: 'tpl_test',
        name: 'Sathar 2',
      });

      // Activate map and ensure all tokens have template populated (Bug 2.1)
      const activateRes = await agent.post(`/api/maps/${activeMapId}/activate`);
      expect(activateRes.status).toBe(200);
      const advTokens = activateRes.body.tokens.filter(t => t.template_id === 'tpl_test');
      expect(advTokens.length).toBe(2);
      expect(advTokens[0].template).toBeDefined();
      expect(advTokens[0].template.name).toBe('Sathar Trooper');
      expect(advTokens[1].template).toBeDefined();
      expect(advTokens[1].template.name).toBe('Sathar Trooper');
    });

    it('enforces single active map when updated via PUT /api/maps/:id', async () => {
      // agent is already logged in as gm_user from beforeEach
      const mapA = (await agent.post('/api/maps').send({ name: 'Map A', map_type: 'rpg', is_active: 1 })).body;
      const mapB = (await agent.post('/api/maps').send({ name: 'Map B', map_type: 'rpg', is_active: 0 })).body;

      // PUT map B with is_active: 1
      const updateB = await agent.put(`/api/maps/${mapB.id}`).send({ is_active: 1 });
      expect(updateB.status).toBe(200);

      const checkA = db.prepare('SELECT is_active FROM maps WHERE id = ?').get(mapA.id);
      const checkB = db.prepare('SELECT is_active FROM maps WHERE id = ?').get(mapB.id);
      expect(checkA.is_active).toBe(0);
      expect(checkB.is_active).toBe(1);
    });

    it('prevents non-GM players from modifying map_id, template_id, layer, and vehicle_data on PUT /api/tokens/:id', async () => {
      // 1. Create a player user and character
      await agent.post('/api/auth/register').send({ username: 'playerMap', password: 'password123', role: 'Player' });
      const pAgent = request.agent(app);
      await pAgent.post('/api/auth/login').send({ username: 'playerMap', password: 'password123' });

      const charRes = await pAgent.post('/api/characters').send({
        name: 'Player Ranger',
        race: 'Yazirian',
        sta: 40,
        psa: 'Military',
      });
      const charId = charRes.body.id;

      const mapRes = await agent.post('/api/maps').send({ name: 'Arena 1', map_type: 'rpg', is_active: 1 });
      const mapRes2 = await agent.post('/api/maps').send({ name: 'Arena 2', map_type: 'rpg', is_active: 0 });

      // Player creates their token on map 1
      const tokenRes = await pAgent.post('/api/tokens').send({
        map_id: mapRes.body.id,
        character_id: charId,
        name: 'Ranger Token',
        layer: 'character',
        x: 10,
        y: 20,
        current_hp: 40,
      });
      const tokenId = tokenRes.body.id;

      // Player attempts to update restricted fields (map_id, template_id, layer, vehicle_data)
      const attackRes = await pAgent.put(`/api/tokens/${tokenId}`).send({
        map_id: mapRes2.body.id,
        template_id: 'secret-sathar',
        layer: 'gm_hidden',
        vehicle_data: { speed: 100 },
        // Permitted fields
        x: 50,
        y: 60,
        rotation: 90,
        color: '#ff0000',
        avatar_url: '/uploads/new-avatar.png',
        current_hp: 35,
      });

      expect(attackRes.status).toBe(200);
      expect(attackRes.body.map_id).toBe(mapRes.body.id); // Not modified!
      expect(attackRes.body.template_id).toBeNull(); // Not modified!
      expect(attackRes.body.layer).toBe('character'); // Not modified!
      expect(attackRes.body.vehicle_data).toBeNull(); // Not modified!

      // Permitted fields WERE updated
      expect(attackRes.body.x).toBe(50);
      expect(attackRes.body.y).toBe(60);
      expect(attackRes.body.rotation).toBe(90);
      expect(attackRes.body.color).toBe('#ff0000');
      expect(attackRes.body.avatar_url).toBe('/uploads/new-avatar.png');
      expect(attackRes.body.current_hp).toBe(35);
    });

    it('safely handles null status_effects and conditions on PUT /api/tokens/:id without crashing', async () => {
      const mapRes = await agent.post('/api/maps').send({ name: 'Arena Null Test', map_type: 'rpg', is_active: 1 });
      const tokenRes = await agent.post('/api/tokens').send({
        map_id: mapRes.body.id,
        name: 'Null Test Token',
        x: 10,
        y: 10,
        status_effects: ['Poisoned'],
        conditions: ['Stunned'],
      });
      const tokenId = tokenRes.body.id;

      const nullUpdateRes = await agent.put(`/api/tokens/${tokenId}`).send({
        status_effects: null,
        conditions: null,
      });

      expect(nullUpdateRes.status).toBe(200);
      expect(Array.isArray(nullUpdateRes.body.status_effects)).toBe(true);
      expect(Array.isArray(nullUpdateRes.body.conditions)).toBe(true);
    });

    it('allows non-GM player to create and update/move a token linked to their ship sheet on a space map', async () => {
      // GM creates a space map
      const spaceMapRes = await agent.post('/api/maps').send({ name: 'Deep Space', map_type: 'space', is_active: 1 });
      const spaceMapId = spaceMapRes.body.id;

      // GM creates a player
      await agent.post('/api/auth/register').send({ username: 'pilot1', password: 'password123', role: 'Player' });
      const pilotAgent = request.agent(app);
      await pilotAgent.post('/api/auth/login').send({ username: 'pilot1', password: 'password123' });

      // Player creates a ship sheet
      const shipRes = await pilotAgent.post('/api/ships').send({
        name: 'Starlance',
        ship_type: 'Fighter',
        hull_points: 40,
        current_hp: 40,
      });
      expect(shipRes.status).toBe(201);
      const shipId = shipRes.body.id;

      // Non-GM player can create a token linked to their ship sheet on a space map
      const tokenRes = await pilotAgent.post('/api/tokens').send({
        map_id: spaceMapId,
        character_id: shipId,
        name: 'Starlance Token',
        x: 10,
        y: 20,
      });
      expect(tokenRes.status).toBe(201);
      expect(tokenRes.body.character_id).toBe(shipId);
      expect(tokenRes.body.name).toBe('Starlance Token');
      const tokenId = tokenRes.body.id;

      // Non-GM player can update/move their ship token
      const moveRes = await pilotAgent.put(`/api/tokens/${tokenId}`).send({
        x: 15,
        y: 25,
        rotation: 90,
      });
      expect(moveRes.status).toBe(200);
      expect(moveRes.body.x).toBe(15);
      expect(moveRes.body.y).toBe(25);
      expect(moveRes.body.rotation).toBe(90);
    });

    it('prevents non-GM player from creating or updating a token linked to another user\'s ship sheet (returns 403)', async () => {
      // GM creates a space map
      const spaceMapRes = await agent.post('/api/maps').send({ name: 'Space Arena', map_type: 'space', is_active: 1 });
      const spaceMapId = spaceMapRes.body.id;

      // GM creates two players
      await agent.post('/api/auth/register').send({ username: 'pilotAlpha', password: 'password123', role: 'Player' });
      await agent.post('/api/auth/register').send({ username: 'pilotBeta', password: 'password123', role: 'Player' });

      const alphaAgent = request.agent(app);
      await alphaAgent.post('/api/auth/login').send({ username: 'pilotAlpha', password: 'password123' });

      const betaAgent = request.agent(app);
      await betaAgent.post('/api/auth/login').send({ username: 'pilotBeta', password: 'password123' });

      // pilotAlpha creates a ship sheet
      const alphaShipRes = await alphaAgent.post('/api/ships').send({
        name: 'Alpha Cruiser',
        ship_type: 'Cruiser',
      });
      const alphaShipId = alphaShipRes.body.id;

      // pilotAlpha creates their own token
      const alphaTokenRes = await alphaAgent.post('/api/tokens').send({
        map_id: spaceMapId,
        character_id: alphaShipId,
        name: 'Alpha Cruiser Token',
      });
      expect(alphaTokenRes.status).toBe(201);
      const alphaTokenId = alphaTokenRes.body.id;

      // pilotBeta cannot create a token linked to pilotAlpha's ship sheet (returns 403)
      const badCreate = await betaAgent.post('/api/tokens').send({
        map_id: spaceMapId,
        character_id: alphaShipId,
        name: 'Hijacked Token',
      });
      expect(badCreate.status).toBe(403);
      expect(badCreate.body.error).toBe('You do not own this character or ship');

      // pilotBeta cannot update pilotAlpha's token (returns 403)
      const badUpdate = await betaAgent.put(`/api/tokens/${alphaTokenId}`).send({
        x: 100,
        y: 100,
      });
      expect(badUpdate.status).toBe(403);
      expect(badUpdate.body.error).toBe('Access denied');
    });

    it('disambiguates character_id between character_sheets and ship_sheets based on map_type', async () => {
      // GM sets up an RPG map and a Space map
      const rpgMap = (await agent.post('/api/maps').send({ name: 'RPG Map', map_type: 'rpg', is_active: 1 })).body;
      const spaceMap = (await agent.post('/api/maps').send({ name: 'Space Map', map_type: 'space', is_active: 1 })).body;

      // Register Player 1 and Player 2
      await agent.post('/api/auth/register').send({ username: 'charOwner', password: 'password123', role: 'Player' });
      await agent.post('/api/auth/register').send({ username: 'shipOwner', password: 'password123', role: 'Player' });

      const charAgent = request.agent(app);
      await charAgent.post('/api/auth/login').send({ username: 'charOwner', password: 'password123' });

      const shipAgent = request.agent(app);
      await shipAgent.post('/api/auth/login').send({ username: 'shipOwner', password: 'password123' });

      // Player 1 creates Character (let's say id = 1)
      const charRes = await charAgent.post('/api/characters').send({ name: 'Hero Wilks', race: 'Human' });
      const charId = charRes.body.id;

      // Player 2 creates Ship (id might also be 1 in ship_sheets!)
      const shipRes = await shipAgent.post('/api/ships').send({ name: 'Star Arrow', ship_type: 'Scout' });
      const shipId = shipRes.body.id;

      // Ensure both have the same numeric id if possible, or verify map-type checks
      // charOwner tries to create token on Space Map using charId -> fails with 403 because Space maps check ship_sheets!
      const charOnSpace = await charAgent.post('/api/tokens').send({
        map_id: spaceMap.id,
        character_id: charId,
        name: 'Wilks in Space',
      });
      expect(charOnSpace.status).toBe(403);

      // shipOwner tries to create token on RPG Map using shipId -> fails with 403 because RPG maps check character_sheets!
      const shipOnRpg = await shipAgent.post('/api/tokens').send({
        map_id: rpgMap.id,
        character_id: shipId,
        name: 'Ship on Ground',
      });
      expect(shipOnRpg.status).toBe(403);

      // Legitimate creations: charOwner on RPG map, shipOwner on Space map
      const validRpgToken = await charAgent.post('/api/tokens').send({
        map_id: rpgMap.id,
        character_id: charId,
        name: 'Wilks Ground',
      });
      expect(validRpgToken.status).toBe(201);

      const validSpaceToken = await shipAgent.post('/api/tokens').send({
        map_id: spaceMap.id,
        character_id: shipId,
        name: 'Star Arrow Flight',
      });
      expect(validSpaceToken.status).toBe(201);

      // Cross-entity permission check on PUT
      // shipOwner cannot update validRpgToken
      const badPutRpg = await shipAgent.put(`/api/tokens/${validRpgToken.body.id}`).send({ x: 50 });
      expect(badPutRpg.status).toBe(403);

      // charOwner cannot update validSpaceToken
      const badPutSpace = await charAgent.put(`/api/tokens/${validSpaceToken.body.id}`).send({ x: 50 });
      expect(badPutSpace.status).toBe(403);
    });

    it('emits map:activated with tokens when PUT /api/maps/:id activates a map', async () => {
      const mapRes = await agent.post('/api/maps').send({ name: 'Dormant Map', map_type: 'rpg', is_active: 0 });
      const tokenRes = await agent.post('/api/tokens').send({
        map_id: mapRes.body.id,
        name: 'Stationary Sentry',
      });

      const emitSpy = vi.spyOn(io, 'emit');

      const putRes = await agent.put(`/api/maps/${mapRes.body.id}`).send({ is_active: 1 });
      expect(putRes.status).toBe(200);

      expect(emitSpy).toHaveBeenCalledWith('map:activated', expect.objectContaining({
        map: expect.objectContaining({ id: mapRes.body.id, is_active: 1 }),
        tokens: expect.arrayContaining([
          expect.objectContaining({ id: tokenRes.body.id, name: 'Stationary Sentry' }),
        ]),
      }));
    });

    it('allows non-GM token owners to update their own current_speed and seu_current, while clamping size (1..10) and rotation (0..359)', async () => {
      await agent.post('/api/auth/register').send({ username: 'pilotSpeed', password: 'password123', role: 'Player' });
      const pAgent = request.agent(app);
      await pAgent.post('/api/auth/login').send({ username: 'pilotSpeed', password: 'password123' });

      const ship = (await pAgent.post('/api/ships').send({ name: 'Speedster', ship_type: 'Fighter' })).body;
      const spaceMap = (await agent.post('/api/maps').send({ name: 'Void Track', map_type: 'space', is_active: 1 })).body;

      // Token creation with negative rotation and out-of-range size
      const token = (await pAgent.post('/api/tokens').send({
        map_id: spaceMap.id,
        character_id: ship.id,
        name: 'Speedster Token',
        size: 99,
        rotation: -45,
        current_speed: 10,
        seu_current: 50,
      })).body;

      expect(token.size).toBe(10); // clamped to 10
      expect(token.rotation).toBe(315); // -45 mod 360 -> 315
      expect(token.current_speed).toBe(10);
      expect(token.seu_current).toBe(50);

      // Player updates current_speed and seu_current, and provides rotation 450
      const updated = (await pAgent.put(`/api/tokens/${token.id}`).send({
        current_speed: 25,
        seu_current: 40,
        rotation: 450,
      })).body;

      expect(updated.current_speed).toBe(25);
      expect(updated.seu_current).toBe(40);
      expect(updated.rotation).toBe(90); // 450 % 360 = 90
    });

    it('Bug 5 & 6: GM-layer filtering, socket scoping, and player layer enforcement', async () => {
      // 1. GM creates map and GM token
      const mapRes = await agent.post('/api/maps').send({ name: 'Secret Map' });
      const mapId = mapRes.body.id;

      const gmRoomEmitSpy = vi.fn();
      const globalEmitSpy = vi.spyOn(io, 'emit');
      vi.spyOn(io, 'to').mockImplementation((room) => {
        if (room === 'role:GameMaster') {
          return { emit: gmRoomEmitSpy };
        }
        return io;
      });

      // GM creates gm layer token
      const gmTokenRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Hidden Ambush',
        layer: 'gm',
        x: 10,
        y: 10,
      });
      expect(gmTokenRes.status).toBe(201);
      expect(gmTokenRes.body.layer).toBe('gm');
      expect(gmRoomEmitSpy).toHaveBeenCalledWith('token:created', expect.objectContaining({ token: expect.objectContaining({ layer: 'gm' }) }));

      // GM creates character layer token
      const charTokenRes = await agent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Visible Guard',
        layer: 'character',
        x: 20,
        y: 20,
      });
      expect(charTokenRes.status).toBe(201);
      expect(globalEmitSpy).toHaveBeenCalledWith('token:created', expect.objectContaining({ token: expect.objectContaining({ layer: 'character' }) }));

      // 2. Create player
      await agent.post('/api/auth/register').send({ username: 'stealthPlayer', password: 'password123', role: 'Player' });
      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'stealthPlayer', password: 'password123' });

      // Player GET /api/tokens should only see character layer token
      const tokensListRes = await playerAgent.get(`/api/tokens?map_id=${mapId}`);
      expect(tokensListRes.status).toBe(200);
      expect(tokensListRes.body.some((t) => t.id === gmTokenRes.body.id)).toBe(false);
      expect(tokensListRes.body.some((t) => t.id === charTokenRes.body.id)).toBe(true);

      // Player GET /api/maps/:id should filter out gm token
      const mapFetchRes = await playerAgent.get(`/api/maps/${mapId}`);
      expect(mapFetchRes.status).toBe(200);
      expect(mapFetchRes.body.tokens.some((t) => t.id === gmTokenRes.body.id)).toBe(false);
      expect(mapFetchRes.body.tokens.some((t) => t.id === charTokenRes.body.id)).toBe(true);

      // Player GET /api/tokens/:id on gm token returns 404
      const tokenDirectRes = await playerAgent.get(`/api/tokens/${gmTokenRes.body.id}`);
      expect(tokenDirectRes.status).toBe(404);

      // GM can see GM tokens
      const gmTokensListRes = await agent.get(`/api/tokens?map_id=${mapId}`);
      expect(gmTokensListRes.body.some((t) => t.id === gmTokenRes.body.id)).toBe(true);

      // Bug 6: Player attempting to create token with layer: 'gm' or 'adversary' is enforced to 'character'
      const charSheet = (await playerAgent.post('/api/characters').send({ name: 'Sneaky PC', race: 'Human' })).body;
      const playerTokRes = await playerAgent.post('/api/tokens').send({
        map_id: mapId,
        character_id: charSheet.id,
        name: 'Hacked Token',
        layer: 'gm',
      });
      expect(playerTokRes.status).toBe(201);
      expect(playerTokRes.body.layer).toBe('character');

      // GM updating/moving gm token emits only to role:GameMaster
      gmRoomEmitSpy.mockClear();
      await agent.put(`/api/tokens/${gmTokenRes.body.id}`).send({ x: 15, y: 15 });
      expect(gmRoomEmitSpy).toHaveBeenCalledWith('token:moved', expect.anything());
      expect(gmRoomEmitSpy).toHaveBeenCalledWith('token:updated', expect.anything());

      // GM deleting gm token emits only to role:GameMaster
      gmRoomEmitSpy.mockClear();
      await agent.delete(`/api/tokens/${gmTokenRes.body.id}`);
      expect(gmRoomEmitSpy).toHaveBeenCalledWith('token:deleted', { id: gmTokenRes.body.id });
    });

    it('Bug 15 & 37: clamps map dimensions and validates hex colors', async () => {
      // Bug 15: Map width/height clamped (5..250), grid_size (10..200)
      const clampedMapRes = await agent.post('/api/maps').send({
        name: 'Bounds Map',
        width: 1000,
        height: 1,
        grid_size: 999,
        grid_color: '#112233',
      });
      expect(clampedMapRes.status).toBe(201);
      expect(clampedMapRes.body.width).toBe(250);
      expect(clampedMapRes.body.height).toBe(5);
      expect(clampedMapRes.body.grid_size).toBe(200);
      expect(clampedMapRes.body.grid_color).toBe('#112233');

      // Clamped on PUT as well
      const updatedMapRes = await agent.put(`/api/maps/${clampedMapRes.body.id}`).send({
        width: 2,
        height: 500,
        grid_size: 5,
      });
      expect(updatedMapRes.status).toBe(200);
      expect(updatedMapRes.body.width).toBe(5);
      expect(updatedMapRes.body.height).toBe(250);
      expect(updatedMapRes.body.grid_size).toBe(10);

      // Bug 37: Hex color validation
      // Invalid grid_color on POST returns 400
      const badColorPost = await agent.post('/api/maps').send({
        name: 'Bad Color Map',
        grid_color: 'invalid-red',
      });
      expect(badColorPost.status).toBe(400);

      // Invalid grid_color on PUT returns 400
      const badColorPut = await agent.put(`/api/maps/${clampedMapRes.body.id}`).send({
        grid_color: '#nothex',
      });
      expect(badColorPut.status).toBe(400);

      // Invalid token color on POST returns 400
      const badTokColorPost = await agent.post('/api/tokens').send({
        map_id: clampedMapRes.body.id,
        name: 'Bad Color Token',
        color: 'blue;',
      });
      expect(badTokColorPost.status).toBe(400);

      // Valid 3-char and 6-char hex color accepted
      const validTok = await agent.post('/api/tokens').send({
        map_id: clampedMapRes.body.id,
        name: 'Valid Color Token',
        color: '#abc',
      });
      expect(validTok.status).toBe(201);
      expect(validTok.body.color).toBe('#abc');

      // Invalid token color on PUT returns 400
      const badTokColorPut = await agent.put(`/api/tokens/${validTok.body.id}`).send({
        color: '#1234567',
      });
      expect(badTokColorPut.status).toBe(400);
    });
  });
});

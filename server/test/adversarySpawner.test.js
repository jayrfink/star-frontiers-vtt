import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';
import { generateNpcStats } from '../src/adversaryMathEngine.js';
import { spawnAdversaries } from '../src/adversarySpawner.js';

describe('Adversary Database Storage, REST API & Spawner', () => {
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

  describe('adversary_templates table and token migration', () => {
    it('creates adversary_templates table and extends tokens columns', () => {
      const templateCols = db.prepare('PRAGMA table_info(adversary_templates)').all().map(c => c.name);
      expect(templateCols).toContain('id');
      expect(templateCols).toContain('threat_tier');
      expect(templateCols).toContain('actions');
      expect(templateCols).toContain('system_data');

      const tokenCols = db.prepare('PRAGMA table_info(tokens)').all().map(c => c.name);
      expect(tokenCols).toContain('template_id');
      expect(tokenCols).toContain('conditions');
      expect(tokenCols).toContain('seu_current');
    });
  });

  describe('Adversaries REST Router (/api/adversaries)', () => {
    it('creates, lists, and retrieves adversary templates', async () => {
      const gm = request.agent(app);
      await gm.post('/api/auth/register').send({ username: 'gm_adv', password: 'password123' });
      await gm.post('/api/auth/login').send({ username: 'gm_adv', password: 'password123' });

      const template = generateNpcStats(2, {
        name: 'Sathar Boarding Trooper',
        race: 'Sathar',
        weapon: 'Laser Rifle',
      });

      const postRes = await gm.post('/api/adversaries').send(template);
      expect(postRes.status).toBe(201);
      expect(postRes.body.template_id).toBe(template.template_id);
      expect(postRes.body.threat_tier).toBe(2);

      const listRes = await gm.get('/api/adversaries');
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].template_id).toBe(template.template_id);

      const getRes = await gm.get(`/api/adversaries/${template.template_id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.name).toBe('Sathar Boarding Trooper');
      expect(getRes.body.actions[0].name).toBe('Laser Rifle');
    });
  });

  describe('Adversary Spawner & Scene State Injection', () => {
    it('spawns N numbered tokens at non-overlapping coordinates without clobbering existing tokens', async () => {
      // 1. Create a user and map
      db.prepare(`
        INSERT INTO users (username, password_hash, role)
        VALUES ('gm_test', 'hash123', 'GameMaster')
      `).run();

      const mapRes = db.prepare(`
        INSERT INTO maps (user_id, name, map_type, width, height, is_active)
        VALUES (1, 'Starship Corridors', 'rpg', 20, 20, 1)
      `).run();
      const mapId = mapRes.lastInsertRowid;

      // 2. Put an existing token on the map at (10, 10)
      db.prepare(`
        INSERT INTO tokens (map_id, name, x, y, size)
        VALUES (?, 'Existing Hero', 10, 10, 1)
      `).run(mapId);

      const template = generateNpcStats(2, {
        name: 'Sathar Shock Trooper',
        race: 'Sathar',
      });

      // 3. Spawn 3 Sathar Shock Troopers
      const spawnResult = await spawnAdversaries({
        db,
        io,
        mapId,
        template,
        count: 3,
      });

      expect(spawnResult.tokens.length).toBe(3);
      expect(spawnResult.tokens[0].name).toBe('Sathar Shock Trooper #1');
      expect(spawnResult.tokens[1].name).toBe('Sathar Shock Trooper #2');
      expect(spawnResult.tokens[2].name).toBe('Sathar Shock Trooper #3');

      // Verify none of the spawned tokens clobbered the existing token at (10, 10)
      for (const t of spawnResult.tokens) {
        expect(t.template_id).toBe(template.template_id);
        expect(t.current_hp).toBe(50);
        expect(t.max_hp).toBe(50);
        expect(t.seu_current).toBe(50);
        expect(t.x !== 10 || t.y !== 10).toBe(true);
      }

      // Check all coordinates are distinct
      const coords = spawnResult.tokens.map(t => `${t.x},${t.y}`);
      const uniqueCoords = new Set(coords);
      expect(uniqueCoords.size).toBe(3);

      // Verify tokens table total: 1 existing + 3 spawned = 4
      const allTokens = db.prepare('SELECT * FROM tokens WHERE map_id = ?').all(mapId);
      expect(allTokens.length).toBe(4);
    });

    it('clusters spawned tokens in a spiral around map center on asymmetric maps without falling back to (0,0)', async () => {
      db.prepare(`
        INSERT INTO users (username, password_hash, role)
        VALUES ('gm_asymm', 'hash123', 'GameMaster')
      `).run();

      const mapRes = db.prepare(`
        INSERT INTO maps (user_id, name, map_type, width, height, is_active)
        VALUES (1, 'Wide Corridor', 'rpg', 30, 16, 1)
      `).run();
      const mapId = mapRes.lastInsertRowid;

      const template = generateNpcStats(1, {
        name: 'Pirate Scout',
        race: 'Human',
      });

      // Center of 30x16 is (15, 8)
      const centerX = Math.floor(30 / 2); // 15
      const centerY = Math.floor(16 / 2); // 8

      const spawnResult = await spawnAdversaries({
        db,
        io,
        mapId,
        template,
        count: 5,
      });

      expect(spawnResult.tokens.length).toBe(5);

      // Verify none of the tokens were dumped at top-left (0,0) or (1,0) via fallback
      // All 5 tokens should be clustered tightly within distance <= 3 of center (15, 8)
      for (const t of spawnResult.tokens) {
        expect(t.x).toBeGreaterThan(0);
        expect(t.y).toBeGreaterThan(0);
        const dist = Math.max(Math.abs(t.x - centerX), Math.abs(t.y - centerY));
        expect(dist).toBeLessThanOrEqual(3);
      }
    });

    it('spawns multi-cell tokens (size > 1) without overlapping cells or exceeding map bounds', async () => {
      db.prepare(`
        INSERT INTO users (username, password_hash, role)
        VALUES ('gm_large', 'hash123', 'GameMaster')
      `).run();

      const mapRes = db.prepare(`
        INSERT INTO maps (user_id, name, map_type, width, height, is_active)
        VALUES (1, 'Volturnus Desert', 'rpg', 20, 20, 1)
      `).run();
      const mapId = mapRes.lastInsertRowid;

      const largeCreatureTemplate = {
        template_id: 'sand_shark_large',
        name: 'Sand Shark',
        category: 'creature',
        threat_tier: 3,
        token_size: 2,
        hp_max: 90,
        defense_summary: 'Thick Hide (10)',
        movement: '15 m/s',
        initiative_mod: 2,
        actions: [],
        traits: ['Burrowing'],
        system_data: {},
      };

      const spawnResult = await spawnAdversaries({
        db,
        io,
        mapId,
        template: largeCreatureTemplate,
        count: 4,
      });

      expect(spawnResult.tokens.length).toBe(4);

      // Verify all tokens have size 2 and stay fully within map bounds
      for (const t of spawnResult.tokens) {
        expect(t.size).toBe(2);
        expect(t.x).toBeGreaterThanOrEqual(0);
        expect(t.y).toBeGreaterThanOrEqual(0);
        expect(t.x + t.size).toBeLessThanOrEqual(20);
        expect(t.y + t.size).toBeLessThanOrEqual(20);
      }

      // Collect all occupied cells across all 4 tokens (each occupies 2x2 = 4 cells)
      const occupiedCells = new Set();
      for (const t of spawnResult.tokens) {
        for (let dx = 0; dx < t.size; dx++) {
          for (let dy = 0; dy < t.size; dy++) {
            const cellKey = `${t.x + dx},${t.y + dy}`;
            expect(occupiedCells.has(cellKey)).toBe(false); // No overlap!
            occupiedCells.add(cellKey);
          }
        }
      }

      // 4 tokens * 4 cells each = 16 unique cells
      expect(occupiedCells.size).toBe(16);
    });

    it('Bug 7: emits token:created to role:GameMaster when token.layer === "gm"', async () => {
      db.prepare(`
        INSERT INTO users (username, password_hash, role)
        VALUES ('gm_test_layer', 'hash123', 'GameMaster')
      `).run();

      const mapRes = db.prepare(`
        INSERT INTO maps (user_id, name, map_type, width, height, is_active)
        VALUES (1, 'Shadow Base', 'rpg', 20, 20, 1)
      `).run();
      const mapId = mapRes.lastInsertRowid;

      const template = generateNpcStats(1, {
        name: 'Infiltrator',
        race: 'Yazirian',
      });

      const gmEmitSpy = vi.fn();
      const globalEmitSpy = vi.spyOn(io, 'emit');
      vi.spyOn(io, 'to').mockImplementation((room) => {
        if (room === 'role:GameMaster') {
          return { emit: gmEmitSpy };
        }
        return io;
      });

      // Spawn with options.layer = 'gm'
      const spawnResult = await spawnAdversaries({
        db,
        io,
        mapId,
        template,
        count: 2,
        options: { layer: 'gm' },
      });

      expect(spawnResult.tokens.length).toBe(2);
      expect(spawnResult.tokens[0].layer).toBe('gm');
      expect(gmEmitSpy).toHaveBeenCalledTimes(2);
      expect(gmEmitSpy).toHaveBeenCalledWith('token:created', expect.objectContaining({ token: expect.objectContaining({ layer: 'gm' }) }));

      // Spawn with default character layer
      gmEmitSpy.mockClear();
      globalEmitSpy.mockClear();
      const spawnCharResult = await spawnAdversaries({
        db,
        io,
        mapId,
        template: { ...template, template_id: 'infil-char' },
        count: 1,
      });

      expect(spawnCharResult.tokens[0].layer).toBe('character');
      expect(globalEmitSpy).toHaveBeenCalledWith('token:created', expect.objectContaining({ token: expect.objectContaining({ layer: 'character' }) }));
    });
  });
});

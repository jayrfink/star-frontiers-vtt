import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  });
});

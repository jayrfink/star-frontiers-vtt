import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_UPLOADS_DIR = path.join(__dirname, '../../data/uploads');

describe('Adversaries API - Template Delete & Token Update', () => {
  let db, app, server, io, agent, mapId;
  const createdFiles = [];

  beforeEach(async () => {
    db = createTestDb();
    const result = createApp(db, ':memory:');
    app = result.app;
    server = result.server;
    io = result.io;

    agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'gm_adv', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'gm_adv', password: 'password123' });

    const mapRes = await agent.post('/api/maps').send({ name: 'Tactical Arena', map_type: 'rpg', is_active: 1 });
    mapId = mapRes.body.id;
  });

  afterEach(() => {
    if (db) db.close();
    if (server && server.close) server.close();
    for (const filePath of createdFiles) {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }
    createdFiles.length = 0;
  });

  it('PATCH /api/adversaries/:id/token updates template token from uploaded image and syncs map tokens', async () => {
    // 1. Spawn an adversary so template and map token exist
    const spawnRes = await agent.post('/api/adversaries/spawn').send({
      mapId,
      count: 2,
      template: {
        name: 'Sathar Agent',
        category: 'npc',
        threat_tier: 3,
        species: 'Sathar',
        weapon: 'Laser Pistol',
        armor: 'Skein Suit',
      },
    });
    expect(spawnRes.status).toBe(201);
    const templateId = spawnRes.body.template.template_id;
    const tokenOutPath = path.join(DATA_UPLOADS_DIR, 'tokens', `${templateId}.png`);
    createdFiles.push(tokenOutPath);

    // 2. Create a raw test source image in data/uploads/
    if (!fs.existsSync(DATA_UPLOADS_DIR)) {
      fs.mkdirSync(DATA_UPLOADS_DIR, { recursive: true });
    }
    const rawFileName = `test_custom_portrait_${Date.now()}.png`;
    const rawDiskPath = path.join(DATA_UPLOADS_DIR, rawFileName);
    await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 200, g: 50, b: 50, alpha: 1 } },
    })
      .png()
      .toFile(rawDiskPath);
    createdFiles.push(rawDiskPath);

    const emitSpy = vi.spyOn(io, 'emit');

    // 3. Call PATCH /api/adversaries/:id/token
    const patchRes = await agent
      .patch(`/api/adversaries/${templateId}/token`)
      .send({ source_image_url: `/uploads/${rawFileName}` });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.template.template_id).toBe(templateId);
    expect(patchRes.body.template.token_image_path).toMatch(new RegExp(`^/uploads/tokens/${templateId}\\.png\\?v=\\d+$`));
    expect(patchRes.body.updatedTokensCount).toBe(2);

    // Verify map tokens in DB were updated with the new avatar_url
    const activeMapRes = await agent.get('/api/maps/active?type=rpg');
    const mapTokens = activeMapRes.body.tokens.filter((t) => t.template_id === templateId);
    expect(mapTokens).toHaveLength(2);
    expect(mapTokens[0].avatar_url).toBe(patchRes.body.template.token_image_path);
    expect(mapTokens[1].avatar_url).toBe(patchRes.body.template.token_image_path);

    // Verify socket events emitted
    expect(emitSpy).toHaveBeenCalledWith('adversary:saved', expect.objectContaining({
      template: expect.objectContaining({ template_id: templateId }),
    }));
    expect(emitSpy).toHaveBeenCalledWith('token:updated', expect.objectContaining({
      token: expect.objectContaining({ template_id: templateId, avatar_url: patchRes.body.template.token_image_path }),
    }));
  });

  it('PATCH /api/adversaries/:id/token returns 400 when source_image_url file is missing on disk', async () => {
    const spawnRes = await agent.post('/api/adversaries/spawn').send({
      mapId,
      count: 1,
      template: { name: 'Pirate Guard', category: 'npc', threat_tier: 1 },
    });
    const templateId = spawnRes.body.template.template_id;
    createdFiles.push(path.join(DATA_UPLOADS_DIR, 'tokens', `${templateId}.png`));

    const patchRes = await agent
      .patch(`/api/adversaries/${templateId}/token`)
      .send({ source_image_url: '/uploads/non_existent_file_99999.png' });

    expect(patchRes.status).toBe(400);
    expect(patchRes.body.error).toContain('not found');
  });

  it('POST /api/adversaries/spawn regenerates token when existing template points to a moved/missing file', async () => {
    // Insert a template whose token_image_path points to a moved file
    const saveRes = await agent.post('/api/adversaries').send({
      template_id: 'moved-token-beast-t2',
      name: 'Moved Token Beast',
      category: 'creature',
      threat_tier: 2,
      token_image_path: '/uploads/tokens/moved_elsewhere_missing.png',
      hp_max: 35,
      actions: [{ name: 'Bite', target_pct: 55, damage: '2d10' }],
    });
    expect(saveRes.status).toBe(201);

    const expectedOutput = path.join(DATA_UPLOADS_DIR, 'tokens', 'moved-token-beast-t2.png');
    createdFiles.push(expectedOutput);

    // Also create a dummy file at expectedOutput first to prove it checks templateObj.token_image_path existence
    fs.mkdirSync(path.dirname(expectedOutput), { recursive: true });
    if (fs.existsSync(expectedOutput)) fs.unlinkSync(expectedOutput);

    const spawnRes = await agent.post('/api/adversaries/spawn').send({
      mapId,
      templateId: 'moved-token-beast-t2',
      count: 1,
    });

    expect(spawnRes.status).toBe(201);
    expect(spawnRes.body.template.token_image_path).toMatch(/^\/uploads\/tokens\/moved-token-beast-t2\.png/);
    expect(fs.existsSync(expectedOutput)).toBe(true);
  });

  it('DELETE /api/adversaries/:id deletes template, decouples spawned map tokens, and emits adversary:deleted', async () => {
    // 1. Spawn an adversary onto mapId so tokens rows exist referencing template_id
    const spawnRes = await agent.post('/api/adversaries/spawn').send({
      mapId,
      count: 2,
      template: {
        name: 'Dralasite Mercenary',
        category: 'npc',
        threat_tier: 2,
        species: 'Dralasite',
        weapon: 'Needler Gun',
        armor: 'Reflect Suit',
      },
    });
    expect(spawnRes.status).toBe(201);
    const templateId = spawnRes.body.template.template_id;
    const tokenOutPath = path.join(DATA_UPLOADS_DIR, 'tokens', `${templateId}.png`);
    createdFiles.push(tokenOutPath);

    // Verify tokens were created referencing template_id
    const spawnedTokenIds = spawnRes.body.tokens.map((t) => t.id);
    expect(spawnedTokenIds).toHaveLength(2);

    const emitSpy = vi.spyOn(io, 'emit');

    // 2. Call DELETE /api/adversaries/:id
    const deleteRes = await agent.delete(`/api/adversaries/${templateId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({ success: true });

    // 3. Verify socket event emitted with { id: templateId }
    expect(emitSpy).toHaveBeenCalledWith('adversary:deleted', { id: templateId });

    // 4. Verify template is removed from GET /api/adversaries
    const listRes = await agent.get('/api/adversaries');
    expect(listRes.status).toBe(200);
    const foundTemplate = listRes.body.find((t) => t.template_id === templateId);
    expect(foundTemplate).toBeUndefined();

    // 5. Verify map tokens remain on the map with template_id: null
    const activeMapRes = await agent.get('/api/maps/active?type=rpg');
    expect(activeMapRes.status).toBe(200);
    const remainingTokens = activeMapRes.body.tokens.filter((t) => spawnedTokenIds.includes(t.id));
    expect(remainingTokens).toHaveLength(2);
    for (const t of remainingTokens) {
      expect(t.template_id).toBeNull();
    }

    // Direct DB check
    const dbTokens = db.prepare('SELECT id, template_id FROM tokens WHERE id IN (?, ?)').all(spawnedTokenIds[0], spawnedTokenIds[1]);
    expect(dbTokens).toHaveLength(2);
    expect(dbTokens[0].template_id).toBeNull();
    expect(dbTokens[1].template_id).toBeNull();
  });

  it('DELETE /api/adversaries/:id returns 404 for nonexistent template', async () => {
    const res = await agent.delete('/api/adversaries/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('PATCH /api/adversaries/:id/token rejects directory paths and directory traversal outside uploads', async () => {
    const spawnRes = await agent.post('/api/adversaries/spawn').send({
      mapId,
      count: 1,
      template: { name: 'Boundary Guard', category: 'npc', threat_tier: 1 },
    });
    const templateId = spawnRes.body.template.template_id;
    createdFiles.push(path.join(DATA_UPLOADS_DIR, 'tokens', `${templateId}.png`));

    // Reject upload directory itself (is a directory, not a file)
    const dirRes = await agent
      .patch(`/api/adversaries/${templateId}/token`)
      .send({ source_image_url: '/uploads' });
    expect(dirRes.status).toBe(400);

    // Reject path traversal outside uploads root
    const traversalRes = await agent
      .patch(`/api/adversaries/${templateId}/token`)
      .send({ source_image_url: '/uploads/../../package.json' });
    expect(traversalRes.status).toBe(400);
  });
});

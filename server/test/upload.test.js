import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';
import { sanitizeUploadPath } from '../src/upload.js';

describe('Upload API', () => {
  let db, app, server, io, tempUploadDir;

  beforeEach(() => {
    db = createTestDb();
    tempUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vtt-upload-test-'));
    const result = createApp(db, ':memory:', tempUploadDir);
    app = result.app;
    server = result.server;
    io = result.io;
  });

  afterEach(() => {
    if (db) db.close();
    if (server && server.close) server.close();
    if (tempUploadDir && fs.existsSync(tempUploadDir)) {
      fs.rmSync(tempUploadDir, { recursive: true, force: true });
    }
  });

  it('returns 401 when unauthenticated on POST /api/upload', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('fake image content'), 'test.png');
    expect(res.status).toBe(401);
  });

  it('returns 401 when unauthenticated on GET /api/upload/files', async () => {
    const res = await request(app).get('/api/upload/files');
    expect(res.status).toBe(401);
  });

  it('returns 400 when authenticated but no file provided on POST /api/upload', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'uploader', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'uploader', password: 'password123' });

    const res = await agent.post('/api/upload');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No file uploaded');
  });

  it('uploads a file and serves it statically', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'uploader', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'uploader', password: 'password123' });

    const fileContent = 'sample image data content';
    const res = await agent
      .post('/api/upload')
      .attach('file', Buffer.from(fileContent), 'avatar.png');

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^\/uploads\/.+\.png$/);

    // Verify it is served statically via GET /uploads/<filename>
    const staticRes = await request(app).get(res.body.url);
    expect(staticRes.status).toBe(200);
    expect(staticRes.body.toString()).toBe(fileContent);
  });

  it('returns 200 with list of image files and folders when authenticated on GET /api/upload/files', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'uploader', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'uploader', password: 'password123' });

    // Set up directory hierarchy
    // Root files
    fs.writeFileSync(path.join(tempUploadDir, 'root_ship.png'), 'png data');
    fs.writeFileSync(path.join(tempUploadDir, 'notes.txt'), 'text data');
    fs.writeFileSync(path.join(tempUploadDir, '.DS_Store'), 'ds store');

    // Subfolder: upf
    const upfDir = path.join(tempUploadDir, 'upf');
    fs.mkdirSync(upfDir, { recursive: true });
    fs.writeFileSync(path.join(upfDir, 'fighter.jpg'), 'jpg data');
    fs.writeFileSync(path.join(upfDir, '.DS_Store'), 'ds store');

    // Nested subfolder: upf/scouts
    const scoutsDir = path.join(upfDir, 'scouts');
    fs.mkdirSync(scoutsDir, { recursive: true });
    fs.writeFileSync(path.join(scoutsDir, 'scout1.webp'), 'webp data');

    // Subfolder: sathar
    const satharDir = path.join(tempUploadDir, 'sathar');
    fs.mkdirSync(satharDir, { recursive: true });
    fs.writeFileSync(path.join(satharDir, 'dreadnought.svg'), '<svg></svg>');

    // Empty subfolder
    fs.mkdirSync(path.join(tempUploadDir, 'empty_folder'), { recursive: true });

    const res = await agent.get('/api/upload/files');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('files');
    expect(res.body).toHaveProperty('folders');

    expect(res.body.folders).toEqual(expect.arrayContaining(['', 'upf', 'upf/scouts', 'sathar', 'empty_folder']));

    // files should include 4 images, excluding notes.txt and .DS_Store
    expect(res.body.files).toHaveLength(4);

    const rootShip = res.body.files.find((f) => f.name === 'root_ship.png');
    expect(rootShip).toBeDefined();
    expect(rootShip.relativePath).toBe('root_ship.png');
    expect(rootShip.folder).toBe('');
    expect(rootShip.url).toBe('/uploads/root_ship.png');
    expect(rootShip.size).toBe(8);
    expect(typeof rootShip.mtime).toBe('string');

    const scout = res.body.files.find((f) => f.name === 'scout1.webp');
    expect(scout).toBeDefined();
    expect(scout.relativePath).toBe('upf/scouts/scout1.webp');
    expect(scout.folder).toBe('upf/scouts');
    expect(scout.url).toBe('/uploads/upf/scouts/scout1.webp');
    expect(scout.size).toBe(9);
    expect(typeof scout.mtime).toBe('string');
  });

  it('uploads a file to a specified subfolder on POST /api/upload', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'uploader', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'uploader', password: 'password123' });

    const fileContent = 'scout subfolder image data';
    const res = await agent
      .post('/api/upload')
      .field('folder', 'upf/scouts')
      .attach('file', Buffer.from(fileContent), 'scout.png');

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^\/uploads\/upf\/scouts\/.+\.png$/);

    const rel = res.body.url.replace('/uploads/', '');
    expect(fs.existsSync(path.join(tempUploadDir, rel))).toBe(true);

    const staticRes = await request(app).get(res.body.url);
    expect(staticRes.status).toBe(200);
    expect(staticRes.body.toString()).toBe(fileContent);
  });

  it('sanitizes folder path on POST /api/upload with leading/trailing slashes', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'uploader', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'uploader', password: 'password123' });

    const fileContent = 'sathar ship data';
    const res = await agent
      .post('/api/upload')
      .field('folder', ' /sathar/ ')
      .attach('file', Buffer.from(fileContent), 'frigate.png');

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^\/uploads\/sathar\/.+\.png$/);

    const rel = res.body.url.replace('/uploads/', '');
    expect(fs.existsSync(path.join(tempUploadDir, rel))).toBe(true);
  });

  it('rejects directory traversal attempts on POST /api/upload', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'uploader', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'uploader', password: 'password123' });

    const res = await agent
      .post('/api/upload')
      .field('folder', '../escaped')
      .attach('file', Buffer.from('evil file'), 'evil.png');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid folder path/i);
  });

  it('rejects rename from unauthenticated requests with 401', async () => {
    const res = await request(app)
      .put('/api/upload/rename')
      .send({ oldPath: 'test.png', newName: 'renamed.png' });
    expect(res.status).toBe(401);
  });

  it('rejects rename from Player with 403', async () => {
    const gmAgent = request.agent(app);
    await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
    await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });
    await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123', role: 'Player' });

    const playerAgent = request.agent(app);
    await playerAgent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

    const res = await playerAgent
      .put('/api/upload/rename')
      .send({ oldPath: 'test.png', newName: 'renamed.png' });
    expect(res.status).toBe(403);
  });

  it('rejects rename with path traversal with 400', async () => {
    const gmAgent = request.agent(app);
    await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
    await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

    // Traversal in newName
    const res1 = await gmAgent
      .put('/api/upload/rename')
      .send({ oldPath: 'test.png', newName: '../evil.png' });
    expect(res1.status).toBe(400);

    // Traversal in oldPath
    const res2 = await gmAgent
      .put('/api/upload/rename')
      .send({ oldPath: '../../secret.png', newName: 'safe.png' });
    expect(res2.status).toBe(400);
  });

  it('rejects rename when target file already exists with 409', async () => {
    const gmAgent = request.agent(app);
    await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
    await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

    fs.writeFileSync(path.join(tempUploadDir, 'file1.png'), 'file1');
    fs.writeFileSync(path.join(tempUploadDir, 'file2.png'), 'file2');

    const res = await gmAgent
      .put('/api/upload/rename')
      .send({ oldPath: 'file1.png', newName: 'file2.png' });
    expect(res.status).toBe(409);
  });

  it('successfully renames file, updates database references, and emits token:asset-renamed for GM', async () => {
    const gmAgent = request.agent(app);
    const regRes = await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
    await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });
    const userId = regRes.body.id;

    const subDir = path.join(tempUploadDir, 'tokens');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'guard.png'), 'guard image content');

    // Insert adversary template referencing oldUrl
    db.prepare(`
      INSERT INTO adversary_templates (id, name, category, threat_tier, token_image_path, hp_max)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('adv-1', 'Sathar Guard', 'npc', 2, '/uploads/tokens/guard.png', 50);

    // Insert map and token referencing oldUrl
    const mapRes = db.prepare('INSERT INTO maps (user_id, name, background_url) VALUES (?, ?, ?)').run(userId, 'Battle Map', '/uploads/tokens/guard.png');
    db.prepare(`
      INSERT INTO tokens (map_id, name, avatar_url)
      VALUES (?, ?, ?)
    `).run(mapRes.lastInsertRowid, 'Guard Token', '/uploads/tokens/guard.png');

    const emitSpy = vi.spyOn(io, 'emit');

    const res = await gmAgent
      .put('/api/upload/rename')
      .send({ oldPath: 'tokens/guard.png', newName: 'sentry.png' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      oldUrl: '/uploads/tokens/guard.png',
      newUrl: '/uploads/tokens/sentry.png',
    });

    // File system verification
    expect(fs.existsSync(path.join(subDir, 'guard.png'))).toBe(false);
    expect(fs.existsSync(path.join(subDir, 'sentry.png'))).toBe(true);

    // Database verification
    const template = db.prepare('SELECT token_image_path FROM adversary_templates WHERE id = ?').get('adv-1');
    expect(template.token_image_path).toBe('/uploads/tokens/sentry.png');

    const token = db.prepare('SELECT avatar_url FROM tokens WHERE map_id = ?').get(mapRes.lastInsertRowid);
    expect(token.avatar_url).toBe('/uploads/tokens/sentry.png');

    const updatedMap = db.prepare('SELECT background_url FROM maps WHERE id = ?').get(mapRes.lastInsertRowid);
    expect(updatedMap.background_url).toBe('/uploads/tokens/sentry.png');

    // Socket.io emit verification
    expect(emitSpy).toHaveBeenCalledWith('token:asset-renamed', {
      oldUrl: '/uploads/tokens/guard.png',
      newUrl: '/uploads/tokens/sentry.png',
    });
    expect(emitSpy).toHaveBeenCalledWith('map:asset-renamed', {
      oldUrl: '/uploads/tokens/guard.png',
      newUrl: '/uploads/tokens/sentry.png',
    });
  });

  it('rejects delete from Player with 403', async () => {
    const gmAgent = request.agent(app);
    await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
    await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });
    await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123', role: 'Player' });

    const playerAgent = request.agent(app);
    await playerAgent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

    const res = await playerAgent
      .delete('/api/upload/file')
      .query({ path: 'test.png' });
    expect(res.status).toBe(403);
  });

  it('rejects delete with path traversal with 400', async () => {
    const gmAgent = request.agent(app);
    await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
    await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

    const res1 = await gmAgent
      .delete('/api/upload/file')
      .query({ path: '../secret.png' });
    expect(res1.status).toBe(400);

    const res2 = await gmAgent
      .delete('/api/upload/file')
      .send({ path: '../../etc/passwd' });
    expect(res2.status).toBe(400);
  });

  it('successfully deletes file, clears database references, and emits token:asset-deleted for GM', async () => {
    const gmAgent = request.agent(app);
    const regRes = await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
    await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });
    const userId = regRes.body.id;

    const subDir = path.join(tempUploadDir, 'tokens');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'drone.png'), 'drone image content');

    // Insert adversary template referencing url
    db.prepare(`
      INSERT INTO adversary_templates (id, name, category, threat_tier, token_image_path, hp_max)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('adv-2', 'Security Drone', 'creature', 1, '/uploads/tokens/drone.png', 20);

    // Insert map and token referencing url
    const mapRes = db.prepare('INSERT INTO maps (user_id, name, background_url) VALUES (?, ?, ?)').run(userId, 'Hangar Map', '/uploads/tokens/drone.png');
    db.prepare(`
      INSERT INTO tokens (map_id, name, avatar_url)
      VALUES (?, ?, ?)
    `).run(mapRes.lastInsertRowid, 'Drone Token', '/uploads/tokens/drone.png');

    const emitSpy = vi.spyOn(io, 'emit');

    const res = await gmAgent
      .delete('/api/upload/file')
      .query({ path: 'tokens/drone.png' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      url: '/uploads/tokens/drone.png',
    });

    // File system verification
    expect(fs.existsSync(path.join(subDir, 'drone.png'))).toBe(false);

    // Database verification
    const template = db.prepare('SELECT token_image_path FROM adversary_templates WHERE id = ?').get('adv-2');
    expect(template.token_image_path).toBe('');

    const token = db.prepare('SELECT avatar_url FROM tokens WHERE map_id = ?').get(mapRes.lastInsertRowid);
    expect(token.avatar_url).toBe('');

    const updatedMap = db.prepare('SELECT background_url FROM maps WHERE id = ?').get(mapRes.lastInsertRowid);
    expect(updatedMap.background_url).toBe('');

    // Socket.io emit verification
    expect(emitSpy).toHaveBeenCalledWith('token:asset-deleted', {
      url: '/uploads/tokens/drone.png',
    });
    expect(emitSpy).toHaveBeenCalledWith('map:asset-deleted', {
      url: '/uploads/tokens/drone.png',
    });
  });

  describe('Folder CRUD endpoints', () => {
    it('returns 401 when unauthenticated on POST /api/upload/folder', async () => {
      const res = await request(app)
        .post('/api/upload/folder')
        .send({ folder: 'new-folder' });
      expect(res.status).toBe(401);
    });

    it('returns 403 when Player on POST /api/upload/folder', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123', role: 'Player' });

      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await playerAgent
        .post('/api/upload/folder')
        .send({ folder: 'new-folder' });
      expect(res.status).toBe(403);
    });

    it('returns 400 on directory traversal attempt on POST /api/upload/folder', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      const res = await gmAgent
        .post('/api/upload/folder')
        .send({ folder: '../evil' });
      expect(res.status).toBe(400);
    });

    it('creates new folder with 201 for GM on POST /api/upload/folder', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      const res = await gmAgent
        .post('/api/upload/folder')
        .send({ folder: 'maps/sublevel' });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        success: true,
        folder: 'maps/sublevel',
      });
      expect(fs.existsSync(path.join(tempUploadDir, 'maps/sublevel'))).toBe(true);
    });

    it('returns 409 Conflict if folder already exists on POST /api/upload/folder', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      fs.mkdirSync(path.join(tempUploadDir, 'existing'), { recursive: true });

      const res = await gmAgent
        .post('/api/upload/folder')
        .send({ folder: 'existing' });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('returns 401 when unauthenticated on DELETE /api/upload/folder', async () => {
      const res = await request(app)
        .delete('/api/upload/folder')
        .send({ folder: 'some-folder' });
      expect(res.status).toBe(401);
    });

    it('returns 403 when Player on DELETE /api/upload/folder', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123', role: 'Player' });

      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await playerAgent
        .delete('/api/upload/folder')
        .send({ folder: 'some-folder' });
      expect(res.status).toBe(403);
    });

    it('returns 400 on directory traversal attempt on DELETE /api/upload/folder', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      const res = await gmAgent
        .delete('/api/upload/folder')
        .query({ folder: '../evil' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when attempting to delete root folder on DELETE /api/upload/folder', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      const res = await gmAgent
        .delete('/api/upload/folder')
        .send({ folder: '' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot delete root folder/i);
    });

    it('returns 404 when folder does not exist on DELETE /api/upload/folder', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      const res = await gmAgent
        .delete('/api/upload/folder')
        .query({ folder: 'nonexistent' });
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Folder not found/i);
    });

    it('returns 400 when folder is not empty on DELETE /api/upload/folder', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      const targetDir = path.join(tempUploadDir, 'busy-folder');
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'item.png'), 'content');

      const res = await gmAgent
        .delete('/api/upload/folder')
        .send({ folder: 'busy-folder' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Folder is not empty/i);
      expect(fs.existsSync(targetDir)).toBe(true);
    });

    it('successfully deletes empty folder with 200 for GM on DELETE /api/upload/folder', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      const targetDir = path.join(tempUploadDir, 'clean-folder');
      fs.mkdirSync(targetDir, { recursive: true });

      const res = await gmAgent
        .delete('/api/upload/folder')
        .query({ folder: 'clean-folder' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        folder: 'clean-folder',
      });
      expect(fs.existsSync(targetDir)).toBe(false);
    });
  });

  describe('File Move endpoint (PUT /api/upload/move)', () => {
    it('returns 401 when unauthenticated on PUT /api/upload/move', async () => {
      const res = await request(app)
        .put('/api/upload/move')
        .send({ sourcePath: 'token.png', destinationFolder: 'tokens' });
      expect(res.status).toBe(401);
    });

    it('returns 403 when Player on PUT /api/upload/move', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123', role: 'Player' });

      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await playerAgent
        .put('/api/upload/move')
        .send({ sourcePath: 'token.png', destinationFolder: 'tokens' });
      expect(res.status).toBe(403);
    });

    it('returns 400 on path traversal on PUT /api/upload/move', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      // Traversal in sourcePath
      const res1 = await gmAgent
        .put('/api/upload/move')
        .send({ sourcePath: '../secret.png', destinationFolder: 'tokens' });
      expect(res1.status).toBe(400);

      // Traversal in destinationFolder
      const res2 = await gmAgent
        .put('/api/upload/move')
        .send({ sourcePath: 'token.png', destinationFolder: '../escaped' });
      expect(res2.status).toBe(400);
    });

    it('returns 404 when source file does not exist on PUT /api/upload/move', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      const res = await gmAgent
        .put('/api/upload/move')
        .send({ sourcePath: 'missing.png', destinationFolder: 'tokens' });
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Source file not found/i);
    });

    it('returns 409 when target destination file already exists on PUT /api/upload/move', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });

      fs.writeFileSync(path.join(tempUploadDir, 'hero.png'), 'source');
      const targetDir = path.join(tempUploadDir, 'heroes');
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'hero.png'), 'existing target');

      const res = await gmAgent
        .put('/api/upload/move')
        .send({ sourcePath: 'hero.png', destinationFolder: 'heroes' });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Target file already exists/i);
    });

    it('moves file, cascades updates across tokens, maps, adversary_templates, character_sheets, ship_sheets, and emits socket events for GM on PUT /api/upload/move', async () => {
      const gmAgent = request.agent(app);
      const regRes = await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });
      const userId = regRes.body.id;

      // Create root file to move
      fs.writeFileSync(path.join(tempUploadDir, 'hero.png'), 'hero image data');

      const oldUrl = '/uploads/hero.png';
      const newUrl = '/uploads/characters/pcs/hero.png';

      // Insert references across all 5 tables
      // 1. adversary_templates
      db.prepare(`
        INSERT INTO adversary_templates (id, name, category, threat_tier, token_image_path, hp_max)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('adv-move-1', 'Moved Hero NPC', 'npc', 1, oldUrl, 45);

      // 2. maps
      const mapRes = db.prepare('INSERT INTO maps (user_id, name, background_url) VALUES (?, ?, ?)').run(userId, 'Hero Map', oldUrl);

      // 3. tokens
      const tokenRes = db.prepare(`
        INSERT INTO tokens (map_id, name, avatar_url)
        VALUES (?, ?, ?)
      `).run(mapRes.lastInsertRowid, 'Hero Token', oldUrl);

      // 4. character_sheets
      const charRes = db.prepare(`
        INSERT INTO character_sheets (user_id, name, race, avatar_url)
        VALUES (?, ?, ?, ?)
      `).run(userId, 'Hero Character', 'Human', oldUrl);

      // 5. ship_sheets
      const shipRes = db.prepare(`
        INSERT INTO ship_sheets (user_id, name, ship_type, avatar_url)
        VALUES (?, ?, ?, ?)
      `).run(userId, 'Hero Ship', 'Scout', oldUrl);

      const emitSpy = vi.spyOn(io, 'emit');

      const res = await gmAgent
        .put('/api/upload/move')
        .send({ sourcePath: 'hero.png', destinationFolder: 'characters/pcs' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        oldUrl,
        newUrl,
      });

      // File system verification
      expect(fs.existsSync(path.join(tempUploadDir, 'hero.png'))).toBe(false);
      expect(fs.existsSync(path.join(tempUploadDir, 'characters/pcs/hero.png'))).toBe(true);

      // Database verification across all 5 tables
      const advRow = db.prepare('SELECT token_image_path FROM adversary_templates WHERE id = ?').get('adv-move-1');
      expect(advRow.token_image_path).toBe(newUrl);

      const mapRow = db.prepare('SELECT background_url FROM maps WHERE id = ?').get(mapRes.lastInsertRowid);
      expect(mapRow.background_url).toBe(newUrl);

      const tokenRow = db.prepare('SELECT avatar_url FROM tokens WHERE id = ?').get(tokenRes.lastInsertRowid);
      expect(tokenRow.avatar_url).toBe(newUrl);

      const charRow = db.prepare('SELECT avatar_url FROM character_sheets WHERE id = ?').get(charRes.lastInsertRowid);
      expect(charRow.avatar_url).toBe(newUrl);

      const shipRow = db.prepare('SELECT avatar_url FROM ship_sheets WHERE id = ?').get(shipRes.lastInsertRowid);
      expect(shipRow.avatar_url).toBe(newUrl);

      // Socket.io emit verification
      expect(emitSpy).toHaveBeenCalledWith('token:asset-renamed', {
        oldUrl,
        newUrl,
      });
      expect(emitSpy).toHaveBeenCalledWith('map:asset-renamed', {
        oldUrl,
        newUrl,
      });
    });
  });

  describe('Cascade Updates on Query-Busted Asset URLs (Bug 1.3)', () => {
    it('renames file and cascades across tables containing query-busting parameters (?v=...)', async () => {
      const gmAgent = request.agent(app);
      const regRes = await gmAgent.post('/api/auth/register').send({ username: 'gm_qb1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_qb1', password: 'password123' });
      const userId = regRes.body.id;

      const subDir = path.join(tempUploadDir, 'tokens');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'sathar_v1.png'), 'image content');

      const oldBustedUrl = '/uploads/tokens/sathar_v1.png?v=1792169480777';
      const newExpectedUrl = '/uploads/tokens/sathar_renamed.png?v=1792169480777';

      db.prepare(`
        INSERT INTO adversary_templates (id, name, category, threat_tier, token_image_path, hp_max)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('adv-qb-1', 'Sathar Trooper', 'npc', 2, oldBustedUrl, 60);

      const mapRes = db.prepare('INSERT INTO maps (user_id, name, background_url) VALUES (?, ?, ?)').run(userId, 'Sathar Base', oldBustedUrl);
      const tokenRes = db.prepare('INSERT INTO tokens (map_id, name, avatar_url) VALUES (?, ?, ?)').run(mapRes.lastInsertRowid, 'Sathar Token', oldBustedUrl);
      db.prepare('INSERT INTO vehicle_templates (id, user_id, name, avatar_url) VALUES (?, ?, ?, ?)').run('veh-qb-1', userId, 'Hovertank', oldBustedUrl);

      const res = await gmAgent
        .put('/api/upload/rename')
        .send({ oldPath: 'tokens/sathar_v1.png', newName: 'sathar_renamed.png' });

      expect(res.status).toBe(200);

      const adv = db.prepare('SELECT token_image_path FROM adversary_templates WHERE id = ?').get('adv-qb-1');
      expect(adv.token_image_path).toBe(newExpectedUrl);

      const token = db.prepare('SELECT avatar_url FROM tokens WHERE id = ?').get(tokenRes.lastInsertRowid);
      expect(token.avatar_url).toBe(newExpectedUrl);

      const veh = db.prepare('SELECT avatar_url FROM vehicle_templates WHERE id = ?').get('veh-qb-1');
      expect(veh.avatar_url).toBe(newExpectedUrl);
    });

    it('deletes file and cascades clear across tables containing query-busting parameters (?v=...)', async () => {
      const gmAgent = request.agent(app);
      const regRes = await gmAgent.post('/api/auth/register').send({ username: 'gm_qb2', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm_qb2', password: 'password123' });
      const userId = regRes.body.id;

      const subDir = path.join(tempUploadDir, 'tokens');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'delete_me.png'), 'delete content');

      const oldBustedUrl = '/uploads/tokens/delete_me.png?v=999999';

      db.prepare(`
        INSERT INTO adversary_templates (id, name, category, threat_tier, token_image_path, hp_max)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('adv-qb-2', 'Deleted Adv', 'npc', 1, oldBustedUrl, 30);

      db.prepare('INSERT INTO vehicle_templates (id, user_id, name, avatar_url) VALUES (?, ?, ?, ?)').run('veh-qb-2', userId, 'Deleted Skimmer', oldBustedUrl);

      const res = await gmAgent
        .delete('/api/upload/file')
        .query({ path: 'tokens/delete_me.png' });

      expect(res.status).toBe(200);

      const adv = db.prepare('SELECT token_image_path FROM adversary_templates WHERE id = ?').get('adv-qb-2');
      expect(adv.token_image_path).toBe('');

      const veh = db.prepare('SELECT avatar_url FROM vehicle_templates WHERE id = ?').get('veh-qb-2');
      expect(veh.avatar_url).toBe('');
    });

    it('rejects malicious or invalid file uploads (.html, scriptable SVG, .js) and escapes LIKE wildcards', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'sec_tester', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'sec_tester', password: 'password123' });

      // Reject .html file
      const htmlRes = await agent
        .post('/api/upload')
        .attach('file', Buffer.from('<html><script>alert("xss")</script></html>'), 'xss.html');
      expect(htmlRes.status).toBe(400);

      // Reject .js file
      const jsRes = await agent
        .post('/api/upload')
        .attach('file', Buffer.from('console.log("bad")'), 'payload.js');
      expect(jsRes.status).toBe(400);

      // Reject SVG containing <script>
      const svgXssRes = await agent
        .post('/api/upload')
        .attach('file', Buffer.from('<svg><script>alert(1)</script></svg>'), 'evil.svg');
      expect(svgXssRes.status).toBe(400);

      // Reject SVG containing onload= handler
      const svgOnloadRes = await agent
        .post('/api/upload')
        .attach('file', Buffer.from('<svg onload="alert(1)"></svg>'), 'onload.svg');
      expect(svgOnloadRes.status).toBe(400);

      // Clean SVG upload succeeds
      const cleanSvgRes = await agent
        .post('/api/upload')
        .attach('file', Buffer.from('<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red" /></svg>'), 'clean.svg');
      expect(cleanSvgRes.status).toBe(200);
      expect(cleanSvgRes.body.url).toMatch(/\.svg$/);

      // Test LIKE wildcard isolation: renaming "token_1.png" must NOT affect "token-1.png" or "tokenA1.png"
      fs.writeFileSync(path.join(tempUploadDir, 'token_1.png'), 'target content');
      fs.writeFileSync(path.join(tempUploadDir, 'token-1.png'), 'unrelated content');

      db.prepare(`
        INSERT INTO adversary_templates (id, name, category, threat_tier, token_image_path, hp_max)
        VALUES ('adv-like-1', 'Target', 'npc', 1, '/uploads/token_1.png', 30),
               ('adv-like-2', 'Unrelated', 'npc', 1, '/uploads/token-1.png', 30)
      `).run();

      const renameRes = await agent
        .put('/api/upload/rename')
        .send({ oldPath: 'token_1.png', newName: 'token_1_renamed.png' });
      expect(renameRes.status).toBe(200);

      const targetAdv = db.prepare('SELECT token_image_path FROM adversary_templates WHERE id = ?').get('adv-like-1');
      const unrelatedAdv = db.prepare('SELECT token_image_path FROM adversary_templates WHERE id = ?').get('adv-like-2');
      expect(targetAdv.token_image_path).toBe('/uploads/token_1_renamed.png');
      expect(unrelatedAdv.token_image_path).toBe('/uploads/token-1.png'); // Unchanged!
    });

    it('enforces GM authorization on POST /api/upload (Player receives 403)', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmUser', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmUser', password: 'password123' });
      await gmAgent.post('/api/auth/register').send({ username: 'regularPlayer', password: 'password123', role: 'Player' });

      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'regularPlayer', password: 'password123' });

      const res = await playerAgent
        .post('/api/upload')
        .attach('file', Buffer.from('player uploaded image'), 'player.png');
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('GameMaster');
    });

    it('sanitizeUploadPath strips query strings and hash fragments', () => {
      expect(sanitizeUploadPath('/uploads/tokens/hero.png?v=12345')).toBe('tokens/hero.png');
      expect(sanitizeUploadPath('/uploads/maps/grid.jpg?version=2#section')).toBe('maps/grid.jpg');
      expect(sanitizeUploadPath('uploads/avatar.png#hash')).toBe('avatar.png');
    });

    it('rejects SVG files containing entity-encoded scripts, javascript: or data:text/html', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmSvg', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmSvg', password: 'password123' });

      // Entity-encoded javascript: href
      const encodedSvg = '<svg><a href="&#x6a;&#x61;vascript:alert(1)"><circle r="10"/></a></svg>';
      const res1 = await gmAgent
        .post('/api/upload')
        .attach('file', Buffer.from(encodedSvg), 'encoded.svg');
      expect(res1.status).toBe(400);

      // SVG with data:text/html
      const dataSvg = '<svg><image href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="/></svg>';
      const res2 = await gmAgent
        .post('/api/upload')
        .attach('file', Buffer.from(dataSvg), 'data_html.svg');
      expect(res2.status).toBe(400);

      // SVG with numeric entity &#106;
      const numericSvg = '<svg><a href="&#106;avascript:alert(1)"><circle r="10"/></a></svg>';
      const res3 = await gmAgent
        .post('/api/upload')
        .attach('file', Buffer.from(numericSvg), 'numeric.svg');
      expect(res3.status).toBe(400);

      // Bug 17: SVG with <animate>
      const animateSvg = '<svg><rect width="10"><animate attributeName="x" from="0" to="10" /></rect></svg>';
      const resAnimate = await gmAgent
        .post('/api/upload')
        .attach('file', Buffer.from(animateSvg), 'animate.svg');
      expect(resAnimate.status).toBe(400);

      // Bug 17: SVG with <set>
      const setSvg = '<svg><rect><set attributeName="fill" to="red" /></rect></svg>';
      const resSet = await gmAgent
        .post('/api/upload')
        .attach('file', Buffer.from(setSvg), 'set.svg');
      expect(resSet.status).toBe(400);

      // Bug 17: SVG with <!ENTITY
      const entitySvg = '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY xxe "hello">]><svg>&xxe;</svg>';
      const resEntity = await gmAgent
        .post('/api/upload')
        .attach('file', Buffer.from(entitySvg), 'entity.svg');
      expect(resEntity.status).toBe(400);
    });
  });
});


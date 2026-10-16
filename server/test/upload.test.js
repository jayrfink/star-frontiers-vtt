import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';

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
    const mapRes = db.prepare('INSERT INTO maps (user_id, name) VALUES (?, ?)').run(userId, 'Battle Map');
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

    // Socket.io emit verification
    expect(emitSpy).toHaveBeenCalledWith('token:asset-renamed', {
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
    const mapRes = db.prepare('INSERT INTO maps (user_id, name) VALUES (?, ?)').run(userId, 'Hangar Map');
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

    // Socket.io emit verification
    expect(emitSpy).toHaveBeenCalledWith('token:asset-deleted', {
      url: '/uploads/tokens/drone.png',
    });
  });
});

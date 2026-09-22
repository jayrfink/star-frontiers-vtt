import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';

describe('Upload API', () => {
  let db, app, server, tempUploadDir;

  beforeEach(() => {
    db = createTestDb();
    tempUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vtt-upload-test-'));
    const result = createApp(db, ':memory:', tempUploadDir);
    app = result.app;
    server = result.server;
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
});

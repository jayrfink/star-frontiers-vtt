import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

describe('Rulebooks API', () => {
  let db, app, server;

  beforeEach(() => {
    db = createTestDb();
    const result = createApp(db, ':memory:');
    app = result.app;
    server = result.server;
  });

  afterEach(() => {
    if (db) db.close();
    if (server && server.close) server.close();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/rulebooks');
    expect(res.status).toBe(401);
  });

  it('returns rulebooks list when authenticated', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

    const res = await agent.get('/api/rulebooks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('serves PDF file inline when authenticated', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

    const res = await agent.get('/api/rulebooks/pdf/ad-basic');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });

  it('returns 404 for invalid bookId', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

    const res = await agent.get('/api/rulebooks/pdf/invalid-book');
    expect(res.status).toBe(404);
  });

  it('Bug 28: legacy page endpoints return clean responses without crashing', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'gmLegacy', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'gmLegacy', password: 'password123' });

    // Requesting nonexistent page ID returns 404 cleanly
    const resPageNotFound = await agent.get('/api/rulebooks/page/nonexistent-id');
    expect(resPageNotFound.status).toBe(404);

    // Requesting valid book returns 200 or 404 without unhandled rejection
    const resBook = await agent.get('/api/rulebooks/ad-basic');
    expect([200, 404]).toContain(resBook.status);

    // Requesting page by book and number
    const resBookPage = await agent.get('/api/rulebooks/ad-basic/page/99999');
    expect(resBookPage.status).toBe(404);
  });
});

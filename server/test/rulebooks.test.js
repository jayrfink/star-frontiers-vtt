import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

describe('Rulebooks API', () => {
  let db, app;

  beforeEach(() => {
    db = createTestDb();
    app = createApp(db, ':memory:');
  });

  afterEach(() => {
    if (db) db.close();
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
});

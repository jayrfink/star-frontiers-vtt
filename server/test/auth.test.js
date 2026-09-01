import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';

describe('Auth API', () => {
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

  describe('POST /api/auth/register', () => {
    it('registers the first user as GameMaster', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'gm', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body.username).toBe('gm');
      expect(res.body.role).toBe('GameMaster');
      expect(res.body).not.toHaveProperty('password_hash');
    });

    it('registers subsequent users as Player', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'gm', password: 'password123' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'player1', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body.role).toBe('Player');
    });

    it('rejects duplicate username with 409', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'gm', password: 'password123' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'gm', password: 'otherpass123' });
      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
    });

    it('rejects password shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'gm', password: '12345' });
      expect(res.status).toBe(400);
    });

    it('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'gm' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'gm', password: 'password123' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'gm', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('gm');
      expect(res.body.role).toBe('GameMaster');
    });

    it('rejects wrong password with 401', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'gm', password: 'password123' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'gm', password: 'wrongpass' });
      expect(res.status).toBe(401);
    });

    it('rejects non-existent username with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nobody', password: 'password123' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user info when authenticated', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/register')
        .send({ username: 'gm', password: 'password123' });
      await agent
        .post('/api/auth/login')
        .send({ username: 'gm', password: 'password123' });
      const res = await agent.get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('gm');
      expect(res.body.role).toBe('GameMaster');
    });

    it('returns 401 when not authenticated', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('destroys session on logout', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/register')
        .send({ username: 'gm', password: 'password123' });
      await agent
        .post('/api/auth/login')
        .send({ username: 'gm', password: 'password123' });
      const logoutRes = await agent.post('/api/auth/logout');
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.ok).toBe(true);

      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(401);
    });

    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});

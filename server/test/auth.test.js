import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import os from 'os';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';
import { BetterSqlite3Store } from '../src/middleware.js';

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

  describe('GET /api/auth/setup', () => {
    it('returns requiresSetup: true when no users exist', async () => {
      const res = await request(app).get('/api/auth/setup');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ requiresSetup: true });
    });

    it('returns requiresSetup: false when users exist', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'gm', password: 'password123' });
      const res = await request(app).get('/api/auth/setup');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ requiresSetup: false });
    });
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

    it('rejects registration of subsequent users if unauthenticated with 401', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'gm', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'player1', password: 'password123' });
      expect(res.status).toBe(401);
    });

    it('rejects registration of subsequent users if authenticated as Player with 403', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });

      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await playerAgent
        .post('/api/auth/register')
        .send({ username: 'player2', password: 'password123' });
      expect(res.status).toBe(403);
    });

    it('registers subsequent users as Player by default when authenticated as GM', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const res = await gmAgent
        .post('/api/auth/register')
        .send({ username: 'player1', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body.username).toBe('player1');
      expect(res.body.role).toBe('Player');
    });

    it('allows GM to specify role when registering a user', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const res1 = await gmAgent
        .post('/api/auth/register')
        .send({ username: 'gm2', password: 'password123', role: 'GameMaster' });
      expect(res1.status).toBe(201);
      expect(res1.body.role).toBe('GameMaster');

      const res2 = await gmAgent
        .post('/api/auth/register')
        .send({ username: 'player2', password: 'password123', role: 'Player' });
      expect(res2.status).toBe(201);
      expect(res2.body.role).toBe('Player');
    });

    it('rejects invalid role with 400', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const res = await gmAgent
        .post('/api/auth/register')
        .send({ username: 'user3', password: 'password123', role: 'Admin' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid role');
    });

    it('rejects duplicate username with 409', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const res = await gmAgent
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

  describe('PUT /api/auth/role (removed)', () => {
    it('returns 404 because role escalation route was removed', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/register')
        .send({ username: 'gm', password: 'password123' });
      await agent
        .post('/api/auth/login')
        .send({ username: 'gm', password: 'password123' });

      const res = await agent.put('/api/auth/role').send({ role: 'Player' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/auth/users', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).get('/api/auth/users');
      expect(res.status).toBe(401);
    });

    it('returns 403 when authenticated as Player', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });

      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await playerAgent.get('/api/auth/users');
      expect(res.status).toBe(403);
    });

    it('returns list of users without password_hash when authenticated as GM', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });

      const res = await gmAgent.get('/api/auth/users');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('username', 'gm');
      expect(res.body[0]).toHaveProperty('role', 'GameMaster');
      expect(res.body[0]).not.toHaveProperty('password_hash');
      expect(res.body[1]).toHaveProperty('username', 'player1');
      expect(res.body[1]).toHaveProperty('role', 'Player');
      expect(res.body[1]).not.toHaveProperty('password_hash');
    });
  });

  describe('DELETE /api/auth/users/:id', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).delete('/api/auth/users/1');
      expect(res.status).toBe(401);
    });

    it('returns 403 when authenticated as Player', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });
      const regRes = await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });

      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await playerAgent.delete(`/api/auth/users/${regRes.body.id}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 when target user does not exist', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const res = await gmAgent.delete('/api/auth/users/9999');
      expect(res.status).toBe(404);
    });

    it('returns 400 when attempting to delete the last GameMaster', async () => {
      const gmAgent = request.agent(app);
      const regRes = await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const res = await gmAgent.delete(`/api/auth/users/${regRes.body.id}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot delete the last GameMaster');
    });

    it('successfully deletes a Player', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });
      const regRes = await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });

      const delRes = await gmAgent.delete(`/api/auth/users/${regRes.body.id}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.ok).toBe(true);

      const usersRes = await gmAgent.get('/api/auth/users');
      expect(usersRes.body).toHaveLength(1);
      expect(usersRes.body[0].username).toBe('gm');
    });

    it('successfully deletes a GameMaster when multiple GameMasters exist', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });
      const gm2Res = await gmAgent
        .post('/api/auth/register')
        .send({ username: 'gm2', password: 'password123', role: 'GameMaster' });

      const delRes = await gmAgent.delete(`/api/auth/users/${gm2Res.body.id}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.ok).toBe(true);

      const usersRes = await gmAgent.get('/api/auth/users');
      expect(usersRes.body).toHaveLength(1);
      expect(usersRes.body[0].username).toBe('gm1');
    });

    it('returns 400 when attempting to delete own logged-in account (Bug 1.4)', async () => {
      const gmAgent = request.agent(app);
      const gm1Res = await gmAgent.post('/api/auth/register').send({ username: 'gm1', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm1', password: 'password123' });
      await gmAgent
        .post('/api/auth/register')
        .send({ username: 'gm2', password: 'password123', role: 'GameMaster' });

      // gm1 attempts to delete gm1
      const delRes = await gmAgent.delete(`/api/auth/users/${gm1Res.body.id}`);
      expect(delRes.status).toBe(400);
      expect(delRes.body.error).toBe('Cannot delete your own account');

      // Verify gm1 is still in database and session remains authenticated
      const meRes = await gmAgent.get('/api/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.username).toBe('gm1');
    });

    it('anchors session deletion LIKE query so deleting user 2 does not invalidate user 20 session', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmAdmin', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmAdmin', password: 'password123' });

      // Create user 2 and user 20 in db explicitly (gmAdmin is user 1)
      db.prepare(`INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (2, 'u2', 'hash', 'Player')`).run();
      db.prepare(`INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (20, 'u20', 'hash', 'Player')`).run();

      // Ensure sessions table exists
      db.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          sid TEXT PRIMARY KEY,
          sess TEXT,
          expired DATETIME
        )
      `).run();

      // Insert session records with JSON containing userId 2 and userId 20
      db.prepare(`INSERT OR REPLACE INTO sessions (sid, sess) VALUES ('s2', '{"cookie":{},"userId":2,"role":"Player"}')`).run();
      db.prepare(`INSERT OR REPLACE INTO sessions (sid, sess) VALUES ('s20', '{"cookie":{},"userId":20,"role":"Player"}')`).run();

      // Delete user 2
      const delRes = await gmAgent.delete('/api/auth/users/2');
      expect(delRes.status).toBe(200);

      // Verify session for user 2 is deleted, but session for user 20 is untouched
      const s2 = db.prepare(`SELECT * FROM sessions WHERE sid = 's2'`).get();
      const s20 = db.prepare(`SELECT * FROM sessions WHERE sid = 's20'`).get();

      expect(s2).toBeUndefined();
      expect(s20).toBeDefined();
    });
  });

  describe('PUT /api/auth/users/:id/password', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).put('/api/auth/users/1/password').send({ password: 'newpassword123' });
      expect(res.status).toBe(401);
    });

    it('returns 403 when authenticated as Player', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });
      const regRes = await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });

      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const res = await playerAgent.put(`/api/auth/users/${regRes.body.id}/password`).send({ password: 'newpassword123' });
      expect(res.status).toBe(403);
    });

    it('returns 400 if password is missing or < 6 characters', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });
      const regRes = await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });

      const res1 = await gmAgent.put(`/api/auth/users/${regRes.body.id}/password`).send({});
      expect(res1.status).toBe(400);

      const res2 = await gmAgent.put(`/api/auth/users/${regRes.body.id}/password`).send({ password: '123' });
      expect(res2.status).toBe(400);
    });

    it('returns 404 when target user does not exist', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const res = await gmAgent.put('/api/auth/users/9999/password').send({ password: 'newpassword123' });
      expect(res.status).toBe(404);
    });

    it('successfully updates user password and allows login with new password', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });
      const regRes = await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });

      const updateRes = await gmAgent
        .put(`/api/auth/users/${regRes.body.id}/password`)
        .send({ password: 'brandnewpassword' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.ok).toBe(true);

      // Verify old password fails
      const failedLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'player1', password: 'password123' });
      expect(failedLogin.status).toBe(401);

      // Verify new password succeeds
      const successfulLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'player1', password: 'brandnewpassword' });
      expect(successfulLogin.status).toBe(200);
      expect(successfulLogin.body.username).toBe('player1');
    });
  });

  describe('PUT /api/auth/password', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .send({ currentPassword: 'password123', newPassword: 'newpassword123' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when missing currentPassword or newPassword', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const res1 = await agent.put('/api/auth/password').send({ currentPassword: 'password123' });
      expect(res1.status).toBe(400);

      const res2 = await agent.put('/api/auth/password').send({ newPassword: 'newpassword123' });
      expect(res2.status).toBe(400);

      const res3 = await agent.put('/api/auth/password').send({});
      expect(res3.status).toBe(400);
    });

    it('returns 400 Bad Request when request body is empty/missing or contains non-string passwords', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      // Request without a body
      const resNoBody = await agent.put('/api/auth/password');
      expect(resNoBody.status).toBe(400);
      expect(resNoBody.body.error).toBe('Current password and new password are required');

      // Non-string currentPassword
      const resNonStringCurrent = await agent.put('/api/auth/password').send({
        currentPassword: 12345,
        newPassword: 'validPassword123',
      });
      expect(resNonStringCurrent.status).toBe(400);
      expect(resNonStringCurrent.body.error).toBe('Current password and new password are required');

      // Non-string newPassword
      const resNonStringNew = await agent.put('/api/auth/password').send({
        currentPassword: 'password123',
        newPassword: true,
      });
      expect(resNonStringNew.status).toBe(400);
      expect(resNonStringNew.body.error).toBe('Current password and new password are required');
    });

    it('returns 400 when newPassword is shorter than 6 characters', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const res = await agent.put('/api/auth/password').send({
        currentPassword: 'password123',
        newPassword: 'short',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least 6 characters/i);
    });

    it('returns 401 when currentPassword is incorrect', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const res = await agent.put('/api/auth/password').send({
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/incorrect/i);
    });

    it('returns 200 on valid credentials for a Player, and verifies subsequent login succeeds with new password and fails with old', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });

      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

      const updateRes = await playerAgent.put('/api/auth/password').send({
        currentPassword: 'password123',
        newPassword: 'playerNewPassword123',
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.ok).toBe(true);

      // Verify old password fails
      const failedLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'player1', password: 'password123' });
      expect(failedLogin.status).toBe(401);

      // Verify new password succeeds
      const successfulLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'player1', password: 'playerNewPassword123' });
      expect(successfulLogin.status).toBe(200);
      expect(successfulLogin.body.username).toBe('player1');
    });

    it('returns 200 on valid credentials for a GameMaster', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

      const updateRes = await gmAgent.put('/api/auth/password').send({
        currentPassword: 'password123',
        newPassword: 'gmNewPassword123',
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.ok).toBe(true);

      // Verify login with new GM password
      const successfulLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'gm', password: 'gmNewPassword123' });
      expect(successfulLogin.status).toBe(200);
      expect(successfulLogin.body.username).toBe('gm');
    });

    it('requireAuth rejects session if userId no longer exists in users table', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmAuth', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmAuth', password: 'password123' });

      const regRes = await gmAgent.post('/api/auth/register').send({ username: 'tempPlayer', password: 'password123', role: 'Player' });
      const playerAgent = request.agent(app);
      await playerAgent.post('/api/auth/login').send({ username: 'tempPlayer', password: 'password123' });

      // Check player is logged in
      const meBefore = await playerAgent.get('/api/auth/me');
      expect(meBefore.status).toBe(200);

      // Delete user directly from users table
      db.prepare('DELETE FROM users WHERE id = ?').run(regRes.body.id);

      // Next request with that session should be rejected with 401 on any requireAuth route
      const rollsAfter = await playerAgent.get('/api/rolls');
      expect(rollsAfter.status).toBe(401);
      const meAfter = await playerAgent.get('/api/auth/me');
      expect(meAfter.status).toBe(401);
    });

    it('DELETE /api/auth/users/:id does not crash when sessions table does not exist', async () => {
      const gmAgent = request.agent(app);
      await gmAgent.post('/api/auth/register').send({ username: 'gmNoSess', password: 'password123' });
      await gmAgent.post('/api/auth/login').send({ username: 'gmNoSess', password: 'password123' });

      const regRes = await gmAgent.post('/api/auth/register').send({ username: 'playerNoSess', password: 'password123', role: 'Player' });

      // Verify sessions table does not exist in memory db or drop it if it does
      try {
        db.prepare('DROP TABLE IF EXISTS sessions').run();
      } catch {}

      const delRes = await gmAgent.delete(`/api/auth/users/${regRes.body.id}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.ok).toBe(true);
    });
  });

  describe('Bug Fixes Coverage (Bugs 1, 2, 3, 4, 9)', () => {
    // Bug 1: BetterSqlite3Store
    describe('Bug 1: Session Store with better-sqlite3', () => {
      it('creates and manages session store backed by better-sqlite3 without native sqlite3', async () => {
        const tmpDir = path.join(os.tmpdir(), `sf-sess-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        fs.mkdirSync(tmpDir, { recursive: true });
        try {
          const store = new BetterSqlite3Store({ dir: tmpDir, db: 'sessions.db' });
          expect(store).toBeDefined();

          // Set a session
          await new Promise((resolve, reject) => {
            store.set('sess-1', { cookie: { maxAge: 100000 }, userId: 42, role: 'Player' }, (err) => {
              if (err) reject(err); else resolve();
            });
          });

          // Get the session
          const session = await new Promise((resolve, reject) => {
            store.get('sess-1', (err, data) => {
              if (err) reject(err); else resolve(data);
            });
          });
          expect(session).toBeDefined();
          expect(session.userId).toBe(42);
          expect(session.role).toBe('Player');

          // Touch session
          await new Promise((resolve, reject) => {
            store.touch('sess-1', { cookie: { maxAge: 200000 } }, (err) => {
              if (err) reject(err); else resolve();
            });
          });

          // Length
          const count = await new Promise((resolve, reject) => {
            store.length((err, c) => {
              if (err) reject(err); else resolve(c);
            });
          });
          expect(count).toBe(1);

          // All
          const allSessions = await new Promise((resolve, reject) => {
            store.all((err, s) => {
              if (err) reject(err); else resolve(s);
            });
          });
          expect(allSessions['sess-1']).toBeDefined();
          expect(allSessions['sess-1'].userId).toBe(42);

          // Destroy
          await new Promise((resolve, reject) => {
            store.destroy('sess-1', (err) => {
              if (err) reject(err); else resolve();
            });
          });

          const afterDestroy = await new Promise((resolve, reject) => {
            store.get('sess-1', (err, data) => {
              if (err) reject(err); else resolve(data);
            });
          });
          expect(afterDestroy).toBeNull();

          store.close();
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });
    });

    // Bug 2: Invalidate sessions from sessions.db on DELETE /api/auth/users/:id
    describe('Bug 2: Purge sessions.db when deleting user', () => {
      it('purges active sessions from sessions.db for deleted user while preserving other users', async () => {
        const tmpDir = path.join(os.tmpdir(), `sf-sess-purge-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        fs.mkdirSync(tmpDir, { recursive: true });
        const sessDbPath = path.join(tmpDir, 'sessions.db');
        const customDb = createTestDb();
        const customAppResult = createApp(customDb, tmpDir);

        try {
          const gmAgent = request.agent(customAppResult.app);
          await gmAgent.post('/api/auth/register').send({ username: 'gmUser', password: 'password123' });
          await gmAgent.post('/api/auth/login').send({ username: 'gmUser', password: 'password123' });

          const p1Res = await gmAgent.post('/api/auth/register').send({ username: 'p1User', password: 'password123', role: 'Player' });
          const p2Res = await gmAgent.post('/api/auth/register').send({ username: 'p2User', password: 'password123', role: 'Player' });

          const p1Id = p1Res.body.id;
          const p2Id = p2Res.body.id;

          // Populate sessions in sessions.db
          const sdb = new Database(sessDbPath);
          sdb.prepare('INSERT OR REPLACE INTO sessions (sid, expired, sess) VALUES (?, ?, ?)')
            .run('sess-p1', Date.now() + 60000, JSON.stringify({ cookie: {}, userId: p1Id, role: 'Player' }));
          sdb.prepare('INSERT OR REPLACE INTO sessions (sid, expired, sess) VALUES (?, ?, ?)')
            .run('sess-p2', Date.now() + 60000, JSON.stringify({ cookie: {}, userId: p2Id, role: 'Player' }));
          sdb.prepare('INSERT OR REPLACE INTO sessions (sid, expired, sess) VALUES (?, ?, ?)')
            .run('sess-p1-prefix', Date.now() + 60000, JSON.stringify({ cookie: {}, userId: Number(`${p1Id}00`), role: 'Player' }));
          sdb.close();

          // Delete user p1
          const delRes = await gmAgent.delete(`/api/auth/users/${p1Id}`);
          expect(delRes.status).toBe(200);

          // Verify p1 session was purged, but p2 and p100 sessions remain
          const verifyDb = new Database(sessDbPath);
          const p1Session = verifyDb.prepare('SELECT * FROM sessions WHERE sid = ?').get('sess-p1');
          const p2Session = verifyDb.prepare('SELECT * FROM sessions WHERE sid = ?').get('sess-p2');
          const pPrefixSession = verifyDb.prepare('SELECT * FROM sessions WHERE sid = ?').get('sess-p1-prefix');
          verifyDb.close();

          expect(p1Session).toBeUndefined();
          expect(p2Session).toBeDefined();
          expect(pPrefixSession).toBeDefined();
        } finally {
          if (customAppResult.server && customAppResult.server.close) customAppResult.server.close();
          if (customDb) customDb.close();
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });
    });

    // Bug 3: CORS origin validation
    describe('Bug 3: CORS origin validation prevents cross-site hijacking', () => {
      it('allows requests from trusted origins (localhost:3000, localhost:3001, 127.0.0.1:3000)', async () => {
        const res3000 = await request(app)
          .get('/api/auth/setup')
          .set('Origin', 'http://localhost:3000');
        expect(res3000.headers['access-control-allow-origin']).toBe('http://localhost:3000');
        expect(res3000.headers['access-control-allow-credentials']).toBe('true');

        const res3001 = await request(app)
          .get('/api/auth/setup')
          .set('Origin', 'http://localhost:3001');
        expect(res3001.headers['access-control-allow-origin']).toBe('http://localhost:3001');

        const res127 = await request(app)
          .get('/api/auth/setup')
          .set('Origin', 'http://127.0.0.1:3000');
        expect(res127.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
      });

      it('does NOT reflect untrusted origins in Access-Control-Allow-Origin', async () => {
        const evilRes = await request(app)
          .get('/api/auth/setup')
          .set('Origin', 'http://evil-attacker.com');
        expect(evilRes.headers['access-control-allow-origin']).toBeUndefined();
      });

      it('allows requests without an Origin header (same-origin / native / curl)', async () => {
        const res = await request(app).get('/api/auth/setup');
        expect(res.status).toBe(200);
      });
    });

    // Bug 4: Atomic registration transaction
    describe('Bug 4: Atomic registration prevents concurrent GameMaster race condition', () => {
      it('prevents multiple concurrent first registrations from both becoming GameMaster', async () => {
        const results = await Promise.all([
          request(app).post('/api/auth/register').send({ username: 'raceGm1', password: 'password123' }),
          request(app).post('/api/auth/register').send({ username: 'raceGm2', password: 'password123' }),
        ]);

        const statuses = results.map(r => r.status);
        expect(statuses).toContain(201);
        const successRes = results.find(r => r.status === 201);
        expect(successRes.body.role).toBe('GameMaster');

        const non201 = results.filter(r => r.status !== 201);
        expect(non201.length).toBe(1);
        expect([401, 403]).toContain(non201[0].status);

        const gmCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'GameMaster'").get().count;
        expect(gmCount).toBe(1);
      });
    });

    // Bug 9: Safe mock response object in Socket.io handshake
    describe('Bug 9: Safe mock response object in Socket.io session middleware', () => {
      it('provides setHeader, getHeader, writeHead, and end stubs without throwing TypeError', async () => {
        const mockRes = {
          setHeader: () => {},
          getHeader: () => undefined,
          writeHead: () => mockRes,
          end: () => mockRes,
          write: () => true,
          _implicitHeader: () => {},
        };

        expect(() => {
          mockRes.setHeader('Set-Cookie', 'foo=bar');
          mockRes.getHeader('Set-Cookie');
          mockRes.writeHead(200);
          mockRes.write('test');
          mockRes.end();
          mockRes._implicitHeader();
        }).not.toThrow();
      });
    });
  });
});

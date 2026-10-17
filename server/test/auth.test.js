import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
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
  });
});

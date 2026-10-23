import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { createDb } from '../src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testUploadDir = path.join(__dirname, 'test_rolls_uploads');

describe('Rolls API & Sockets', () => {
  let app;
  let db;
  let io;
  let gmAgent;
  let playerAgent;

  beforeEach(async () => {
    db = createDb(':memory:');
    const appObj = createApp(db, ':memory:', testUploadDir);
    app = appObj.app;
    io = appObj.io;

    gmAgent = request.agent(app);
    playerAgent = request.agent(app);

    // Register GM
    await gmAgent.post('/api/auth/register').send({ username: 'gmUser', password: 'password123' });
    // Login GM
    await gmAgent.post('/api/auth/login').send({ username: 'gmUser', password: 'password123' });
    // Register Player
    await gmAgent.post('/api/auth/register').send({ username: 'playerUser', password: 'password123', role: 'Player' });
    // Login Player
    await playerAgent.post('/api/auth/login').send({ username: 'playerUser', password: 'password123' });
  });

  afterEach(() => {
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  it('requires authentication for GET, POST, and DELETE /api/rolls', async () => {
    const unauthAgent = request.agent(app);
    const getRes = await unauthAgent.get('/api/rolls?mode=rpg');
    expect(getRes.status).toBe(401);

    const postRes = await unauthAgent.post('/api/rolls').send({ mode: 'rpg', type: 'percentile', label: 'd%', total: 50, breakdown: '[Tens: 50, Ones: 0]' });
    expect(postRes.status).toBe(401);

    const delRes = await unauthAgent.delete('/api/rolls?mode=rpg');
    expect(delRes.status).toBe(401);
  });

  it('rejects POST /api/rolls with invalid or missing fields', async () => {
    const res1 = await playerAgent.post('/api/rolls').send({});
    expect(res1.status).toBe(400);

    const res2 = await playerAgent.post('/api/rolls').send({ mode: 'invalidMode', type: 'percentile', label: 'd%', total: 50, breakdown: 'test' });
    expect(res2.status).toBe(400);

    const res3 = await playerAgent.post('/api/rolls').send({ mode: 'rpg', type: 'unknownType', label: 'd%', total: 50, breakdown: 'test' });
    expect(res3.status).toBe(400);
  });

  it('rejects POST /api/rolls with NaN, Infinity, and non-finite numbers with 400', async () => {
    const resNaN = await playerAgent.post('/api/rolls').send({
      mode: 'rpg',
      type: 'percentile',
      label: 'd%',
      total: NaN,
      breakdown: 'test',
    });
    expect(resNaN.status).toBe(400);
    expect(resNaN.body.error).toBe('Invalid roll total: must be a finite number');

    const resInf = await playerAgent.post('/api/rolls').send({
      mode: 'rpg',
      type: 'percentile',
      label: 'd%',
      total: Infinity,
      breakdown: 'test',
    });
    expect(resInf.status).toBe(400);
    expect(resInf.body.error).toBe('Invalid roll total: must be a finite number');

    const resNegInf = await playerAgent.post('/api/rolls').send({
      mode: 'rpg',
      type: 'percentile',
      label: 'd%',
      total: -Infinity,
      breakdown: 'test',
    });
    expect(resNegInf.status).toBe(400);
    expect(resNegInf.body.error).toBe('Invalid roll total: must be a finite number');

    const resStr = await playerAgent.post('/api/rolls').send({
      mode: 'rpg',
      type: 'percentile',
      label: 'd%',
      total: 'fifty',
      breakdown: 'test',
    });
    expect(resStr.status).toBe(400);
    expect(resStr.body.error).toBe('Invalid roll total: must be a finite number');
  });

  it('creates a roll with authenticated user attribution and emits roll:created', async () => {
    let emittedEvent = null;
    io.on('connection', (sock) => {
      // capture emitted events
    });
    const originalEmit = io.emit.bind(io);
    io.emit = (event, data) => {
      if (event === 'roll:created') emittedEvent = data;
      return originalEmit(event, data);
    };

    const rollData = {
      mode: 'rpg',
      type: 'percentile',
      label: 'd%',
      total: 42,
      breakdown: '[Tens: 40, Ones: 2]',
      rollSummary: { total: 42, tens: 4, ones: 2, valid: true }
    };

    const res = await playerAgent.post('/api/rolls').send(rollData);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.username).toBe('playerUser');
    expect(res.body.role).toBe('Player');
    expect(res.body.mode).toBe('rpg');
    expect(res.body.total).toBe(42);
    expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(res.body.timestamp).toBe(res.body.createdAt);

    expect(emittedEvent).not.toBeNull();
    expect(emittedEvent.mode).toBe('rpg');
    expect(emittedEvent.roll.id).toBe(res.body.id);
    expect(emittedEvent.roll.username).toBe('playerUser');
    expect(emittedEvent.roll.createdAt).toBe(res.body.createdAt);
    expect(emittedEvent.roll.timestamp).toBe(res.body.createdAt);
  });

  it('lists rolls filtered by mode in descending chronological order', async () => {
    await playerAgent.post('/api/rolls').send({ mode: 'rpg', type: 'percentile', label: 'd%', total: 10, breakdown: 'ten' });
    await playerAgent.post('/api/rolls').send({ mode: 'space', type: 'damage', label: '2d10', total: 15, breakdown: '[7, 8]' });
    await gmAgent.post('/api/rolls').send({ mode: 'rpg', type: 'percentile', label: 'd%', total: 99, breakdown: 'ninety-nine' });

    const rpgRes = await playerAgent.get('/api/rolls?mode=rpg');
    expect(rpgRes.status).toBe(200);
    expect(rpgRes.body.length).toBe(2);
    expect(rpgRes.body[0].total).toBe(99);
    expect(rpgRes.body[0].username).toBe('gmUser');
    expect(rpgRes.body[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(rpgRes.body[0].timestamp).toBe(rpgRes.body[0].createdAt);
    expect(rpgRes.body[1].total).toBe(10);
    expect(rpgRes.body[1].username).toBe('playerUser');

    const spaceRes = await playerAgent.get('/api/rolls?mode=space');
    expect(spaceRes.status).toBe(200);
    expect(spaceRes.body.length).toBe(1);
    expect(spaceRes.body[0].total).toBe(15);
  });

  it('rejects DELETE /api/rolls from Player with 403, allows GM and emits roll:cleared', async () => {
    await playerAgent.post('/api/rolls').send({ mode: 'rpg', type: 'percentile', label: 'd%', total: 10, breakdown: 'ten' });

    const playerDel = await playerAgent.delete('/api/rolls?mode=rpg');
    expect(playerDel.status).toBe(403);

    let clearedEvent = null;
    const originalEmit = io.emit.bind(io);
    io.emit = (event, data) => {
      if (event === 'roll:cleared') clearedEvent = data;
      return originalEmit(event, data);
    };

    const gmDel = await gmAgent.delete('/api/rolls?mode=rpg');
    expect(gmDel.status).toBe(200);
    expect(gmDel.body.success).toBe(true);
    expect(clearedEvent).toEqual({ mode: 'rpg' });

    const getRes = await playerAgent.get('/api/rolls?mode=rpg');
    expect(getRes.status).toBe(200);
    expect(getRes.body.length).toBe(0);
  });

  it('rejects GET and DELETE /api/rolls with invalid or missing mode query parameter', async () => {
    const getRes1 = await playerAgent.get('/api/rolls');
    expect(getRes1.status).toBe(400);

    const getRes2 = await playerAgent.get('/api/rolls?mode=cyberpunk');
    expect(getRes2.status).toBe(400);

    const delRes1 = await gmAgent.delete('/api/rolls');
    expect(delRes1.status).toBe(400);

    const delRes2 = await gmAgent.delete('/api/rolls?mode=cyberpunk');
    expect(delRes2.status).toBe(400);
  });

  it('prunes entries older than latest 100 per mode', async () => {
    // Insert 105 rolls for rpg mode directly or via loop
    const insertStmt = db.prepare(`
      INSERT INTO roll_logs (mode, user_id, username, role, type, label, total, breakdown)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 1; i <= 100; i++) {
      insertStmt.run('rpg', 1, 'gmUser', 'GameMaster', 'percentile', `d% #${i}`, i, `roll ${i}`);
    }

    // Now insert via POST to trigger pruning
    await playerAgent.post('/api/rolls').send({
      mode: 'rpg',
      type: 'percentile',
      label: 'd% #101',
      total: 100,
      breakdown: 'roll 101'
    });

    const count = db.prepare('SELECT COUNT(*) as count FROM roll_logs WHERE mode = ?').get('rpg').count;
    expect(count).toBe(100);
  });

  it('safely handles corrupted roll_summary without throwing 500 error', async () => {
    // Insert a roll record with corrupted JSON in roll_summary
    db.prepare(`
      INSERT INTO roll_logs (mode, user_id, username, role, type, label, total, breakdown, roll_summary)
      VALUES ('rpg', 1, 'gmUser', 'GameMaster', 'percentile', 'Corrupted Roll', 42, 'bad json', '{invalid: json')
    `).run();

    const res = await playerAgent.get('/api/rolls?mode=rpg');
    expect(res.status).toBe(200);
    const corrupted = res.body.find(r => r.label === 'Corrupted Roll');
    expect(corrupted).toBeDefined();
    expect(corrupted.rollSummary).toEqual({});
  });

  it('Bug 13: validates roll bounds and parameter validation', async () => {
    // Percentile < 1 rejected
    const resLowPct = await playerAgent.post('/api/rolls').send({
      mode: 'rpg',
      type: 'percentile',
      label: 'd%',
      total: 0,
      breakdown: '0'
    });
    expect(resLowPct.status).toBe(400);

    // Percentile > 100 rejected
    const resHighPct = await playerAgent.post('/api/rolls').send({
      mode: 'rpg',
      type: 'percentile',
      label: 'd%',
      total: 101,
      breakdown: '101'
    });
    expect(resHighPct.status).toBe(400);

    // Damage < 0 rejected
    const resNegDamage = await playerAgent.post('/api/rolls').send({
      mode: 'rpg',
      type: 'damage',
      label: '1d10',
      total: -1,
      breakdown: '-1'
    });
    expect(resNegDamage.status).toBe(400);

    // Invalid dice parameter in rollSummary rejected
    const resBadDice = await playerAgent.post('/api/rolls').send({
      mode: 'rpg',
      type: 'damage',
      label: '1d10',
      total: 5,
      breakdown: '5',
      rollSummary: { dice: [NaN] }
    });
    expect(resBadDice.status).toBe(400);

    // Valid percentile total (1 and 100) and damage (0) accepted
    const resValid1 = await playerAgent.post('/api/rolls').send({
      mode: 'rpg',
      type: 'percentile',
      label: 'd%',
      total: 1,
      breakdown: '1'
    });
    expect(resValid1.status).toBe(201);

    const resValid100 = await playerAgent.post('/api/rolls').send({
      mode: 'rpg',
      type: 'percentile',
      label: 'd%',
      total: 100,
      breakdown: '100'
    });
    expect(resValid100.status).toBe(201);

    const resValidDmg = await playerAgent.post('/api/rolls').send({
      mode: 'rpg',
      type: 'damage',
      label: '0 dmg',
      total: 0,
      breakdown: '0'
    });
    expect(resValidDmg.status).toBe(201);
  });
});

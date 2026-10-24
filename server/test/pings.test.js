import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { io as ioClient } from 'socket.io-client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createApp } from '../src/index.js';
import { createDb } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function waitForEvent(socket, eventName, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event "${eventName}"`));
    }, timeout);
    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe('Real-time VTT Pings Socket API', () => {
  let db;
  let app;
  let server;
  let io;
  let tempSessionDir;
  let tempUploadDir;
  let serverPort;
  let gmSocket;
  let player1Socket;
  let player2Socket;
  let gmUser;
  let player1User;
  let player2User;

  beforeEach(async () => {
    db = createDb(':memory:');
    tempSessionDir = path.join(__dirname, 'fixtures', `temp_pings_session_${Date.now()}_${Math.random()}`);
    tempUploadDir = path.join(__dirname, 'fixtures', `temp_pings_upload_${Date.now()}_${Math.random()}`);
    fs.mkdirSync(tempSessionDir, { recursive: true });
    fs.mkdirSync(tempUploadDir, { recursive: true });

    const created = createApp(db, tempSessionDir, tempUploadDir);
    app = created.app;
    server = created.server;
    io = created.io;

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        resolve();
      });
    });

    const gmAgent = request.agent(app);
    const p1Agent = request.agent(app);
    const p2Agent = request.agent(app);

    // Register GM (first user) and login
    const gmReg = await gmAgent.post('/api/auth/register').send({ username: 'GM_Alice', password: 'password123' });
    gmUser = gmReg.body;
    const gmLogin = await gmAgent.post('/api/auth/login').send({ username: 'GM_Alice', password: 'password123' });
    const gmCookie = gmLogin.headers['set-cookie']?.map((c) => c.split(';')[0]).join('; ');

    // Register Player 1 and login
    const p1Reg = await gmAgent.post('/api/auth/register').send({ username: 'Player_Bob', password: 'password123', role: 'Player' });
    player1User = p1Reg.body;
    const p1Login = await p1Agent.post('/api/auth/login').send({ username: 'Player_Bob', password: 'password123' });
    const p1Cookie = p1Login.headers['set-cookie']?.map((c) => c.split(';')[0]).join('; ');

    // Register Player 2 and login
    const p2Reg = await gmAgent.post('/api/auth/register').send({ username: 'Player_Charlie', password: 'password123', role: 'Player' });
    player2User = p2Reg.body;
    const p2Login = await p2Agent.post('/api/auth/login').send({ username: 'Player_Charlie', password: 'password123' });
    const p2Cookie = p2Login.headers['set-cookie']?.map((c) => c.split(';')[0]).join('; ');

    const socketUrl = `http://127.0.0.1:${serverPort}`;

    gmSocket = ioClient(socketUrl, {
      extraHeaders: { cookie: gmCookie },
      transports: ['websocket'],
    });

    player1Socket = ioClient(socketUrl, {
      extraHeaders: { cookie: p1Cookie },
      transports: ['websocket'],
    });

    player2Socket = ioClient(socketUrl, {
      extraHeaders: { cookie: p2Cookie },
      transports: ['websocket'],
    });

    await Promise.all([
      waitForEvent(gmSocket, 'connect'),
      waitForEvent(player1Socket, 'connect'),
      waitForEvent(player2Socket, 'connect'),
    ]);
  });

  afterEach(async () => {
    if (gmSocket?.connected) gmSocket.disconnect();
    if (player1Socket?.connected) player1Socket.disconnect();
    if (player2Socket?.connected) player2Socket.disconnect();

    await new Promise((resolve) => {
      server.close(() => resolve());
    });

    try {
      fs.rmSync(tempSessionDir, { recursive: true, force: true });
      fs.rmSync(tempUploadDir, { recursive: true, force: true });
    } catch {}
    if (db) db.close();
  });

  it('broadcasts ping:updated with sanitized coordinates, username, and isDragging state', async () => {
    const updatePromise = waitForEvent(gmSocket, 'ping:updated');

    player1Socket.emit('ping:update', {
      mapId: 'map-alpha',
      x: 150.5,
      y: 300.25,
      isDragging: true,
    });

    const received = await updatePromise;
    expect(received.mapId).toBe('map-alpha');
    expect(received.ping).toBeDefined();
    expect(received.ping.userId).toBe(player1User.id);
    expect(received.ping.username).toBe('Player_Bob');
    expect(received.ping.x).toBe(150.5);
    expect(received.ping.y).toBe(300.25);
    expect(received.ping.isDragging).toBe(true);
    expect(typeof received.ping.updatedAt).toBe('number');
  });

  it('ignores ping:update with non-finite coordinates or invalid mapId', async () => {
    let eventFired = false;
    gmSocket.on('ping:updated', () => {
      eventFired = true;
    });

    player1Socket.emit('ping:update', {
      mapId: 'map-alpha',
      x: NaN,
      y: 100,
    });

    player1Socket.emit('ping:update', {
      mapId: '',
      x: 100,
      y: 100,
    });

    player1Socket.emit('ping:update', {
      mapId: 'map-alpha',
      x: Infinity,
      y: 100,
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(eventFired).toBe(false);
  });

  it('allows players to clear their own ping and broadcasts ping:cleared', async () => {
    // Player 1 updates ping first
    player1Socket.emit('ping:update', {
      mapId: 'map-alpha',
      x: 200,
      y: 200,
      isDragging: false,
    });
    await waitForEvent(player2Socket, 'ping:updated');

    // Player 1 clears their own ping
    const clearPromise = waitForEvent(player2Socket, 'ping:cleared');
    player1Socket.emit('ping:clear', {
      mapId: 'map-alpha',
    });

    const cleared = await clearPromise;
    expect(cleared.mapId).toBe('map-alpha');
    expect(cleared.userId).toBe(player1User.id);
  });

  it('rejects non-GM player attempts to clear another player\'s ping or clear all', async () => {
    // Player 1 sets ping
    player1Socket.emit('ping:update', {
      mapId: 'map-alpha',
      x: 200,
      y: 200,
      isDragging: false,
    });
    await waitForEvent(player2Socket, 'ping:updated');

    let clearedFired = false;
    player1Socket.on('ping:cleared', () => {
      clearedFired = true;
    });

    // Player 2 attempts to clear Player 1's ping
    player2Socket.emit('ping:clear', {
      mapId: 'map-alpha',
      targetUserId: player1User.id,
    });

    // Player 2 attempts to clear all pings
    player2Socket.emit('ping:clear', {
      mapId: 'map-alpha',
      all: true,
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(clearedFired).toBe(false);
  });

  it('allows GM to clear any player\'s ping or clear all pings on a map', async () => {
    // Player 1 and Player 2 set pings
    player1Socket.emit('ping:update', { mapId: 'map-alpha', x: 100, y: 100, isDragging: false });
    await waitForEvent(gmSocket, 'ping:updated');

    player2Socket.emit('ping:update', { mapId: 'map-alpha', x: 200, y: 200, isDragging: false });
    await waitForEvent(gmSocket, 'ping:updated');

    // GM clears Player 1's ping
    const p1ClearPromise = waitForEvent(player2Socket, 'ping:cleared');
    gmSocket.emit('ping:clear', {
      mapId: 'map-alpha',
      targetUserId: player1User.id,
    });

    const p1Cleared = await p1ClearPromise;
    expect(p1Cleared.mapId).toBe('map-alpha');
    expect(p1Cleared.userId).toBe(player1User.id);

    // GM clears all pings on map-alpha
    const allClearPromise = waitForEvent(player2Socket, 'ping:cleared');
    gmSocket.emit('ping:clear', {
      mapId: 'map-alpha',
      all: true,
    });

    const allCleared = await allClearPromise;
    expect(allCleared.mapId).toBe('map-alpha');
    expect(allCleared.all).toBe(true);
  });

  it('returns all active pings on map for ping:request_sync', async () => {
    // Player 1 and GM set pings
    player1Socket.emit('ping:update', { mapId: 'map-sync', x: 120, y: 240, isDragging: false });
    await waitForEvent(gmSocket, 'ping:updated');

    gmSocket.emit('ping:update', { mapId: 'map-sync', x: 500, y: 600, isDragging: true });
    await waitForEvent(player1Socket, 'ping:updated');

    // Player 2 requests sync
    const syncPromise = waitForEvent(player2Socket, 'pings:sync');
    player2Socket.emit('ping:request_sync', { mapId: 'map-sync' });

    const syncResult = await syncPromise;
    expect(syncResult.mapId).toBe('map-sync');
    expect(Array.isArray(syncResult.pings)).toBe(true);
    expect(syncResult.pings.length).toBe(2);

    const p1Ping = syncResult.pings.find((p) => p.userId === player1User.id);
    const gmPing = syncResult.pings.find((p) => p.userId === gmUser.id);
    expect(p1Ping).toBeDefined();
    expect(p1Ping.username).toBe('Player_Bob');
    expect(p1Ping.x).toBe(120);
    expect(p1Ping.y).toBe(240);

    expect(gmPing).toBeDefined();
    expect(gmPing.username).toBe('GM_Alice');
    expect(gmPing.x).toBe(500);
    expect(gmPing.y).toBe(600);
    expect(gmPing.isDragging).toBe(true);
  });

  it('automatically clears active ping and broadcasts ping:cleared when socket disconnects', async () => {
    player1Socket.emit('ping:update', { mapId: 'map-dc', x: 400, y: 500, isDragging: false });
    await waitForEvent(player2Socket, 'ping:updated');

    const clearPromise = waitForEvent(player2Socket, 'ping:cleared');
    player1Socket.disconnect();

    const cleared = await clearPromise;
    expect(cleared.mapId).toBe('map-dc');
    expect(cleared.userId).toBe(player1User.id);
  });
});

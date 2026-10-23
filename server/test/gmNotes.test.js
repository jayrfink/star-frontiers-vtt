import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';

describe('GM Notes API (/api/gm-notes)', () => {
  let db, app, server, gmAgent, playerAgent;

  beforeEach(async () => {
    db = createTestDb();
    const result = createApp(db, ':memory:');
    app = result.app;
    server = result.server;

    gmAgent = request.agent(app);
    await gmAgent.post('/api/auth/register').send({ username: 'gm_notes_user', password: 'password123' });
    await gmAgent.post('/api/auth/login').send({ username: 'gm_notes_user', password: 'password123' });

    playerAgent = request.agent(app);
    await gmAgent.post('/api/auth/register').send({ username: 'player_notes_user', password: 'password123' });
    await playerAgent.post('/api/auth/login').send({ username: 'player_notes_user', password: 'password123' });
  });

  afterEach(() => {
    if (db) db.close();
    if (server && server.close) server.close();
  });

  it('denies unauthenticated (401) and Player (403) access to /api/gm-notes', async () => {
    const unauthRes = await request(app).get('/api/gm-notes/sessions');
    expect(unauthRes.status).toBe(401);

    const playerRes = await playerAgent.get('/api/gm-notes/sessions');
    expect(playerRes.status).toBe(403);
  });

  it('auto-seeds a default Session 1 with "Introduction" and "Part 1" panels on first GET', async () => {
    const sessionsRes = await gmAgent.get('/api/gm-notes/sessions');
    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body).toHaveLength(1);
    expect(sessionsRes.body[0].title).toBe('Session 1');

    const sessionId = sessionsRes.body[0].id;
    const panelsRes = await gmAgent.get(`/api/gm-notes/sessions/${sessionId}/panels`);
    expect(panelsRes.status).toBe(200);
    expect(panelsRes.body).toHaveLength(2);
    expect(panelsRes.body[0].title).toBe('Introduction');
    expect(panelsRes.body[1].title).toBe('Part 1');
  });

  it('allows GM to create, rename, and delete sessions and note panels', async () => {
    // Create new session
    const createSessionRes = await gmAgent
      .post('/api/gm-notes/sessions')
      .send({ title: 'Session 2: Escape from Volturnus' });
    expect(createSessionRes.status).toBe(201);
    const sessionId = createSessionRes.body.id;
    expect(createSessionRes.body.title).toBe('Session 2: Escape from Volturnus');

    // Rename session
    const renameSessionRes = await gmAgent
      .put(`/api/gm-notes/sessions/${sessionId}`)
      .send({ title: 'Session 2: Sathar Ambush' });
    expect(renameSessionRes.status).toBe(200);
    expect(renameSessionRes.body.title).toBe('Session 2: Sathar Ambush');

    // Create note panel
    const createPanelRes = await gmAgent
      .post(`/api/gm-notes/sessions/${sessionId}/panels`)
      .send({ title: 'Adversaries to Spawn', content: '3x Sathar Shock Troopers (Tier 2)' });
    expect(createPanelRes.status).toBe(201);
    const panelId = createPanelRes.body.id;
    expect(createPanelRes.body.title).toBe('Adversaries to Spawn');
    expect(createPanelRes.body.content).toBe('3x Sathar Shock Troopers (Tier 2)');

    // Update note panel title and content
    const updatePanelRes = await gmAgent
      .put(`/api/gm-notes/panels/${panelId}`)
      .send({ title: 'Part 2: Docking Bay', content: 'Readout: The airlock hisses open...' });
    expect(updatePanelRes.status).toBe(200);
    expect(updatePanelRes.body.title).toBe('Part 2: Docking Bay');
    expect(updatePanelRes.body.content).toBe('Readout: The airlock hisses open...');

    // Delete note panel
    const deletePanelRes = await gmAgent.delete(`/api/gm-notes/panels/${panelId}`);
    expect(deletePanelRes.status).toBe(200);
    expect(deletePanelRes.body.ok).toBe(true);

    // Delete session
    const deleteSessionRes = await gmAgent.delete(`/api/gm-notes/sessions/${sessionId}`);
    expect(deleteSessionRes.status).toBe(200);
    expect(deleteSessionRes.body.ok).toBe(true);
  });

  it('does not coerce null title or null content to string "null"', async () => {
    const sessionRes = await gmAgent.post('/api/gm-notes/sessions').send({ title: 'Null Test Session' });
    const sessionId = sessionRes.body.id;

    const panelRes = await gmAgent.post(`/api/gm-notes/sessions/${sessionId}/panels`).send({
      title: 'Initial Title',
      content: 'Initial Content',
    });
    const panelId = panelRes.body.id;

    // Send null for title and null for content
    const updateRes = await gmAgent.put(`/api/gm-notes/panels/${panelId}`).send({
      title: null,
      content: null,
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).not.toBe('null');
    expect(updateRes.body.title).toBe('Initial Title'); // keeps existing or fallback
    expect(updateRes.body.content).not.toBe('null');
    expect(updateRes.body.content).toBe(''); // cleared to empty string, never "null"
  });
});

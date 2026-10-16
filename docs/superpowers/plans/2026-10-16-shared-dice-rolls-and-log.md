# Shared Dice Rolls and Roll Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize dice rolls and roll logs in real-time across connected Players and Game Masters in RPG VTT and Space VTT, with roller attribution, server-side session persistence, and GM-only log clearing.

**Architecture:** A lightweight SQLite table `roll_logs` stores roll history per VTT mode (`rpg` vs `space`). An Express REST router (`/api/rolls`) handles authenticated fetching, posting, and GM clearing of rolls, broadcasting changes instantly via Socket.io (`roll:created`, `roll:cleared`). The VTT views (`RpgVttView.vue`, `SpaceVttView.vue`) throw 3D dice for the local roller, broadcast via the REST API, and display peer rolls in the floating HUD banner with roller attribution and an updated shared Roll Log.

**Tech Stack:** Node.js, Express, Socket.io, SQLite3 / Better-SQLite3, Vue 3, Pinia, Vitest, Supertest.

## Global Constraints

- Run all test and build commands in container: `docker exec sf-vtt-dev bash -c "<command>"`
- Server tests: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
- Client tests: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SharedRolls.test.js && npm run build"`
- Full client suite: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run"`
- Maintain strict decoupling between RPG VTT and Space VTT views (do not introduce shared helpers or common state).
- 3D dice physics canvas (`#dice-box`) only rolls on the screen of the user who initiated the roll; peer screens show the HUD banner and shared Roll Log.
- Clear log is GM-only (`role === 'GameMaster'`); players cannot clear the shared roll log.
- RPG VTT and Space VTT maintain distinct, isolated roll logs (`mode = 'rpg'` vs `mode = 'space'`).

---

### Task 1: Backend Database Schema, REST Router, and Sockets

**Files:**
- Modify: `server/src/db.js`
- Create: `server/src/rolls.js`
- Modify: `server/src/index.js`
- Test: `server/test/rolls.test.js`

**Interfaces:**
- Produces:
  - Table: `roll_logs` in SQLite (`id`, `mode`, `user_id`, `username`, `role`, `type`, `label`, `total`, `breakdown`, `roll_summary`, `created_at`)
  - Router: `createRollRouter(db, io)` mounted at `/api/rolls`
  - Endpoints:
    - `GET /api/rolls?mode=rpg|space`
    - `POST /api/rolls` (`mode`, `type`, `label`, `total`, `breakdown`, `rollSummary`)
    - `DELETE /api/rolls?mode=rpg|space`
  - Socket events:
    - `roll:created`: `{ mode, roll: { id, mode, userId, username, role, type, label, total, breakdown, rollSummary, timestamp, createdAt } }`
    - `roll:cleared`: `{ mode }`

- [ ] **Step 1: Write the failing server tests**

Create `server/test/rolls.test.js`:
```js
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

    expect(emittedEvent).not.toBeNull();
    expect(emittedEvent.mode).toBe('rpg');
    expect(emittedEvent.roll.id).toBe(res.body.id);
    expect(emittedEvent.roll.username).toBe('playerUser');
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
});
```

- [ ] **Step 2: Run server test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/rolls.test.js"`
Expected: FAIL (route `/api/rolls` not found or 404)

- [ ] **Step 3: Update `server/src/db.js` with `roll_logs` schema**

In `server/src/db.js`:
Add table creation and index to `createDb(dbPath)`:
```javascript
  db.exec(`
    CREATE TABLE IF NOT EXISTS roll_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK(mode IN ('rpg', 'space')),
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('percentile', 'damage')),
      label TEXT NOT NULL,
      total INTEGER NOT NULL,
      breakdown TEXT NOT NULL,
      roll_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_roll_logs_mode_created ON roll_logs(mode, created_at DESC);
  `);
```

- [ ] **Step 4: Create `server/src/rolls.js` and mount in `server/src/index.js`**

Create `server/src/rolls.js`:
```javascript
import { Router } from 'express';
import { requireAuth, requireGM } from './middleware.js';

export function createRollRouter(db, io) {
  const router = Router();

  // GET /api/rolls?mode=rpg|space
  router.get('/', requireAuth, (req, res) => {
    const mode = req.query.mode;
    if (mode !== 'rpg' && mode !== 'space') {
      return res.status(400).json({ error: 'Valid mode ("rpg" or "space") is required' });
    }

    try {
      const rows = db.prepare(`
        SELECT id, mode, user_id AS userId, username, role, type, label, total, breakdown, roll_summary AS rollSummary, created_at AS createdAt
        FROM roll_logs
        WHERE mode = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 20
      `).all(mode);

      const formatted = rows.map(r => ({
        ...r,
        rollSummary: r.rollSummary ? JSON.parse(r.rollSummary) : {},
        timestamp: r.createdAt ? r.createdAt.split(' ')[1] || r.createdAt : ''
      }));

      res.json(formatted);
    } catch (err) {
      console.error('Failed to get rolls:', err);
      res.status(500).json({ error: 'Failed to retrieve rolls' });
    }
  });

  // POST /api/rolls
  router.post('/', requireAuth, (req, res) => {
    const { mode, type, label, total, breakdown, rollSummary } = req.body;

    if (mode !== 'rpg' && mode !== 'space') {
      return res.status(400).json({ error: 'Valid mode ("rpg" or "space") is required' });
    }
    if (type !== 'percentile' && type !== 'damage') {
      return res.status(400).json({ error: 'Valid type ("percentile" or "damage") is required' });
    }
    if (!label || typeof total !== 'number' || typeof breakdown !== 'string') {
      return res.status(400).json({ error: 'label, numeric total, and breakdown are required' });
    }

    try {
      const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const summaryStr = rollSummary ? JSON.stringify(rollSummary) : null;
      const stmt = db.prepare(`
        INSERT INTO roll_logs (mode, user_id, username, role, type, label, total, breakdown, roll_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(mode, user.id, user.username, user.role, type, label, total, breakdown, summaryStr);

      const inserted = db.prepare(`
        SELECT id, mode, user_id AS userId, username, role, type, label, total, breakdown, roll_summary AS rollSummary, created_at AS createdAt
        FROM roll_logs WHERE id = ?
      `).get(info.lastInsertRowid);

      // Prune entries older than latest 100 per mode
      db.prepare(`
        DELETE FROM roll_logs
        WHERE mode = ? AND id NOT IN (
          SELECT id FROM roll_logs WHERE mode = ? ORDER BY created_at DESC, id DESC LIMIT 100
        )
      `).run(mode, mode);

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      const rollPayload = {
        id: inserted.id,
        mode: inserted.mode,
        userId: inserted.userId,
        username: inserted.username,
        role: inserted.role,
        type: inserted.type,
        label: inserted.label,
        total: inserted.total,
        breakdown: inserted.breakdown,
        rollSummary: inserted.rollSummary ? JSON.parse(inserted.rollSummary) : {},
        timestamp: timeStr,
        createdAt: inserted.createdAt
      };

      if (io) {
        io.emit('roll:created', { mode, roll: rollPayload });
      }

      res.status(201).json(rollPayload);
    } catch (err) {
      console.error('Failed to create roll:', err);
      res.status(500).json({ error: 'Failed to record roll' });
    }
  });

  // DELETE /api/rolls?mode=rpg|space (GM only)
  router.delete('/', requireGM(db), (req, res) => {
    const mode = req.query.mode;
    if (mode !== 'rpg' && mode !== 'space') {
      return res.status(400).json({ error: 'Valid mode ("rpg" or "space") is required' });
    }

    try {
      db.prepare('DELETE FROM roll_logs WHERE mode = ?').run(mode);

      if (io) {
        io.emit('roll:cleared', { mode });
      }

      res.json({ success: true, mode });
    } catch (err) {
      console.error('Failed to clear rolls:', err);
      res.status(500).json({ error: 'Failed to clear rolls' });
    }
  });

  return router;
}
```

In `server/src/index.js`:
Import `createRollRouter` and mount:
```javascript
import { createRollRouter } from './rolls.js';
...
app.use('/api/rolls', createRollRouter(db, io));
```

- [ ] **Step 5: Run server tests to verify they pass**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: All tests pass (including new `server/test/rolls.test.js`).

- [ ] **Step 6: Commit backend changes**

```bash
git add server/src/db.js server/src/rolls.js server/src/index.js server/test/rolls.test.js
git commit -m "feat(server): add roll_logs table, api endpoints, and socket broadcasting"
```

---

### Task 2: Frontend Integration in RPG VTT, Space VTT, and Client Tests

**Files:**
- Modify: `client/src/views/RpgVttView.vue`
- Modify: `client/src/views/SpaceVttView.vue`
- Create: `client/test/SharedRolls.test.js`

**Interfaces:**
- Consumes:
  - `GET /api/rolls?mode=rpg|space`
  - `POST /api/rolls` (`mode`, `type`, `label`, `total`, `breakdown`, `rollSummary`)
  - `DELETE /api/rolls?mode=rpg|space`
  - Socket: `roll:created`, `roll:cleared`
- Produces:
  - Synchronized roll log in `RpgVttView` and `SpaceVttView`
  - Peer roll banner popup displaying roller's name & role badge
  - Roll log item roller attribution badge
  - GM-only Clear button functionality

- [ ] **Step 1: Write the failing client tests**

Create `client/test/SharedRolls.test.js`:
```js
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Shared Rolls & Roll Log Integration', () => {
  const rpgViewPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const spaceViewPath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const rpgContent = fs.readFileSync(rpgViewPath, 'utf8');
  const spaceContent = fs.readFileSync(spaceViewPath, 'utf8');

  it('RPG VTT registers socket listeners for roll:created and roll:cleared', () => {
    expect(rpgContent).toContain("socket.on('roll:created'");
    expect(rpgContent).toContain("socket.on('roll:cleared'");
    expect(rpgContent).toContain("socket.off('roll:created')");
    expect(rpgContent).toContain("socket.off('roll:cleared')");
  });

  it('Space VTT registers socket listeners for roll:created and roll:cleared', () => {
    expect(spaceContent).toContain("socket.on('roll:created'");
    expect(spaceContent).toContain("socket.on('roll:cleared'");
    expect(spaceContent).toContain("socket.off('roll:created')");
    expect(spaceContent).toContain("socket.off('roll:cleared')");
  });

  it('fetches roll history from /api/rolls on mount instead of relying solely on localStorage', () => {
    expect(rpgContent).toContain('/api/rolls?mode=rpg');
    expect(spaceContent).toContain('/api/rolls?mode=space');
  });

  it('posts rolls to /api/rolls when rolling percentile or damage', () => {
    expect(rpgContent).toContain("method: 'POST'");
    expect(rpgContent).toContain("body: JSON.stringify");
    expect(rpgContent).toContain("mode: 'rpg'");

    expect(spaceContent).toContain("method: 'POST'");
    expect(spaceContent).toContain("body: JSON.stringify");
    expect(spaceContent).toContain("mode: 'space'");
  });

  it('restricts the Clear button to Game Masters', () => {
    expect(rpgContent).toMatch(/v-if="isGm"[^>]*class="btn-roll-log-clear"/);
    expect(spaceContent).toMatch(/v-if="isGm"[^>]*class="btn-roll-log-clear"/);
  });

  it('renders roller username and role badge in Roll Log HUD', () => {
    expect(rpgContent).toContain('roll-user-badge');
    expect(rpgContent).toContain('item.username');
    expect(spaceContent).toContain('roll-user-badge');
    expect(spaceContent).toContain('item.username');
  });

  it('renders roller username and role badge in floating HUD banners', () => {
    expect(rpgContent).toContain('lastPercentileRoll.username');
    expect(rpgContent).toContain('lastDamageRoll.username');
    expect(spaceContent).toContain('lastPercentileRoll.username');
    expect(spaceContent).toContain('lastDamageRoll.username');
  });
});
```

- [ ] **Step 2: Run client test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SharedRolls.test.js"`
Expected: FAIL (socket listeners, API calls, user badges not found)

- [ ] **Step 3: Implement shared rolls in `client/src/views/RpgVttView.vue`**

1. In HUD Banners template (`RpgVttView.vue`):
Update `.damage-hud-banner` and `.percentile-hud-banner` header to display roller username & badge:
```html
        <!-- Damage HUD Banner -->
        <transition name="hud-banner">
          <div v-if="showDamageHud && lastDamageRoll" class="damage-hud-banner" @click="showDamageHud = false">
            <div class="hud-header">
              <div class="hud-title">
                <span v-if="lastDamageRoll.username" class="hud-user-tag" :class="lastDamageRoll.role?.toLowerCase()">
                  {{ lastDamageRoll.role === 'GameMaster' ? 'GM' : 'PLAYER' }} {{ lastDamageRoll.username }}
                </span>
                Damage Roll ({{ lastDamageRoll.count }}d10)
              </div>
              <button class="hud-close" @click.stop="showDamageHud = false">&times;</button>
            </div>
            ...
```
And similarly for `.percentile-hud-banner`:
```html
        <!-- Percentile HUD Banner -->
        <transition name="hud-banner">
          <div v-if="showPercentileHud && lastPercentileRoll" class="percentile-hud-banner" @click="showPercentileHud = false">
            <div class="hud-header">
              <div class="hud-title">
                <span v-if="lastPercentileRoll.username" class="hud-user-tag" :class="lastPercentileRoll.role?.toLowerCase()">
                  {{ lastPercentileRoll.role === 'GameMaster' ? 'GM' : 'PLAYER' }} {{ lastPercentileRoll.username }}
                </span>
                Percentile Roll (d%)
              </div>
              <button class="hud-close" @click.stop="showPercentileHud = false">&times;</button>
            </div>
            ...
```

2. In Roll Log template (`RpgVttView.vue`):
Update Clear button to `v-if="isGm"`:
```html
<button v-if="isGm" type="button" class="btn-roll-log-clear" @click="clearRollLog" :disabled="rollLog.length === 0" title="Clear log">Clear</button>
```
In `ul.roll-log-list` items:
```html
<li v-for="item in rollLog" :key="item.id" class="roll-log-item" :class="item.type">
  <div class="roll-item-header">
    <span v-if="item.username" class="roll-user-badge" :class="item.role?.toLowerCase()">
      {{ item.username }}
    </span>
    <span class="roll-item-time">{{ item.timestamp }}</span>
    <span class="roll-item-badge">{{ item.label }}</span>
  </div>
  ...
```

3. In script (`RpgVttView.vue`):
Add `fetchRollLog()`, post roll helper `sendRollToServer(entry)`, update `clearRollLog()`, update `rollPercentile()` and `rollDamage()` to post to server:
```javascript
async function fetchRollLog() {
  try {
    const res = await fetch('/api/rolls?mode=rpg', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      rollLog.value = data;
    }
  } catch (err) {
    console.error('Failed to fetch RPG roll log:', err);
  }
}

async function sendRollToServer(rollData) {
  try {
    const res = await fetch('/api/rolls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        mode: 'rpg',
        type: rollData.type,
        label: rollData.label,
        total: rollData.total,
        breakdown: rollData.breakdown,
        rollSummary: rollData.rollSummary
      })
    });
    if (res.ok) {
      const savedRoll = await res.json();
      if (!rollLog.value.some(r => r.id === savedRoll.id)) {
        rollLog.value.unshift(savedRoll);
        if (rollLog.value.length > 20) {
          rollLog.value = rollLog.value.slice(0, 20);
        }
      }
    }
  } catch (err) {
    console.error('Failed to post roll to server:', err);
  }
}

async function clearRollLog() {
  if (!isGm.value) return;
  try {
    const res = await fetch('/api/rolls?mode=rpg', {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      rollLog.value = [];
    }
  } catch (err) {
    console.error('Failed to clear RPG roll log on server:', err);
  }
}
```

In `rollPercentile()` and `rollDamage()`:
Include user identity in local HUD banner:
```javascript
lastPercentileRoll.value = {
  ...rollSummary,
  username: authStore.user?.username,
  role: authStore.user?.role
};
```
And call `sendRollToServer`:
```javascript
sendRollToServer({
  type: 'percentile',
  label: 'd%',
  total: rollSummary.total,
  breakdown: `[Tens: ${rollSummary.tens * 10}, Ones: ${rollSummary.ones}]`,
  rollSummary
});
```
(and analogously for `rollDamage`).

In `setupSocketListeners()`:
```javascript
socket.on('roll:created', ({ mode, roll }) => {
  if (mode !== 'rpg') return;
  if (!rollLog.value.some(r => r.id === roll.id)) {
    rollLog.value.unshift(roll);
    if (rollLog.value.length > 20) {
      rollLog.value = rollLog.value.slice(0, 20);
    }
  }
  // If peer rolled, show floating banner
  if (roll.userId !== authStore.user?.id) {
    if (roll.type === 'percentile') {
      lastPercentileRoll.value = {
        ...roll.rollSummary,
        username: roll.username,
        role: roll.role,
        total: roll.total
      };
      showPercentileHud.value = true;
      if (percentileHudTimeout) clearTimeout(percentileHudTimeout);
      percentileHudTimeout = setTimeout(() => {
        showPercentileHud.value = false;
      }, 8000);
    } else if (roll.type === 'damage') {
      lastDamageRoll.value = {
        ...roll.rollSummary,
        username: roll.username,
        role: roll.role,
        total: roll.total
      };
      showDamageHud.value = true;
      if (damageHudTimeout) clearTimeout(damageHudTimeout);
      damageHudTimeout = setTimeout(() => {
        showDamageHud.value = false;
      }, 8000);
    }
  }
});

socket.on('roll:cleared', ({ mode }) => {
  if (mode === 'rpg') {
    rollLog.value = [];
  }
});
```

In `cleanupSocketListeners()`:
```javascript
socket.off('roll:created');
socket.off('roll:cleared');
```

In `onMounted()`:
Call `fetchRollLog()`.

Add CSS for `.hud-user-tag` and `.roll-user-badge` (matching VTT theme):
```css
.hud-user-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-right: 6px;
  text-transform: uppercase;
}
.hud-user-tag.gamemaster, .roll-user-badge.gamemaster {
  background: rgba(229, 192, 123, 0.25);
  color: #e5c07b;
  border: 1px solid rgba(229, 192, 123, 0.4);
}
.hud-user-tag.player, .roll-user-badge.player {
  background: rgba(119, 209, 158, 0.2);
  color: #77d19e;
  border: 1px solid rgba(119, 209, 158, 0.35);
}
.roll-user-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  margin-right: 6px;
}
```

- [ ] **Step 4: Implement shared rolls in `client/src/views/SpaceVttView.vue`**

Apply the exact same changes in `SpaceVttView.vue`, scoped to `mode = 'space'`:
- `fetchRollLog()` calls `/api/rolls?mode=space`
- `sendRollToServer()` sends `{ mode: 'space', ... }`
- `clearRollLog()` calls `DELETE /api/rolls?mode=space`
- `socket.on('roll:created')` checks `mode === 'space'`
- `socket.on('roll:cleared')` checks `mode === 'space'`
- Template updates for HUD banner headers, Roll Log user badges, GM-only Clear button
- CSS styling for `.hud-user-tag` and `.roll-user-badge`

- [ ] **Step 5: Run tests and client build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/SharedRolls.test.js && npm run build"`
Expected: 7/7 tests pass, client build succeeds.

- [ ] **Step 6: Run full test suites**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run"`
Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: All client (21 files) and server (7 files) tests pass.

- [ ] **Step 7: Commit client changes**

```bash
git add client/src/views/RpgVttView.vue client/src/views/SpaceVttView.vue client/test/SharedRolls.test.js
git commit -m "feat(vtt): synchronize dice rolls and roll log across users in real-time"
```

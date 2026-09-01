# Phase 3 Implementation Plan: Character & Ship Sheets (State Management & WebSockets)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build interactive PC Character Sheets and Knight Hawks Ship Sheets with SQLite persistence and real-time Socket.io broadcasting across connected clients.

**Architecture:** Express server initializes `socket.io` attached to the HTTP server. SQLite database adds `character_sheets` and `ship_sheets` tables. REST endpoints `/api/characters` and `/api/ships` handle CRUD operations. Socket.io broadcasts `sheet:updated`, `sheet:created`, and `sheet:deleted` events. Vue 3 frontend (`CharacterSheetsView.vue` and `ShipSheetsView.vue`) connects via `socket.io-client` to display interactive forms, live stamina/HP controls, racial abilities, weapons/defenses, and real-time stat updates.

**Tech Stack:** Node.js 20, Express, Socket.io, `socket.io-client`, SQLite (`better-sqlite3`), Vue 3, Vitest, Supertest

---

### Task 1: Database Migration, REST APIs & Socket.io Backend

**Files:**
- Modify: `server/package.json` (add `socket.io`)
- Modify: `server/src/db.js` (add `character_sheets` and `ship_sheets` tables)
- Create: `server/src/sheets.js` (routers for characters and ships)
- Modify: `server/src/index.js` (HTTP server wrapper + Socket.io server)
- Create: `server/test/sheets.test.js` (REST & socket tests)

**Interfaces:**
- Produces: `/api/characters` and `/api/ships` CRUD endpoints, Socket.io server broadcasting `sheet:updated`, `sheet:created`, `sheet:deleted`

- [ ] **Step 1: Install socket.io in server**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npm install socket.io"
```

- [ ] **Step 2: Update server/src/db.js with character_sheets and ship_sheets schemas**

Modify `migrate(db)` in `server/src/db.js`:
```sql
CREATE TABLE IF NOT EXISTS character_sheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  race TEXT NOT NULL CHECK(race IN ('Human', 'Dralasite', 'Vrusk', 'Yazirian')),
  gender TEXT,
  height TEXT,
  weight TEXT,
  str INTEGER NOT NULL DEFAULT 50,
  sta INTEGER NOT NULL DEFAULT 50,
  current_sta INTEGER NOT NULL DEFAULT 50,
  dex INTEGER NOT NULL DEFAULT 50,
  rs INTEGER NOT NULL DEFAULT 50,
  int_stat INTEGER NOT NULL DEFAULT 50,
  log_stat INTEGER NOT NULL DEFAULT 50,
  per INTEGER NOT NULL DEFAULT 50,
  ldr INTEGER NOT NULL DEFAULT 50,
  racial_abilities TEXT DEFAULT '{}',
  skills TEXT DEFAULT '[]',
  inventory TEXT DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ship_sheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  ship_type TEXT NOT NULL,
  hull_points INTEGER NOT NULL DEFAULT 50,
  current_hp INTEGER NOT NULL DEFAULT 50,
  adf INTEGER NOT NULL DEFAULT 2,
  mr INTEGER NOT NULL DEFAULT 2,
  dcr INTEGER NOT NULL DEFAULT 50,
  weapons TEXT DEFAULT '[]',
  defenses TEXT DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

- [ ] **Step 3: Write failing unit/integration tests in server/test/sheets.test.js**

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';

describe('Sheets API', () => {
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

  it('creates and lists character sheets', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'player1', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'player1', password: 'password123' });

    const createRes = await agent.post('/api/characters').send({
      name: 'Wilks',
      race: 'Vrusk',
      str: 45, sta: 50, current_sta: 50, dex: 60, rs: 55,
      int_stat: 50, log_stat: 50, per: 40, ldr: 40
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe('Wilks');

    const listRes = await agent.get('/api/characters');
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBe(1);
  });

  it('creates and lists ship sheets', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

    const createRes = await agent.post('/api/ships').send({
      name: 'UPF Strike Cruiser',
      ship_type: 'Cruiser',
      hull_points: 120, current_hp: 120, adf: 3, mr: 2, dcr: 75
    });
    expect(createRes.status).toBe(201);

    const listRes = await agent.get('/api/ships');
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBe(1);
  });
});
```

- [ ] **Step 4: Implement server/src/sheets.js & Socket.io server in server/src/index.js**

Create `server/src/sheets.js`:
Export `createCharacterRouter(db, io)` and `createShipRouter(db, io)` with CRUD routes for character and ship sheets, emitting `sheet:created`, `sheet:updated`, `sheet:deleted` events via `io.emit()`.

Modify `server/src/index.js`:
Attach `http.createServer(app)` and `new Server(server, { cors: { origin: 'http://localhost:3001', credentials: true } })`.
Mount `/api/characters` and `/api/ships`.
Return `{ app, server, io }` from `createApp()`.

- [ ] **Step 5: Verify all tests pass**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npx vitest run"
```

- [ ] **Step 6: Commit Task 1**

```bash
git add server/
git commit -m "feat: add character & ship sheet database tables, REST APIs, and Socket.io events"
```

---

### Task 2: Character & Ship Sheets Vue Views with Live Socket Sync

**Files:**
- Modify: `client/package.json` (add `socket.io-client`)
- Create: `client/src/services/socket.js` (Socket.io client singleton)
- Modify: `client/src/views/CharacterSheetsView.vue`
- Modify: `client/src/views/ShipSheetsView.vue`

**Interfaces:**
- Consumes: `/api/characters`, `/api/ships`, and Socket.io events (`sheet:updated`, `sheet:created`, `sheet:deleted`)
- Produces: Fully interactive Character and Ship Sheets with real-time live sync.

- [ ] **Step 1: Install socket.io-client in client**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npm install socket.io-client"
```

- [ ] **Step 2: Create client/src/services/socket.js**

```js
import { io } from 'socket.io-client';

export const socket = io('http://localhost:3000', {
  withCredentials: true,
  autoConnect: true,
});
```

- [ ] **Step 3: Implement client/src/views/CharacterSheetsView.vue**

Create comprehensive character sheet view with:
- Sidebar with list of character sheets + "Create New Character" button/modal.
- Primary D100 stats inputs (STR/STA, DEX/RS, INT/LOG, PER/LDR).
- Quick Stamina adjust buttons (-5, -1, +1, +5) with progress bar.
- Race selection (Human, Dralasite, Vrusk, Yazirian) with dynamic racial ability descriptions.
- Skills editor (add/remove skill name and level).
- Real-time `socket.on('sheet:updated')` listener to update local state dynamically when GM or other players modify stats.

- [ ] **Step 4: Implement client/src/views/ShipSheetsView.vue**

Create Knight Hawks ship sheet view with:
- Sidebar with list of ship sheets + "Create New Ship" button.
- Ship Type, ADF (Acceleration), MR (Maneuver Rating), DCR (Damage Control Rating).
- Hull Points live gauge + quick damage/repair adjustment buttons.
- Weapons list editor (add weapon, damage value, status).
- Defensive Screens editor (Reflect, Masking, ICMs status toggle).
- Real-time `socket.on('sheet:updated')` listener.

- [ ] **Step 5: Verify build**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npm run build"
```

- [ ] **Step 6: Commit Task 2**

```bash
git add client/
git commit -m "feat: add interactive Vue Character & Ship sheets with real-time Socket.io sync (Phase 3)"
```

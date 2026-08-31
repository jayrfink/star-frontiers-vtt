# Phase 0–1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Dockerized Ubuntu dev environment and scaffold a Node.js/Express + Vue 3 web app with session-based auth and a tabbed dashboard shell.

**Architecture:** Docker container (Ubuntu 22.04 arm64) volume-mounts the project directory. Express backend on port 3000 with SQLite + bcrypt auth. Vue 3 + Vite frontend on port 3001, proxied to the backend. Session-based authentication with automatic GameMaster assignment for the first registered user.

**Tech Stack:** Docker, Ubuntu 22.04, Node.js 20, Express, better-sqlite3, bcrypt, express-session, connect-sqlite3, Vue 3, Vite, Vue Router, Pinia, Vitest, Supertest

## Global Constraints

- Node.js 20 inside the container (host has 26 — do not use host Node for project commands)
- All `npm` and `node` commands run via `docker exec sf-vtt-dev <command>`
- ESM modules throughout (`"type": "module"` in both package.json files)
- SQLite database files stored in `data/` (gitignored)
- Passwords: minimum 6 characters, bcrypt with 12 salt rounds
- No UI framework — plain CSS with dark theme and CSS custom properties

## File Structure

```
~/star-frontiers-vtt/
├── .gitignore
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── scripts/
│   └── bootstrap.sh
├── server/
│   ├── package.json
│   ├── vitest.config.js
│   ├── src/
│   │   ├── db.js
│   │   ├── middleware.js
│   │   ├── auth.js
│   │   └── index.js
│   └── test/
│       ├── db.test.js
│       └── auth.test.js
├── client/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.js
│       ├── main.css
│       ├── App.vue
│       ├── router.js
│       ├── stores/
│       │   └── auth.js
│       ├── views/
│       │   ├── LoginView.vue
│       │   ├── DashboardView.vue
│       │   ├── RpgVttView.vue
│       │   ├── SpaceVttView.vue
│       │   ├── CharacterSheetsView.vue
│       │   ├── ShipSheetsView.vue
│       │   └── RulebooksView.vue
│       └── components/
│           ├── NavBar.vue
│           └── AuthForm.vue
└── assets/           (existing, read-only)
```

---

### Task 1: Docker Infrastructure

**Files:**
- Create: `.gitignore`
- Create: `.dockerignore`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `scripts/bootstrap.sh`

**Interfaces:**
- Consumes: nothing
- Produces: A running Docker container named `sf-vtt-dev` with Node.js 20 and sqlite3 available. All subsequent tasks run commands via `docker exec sf-vtt-dev <command>`.

- [ ] **Step 1: Install OrbStack (container runtime)**

Run:
```bash
brew install --cask orbstack
```

After install, launch OrbStack to complete first-time setup:
```bash
open -a OrbStack
```

Wait ~15 seconds for OrbStack to initialize, then verify:
```bash
docker info | head -5
```
Expected: Output shows Docker server info (no error).

- [ ] **Step 2: Create .gitignore**

```gitignore
node_modules/
data/
dist/
.env
*.db
.DS_Store
__MACOSX/
```

- [ ] **Step 3: Create .dockerignore**

```.dockerignore
node_modules/
data/
dist/
.git/
assets/
*.zip
```

- [ ] **Step 4: Create Dockerfile**

```dockerfile
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    python3 \
    sqlite3 \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*
```

- [ ] **Step 5: Create docker-compose.yml**

```yaml
services:
  sf-vtt-dev:
    build: .
    container_name: sf-vtt-dev
    volumes:
      - ${HOME}/star-frontiers-vtt:${HOME}/star-frontiers-vtt
    ports:
      - "3000:3000"
      - "3001:3001"
    working_dir: ${HOME}/star-frontiers-vtt
    environment:
      - HOME=${HOME}
    command: tail -f /dev/null
```

- [ ] **Step 6: Create scripts/bootstrap.sh**

```bash
#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "=== Installing server dependencies ==="
cd server && npm install

echo "=== Installing client dependencies ==="
cd ../client && npm install

echo "=== Bootstrap complete ==="
```

- [ ] **Step 7: Build and start the container**

Run:
```bash
docker compose -f ~/star-frontiers-vtt/docker-compose.yml up -d --build
```
Expected: Container builds and starts without error.

- [ ] **Step 8: Verify container environment**

Run:
```bash
docker exec sf-vtt-dev node --version
```
Expected: `v20.x.x`

Run:
```bash
docker exec sf-vtt-dev sqlite3 --version
```
Expected: A valid SQLite version string.

Run:
```bash
docker exec sf-vtt-dev ls assets/rpg assets/rulebooks assets/space
```
Expected: Lists files in each directory (confirms volume mount works).

- [ ] **Step 9: Commit**

```bash
git add .gitignore .dockerignore Dockerfile docker-compose.yml scripts/
git commit -m "feat: add Docker infrastructure (Phase 0)"
```

---

### Task 2: Server Database Layer

**Files:**
- Create: `server/package.json`
- Create: `server/vitest.config.js`
- Create: `server/src/db.js`
- Create: `server/test/db.test.js`

**Interfaces:**
- Consumes: Running container from Task 1
- Produces: `createDb(dbPath?: string): Database` — creates and migrates a SQLite database, returns a `better-sqlite3` instance. `createTestDb(): Database` — creates an in-memory database for tests. Both return a `better-sqlite3` Database with the `users` table created.

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "sf-vtt-server",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "better-sqlite3": "^11.0.0",
    "connect-sqlite3": "^0.9.15",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "express-session": "^1.18.0"
  },
  "devDependencies": {
    "supertest": "^7.0.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create server/vitest.config.js**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 3: Write the failing database test**

Create `server/test/db.test.js`:

```js
import { describe, it, expect, afterEach } from 'vitest';
import { createTestDb } from '../src/db.js';

describe('Database', () => {
  let db;

  afterEach(() => {
    if (db) db.close();
  });

  it('creates users table with correct columns', () => {
    db = createTestDb();
    const columns = db.pragma('table_info(users)');
    const colNames = columns.map(c => c.name);
    expect(colNames).toEqual(['id', 'username', 'password_hash', 'role', 'created_at']);
  });

  it('defaults role to Player', () => {
    db = createTestDb();
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('testuser', 'hash');
    const user = db.prepare('SELECT role FROM users WHERE username = ?').get('testuser');
    expect(user.role).toBe('Player');
  });

  it('enforces unique username constraint', () => {
    db = createTestDb();
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('dupe', 'hash', 'Player');
    expect(() => {
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('dupe', 'hash2', 'Player');
    }).toThrow();
  });

  it('enforces role check constraint', () => {
    db = createTestDb();
    expect(() => {
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('bad', 'hash', 'Admin');
    }).toThrow();
  });
});
```

- [ ] **Step 4: Install deps and run test to verify it fails**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npm install"
docker exec sf-vtt-dev bash -c "cd server && npx vitest run"
```
Expected: FAIL — `createTestDb` is not a function (module doesn't exist yet).

- [ ] **Step 5: Implement server/src/db.js**

```js
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = path.join(__dirname, '../../data');
const DEFAULT_DB_PATH = path.join(DEFAULT_DATA_DIR, 'app.db');

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Player' CHECK(role IN ('Player', 'GameMaster')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function createDb(dbPath = DEFAULT_DB_PATH) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  migrate(db);
  return db;
}

export function createTestDb() {
  const db = new Database(':memory:');
  migrate(db);
  return db;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npx vitest run"
```
Expected: 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add server/package.json server/vitest.config.js server/src/db.js server/test/db.test.js
git commit -m "feat: add SQLite database layer with users schema"
```

---

### Task 3: Auth API

**Files:**
- Create: `server/src/middleware.js`
- Create: `server/src/auth.js`
- Create: `server/src/index.js`
- Create: `server/test/auth.test.js`

**Interfaces:**
- Consumes: `createDb(dbPath?)` and `createTestDb()` from `server/src/db.js`
- Produces:
  - `createSessionMiddleware(dataDir?: string): express.RequestHandler` — configures express-session with SQLite store
  - `requireAuth(req, res, next): void` — middleware that returns 401 if no session
  - `createAuthRouter(db: Database): express.Router` — Express router with POST `/register`, POST `/login`, POST `/logout`, GET `/me`
  - `createApp(db: Database): express.Application` — fully configured Express app (used by tests and by index.js)

- [ ] **Step 1: Write the failing auth test**

Create `server/test/auth.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';

describe('Auth API', () => {
  let db, app;

  beforeEach(() => {
    db = createTestDb();
    app = createApp(db);
  });

  afterEach(() => {
    if (db) db.close();
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/auth.test.js"
```
Expected: FAIL — `createApp` is not exported from `../src/index.js` (file doesn't exist).

- [ ] **Step 3: Implement server/src/middleware.js**

```js
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SQLiteStore = connectSqlite3(session);

export function createSessionMiddleware(dataDir) {
  const dir = dataDir || path.join(__dirname, '../../data');
  return session({
    store: new SQLiteStore({
      db: 'sessions.db',
      dir,
    }),
    secret: process.env.SESSION_SECRET || 'sf-vtt-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  });
}

export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}
```

- [ ] **Step 4: Implement server/src/auth.js**

```js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { requireAuth } from './middleware.js';

const SALT_ROUNDS = 12;

export function createAuthRouter(db) {
  const router = Router();

  router.post('/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      const role = userCount === 0 ? 'GameMaster' : 'Player';

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const result = db.prepare(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
      ).run(username, passwordHash, role);

      res.status(201).json({
        id: Number(result.lastInsertRowid),
        username,
        role,
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, role: user.role });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  router.post('/logout', requireAuth, (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ ok: true });
    });
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json(user);
  });

  return router;
}
```

- [ ] **Step 5: Implement server/src/index.js**

```js
import express from 'express';
import cors from 'cors';
import { createDb } from './db.js';
import { createSessionMiddleware } from './middleware.js';
import { createAuthRouter } from './auth.js';

export function createApp(db) {
  const app = express();

  app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true,
  }));
  app.use(express.json());
  app.use(createSessionMiddleware());
  app.use('/api/auth', createAuthRouter(db));

  return app;
}

// Only start listening when run directly (not when imported by tests)
const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/.*\//, ''));
if (isDirectRun) {
  const db = createDb();
  const app = createApp(db);
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Star Frontiers VTT server running on port ${PORT}`);
  });
}
```

Note: The `isDirectRun` guard prevents the server from listening when the module is imported by tests. A cleaner approach is to check `process.argv[1]`:

Replace the bottom section with:

```js
// Start server when run directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  const db = createDb();
  const app = createApp(db);
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Star Frontiers VTT server running on port ${PORT}`);
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npx vitest run"
```
Expected: All tests PASS (4 db tests + 10 auth tests).

- [ ] **Step 7: Manual smoke test — start the server**

Run:
```bash
docker exec -d sf-vtt-dev bash -c "cd /Users/jrf/star-frontiers-vtt/server && node src/index.js"
```

Then from the host:
```bash
curl -s http://localhost:3000/api/auth/me | jq .
```
Expected: `{"error":"Authentication required"}`

Stop the server after verifying:
```bash
docker exec sf-vtt-dev pkill -f "node src/index.js" || true
```

- [ ] **Step 8: Commit**

```bash
git add server/src/middleware.js server/src/auth.js server/src/index.js server/test/auth.test.js
git commit -m "feat: add session-based auth API (register/login/logout/me)"
```

---

### Task 4: Vue Client + Login/Register UI

**Files:**
- Create: `client/package.json`
- Create: `client/index.html`
- Create: `client/vite.config.js`
- Create: `client/src/main.js`
- Create: `client/src/main.css`
- Create: `client/src/App.vue`
- Create: `client/src/router.js`
- Create: `client/src/stores/auth.js`
- Create: `client/src/components/AuthForm.vue`
- Create: `client/src/views/LoginView.vue`

**Interfaces:**
- Consumes: Auth API from Task 3 (`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`)
- Produces:
  - `useAuthStore()` — Pinia store with `{ user, checked, isAuthenticated, fetchUser(), login(u, p), register(u, p), logout() }`
  - Vue Router configured with `/login` route (dashboard routes added in Task 5)
  - `<AuthForm>` component that emits `submit` with `{ username, password }` and accepts `mode` prop (`'login'` | `'register'`)

- [ ] **Step 1: Create client/package.json**

```json
{
  "name": "sf-vtt-client",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "pinia": "^2.2.0",
    "vue": "^3.5.0",
    "vue-router": "^4.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Star Frontiers VTT</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create client/vite.config.js**

```js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3001,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: Create client/src/main.css**

```css
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --accent: #58a6ff;
  --accent-hover: #79c0ff;
  --danger: #f85149;
  --success: #3fb950;
  --border: #30363d;
  --radius: 6px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  color: var(--accent-hover);
}

button {
  cursor: pointer;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 16px;
  font-size: 14px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transition: background 0.15s;
}

button:hover {
  background: var(--border);
}

button.primary {
  background: var(--accent);
  color: var(--bg-primary);
  border-color: var(--accent);
  font-weight: 600;
}

button.primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

input {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 14px;
  color: var(--text-primary);
  width: 100%;
}

input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.3);
}
```

- [ ] **Step 5: Create client/src/main.js**

```js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router.js';
import './main.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
```

- [ ] **Step 6: Create client/src/stores/auth.js**

```js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const checked = ref(false);
  const isAuthenticated = computed(() => !!user.value);

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        user.value = await res.json();
      } else {
        user.value = null;
      }
    } catch {
      user.value = null;
    }
    checked.value = true;
  }

  async function login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    user.value = await res.json();
  }

  async function register(username, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Registration failed');
    }
    await login(username, password);
  }

  async function logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    user.value = null;
  }

  return { user, checked, isAuthenticated, fetchUser, login, register, logout };
});
```

- [ ] **Step 7: Create client/src/components/AuthForm.vue**

```vue
<template>
  <form class="auth-form" @submit.prevent="onSubmit">
    <div class="form-group">
      <label for="username">Username</label>
      <input
        id="username"
        v-model="username"
        type="text"
        autocomplete="username"
        required
      />
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input
        id="password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        minlength="6"
        required
      />
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <button type="submit" class="primary" :disabled="loading">
      {{ loading ? 'Please wait...' : (mode === 'register' ? 'Create Account' : 'Log In') }}
    </button>
  </form>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  mode: { type: String, default: 'login' },
});

const emit = defineEmits(['submit']);

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await emit('submit', { username: username.value, password: password.value });
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 360px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
}

.error {
  color: var(--danger);
  font-size: 13px;
}
</style>
```

- [ ] **Step 8: Create client/src/views/LoginView.vue**

```vue
<template>
  <div class="login-page">
    <div class="login-card">
      <h1>⭐ Star Frontiers VTT</h1>
      <p class="subtitle">{{ isRegister ? 'Create your account' : 'Sign in to continue' }}</p>
      <AuthForm
        :mode="isRegister ? 'register' : 'login'"
        @submit="handleAuth"
      />
      <p class="toggle">
        {{ isRegister ? 'Already have an account?' : "Don't have an account?" }}
        <a href="#" @click.prevent="isRegister = !isRegister">
          {{ isRegister ? 'Sign in' : 'Create one' }}
        </a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import AuthForm from '../components/AuthForm.vue';

const auth = useAuthStore();
const router = useRouter();
const isRegister = ref(false);

async function handleAuth({ username, password }) {
  if (isRegister.value) {
    await auth.register(username, password);
  } else {
    await auth.login(username, password);
  }
  router.push('/dashboard');
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.login-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

h1 {
  font-size: 24px;
  font-weight: 700;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.toggle {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
```

- [ ] **Step 9: Create client/src/App.vue (minimal)**

```vue
<template>
  <router-view />
</template>
```

- [ ] **Step 10: Create client/src/router.js (login route only — dashboard routes added in Task 5)**

```js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth.js';
import LoginView from './views/LoginView.vue';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: LoginView, meta: { guest: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();
  if (!auth.checked) {
    await auth.fetchUser();
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next('/login');
  } else if (to.meta.guest && auth.isAuthenticated) {
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
```

- [ ] **Step 11: Install client deps**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npm install"
```
Expected: Dependencies install without error.

- [ ] **Step 12: Manual verification — start both servers and test login flow**

Start Express:
```bash
docker exec -d sf-vtt-dev bash -c "cd /Users/jrf/star-frontiers-vtt/server && node src/index.js"
```

Start Vite:
```bash
docker exec -d sf-vtt-dev bash -c "cd /Users/jrf/star-frontiers-vtt/client && npx vite --host 0.0.0.0 --port 3001"
```

Open `http://localhost:3001` in a browser.

**Verify:**
1. Login page displays with "Star Frontiers VTT" title
2. Click "Create one" to switch to register mode
3. Register with username `gm`, password `password123` — should redirect (to `/dashboard` which will 404 until Task 5 — that's expected)
4. Check the Express server registered the user as GameMaster by running:
   ```bash
   curl -s http://localhost:3000/api/auth/me -b cookies.txt | jq .
   ```

Stop both servers:
```bash
docker exec sf-vtt-dev pkill -f "node src/index" || true
docker exec sf-vtt-dev pkill -f "vite" || true
```

- [ ] **Step 13: Commit**

```bash
git add client/
git commit -m "feat: add Vue client with login/register UI"
```

---

### Task 5: Dashboard Shell + Tab Navigation

**Files:**
- Create: `client/src/components/NavBar.vue`
- Create: `client/src/views/DashboardView.vue`
- Create: `client/src/views/RpgVttView.vue`
- Create: `client/src/views/SpaceVttView.vue`
- Create: `client/src/views/CharacterSheetsView.vue`
- Create: `client/src/views/ShipSheetsView.vue`
- Create: `client/src/views/RulebooksView.vue`
- Modify: `client/src/router.js` — add dashboard parent route with 5 child routes

**Interfaces:**
- Consumes: `useAuthStore()` from `client/src/stores/auth.js` (for user info, logout)
- Produces: Complete tabbed dashboard UI. Each stub view is a Vue component that renders a centered placeholder with the tab name and phase number. `<NavBar>` displays username, role badge, and logout button.

- [ ] **Step 1: Create client/src/components/NavBar.vue**

```vue
<template>
  <nav class="navbar">
    <div class="navbar-brand">⭐ Star Frontiers VTT</div>
    <div class="navbar-user">
      <span class="role-badge" :class="auth.user?.role === 'GameMaster' ? 'gm' : 'player'">
        {{ auth.user?.role === 'GameMaster' ? 'GM' : 'Player' }}
      </span>
      <span class="username">{{ auth.user?.username }}</span>
      <button @click="handleLogout">Logout</button>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();

async function handleLogout() {
  await auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.navbar-brand {
  font-size: 18px;
  font-weight: 700;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
  color: var(--text-secondary);
}

.role-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 12px;
}

.role-badge.gm {
  background: rgba(210, 153, 34, 0.2);
  color: #d29922;
  border: 1px solid rgba(210, 153, 34, 0.4);
}

.role-badge.player {
  background: rgba(63, 185, 80, 0.2);
  color: #3fb950;
  border: 1px solid rgba(63, 185, 80, 0.4);
}
</style>
```

- [ ] **Step 2: Create the 5 stub views**

Create `client/src/views/RpgVttView.vue`:

```vue
<template>
  <div class="stub-view">
    <div class="stub-icon">🗺️</div>
    <h2>RPG Virtual Tabletop</h2>
    <p>Planetside and shipboard tactical maps — coming in Phase 4</p>
  </div>
</template>

<style scoped>
.stub-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: var(--text-secondary);
  gap: 8px;
}
.stub-icon { font-size: 48px; }
h2 { color: var(--text-primary); }
</style>
```

Create `client/src/views/SpaceVttView.vue`:

```vue
<template>
  <div class="stub-view">
    <div class="stub-icon">🚀</div>
    <h2>Space Virtual Tabletop</h2>
    <p>Knight Hawks hex-grid tactical space combat — coming in Phase 5</p>
  </div>
</template>

<style scoped>
.stub-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: var(--text-secondary);
  gap: 8px;
}
.stub-icon { font-size: 48px; }
h2 { color: var(--text-primary); }
</style>
```

Create `client/src/views/CharacterSheetsView.vue`:

```vue
<template>
  <div class="stub-view">
    <div class="stub-icon">📋</div>
    <h2>Character Sheets</h2>
    <p>Alpha Dawn PC stat tracking — coming in Phase 3</p>
  </div>
</template>

<style scoped>
.stub-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: var(--text-secondary);
  gap: 8px;
}
.stub-icon { font-size: 48px; }
h2 { color: var(--text-primary); }
</style>
```

Create `client/src/views/ShipSheetsView.vue`:

```vue
<template>
  <div class="stub-view">
    <div class="stub-icon">🛸</div>
    <h2>Ship Sheets</h2>
    <p>Knight Hawks ship stat tracking — coming in Phase 3</p>
  </div>
</template>

<style scoped>
.stub-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: var(--text-secondary);
  gap: 8px;
}
.stub-icon { font-size: 48px; }
h2 { color: var(--text-primary); }
</style>
```

Create `client/src/views/RulebooksView.vue`:

```vue
<template>
  <div class="stub-view">
    <div class="stub-icon">📖</div>
    <h2>Rulebooks</h2>
    <p>Searchable Alpha Dawn &amp; Knight Hawks rules — coming in Phase 2</p>
  </div>
</template>

<style scoped>
.stub-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: var(--text-secondary);
  gap: 8px;
}
.stub-icon { font-size: 48px; }
h2 { color: var(--text-primary); }
</style>
```

- [ ] **Step 3: Create client/src/views/DashboardView.vue**

```vue
<template>
  <div class="dashboard">
    <NavBar />
    <div class="tab-bar">
      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="tab"
        active-class="tab-active"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </router-link>
    </div>
    <main class="dashboard-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import NavBar from '../components/NavBar.vue';

const tabs = [
  { path: '/dashboard/rpg-vtt', label: 'RPG VTT', icon: '🗺️' },
  { path: '/dashboard/space-vtt', label: 'Space VTT', icon: '🚀' },
  { path: '/dashboard/character-sheets', label: 'Character Sheets', icon: '📋' },
  { path: '/dashboard/ship-sheets', label: 'Ship Sheets', icon: '🛸' },
  { path: '/dashboard/rulebooks', label: 'Rulebooks', icon: '📖' },
];
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.tab-bar {
  display: flex;
  gap: 0;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
  overflow-x: auto;
}

.tab {
  padding: 12px 20px;
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
}

.tab:hover {
  color: var(--text-primary);
}

.tab-active {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
}

.tab-icon {
  margin-right: 6px;
}

.dashboard-content {
  flex: 1;
  padding: 24px;
}
</style>
```

- [ ] **Step 4: Update client/src/router.js — add dashboard routes**

Replace the entire file with:

```js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth.js';
import LoginView from './views/LoginView.vue';
import DashboardView from './views/DashboardView.vue';
import RpgVttView from './views/RpgVttView.vue';
import SpaceVttView from './views/SpaceVttView.vue';
import CharacterSheetsView from './views/CharacterSheetsView.vue';
import ShipSheetsView from './views/ShipSheetsView.vue';
import RulebooksView from './views/RulebooksView.vue';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: LoginView, meta: { guest: true } },
  {
    path: '/dashboard',
    component: DashboardView,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard/rpg-vtt' },
      { path: 'rpg-vtt', name: 'RpgVtt', component: RpgVttView },
      { path: 'space-vtt', name: 'SpaceVtt', component: SpaceVttView },
      { path: 'character-sheets', name: 'CharacterSheets', component: CharacterSheetsView },
      { path: 'ship-sheets', name: 'ShipSheets', component: ShipSheetsView },
      { path: 'rulebooks', name: 'Rulebooks', component: RulebooksView },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();
  if (!auth.checked) {
    await auth.fetchUser();
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next('/login');
  } else if (to.meta.guest && auth.isAuthenticated) {
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
```

- [ ] **Step 5: Manual verification — full end-to-end test**

Delete any previous database to start fresh:
```bash
docker exec sf-vtt-dev rm -rf /Users/jrf/star-frontiers-vtt/data
```

Start Express:
```bash
docker exec -d sf-vtt-dev bash -c "cd /Users/jrf/star-frontiers-vtt/server && node src/index.js"
```

Start Vite:
```bash
docker exec -d sf-vtt-dev bash -c "cd /Users/jrf/star-frontiers-vtt/client && npx vite --host 0.0.0.0 --port 3001"
```

Open `http://localhost:3001` in a browser and verify:

1. ✅ Login page loads with dark theme
2. ✅ Switch to register mode, create user `gm` / `password123`
3. ✅ Redirects to `/dashboard/rpg-vtt`
4. ✅ NavBar shows "gm" with a gold "GM" badge and logout button
5. ✅ Tab bar shows all 5 tabs with RPG VTT active
6. ✅ Click each tab — content changes to the correct stub view
7. ✅ Click Logout — returns to login page
8. ✅ Register a second user `player1` — should get green "Player" badge
9. ✅ Navigate directly to `http://localhost:3001/dashboard` while logged out — redirected to `/login`

Stop both servers:
```bash
docker exec sf-vtt-dev pkill -f "node src/index" || true
docker exec sf-vtt-dev pkill -f "vite" || true
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/NavBar.vue client/src/views/ client/src/router.js
git commit -m "feat: add dashboard shell with tabbed navigation and stub views"
```

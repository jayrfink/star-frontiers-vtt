# Star Frontiers VTT — Phase 0–1 Design Spec

## Sub-Project Scope

This spec covers **Phase 0** (Container Bootstrap) and **Phase 1** (Authentication & Base Scaffolding) of the Star Frontiers VTT. Subsequent phases (Rulebook Search, Character/Ship Sheets, RPG VTT, Space VTT) will each get their own spec → plan → implementation cycle.

## Goal

Stand up a Dockerized development environment and scaffold a working web application with session-based authentication, role management (GameMaster / Player), and a tabbed dashboard shell ready for later phases.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Container runtime | Docker (via OrbStack or Docker Desktop) | Isolation — keep project deps off macOS host |
| Frontend framework | Vue 3 + Vite | Lighter reactivity model, good for form-heavy UIs like character sheets |
| Canvas rendering | Plain HTML5 Canvas | Full control, zero dependencies (used in later phases) |
| Authentication | Session-based (express-session + connect-sqlite3) | Simple, no token management, natural fit with SQLite |
| First user role | Auto-assigned GameMaster | Subsequent users default to Player |
| Project decomposition | Sub-project specs | Each phase pair gets its own spec → plan → implementation cycle |

---

## Phase 0: Container Bootstrap

### Container Configuration

- **Base image:** `ubuntu:22.04` (arm64 — runs natively on Apple Silicon)
- **Volume mount:** `$HOME/star-frontiers-vtt/` → `$HOME/star-frontiers-vtt/` (same path inside container)
- **Exposed ports:** 3000 (Express API), 3001 (Vite dev server)
- **Container name:** `sf-vtt-dev`

### Dockerfile

A multi-stage-ish Dockerfile that:

1. Starts from `ubuntu:22.04`
2. Installs system packages: `curl`, `build-essential`, `python3`, `sqlite3`
3. Installs Node.js 20 via NodeSource
4. Sets the working directory to the mounted project path
5. Does NOT copy project files (they come from the volume mount)

### docker-compose.yml

- Defines a single service `sf-vtt-dev`
- Builds from the local `Dockerfile`
- Volume-mounts `$HOME/star-frontiers-vtt/` to the same path inside the container
- Maps ports `3000:3000` and `3001:3001`
- Uses `command: tail -f /dev/null` to keep the container alive for `docker exec` usage during development
- Environment variable `HOME` set to match host `$HOME` so paths resolve

### Entrypoint / Bootstrap Script

A `scripts/bootstrap.sh` that:

1. Runs `npm install` in both `server/` and `client/` directories
2. Can be extended later to run migrations, seed data, etc.

### Verification

- `docker compose up -d` starts the container
- `docker exec sf-vtt-dev node --version` returns Node.js 20.x
- `docker exec sf-vtt-dev sqlite3 --version` returns a valid version
- The volume mount is confirmed by checking that `assets/` is visible inside the container

---

## Phase 1: Authentication & Base Scaffolding

### Project Structure

```
~/star-frontiers-vtt/
├── docker-compose.yml
├── Dockerfile
├── scripts/
│   └── bootstrap.sh
├── server/
│   ├── package.json
│   └── src/
│       ├── index.js          # Express app entry point
│       ├── db.js             # SQLite connection + schema migration
│       ├── auth.js           # Auth route handlers (register/login/logout/me)
│       └── middleware.js     # Session config, auth guard middleware
├── client/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.js           # Vue app entry
│       ├── App.vue           # Root component
│       ├── router.js         # Vue Router config
│       ├── stores/
│       │   └── auth.js       # Pinia store for auth state
│       ├── views/
│       │   ├── LoginView.vue
│       │   ├── DashboardView.vue
│       │   ├── RpgVttView.vue       # Stub
│       │   ├── SpaceVttView.vue      # Stub
│       │   ├── CharacterSheetsView.vue  # Stub
│       │   ├── ShipSheetsView.vue       # Stub
│       │   └── RulebooksView.vue        # Stub
│       └── components/
│           ├── NavBar.vue
│           └── AuthForm.vue
└── assets/                   # Existing — read-only for now
    ├── rpg/
    ├── rulebooks/
    └── space/
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Player' CHECK(role IN ('Player', 'GameMaster')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Sessions are stored via `connect-sqlite3` in the same database file (`data/sf-vtt.db`), managed automatically by the session middleware.

### Authentication API

| Endpoint | Method | Auth Required | Behavior |
|----------|--------|--------------|----------|
| `/api/auth/register` | POST | No | Creates user. First user → GameMaster, all others → Player. Body: `{ username, password }`. Returns `{ id, username, role }`. |
| `/api/auth/login` | POST | No | Validates credentials (bcrypt compare). Creates session. Returns `{ id, username, role }`. |
| `/api/auth/logout` | POST | Yes | Destroys session. Returns `{ ok: true }`. |
| `/api/auth/me` | GET | Yes | Returns current user from session: `{ id, username, role }`. Returns 401 if no valid session. |

**Password rules:** Minimum 6 characters. Hashed with bcrypt (12 salt rounds).

**Error responses:** All errors return `{ error: "message" }` with appropriate HTTP status codes (400, 401, 409 for duplicate username, 500).

### Session Configuration

- **Store:** `connect-sqlite3` backed by `data/sf-vtt.db`
- **Cookie:** `httpOnly: true`, `sameSite: 'lax'`, `secure: false` (local dev)
- **Max age:** 24 hours
- **Session secret:** loaded from `SESSION_SECRET` env var, with a default for dev

### Frontend Architecture

**Vue 3 + Vite + Vue Router + Pinia**

- **Vite dev server** runs on port 3001, proxies `/api/*` requests to Express on port 3000
- **Pinia auth store** holds `{ user, isAuthenticated }`, with actions for `login()`, `register()`, `logout()`, `fetchUser()`
- **Vue Router** with a navigation guard: unauthenticated users are redirected to `/login`; authenticated users hitting `/login` are redirected to `/dashboard`

### Dashboard UI

- **NavBar** (top): App title "Star Frontiers VTT", current username, role badge (styled differently for GM vs Player), logout button
- **Tab navigation** (horizontal tabs below navbar):
  - RPG VTT → `/dashboard/rpg-vtt`
  - Space VTT → `/dashboard/space-vtt`
  - Character Sheets → `/dashboard/character-sheets`
  - Ship Sheets → `/dashboard/ship-sheets`
  - Rulebooks → `/dashboard/rulebooks`
- Each tab view shows a centered placeholder: icon + "Coming in Phase N" text
- Default tab on login: RPG VTT

### Styling

Minimal CSS — no UI framework. Clean, functional layout:
- Dark theme (space-appropriate for a sci-fi VTT)
- CSS custom properties for colors so theming is easy later
- Flexbox-based layout

---

## Out of Scope (Deferred to Later Phases)

- WebSocket setup (Phase 3+)
- PDF parsing and rulebook search (Phase 2)
- Character and ship sheet forms (Phase 3)
- Canvas-based map viewers (Phases 4–5)
- GM-specific controls and permissions beyond role assignment

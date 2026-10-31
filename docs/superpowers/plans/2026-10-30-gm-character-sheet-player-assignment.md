# GM Character Sheet Player Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the GameMaster (GM) to assign any character sheet to a valid player login at character creation and via reassignment on existing character sheets, while preserving existing behavior and permissions.

**Architecture:** Extend `character_sheets` queries in `server/src/sheets.js` to `LEFT JOIN users` providing `owner_username`, and allow the GM (and only the GM) to specify or update `user_id` validated against `users`. In `client/src/views/CharacterSheetsView.vue`, fetch registered users for GMs and render an assignment dropdown in the sheet header and create modal, with a read-only player attribution badge for non-GMs.

**Tech Stack:** Node.js, Express, better-sqlite3, Socket.io, Vue 3, Pinia, Vitest, Supertest

## Global Constraints
- Only GameMasters (`isGameMaster`) can assign or reassign `user_id`. Non-GMs cannot modify `user_id`.
- The target `user_id` must exist in the `users` table; invalid or nonexistent IDs must return `400 Bad Request`.
- Do not make any other changes to permissions, sheet layouts, or behaviors outside player assignment.

---

### Task 1: Backend Player Assignment Support

**Files:**
- Modify: `server/src/sheets.js:21-32, 49-57, 98-109, 165-195, 265-285`
- Test: `server/test/sheets.test.js`

**Interfaces:**
- Consumes: `users` table (`id`, `username`, `role`), `isGameMaster(db, userId)` from `middleware.js`
- Produces: `owner_username` on `sheet` object; GM capability to set `user_id` on `POST /api/characters` and `PUT /api/characters/:id`

- [ ] **Step 1: Write the failing tests in `server/test/sheets.test.js`**

Add tests to `server/test/sheets.test.js` under `describe('Character Sheets API')`:
1. `GET /api/characters` returns `owner_username` matching the user's username.
2. GM can assign a character to another valid user on `POST /api/characters`.
3. GM can reassign a character to another valid user on `PUT /api/characters/:id`.
4. Reassigning with an invalid/non-existent `user_id` returns `400 Bad Request`.
5. Non-GM player cannot reassign `user_id` on `PUT /api/characters/:id` (the existing `user_id` is preserved).

```javascript
it('includes owner_username in character sheet responses', async () => {
  const gmAgent = request.agent(app);
  await gmAgent.post('/api/auth/register').send({ username: 'gmUser', password: 'password123' });
  await gmAgent.post('/api/auth/login').send({ username: 'gmUser', password: 'password123' });

  const res = await gmAgent.post('/api/characters').send({ name: 'Hero', race: 'Human' });
  expect(res.status).toBe(201);
  expect(res.body.owner_username).toBe('gmUser');

  const listRes = await gmAgent.get('/api/characters');
  expect(listRes.body[0].owner_username).toBe('gmUser');
});

it('allows GM to assign character to another player login on create and update', async () => {
  const gmAgent = request.agent(app);
  await gmAgent.post('/api/auth/register').send({ username: 'gmBoss', password: 'password123' });
  await gmAgent.post('/api/auth/login').send({ username: 'gmBoss', password: 'password123' });

  // Register player account
  const playerReg = await gmAgent.post('/api/auth/register').send({ username: 'playerAlice', password: 'password123' });
  const playerUser = playerReg.body.user;

  // GM creates sheet assigned to playerAlice
  const createRes = await gmAgent.post('/api/characters').send({
    name: 'AliceChar',
    race: 'Yazirian',
    user_id: playerUser.id,
  });
  expect(createRes.status).toBe(201);
  expect(createRes.body.user_id).toBe(playerUser.id);
  expect(createRes.body.owner_username).toBe('playerAlice');

  // GM reassigns sheet back to GM
  const gmInfo = (await gmAgent.get('/api/auth/me')).body;
  const updateRes = await gmAgent.put(`/api/characters/${createRes.body.id}`).send({
    user_id: gmInfo.id,
  });
  expect(updateRes.status).toBe(200);
  expect(updateRes.body.user_id).toBe(gmInfo.id);
  expect(updateRes.body.owner_username).toBe('gmBoss');
});

it('rejects assignment to non-existent user_id with 400', async () => {
  const gmAgent = request.agent(app);
  await gmAgent.post('/api/auth/register').send({ username: 'gmRoot', password: 'password123' });
  await gmAgent.post('/api/auth/login').send({ username: 'gmRoot', password: 'password123' });

  const res = await gmAgent.post('/api/characters').send({
    name: 'GhostChar',
    race: 'Human',
    user_id: 99999,
  });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/user.*exist/i);
});

it('prevents non-GM players from changing user_id', async () => {
  const gmAgent = request.agent(app);
  await gmAgent.post('/api/auth/register').send({ username: 'gmAdmin', password: 'password123' });
  await gmAgent.post('/api/auth/login').send({ username: 'gmAdmin', password: 'password123' });

  const p1 = (await gmAgent.post('/api/auth/register').send({ username: 'playerOne', password: 'password123' })).body.user;
  const p2 = (await gmAgent.post('/api/auth/register').send({ username: 'playerTwo', password: 'password123' })).body.user;

  const p1Agent = request.agent(app);
  await p1Agent.post('/api/auth/login').send({ username: 'playerOne', password: 'password123' });

  const char = (await p1Agent.post('/api/characters').send({ name: 'P1Char', race: 'Human' })).body;
  expect(char.user_id).toBe(p1.id);

  // Player attempts to reassign sheet to playerTwo
  const putRes = await p1Agent.put(`/api/characters/${char.id}`).send({
    user_id: p2.id,
    name: 'RenamedChar',
  });
  expect(putRes.status).toBe(200);
  expect(putRes.body.user_id).toBe(p1.id); // Must remain playerOne
});
```

- [ ] **Step 2: Run tests to verify failure (Red phase)**
Run: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/server && ./node_modules/.bin/vitest run test/sheets.test.js"`
Confirm that the new assignment tests fail.

- [ ] **Step 3: Implement backend changes in `server/src/sheets.js`**

1. In `formatCharacterSheet(row)`:
   Ensure `owner_username: row.owner_username || ''` and `user_id: Number(row.user_id)`.
2. In `GET /` and `GET /:id`:
   Update SQL query from `SELECT * FROM character_sheets` to:
   ```sql
   SELECT c.*, u.username AS owner_username
   FROM character_sheets c
   LEFT JOIN users u ON c.user_id = u.id
   ```
3. In `POST /`:
   Check `const isGM = isGameMaster(db, req.session.userId);`.
   If `isGM && req.body.user_id !== undefined`:
     Validate: `const target = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.body.user_id);`
     If not found, `return res.status(400).json({ error: 'Assigned user does not exist' });`
     Use `target.id` as `ownerId`.
   Else:
     Use `req.session.userId` as `ownerId`.
   Insert using `ownerId`.
4. In `PUT /:id`:
   If `isGM && req.body.user_id !== undefined`:
     Validate: `const target = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.body.user_id);`
     If not found, `return res.status(400).json({ error: 'Assigned user does not exist' });`
     Include `user_id = ?` in the update SQL.
   Else:
     Retain `existing.user_id`.
   Fetch updated sheet with the `LEFT JOIN users` query and emit `sheet:updated`.

- [ ] **Step 4: Run tests to verify they pass (Green phase)**
Run: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/server && ./node_modules/.bin/vitest run test/sheets.test.js"`
Confirm all sheets tests pass.

- [ ] **Step 5: Commit backend changes**
Run: `git add server/src/sheets.js server/test/sheets.test.js && git commit -m "feat(sheets): allow GM to assign and reassign character sheets to player logins"`

---

### Task 2: Frontend Character Sheets Player Assignment UI

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue`
- Test: `client/test/CharacterSheetsView.test.js`

**Interfaces:**
- Consumes: `GET /api/auth/users`, `user_id` and `owner_username` on character sheet
- Produces: Player dropdown in sheet header and create modal for GM; read-only player attribution badge for players

- [ ] **Step 1: Write failing frontend tests in `client/test/CharacterSheetsView.test.js`**

Add tests in `client/test/CharacterSheetsView.test.js`:
1. Renders `player-select-wrap` with user options when `isGm` is true and character is selected.
2. Updates `selectedChar.user_id` and calls `updateCharacter` when GM changes the player selection.
3. Renders read-only `.badge-player` with `owner_username` when `isGm` is false.
4. Includes Assigned Player select in Create Character modal when `isGm` is true.

- [ ] **Step 2: Run frontend tests to verify failure (Red phase)**
Run: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/client && ./node_modules/.bin/vitest run test/CharacterSheetsView.test.js"`
Confirm the new tests fail.

- [ ] **Step 3: Implement frontend changes in `CharacterSheetsView.vue`**

1. Data:
   Add `registeredUsers: []` in `data()`.
2. Lifecycle:
   In `mounted()`:
   ```javascript
   if (this.isGm) {
     this.fetchUsers();
   }
   ```
3. Methods:
   Add `fetchUsers`:
   ```javascript
   async fetchUsers() {
     try {
       const res = await fetch('/api/auth/users', { credentials: 'include' });
       if (res.ok) {
         this.registeredUsers = await res.json();
       }
     } catch {
       this.registeredUsers = [];
     }
   }
   ```
   In `openCreateModal()`: default `this.newCharForm.user_id = this.currentUser?.id || (this.registeredUsers[0]?.id || null)`.
   In `createCharacter()`: include `user_id: this.isGm ? this.newCharForm.user_id : undefined` in POST payload.
4. Template:
   In `.header-main`:
   ```html
   <div v-if="isGm && registeredUsers.length > 0" class="player-select-wrap">
     <label>Player:</label>
     <select v-model="selectedChar.user_id" @change="updateCharacter" class="select-player">
       <option v-for="u in registeredUsers" :key="u.id" :value="u.id">
         {{ u.username }} ({{ u.role === 'GameMaster' ? 'GM' : 'Player' }})
       </option>
     </select>
   </div>
   <div v-else-if="selectedChar.owner_username" class="player-badge-wrap">
     <span class="badge-player" title="Assigned Player">
       👤 {{ selectedChar.owner_username }}
     </span>
   </div>
   ```
   In Create Character modal:
   ```html
   <div v-if="isGm && registeredUsers.length > 0" class="form-group">
     <label>Assigned Player</label>
     <select v-model="newCharForm.user_id" class="char-create-select">
       <option v-for="u in registeredUsers" :key="u.id" :value="u.id">
         {{ u.username }} ({{ u.role === 'GameMaster' ? 'GM' : 'Player' }})
       </option>
     </select>
   </div>
   ```
5. Style:
   Add scoped CSS:
   ```css
   .player-select-wrap {
     display: flex;
     align-items: center;
     gap: 6px;
   }
   .player-select-wrap label {
     font-size: 0.85rem;
     color: #8b949e;
   }
   .select-player {
     background-color: #000000;
     border: 1px solid rgba(0, 128, 128, 0.6);
     color: #45acba;
     padding: 6px 10px;
     border-radius: var(--radius);
     font-size: 13px;
     font-weight: 600;
   }
   .badge-player {
     border: 1px solid rgba(69, 172, 186, 0.4);
     color: #45acba;
     background: rgba(69, 172, 186, 0.12);
     border-radius: 4px;
     padding: 4px 8px;
     font-size: 0.85rem;
     font-weight: 600;
     display: inline-flex;
     align-items: center;
     gap: 4px;
   }
   ```

- [ ] **Step 4: Run frontend tests to verify they pass (Green phase)**
Run: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/client && ./node_modules/.bin/vitest run test/CharacterSheetsView.test.js"`
Confirm all CharacterSheetsView tests pass.

- [ ] **Step 5: Commit frontend changes**
Run: `git add client/src/views/CharacterSheetsView.vue client/test/CharacterSheetsView.test.js && git commit -m "feat(sheets): add GM player assignment controls to character sheet header and create modal"`

---

### Task 3: Full Verification & Service Refresh

**Files:**
- N/A (Verification)

- [ ] **Step 1: Run full frontend test suite**
Run: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/client && ./node_modules/.bin/vitest run"`
Verify all 55 test files pass.

- [ ] **Step 2: Run full backend test suite**
Run: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/server && npm test"`
Verify all 19 test files pass.

- [ ] **Step 3: Run client production build**
Run: `docker exec sf-vtt-dev sh -c "cd /Users/jrf/star-frontiers-vtt/client && npm run build"`
Verify Vite build compiles without errors.

- [ ] **Step 4: Restart services and verify health**
Run: `./sf-vtt-ctl.sh restart && ./sf-vtt-ctl.sh status`
Confirm backend (3000) and frontend (3001) are running and active.

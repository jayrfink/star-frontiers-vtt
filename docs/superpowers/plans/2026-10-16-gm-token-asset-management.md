# GM Token Asset Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement GameMaster-only file management capabilities to rename and delete token image assets directly through the web UI (in a dedicated Admin Tab-Page manager and quick actions in the Image Browser modal), with automatic database cascades and real-time canvas synchronization.

**Architecture:** 
- Backend: Mount GM-guarded endpoints (`PUT /api/upload/rename` and `DELETE /api/upload/file`) with path traversal protection, updating references in SQLite tables (`tokens` and `adversary_templates`), and broadcasting socket events (`token:asset-renamed`, `token:asset-deleted`).
- Frontend: Add a "Token Assets Management" section to `AdminView.vue` (for `/dashboard/admin`), add GM-only action buttons in `ImageBrowserModal.vue`, and listen for real-time asset updates in `VttCanvas.vue`.

**Tech Stack:** Express, Node.js (`fs`, `path`), SQLite (`better-sqlite3`), Socket.io, Vue 3, Vitest.

## Global Constraints
- Run all test and build commands in container: `docker exec sf-vtt-dev bash -c "<command>"`
- Server tests: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
- Client tests: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run"`
- Client build: `docker exec sf-vtt-dev bash -c "cd client && npm run build"`
- GM operations require `requireGM(db)` middleware; players receive HTTP 403 Forbidden.
- Directory traversal outside `data/uploads/` must be rejected with HTTP 400.

---

### Task 1: Backend GM Rename & Delete REST Endpoints + Database Cascade & Tests

**Files:**
- Modify: `server/src/upload.js`
- Modify: `server/src/index.js`
- Test: `server/test/upload.test.js`

**Interfaces:**
- Consumes: `requireGM(db)` from `server/src/middleware.js`, `scanUploads(dir)` from `server/src/upload.js`
- Produces: `PUT /api/upload/rename`, `DELETE /api/upload/file`, Socket.io events `token:asset-renamed` and `token:asset-deleted`

- [ ] **Step 1: Write the failing tests in `server/test/upload.test.js`**

Add tests to `server/test/upload.test.js`:
- `rejects rename from unauthenticated requests with 401`
- `rejects rename from Player with 403`
- `rejects rename with path traversal with 400`
- `rejects rename when target file already exists with 409`
- `successfully renames file, updates database references, and emits token:asset-renamed for GM`
- `rejects delete from Player with 403`
- `rejects delete with path traversal with 400`
- `successfully deletes file, clears database references, and emits token:asset-deleted for GM`

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/upload.test.js"`  
Expected: FAIL with 404 on `/api/upload/rename` and `/api/upload/file`.

- [ ] **Step 3: Implement `PUT /api/upload/rename` and `DELETE /api/upload/file` in `server/src/upload.js`**

1. Update `createUploadRouter(customUploadDir, db, io)` in `server/src/upload.js` to accept `db` and `io`.
2. Add `requireGM(db)` middleware guard to `PUT /rename` and `DELETE /file`.
3. In `PUT /rename`:
   - Validate `oldPath` and `newName`. Reject path traversal (`..` or `/` in `newName`).
   - Validate file extension is in `VALID_IMAGE_EXTENSIONS`.
   - Resolve source path and target path within `uploadDir`.
   - Check if source exists; check if target already exists (409 if true).
   - `fs.renameSync(sourcePath, targetPath)`.
   - Update `adversary_templates`:
     `db.prepare('UPDATE adversary_templates SET token_image_path = ? WHERE token_image_path = ?').run(newUrl, oldUrl);`
   - Update `tokens`:
     `db.prepare('UPDATE tokens SET avatar_url = ? WHERE avatar_url = ?').run(newUrl, oldUrl);`
   - If `io`, emit `token:asset-renamed` with `{ oldUrl, newUrl }`.
   - Return `{ success: true, oldUrl, newUrl }`.
4. In `DELETE /file`:
   - Resolve `path` query param or body within `uploadDir`. Prevent directory traversal.
   - If file does not exist, return 404.
   - `fs.unlinkSync(filePath)`.
   - Clear matching `adversary_templates.token_image_path`:
     `db.prepare('UPDATE adversary_templates SET token_image_path = "" WHERE token_image_path = ?').run(targetUrl);`
   - Clear matching `tokens.avatar_url`:
     `db.prepare('UPDATE tokens SET avatar_url = "" WHERE avatar_url = ?').run(targetUrl);`
   - If `io`, emit `token:asset-deleted` with `{ url: targetUrl }`.
   - Return `{ success: true, url: targetUrl }`.
5. Update `server/src/index.js` to pass `db` and `io` to `createUploadRouter(uploadsPath, db, io)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/upload.test.js"`  
Expected: PASS (all tests passing).

- [ ] **Step 5: Commit Task 1**

```bash
git add server/src/upload.js server/src/index.js server/test/upload.test.js
git commit -m "feat(upload): add GM-only rename and delete endpoints with database cascade"
```

---

### Task 2: Admin View "Token Assets Management" Card & Unit Tests

**Files:**
- Modify: `client/src/views/AdminView.vue`
- Create/Modify: `client/test/AdminView.test.js`

**Interfaces:**
- Consumes: `GET /api/upload/files`, `PUT /api/upload/rename`, `DELETE /api/upload/file`
- Produces: "Token Assets Management" card in `AdminView.vue`

- [ ] **Step 1: Write the failing tests in `client/test/AdminView.test.js`**

Create/update `client/test/AdminView.test.js`:
- Tests fetching and listing token images from `/api/upload/files` filtered to `tokens/` folder.
- Tests executing rename: prompts for new name and calls `PUT /api/upload/rename`.
- Tests executing delete: prompts confirmation and calls `DELETE /api/upload/file`.

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/AdminView.test.js"`  
Expected: FAIL (missing token assets card/methods).

- [ ] **Step 3: Implement Token Assets card in `client/src/views/AdminView.vue`**

1. In `AdminView.vue`, add a third card section:
   ```html
   <section class="admin-card">
     <div class="card-header-row">
       <h3>Token Assets Manager</h3>
       <button class="btn-secondary" @click="fetchTokens" :disabled="loadingTokens">↻ Refresh</button>
     </div>
     ...
   </section>
   ```
2. Include search filter input, grid/table of tokens with:
   - Circular thumbnail (`<img :src="token.url" />`)
   - Filename (`token.name`), size formatted in KB, last modified date.
   - Action buttons: `Rename` (`renameToken(token)`) and `Delete` (`deleteToken(token)`).
3. Implement `fetchTokens()`, `renameToken(token)`, and `deleteToken(token)` in `<script setup>`.
4. Style the card matching the existing Admin dark sci-fi aesthetic.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/AdminView.test.js"`  
Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add client/src/views/AdminView.vue client/test/AdminView.test.js
git commit -m "feat(admin): add Token Assets management card with rename and delete"
```

---

### Task 3: Image Browser Modal GM Actions & Canvas Real-Time Update

**Files:**
- Modify: `client/src/components/ImageBrowserModal.vue`
- Modify: `client/src/components/VttCanvas.vue`
- Modify: `client/test/ImageBrowserModal.test.js`

**Interfaces:**
- Consumes: `PUT /api/upload/rename`, `DELETE /api/upload/file`, Socket.io events `token:asset-renamed` and `token:asset-deleted`
- Produces: GM quick action buttons on image cards in `ImageBrowserModal.vue`, real-time canvas invalidation in `VttCanvas.vue`

- [ ] **Step 1: Write the failing tests in `client/test/ImageBrowserModal.test.js`**

Add tests:
- `displays rename and delete buttons on image cards when auth user is GameMaster`
- `does not display rename and delete buttons when auth user is Player`
- `handles GM rename action and triggers PUT /api/upload/rename`
- `handles GM delete action and triggers DELETE /api/upload/file`

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/ImageBrowserModal.test.js"`  
Expected: FAIL.

- [ ] **Step 3: Implement GM actions in `ImageBrowserModal.vue` and socket listeners in `VttCanvas.vue`**

1. In `ImageBrowserModal.vue`:
   - Access `auth = useAuthStore()`.
   - On each image card (`.image-card`), if `auth.user?.role === 'GameMaster'`, render overlay buttons for ✏️ Rename and 🗑️ Delete (with `@click.stop` to avoid selecting the card).
   - Implement `handleRename(file)` and `handleDelete(file)` calling `/api/upload/rename` and `/api/upload/file`.
   - Refresh image list upon success.
2. In `VttCanvas.vue`:
   - In `mounted()` / socket listeners, listen for `token:asset-renamed`:
     ```javascript
     this.socket.on('token:asset-renamed', ({ oldUrl, newUrl }) => {
       for (const t of this.tokens) {
         if (t.avatar_url === oldUrl) t.avatar_url = newUrl;
       }
       this.drawCanvas();
     });
     this.socket.on('token:asset-deleted', ({ url }) => {
       for (const t of this.tokens) {
         if (t.avatar_url === url) t.avatar_url = '';
       }
       this.drawCanvas();
     });
     ```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/ImageBrowserModal.test.js"`  
Expected: PASS.

- [ ] **Step 5: Run full server and client verification suites**

Run:
- `docker exec sf-vtt-dev bash -c "cd server && npm test"`
- `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`

- [ ] **Step 6: Commit Task 3**

```bash
git add client/src/components/ImageBrowserModal.vue client/src/components/VttCanvas.vue client/test/ImageBrowserModal.test.js
git commit -m "feat(vtt): add GM quick actions to ImageBrowserModal and real-time canvas asset sync"
```

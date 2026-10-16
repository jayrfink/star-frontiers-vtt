# Admin Uploads & Assets File Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GameMaster-only File Manager on the Admin panel rooted in `/uploads/` allowing directory creation, empty directory deletion, file moves across folders with atomic SQLite database cascades, and real-time Socket.io canvas synchronization.

**Architecture:** Extend `server/src/upload.js` with `POST /api/upload/folder`, `DELETE /api/upload/folder`, and `PUT /api/upload/move` (cascading across `tokens`, `maps`, `adversary_templates`, `character_sheets`, and `ship_sheets` in an atomic SQLite transaction and emitting socket events). Replace the token-only table in `client/src/views/AdminView.vue` with a folder/breadcrumb file manager with folder navigation, move modal, delete folder, and file action buttons.

**Tech Stack:** Node.js, Express, Multer, better-sqlite3, Socket.io, Vue 3, Vitest.

## Global Constraints
- Run all test and build commands in container: `docker exec sf-vtt-dev bash -c "<command>"`
- Full server test suite: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
- Full client test suite & build: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
- All file and directory operations require GameMaster role via `requireGM(db)` in `server/src/middleware.js`; reject Player with 403, unauthenticated with 401.
- Sanitize all folder and file paths with traversal protection; reject components containing `..` or escaping `data/uploads/` with 400.
- Creating an existing directory or moving to an existing destination file name returns 409 Conflict.
- Deleting a non-empty directory returns 400 Bad Request.
- Root directory (`""`, `/`, `uploads/`) can never be deleted.
- Database cascades in `upload.js` must execute inside an atomic SQLite transaction (`db.transaction(...)`).
- Maintain dark sci-fi aesthetic consistent with `AdminView.vue`.

---

### Task 1: Backend Folder CRUD & File Move with Database Cascades & Tests

**Files:**
- Modify: `server/src/upload.js`
- Test: `server/test/upload.test.js`

**Interfaces:**
- Produces:
  - `POST /api/upload/folder`: `{ folder: string }` -> `{ success: true, folder: string }`
  - `DELETE /api/upload/folder`: `?folder=string` or `{ folder: string }` -> `{ success: true, folder: string }`
  - `PUT /api/upload/move`: `{ sourcePath: string, destinationFolder: string }` -> `{ success: true, oldUrl: string, newUrl: string }`
  - Enhanced cascades in `PUT /api/upload/rename` and `DELETE /api/upload/file` to include `maps.background_url`.

- [ ] **Step 1: Write the failing tests in `server/test/upload.test.js`**

Add tests covering:
1. `POST /api/upload/folder`: 401 unauth, 403 player, 400 traversal, 201 creation, 409 conflict if already exists.
2. `DELETE /api/upload/folder`: 401 unauth, 403 player, 400 traversal, 400 root folder deletion, 400 non-empty folder rejection, 200 empty folder deletion.
3. `PUT /api/upload/move`: 401 unauth, 403 player, 400 traversal, 404 missing source, 409 destination collision, 200 move with SQLite cascade across `tokens`, `maps`, `adversary_templates`, `character_sheets`, `ship_sheets` and socket emissions (`token:asset-renamed`, `map:asset-renamed`).
4. Cascades in rename and delete for `maps.background_url`.

- [ ] **Step 2: Run test to verify failure**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/upload.test.js"`
Expected: FAIL with 404 on `/api/upload/folder` or `/api/upload/move`.

- [ ] **Step 3: Implement endpoints in `server/src/upload.js`**

Implement:
1. `POST /api/upload/folder`:
   - Guarded by `gmGuard`.
   - Sanitize `req.body.folder`.
   - Resolve target directory inside `uploadDir`.
   - If exists, return 409 `{ error: 'Folder already exists' }`.
   - `fs.mkdirSync(targetDir, { recursive: true })`.
   - Return 201 `{ success: true, folder: sanitizedFolder }`.
2. `DELETE /api/upload/folder`:
   - Guarded by `gmGuard`.
   - Sanitize `req.query.folder || req.body.folder`.
   - Reject empty string or root folder with 400 `{ error: 'Cannot delete root folder' }`.
   - Check `!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()` -> 404 `{ error: 'Folder not found' }`.
   - Read entries with `fs.readdirSync(targetDir)`. If non-hidden entries exist, return 400 `{ error: 'Folder is not empty' }`.
   - `fs.rmdirSync(targetDir)`.
   - Return 200 `{ success: true, folder: sanitizedFolder }`.
3. `PUT /api/upload/move`:
   - Guarded by `gmGuard`.
   - Extract `sourcePath` (or `sourceUrl`) and `destinationFolder` from `req.body`.
   - Sanitize `sourcePath` with `sanitizeUploadPath` and `destinationFolder` with `sanitizeFolder`.
   - Check source exists and is file -> 404 if not.
   - Target filename = `path.basename(sourcePath)`. Target full path = `path.join(uploadDir, sanitizedDest, targetFilename)`.
   - Ensure destination directory exists (`fs.mkdirSync(destDir, { recursive: true })`).
   - If destination file already exists -> return 409 `{ error: 'Target file already exists' }`.
   - `fs.renameSync(sourceFullPath, destFullPath)`.
   - `oldUrl = '/uploads/' + relSource`, `newUrl = '/uploads/' + relDest`.
   - In atomic transaction `db.transaction(...)`:
     - Update `tokens.avatar_url` from `oldUrl` to `newUrl`.
     - Update `maps.background_url` from `oldUrl` to `newUrl`.
     - Update `adversary_templates.token_image_path` from `oldUrl` to `newUrl`.
     - Update `character_sheets.avatar_url` from `oldUrl` to `newUrl`.
     - Update `ship_sheets.avatar_url` from `oldUrl` to `newUrl`.
   - Emit Socket.io `token:asset-renamed` and `map:asset-renamed`.
   - Return 200 `{ success: true, oldUrl, newUrl }`.
4. Update `PUT /api/upload/rename` transaction to include `maps.background_url` and emit `map:asset-renamed`.
5. Update `DELETE /api/upload/file` transaction to clear `maps.background_url` and emit `map:asset-deleted`.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/upload.test.js"`
Expected: PASS (all tests in `upload.test.js` green).

- [ ] **Step 5: Verify full server suite passes**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: PASS (12/12 suites, 120+ tests pass).

- [ ] **Step 6: Commit**

```bash
git add server/src/upload.js server/test/upload.test.js
git commit -m "feat(upload): add GM folder CRUD, file move endpoints, and map cascade"
```

---

### Task 2: Frontend Admin View Uploads & Assets File Manager UI & Tests

**Files:**
- Modify: `client/src/views/AdminView.vue`
- Test: `client/test/AdminView.test.js`

**Interfaces:**
- Consumes:
  - `GET /api/upload/files`: `{ files: [...], folders: [...] }`
  - `POST /api/upload/folder`: `{ folder: string }`
  - `DELETE /api/upload/folder?folder=string`
  - `PUT /api/upload/move`: `{ sourcePath: string, destinationFolder: string }`
  - `PUT /api/upload/rename`: `{ oldPath: string, newName: string }`
  - `DELETE /api/upload/file?path=string`
  - `POST /api/upload` (multipart with `folder` field)

- [ ] **Step 1: Write the failing tests in `client/test/AdminView.test.js`**

Add unit tests covering:
1. Renders File Manager card with breadcrumbs starting at `uploads`.
2. Lists direct child folders and files for current directory.
3. Navigating into a subfolder updates breadcrumbs and shows `.. (Go up one level)`.
4. Clicking breadcrumb segment navigates directly to that folder.
5. Create new folder flow (`prompt` -> `POST /api/upload/folder`).
6. Delete empty folder flow (`DELETE /api/upload/folder`).
7. Move file modal opening, folder select dropdown, and move submission (`PUT /api/upload/move`).
8. Search filtering within current folder.

- [ ] **Step 2: Run test to verify failure**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/AdminView.test.js"`
Expected: FAIL due to missing breadcrumb navigation and move modal elements.

- [ ] **Step 3: Implement File Manager in `client/src/views/AdminView.vue`**

Implement:
1. Replace "Token Assets Manager" card with "Uploads & Assets Manager".
2. Add breadcrumb trail with clickable segments.
3. Add action buttons: `+ New Folder` and hidden file input triggered by `Upload File Here` (posts with `currentFolder`).
4. Display directory table:
   - If `currentFolder !== ''`, render `📁 .. (Go up one level)` row.
   - Render direct subdirectories with folder icon, name, item count, and `Delete Folder` button (disabled or checks if count > 0).
   - Render files with preview thumbnail, filename, size, date, and `Rename`, `Move`, `Delete` buttons.
5. Implement Move File modal:
   - Opens when clicking `Move` on a file.
   - Shows dropdown of all directories from `allFolders` (`Root (uploads/)` for `""`).
   - Calls `PUT /api/upload/move` and refreshes files.
6. Implement Create Folder:
   - Prompts for folder name, calls `POST /api/upload/folder`, and refreshes files.
7. Implement Delete Folder:
   - Prompts confirmation, calls `DELETE /api/upload/folder?folder=...`.
8. Retain search input filtering current view.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/AdminView.test.js"`
Expected: PASS.

- [ ] **Step 5: Verify full client test suite and production build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: PASS (all tests pass, build succeeds).

- [ ] **Step 6: Commit**

```bash
git add client/src/views/AdminView.vue client/test/AdminView.test.js
git commit -m "feat(admin): replace token table with comprehensive uploads file manager"
```

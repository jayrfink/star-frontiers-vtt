# Admin Uploads & Assets File Manager Design Specification

## Overview
This specification details the architecture, REST endpoints, database cascade logic, and user interface for an integrated GameMaster-only File Manager on the Admin panel (`/dashboard/admin`). The File Manager is rooted at `/uploads/` (with `tokens/`, `maps/`, and user-defined directories as subdirectories) and empowers the GM to create directories, delete empty directories, move files between directories, rename files, and delete files, with full SQLite cascade and real-time Socket.io canvas synchronization.

---

## 1. Backend REST Endpoints (`server/src/upload.js`)

All endpoints below require authentication with the `GameMaster` role via `requireGM(db)` middleware. Requests from unauthenticated users return `401 Unauthorized`; requests from users with role `Player` return `403 Forbidden`.

### 1.1 `POST /api/upload/folder` (Create Directory)
- **Request Body**: `{ "folder": "subfolder/path" }`
- **Validation**:
  - Sanitized using `sanitizeFolder(folder)`.
  - Rejects empty strings, path traversal components (`..`), or characters outside valid directory naming.
  - Resolves target directory inside `data/uploads/` and verifies `path.relative` stays inside `data/uploads/`.
- **Behavior**:
  - If directory already exists, returns `409 Conflict` (`{ error: "Folder already exists" }`).
  - Calls `fs.mkdirSync(targetDir, { recursive: true })`.
- **Response**: `201 Created` with `{ success: true, folder: "subfolder/path" }`.

### 1.2 `DELETE /api/upload/folder` (Delete Empty Directory)
- **Query / Body**: `?folder=subfolder/path` or `{ "folder": "subfolder/path" }`
- **Validation**:
  - Sanitized using `sanitizeFolder(folder)`.
  - Rejects attempts to delete root (`""`, `/`, `uploads/`).
  - Ensures target directory exists and is a directory (`fs.statSync(targetDir).isDirectory()`).
- **Empty Guard**:
  - Reads directory entries with `fs.readdirSync(targetDir)`.
  - If any non-hidden entries exist (files or subfolders), returns `400 Bad Request` (`{ error: "Folder is not empty" }`).
- **Behavior**:
  - Calls `fs.rmdirSync(targetDir)`.
- **Response**: `200 OK` with `{ success: true, folder: "subfolder/path" }`.

### 1.3 `PUT /api/upload/move` (Move File)
- **Request Body**: `{ "sourcePath": "tokens/scout.png", "destinationFolder": "ships" }`
- **Validation**:
  - Sanitizes `sourcePath` via `sanitizeUploadPath(sourcePath)`.
  - Sanitizes `destinationFolder` via `sanitizeFolder(destinationFolder)` (empty string `""` represents root `uploads/`).
  - Ensures `sourcePath` exists and is a file (`fs.statSync(sourcePath).isFile()`).
  - Resolves target path `path.join(uploadDir, destFolder, path.basename(sourcePath))` and ensures destination directory exists.
  - If destination file already exists, returns `409 Conflict` (`{ error: "Target file already exists" }`).
- **Behavior**:
  - Moves file using `fs.renameSync(sourceFullPath, destFullPath)`.
  - Computes `oldUrl = "/uploads/" + relSource`, `newUrl = "/uploads/" + relDest`.
  - Executes database cascade inside an atomic `db.transaction(...)`:
    ```javascript
    db.prepare("UPDATE tokens SET avatar_url = ? WHERE avatar_url = ?").run(newUrl, oldUrl);
    db.prepare("UPDATE maps SET background_url = ? WHERE background_url = ?").run(newUrl, oldUrl);
    db.prepare("UPDATE adversary_templates SET token_image_path = ? WHERE token_image_path = ?").run(newUrl, oldUrl);
    db.prepare("UPDATE character_sheets SET avatar_url = ? WHERE avatar_url = ?").run(newUrl, oldUrl);
    db.prepare("UPDATE ship_sheets SET avatar_url = ? WHERE avatar_url = ?").run(newUrl, oldUrl);
    ```
  - Emits Socket.io event `token:asset-renamed` with `{ oldUrl, newUrl }`.
  - Emits Socket.io event `map:asset-renamed` with `{ oldUrl, newUrl }`.
- **Response**: `200 OK` with `{ success: true, oldUrl, newUrl }`.

### 1.4 Enhancements to Existing Endpoints
- **`PUT /api/upload/rename`**:
  - Extend the atomic `db.transaction` cascade to include `maps.background_url`:
    ```javascript
    db.prepare("UPDATE maps SET background_url = ? WHERE background_url = ?").run(toUrl, fromUrl);
    ```
- **`DELETE /api/upload/file`**:
  - Extend the atomic `db.transaction` cascade to clear `maps.background_url`:
    ```javascript
    db.prepare("UPDATE maps SET background_url = '' WHERE background_url = ?").run(toClear);
    ```

---

## 2. Frontend File Manager (`client/src/views/AdminView.vue`)

Replace the existing "Token Assets Manager" card with the comprehensive "Uploads & Assets Manager" card.

### 2.1 State Management
- `allFiles = ref([])`: Array of file objects from `GET /api/upload/files`.
- `allFolders = ref([])`: Array of folder paths from `GET /api/upload/files`.
- `currentFolder = ref("")`: Current relative path (e.g., `""` for root `/uploads`, `"tokens"`, `"maps/space"`).
- `searchQuery = ref("")`: Search string for filtering files/folders.
- `moveModalOpen = ref(false)`: Visibility toggle for Move File modal.
- `fileToMove = ref(null)`: File currently selected for move.
- `targetDestinationFolder = ref("")`: Selected destination folder in the Move modal.

### 2.2 Computed Display Items
- **Current Folder Folders**:
  - Filter `allFolders` to direct immediate children of `currentFolder`.
- **Current Folder Files**:
  - Filter `allFiles` to files whose `folder === currentFolder`.
- **Search Filtering**:
  - If `searchQuery` is present, filters items by matching names in the current folder.

### 2.3 UI Layout & Controls
1. **Header & Breadcrumbs**:
   - Breadcrumb navigation trail: `[ uploads ] / [ tokens ] / ...`
   - Clicking any segment sets `currentFolder` to that segment's path.
   - Action buttons on top right: `+ New Folder` and `Upload File Here`.
2. **Directory Table**:
   - Columns: `Type`, `Name / Preview`, `Size / Items`, `Modified`, `Actions`.
   - `📁 .. (Go up one level)` row appears at top when `currentFolder !== ""`.
   - Folder rows display folder icon `📁`, folder name, count of contained items, and `🗑️ Delete Folder` button (enabled if empty).
   - File rows display preview thumbnail `🖼️`, filename, formatted size (`formatFileSize`), formatted date (`formatDate`), and action buttons:
     - `✏️ Rename`: prompts for new filename and calls `PUT /api/upload/rename`.
     - `📦 Move`: opens Move File dialog.
     - `🗑️ Delete`: prompts confirmation and calls `DELETE /api/upload/file`.
3. **Move File Dialog**:
   - Dropdown of all available folders in `allFolders` (displaying `uploads/ (root)` for `""`).
   - Confirm button invokes `PUT /api/upload/move`.

---

## 3. Real-Time Canvas Updates (`VttCanvas.vue` & `SpaceVttCanvas.vue`)
- The canvas components already listen to `token:asset-renamed` and `token:asset-deleted`, updating tokens, migrating `imageCache` entries without flicker, and redrawing.
- When maps have their background renamed or moved, `map:asset-renamed` notifies open clients so active battle map backgrounds update seamlessly.

---

## 4. Verification & Testing

### 4.1 Backend Suite (`server/test/upload.test.js`)
- Unit and integration tests for:
  1. `POST /api/upload/folder`: 201 creation, 401 unauth, 403 player, 400 traversal, 409 conflict.
  2. `DELETE /api/upload/folder`: 200 deletion of empty folder, 400 rejection of non-empty folder, 400 rejection of root.
  3. `PUT /api/upload/move`: 200 move with DB cascade across all 5 tables (`tokens`, `maps`, `adversary_templates`, `character_sheets`, `ship_sheets`), 409 conflict if target exists, 404 if source missing.
  4. Cascades in rename and delete for `maps.background_url`.

### 4.2 Frontend Suite (`client/test/AdminView.test.js`)
- Unit tests verifying:
  1. Rendering of files and directories within current folder.
  2. Breadcrumb navigation and going up to parent directory.
  3. Folder creation dialog and API call.
  4. Move file modal and destination folder selection.
  5. Delete empty folder vs non-empty folder state.
  6. File rename and delete flows.

### 4.3 End-to-End Build & Test Run
- Full server tests pass (`docker exec sf-vtt-dev bash -c "cd server && npm test"`).
- Full client tests & production build pass (`docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`).

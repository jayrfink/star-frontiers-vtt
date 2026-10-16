# GM Token Asset Management (Rename & Delete) Specification

**Date:** 2026-10-16  
**Status:** Approved  
**Author:** Antigravity / Superpowers  

---

## 1. Overview & Goals

As Game Masters generate AI token art, upload custom portraits, and configure battle maps, they need the ability to curate, organize, rename, and delete token image assets directly through the web UI without accessing the backend server filesystem or CLI.

### Goals
1. **GM Exclusivity:** All rename and delete operations require authentication with `role === 'GameMaster'`. Players (`role === 'Player'`) are forbidden from altering or deleting files on disk.
2. **Dedicated Admin File Manager:** Add a "Token Assets Management" card to the GM-only Admin Tab-Page (`/dashboard/admin`) with thumbnails, metadata, search, rename, and delete actions.
3. **In-Situ Image Browser Actions:** Allow GMs to quickly rename or delete token images directly from the `ImageBrowserModal.vue` component when picking assets for maps or adversaries.
4. **Database Cascade & Real-Time Sync:** When a token image is renamed or deleted:
   - Synchronize database references in `adversary_templates` (`token_image_path`) and `tokens` (`avatar_url`).
   - Broadcast Socket.io events (`token:asset-renamed`, `token:asset-deleted`) so active canvas instances update and redraw without requiring page reloads.
5. **Path Traversal Security:** Strictly enforce upload directory boundaries to prevent directory traversal or deletion of system files.

---

## 2. Backend Architecture & API Contracts

### 2.1 Access Control Middleware
Both endpoints are protected with `requireGM(db)`:
```javascript
import { requireGM } from './middleware.js';
router.put('/rename', requireGM(db), ...);
router.delete('/file', requireGM(db), ...);
```

### 2.2 Endpoints

#### `PUT /api/upload/rename`
Renames a file within `data/uploads/`.
- **Request Body:**
  ```json
  {
    "oldPath": "tokens/token_sathar_123.png",
    "newName": "sathar_shock_trooper.png"
  }
  ```
- **Validation Rules:**
  - `oldPath` and `newName` must be non-empty strings.
  - Path traversal (`..`, `/`, `\`) in `newName` is strictly rejected (sanitized via basename).
  - Target file extension must match a valid image extension (`.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.gif`).
  - Source file must exist on disk; target file must not exist (returns `409 Conflict` if target exists).
- **Execution & Database Cascade:**
  1. Renames source file to target file via `fs.renameSync`.
  2. Updates `adversary_templates.token_image_path`:
     ```sql
     UPDATE adversary_templates 
     SET token_image_path = ? 
     WHERE token_image_path = ?
     ```
  3. Updates `tokens.avatar_url`:
     ```sql
     UPDATE tokens 
     SET avatar_url = ? 
     WHERE avatar_url = ?
     ```
  4. Broadcasts Socket.io event `token:asset-renamed`:
     ```json
     {
       "oldUrl": "/uploads/tokens/token_sathar_123.png",
       "newUrl": "/uploads/tokens/sathar_shock_trooper.png"
     }
     ```
  5. Returns HTTP 200:
     ```json
     {
       "success": true,
       "oldUrl": "/uploads/tokens/token_sathar_123.png",
       "newUrl": "/uploads/tokens/sathar_shock_trooper.png"
     }
     ```

#### `DELETE /api/upload/file`
Deletes a file within `data/uploads/`.
- **Query Parameter or Body:** `path=tokens/token_sathar_123.png`
- **Validation Rules:**
  - Resolves target path within `data/uploads/`. Rejects path traversal (`..` or root escaping).
  - Verifies file exists on disk (returns `404 Not Found` if missing).
- **Execution & Database Cascade:**
  1. Deletes file via `fs.unlinkSync`.
  2. Clears matching database references:
     ```sql
     UPDATE adversary_templates 
     SET token_image_path = '' 
     WHERE token_image_path = ?
     ```
     ```sql
     UPDATE tokens 
     SET avatar_url = '' 
     WHERE avatar_url = ?
     ```
  3. Broadcasts Socket.io event `token:asset-deleted`:
     ```json
     {
       "url": "/uploads/tokens/token_sathar_123.png"
     }
     ```
  4. Returns HTTP 200:
     ```json
     {
       "success": true,
       "url": "/uploads/tokens/token_sathar_123.png"
     }
     ```

---

## 3. Frontend UI Specifications

### 3.1 Admin View (`client/src/views/AdminView.vue`)
- Adds a **Token Assets Management** card below the existing users list.
- **Components & Layout:**
  - Header with title: `Token Assets Manager` and `↻ Refresh` button.
  - Search filter input to filter tokens by filename.
  - Grid/table displaying token image assets in `/uploads/tokens`:
    - Circular thumbnail (44px) with border ring.
    - Filename and relative URL.
    - File size in KB.
    - Last modified date formatted.
    - Action buttons:
      - ✏️ `Rename`: Opens inline edit prompt or input modal.
      - 🗑️ `Delete`: Triggers confirm dialog before deleting.
  - Feedback alerts for success and error messages.

### 3.2 Image Browser Modal (`client/src/components/ImageBrowserModal.vue`)
- Uses `auth.user?.role === 'GameMaster'` to conditionally show GM controls.
- When hovering or selecting an image card in the gallery:
  - If GM, displays action icons in card header or corner:
    - ✏️ Rename button (calls `PUT /api/upload/rename`).
    - 🗑️ Delete button (calls `DELETE /api/upload/file`).
  - Automatically refreshes image list after rename or delete.
  - If the currently selected image was deleted, clears `selectedUrl`.

### 3.3 Canvas Real-Time Update (`client/src/components/VttCanvas.vue`)
- Listens to `token:asset-renamed`:
  - Iterates local `tokens` array; replaces matching `avatar_url` with `newUrl`.
  - Invalidates token image cache and invokes `drawCanvas()`.
- Listens to `token:asset-deleted`:
  - Iterates local `tokens` array; resets matching `avatar_url` to `''`.
  - Clears image cache entry and redraws canvas with fallback procedural token.

---

## 4. Verification & Testing Plan

### 4.1 Server Unit & Integration Tests (`server/test/upload.test.js`)
1. **GM Access Control:**
   - Unauthenticated request to rename/delete returns 401.
   - Player request to rename/delete returns 403.
   - GM request succeeds with 200.
2. **Rename Validation:**
   - Path traversal attempt (e.g., `../../etc/passwd`) is rejected with 400.
   - Target collision (target file already exists) returns 409.
   - Renaming file updates file on disk, updates `tokens` table and `adversary_templates` table, and emits `token:asset-renamed`.
3. **Delete Validation:**
   - Path traversal attempt is rejected with 400.
   - Deleting file removes file from disk, clears `tokens.avatar_url` and `adversary_templates.token_image_path`, and emits `token:asset-deleted`.

### 4.2 Client Unit Tests
1. **AdminView.vue:** Tests rendering token assets list, renaming a token, and deleting a token.
2. **ImageBrowserModal.vue:** Tests that GM sees rename/delete buttons and can trigger them, while Player does not see GM action buttons.

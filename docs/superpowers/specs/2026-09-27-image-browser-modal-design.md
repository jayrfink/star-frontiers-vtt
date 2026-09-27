# Image Browser Modal & Uploads Explorer Design

**Date**: 2026-09-27  
**Status**: Approved  
**Topic**: Shared Image Browser Modal for Browsing and Uploading Token & Portrait Images  

---

## 1. Problem Statement
Currently, clicking a portrait on a Character Sheet or Ship Sheet immediately triggers a native file upload dialog that uploads a new file to `data/uploads/`. Over time, this leads to duplicate files and thousands of unorganized images on the server. Furthermore, users cannot select previously uploaded tokens or organize tokens into categorized folders (e.g. `upf/`, `sathar/`, `characters/`).

---

## 2. Goals & Scope
1. **Browse Existing Uploads**: Provide a modal that scans `data/uploads/` (including nested subfolders) and presents thumbnails for selection.
2. **Breadcrumb Explorer**: Support navigating into subdirectories and back via clickable breadcrumbs (`Home (Root) > upf > ...`) and back buttons.
3. **Upload New Images**: Maintain the ability to upload new image files directly from within the browser modal.
4. **Shared Reusability**: Reusable across Character Sheets, Ship Sheets, Create Ship / Create Character modals, and VTT Add Token modals.
5. **Theme Compliance**: Fully styled with site dark sci-fi themes (pure black `#000000` backgrounds, dark aqua/teal borders, aquamarine/cyan highlights, `#e0e0e0` text).

---

## 3. Architecture & Backend API

### 3.1 `GET /api/upload/files`
- **Authentication**: `requireAuth`
- **Scanning Logic**:
  - Recursively traverses `data/uploads/`.
  - Filters by image extensions: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`.
  - Excludes hidden files (e.g. `.DS_Store`).
  - Normalizes relative paths with forward slashes (`/`).
- **Response Format**:
  ```json
  {
    "files": [
      {
        "name": "upf_assault_scout.png",
        "relativePath": "upf/upf_assault_scout.png",
        "folder": "upf",
        "url": "/uploads/upf/upf_assault_scout.png",
        "size": 45120,
        "mtime": "2026-09-27T20:44:00.000Z"
      }
    ],
    "folders": ["", "upf", "sathar"]
  }
  ```

### 3.2 `POST /api/upload` Enhancement
- Supports an optional `folder` body parameter (e.g. `folder: "upf"`).
- Sanitizes the folder path to avoid directory traversal (disallowing `..` or leading `/`).
- Ensures target destination exists via `fs.mkdirSync(targetDir, { recursive: true })`.
- Returns the public URL (e.g. `/uploads/upf/filename.png`).

---

## 4. Frontend Component (`ImageBrowserModal.vue`)

### 4.1 Component Interface
- **Props**:
  - `modelValue`: `Boolean` — Controls modal visibility (`v-model`).
  - `title`: `String` — Default: `'Select Token / Portrait Image'`.
  - `currentImage`: `String` — Currently selected image URL (highlighted in list).
- **Emits**:
  - `update:modelValue`: `Boolean` — Closes modal.
  - `select`: `String` — Emits chosen image URL.

### 4.2 State Management
- `files`: Array of all available image files fetched from server.
- `folders`: Array of unique folder paths.
- `currentFolder`: String path representing current folder (defaults to `""` for root).
- `searchQuery`: String for live filename search.
- `selectedUrl`: String currently highlighted image.
- `uploading`: Boolean indicating in-progress upload.

### 4.3 Navigation & Breadcrumbs
- `breadcrumbs`: Computed array of path segments (`[{ name: 'Root', path: '' }, { name: 'upf', path: 'upf' }]`).
- `subfolders`: Immediate child folders of `currentFolder`.
- `currentFiles`: Files located in `currentFolder` (or all matching files if global search is active).
- `goUp()`: Navigates to the parent directory.

### 4.4 Actions
- **Single click**: Highlights card.
- **Double click**: Selects image and closes modal.
- **"Use Image" button**: Confirms selection.
- **"+ Upload New Image" button**: Triggers file input, uploads to `currentFolder`, automatically selects newly uploaded image and closes modal.

---

## 5. Integration Points

1. **ShipSheetsView.vue**:
   - Header portrait click opens `ImageBrowserModal`. Selected image updates `selectedShip.avatar_url` and calls `updateShip()`.
   - Create Ship modal avatar row opens `ImageBrowserModal` to select an image for `newShipForm.avatar_url`.
2. **CharacterSheetsView.vue**:
   - Header portrait click opens `ImageBrowserModal`. Selected image updates `selectedChar.avatar_url` and calls `updateCharacter()`.
   - Create Character modal avatar row opens `ImageBrowserModal` for `newCharForm.avatar_url`.
3. **SpaceVttView.vue** & **RpgVttView.vue**:
   - In "Add Token" modal, avatar section has a "Browse Uploads" button opening `ImageBrowserModal` to populate `newTokenForm.avatar_url`.

---

## 6. Testing & Verification

1. **Server Unit Tests (`server/test/upload.test.js`)**:
   - Verify `GET /api/upload/files` returns files and folder hierarchy.
   - Verify `POST /api/upload` handles target subfolder and sanitizes path traversal.
   - Verify non-image files are excluded.
2. **Client Unit Tests (`client/test/ImageBrowserModal.test.js`)**:
   - Breadcrumb navigation and folder level transitions.
   - Live search filtering by filename.
   - Image selection and event emission.
3. **End-to-End Build & Run**:
   - Full Vitest suite (`server && client`).
   - Production Vite build (`npm run build`).

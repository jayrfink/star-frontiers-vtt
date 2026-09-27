# Image Browser Modal & Uploads Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared, reusable Image Browser Modal with breadcrumb subfolder navigation and live search that allows browsing existing uploads in `data/uploads/` as well as uploading new images, integrated across Character Sheets, Ship Sheets, and VTT token modals.

**Architecture:** Express endpoint `GET /api/upload/files` scans `data/uploads` recursively and returns image file metadata and directory hierarchy. The frontend `ImageBrowserModal.vue` provides breadcrumb navigation, live search, folder cards, thumbnail selection, and inline file upload with immediate selection.

**Tech Stack:** Node.js, Express, Multer, Vue 3, Vitest, Vite.

## Global Constraints
- Run all test and build commands in container: `docker exec sf-vtt-dev bash -c "<command>"`
- Match site dark sci-fi themes: `#000000` backgrounds, `rgba(0, 128, 128, 0.6)` teal borders, `aquamarine` and `#00ffff` highlights, `#e0e0e0` text
- Image file types supported: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`
- Preserve existing upload route functionality and backward compatibility

---

### Task 1: Server: Implement `GET /api/upload/files` and Subfolder Uploads

**Files:**
- Modify: `server/src/upload.js`
- Test: `server/test/upload.test.js`

**Interfaces:**
- Produces: `GET /api/upload/files` -> `{ files: [{ name, relativePath, folder, url, size, mtime }], folders: string[] }`
- Produces: `POST /api/upload` with optional `folder` body field -> `{ url }` (e.g. `/uploads/upf/image.png`)

- [ ] **Step 1: Write the failing tests in `server/test/upload.test.js`**

Add tests for:
1. `GET /api/upload/files` returns 401 when unauthenticated.
2. `GET /api/upload/files` returns 200 with list of image files and folders when authenticated, including nested folders and excluding hidden files (`.DS_Store`).
3. `POST /api/upload` with `folder` field uploads to sanitized subfolder and returns URL like `/uploads/subfolder/filename.ext`.

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/upload.test.js"`
Expected: FAIL (route `/files` does not exist yet)

- [ ] **Step 3: Implement recursive scanning and folder upload in `server/src/upload.js`**

Implement helper `scanUploads(dir, baseDir)`:
- Recursively traverses subdirectories.
- Filters valid extensions: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`.
- Ignores entries starting with `.` (hidden files).
- Returns list of files with `{ name, relativePath, folder, url: `/uploads/${relativePath}`, size, mtime }` and list of unique folders.
Add `router.get('/files', ...)` returning `{ files, folders }`.
Update `router.post('/')` multer storage destination to sanitize `req.body.folder` (stripping leading/trailing slashes and rejecting `..`) and creating subfolder if provided.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/upload.test.js"`
Expected: PASS (all tests pass)

- [ ] **Step 5: Commit**

```bash
git add server/src/upload.js server/test/upload.test.js
git commit -m "feat(server): add GET /api/upload/files and subfolder upload support"
```

---

### Task 2: Client: Create `ImageBrowserModal.vue` Component & Unit Tests

**Files:**
- Create: `client/src/components/ImageBrowserModal.vue`
- Create: `client/test/ImageBrowserModal.test.js`

**Interfaces:**
- Consumes: `GET /api/upload/files`, `POST /api/upload`
- Produces: `<ImageBrowserModal v-model="show" :current-image="url" @select="onSelect" />`

- [ ] **Step 1: Write the unit tests in `client/test/ImageBrowserModal.test.js`**

Test component logic:
1. Computes breadcrumbs correctly based on `currentFolder` (e.g. `""` -> `[Root]`, `"upf/scouts"` -> `[Root, upf, scouts]`).
2. Filters `currentFiles` by active folder and search query.
3. Computes immediate `subfolders` for current directory.
4. Emits `select` and `update:modelValue` on image confirmation.

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/ImageBrowserModal.test.js"`
Expected: FAIL (`ImageBrowserModal.vue` does not exist yet)

- [ ] **Step 3: Implement `client/src/components/ImageBrowserModal.vue`**

Implement:
- Modal backdrop and card styled to site theme (`#000000` background, teal borders, aqua highlights).
- Header with title, close `✕` button.
- Breadcrumb toolbar: clickable crumbs (`Uploads > upf > ...`), `[← Back]` button when in subfolder, "+ Upload New Image" button with hidden file input.
- Search input with placeholder: `"Search images by filename..."`.
- Gallery grid:
  - Folder cards for immediate subfolders (folder icon, name, click to navigate into folder).
  - Thumbnail cards for image files (image preview, filename in `#e0e0e0`, active selection glow).
  - Empty state message when no images or folders found.
- Footer with selected image path, "Cancel" and "Use Image" buttons.
- Methods: `fetchFiles()`, `navigateToFolder(folder)`, `goUp()`, `selectImage(file)`, `confirmSelection()`, `handleUpload(event)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/ImageBrowserModal.test.js"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ImageBrowserModal.vue client/test/ImageBrowserModal.test.js
git commit -m "feat(client): create ImageBrowserModal component with breadcrumb folder navigation"
```

---

### Task 3: Client: Integrate `ImageBrowserModal` into Ship & Character Sheets

**Files:**
- Modify: `client/src/views/ShipSheetsView.vue`
- Modify: `client/src/views/CharacterSheetsView.vue`

**Interfaces:**
- Integrates `ImageBrowserModal` for:
  - Ship Sheet header portrait box & Create Ship modal avatar picker
  - Character Sheet header portrait box & Create Character modal avatar picker

- [ ] **Step 1: Update `ShipSheetsView.vue`**
- Import `ImageBrowserModal` from `../components/ImageBrowserModal.vue`.
- Register component.
- Add state: `showImageBrowser = false`, `imageBrowserTarget = 'sheet'` (`'sheet'` or `'create'`).
- In header portrait box: `@click="openImageBrowser('sheet')"` (replaces direct file click).
- In create ship modal: add button/click on avatar to open `openImageBrowser('create')`.
- Handler `onImageSelected(url)`:
  - If `imageBrowserTarget === 'sheet'`: sets `selectedShip.avatar_url = url` and calls `updateShip()`.
  - If `imageBrowserTarget === 'create'`: sets `newShipForm.avatar_url = url`.

- [ ] **Step 2: Update `CharacterSheetsView.vue`**
- Import `ImageBrowserModal` from `../components/ImageBrowserModal.vue`.
- Register component.
- Add state: `showImageBrowser = false`, `imageBrowserTarget = 'char'` (`'char'` or `'create'`).
- In header portrait box: `@click="openImageBrowser('char')"` (replaces direct file click).
- In create character modal: add browse option for avatar.
- Handler `onImageSelected(url)`:
  - If `imageBrowserTarget === 'char'`: sets `selectedChar.avatar_url = url` and calls `updateCharacter()`.
  - If `imageBrowserTarget === 'create'`: sets `newCharForm.avatar_url = url`.

- [ ] **Step 3: Run existing client test suites and build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/src/views/ShipSheetsView.vue client/src/views/CharacterSheetsView.vue
git commit -m "feat: integrate ImageBrowserModal into Ship and Character sheet portraits"
```

---

### Task 4: Client: Integrate `ImageBrowserModal` into Space & RPG VTTs

**Files:**
- Modify: `client/src/views/SpaceVttView.vue`
- Modify: `client/src/views/RpgVttView.vue`

**Interfaces:**
- Integrates `ImageBrowserModal` into "Add Token" modal for both VTTs.

- [ ] **Step 1: Update `SpaceVttView.vue`**
- Import and register `ImageBrowserModal`.
- Add reactive state: `showImageBrowser = ref(false)`.
- In "Add Token" modal avatar controls, add a "Browse Uploads" button next to "Choose File".
- When an image is chosen from the browser, set `newTokenForm.avatar_url = url`.

- [ ] **Step 2: Update `RpgVttView.vue`**
- Import and register `ImageBrowserModal`.
- Add reactive state: `showImageBrowser = ref(false)`.
- In "Add Token" modal avatar controls, add a "Browse Uploads" button next to "Choose File".
- When an image is chosen from the browser, set `newTokenForm.avatar_url = url`.

- [ ] **Step 3: Run client tests and build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/src/views/SpaceVttView.vue client/src/views/RpgVttView.vue
git commit -m "feat(vtt): integrate ImageBrowserModal into Space and RPG VTT token modals"
```

---

### Task 5: Full Verification & Integration Testing

**Files:**
- All modified and created files across client and server.

- [ ] **Step 1: Run complete server test suite**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: PASS (all server tests pass)

- [ ] **Step 2: Run complete client test suite and production build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: PASS (all client tests pass, build succeeds)

- [ ] **Step 3: Verification of running background tasks**

Verify backend server (port 3000) and client dev server (port 3001) are responsive.
Ensure API `/api/upload/files` responds with proper status code and schema.

- [ ] **Step 4: Final commit / tags if needed**

```bash
git status
```
Confirm clean working tree.

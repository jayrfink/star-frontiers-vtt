# VTT Fixes Implementation Plan

## Task 1: Clean up token images and DB Schema
1. Delete all `.png` files in `client/public/tokens/rpg/` and `client/public/tokens/space/`.
2. Update `server/src/db.js` to add `map_type TEXT DEFAULT 'rpg'` to the `maps` table. Add migration logic via `PRAGMA table_info(maps)`.
3. Verify tests pass.

## Task 2: Independent Active Maps
1. Update `server/src/maps.js`:
   - `GET /api/maps/active`: Accept `?type=rpg` or `?type=space`. Fetch active map matching `map_type = ?`.
   - `GET /api/maps`: Accept `?type=...`. Filter by `map_type` if provided.
   - `POST /api/maps`: Accept `map_type` in body.
   - `POST /api/maps/:id/activate`: Update to only deactivate maps with the SAME `map_type`.
2. Update `client/src/views/RpgVttView.vue`:
   - Set `map_type: 'rpg'` when creating maps.
   - Fetch active map and map list with `?type=rpg`.
3. Update `client/src/views/SpaceVttView.vue`:
   - Set `map_type: 'space'` when creating maps.
   - Fetch active map and map list with `?type=space`.
4. Verify tests pass.

## Task 3: Image Uploads
1. `npm install multer` in `server/`.
2. Create `server/src/upload.js` that exports `createUploadRouter()` using `multer` to save files to `data/uploads/` (ensure directory exists). Return the public URL `/uploads/<filename>`.
3. Update `server/src/index.js` to serve `/uploads` statically from `data/uploads/` and mount `/api/upload` router.
4. Update Add Token modals in `RpgVttView.vue` and `SpaceVttView.vue`:
   - Add a `<input type="file" @change="uploadImage">` that POSTs to `/api/upload` and sets `newTokenForm.avatar_url` to the response URL.
5. Verify tests pass.

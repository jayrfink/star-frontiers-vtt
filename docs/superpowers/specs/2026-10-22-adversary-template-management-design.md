# Adversary Template Management & Token Art Update Design

**Date:** 2026-10-22
**Status:** Approved

## 1. Overview & Goals
In the **Stock Adversary Encounter** modal (`client/src/components/StockAdversaryModal.vue`), GameMasters currently have read-only access to saved templates on the "Existing Templates" tab. If a template's token image is moved or deleted from disk, or if the GM wants to upload a custom token image, switch to another image in the uploads library, or delete obsolete adversary templates, there are no UI controls or dedicated token-update endpoints to do so.

This feature enables GameMasters to:
1. **Delete existing adversary templates** directly from the "Existing Templates" tab.
2. **Upload a new custom token image** or **browse/select an image from the uploads library** (or **generate AI token art**) for any existing adversary template.
3. **Automatically style and sync updated token images**—applying the circular Threat Tier ring mask to standard uploads (while preserving pre-ringed `/uploads/tokens/` images as-is) and immediately updating both the saved template and any active tokens on maps spawned from that template.
4. **Gracefully handle missing/moved token images** both in the modal preview UI and during adversary spawning.

---

## 2. Backend Changes (`server/src/adversaries.js`)

### 2.1 `PATCH /api/adversaries/:id/token`
Adds a new authenticated endpoint to update an existing adversary template's token artwork:
- **Request Body:** `{ source_image_url: string }`
- **Validation:**
  - Looks up template `:id` in `adversary_templates`. Returns `404` if not found.
- **Image Processing:**
  - Ensures `data/uploads/tokens` directory exists.
  - Target output file: `data/uploads/tokens/<template_id>.png`.
  - Resolves `source_image_url` relative to `data/uploads` if provided:
    - If `sourceDiskPath` exists on disk:
      - If `source_image_url` is inside `/uploads/tokens/` (and is not the exact same file path as `tokenOutputPath`), copies `sourceDiskPath` to `tokenOutputPath` as-is.
      - Otherwise, invokes `generateTokenRingImage` with `sourceImagePath: sourceDiskPath`, `outputPath: tokenOutputPath`, `threatTier`, `category`, `label: name`, `size: 256` to produce a circular token with the Threat Tier ring.
    - If `source_image_url` is empty/null, regenerates the fallback SVG token via `generateTokenRingImage` without `sourceImagePath`.
    - If `source_image_url` was provided as a non-empty string but the file does not exist on disk, returns `400 Bad Request` (`{ error: 'Source image file not found' }`).
  - Sets `newTokenPath = /uploads/tokens/${template.id}.png?v=${Date.now()}` so browser caches immediately invalidate when a template's token is replaced.
- **Database Updates & Socket Broadcasts:**
  - Updates `adversary_templates`:
    ```sql
    UPDATE adversary_templates
    SET token_image_path = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    ```
  - Emits `adversary:saved` with `{ template: formatted }`.
  - Queries `vtt_tokens` where `template_id = ?`:
    - Updates `avatar_url = ?` on all matching rows in `vtt_tokens`.
    - Fetches the updated token rows (formatted via `formatToken` or matching `tokens.js` structure) and emits `token:updated` (`{ token }`) for each updated token so active VTT canvases refresh immediately.
  - Returns `200 OK` with `{ template: formatted, updatedTokensCount }`.

### 2.2 Missing File Resilience in `POST /api/adversaries/spawn`
- Currently, `POST /api/adversaries/spawn` checks `if (!fs.existsSync(tokenOutputPath) || !templateObj.token_image_path)`.
- However, if `templateObj.token_image_path` has a query string (`?v=...`) or points to a moved file, we should strip any `?v=...` query parameter when checking disk existence of `templateObj.token_image_path`, and if the referenced file is missing on disk, regenerate the fallback token ring at `tokenOutputPath` so spawned tokens never have broken image paths.

---

## 3. Frontend Changes

### 3.1 `client/src/components/StockAdversaryModal.vue`
- **Template Selection & Delete Button:**
  - Next to the `Select Template` dropdown (or inside the `.preview-header` of `.template-preview-card`), add a `🗑️ Delete Template` button (`class="btn-delete-template"`).
  - Clicking `Delete Template` prompts for confirmation (`Delete adversary template "<name>"?`), sends `DELETE /api/adversaries/:id`, removes the template from `this.templates`, and selects the first available template (or `''` if none remain).
- **Existing Template Token Art Controls:**
  - In `.template-preview-card`, enhance `.preview-avatar-circle`:
    - Track `existingTokenImageError: false` (reset when `selectedTemplateId` or `token_image_path` changes).
    - Add `@error="existingTokenImageError = true"` on the preview `<img>`. When `existingTokenImageError` is true or `!currentSelectedTemplate.token_image_path`, show the fallback initials and a subtle `⚠️ Missing Image` indicator if a path was set but failed to load.
  - Add a compact token action bar inside `.template-preview-card` (below `.preview-header`):
    - **⬆️ Upload Token:** Hidden `<input type="file" ref="existingTokenFileInput" ...>` triggered by a button. Uploads via `POST /api/upload`, then calls `updateExistingTemplateToken(uploadedUrl)`.
    - **📁 Browse Uploads:** Emits `browse-image` while on `mode === 'existing'`.
    - **✨ AI Token Art:** Calls `POST /api/adversaries/generate-token-art` using the selected template's `name`, `category`, `threat_tier`, and `actions`, then calls `updateExistingTemplateToken(data.token_url || data.portrait_url)`.
- **Routing `selectedImageUrl` Prop Watcher:**
  - In `watch.selectedImageUrl(newVal)`:
    - If `!newVal`, return.
    - If `this.mode === 'existing'` and `this.selectedTemplateId`: call `this.updateExistingTemplateToken(newVal)`.
    - Else: set `this.customForm.source_image_url = newVal`.

### 3.2 `client/src/views/RpgVttView.vue`
- In `openAdversaryImageBrowser()`, reset `adversaryImageSelectedUrl.value = ''` before opening `ImageBrowserModal` so that selecting the same image URL again still triggers the watcher in `StockAdversaryModal.vue`.

---

## 4. Testing Strategy
- **Backend Unit/Integration Tests (`server/src/adversaries.test.js`):**
  - Test `PATCH /api/adversaries/:id/token` with a custom uploaded image (verifies circular ring generation, `token_image_path` cache-buster update, and updating active `vtt_tokens` with `template_id`).
  - Test `PATCH /api/adversaries/:id/token` with a missing source file returns `400`.
  - Test `DELETE /api/adversaries/:id` removes the template and emits `adversary:deleted`.
  - Test `POST /api/adversaries/spawn` when a template's existing token file was removed from disk (regenerates fallback token cleanly).
- **Frontend Component Tests (`client/src/components/__tests__/StockAdversaryModal.test.js`):**
  - Test deleting a selected template calls `DELETE /api/adversaries/:id` and updates the template list.
  - Test uploading a token image on the "Existing Templates" tab uploads the file and calls `PATCH /api/adversaries/:id/token`.
  - Test selecting an image from the browser (`selectedImageUrl` prop change) while in `existing` mode calls `PATCH /api/adversaries/:id/token` and updates the preview.

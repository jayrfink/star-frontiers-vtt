# Adversary Template Management & Token Art Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable GameMasters to delete existing adversary templates, upload or browse custom token artwork to replace an existing template's token (including when a token image is moved/missing), and automatically sync updated token artwork to active map tokens.

**Architecture:**
1. Add a `PATCH /api/adversaries/:id/token` endpoint in `server/src/adversaries.js` that processes an uploaded or selected `source_image_url` (copying `/uploads/tokens/` assets as-is or applying `generateTokenRingImage` for raw portraits, or regenerating the fallback SVG if cleared), updates `adversary_templates.token_image_path` with a cache-busting query string, updates all `tokens` rows referencing `template_id`, and broadcasts `adversary:saved` and `token:updated` socket events.Also make `POST /api/adversaries/spawn` resilient to moved/missing template token files.
2. Enhance `client/src/components/StockAdversaryModal.vue` ("Existing Templates" tab) with a Delete Template button (`DELETE /api/adversaries/:id`), broken-image detection (`@error`), and token artwork controls (Upload Image, Browse Uploads Library, Generate AI Art) wired to `PATCH /api/adversaries/:id/token`. Also ensure `RpgVttView.vue` resets `adversaryImageSelectedUrl` before opening the browser so re-selecting an image always fires the prop watcher.

**Tech Stack:** Node.js, Express, better-sqlite3, Sharp (`tokenImagePipeline.js`), Socket.io, Vue 3, Vitest, Supertest.

## Global Constraints

- All tests must be executed inside the running Docker container `sf-vtt-dev` using `docker exec sf-vtt-dev bash -c "..."`.
- Database table for map tokens is `tokens` (not `vtt_tokens`), formatted with `formatToken(row, db)` from `server/src/maps.js`.
- Uploaded images outside `/uploads/tokens/` must be processed through `generateTokenRingImage` with the template's `threat_tier`, `category`, and `name` (`size: 256`). Images already inside `/uploads/tokens/` are copied as-is.
- Updated `token_image_path` values on `PATCH /api/adversaries/:id/token` must include `?v=<timestamp>` so browsers immediately refresh the cached image when the file at `/uploads/tokens/<id>.png` is overwritten.

---

### Task 1: Backend `PATCH /api/adversaries/:id/token` & Missing-File Spawn Resilience

**Files:**
- Modify: `server/src/adversaries.js:1-316`
- Create: `server/test/adversaries.test.js`

**Interfaces:**
- Consumes:
  - `generateTokenRingImage({ label, threatTier, category, sourceImagePath, outputPath, size })` from `server/src/tokenImagePipeline.js`
  - `formatToken(row, db)` from `server/src/maps.js`
- Produces:
  - `PATCH /api/adversaries/:id/token` accepting `{ source_image_url }` and returning `200 OK` with `{ template, updatedTokensCount }` (or `404` if template not found, `400` if non-empty `source_image_url` does not exist on disk).
  - Emits `adversary:saved` (`{ template }`) and `token:updated` (`{ token }`) for every map token with `template_id = :id`.
  - Resilient `POST /api/adversaries/spawn` that strips `?v=...` query params when checking if `templateObj.token_image_path` exists on disk, and regenerates the fallback token ring if the file was moved or deleted.

- [ ] **Step 1: Write the failing backend tests in `server/test/adversaries.test.js`**

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_UPLOADS_DIR = path.join(__dirname, '../../data/uploads');

describe('Adversaries API - Template Delete & Token Update', () => {
  let db, app, server, io, agent, mapId;
  const createdFiles = [];

  beforeEach(async () => {
    db = createTestDb();
    const result = createApp(db, ':memory:');
    app = result.app;
    server = result.server;
    io = result.io;

    agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'gm_adv', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'gm_adv', password: 'password123' });

    const mapRes = await agent.post('/api/maps').send({ name: 'Tactical Arena', map_type: 'rpg', is_active: 1 });
    mapId = mapRes.body.id;
  });

  afterEach(() => {
    if (db) db.close();
    if (server && server.close) server.close();
    for (const filePath of createdFiles) {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }
    createdFiles.length = 0;
  });

  it('PATCH /api/adversaries/:id/token updates template token from uploaded image and syncs map tokens', async () => {
    // 1. Spawn an adversary so template and map token exist
    const spawnRes = await agent.post('/api/adversaries/spawn').send({
      mapId,
      count: 2,
      template: {
        name: 'Sathar Agent',
        category: 'npc',
        threat_tier: 3,
        species: 'Sathar',
        weapon: 'Laser Pistol',
        armor: 'Skein Suit',
      },
    });
    expect(spawnRes.status).toBe(201);
    const templateId = spawnRes.body.template.template_id;
    const tokenOutPath = path.join(DATA_UPLOADS_DIR, 'tokens', `${templateId}.png`);
    createdFiles.push(tokenOutPath);

    // 2. Create a raw test source image in data/uploads/
    if (!fs.existsSync(DATA_UPLOADS_DIR)) {
      fs.mkdirSync(DATA_UPLOADS_DIR, { recursive: true });
    }
    const rawFileName = `test_custom_portrait_${Date.now()}.png`;
    const rawDiskPath = path.join(DATA_UPLOADS_DIR, rawFileName);
    await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 200, g: 50, b: 50, alpha: 1 } },
    })
      .png()
      .toFile(rawDiskPath);
    createdFiles.push(rawDiskPath);

    const emitSpy = vi.spyOn(io, 'emit');

    // 3. Call PATCH /api/adversaries/:id/token
    const patchRes = await agent
      .patch(`/api/adversaries/${templateId}/token`)
      .send({ source_image_url: `/uploads/${rawFileName}` });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.template.template_id).toBe(templateId);
    expect(patchRes.body.template.token_image_path).toMatch(new RegExp(`^/uploads/tokens/${templateId}\\.png\\?v=\\d+$`));
    expect(patchRes.body.updatedTokensCount).toBe(2);

    // Verify map tokens in DB were updated with the new avatar_url
    const activeMapRes = await agent.get('/api/maps/active?type=rpg');
    const mapTokens = activeMapRes.body.tokens.filter((t) => t.template_id === templateId);
    expect(mapTokens).toHaveLength(2);
    expect(mapTokens[0].avatar_url).toBe(patchRes.body.template.token_image_path);
    expect(mapTokens[1].avatar_url).toBe(patchRes.body.template.token_image_path);

    // Verify socket events emitted
    expect(emitSpy).toHaveBeenCalledWith('adversary:saved', expect.objectContaining({
      template: expect.objectContaining({ template_id: templateId }),
    }));
    expect(emitSpy).toHaveBeenCalledWith('token:updated', expect.objectContaining({
      token: expect.objectContaining({ template_id: templateId, avatar_url: patchRes.body.template.token_image_path }),
    }));
  });

  it('PATCH /api/adversaries/:id/token returns 400 when source_image_url file is missing on disk', async () => {
    const spawnRes = await agent.post('/api/adversaries/spawn').send({
      mapId,
      count: 1,
      template: { name: 'Pirate Guard', category: 'npc', threat_tier: 1 },
    });
    const templateId = spawnRes.body.template.template_id;
    createdFiles.push(path.join(DATA_UPLOADS_DIR, 'tokens', `${templateId}.png`));

    const patchRes = await agent
      .patch(`/api/adversaries/${templateId}/token`)
      .send({ source_image_url: '/uploads/non_existent_file_99999.png' });

    expect(patchRes.status).toBe(400);
    expect(patchRes.body.error).toContain('not found');
  });

  it('POST /api/adversaries/spawn regenerates token when existing template points to a moved/missing file', async () => {
    // Insert a template whose token_image_path points to a moved file
    const saveRes = await agent.post('/api/adversaries').send({
      template_id: 'moved-token-beast-t2',
      name: 'Moved Token Beast',
      category: 'creature',
      threat_tier: 2,
      token_image_path: '/uploads/tokens/moved_elsewhere_missing.png',
      hp_max: 35,
      actions: [{ name: 'Bite', target_pct: 55, damage: '2d10' }],
    });
    expect(saveRes.status).toBe(201);

    const expectedOutput = path.join(DATA_UPLOADS_DIR, 'tokens', 'moved-token-beast-t2.png');
    createdFiles.push(expectedOutput);

    // Also create a dummy file at expectedOutput first to prove it checks templateObj.token_image_path existence
    fs.mkdirSync(path.dirname(expectedOutput), { recursive: true });
    if (fs.existsSync(expectedOutput)) fs.unlinkSync(expectedOutput);

    const spawnRes = await agent.post('/api/adversaries/spawn').send({
      mapId,
      templateId: 'moved-token-beast-t2',
      count: 1,
    });

    expect(spawnRes.status).toBe(201);
    expect(spawnRes.body.template.token_image_path).toMatch(/^\/uploads\/tokens\/moved-token-beast-t2\.png/);
    expect(fs.existsSync(expectedOutput)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd /app/server && npx vitest run test/adversaries.test.js"`
Expected: FAIL (`404` on `PATCH /api/adversaries/:id/token`).

- [ ] **Step 3: Implement `PATCH /api/adversaries/:id/token` and missing-file check in `server/src/adversaries.js`**

Modify `server/src/adversaries.js`:
1. Import `formatToken` from `./maps.js` at top of `server/src/adversaries.js`:
```javascript
import { formatToken } from './maps.js';
```
2. Add helper `resolveUploadDiskPath(urlStr)`:
```javascript
function resolveUploadDiskPath(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const cleanUrl = urlStr.split('?')[0];
  const rel = cleanUrl.startsWith('/uploads/')
    ? cleanUrl.replace(/^\/uploads\//, '')
    : cleanUrl.replace(/^\//, '');
  const candidate = path.resolve(DATA_DIR, 'uploads', rel);
  const uploadsRoot = path.resolve(DATA_DIR, 'uploads');
  if (!candidate.startsWith(uploadsRoot)) return null;
  return fs.existsSync(candidate) ? candidate : null;
}
```
3. In `POST /api/adversaries/spawn` (around line 242 of `server/src/adversaries.js`), update token image handling so it uses `resolveUploadDiskPath` and also checks whether the template's current `token_image_path` actually exists on disk:
```javascript
      let sourceDiskPath = resolveUploadDiskPath(source_image_url);
      const existingTokenDiskPath = resolveUploadDiskPath(templateObj.token_image_path);

      if (sourceDiskPath) {
        const cleanSource = source_image_url.split('?')[0];
        if (cleanSource.includes('/tokens/')) {
          if (path.resolve(sourceDiskPath) !== path.resolve(tokenOutputPath)) {
            fs.copyFileSync(sourceDiskPath, tokenOutputPath);
          }
          templateObj.token_image_path = `/uploads/tokens/${tokenFileName}`;
        } else {
          await generateTokenRingImage({
            sourceImagePath: sourceDiskPath,
            outputPath: tokenOutputPath,
            threatTier: templateObj.threat_tier,
            category: templateObj.category,
            label: templateObj.name,
            size: 256,
          });
          templateObj.token_image_path = `/uploads/tokens/${tokenFileName}`;
        }
      } else if (!existingTokenDiskPath || !fs.existsSync(tokenOutputPath) || !templateObj.token_image_path) {
        await generateTokenRingImage({
          outputPath: tokenOutputPath,
          threatTier: templateObj.threat_tier,
          category: templateObj.category,
          label: templateObj.name,
          size: 256,
        });
        templateObj.token_image_path = `/uploads/tokens/${tokenFileName}`;
      }
```
4. Add `PATCH /api/adversaries/:id/token` route before `DELETE /:id` in `server/src/adversaries.js`:
```javascript
  // PATCH /api/adversaries/:id/token - Update template token image and sync active map tokens
  router.patch('/:id/token', async (req, res) => {
    try {
      const templateId = req.params.id;
      const row = db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(templateId);
      if (!row) {
        return res.status(404).json({ error: 'Adversary template not found' });
      }

      const { source_image_url } = req.body || {};
      const tokensUploadDir = path.join(DATA_DIR, 'uploads/tokens');
      if (!fs.existsSync(tokensUploadDir)) {
        fs.mkdirSync(tokensUploadDir, { recursive: true });
      }

      const tokenFileName = `${templateId}.png`;
      const tokenOutputPath = path.join(tokensUploadDir, tokenFileName);

      if (source_image_url) {
        const sourceDiskPath = resolveUploadDiskPath(source_image_url);
        if (!sourceDiskPath) {
          return res.status(400).json({ error: 'Source image file not found on disk' });
        }
        const cleanSource = source_image_url.split('?')[0];
        if (cleanSource.includes('/tokens/')) {
          if (path.resolve(sourceDiskPath) !== path.resolve(tokenOutputPath)) {
            fs.copyFileSync(sourceDiskPath, tokenOutputPath);
          }
        } else {
          await generateTokenRingImage({
            sourceImagePath: sourceDiskPath,
            outputPath: tokenOutputPath,
            threatTier: row.threat_tier,
            category: row.category,
            label: row.name,
            size: 256,
          });
        }
      } else {
        await generateTokenRingImage({
          outputPath: tokenOutputPath,
          threatTier: row.threat_tier,
          category: row.category,
          label: row.name,
          size: 256,
        });
      }

      const newTokenPath = `/uploads/tokens/${tokenFileName}?v=${Date.now()}`;
      db.prepare(`
        UPDATE adversary_templates
        SET token_image_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newTokenPath, templateId);

      const updatedRow = db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(templateId);
      const formattedTemplate = formatAdversary(updatedRow);

      if (io) {
        io.emit('adversary:saved', { template: formattedTemplate });
      }

      // Sync any tokens on maps spawned from this template
      const updateTokensResult = db.prepare(`
        UPDATE tokens
        SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE template_id = ?
      `).run(newTokenPath, templateId);

      if (io && updateTokensResult.changes > 0) {
        const affectedTokens = db.prepare('SELECT * FROM tokens WHERE template_id = ?').all(templateId);
        for (const tRow of affectedTokens) {
          io.emit('token:updated', { token: formatToken(tRow, db) });
        }
      }

      res.json({
        template: formattedTemplate,
        updatedTokensCount: updateTokensResult.changes,
      });
    } catch (err) {
      console.error('Error updating adversary token:', err);
      res.status(500).json({ error: 'Failed to update adversary token', message: err.message });
    }
  });
```

- [ ] **Step 4: Run the backend tests to verify they pass**

Run: `docker exec sf-vtt-dev bash -c "cd /app/server && npx vitest run test/adversaries.test.js"`
Expected: PASS (all 3 tests passing).

- [ ] **Step 5: Commit Task 1**

```bash
git add server/src/adversaries.js server/test/adversaries.test.js
git commit -m "feat(server): add PATCH /api/adversaries/:id/token and missing token fallback"
```

---

### Task 2: Frontend Template Deletion & Token Artwork Controls in `StockAdversaryModal.vue` and `RpgVttView.vue`

**Files:**
- Modify: `client/src/components/StockAdversaryModal.vue:33-107,366-590,887-945`
- Modify: `client/src/views/RpgVttView.vue:1083-1086`
- Modify: `client/test/StockAdversaryModal.test.js:1-135`

**Interfaces:**
- Consumes:
  - `DELETE /api/adversaries/:id`
  - `PATCH /api/adversaries/:id/token` with `{ source_image_url }`
  - `POST /api/upload` (multipart `file`)
  - `POST /api/adversaries/generate-token-art`
- Produces:
  - `StockAdversaryModal.methods.deleteSelectedTemplate()`
  - `StockAdversaryModal.methods.updateExistingTemplateToken(sourceImageUrl)`
  - `StockAdversaryModal.methods.handleExistingTokenFileUpload(event)`
  - `StockAdversaryModal.methods.generateExistingTemplateAiArt()`
  - Routing in `StockAdversaryModal.watch.selectedImageUrl(newVal)`: calls `updateExistingTemplateToken(newVal)` when `this.mode === 'existing'`, or updates `this.customForm.source_image_url = newVal` when `this.mode === 'custom'`.

- [ ] **Step 1: Write the failing frontend tests in `client/test/StockAdversaryModal.test.js`**

Append the following tests inside `describe('Form Data & Methods', ...)` in `client/test/StockAdversaryModal.test.js`:

```javascript
    it('deletes selected template via DELETE /api/adversaries/:id and selects next available template', async () => {
      const originalFetch = global.fetch;
      const originalConfirm = global.confirm;
      global.confirm = () => true;
      global.fetch = async (url, options) => {
        expect(url).toBe('/api/adversaries/sathar-t2');
        expect(options.method).toBe('DELETE');
        return { ok: true, json: async () => ({ success: true }) };
      };

      try {
        const ctx = {
          selectedTemplateId: 'sathar-t2',
          templates: [
            { template_id: 'sathar-t2', name: 'Sathar Trooper', threat_tier: 2, category: 'npc' },
            { template_id: 'pirate-t1', name: 'Pirate Raider', threat_tier: 1, category: 'npc' },
          ],
          get currentSelectedTemplate() {
            return this.templates.find((t) => t.template_id === this.selectedTemplateId) || null;
          },
          errorMessage: null,
        };

        await StockAdversaryModal.methods.deleteSelectedTemplate.call(ctx);
        expect(ctx.templates).toHaveLength(1);
        expect(ctx.templates[0].template_id).toBe('pirate-t1');
        expect(ctx.selectedTemplateId).toBe('pirate-t1');
      } finally {
        global.fetch = originalFetch;
        global.confirm = originalConfirm;
      }
    });

    it('updates existing template token via PATCH /api/adversaries/:id/token', async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        expect(url).toBe('/api/adversaries/sathar-t2/token');
        expect(options.method).toBe('PATCH');
        const body = JSON.parse(options.body);
        expect(body.source_image_url).toBe('/uploads/new_sathar.png');
        return {
          ok: true,
          json: async () => ({
            template: {
              template_id: 'sathar-t2',
              name: 'Sathar Trooper',
              threat_tier: 2,
              category: 'npc',
              token_image_path: '/uploads/tokens/sathar-t2.png?v=12345',
            },
            updatedTokensCount: 2,
          }),
        };
      };

      try {
        const ctx = {
          selectedTemplateId: 'sathar-t2',
          isUpdatingToken: false,
          existingTokenImageError: true,
          errorMessage: null,
          templates: [
            {
              template_id: 'sathar-t2',
              name: 'Sathar Trooper',
              threat_tier: 2,
              category: 'npc',
              token_image_path: '/uploads/tokens/old.png',
            },
          ],
        };

        await StockAdversaryModal.methods.updateExistingTemplateToken.call(ctx, '/uploads/new_sathar.png');
        expect(ctx.templates[0].token_image_path).toBe('/uploads/tokens/sathar-t2.png?v=12345');
        expect(ctx.existingTokenImageError).toBe(false);
        expect(ctx.isUpdatingToken).toBe(false);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('uploads a custom file on Existing Templates tab and calls updateExistingTemplateToken', async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        expect(url).toBe('/api/upload');
        expect(options.method).toBe('POST');
        return {
          ok: true,
          json: async () => ({ url: '/uploads/uploaded_custom_token.png' }),
        };
      };

      try {
        let updatedWithUrl = null;
        const ctx = {
          selectedTemplateId: 'sathar-t2',
          errorMessage: null,
          async updateExistingTemplateToken(url) {
            updatedWithUrl = url;
          },
        };

        const fakeEvent = {
          target: {
            files: [new Blob(['fake-image'], { type: 'image/png' })],
            value: 'C:\\fakepath\\token.png',
          },
        };

        await StockAdversaryModal.methods.handleExistingTokenFileUpload.call(ctx, fakeEvent);
        expect(updatedWithUrl).toBe('/uploads/uploaded_custom_token.png');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('routes selectedImageUrl watcher to updateExistingTemplateToken when mode is existing', async () => {
      let calledUrl = null;
      const ctx = {
        mode: 'existing',
        selectedTemplateId: 'sathar-t2',
        customForm: { source_image_url: '' },
        updateExistingTemplateToken(url) {
          calledUrl = url;
        },
      };

      StockAdversaryModal.watch.selectedImageUrl.call(ctx, '/uploads/from_library.png');
      expect(calledUrl).toBe('/uploads/from_library.png');
      expect(ctx.customForm.source_image_url).toBe('');
    });
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd /app/client && npx vitest run test/StockAdversaryModal.test.js"`
Expected: FAIL (`deleteSelectedTemplate`, `updateExistingTemplateToken`, `handleExistingTokenFileUpload` are undefined).

- [ ] **Step 3: Implement the UI and methods in `StockAdversaryModal.vue` and `RpgVttView.vue`**

1. In `client/src/views/RpgVttView.vue` (around line 1083), reset `adversaryImageSelectedUrl.value = ''` when opening the adversary image browser so choosing the same image twice still triggers `watch.selectedImageUrl`:
```javascript
function openAdversaryImageBrowser() {
  adversaryImageSelectedUrl.value = '';
  imageBrowserTarget.value = 'adversary';
  showImageBrowser.value = true;
}
```

2. In `client/src/components/StockAdversaryModal.vue`:
Update the template section for `TAB 1: EXISTING TEMPLATES` (lines 44-105):
```html
          <div v-else class="existing-picker-layout">
            <div class="form-group">
              <div class="template-select-header">
                <label>Select Blueprint / Template</label>
                <button
                  v-if="currentSelectedTemplate"
                  type="button"
                  class="btn-delete-template"
                  title="Delete selected template"
                  @click="deleteSelectedTemplate"
                >
                  🗑️ Delete Template
                </button>
              </div>
              <select v-model="selectedTemplateId" class="template-select">
                <option v-for="tpl in templates" :key="tpl.template_id" :value="tpl.template_id">
                  Tier {{ tpl.threat_tier }} • {{ tpl.name }} ({{ tpl.category === 'creature' ? 'Creature' : 'NPC' }})
                </option>
              </select>
            </div>

            <!-- Selected Template Preview Card -->
            <div v-if="currentSelectedTemplate" class="template-preview-card">
              <div class="preview-header">
                <div class="preview-avatar-circle" :style="{ borderColor: getTierColor(currentSelectedTemplate.threat_tier) }">
                  <img
                    v-if="currentSelectedTemplate.token_image_path && !existingTokenImageError"
                    :src="currentSelectedTemplate.token_image_path"
                    alt="Token"
                    @error="existingTokenImageError = true"
                  />
                  <span v-else class="preview-placeholder">
                    {{ currentSelectedTemplate.category === 'creature' ? '🐾' : '👤' }}
                  </span>
                </div>
                <div class="preview-meta">
                  <h4>{{ currentSelectedTemplate.name }}</h4>
                  <div class="preview-badges-row">
                    <span
                      class="tier-badge"
                      :style="{ backgroundColor: getTierColor(currentSelectedTemplate.threat_tier) }"
                    >
                      Tier {{ currentSelectedTemplate.threat_tier }} {{ currentSelectedTemplate.category.toUpperCase() }}
                    </span>
                    <span v-if="existingTokenImageError" class="missing-token-badge" title="The token image file could not be found. Upload or browse a new image below.">
                      ⚠️ Missing Token Image
                    </span>
                  </div>
                </div>
              </div>

              <!-- Change / Upload Token Artwork Controls for Existing Template -->
              <div class="existing-token-controls">
                <span class="token-controls-label">Token Art:</span>
                <div class="art-buttons-row">
                  <label class="btn-upload-file" :class="{ disabled: isUpdatingToken }">
                    {{ isUpdatingToken ? '⏳ Updating...' : '⬆️ Upload Token' }}
                    <input
                      type="file"
                      accept="image/*"
                      :disabled="isUpdatingToken"
                      @change="handleExistingTokenFileUpload"
                      style="display: none;"
                    />
                  </label>
                  <button
                    type="button"
                    class="btn-browse-art"
                    :disabled="isUpdatingToken"
                    @click="$emit('browse-image')"
                  >
                    📁 Browse Uploads
                  </button>
                  <button
                    type="button"
                    class="btn-generate-ai-art"
                    :disabled="isGeneratingArt || isUpdatingToken || cooldownSeconds > 0"
                    @click="generateExistingTemplateAiArt"
                  >
                    <span v-if="isGeneratingArt">⏳ Generating...</span>
                    <span v-else-if="cooldownSeconds > 0">⏳ Cooldown ({{ cooldownSeconds }}s)</span>
                    <span v-else>✨ AI Token Art</span>
                  </button>
                </div>
              </div>
```

3. In `StockAdversaryModal.vue` `data()` (around line 374), add:
```javascript
      isUpdatingToken: false,
      existingTokenImageError: false,
```

4. In `StockAdversaryModal.vue` `watch` (around line 400), update `selectedImageUrl` and add `selectedTemplateId`:
```javascript
    selectedTemplateId() {
      this.existingTokenImageError = false;
    },
    selectedImageUrl(newVal) {
      if (!newVal) return;
      if (this.mode === 'existing' && this.selectedTemplateId) {
        this.updateExistingTemplateToken(newVal);
      } else {
        this.customForm.source_image_url = newVal;
      }
    },
```

5. In `StockAdversaryModal.vue` `methods`, add `deleteSelectedTemplate`, `updateExistingTemplateToken`, `handleExistingTokenFileUpload`, and `generateExistingTemplateAiArt`:
```javascript
    async deleteSelectedTemplate() {
      const tpl = this.currentSelectedTemplate;
      if (!tpl) return;
      if (typeof confirm === 'function' && !confirm(`Delete adversary template "${tpl.name}"?`)) {
        return;
      }
      this.errorMessage = null;
      try {
        const res = await fetch(`/api/adversaries/${encodeURIComponent(tpl.template_id)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to delete adversary template');
        }
        this.templates = this.templates.filter((t) => t.template_id !== tpl.template_id);
        this.selectedTemplateId = this.templates.length > 0 ? this.templates[0].template_id : null;
        this.existingTokenImageError = false;
      } catch (err) {
        console.error('Failed to delete template:', err);
        this.errorMessage = err.message || 'Failed to delete adversary template.';
      }
    },
    async updateExistingTemplateToken(sourceImageUrl) {
      if (!this.selectedTemplateId) return;
      this.isUpdatingToken = true;
      this.errorMessage = null;
      try {
        const res = await fetch(`/api/adversaries/${encodeURIComponent(this.selectedTemplateId)}/token`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ source_image_url: sourceImageUrl }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Failed to update template token');
        }
        const data = await res.json();
        if (data.template) {
          const idx = this.templates.findIndex((t) => t.template_id === data.template.template_id);
          if (idx !== -1) {
            this.templates.splice(idx, 1, data.template);
          }
          this.existingTokenImageError = false;
        }
      } catch (err) {
        console.error('Failed to update template token:', err);
        this.errorMessage = err.message || 'Failed to update template token.';
      } finally {
        this.isUpdatingToken = false;
      }
    },
    async handleExistingTokenFileUpload(event) {
      const file = event.target?.files?.[0];
      if (!file) return;
      this.errorMessage = null;
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to upload token image');
        }
        const data = await res.json();
        if (data.url) {
          await this.updateExistingTemplateToken(data.url);
        }
      } catch (err) {
        console.error('Failed to upload token image:', err);
        this.errorMessage = err.message || 'Failed to upload token image.';
      } finally {
        if (event.target) event.target.value = '';
      }
    },
    async generateExistingTemplateAiArt() {
      const tpl = this.currentSelectedTemplate;
      if (!tpl || this.cooldownSeconds > 0) return;
      this.isGeneratingArt = true;
      this.errorMessage = null;
      try {
        const actionNames = Array.isArray(tpl.actions) ? tpl.actions.map((a) => a.name).join(', ') : '';
        const payload = {
          prompt: tpl.system_data?.description || '',
          name: tpl.name,
          species: tpl.system_data?.race || tpl.system_data?.species || tpl.name,
          category: tpl.category,
          threat_tier: tpl.threat_tier,
          weapon: actionNames,
          armor: tpl.defense_summary || '',
          attacks: actionNames,
        };
        const res = await fetch('/api/adversaries/generate-token-art', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if ((res.status === 429 || errData.retryAfter) && typeof this.startArtCooldown === 'function') {
            this.startArtCooldown(errData.retryAfter || 45);
          }
          throw new Error(errData.message || errData.error || 'Failed to generate token art');
        }
        const data = await res.json();
        if (data.token_image_url) {
          await this.updateExistingTemplateToken(data.token_image_url);
        }
        if (typeof this.startArtCooldown === 'function') {
          this.startArtCooldown(45);
        }
      } catch (err) {
        console.error('Failed to generate AI token art for template:', err);
        this.errorMessage = err.message;
      } finally {
        this.isGeneratingArt = false;
      }
    },
```

6. Add CSS styles in `StockAdversaryModal.vue` (`<style scoped>`):
```css
.template-select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-delete-template {
  background-color: rgba(220, 38, 38, 0.15);
  border: 1px solid #ef4444;
  color: #fca5a5;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-delete-template:hover {
  background-color: #dc2626;
  color: #ffffff;
}

.preview-badges-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.missing-token-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(245, 158, 11, 0.2);
  border: 1px solid #f59e0b;
  color: #fcd34d;
}

.existing-token-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background-color: #0f172a;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #1e293b;
}

.token-controls-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
}
```

- [ ] **Step 4: Run the frontend and backend test suites to verify everything passes**

Run: `docker exec sf-vtt-dev bash -c "cd /app/client && npx vitest run test/StockAdversaryModal.test.js && cd /app/server && npx vitest run test/adversaries.test.js"`
Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add client/src/components/StockAdversaryModal.vue client/src/views/RpgVttView.vue client/test/StockAdversaryModal.test.js
git commit -m "feat(client): add template delete and token upload/change controls to StockAdversaryModal"
```

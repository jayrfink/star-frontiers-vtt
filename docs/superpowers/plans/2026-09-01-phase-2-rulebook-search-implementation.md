# Phase 2 Implementation Plan: Data Extraction & Rulebook WebUI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract PDF rulebook text into structured JSON and build an instant client-side searchable Rulebook WebUI using Lunr.js in Vue 3.

**Architecture:** A Node.js extraction script (`pdf-parse`) processes the 6 rulebook PDFs in `assets/rulebooks/` into `data/rulebooks.json`. Express exposes `GET /api/rulebooks`. Vue 3 `RulebooksView.vue` consumes this API, initializes Lunr.js index on load, provides debounced instant search, system/book filters, and a document reader pane with keyword highlighting and pagination.

**Tech Stack:** Node.js 20, Express, `pdf-parse`, Vue 3, Vite, Lunr.js, Vitest, Supertest

## Global Constraints

- Run commands inside the Docker container via `docker exec sf-vtt-dev <command>`
- ESM modules throughout (`"type": "module"`)
- Output data saved to `data/rulebooks.json`
- Require authentication for `/api/rulebooks`

## File Structure

```
~/star-frontiers-vtt/
├── server/
│   ├── package.json (add pdf-parse)
│   ├── scripts/
│   │   └── extract-rulebooks.js
│   ├── src/
│   │   ├── rulebooks.js
│   │   └── index.js (mount /api/rulebooks)
│   └── test/
│       └── rulebooks.test.js
├── client/
│   ├── package.json (add lunr)
│   └── src/
│       └── views/
│           └── RulebooksView.vue
```

---

### Task 1: Rulebook PDF Data Extraction Script & Server API

**Files:**
- Modify: `server/package.json`
- Create: `server/scripts/extract-rulebooks.js`
- Create: `server/src/rulebooks.js`
- Create: `server/test/rulebooks.test.js`
- Modify: `server/src/index.js`

**Interfaces:**
- Consumes: `assets/rulebooks/*.pdf`
- Produces: `data/rulebooks.json` and `GET /api/rulebooks` returning the extracted rulebook items array

- [ ] **Step 1: Add pdf-parse dependency to server**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npm install pdf-parse"
```

- [ ] **Step 2: Write failing API test**

Create `server/test/rulebooks.test.js`:
```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

describe('Rulebooks API', () => {
  let db, app, testSessionDir;

  beforeEach(() => {
    db = createTestDb();
    testSessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-vtt-test-'));
    app = createApp(db, testSessionDir);
  });

  afterEach(() => {
    if (db) db.close();
    if (testSessionDir && fs.existsSync(testSessionDir)) {
      fs.rmSync(testSessionDir, { recursive: true, force: true });
    }
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/rulebooks');
    expect(res.status).toBe(401);
  });

  it('returns rulebooks list when authenticated', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'gm', password: 'password123' });
    await agent.post('/api/auth/login').send({ username: 'gm', password: 'password123' });

    const res = await agent.get('/api/rulebooks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/rulebooks.test.js"
```
Expected: FAIL (404 on `/api/rulebooks`)

- [ ] **Step 4: Create extraction script server/scripts/extract-rulebooks.js**

```js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULEBOOKS_DIR = path.join(__dirname, '../../assets/rulebooks');
const OUTPUT_FILE = path.join(__dirname, '../../data/rulebooks.json');

const BOOKS = [
  { file: 'SF7007-AlphaDawn-Basic_Game_Rules.pdf', bookId: 'ad-basic', bookTitle: 'Alpha Dawn Basic Game Rules', system: 'Alpha Dawn' },
  { file: 'SF7007-AlphaDawn-Expanded_Game_Rules.pdf', bookId: 'ad-expanded', bookTitle: 'Alpha Dawn Expanded Game Rules', system: 'Alpha Dawn' },
  { file: 'SF7007-AlphaDawn-Crash_on_Volturnus.pdf', bookId: 'ad-volturnus', bookTitle: 'Crash on Volturnus Module', system: 'Alpha Dawn' },
  { file: 'Star_Frontiers-7011-Knight_Hawks-Basic_Rules.pdf', bookId: 'kh-basic', bookTitle: 'Knight Hawks Basic Rules', system: 'Knight Hawks' },
  { file: 'Star_Frontiers-7011-Knight_Hawks-Expansion_Rules.pdf', bookId: 'kh-expansion', bookTitle: 'Knight Hawks Expansion Rules', system: 'Knight Hawks' },
  { file: 'Star_Frontiers-7011-Knight_Hawks-Mission_Brief.pdf', bookId: 'kh-mission', bookTitle: 'Knight Hawks Mission Brief', system: 'Knight Hawks' }
];

export async function extractRulebooks() {
  const allEntries = [];

  for (const b of BOOKS) {
    const filePath = path.join(RULEBOOKS_DIR, b.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer, {
      pagerender: function (pageData) {
        return pageData.getTextContent().then(textContent => {
          let lastY, text = '';
          for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
              text += item.str + ' ';
            } else {
              text += '\n' + item.str + ' ';
            }
            lastY = item.transform[5];
          }
          return text;
        });
      }
    });

    const pages = pdfData.text.split(/\n\s*\n\s*\n|\f/);
    let pageNum = 1;
    for (let pageContent of pages) {
      const cleanContent = pageContent.replace(/\s+/g, ' ').trim();
      if (cleanContent.length > 20) {
        allEntries.push({
          id: `${b.bookId}-p${pageNum}`,
          bookId: b.bookId,
          bookTitle: b.bookTitle,
          system: b.system,
          page: pageNum,
          section: `Page ${pageNum}`,
          content: cleanContent
        });
      }
      pageNum++;
    }
  }

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allEntries, null, 2));
  console.log(`Extracted ${allEntries.length} pages/sections to ${OUTPUT_FILE}`);
  return allEntries;
}

if (process.argv[1] && process.argv[1].endsWith('extract-rulebooks.js')) {
  extractRulebooks().catch(console.error);
}
```

- [ ] **Step 5: Create server/src/rulebooks.js & update server/src/index.js**

Create `server/src/rulebooks.js`:
```js
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from './middleware.js';
import { extractRulebooks } from '../scripts/extract-rulebooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULEBOOKS_JSON = path.join(__dirname, '../../data/rulebooks.json');

export function createRulebooksRouter() {
  const router = Router();

  router.get('/', requireAuth, async (req, res) => {
    try {
      if (!fs.existsSync(RULEBOOKS_JSON)) {
        await extractRulebooks();
      }
      const data = fs.readFileSync(RULEBOOKS_JSON, 'utf-8');
      res.json(JSON.parse(data));
    } catch (err) {
      console.error('Error fetching rulebooks:', err);
      res.status(500).json({ error: 'Failed to load rulebooks' });
    }
  });

  return router;
}
```

Modify `server/src/index.js`:
Import `createRulebooksRouter` and mount at `/api/rulebooks`:
```js
import { createRulebooksRouter } from './rulebooks.js';
// ... inside createApp:
app.use('/api/rulebooks', createRulebooksRouter());
```

- [ ] **Step 6: Run tests to verify they pass**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npx vitest run"
```
Expected: All 19 tests pass (5 db, 12 auth, 2 rulebooks).

- [ ] **Step 7: Execute extraction script to generate data/rulebooks.json**

Run:
```bash
docker exec sf-vtt-dev node server/scripts/extract-rulebooks.js
```
Expected: Prints `Extracted X pages/sections to .../data/rulebooks.json`.

- [ ] **Step 8: Commit**

```bash
git add server/
git commit -m "feat: add PDF rulebook extraction script and /api/rulebooks endpoint"
```

---

### Task 2: Searchable Rulebooks WebUI (Lunr.js + Reader Pane)

**Files:**
- Modify: `client/package.json`
- Modify: `client/src/views/RulebooksView.vue`

**Interfaces:**
- Consumes: `GET /api/rulebooks`
- Produces: Interactive Rulebooks WebUI with Lunr.js search, system/book filters, result preview, pagination, and keyword highlighting.

- [ ] **Step 1: Install lunr in client**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npm install lunr"
```

- [ ] **Step 2: Implement client/src/views/RulebooksView.vue**

Replace `client/src/views/RulebooksView.vue` with full search and reading interface:

```vue
<template>
  <div class="rulebooks-container">
    <div class="filter-bar">
      <div class="filter-group">
        <label>System:</label>
        <select v-model="selectedSystem">
          <option value="All">All Systems</option>
          <option value="Alpha Dawn">Alpha Dawn</option>
          <option value="Knight Hawks">Knight Hawks</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Book:</label>
        <select v-model="selectedBook">
          <option value="All">All Rulebooks</option>
          <option v-for="b in availableBooks" :key="b.id" :value="b.id">{{ b.title }}</option>
        </select>
      </div>
      <div class="stats-info" v-if="loading">Loading rulebooks...</div>
      <div class="stats-info" v-else>{{ filteredDocs.length }} entries indexed</div>
    </div>

    <div class="rulebooks-layout">
      <!-- Left Panel: Search & Results -->
      <aside class="sidebar">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search rules (e.g. Vrusk, ADF, Gyrojet)..."
          />
        </div>

        <div class="results-list" v-if="searchQuery.trim().length > 0">
          <div v-if="searchResults.length === 0" class="no-results">
            No matching sections found.
          </div>
          <div
            v-for="item in searchResults"
            :key="item.id"
            class="result-card"
            :class="{ active: selectedItem && selectedItem.id === item.id }"
            @click="selectItem(item)"
          >
            <div class="result-header">
              <span class="book-tag">{{ item.bookTitle }}</span>
              <span class="page-tag">p. {{ item.page }}</span>
            </div>
            <div class="result-title">{{ item.section }}</div>
            <div class="result-snippet">{{ item.snippet }}</div>
          </div>
        </div>

        <div class="browser-tree" v-else>
          <div
            v-for="item in filteredDocs"
            :key="item.id"
            class="tree-item"
            :class="{ active: selectedItem && selectedItem.id === item.id }"
            @click="selectItem(item)"
          >
            <span class="tree-book">{{ item.bookTitle }}</span>
            <span class="tree-page">Page {{ item.page }}</span>
          </div>
        </div>
      </aside>

      <!-- Right Panel: Document Reader -->
      <main class="reader-pane">
        <div v-if="selectedItem" class="document-viewer">
          <div class="reader-header">
            <div>
              <h2>{{ selectedItem.bookTitle }}</h2>
              <div class="reader-sub">System: {{ selectedItem.system }} | Page {{ selectedItem.page }}</div>
            </div>
            <div class="nav-controls">
              <button @click="navigatePage(-1)" :disabled="!hasPrev">← Prev Page</button>
              <button @click="navigatePage(1)" :disabled="!hasNext">Next Page →</button>
            </div>
          </div>
          <div class="reader-content" v-html="highlightedContent"></div>
        </div>
        <div v-else class="empty-reader">
          <div class="empty-icon">📖</div>
          <h3>Select a section or enter a search query to view rulebooks</h3>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import lunr from 'lunr';

const docs = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const selectedSystem = ref('All');
const selectedBook = ref('All');
const selectedItem = ref(null);

let index = null;
const docMap = new Map();

const availableBooks = computed(() => {
  const booksMap = new Map();
  docs.value.forEach(d => {
    if (!booksMap.has(d.bookId)) {
      booksMap.set(d.bookId, { id: d.bookId, title: d.bookTitle, system: d.system });
    }
  });
  const list = Array.from(booksMap.values());
  if (selectedSystem.value !== 'All') {
    return list.filter(b => b.system === selectedSystem.value);
  }
  return list;
});

const filteredDocs = computed(() => {
  return docs.value.filter(d => {
    const systemMatch = selectedSystem.value === 'All' || d.system === selectedSystem.value;
    const bookMatch = selectedBook.value === 'All' || d.bookId === selectedBook.value;
    return systemMatch && bookMatch;
  });
});

async function fetchRulebooks() {
  try {
    loading.value = true;
    const res = await fetch('/api/rulebooks', { credentials: 'include' });
    if (res.ok) {
      docs.value = await res.json();
      buildIndex();
      if (docs.value.length > 0) {
        selectedItem.value = docs.value[0];
      }
    }
  } catch (err) {
    console.error('Failed to load rulebooks', err);
  } finally {
    loading.value = false;
  }
}

function buildIndex() {
  docMap.clear();
  docs.value.forEach(d => docMap.set(d.id, d));

  index = lunr(function () {
    this.ref('id');
    this.field('bookTitle');
    this.field('section');
    this.field('content');

    docs.value.forEach(doc => this.add(doc));
  });
}

const searchResults = computed(() => {
  if (!searchQuery.value.trim() || !index) return [];
  try {
    const q = searchQuery.value.trim().toLowerCase();
    const results = index.search(q + '*');
    
    return results
      .map(r => {
        const item = docMap.get(r.ref);
        if (!item) return null;

        if (selectedSystem.value !== 'All' && item.system !== selectedSystem.value) return null;
        if (selectedBook.value !== 'All' && item.bookId !== selectedBook.value) return null;

        const idx = item.content.toLowerCase().indexOf(q);
        let snippet = item.content.slice(0, 120) + '...';
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(item.content.length, idx + 80);
          snippet = (start > 0 ? '...' : '') + item.content.slice(start, end) + '...';
        }

        return { ...item, score: r.score, snippet };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
});

function selectItem(item) {
  selectedItem.value = item;
}

const currentIndex = computed(() => {
  if (!selectedItem.value) return -1;
  return docs.value.findIndex(d => d.id === selectedItem.value.id);
});

const hasPrev = computed(() => currentIndex.value > 0);
const hasNext = computed(() => currentIndex.value >= 0 && currentIndex.value < docs.value.length - 1);

function navigatePage(dir) {
  const target = currentIndex.value + dir;
  if (target >= 0 && target < docs.value.length) {
    selectedItem.value = docs.value[target];
  }
}

const highlightedContent = computed(() => {
  if (!selectedItem.value) return '';
  let content = selectedItem.value.content;
  if (!searchQuery.value.trim()) return content;

  const term = searchQuery.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${term})`, 'gi');
  return content.replace(regex, '<mark>$1</mark>');
});

onMounted(fetchRulebooks);
</script>

<style scoped>
.rulebooks-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  gap: 16px;
}

.filter-bar {
  display: flex;
  gap: 20px;
  align-items: center;
  background: var(--bg-secondary);
  padding: 12px 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 13px;
  color: var(--text-secondary);
}

select {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 12px;
}

.stats-info {
  margin-left: auto;
  font-size: 13px;
  color: var(--text-secondary);
}

.rulebooks-layout {
  display: flex;
  flex: 1;
  gap: 16px;
  min-height: 0;
}

.sidebar {
  width: 340px;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.search-box {
  padding: 12px;
  border-bottom: 1px solid var(--border);
}

.results-list, .browser-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.no-results {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.result-card, .tree-item {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  background: var(--bg-primary);
  transition: background 0.15s;
}

.result-card:hover, .tree-item:hover {
  background: var(--bg-tertiary);
}

.result-card.active, .tree-item.active {
  border-color: var(--accent);
  background: rgba(88, 166, 255, 0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--accent);
  margin-bottom: 4px;
}

.result-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.result-snippet {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.tree-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.tree-page {
  color: var(--text-secondary);
}

.reader-pane {
  flex: 1;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  overflow-y: auto;
}

.reader-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
  margin-bottom: 20px;
}

.reader-sub {
  color: var(--text-secondary);
  font-size: 13px;
  margin-top: 4px;
}

.nav-controls {
  display: flex;
  gap: 8px;
}

.reader-content {
  line-height: 1.7;
  font-size: 15px;
  white-space: pre-wrap;
}

:deep(mark) {
  background: #d29922;
  color: #0d1117;
  padding: 0 4px;
  border-radius: 2px;
}

.empty-reader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  gap: 12px;
}

.empty-icon {
  font-size: 48px;
}
</style>
```

- [ ] **Step 3: Verification & Build Check**

Run client build inside container to verify zero build errors:
```bash
docker exec sf-vtt-dev bash -c "cd client && npm run build"
```

- [ ] **Step 4: Commit**

```bash
git add client/
git commit -m "feat: add Lunr.js search and rulebook reader UI (Phase 2)"
```

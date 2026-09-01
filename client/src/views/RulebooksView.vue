<template>
  <div class="rulebooks-container">
    <div class="filter-bar">
      <div class="mode-toggle">
        <button
          :class="{ active: viewMode === 'reader' }"
          @click="viewMode = 'reader'"
        >
          Text Reader
        </button>
        <button
          :class="{ active: viewMode === 'pdf' }"
          @click="viewMode = 'pdf'"
        >
          PDF Viewer
        </button>
      </div>

      <template v-if="viewMode === 'reader'">
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
      </template>

      <template v-else>
        <div class="filter-group">
          <label>Book:</label>
          <select v-model="pdfBookId">
            <option v-for="b in pdfBooksList" :key="b.id" :value="b.id">{{ b.title }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Page:</label>
          <input
            type="number"
            v-model.number="pdfPage"
            min="1"
            max="200"
            class="page-input"
          />
        </div>
        <div class="stats-info">
          <a :href="pdfSrc" target="_blank" rel="noopener" class="new-tab-link">Open in New Tab ↗</a>
        </div>
      </template>
    </div>

    <!-- Reader Mode Layout -->
    <div v-if="viewMode === 'reader'" class="rulebooks-layout">
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
              <button @click="openPdfAtCurrent" class="pdf-jump-btn">View Original PDF</button>
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

    <!-- PDF Viewer Mode Layout -->
    <div v-else class="pdf-layout">
      <iframe
        :key="pdfSrc"
        :src="pdfSrc"
        class="pdf-iframe"
        title="PDF Rulebook Viewer"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import lunr from 'lunr';

const viewMode = ref('reader');
const pdfBookId = ref('ad-basic');
const pdfPage = ref(1);

const pdfBooksList = [
  { id: 'ad-basic', title: 'Alpha Dawn Basic Rules' },
  { id: 'ad-expanded', title: 'Alpha Dawn Expanded Rules' },
  { id: 'ad-volturnus', title: 'Crash on Volturnus' },
  { id: 'kh-basic', title: 'Knight Hawks Basic Rules' },
  { id: 'kh-expansion', title: 'Knight Hawks Expansion Rules' },
  { id: 'kh-mission', title: 'Knight Hawks Mission Brief' },
];

const pdfSrc = computed(() => {
  return `/api/rulebooks/pdf/${pdfBookId.value}#page=${pdfPage.value || 1}`;
});

function openPdfAtCurrent() {
  if (selectedItem.value) {
    if (selectedItem.value.bookId) {
      pdfBookId.value = selectedItem.value.bookId;
    }
    if (selectedItem.value.page) {
      pdfPage.value = selectedItem.value.page;
    }
  }
  viewMode.value = 'pdf';
}

const docs = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const selectedSystem = ref('All');
const selectedBook = ref('All');
const selectedItem = ref(null);

watch(selectedSystem, () => {
  selectedBook.value = 'All';
});

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

.mode-toggle {
  display: flex;
  gap: 4px;
  background: var(--bg-primary);
  padding: 4px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.mode-toggle button {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.mode-toggle button.active {
  background: var(--accent);
  color: #fff;
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

select, .page-input {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 12px;
}

.page-input {
  width: 70px;
}

.stats-info {
  margin-left: auto;
  font-size: 13px;
  color: var(--text-secondary);
}

.new-tab-link {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}

.new-tab-link:hover {
  text-decoration: underline;
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

.pdf-jump-btn {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--accent);
  cursor: pointer;
}

.pdf-jump-btn:hover {
  background: var(--bg-tertiary);
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

.pdf-layout {
  flex: 1;
  display: flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>

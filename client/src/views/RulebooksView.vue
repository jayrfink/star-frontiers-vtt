<template>
  <div class="rulebooks-container">
    <!-- Top-Level Navigation Bar -->
    <header class="top-nav-bar">
      <nav class="mode-toggle" aria-label="Rulebook View Modes">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: viewMode === 'quickref' }"
          @click="viewMode = 'quickref'"
        >
          Quick Reference Tables
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: viewMode === 'pdf' }"
          @click="viewMode = 'pdf'"
        >
          PDF Rulebooks
        </button>
      </nav>

      <div class="view-status" v-if="viewMode === 'pdf'">
        <span v-if="loading" class="status-loading">Loading rulebook index...</span>
        <span v-else class="status-count">{{ filteredDocs.length }} pages indexed</span>
      </div>
    </header>

    <!-- Quick Reference Tables View -->
    <div v-if="viewMode === 'quickref'" class="quickref-layout">
      <QuickReferenceTables />
    </div>

    <!-- PDF Rulebooks View -->
    <div v-else-if="viewMode === 'pdf'" class="pdf-layout">
      <!-- Left Sidebar: Search & Table of Contents -->
      <aside class="pdf-sidebar">
        <!-- Sidebar Filters -->
        <div class="sidebar-filters">
          <div class="filter-row">
            <div class="filter-field">
              <label for="system-filter">System:</label>
              <select id="system-filter" v-model="selectedSystem" class="sidebar-select">
                <option value="All">All Systems</option>
                <option value="Alpha Dawn">Alpha Dawn</option>
                <option value="Knight Hawks">Knight Hawks</option>
              </select>
            </div>
            <div class="filter-field">
              <label for="book-filter">Book:</label>
              <select id="book-filter" v-model="selectedBook" class="sidebar-select">
                <option value="All">All Rulebooks</option>
                <option v-for="b in availableBooks" :key="b.id" :value="b.id">{{ b.title }}</option>
              </select>
            </div>
          </div>

          <!-- Search Box -->
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="Search PDF rulebooks (e.g. Vrusk, Gyrojet, ADF)..."
              aria-label="Search PDF rulebooks"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="clear-search-btn"
              title="Clear search"
              @click="searchQuery = ''"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Search Results List (when searching) -->
        <div v-if="searchQuery.trim().length > 0" class="results-list" role="region" aria-label="Search Results">
          <div v-if="searchResults.length === 0" class="no-results">
            No matching rulebook sections found.
          </div>
          <div
            v-for="item in searchResults"
            :key="item.id"
            class="result-card"
            :class="{ active: pdfBookId === item.bookId && pdfPage === item.page }"
            @click="jumpToPage(item.bookId, item.page)"
          >
            <div class="result-header">
              <span class="book-tag">{{ item.bookTitle }}</span>
              <span class="page-tag">p. {{ item.page }}</span>
            </div>
            <div class="result-title">{{ item.section }}</div>
            <div class="result-snippet" v-html="item.highlightedSnippet"></div>
          </div>
        </div>

        <!-- Table of Contents / Page Index (when not searching) -->
        <div v-else class="browser-tree" role="region" aria-label="Table of Contents">
          <div v-if="loading && docs.length === 0" class="sidebar-loading">
            Loading pages...
          </div>
          <div v-else-if="filteredDocs.length === 0" class="no-results">
            No pages found for the selected filter.
          </div>
          <div v-else class="tree-groups">
            <div
              v-for="bookGroup in groupedDocs"
              :key="bookGroup.id"
              class="book-group"
            >
              <div class="book-group-header" v-if="selectedBook === 'All'">
                <span class="book-group-title">{{ bookGroup.title }}</span>
                <span class="book-group-count">{{ bookGroup.pages.length }} pages</span>
              </div>
              <div
                v-for="item in bookGroup.pages"
                :key="item.id"
                class="tree-item"
                :class="{ active: pdfBookId === item.bookId && pdfPage === item.page }"
                @click="jumpToPage(item.bookId, item.page)"
              >
                <div class="tree-item-info">
                  <span class="tree-page">Page {{ item.page }}</span>
                  <span v-if="item.preview" class="tree-preview">{{ item.preview }}</span>
                </div>
                <span class="tree-jump-icon">↗</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Right Main Panel: PDF Viewer & Controls -->
      <main class="pdf-main">
        <!-- PDF Viewer Toolbar -->
        <div class="pdf-toolbar">
          <div class="pdf-toolbar-group">
            <label for="pdf-book-select">Book:</label>
            <select id="pdf-book-select" v-model="pdfBookId" class="pdf-select">
              <option v-for="b in pdfBooksList" :key="b.id" :value="b.id">{{ b.title }}</option>
            </select>
          </div>

          <div class="pdf-toolbar-group page-controls">
            <button
              type="button"
              class="page-btn"
              :disabled="pdfPage <= 1"
              @click="changePdfPage(-1)"
              title="Previous Page"
            >
              ← Prev
            </button>
            <div class="page-input-wrapper">
              <label for="pdf-page-input">Page:</label>
              <input
                id="pdf-page-input"
                type="number"
                v-model.number="pdfPage"
                min="1"
                :max="currentBookMaxPage"
                class="page-input"
                @change="clampPage"
                @blur="clampPage"
              />
              <span class="page-total">/ {{ currentBookMaxPage }}</span>
            </div>
            <button
              type="button"
              class="page-btn"
              :disabled="pdfPage >= currentBookMaxPage"
              @click="changePdfPage(1)"
              title="Next Page"
            >
              Next →
            </button>
          </div>

          <div class="pdf-toolbar-group external-link-group">
            <a :href="pdfSrc" target="_blank" rel="noopener" class="new-tab-link">
              Open in New Tab ↗
            </a>
          </div>
        </div>

        <!-- PDF Embedded Viewer Frame -->
        <div class="pdf-viewer-frame">
          <iframe
            :key="pdfSrc"
            :src="pdfSrc"
            class="pdf-iframe"
            title="PDF Rulebook Viewer"
          ></iframe>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted } from 'vue';
import lunr from 'lunr';
import QuickReferenceTables from '../components/QuickReferenceTables.vue';

const props = defineProps({
  initialViewMode: {
    type: String,
    default: 'quickref',
  },
  initialPdfBook: {
    type: String,
    default: 'ad-basic',
  },
  initialPdfPage: {
    type: Number,
    default: 1,
  },
  initialDocs: {
    type: Array,
    default: () => [],
  },
  initialSearch: {
    type: String,
    default: '',
  },
  initialSystem: {
    type: String,
    default: 'All',
  },
  initialBook: {
    type: String,
    default: 'All',
  },
});

const viewMode = ref(props.initialViewMode);
const pdfBookId = ref(props.initialPdfBook);
const pdfPage = ref(props.initialPdfPage);

const pdfBooksList = [
  { id: 'ad-basic', title: 'Alpha Dawn Basic Rules', system: 'Alpha Dawn' },
  { id: 'ad-expanded', title: 'Alpha Dawn Expanded Rules', system: 'Alpha Dawn' },
  { id: 'ad-volturnus', title: 'Crash on Volturnus', system: 'Alpha Dawn' },
  { id: 'kh-basic', title: 'Knight Hawks Basic Rules', system: 'Knight Hawks' },
  { id: 'kh-expansion', title: 'Knight Hawks Expansion Rules', system: 'Knight Hawks' },
  { id: 'kh-mission', title: 'Knight Hawks Mission Brief', system: 'Knight Hawks' },
];

const docs = ref([...props.initialDocs]);
const loading = ref(props.initialDocs.length === 0);
const searchQuery = ref(props.initialSearch);
const selectedSystem = ref(props.initialSystem);
const selectedBook = ref(props.initialBook);

const index = shallowRef(null);
const docMap = new Map();

watch(selectedSystem, () => {
  selectedBook.value = 'All';
});

watch(selectedBook, (newVal) => {
  if (newVal !== 'All') {
    pdfBookId.value = newVal;
    pdfPage.value = 1;
  }
});

const availableBooks = computed(() => {
  if (selectedSystem.value === 'All') {
    return pdfBooksList;
  }
  return pdfBooksList.filter(b => b.system === selectedSystem.value);
});

const bookMaxPages = computed(() => {
  const map = {
    'ad-basic': 20,
    'ad-expanded': 68,
    'ad-volturnus': 43,
    'kh-basic': 20,
    'kh-expansion': 68,
    'kh-mission': 18,
  };
  docs.value.forEach(d => {
    map[d.bookId] = Math.max(map[d.bookId] || 0, d.page);
  });
  return map;
});

const currentBookMaxPage = computed(() => {
  return bookMaxPages.value[pdfBookId.value] || 200;
});

function clampPage() {
  const val = Number(pdfPage.value);
  const max = currentBookMaxPage.value;
  if (isNaN(val) || val < 1) {
    pdfPage.value = 1;
  } else if (val > max && max > 0) {
    pdfPage.value = max;
  } else {
    pdfPage.value = Math.floor(val);
  }
}

function onPageInputChange() {
  clampPage();
}

watch(pdfBookId, () => {
  const max = currentBookMaxPage.value;
  if (pdfPage.value > max) {
    pdfPage.value = 1;
  }
});

const pdfSrc = computed(() => {
  const page = pdfPage.value || 1;
  return `/api/rulebooks/pdf/${pdfBookId.value}#page=${page}`;
});

function changePdfPage(delta) {
  clampPage();
  const next = (pdfPage.value || 1) + delta;
  const max = currentBookMaxPage.value;
  if (next >= 1 && next <= max) {
    pdfPage.value = next;
  }
}

function jumpToPage(bookId, page) {
  pdfBookId.value = bookId;
  pdfPage.value = page;
  clampPage();
}

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function highlightSnippet(content, rawQuery) {
  if (!content) return '';
  const cleaned = content.replace(/Jason Fink \(Order #[0-9]+\)/g, ' ').trim();
  const q = (rawQuery || '').trim();
  const terms = q.split(/\s+/).filter(t => t.length > 0);

  const lower = cleaned.toLowerCase();
  let bestIdx = -1;
  for (const t of terms) {
    const idx = lower.indexOf(t.toLowerCase());
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }

  let snippetRaw = '';
  if (bestIdx !== -1) {
    const start = Math.max(0, bestIdx - 40);
    const end = Math.min(cleaned.length, bestIdx + 100);
    snippetRaw = (start > 0 ? '...' : '') + cleaned.slice(start, end) + (end < cleaned.length ? '...' : '');
  } else {
    snippetRaw = cleaned.slice(0, 140) + (cleaned.length > 140 ? '...' : '');
  }

  let escaped = escapeHtml(snippetRaw);
  const cleanTerms = terms
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean);
  if (cleanTerms.length > 0) {
    const regex = new RegExp(`(${cleanTerms.join('|')})`, 'gi');
    escaped = escaped.replace(regex, '<mark>$1</mark>');
  }
  return escaped;
}

function getPagePreview(content) {
  if (!content) return '';
  const cleaned = content.replace(/Jason Fink \(Order #[0-9]+\)/g, '').trim();
  const preview = cleaned.split('\n').map(l => l.trim()).find(l => l.length > 0) || '';
  return preview.length > 60 ? preview.slice(0, 57) + '...' : preview;
}

function buildIndex() {
  docMap.clear();
  docs.value.forEach(d => docMap.set(d.id, d));

  index.value = lunr(function () {
    this.ref('id');
    this.field('bookTitle');
    this.field('section');
    this.field('content');

    docs.value.forEach(doc => this.add(doc));
  });
}

const searchResults = computed(() => {
  const rawQ = searchQuery.value.trim();
  if (!rawQ || !index.value) return [];

  try {
    const terms = rawQ.split(/\s+/).filter(Boolean);
    const queryStr = terms.map(t => `${t}* ${t}`).join(' ');
    const results = index.value.search(queryStr);

    return results
      .map(r => {
        const item = docMap.get(r.ref);
        if (!item) return null;

        if (selectedSystem.value !== 'All' && item.system !== selectedSystem.value) return null;
        if (selectedBook.value !== 'All' && item.bookId !== selectedBook.value) return null;

        return {
          ...item,
          score: r.score,
          highlightedSnippet: highlightSnippet(item.content, rawQ),
        };
      })
      .filter(Boolean);
  } catch {
    const qLower = rawQ.toLowerCase();
    return docs.value
      .filter(item => {
        if (selectedSystem.value !== 'All' && item.system !== selectedSystem.value) return false;
        if (selectedBook.value !== 'All' && item.bookId !== selectedBook.value) return false;
        return (item.content || '').toLowerCase().includes(qLower) ||
               (item.bookTitle || '').toLowerCase().includes(qLower);
      })
      .map(item => ({
        ...item,
        score: 1,
        highlightedSnippet: highlightSnippet(item.content, rawQ),
      }));
  }
});

const filteredDocs = computed(() => {
  return docs.value.filter(d => {
    const systemMatch = selectedSystem.value === 'All' || d.system === selectedSystem.value;
    const bookMatch = selectedBook.value === 'All' || d.bookId === selectedBook.value;
    return systemMatch && bookMatch;
  });
});

const groupedDocs = computed(() => {
  const groups = new Map();

  for (const doc of filteredDocs.value) {
    if (!groups.has(doc.bookId)) {
      groups.set(doc.bookId, {
        id: doc.bookId,
        title: doc.bookTitle,
        system: doc.system,
        pages: [],
      });
    }

    groups.get(doc.bookId).pages.push({
      ...doc,
      preview: getPagePreview(doc.content),
    });
  }

  return Array.from(groups.values());
});

async function fetchRulebooks() {
  try {
    loading.value = true;
    const res = await fetch('/api/rulebooks', { credentials: 'include' });
    if (res.ok) {
      docs.value = await res.json();
      buildIndex();
    }
  } catch (err) {
    console.error('Failed to load rulebooks', err);
  } finally {
    loading.value = false;
  }
}

if (props.initialDocs.length > 0) {
  buildIndex();
}

onMounted(() => {
  if (docs.value.length === 0) {
    fetchRulebooks();
  }
});
</script>

<style scoped>
.rulebooks-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  gap: 12px;
}

/* Top Nav Bar */
.top-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-secondary);
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  flex-shrink: 0;
}

.mode-toggle {
  display: flex;
  gap: 6px;
  background: var(--bg-primary);
  padding: 4px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.mode-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s ease;
}

.mode-btn:hover {
  color: var(--text-primary);
}

.mode-btn.active {
  background-color: #021a1e !important;
  border: 1px solid aquamarine !important;
  color: aquamarine !important;
  -webkit-text-fill-color: aquamarine;
  box-shadow: 0 0 8px rgba(127, 255, 212, 0.3);
}

.view-status {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Quick Reference Layout */
.quickref-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* PDF Layout */
.pdf-layout {
  display: flex;
  flex: 1;
  gap: 12px;
  min-height: 0;
}

/* PDF Sidebar */
.pdf-sidebar {
  width: 360px;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-filters {
  padding: 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-secondary);
}

.filter-row {
  display: flex;
  gap: 8px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.filter-field label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  font-weight: 600;
}

.sidebar-select,
.sidebar-select option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
}

.sidebar-select {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: var(--radius);
  padding: 5px 8px;
  font-size: 12px;
  width: 100%;
}

.sidebar-select:focus,
.search-input:focus,
.page-input:focus,
.pdf-select:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  background-color: #000000 !important;
  color: #00ffff !important;
  border: 1px solid rgba(0, 128, 128, 0.6) !important;
  border-radius: var(--radius);
  padding: 7px 28px 7px 10px;
  font-size: 13px;
}

.clear-search-btn {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 2px 6px;
  cursor: pointer;
  line-height: 1;
}

.clear-search-btn:hover {
  color: var(--text-primary);
}

/* Results List & Table of Contents */
.results-list,
.browser-tree {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.no-results,
.sidebar-loading {
  padding: 20px 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.result-card {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  background: var(--bg-primary);
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-card:hover {
  background: var(--bg-tertiary);
  border-color: var(--text-secondary);
}

.result-card.active {
  border-color: var(--accent);
  background: rgba(88, 166, 255, 0.12);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.book-tag {
  color: var(--accent);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.page-tag {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.result-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.result-snippet {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.45;
  word-break: break-word;
}

:deep(mark) {
  background: #d29922;
  color: #0d1117;
  padding: 0 3px;
  border-radius: 2px;
  font-weight: 600;
}

/* Table of Contents Groups */
.tree-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.book-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.book-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2px;
}

.book-group-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent);
}

.book-group-count {
  font-size: 11px;
  color: var(--text-secondary);
}

.tree-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.15s ease;
  gap: 8px;
}

.tree-item:hover {
  background: var(--bg-tertiary);
}

.tree-item.active {
  border-color: var(--accent);
  background: rgba(88, 166, 255, 0.12);
}

.tree-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.tree-page {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.tree-preview {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-jump-icon {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.tree-item:hover .tree-jump-icon,
.tree-item.active .tree-jump-icon {
  color: var(--accent);
}

/* Right Main Panel */
.pdf-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  min-width: 0;
}

.pdf-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-wrap: wrap;
}

.pdf-toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pdf-toolbar-group label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.pdf-select,
.pdf-select option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
}

.pdf-select {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: var(--radius);
  padding: 6px 10px;
  font-size: 13px;
}

.page-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-btn {
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid teal !important;
  color: teal !important;
  -webkit-text-fill-color: teal;
  padding: 6px 12px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.page-btn:hover:not(:disabled) {
  background-color: #051414 !important;
  border-color: #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-input {
  width: 65px;
  text-align: center;
  background-color: #000000 !important;
  color: #00ffff !important;
  border: 1px solid rgba(0, 128, 128, 0.6) !important;
  border-radius: var(--radius);
  padding: 6px 8px;
  font-size: 13px;
}

.page-total {
  font-size: 13px;
  color: var(--text-secondary);
}

.external-link-group {
  margin-left: auto;
}

.new-tab-link {
  color: var(--accent);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.new-tab-link:hover {
  text-decoration: underline;
  color: var(--accent-hover);
}

.pdf-viewer-frame {
  flex: 1;
  min-height: 0;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
</style>

<template>
  <div class="gm-notes-layout">
    <!-- Left Sidebar: Campaign Sessions -->
    <aside class="sessions-sidebar">
      <div class="sidebar-header">
        <h3>📓 GM Sessions</h3>
        <button type="button" class="btn-primary btn-new-session" @click="createNewSession">
          + New Session
        </button>
      </div>

      <div v-if="loadingSessions" class="sidebar-loading">Loading sessions...</div>
      <div v-else-if="sessions.length === 0" class="sidebar-empty">
        No sessions yet. Click "+ New Session" to start planning!
      </div>
      <ul v-else class="session-list">
        <li
          v-for="sess in sessions"
          :key="sess.id"
          class="gm-session-item"
          :class="{ active: selectedSession && selectedSession.id === sess.id }"
          @click="selectSession(sess)"
        >
          <span class="session-title-text">{{ sess.title }}</span>
          <button
            type="button"
            class="btn-delete-small"
            title="Delete Session"
            @click.stop="deleteSession(sess.id)"
          >
            ✕
          </button>
        </li>
      </ul>
    </aside>

    <!-- Main Workspace: Session Note Panels -->
    <main class="notes-workspace">
      <div v-if="!selectedSession" class="no-selection">
        <div class="stub-icon">📓</div>
        <h2>GameMaster Private Session Notes</h2>
        <p>Select a session from the sidebar or create a new session to organize your readouts, encounter notes, and adversaries.</p>
      </div>

      <div v-else class="workspace-container">
        <!-- Session Header Bar -->
        <header class="session-header card">
          <div class="session-title-group">
            <span class="gm-only-pill" title="Visible only to the GameMaster">🔒 GM ONLY</span>
            <input
              type="text"
              v-model="selectedSession.title"
              @change="updateSelectedSessionTitle"
              class="session-title-input"
              placeholder="Session Title (e.g. Session 1: Outpost on Volturnus)"
            />
          </div>

          <div class="panel-actions-bar">
            <button type="button" class="btn-add-panel" @click="createNotePanel('New Note')">
              + Add Note Panel
            </button>
            <div class="preset-chips">
              <span class="preset-label">Quick Add:</span>
              <button
                v-for="preset in panelPresets"
                :key="preset"
                type="button"
                class="btn-preset-chip"
                :data-test="`add-preset-${preset}`"
                @click="createNotePanel(preset)"
              >
                + {{ preset }}
              </button>
            </div>
          </div>
        </header>

        <!-- Note Panels Grid -->
        <div v-if="loadingPanels" class="panels-loading">Loading note panels...</div>
        <div v-else-if="panels.length === 0" class="panels-empty card">
          <p>No note panels in this session yet. Click <strong>+ Add Note Panel</strong> or one of the quick-add buttons above!</p>
        </div>
        <div v-else class="note-panels-grid">
          <section
            v-for="panel in panels"
            :key="panel.id"
            class="note-panel-card card"
          >
            <div class="panel-card-header">
              <input
                type="text"
                v-model="panel.title"
                @change="savePanel(panel)"
                class="panel-title-input"
                placeholder="Note Title (e.g. Introduction, Part 1)"
              />
              <span v-if="savingPanelId === panel.id" class="save-status">Saving...</span>
              <button
                type="button"
                class="btn-delete-panel"
                title="Delete Note Panel"
                @click="deletePanel(panel.id)"
              >
                ✕
              </button>
            </div>
            <textarea
              v-model="panel.content"
              @change="savePanel(panel)"
              class="panel-content-textarea"
              rows="8"
              placeholder="Write box-text readouts, adversaries to spawn, clues, or tactical reminders..."
            ></textarea>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';

const sessions = ref([]);
const selectedSession = ref(null);
const panels = ref([]);
const loadingSessions = ref(false);
const loadingPanels = ref(false);
const savingPanelId = ref(null);
let currentFetchSessionId = null;

const panelPresets = ['Introduction', 'Part 1', 'Part 2', 'Readout', 'Adversaries'];

function getSavedSessionId() {
  const state = getUserState(getSafeUserId(), 'gmNotes', { selectedSessionId: null });
  return state.selectedSessionId;
}

function persistSelectedSessionId(id) {
  saveUserState(getSafeUserId(), 'gmNotes', { selectedSessionId: id });
}

async function fetchSessions() {
  loadingSessions.value = true;
  try {
    const res = await fetch('/api/gm-notes/sessions', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      sessions.value = data || [];
      loadingSessions.value = false;
      if (sessions.value.length > 0) {
        const savedId = getSavedSessionId();
        const found = sessions.value.find((s) => s.id === savedId) || sessions.value[0];
        await selectSession(found);
      } else {
        selectedSession.value = null;
        panels.value = [];
      }
    }
  } catch (err) {
    console.error('Failed to fetch GM sessions:', err);
  } finally {
    loadingSessions.value = false;
  }
}

async function selectSession(sess) {
  selectedSession.value = sess;
  persistSelectedSessionId(sess?.id ?? null);
  if (!sess) {
    panels.value = [];
    currentFetchSessionId = null;
    return;
  }
  const sessionId = sess.id;
  currentFetchSessionId = sessionId;
  loadingPanels.value = true;
  try {
    const res = await fetch(`/api/gm-notes/sessions/${sessionId}/panels`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (currentFetchSessionId === sessionId && selectedSession.value?.id === sessionId) {
        panels.value = data || [];
      }
    }
  } catch (err) {
    if (currentFetchSessionId === sessionId) {
      console.error('Failed to load session note panels:', err);
    }
  } finally {
    if (currentFetchSessionId === sessionId) {
      loadingPanels.value = false;
    }
  }
}

async function createNewSession() {
  const nextNum = sessions.value.length + 1;
  try {
    const res = await fetch('/api/gm-notes/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: `Session ${nextNum}` }),
    });
    if (res.ok) {
      const created = await res.json();
      sessions.value.push(created);
      await selectSession(created);
    }
  } catch (err) {
    console.error('Failed to create GM session:', err);
  }
}

async function updateSelectedSessionTitle() {
  if (!selectedSession.value) return;
  try {
    const res = await fetch(`/api/gm-notes/sessions/${selectedSession.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: selectedSession.value.title }),
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = sessions.value.findIndex((s) => s.id === updated.id);
      if (idx !== -1) sessions.value[idx] = updated;
      selectedSession.value = updated;
    }
  } catch (err) {
    console.error('Failed to update session title:', err);
  }
}

async function deleteSession(sessionId) {
  if (typeof confirm === 'function' && !confirm('Delete this session and all its note panels?')) {
    return;
  }
  try {
    const res = await fetch(`/api/gm-notes/sessions/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      sessions.value = sessions.value.filter((s) => s.id !== sessionId);
      if (selectedSession.value && selectedSession.value.id === sessionId) {
        const next = sessions.value[0] || null;
        await selectSession(next);
      }
    }
  } catch (err) {
    console.error('Failed to delete session:', err);
  }
}

async function createNotePanel(defaultTitle = 'New Note') {
  if (!selectedSession.value) return;
  try {
    const res = await fetch(`/api/gm-notes/sessions/${selectedSession.value.id}/panels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: defaultTitle, content: '' }),
    });
    if (res.ok) {
      const created = await res.json();
      panels.value.push(created);
    }
  } catch (err) {
    console.error('Failed to create note panel:', err);
  }
}

async function savePanel(panel) {
  if (!panel || !panel.id) return;
  savingPanelId.value = panel.id;
  try {
    const res = await fetch(`/api/gm-notes/panels/${panel.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: panel.title,
        content: panel.content,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = panels.value.findIndex((p) => p.id === updated.id);
      if (idx !== -1) panels.value[idx] = updated;
    }
  } catch (err) {
    console.error('Failed to save note panel:', err);
  } finally {
    savingPanelId.value = null;
  }
}

async function deletePanel(panelId) {
  if (typeof confirm === 'function' && !confirm('Delete this note panel?')) {
    return;
  }
  try {
    const res = await fetch(`/api/gm-notes/panels/${panelId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      panels.value = panels.value.filter((p) => p.id !== panelId);
    }
  } catch (err) {
    console.error('Failed to delete note panel:', err);
  }
}

onMounted(() => {
  fetchSessions();
});
</script>

<style scoped>
.gm-notes-layout {
  display: flex;
  height: calc(100vh - 48px);
  background: var(--bg-primary, #0d1117);
  color: var(--text-primary, #f0f6fc);
  overflow: hidden;
}

.sessions-sidebar {
  width: 270px;
  background: var(--bg-secondary, #161b22);
  border-right: 1px solid var(--border, #30363d);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border, #30363d);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #38bdf8;
}

.btn-new-session {
  background: #0284c7;
  color: #ffffff;
  border: 1px solid #38bdf8;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-new-session:hover {
  background: #0369a1;
}

.session-list {
  box-sizing: border-box;
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}

.gm-session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.15s;
}

.gm-session-item:hover {
  background: rgba(56, 189, 248, 0.08);
}

.gm-session-item.active {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
}

.session-title-text {
  font-weight: 600;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-delete-small {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-delete-small:hover {
  color: #f87171;
  background: rgba(239, 68, 68, 0.15);
}

.notes-workspace {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.workspace-container {
  max-width: 1300px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.card {
  background: var(--bg-secondary, #161b22);
  border: 1px solid var(--border, #30363d);
  border-radius: 8px;
  padding: 16px;
}

.session-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.session-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gm-only-pill {
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid #f59e0b;
  color: #fcd34d;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.session-title-input {
  flex: 1;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #f8fafc;
  font-size: 1.2rem;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: 6px;
}

.panel-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.btn-add-panel {
  background: #0284c7;
  border: 1px solid #38bdf8;
  color: #ffffff;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-add-panel:hover {
  background: #0369a1;
}

.preset-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-label {
  font-size: 0.78rem;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 600;
}

.btn-preset-chip {
  background: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-preset-chip:hover {
  border-color: #38bdf8;
  color: #38bdf8;
}

.note-panels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 16px;
}

.note-panel-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title-input {
  flex: 1;
  background: #0d1117;
  border: 1px solid #334155;
  color: #38bdf8;
  font-size: 1rem;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 6px;
}

.save-status {
  font-size: 0.75rem;
  color: #94a3b8;
}

.btn-delete-panel {
  background: transparent;
  border: 1px solid transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-delete-panel:hover {
  color: #f87171;
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}

.panel-content-textarea {
  width: 100%;
  box-sizing: border-box;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #e2e8f0;
  border-radius: 6px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 0.92rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 160px;
}

.no-selection,
.sidebar-loading,
.sidebar-empty,
.panels-loading,
.panels-empty {
  text-align: center;
  color: #94a3b8;
  padding: 32px 16px;
}

.stub-icon {
  font-size: 2.5rem;
  margin-bottom: 8px;
}
</style>

<template>
  <div class="sheets-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h3>Character Sheets</h3>
        <button class="btn-primary" @click="openCreateModal">+ New Character</button>
      </div>

      <div v-if="loading" class="sidebar-loading">Loading characters...</div>
      <div v-else-if="characters.length === 0" class="sidebar-empty">
        No characters found. Create one to get started!
      </div>
      <ul v-else class="character-list">
        <li
          v-for="char in characters"
          :key="char.id"
          :class="{ active: selectedChar && selectedChar.id === char.id }"
          @click="selectCharacter(char)"
        >
          <div class="char-item-info">
            <span class="char-name">{{ char.name || 'Unnamed' }}</span>
            <span class="char-sub">{{ char.race || 'Unknown Race' }} • STA {{ char.current_stamina }}/{{ char.max_stamina }}</span>
          </div>
          <button class="btn-delete-small" title="Delete Character" @click.stop="deleteCharacter(char.id)">✕</button>
        </li>
      </ul>
    </aside>

    <!-- Main Content Area -->
    <main class="sheet-main">
      <div v-if="!selectedChar" class="no-selection">
        <div class="stub-icon">📋</div>
        <h2>Select or Create a Character</h2>
        <p>Choose a character sheet from the sidebar or build a new Alpha Dawn hero.</p>
      </div>

      <div v-else class="sheet-container">
        <!-- Header Info -->
        <header class="sheet-header">
          <div class="header-main">
            <input
              type="text"
              v-model="selectedChar.name"
              @change="updateCharacter"
              class="input-name"
              placeholder="Character Name"
            />
            <div class="race-select-wrap">
              <label>Race:</label>
              <select v-model="selectedChar.race" @change="updateCharacter" class="select-race">
                <option value="Human">Human</option>
                <option value="Dralasite">Dralasite</option>
                <option value="Vrusk">Vrusk</option>
                <option value="Yazirian">Yazirian</option>
              </select>
            </div>
          </div>
          <div class="race-ability-banner">
            <strong>Racial Ability:</strong> {{ racialAbilities[selectedChar.race] || 'None' }}
          </div>
        </header>

        <!-- Quick Stamina Tracker -->
        <section class="stamina-section card">
          <div class="stamina-header">
            <h4>Stamina Tracker</h4>
            <div class="stamina-values">
              <span class="current">{{ selectedChar.current_stamina }}</span> / 
              <input
                type="number"
                v-model.number="selectedChar.max_stamina"
                @change="updateCharacter"
                class="input-max-sta"
                min="1"
              /> Max STA
            </div>
          </div>
          <div class="stamina-bar-bg">
            <div
              class="stamina-bar-fill"
              :style="{ width: staminaPercentage + '%', backgroundColor: staminaColor }"
            ></div>
          </div>
          <div class="stamina-controls">
            <button class="btn-sta btn-sub" @click="adjustStamina(-5)">-5</button>
            <button class="btn-sta btn-sub" @click="adjustStamina(-1)">-1</button>
            <button class="btn-sta btn-add" @click="adjustStamina(+1)">+1</button>
            <button class="btn-sta btn-add" @click="adjustStamina(+5)">+5</button>
          </div>
        </section>

        <!-- Primary Stats Grid -->
        <section class="stats-section card">
          <h4>Primary D100 Stats</h4>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">STR / STA</div>
              <div class="stat-sublabel">Strength / Stamina</div>
              <input
                type="number"
                v-model.number="selectedChar.str_sta"
                @change="updateCharacter"
                class="stat-input"
                min="1"
                max="100"
              />
            </div>
            <div class="stat-box">
              <div class="stat-label">DEX / RS</div>
              <div class="stat-sublabel">Dexterity / Reaction Speed</div>
              <input
                type="number"
                v-model.number="selectedChar.dex_rs"
                @change="updateCharacter"
                class="stat-input"
                min="1"
                max="100"
              />
            </div>
            <div class="stat-box">
              <div class="stat-label">INT / LOG</div>
              <div class="stat-sublabel">Intuition / Logic</div>
              <input
                type="number"
                v-model.number="selectedChar.int_log"
                @change="updateCharacter"
                class="stat-input"
                min="1"
                max="100"
              />
            </div>
            <div class="stat-box">
              <div class="stat-label">PER / LDR</div>
              <div class="stat-sublabel">Personality / Leadership</div>
              <input
                type="number"
                v-model.number="selectedChar.per_ldr"
                @change="updateCharacter"
                class="stat-input"
                min="1"
                max="100"
              />
            </div>
          </div>
        </section>

        <!-- Lists: Skills & Inventory -->
        <div class="two-column-lists">
          <!-- Skills -->
          <section class="card list-card">
            <div class="list-header">
              <h4>Skills</h4>
              <button class="btn-secondary" @click="addSkill">+ Add Skill</button>
            </div>
            <div v-if="!selectedChar.skills || selectedChar.skills.length === 0" class="empty-list">
              No skills added.
            </div>
            <ul class="items-list">
              <li v-for="(skill, index) in selectedChar.skills" :key="index" class="item-row">
                <input
                  type="text"
                  v-model="skill.name"
                  @change="updateCharacter"
                  placeholder="Skill Name"
                  class="item-name-input"
                />
                <div class="level-wrap">
                  <label>Lvl:</label>
                  <input
                    type="number"
                    v-model.number="skill.level"
                    @change="updateCharacter"
                    min="1"
                    max="6"
                    class="item-level-input"
                  />
                </div>
                <button class="btn-remove" @click="removeSkill(index)">✕</button>
              </li>
            </ul>
          </section>

          <!-- Inventory -->
          <section class="card list-card">
            <div class="list-header">
              <h4>Inventory</h4>
              <button class="btn-secondary" @click="addInventoryItem">+ Add Item</button>
            </div>
            <div v-if="!selectedChar.inventory || selectedChar.inventory.length === 0" class="empty-list">
              No equipment in inventory.
            </div>
            <ul class="items-list">
              <li v-for="(item, index) in selectedChar.inventory" :key="index" class="item-row">
                <input
                  type="text"
                  v-model="item.name"
                  @change="updateCharacter"
                  placeholder="Item Name"
                  class="item-name-input"
                />
                <div class="level-wrap">
                  <label>Qty:</label>
                  <input
                    type="number"
                    v-model.number="item.quantity"
                    @change="updateCharacter"
                    min="1"
                    class="item-level-input"
                  />
                </div>
                <button class="btn-remove" @click="removeInventoryItem(index)">✕</button>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>

    <!-- Create Character Modal -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
      <div class="modal-card">
        <h3>Create New Character</h3>
        <form @submit.prevent="createCharacter">
          <div class="form-group">
            <label>Character Name</label>
            <input type="text" v-model="newCharForm.name" required placeholder="e.g. Wilf Tybo" />
          </div>
          <div class="form-group">
            <label>Race</label>
            <select v-model="newCharForm.race">
              <option value="Human">Human (+5 XP bonus / adaptable)</option>
              <option value="Dralasite">Dralasite (Lie Detection & Elasticity)</option>
              <option value="Vrusk">Vrusk (Ambidexterity & Comprehensive)</option>
              <option value="Yazirian">Yazirian (Battle Rage & Gliding)</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>STR / STA</label>
              <input type="number" v-model.number="newCharForm.str_sta" min="1" max="100" />
            </div>
            <div class="form-group">
              <label>DEX / RS</label>
              <input type="number" v-model.number="newCharForm.dex_rs" min="1" max="100" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>INT / LOG</label>
              <input type="number" v-model.number="newCharForm.int_log" min="1" max="100" />
            </div>
            <div class="form-group">
              <label>PER / LDR</label>
              <input type="number" v-model.number="newCharForm.per_ldr" min="1" max="100" />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showCreateModal = false">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="creating">Create</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { socket } from '../services/socket.js';

export default {
  name: 'CharacterSheetsView',
  data() {
    return {
      characters: [],
      selectedChar: null,
      loading: true,
      creating: false,
      showCreateModal: false,
      newCharForm: {
        name: '',
        race: 'Human',
        str_sta: 50,
        dex_rs: 50,
        int_log: 50,
        per_ldr: 50,
        max_stamina: 50,
        current_stamina: 50,
      },
      racialAbilities: {
        Human: 'Adaptable - Receives +5% bonus experience overall.',
        Dralasite: 'Lie Detection (5% base + 5%/lvl) & Elasticity (can sprout up to 5 limbs).',
        Vrusk: 'Ambidexterity (no off-hand penalty) & Comprehensive (15% base chance to understand unknown tech).',
        Yazirian: 'Battle Rage (+20 to hit when enraged) & Gliding (can glide down from heights).',
      },
    };
  },
  computed: {
    staminaPercentage() {
      if (!this.selectedChar || !this.selectedChar.max_stamina) return 0;
      const pct = (this.selectedChar.current_stamina / this.selectedChar.max_stamina) * 100;
      return Math.max(0, Math.min(100, pct));
    },
    staminaColor() {
      if (this.staminaPercentage > 50) return '#4caf50';
      if (this.staminaPercentage > 25) return '#ff9800';
      return '#f44336';
    },
  },
  mounted() {
    this.fetchCharacters();
    this.setupSocketListeners();
  },
  beforeUnmount() {
    this.removeSocketListeners();
  },
  methods: {
    async fetchCharacters() {
      this.loading = true;
      try {
        const res = await fetch('/api/characters');
        if (res.ok) {
          this.characters = await res.json();
          if (this.characters.length > 0 && !this.selectedChar) {
            this.selectedChar = { ...this.characters[0] };
          }
        }
      } catch (err) {
        console.error('Error fetching characters:', err);
      } finally {
        this.loading = false;
      }
    },
    selectCharacter(char) {
      this.selectedChar = JSON.parse(JSON.stringify(char));
    },
    openCreateModal() {
      this.newCharForm = {
        name: '',
        race: 'Human',
        str_sta: 50,
        dex_rs: 50,
        int_log: 50,
        per_ldr: 50,
        max_stamina: 50,
        current_stamina: 50,
      };
      this.showCreateModal = true;
    },
    async createCharacter() {
      if (!this.newCharForm.name.trim()) return;
      this.creating = true;
      try {
        const payload = {
          ...this.newCharForm,
          max_stamina: this.newCharForm.str_sta,
          current_stamina: this.newCharForm.str_sta,
          skills: [],
          inventory: [],
        };
        const res = await fetch('/api/characters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          this.showCreateModal = false;
          // If socket hasn't added it yet, add locally
          if (!this.characters.some((c) => c.id === created.id)) {
            this.characters.push(created);
          }
          this.selectedChar = JSON.parse(JSON.stringify(created));
        }
      } catch (err) {
        console.error('Error creating character:', err);
      } finally {
        this.creating = false;
      }
    },
    async updateCharacter() {
      if (!this.selectedChar || !this.selectedChar.id) return;
      try {
        const res = await fetch(`/api/characters/${this.selectedChar.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.selectedChar),
        });
        if (res.ok) {
          const updated = await res.json();
          const idx = this.characters.findIndex((c) => c.id === updated.id);
          if (idx !== -1) {
            this.characters[idx] = { ...updated };
          }
        }
      } catch (err) {
        console.error('Error updating character:', err);
      }
    },
    adjustStamina(amount) {
      if (!this.selectedChar) return;
      let newSta = (this.selectedChar.current_stamina || 0) + amount;
      newSta = Math.max(0, Math.min(this.selectedChar.max_stamina || 100, newSta));
      this.selectedChar.current_stamina = newSta;
      this.updateCharacter();
    },
    async deleteCharacter(id) {
      if (!confirm('Are you sure you want to delete this character?')) return;
      try {
        const res = await fetch(`/api/characters/${id}`, { method: 'DELETE' });
        if (res.ok) {
          this.characters = this.characters.filter((c) => c.id !== id);
          if (this.selectedChar && this.selectedChar.id === id) {
            this.selectedChar = this.characters.length > 0 ? { ...this.characters[0] } : null;
          }
        }
      } catch (err) {
        console.error('Error deleting character:', err);
      }
    },
    addSkill() {
      if (!this.selectedChar.skills) this.selectedChar.skills = [];
      this.selectedChar.skills.push({ name: 'New Skill', level: 1 });
      this.updateCharacter();
    },
    removeSkill(index) {
      this.selectedChar.skills.splice(index, 1);
      this.updateCharacter();
    },
    addInventoryItem() {
      if (!this.selectedChar.inventory) this.selectedChar.inventory = [];
      this.selectedChar.inventory.push({ name: 'New Item', quantity: 1 });
      this.updateCharacter();
    },
    removeInventoryItem(index) {
      this.selectedChar.inventory.splice(index, 1);
      this.updateCharacter();
    },
    setupSocketListeners() {
      socket.on('sheet:created', this.handleSheetCreated);
      socket.on('sheet:updated', this.handleSheetUpdated);
      socket.on('sheet:deleted', this.handleSheetDeleted);
    },
    removeSocketListeners() {
      socket.off('sheet:created', this.handleSheetCreated);
      socket.off('sheet:updated', this.handleSheetUpdated);
      socket.off('sheet:deleted', this.handleSheetDeleted);
    },
    handleSheetCreated(payload) {
      if (payload && payload.type === 'character' && payload.sheet) {
        const sheet = payload.sheet;
        const idx = this.characters.findIndex((c) => c.id === sheet.id);
        if (idx === -1) {
          this.characters.push(sheet);
        } else {
          this.characters[idx] = sheet;
        }
      }
    },
    handleSheetUpdated(payload) {
      if (payload && payload.type === 'character' && payload.sheet) {
        const sheet = payload.sheet;
        const idx = this.characters.findIndex((c) => c.id === sheet.id);
        if (idx !== -1) {
          this.characters[idx] = sheet;
          if (this.selectedChar && this.selectedChar.id === sheet.id) {
            this.selectedChar = { ...sheet };
          }
        }
      }
    },
    handleSheetDeleted(payload) {
      if (payload && payload.type === 'character') {
        const id = payload.id;
        this.characters = this.characters.filter((c) => c.id !== id);
        if (this.selectedChar && this.selectedChar.id === id) {
          this.selectedChar = this.characters.length > 0 ? { ...this.characters[0] } : null;
        }
      }
    },
  },
};
</script>

<style scoped>
.sheets-layout {
  display: flex;
  height: calc(100vh - 60px);
  background: var(--bg-dark, #0d1117);
  color: var(--text-primary, #c9d1d9);
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 280px;
  background: #161b22;
  border-right: 1px solid #30363d;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #30363d;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #58a6ff;
}

.sidebar-loading,
.sidebar-empty {
  padding: 16px;
  font-size: 0.9rem;
  color: #8b949e;
  text-align: center;
}

.character-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.character-list li {
  padding: 12px 16px;
  border-bottom: 1px solid #21262d;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.character-list li:hover {
  background: #21262d;
}

.character-list li.active {
  background: #1f6feb22;
  border-left: 4px solid #58a6ff;
}

.char-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.char-name {
  font-weight: 600;
  color: #f0f6fc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.char-sub {
  font-size: 0.8rem;
  color: #8b949e;
}

.btn-delete-small {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
}
.btn-delete-small:hover {
  color: #f85149;
}

/* Main Area */
.sheet-main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8b949e;
}
.stub-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.sheet-container {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 16px;
}

/* Header */
.sheet-header {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-main {
  display: flex;
  gap: 16px;
  align-items: center;
}

.input-name {
  flex: 1;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #f0f6fc;
  font-size: 1.4rem;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: 4px;
}

.race-select-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.select-race {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #58a6ff;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 1rem;
}

.race-ability-banner {
  background: #1f6feb15;
  border-left: 3px solid #58a6ff;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: #8b949e;
}

.race-ability-banner strong {
  color: #f0f6fc;
}

/* Stamina Section */
.stamina-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.stamina-header h4 {
  margin: 0;
  color: #58a6ff;
}

.stamina-values {
  font-size: 1.1rem;
  font-weight: 700;
}

.input-max-sta {
  width: 60px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #f0f6fc;
  text-align: center;
  padding: 2px 4px;
  border-radius: 4px;
}

.stamina-bar-bg {
  height: 14px;
  background: #21262d;
  border-radius: 7px;
  overflow: hidden;
  margin-bottom: 12px;
}

.stamina-bar-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.stamina-controls {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-sta {
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  font-weight: 700;
  cursor: pointer;
}
.btn-sub {
  background: #da363322;
  color: #f85149;
  border: 1px solid #f8514944;
}
.btn-sub:hover {
  background: #da363344;
}
.btn-add {
  background: #23863622;
  color: #3fb950;
  border: 1px solid #3fb95044;
}
.btn-add:hover {
  background: #23863644;
}

/* Primary Stats Grid */
.stats-section h4 {
  margin: 0 0 12px 0;
  color: #58a6ff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-box {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-weight: 700;
  color: #f0f6fc;
}

.stat-sublabel {
  font-size: 0.7rem;
  color: #8b949e;
  text-align: center;
}

.stat-input {
  width: 70px;
  font-size: 1.3rem;
  font-weight: 700;
  text-align: center;
  background: #161b22;
  border: 1px solid #30363d;
  color: #58a6ff;
  border-radius: 4px;
  padding: 4px;
  margin-top: 4px;
}

/* Lists */
.two-column-lists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.list-header h4 {
  margin: 0;
  color: #58a6ff;
}

.empty-list {
  color: #8b949e;
  font-size: 0.85rem;
  font-style: italic;
  padding: 8px 0;
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-name-input {
  flex: 1;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #f0f6fc;
  padding: 6px 8px;
  border-radius: 4px;
}

.level-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #8b949e;
}

.item-level-input {
  width: 45px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #f0f6fc;
  text-align: center;
  padding: 6px 4px;
  border-radius: 4px;
}

.btn-remove {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 4px;
}
.btn-remove:hover {
  color: #f85149;
}

/* Buttons & Controls */
.btn-primary {
  background: #238636;
  color: #ffffff;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover {
  background: #2ea043;
}

.btn-secondary {
  background: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-secondary:hover {
  background: #30363d;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 24px;
  width: 420px;
  max-width: 90vw;
}

.modal-card h3 {
  margin-top: 0;
  color: #58a6ff;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.form-group label {
  font-size: 0.85rem;
  color: #8b949e;
}

.form-group input,
.form-group select {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #f0f6fc;
  padding: 8px;
  border-radius: 4px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
</style>

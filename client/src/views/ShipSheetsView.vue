<template>
  <div class="sheets-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h3>Ship Sheets</h3>
        <button class="btn-primary" @click="openCreateModal">+ New Ship</button>
      </div>

      <div v-if="loading" class="sidebar-loading">Loading ships...</div>
      <div v-else-if="ships.length === 0" class="sidebar-empty">
        No ships found. Create one to get started!
      </div>
      <ul v-else class="ship-list">
        <li
          v-for="ship in ships"
          :key="ship.id"
          :class="{ active: selectedShip && selectedShip.id === ship.id }"
          @click="selectShip(ship)"
        >
          <div class="ship-item-info">
            <span class="ship-name">{{ ship.name || 'Unnamed Ship' }}</span>
            <span class="ship-sub">{{ ship.type || 'Fighter' }} • HP {{ ship.current_hull_points }}/{{ ship.max_hull_points }}</span>
          </div>
          <button class="btn-delete-small" title="Delete Ship" @click.stop="deleteShip(ship.id)">✕</button>
        </li>
      </ul>
    </aside>

    <!-- Main Content Area -->
    <main class="sheet-main">
      <div v-if="!selectedShip" class="no-selection">
        <div class="stub-icon">🛸</div>
        <h2>Select or Create a Knight Hawks Ship</h2>
        <p>Choose a ship sheet from the sidebar or register a new starship.</p>
      </div>

      <div v-else class="sheet-container">
        <!-- Header Info -->
        <header class="sheet-header card">
          <div class="header-main">
            <input
              type="text"
              v-model="selectedShip.name"
              @change="updateShip"
              class="input-name"
              placeholder="Ship Name"
            />
            <div class="type-wrap">
              <label>Type / Class:</label>
              <input
                type="text"
                v-model="selectedShip.type"
                @change="updateShip"
                class="input-type"
                placeholder="e.g. Assault Scout"
              />
            </div>
          </div>
        </header>

        <!-- Quick Hull Points Tracker -->
        <section class="hull-section card">
          <div class="hull-header">
            <h4>Hull Points (HP)</h4>
            <div class="hull-values">
              <span class="current">{{ selectedShip.current_hull_points }}</span> / 
              <input
                type="number"
                v-model.number="selectedShip.max_hull_points"
                @change="updateShip"
                class="input-max-hp"
                min="1"
              /> Max HP
            </div>
          </div>
          <div class="hull-bar-bg">
            <div
              class="hull-bar-fill"
              :style="{ width: hullPercentage + '%', backgroundColor: hullColor }"
            ></div>
          </div>
          <div class="hull-controls">
            <button class="btn-hp btn-sub" @click="adjustHullPoints(-5)">-5</button>
            <button class="btn-hp btn-sub" @click="adjustHullPoints(-1)">-1</button>
            <button class="btn-hp btn-add" @click="adjustHullPoints(+1)">+1</button>
            <button class="btn-hp btn-add" @click="adjustHullPoints(+5)">+5</button>
          </div>
        </section>

        <!-- Flight & Tactical Stats -->
        <section class="stats-section card">
          <h4>Flight & Tactical Stats</h4>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">ADF</div>
              <div class="stat-sublabel">Acceleration Decision Factor</div>
              <input
                type="number"
                v-model.number="selectedShip.adf"
                @change="updateShip"
                class="stat-input"
                min="0"
                max="10"
              />
            </div>
            <div class="stat-box">
              <div class="stat-label">MR</div>
              <div class="stat-sublabel">Maneuver Rating</div>
              <input
                type="number"
                v-model.number="selectedShip.mr"
                @change="updateShip"
                class="stat-input"
                min="0"
                max="10"
              />
            </div>
            <div class="stat-box">
              <div class="stat-label">DCR</div>
              <div class="stat-sublabel">Damage Control Rating</div>
              <input
                type="number"
                v-model.number="selectedShip.dcr"
                @change="updateShip"
                class="stat-input"
                min="1"
                max="200"
              />
            </div>
          </div>
        </section>

        <!-- Defense & Armament Grid -->
        <div class="two-column-lists">
          <!-- Defensive Screens -->
          <section class="card list-card">
            <div class="list-header">
              <h4>Defensive Screens</h4>
            </div>
            <div class="defenses-list">
              <div class="defense-toggle-row">
                <span class="defense-label">Reflect Screen</span>
                <button
                  :class="['toggle-btn', selectedShip.defenses && selectedShip.defenses.reflect ? 'active' : 'offline']"
                  @click="toggleDefense('reflect')"
                >
                  {{ selectedShip.defenses && selectedShip.defenses.reflect ? 'ONLINE' : 'OFFLINE' }}
                </button>
              </div>
              <div class="defense-toggle-row">
                <span class="defense-label">Masking Screen</span>
                <button
                  :class="['toggle-btn', selectedShip.defenses && selectedShip.defenses.masking ? 'active' : 'offline']"
                  @click="toggleDefense('masking')"
                >
                  {{ selectedShip.defenses && selectedShip.defenses.masking ? 'ONLINE' : 'OFFLINE' }}
                </button>
              </div>
              <div class="defense-toggle-row">
                <span class="defense-label">ICMs (Interceptors)</span>
                <div class="icm-wrap">
                  <label>Qty:</label>
                  <input
                    type="number"
                    v-model.number="selectedShip.defenses.icm_count"
                    @change="updateShip"
                    min="0"
                    class="item-level-input"
                  />
                </div>
              </div>
            </div>
          </section>

          <!-- Weapons List -->
          <section class="card list-card">
            <div class="list-header">
              <h4>Armament / Weapons</h4>
              <button class="btn-secondary" @click="addWeapon">+ Add Weapon</button>
            </div>
            <div v-if="!selectedShip.weapons || selectedShip.weapons.length === 0" class="empty-list">
              No weapon systems equipped.
            </div>
            <ul class="items-list">
              <li v-for="(wpn, index) in selectedShip.weapons" :key="index" class="item-row">
                <input
                  type="text"
                  v-model="wpn.name"
                  @change="updateShip"
                  placeholder="e.g. Laser Battery"
                  class="item-name-input"
                />
                <input
                  type="text"
                  v-model="wpn.damage"
                  @change="updateShip"
                  placeholder="e.g. 1d10"
                  class="item-dmg-input"
                />
                <button
                  :class="['status-btn', wpn.status === 'Online' ? 'online' : 'damaged']"
                  @click="toggleWeaponStatus(index)"
                >
                  {{ wpn.status || 'Online' }}
                </button>
                <button class="btn-remove" @click="removeWeapon(index)">✕</button>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>

    <!-- Create Ship Modal -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
      <div class="modal-card">
        <h3>Create New Ship</h3>
        <form @submit.prevent="createShip">
          <div class="form-group">
            <label>Ship Name</label>
            <input type="text" v-model="newShipForm.name" required placeholder="e.g. UPF Gullwind" />
          </div>
          <div class="form-group">
            <label>Ship Type / Class</label>
            <input type="text" v-model="newShipForm.type" placeholder="e.g. Assault Scout" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>ADF</label>
              <input type="number" v-model.number="newShipForm.adf" min="0" max="10" />
            </div>
            <div class="form-group">
              <label>MR</label>
              <input type="number" v-model.number="newShipForm.mr" min="0" max="10" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>DCR</label>
              <input type="number" v-model.number="newShipForm.dcr" min="1" max="200" />
            </div>
            <div class="form-group">
              <label>Hull Points (HP)</label>
              <input type="number" v-model.number="newShipForm.max_hull_points" min="1" />
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
  name: 'ShipSheetsView',
  data() {
    return {
      ships: [],
      selectedShip: null,
      loading: true,
      creating: false,
      showCreateModal: false,
      newShipForm: {
        name: '',
        type: 'Assault Scout',
        adf: 5,
        mr: 4,
        dcr: 70,
        max_hull_points: 50,
        current_hull_points: 50,
      },
    };
  },
  computed: {
    hullPercentage() {
      if (!this.selectedShip || !this.selectedShip.max_hull_points) return 0;
      const pct = (this.selectedShip.current_hull_points / this.selectedShip.max_hull_points) * 100;
      return Math.max(0, Math.min(100, pct));
    },
    hullColor() {
      if (this.hullPercentage > 50) return '#4caf50';
      if (this.hullPercentage > 25) return '#ff9800';
      return '#f44336';
    },
  },
  mounted() {
    this.fetchShips();
    this.setupSocketListeners();
  },
  beforeUnmount() {
    this.removeSocketListeners();
  },
  methods: {
    async fetchShips() {
      this.loading = true;
      try {
        const res = await fetch('/api/ships');
        if (res.ok) {
          this.ships = await res.json();
          if (this.ships.length > 0 && !this.selectedShip) {
            this.selectShip(this.ships[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching ships:', err);
      } finally {
        this.loading = false;
      }
    },
    selectShip(ship) {
      const copy = JSON.parse(JSON.stringify(ship));
      if (!copy.defenses) {
        copy.defenses = { reflect: false, masking: false, icm_count: 4 };
      }
      this.selectedShip = copy;
    },
    openCreateModal() {
      this.newShipForm = {
        name: '',
        type: 'Assault Scout',
        adf: 5,
        mr: 4,
        dcr: 70,
        max_hull_points: 50,
        current_hull_points: 50,
      };
      this.showCreateModal = true;
    },
    async createShip() {
      if (!this.newShipForm.name.trim()) return;
      this.creating = true;
      try {
        const payload = {
          ...this.newShipForm,
          current_hull_points: this.newShipForm.max_hull_points,
          defenses: { reflect: false, masking: false, icm_count: 4 },
          weapons: [
            { name: 'Laser Battery', damage: '1d10', status: 'Online' },
          ],
        };
        const res = await fetch('/api/ships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          this.showCreateModal = false;
          if (!this.ships.some((s) => s.id === created.id)) {
            this.ships.push(created);
          }
          this.selectShip(created);
        }
      } catch (err) {
        console.error('Error creating ship:', err);
      } finally {
        this.creating = false;
      }
    },
    async updateShip() {
      if (!this.selectedShip || !this.selectedShip.id) return;
      try {
        const res = await fetch(`/api/ships/${this.selectedShip.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.selectedShip),
        });
        if (res.ok) {
          const updated = await res.json();
          const idx = this.ships.findIndex((s) => s.id === updated.id);
          if (idx !== -1) {
            this.ships[idx] = { ...updated };
          }
        }
      } catch (err) {
        console.error('Error updating ship:', err);
      }
    },
    adjustHullPoints(amount) {
      if (!this.selectedShip) return;
      let newHp = (this.selectedShip.current_hull_points || 0) + amount;
      newHp = Math.max(0, Math.min(this.selectedShip.max_hull_points || 100, newHp));
      this.selectedShip.current_hull_points = newHp;
      this.updateShip();
    },
    async deleteShip(id) {
      if (!confirm('Are you sure you want to delete this ship?')) return;
      try {
        const res = await fetch(`/api/ships/${id}`, { method: 'DELETE' });
        if (res.ok) {
          this.ships = this.ships.filter((s) => s.id !== id);
          if (this.selectedShip && this.selectedShip.id === id) {
            this.selectedShip = this.ships.length > 0 ? { ...this.ships[0] } : null;
          }
        }
      } catch (err) {
        console.error('Error deleting ship:', err);
      }
    },
    toggleDefense(type) {
      if (!this.selectedShip.defenses) {
        this.selectedShip.defenses = { reflect: false, masking: false, icm_count: 0 };
      }
      this.selectedShip.defenses[type] = !this.selectedShip.defenses[type];
      this.updateShip();
    },
    addWeapon() {
      if (!this.selectedShip.weapons) this.selectedShip.weapons = [];
      this.selectedShip.weapons.push({ name: 'New Weapon', damage: '1d10', status: 'Online' });
      this.updateShip();
    },
    removeWeapon(index) {
      this.selectedShip.weapons.splice(index, 1);
      this.updateShip();
    },
    toggleWeaponStatus(index) {
      const current = this.selectedShip.weapons[index].status || 'Online';
      this.selectedShip.weapons[index].status = current === 'Online' ? 'Disabled' : 'Online';
      this.updateShip();
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
      if (payload && payload.type === 'ship' && payload.sheet) {
        const sheet = payload.sheet;
        const idx = this.ships.findIndex((s) => s.id === sheet.id);
        if (idx === -1) {
          this.ships.push(sheet);
        } else {
          this.ships[idx] = sheet;
        }
      }
    },
    handleSheetUpdated(payload) {
      if (payload && payload.type === 'ship' && payload.sheet) {
        const sheet = payload.sheet;
        const idx = this.ships.findIndex((s) => s.id === sheet.id);
        if (idx !== -1) {
          this.ships[idx] = sheet;
          if (this.selectedShip && this.selectedShip.id === sheet.id) {
            this.selectedShip = { ...sheet };
          }
        }
      }
    },
    handleSheetDeleted(payload) {
      if (payload && payload.type === 'ship') {
        const id = payload.id;
        this.ships = this.ships.filter((s) => s.id !== id);
        if (this.selectedShip && this.selectedShip.id === id) {
          this.selectedShip = this.ships.length > 0 ? { ...this.ships[0] } : null;
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

.ship-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.ship-list li {
  padding: 12px 16px;
  border-bottom: 1px solid #21262d;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.ship-list li:hover {
  background: #21262d;
}

.ship-list li.active {
  background: #1f6feb22;
  border-left: 4px solid #58a6ff;
}

.ship-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.ship-name {
  font-weight: 600;
  color: #f0f6fc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ship-sub {
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

.type-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.input-type {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #58a6ff;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 1rem;
}

/* Hull Section */
.hull-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.hull-header h4 {
  margin: 0;
  color: #58a6ff;
}

.hull-values {
  font-size: 1.1rem;
  font-weight: 700;
}

.input-max-hp {
  width: 65px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #f0f6fc;
  text-align: center;
  padding: 2px 4px;
  border-radius: 4px;
}

.hull-bar-bg {
  height: 14px;
  background: #21262d;
  border-radius: 7px;
  overflow: hidden;
  margin-bottom: 12px;
}

.hull-bar-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.hull-controls {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-hp {
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
  grid-template-columns: repeat(3, 1fr);
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

/* Defenses & Armament Grid */
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

.defenses-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.defense-toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0d1117;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #30363d;
}

.defense-label {
  font-weight: 600;
}

.toggle-btn {
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.8rem;
  border: none;
  cursor: pointer;
}
.toggle-btn.active {
  background: #238636;
  color: #ffffff;
}
.toggle-btn.offline {
  background: #21262d;
  color: #8b949e;
}

.icm-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #8b949e;
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

.item-dmg-input {
  width: 75px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #f0f6fc;
  padding: 6px 8px;
  border-radius: 4px;
  text-align: center;
}

.status-btn {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
}
.status-btn.online {
  background: #23863622;
  color: #3fb950;
  border: 1px solid #3fb95044;
}
.status-btn.damaged {
  background: #da363322;
  color: #f85149;
  border: 1px solid #f8514944;
}

.item-level-input {
  width: 50px;
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

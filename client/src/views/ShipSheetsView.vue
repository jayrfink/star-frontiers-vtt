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
              <label>Class Preset:</label>
              <select
                :value="selectedShip.type"
                @change="onEditPresetChange($event.target.value)"
                class="input-type-select"
              >
                <option v-for="preset in presets" :key="preset.type" :value="preset.type">
                  {{ preset.type }}
                </option>
              </select>
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
                <span class="defense-label">Reflective Hull</span>
                <button
                  :class="['toggle-btn', getDefenseVal('reflective_hull') ? 'active' : 'offline']"
                  @click="toggleDefenseBool('reflective_hull')"
                >
                  {{ getDefenseVal('reflective_hull') ? 'ONLINE' : 'OFFLINE' }}
                </button>
              </div>
              <div class="defense-toggle-row">
                <span class="defense-label">Stasis Screen</span>
                <button
                  :class="['toggle-btn', getDefenseVal('stasis_screen') ? 'active' : 'offline']"
                  @click="toggleDefenseBool('stasis_screen')"
                >
                  {{ getDefenseVal('stasis_screen') ? 'ONLINE' : 'OFFLINE' }}
                </button>
              </div>
              <div class="defense-toggle-row">
                <span class="defense-label">Stealth Screen</span>
                <button
                  :class="['toggle-btn', getDefenseVal('stealth_screen') ? 'active' : 'offline']"
                  @click="toggleDefenseBool('stealth_screen')"
                >
                  {{ getDefenseVal('stealth_screen') ? 'ONLINE' : 'OFFLINE' }}
                </button>
              </div>
              
              <!-- Masking Screens -->
              <div class="defense-counter-box">
                <div class="defense-counter-header">
                  <span class="defense-label">Masking Screens</span>
                  <button
                    class="btn-action"
                    :disabled="getDefenseVal('masking_screens_current') <= 0"
                    @click="deployMaskingScreen"
                  >
                    Deploy Screen
                  </button>
                </div>
                <div class="counter-inputs">
                  <label>Current:</label>
                  <input
                    type="number"
                    v-model.number="selectedShip.defenses.masking_screens_current"
                    @change="updateShip"
                    min="0"
                    class="item-level-input"
                  />
                  <label>Max:</label>
                  <input
                    type="number"
                    v-model.number="selectedShip.defenses.masking_screens_max"
                    @change="updateShip"
                    min="0"
                    class="item-level-input"
                  />
                </div>
              </div>

              <!-- ICMs (Interceptors) -->
              <div class="defense-counter-box">
                <div class="defense-counter-header">
                  <span class="defense-label">ICMs (Interceptors)</span>
                  <button
                    class="btn-action"
                    :disabled="getDefenseVal('icm_current') <= 0"
                    @click="launchICM"
                  >
                    Launch ICM
                  </button>
                </div>
                <div class="counter-inputs">
                  <label>Current:</label>
                  <input
                    type="number"
                    v-model.number="selectedShip.defenses.icm_current"
                    @change="updateShip"
                    min="0"
                    class="item-level-input"
                  />
                  <label>Max:</label>
                  <input
                    type="number"
                    v-model.number="selectedShip.defenses.icm_max"
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
            <div v-else class="weapons-wrapper">
              <div v-for="(wpn, index) in selectedShip.weapons" :key="wpn.id || index" class="weapon-card">
                <div class="weapon-main-row">
                  <input
                    type="text"
                    v-model="wpn.type"
                    @change="updateShip"
                    placeholder="e.g. Laser Battery"
                    class="item-name-input"
                  />
                  <select
                    v-model="wpn.status"
                    @change="updateShip"
                    :class="['status-select', (wpn.status || 'Online').toLowerCase()]"
                  >
                    <option value="Online">Online</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Offline">Offline</option>
                  </select>
                  <button class="btn-remove" title="Remove Weapon" @click="removeWeapon(index)">✕</button>
                </div>
                
                <div class="weapon-details-row">
                  <div class="detail-field">
                    <label>Dmg:</label>
                    <input
                      type="text"
                      v-model="wpn.damage"
                      @change="updateShip"
                      placeholder="1d10"
                      class="item-dmg-input"
                    />
                  </div>
                  <div class="detail-field">
                    <label>Rng:</label>
                    <input
                      type="number"
                      v-model.number="wpn.range"
                      @change="updateShip"
                      class="item-num-input"
                      min="0"
                    />
                  </div>
                  <div class="detail-field ammo-field" v-if="wpn.ammo_max > 0 || wpn.ammo_current > 0">
                    <label>Ammo:</label>
                    <input
                      type="number"
                      v-model.number="wpn.ammo_current"
                      @change="updateShip"
                      class="item-num-input"
                      min="0"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      v-model.number="wpn.ammo_max"
                      @change="updateShip"
                      class="item-num-input"
                      min="0"
                    />
                  </div>
                  <div class="detail-field fire-field">
                    <button
                      class="btn-fire"
                      :disabled="wpn.status !== 'Online' || (wpn.ammo_max > 0 && wpn.ammo_current <= 0)"
                      @click="fireWeapon(index)"
                    >
                      Fire
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
            <label>Ship Class Preset</label>
            <select v-model="selectedPresetType" @change="applyPresetToCreateForm" class="preset-select">
              <option v-for="preset in presets" :key="preset.type" :value="preset.type">
                {{ preset.type }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Ship Name</label>
            <input type="text" v-model="newShipForm.name" required placeholder="e.g. UPF Gullwind" />
          </div>
          <div class="form-group">
            <label>Type / Class Label</label>
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
import { SHIP_PRESETS } from '../constants/shipPresets.js';

export default {
  name: 'ShipSheetsView',
  data() {
    return {
      presets: SHIP_PRESETS,
      selectedPresetType: 'Assault Scout',
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
        dcr: 35,
        max_hull_points: 15,
        current_hull_points: 15,
        weapons: [],
        defenses: {},
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
    normalizeDefenses(defenses) {
      const def = defenses || {};
      return {
        reflective_hull: def.reflective_hull !== undefined ? def.reflective_hull : (def.reflect || false),
        stasis_screen: def.stasis_screen || false,
        stealth_screen: def.stealth_screen || false,
        masking_screens_max: def.masking_screens_max !== undefined ? def.masking_screens_max : (def.masking ? 1 : 0),
        masking_screens_current: def.masking_screens_current !== undefined ? def.masking_screens_current : (def.masking ? 1 : 0),
        icm_max: def.icm_max !== undefined ? def.icm_max : (def.icm_count || 0),
        icm_current: def.icm_current !== undefined ? def.icm_current : (def.icm_count || 0),
      };
    },
    normalizeWeapons(weapons) {
      if (!Array.isArray(weapons)) return [];
      return weapons.map((w, idx) => ({
        id: w.id || `w_${Date.now()}_${idx}`,
        type: w.type || w.name || 'Laser Battery',
        damage: w.damage || '1d10',
        range: w.range !== undefined ? w.range : 9,
        ammo_max: w.ammo_max !== undefined ? w.ammo_max : 0,
        ammo_current: w.ammo_current !== undefined ? w.ammo_current : 0,
        status: w.status || 'Online',
      }));
    },
    async fetchShips() {
      this.loading = true;
      try {
        const res = await fetch('/api/ships', { credentials: 'include' });
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
      copy.type = copy.type || copy.ship_type || 'Fighter';
      copy.max_hull_points = copy.max_hull_points !== undefined ? copy.max_hull_points : (copy.hull_points || 50);
      copy.current_hull_points = copy.current_hull_points !== undefined ? copy.current_hull_points : (copy.current_hp !== undefined ? copy.current_hp : copy.max_hull_points);
      copy.defenses = this.normalizeDefenses(copy.defenses);
      copy.weapons = this.normalizeWeapons(copy.weapons);
      this.selectedShip = copy;
    },
    applyPresetToCreateForm() {
      const preset = this.presets.find((p) => p.type === this.selectedPresetType) || this.presets[0];
      this.newShipForm.type = preset.type;
      this.newShipForm.adf = preset.adf;
      this.newShipForm.mr = preset.mr;
      this.newShipForm.dcr = preset.dcr;
      this.newShipForm.max_hull_points = preset.hull_points;
      this.newShipForm.current_hull_points = preset.hull_points;
      this.newShipForm.weapons = JSON.parse(JSON.stringify(preset.weapons));
      this.newShipForm.defenses = JSON.parse(JSON.stringify(preset.defenses));
    },
    openCreateModal() {
      this.selectedPresetType = 'Assault Scout';
      this.applyPresetToCreateForm();
      this.newShipForm.name = '';
      this.showCreateModal = true;
    },
    onEditPresetChange(newType) {
      const preset = this.presets.find((p) => p.type === newType);
      this.selectedShip.type = newType;
      if (preset && confirm(`Load stats, weapons, and defenses for ${newType}?`)) {
        this.selectedShip.adf = preset.adf;
        this.selectedShip.mr = preset.mr;
        this.selectedShip.dcr = preset.dcr;
        this.selectedShip.max_hull_points = preset.hull_points;
        this.selectedShip.current_hull_points = preset.hull_points;
        this.selectedShip.weapons = JSON.parse(JSON.stringify(preset.weapons));
        this.selectedShip.defenses = JSON.parse(JSON.stringify(preset.defenses));
      }
      this.updateShip();
    },
    async createShip() {
      if (!this.newShipForm.name || !this.newShipForm.name.trim()) return;
      this.creating = true;
      try {
        const payload = {
          name: this.newShipForm.name.trim(),
          ship_type: this.newShipForm.type || 'Fighter',
          adf: this.newShipForm.adf || 2,
          mr: this.newShipForm.mr || 2,
          dcr: this.newShipForm.dcr || 50,
          hull_points: this.newShipForm.max_hull_points || 50,
          current_hp: this.newShipForm.max_hull_points || 50,
          defenses: this.normalizeDefenses(this.newShipForm.defenses),
          weapons: this.normalizeWeapons(this.newShipForm.weapons),
        };
        const res = await fetch('/api/ships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          this.showCreateModal = false;
          if (!this.ships.some((s) => s.id === created.id)) {
            this.ships.push(created);
          }
          this.selectShip(created);
        } else {
          const errData = await res.json();
          console.error('Error creating ship response:', res.status, errData);
          alert(errData.error || 'Failed to create ship');
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
        const payload = {
          ...this.selectedShip,
          ship_type: this.selectedShip.type || this.selectedShip.ship_type || 'Fighter',
          hull_points: this.selectedShip.max_hull_points || this.selectedShip.hull_points || 50,
          current_hp: this.selectedShip.current_hull_points !== undefined ? this.selectedShip.current_hull_points : (this.selectedShip.current_hp || 50),
        };
        const res = await fetch(`/api/ships/${this.selectedShip.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
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
        const res = await fetch(`/api/ships/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
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
    getDefenseVal(key) {
      if (!this.selectedShip || !this.selectedShip.defenses) return false;
      return this.selectedShip.defenses[key];
    },
    toggleDefenseBool(key) {
      if (!this.selectedShip.defenses) {
        this.selectedShip.defenses = this.normalizeDefenses({});
      }
      this.selectedShip.defenses[key] = !this.selectedShip.defenses[key];
      this.updateShip();
    },
    deployMaskingScreen() {
      if (!this.selectedShip.defenses) return;
      if (this.selectedShip.defenses.masking_screens_current > 0) {
        this.selectedShip.defenses.masking_screens_current -= 1;
        this.updateShip();
      }
    },
    launchICM() {
      if (!this.selectedShip.defenses) return;
      if (this.selectedShip.defenses.icm_current > 0) {
        this.selectedShip.defenses.icm_current -= 1;
        this.updateShip();
      }
    },
    addWeapon() {
      if (!this.selectedShip.weapons) this.selectedShip.weapons = [];
      this.selectedShip.weapons.push({
        id: `w_${Date.now()}`,
        type: 'New Weapon',
        damage: '1d10',
        range: 9,
        ammo_max: 0,
        ammo_current: 0,
        status: 'Online',
      });
      this.updateShip();
    },
    removeWeapon(index) {
      this.selectedShip.weapons.splice(index, 1);
      this.updateShip();
    },
    fireWeapon(index) {
      const wpn = this.selectedShip.weapons[index];
      if (!wpn || wpn.status !== 'Online') return;
      if (wpn.ammo_max > 0) {
        if (wpn.ammo_current > 0) {
          wpn.ammo_current -= 1;
          this.updateShip();
        }
      } else {
        this.updateShip();
      }
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
        }
        if (this.selectedShip && this.selectedShip.id === sheet.id) {
          this.selectShip(sheet);
        }
      }
    },
    handleSheetDeleted(payload) {
      if (payload && payload.type === 'ship') {
        const id = payload.id;
        this.ships = this.ships.filter((s) => s.id !== id);
        if (this.selectedShip && this.selectedShip.id === id) {
          this.selectShip(this.ships.length > 0 ? this.ships[0] : null);
        }
      }
    },
  },
};
</script>

<style scoped>
.sheets-layout {
  display: flex;
  height: 100%;
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
  max-width: 950px;
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

.input-type-select {
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
  gap: 10px;
}

.defense-toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0d1117;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #30363d;
}

.defense-label {
  font-weight: 600;
  font-size: 0.9rem;
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

.defense-counter-box {
  background: #0d1117;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #30363d;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.defense-counter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.counter-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #8b949e;
}

.btn-action {
  background: #1f6feb;
  color: #ffffff;
  border: none;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-action:disabled {
  background: #21262d;
  color: #8b949e;
  cursor: not-allowed;
}

.empty-list {
  color: #8b949e;
  font-size: 0.85rem;
  font-style: italic;
  padding: 8px 0;
}

.weapons-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.weapon-card {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.weapon-main-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weapon-details-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: #8b949e;
}

.detail-field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ammo-field {
  margin-left: auto;
}

.item-name-input {
  flex: 1;
  background: #161b22;
  border: 1px solid #30363d;
  color: #f0f6fc;
  padding: 4px 8px;
  border-radius: 4px;
}

.item-dmg-input {
  width: 65px;
  background: #161b22;
  border: 1px solid #30363d;
  color: #f0f6fc;
  padding: 4px 6px;
  border-radius: 4px;
  text-align: center;
}

.item-num-input {
  width: 40px;
  background: #161b22;
  border: 1px solid #30363d;
  color: #f0f6fc;
  padding: 4px 4px;
  border-radius: 4px;
  text-align: center;
}

.status-select {
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid #30363d;
  background: #161b22;
  color: #f0f6fc;
}
.status-select.online {
  color: #3fb950;
  border-color: #3fb95044;
}
.status-select.damaged {
  color: #d29922;
  border-color: #d2992244;
}
.status-select.offline {
  color: #f85149;
  border-color: #f8514944;
}

.btn-fire {
  background: #da3633;
  color: #ffffff;
  border: none;
  padding: 3px 10px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn-fire:disabled {
  background: #21262d;
  color: #8b949e;
  cursor: not-allowed;
}

.item-level-input {
  width: 45px;
  background: #161b22;
  border: 1px solid #30363d;
  color: #f0f6fc;
  text-align: center;
  padding: 3px 4px;
  border-radius: 4px;
}

.btn-remove {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 2px 6px;
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
.form-group select,
.preset-select {
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

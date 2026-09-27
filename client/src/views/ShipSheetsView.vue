<template>
  <div class="sheets-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h3>Ship Sheets</h3>
        <button class="btn-primary btn-new-ship" @click="openCreateModal">+ New Ship</button>
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
            <span class="ship-sub">{{ ship.ship_type || ship.type || 'Fighter' }} • HP {{ ship.current_hp ?? ship.current_hull_points ?? 0 }}/{{ ship.hull_points ?? ship.max_hull_points ?? 0 }}</span>
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
          <div class="portrait-box" @click="$refs.avatarInput.click()" title="Click to upload ship token image">
            <img v-if="selectedShip.avatar_url" :src="selectedShip.avatar_url" class="portrait-img" alt="Ship Token Image" />
            <div v-else class="portrait-placeholder">Click to add<br/>Token Image</div>
            <input type="file" ref="avatarInput" style="display:none" accept="image/*" @change="uploadAvatar" />
          </div>
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
                :value="selectedShip.ship_type || selectedShip.type"
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
                  <span class="weapon-title-name">{{ wpn.type || wpn.name || 'Laser Battery' }}</span>
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
            <label>Token Image / Avatar (Optional)</label>
            <div class="modal-avatar-row">
              <div v-if="newShipForm.avatar_url" class="modal-avatar-preview">
                <img :src="newShipForm.avatar_url" alt="Ship Token Preview" />
                <button type="button" class="btn-remove-avatar" title="Remove image" @click="newShipForm.avatar_url = ''">✕</button>
              </div>
              <input type="file" ref="createAvatarInput" accept="image/*" @change="uploadCreateAvatar" class="avatar-file-input" />
            </div>
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
            <button type="button" class="btn-modal-cancel" @click="showCreateModal = false">Cancel</button>
            <button type="submit" class="btn-modal-create" :disabled="creating">Create Ship</button>
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
        avatar_url: '',
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
      return weapons.map((w, idx) => {
        const weaponName = (w.type && w.type.trim()) || (w.name && w.name.trim()) || 'Laser Battery';
        return {
          ...w,
          id: w.id || `w_${Date.now()}_${idx}`,
          name: weaponName,
          type: weaponName,
          damage: w.damage || '1d10',
          range: w.range !== undefined ? w.range : 9,
          ammo_max: w.ammo_max !== undefined ? w.ammo_max : 0,
          ammo_current: w.ammo_current !== undefined ? w.ammo_current : 0,
          status: w.status || 'Online',
        };
      });
    },
    normalizeShip(ship) {
      if (!ship) return null;
      const copy = JSON.parse(JSON.stringify(ship));
      copy.avatar_url = copy.avatar_url || '';
      copy.ship_type = copy.ship_type || copy.type || 'Fighter';
      copy.type = copy.ship_type;
      copy.hull_points = copy.hull_points !== undefined ? copy.hull_points : (copy.max_hull_points || 50);
      copy.max_hull_points = copy.hull_points;
      copy.current_hp = copy.current_hp !== undefined ? copy.current_hp : (copy.current_hull_points !== undefined ? copy.current_hull_points : copy.hull_points);
      copy.current_hull_points = copy.current_hp;
      copy.defenses = this.normalizeDefenses(copy.defenses);
      copy.weapons = this.normalizeWeapons(copy.weapons);
      return copy;
    },
    async fetchShips() {
      this.loading = true;
      try {
        const res = await fetch('/api/ships', { credentials: 'include' });
        if (res.ok) {
          const raw = await res.json();
          this.ships = (raw || []).map((s) => this.normalizeShip(s));
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
      if (!ship) {
        this.selectedShip = null;
        return;
      }
      this.selectedShip = this.normalizeShip(ship);
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
      this.newShipForm.avatar_url = '';
      if (this.$refs.createAvatarInput) {
        this.$refs.createAvatarInput.value = '';
      }
      this.showCreateModal = true;
    },
    onEditPresetChange(newType) {
      const preset = this.presets.find((p) => p.type === newType);
      this.selectedShip.type = newType;
      this.selectedShip.ship_type = newType;
      if (preset && confirm(`Load stats, weapons, and defenses for ${newType}?`)) {
        this.selectedShip.adf = preset.adf;
        this.selectedShip.mr = preset.mr;
        this.selectedShip.dcr = preset.dcr;
        this.selectedShip.max_hull_points = preset.hull_points;
        this.selectedShip.hull_points = preset.hull_points;
        this.selectedShip.current_hull_points = preset.hull_points;
        this.selectedShip.current_hp = preset.hull_points;
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
          avatar_url: this.newShipForm.avatar_url || '',
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
          const raw = await res.json();
          const created = this.normalizeShip(raw);
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
          avatar_url: this.selectedShip.avatar_url || '',
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
          const raw = await res.json();
          const updated = this.normalizeShip(raw);
          const idx = this.ships.findIndex((s) => s.id === updated.id);
          if (idx !== -1) {
            this.ships[idx] = updated;
          }
        }
      } catch (err) {
        console.error('Error updating ship:', err);
      }
    },
    async uploadAvatar(e) {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          this.selectedShip.avatar_url = data.url;
          this.updateShip();
        } else {
          console.error('Upload failed');
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    },
    async uploadCreateAvatar(e) {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          this.newShipForm.avatar_url = data.url;
        } else {
          console.error('Upload failed');
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    },
    adjustHullPoints(amount) {
      if (!this.selectedShip) return;
      let newHp = (this.selectedShip.current_hull_points || this.selectedShip.current_hp || 0) + amount;
      const maxHp = this.selectedShip.max_hull_points || this.selectedShip.hull_points || 100;
      newHp = Math.max(0, Math.min(maxHp, newHp));
      this.selectedShip.current_hull_points = newHp;
      this.selectedShip.current_hp = newHp;
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
        name: 'New Weapon',
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
        const sheet = this.normalizeShip(payload.sheet);
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
        const sheet = this.normalizeShip(payload.sheet);
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
  color: #3a859c;
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
  border-left: 4px solid transparent;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s, border-color 0.2s;
}

.ship-list li:hover {
  background: #21262d;
}

.ship-list li.active {
  background: #05282e;
  border-left: 4px solid aquamarine;
}

.ship-list li.active:hover {
  background: #083841;
}

.ship-list li.active .ship-name {
  color: #a8ffea;
}

.ship-list li.active .ship-sub {
  color: #80cbc4;
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
.sheet-header {
  display: flex;
  gap: 16px;
  align-items: center;
}

.portrait-box {
  width: 96px;
  height: 96px;
  border: 1px dashed var(--border, #30363d);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-tertiary, #0d1117);
  flex-shrink: 0;
  transition: border-color 0.2s;
}

.portrait-box:hover {
  border-color: var(--accent, #3a859c);
}

.portrait-placeholder {
  font-size: 11px;
  color: var(--text-secondary, #8b949e);
  text-align: center;
  line-height: 1.3;
}

.portrait-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-main {
  flex: 1;
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

.input-type-select,
.input-type-select option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
}

.input-type-select {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 1rem;
}

.input-type-select:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
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
  color: #3a859c;
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
  color: #3a859c;
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
  color: #3a859c;
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
  color: #3a859c;
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
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.toggle-btn.active {
  background: #0d2818;
  border-color: #4ade80;
  color: #39d353;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.25);
}
.toggle-btn.active:hover {
  background: #143d24;
  border-color: #56d364;
  color: #56d364;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.45);
}
.toggle-btn.offline {
  background: #21262d;
  border-color: #30363d;
  color: #8b949e;
}
.toggle-btn.offline:hover {
  background: #282e37;
  color: #c9d1d9;
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
  background: #0d2818;
  color: #39d353;
  border: 1px solid #4ade80;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.25);
  transition: all 0.15s ease-in-out;
}
.btn-action:hover:not(:disabled) {
  background: #143d24;
  border-color: #56d364;
  color: #56d364;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.45);
}
.btn-action:disabled {
  background: #161b22;
  border-color: #30363d;
  color: #8b949e;
  cursor: not-allowed;
  box-shadow: none;
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
  background: #000000;
  border: 1px solid rgba(0, 128, 128, 0.6);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.weapon-main-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weapon-title-name {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 600;
  color: #00ffff !important;
  -webkit-text-fill-color: #00ffff !important;
  letter-spacing: 0.3px;
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

.item-dmg-input {
  width: 65px;
  background-color: #000000 !important;
  border: 1px solid rgba(0, 128, 128, 0.6) !important;
  color: #00ffff !important;
  -webkit-text-fill-color: #00ffff !important;
  padding: 4px 6px;
  border-radius: 4px;
  text-align: center;
}
.item-dmg-input:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.item-num-input {
  width: 40px;
  background-color: #000000 !important;
  border: 1px solid rgba(0, 128, 128, 0.6) !important;
  color: #00ffff !important;
  -webkit-text-fill-color: #00ffff !important;
  padding: 4px 4px;
  border-radius: 4px;
  text-align: center;
}
.item-num-input:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.status-select,
.status-select option {
  background-color: #000000 !important;
}

.status-select {
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(0, 128, 128, 0.6) !important;
  background-color: #000000 !important;
  color: #00ffff;
  cursor: pointer;
}
.status-select:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}
.status-select.online {
  color: #3fb950 !important;
  -webkit-text-fill-color: #3fb950;
  border-color: #3fb95088 !important;
}
.status-select.damaged {
  color: #d29922 !important;
  -webkit-text-fill-color: #d29922;
  border-color: #d2992288 !important;
}
.status-select.offline {
  color: #f85149 !important;
  -webkit-text-fill-color: #f85149;
  border-color: #f8514988 !important;
}

.btn-fire {
  background: #340c0e;
  color: #f85149;
  border: 1px solid #da3633;
  padding: 3px 10px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(218, 54, 51, 0.25);
  transition: all 0.15s ease-in-out;
}
.btn-fire:hover:not(:disabled) {
  background: #4a1316;
  border-color: #ff6b6b;
  color: #ff8585;
  box-shadow: 0 0 10px rgba(248, 81, 73, 0.45);
}
.btn-fire:disabled {
  background: #161b22;
  border: 1px solid #30363d;
  color: #8b949e;
  cursor: not-allowed;
  box-shadow: none;
}

.item-level-input {
  width: 45px;
  background-color: #000000 !important;
  border: 1px solid rgba(0, 128, 128, 0.6) !important;
  color: #00ffff !important;
  -webkit-text-fill-color: #00ffff !important;
  text-align: center;
  padding: 3px 4px;
  border-radius: 4px;
}
.item-level-input:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.btn-remove {
  background-color: #000000 !important;
  border: 1px solid rgba(0, 128, 128, 0.6) !important;
  color: #8b949e !important;
  cursor: pointer;
  padding: 2px 7px;
  border-radius: 4px;
  font-weight: 600;
  transition: all 0.15s ease-in-out;
}
.btn-remove:hover {
  background-color: #340c0e !important;
  border-color: #da3633 !important;
  color: #f85149 !important;
  -webkit-text-fill-color: #f85149;
  box-shadow: 0 0 6px rgba(218, 54, 51, 0.4);
}

/* Buttons & Controls */
.btn-primary {
  background: #082d33;
  color: #2dd4bf;
  border: 1px solid #14b8a6;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(20, 184, 166, 0.35);
  letter-spacing: 0.3px;
  transition: all 0.15s ease-in-out;
}
.btn-primary:hover {
  background: #0c3e47;
  border-color: #2dd4bf;
  color: #5eead4;
  box-shadow: 0 0 16px rgba(45, 212, 191, 0.6);
}
.btn-primary:active {
  transform: translateY(1px);
}

.btn-new-ship {
  background-color: #021a1e !important;
  background: #021a1e !important;
  border: 1px solid aquamarine !important;
  color: aquamarine !important;
  -webkit-text-fill-color: aquamarine;
  padding: 6px 14px;
  border-radius: 4px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(127, 255, 212, 0.25);
  letter-spacing: 0.3px;
  transition: all 0.15s ease-in-out;
}
.btn-new-ship:hover {
  background-color: #04272d !important;
  background: #04272d !important;
  border-color: #a8ffea !important;
  color: #a8ffea !important;
  -webkit-text-fill-color: #a8ffea;
  box-shadow: 0 0 16px rgba(127, 255, 212, 0.5);
}
.btn-new-ship:active {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(127, 255, 212, 0.4);
}
.btn-primary:disabled {
  background: #161b22;
  border-color: #30363d;
  color: #8b949e;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-secondary {
  background-color: #000000 !important;
  background: #000000 !important;
  color: teal !important;
  -webkit-text-fill-color: teal;
  border: 1px solid teal !important;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.btn-secondary:hover {
  background-color: #051414 !important;
  border-color: #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
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
  color: #3a859c;
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
  background: #000000;
  border: 1px solid rgba(0, 128, 128, 0.6);
  color: #00ffff;
  padding: 8px;
  border-radius: 4px;
}

.preset-select,
.preset-select option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
}

.preset-select {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: var(--radius, 4px);
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
}

.preset-select:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.modal-card input[type="text"],
.modal-card input[type="number"] {
  background-color: #000000 !important;
  border: 1px solid rgba(0, 128, 128, 0.6) !important;
  color: #00ffff !important;
  -webkit-text-fill-color: #00ffff;
}

.modal-card input[type="text"]:focus,
.modal-card input[type="number"]:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-modal-cancel {
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid teal !important;
  color: teal !important;
  -webkit-text-fill-color: teal;
  padding: 6px 14px;
  border-radius: var(--radius, 4px);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-modal-cancel:hover {
  background-color: #051414 !important;
  border-color: #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
}

.btn-modal-create {
  background-color: #021a1e !important;
  background: #021a1e !important;
  border: 1px solid aquamarine !important;
  color: aquamarine !important;
  -webkit-text-fill-color: aquamarine;
  padding: 6px 16px;
  border-radius: var(--radius, 4px);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(127, 255, 212, 0.25);
  letter-spacing: 0.3px;
  transition: all 0.15s ease-in-out;
}

.btn-modal-create:hover:not(:disabled) {
  background-color: #04272d !important;
  border-color: #a8ffea !important;
  color: #a8ffea !important;
  -webkit-text-fill-color: #a8ffea;
  box-shadow: 0 0 16px rgba(127, 255, 212, 0.5);
}

.btn-modal-create:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(127, 255, 212, 0.4);
}

.btn-modal-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.modal-avatar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-avatar-preview {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #30363d;
  flex-shrink: 0;
}

.modal-avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-remove-avatar {
  position: absolute;
  top: 2px;
  right: 2px;
  background: #000000;
  border: 1px solid teal;
  color: aqua;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: all 0.15s ease-in-out;
}

.btn-remove-avatar:hover {
  border-color: aqua;
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.5);
}

.avatar-file-input {
  font-size: 0.85rem;
  color: #8b949e;
}

.avatar-file-input::file-selector-button,
.avatar-file-input::-webkit-file-upload-button {
  background-color: #000000 !important;
  border: 1px solid teal !important;
  color: teal !important;
  -webkit-text-fill-color: teal;
  border-radius: var(--radius, 4px);
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  margin-right: 10px;
  transition: all 0.15s ease-in-out;
}

.avatar-file-input::file-selector-button:hover,
.avatar-file-input::-webkit-file-upload-button:hover {
  background-color: #051414 !important;
  border-color: #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
}
</style>

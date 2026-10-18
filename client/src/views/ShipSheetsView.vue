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
      <ul v-else ref="sidebarList" class="ship-list sheet-list" @scroll="onScrollSave">
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
    <main ref="mainScroll" class="sheet-main sheet-detail" @scroll="onScrollSave">
      <div v-if="!selectedShip" class="no-selection">
        <div class="stub-icon">🛸</div>
        <h2>Select or Create a Knight Hawks Ship</h2>
        <p>Choose a ship sheet from the sidebar or register a new starship.</p>
      </div>

      <div v-else class="sheet-container">
        <header class="sheet-header card">
          <div class="portrait-box" @click="openImageBrowser('sheet')" title="Click to select ship token image">
            <img v-if="selectedShip.avatar_url" :src="selectedShip.avatar_url" class="portrait-img" alt="Ship Token Image" />
            <div v-else class="portrait-placeholder">Click to select<br/>Token Image</div>
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
              <button class="btn-secondary" @click="openAddWeaponModal">+ Add Weapon</button>
            </div>
            <div v-if="!selectedShip.weapons || selectedShip.weapons.length === 0" class="empty-list">
              No weapon systems equipped.
            </div>
            <div v-else class="weapons-wrapper">
              <div v-for="(wpn, index) in selectedShip.weapons" :key="wpn.id || index" class="weapon-card">
                <div class="weapon-main-row">
                  <div class="weapon-title-container">
                    <template v-if="editingWeaponIndex === index">
                      <input
                        type="text"
                        v-model="wpn.name"
                        @blur="stopEditWeapon(wpn)"
                        @keyup.enter="stopEditWeapon(wpn)"
                        @change="onWeaponNameChange(wpn)"
                        class="weapon-title-input"
                        :placeholder="wpn.type || 'Weapon Name'"
                        ref="weaponRenameInput"
                        title="Press Enter or click outside to save"
                      />
                    </template>
                    <template v-else>
                      <span
                        class="weapon-title-name"
                        @dblclick="startEditWeapon(index, wpn)"
                        :title="getWeaponTooltip(wpn)"
                      >
                        {{ wpn.name || wpn.type || 'Laser Battery' }}
                      </span>
                      <span
                        v-if="getWeaponCategory(wpn)"
                        :class="['weapon-category-tag', getWeaponCategory(wpn).toLowerCase()]"
                        :title="getCategoryExplanation(wpn)"
                      >
                        {{ getWeaponCategory(wpn) }}
                      </span>
                      <button
                        type="button"
                        class="btn-rename-weapon"
                        title="Rename weapon"
                        @click="startEditWeapon(index, wpn)"
                      >
                        ✏️
                      </button>
                    </template>
                  </div>
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
                    <span class="range-unit">hex</span>
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

        <!-- Notes Section -->
        <section class="card notes-section">
          <div class="section-header">
            <h4>Notes</h4>
          </div>
          <textarea
            v-model="selectedShip.notes"
            @change="updateShip"
            class="notes-textarea"
            rows="4"
            placeholder="Add notes..."
          ></textarea>
        </section>
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
              <div v-if="newShipForm.avatar_url" class="modal-avatar-preview" @click="openImageBrowser('create')" title="Click to change image">
                <img :src="newShipForm.avatar_url" alt="Ship Token Preview" />
                <button type="button" class="btn-remove-avatar" title="Remove image" @click.stop="newShipForm.avatar_url = ''">✕</button>
              </div>
              <button
                type="button"
                class="btn-browse-avatar"
                @click="openImageBrowser('create')"
              >
                Browse Images...
              </button>
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

    <!-- Image Browser Modal -->
    <ImageBrowserModal
      v-model="showImageBrowser"
      :title="imageBrowserTitle"
      :current-image="currentBrowserImage"
      @select="onImageSelected"
    />

    <!-- Equip Ship Weapon Modal -->
    <div v-if="showAddWeaponModal" class="modal-backdrop" @click.self="showAddWeaponModal = false">
      <div class="modal-card weapon-picker-modal">
        <div class="modal-header-row">
          <h3>🚀 Equip Ship Weapon</h3>
          <button type="button" class="btn-close-modal" @click="showAddWeaponModal = false">✕</button>
        </div>

        <!-- Category Filter Tabs -->
        <div class="weapon-filter-tabs">
          <button
            type="button"
            class="tab-btn"
            :class="{ active: weaponCategoryFilter === 'All' }"
            @click="weaponCategoryFilter = 'All'"
          >
            All ({{ weaponCatalog.length }})
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ active: weaponCategoryFilter === 'Beam' }"
            @click="weaponCategoryFilter = 'Beam'"
          >
            Beams (5)
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ active: weaponCategoryFilter === 'Ordnance' }"
            @click="weaponCategoryFilter = 'Ordnance'"
          >
            Ordnance & Rockets (5)
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ active: weaponCategoryFilter === 'Custom' }"
            @click="weaponCategoryFilter = 'Custom'"
          >
            Custom Weapon
          </button>
        </div>

        <!-- Weapon Catalog List -->
        <div v-if="weaponCategoryFilter !== 'Custom'" class="weapon-picker-list">
          <div
            v-for="weapon in weaponCatalog"
            :key="weapon.id"
            v-show="weaponCategoryFilter === 'All' || weapon.category === weaponCategoryFilter || (weaponCategoryFilter === 'Beam' && (weapon.category === 'Beam' || weapon.category === 'Energy'))"
            class="weapon-picker-item"
          >
            <div class="weapon-picker-info">
              <div class="weapon-picker-name-row">
                <span class="weapon-picker-name">{{ weapon.name }}</span>
                <span class="weapon-picker-category">{{ weapon.category }}</span>
              </div>
              <div class="weapon-picker-stats">
                <span class="stat-pill dmg">💥 {{ weapon.damage }}</span>
                <span class="stat-pill rng">🎯 {{ weapon.range }} hexes</span>
                <span class="stat-pill ammo">
                  {{ weapon.ammo_max > 0 ? `🔋 Ammo: ${weapon.ammo_max}` : '♾️ Unlimited' }}
                </span>
              </div>
              <p class="weapon-picker-desc">{{ weapon.description }}</p>
            </div>
            <button type="button" class="btn-equip-weapon" @click="equipWeapon(weapon)">
              Equip
            </button>
          </div>
        </div>

        <!-- Custom Weapon Form -->
        <div v-else class="custom-weapon-panel">
          <h4>Design Custom Ship Weapon</h4>
          <form @submit.prevent="equipCustomWeapon">
            <div class="form-group">
              <label>Weapon Name *</label>
              <input
                type="text"
                v-model="customWeaponForm.name"
                required
                placeholder="e.g. Heavy Plasma Cannon"
              />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Damage Dice</label>
                <input
                  type="text"
                  v-model="customWeaponForm.damage"
                  required
                  placeholder="e.g. 2d10"
                />
              </div>
              <div class="form-group">
                <label>Range (hexes)</label>
                <input
                  type="number"
                  v-model.number="customWeaponForm.range"
                  min="0"
                  placeholder="5"
                />
              </div>
              <div class="form-group">
                <label>Max Ammo (0 = Unlimited)</label>
                <input
                  type="number"
                  v-model.number="customWeaponForm.ammo_max"
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-modal-cancel" @click="showAddWeaponModal = false">Cancel</button>
              <button type="submit" class="btn-modal-create" :disabled="!customWeaponForm.name?.trim()">
                Equip Custom Weapon
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { socket } from '../services/socket.js';
import { SHIP_PRESETS } from '../constants/shipPresets.js';
import ImageBrowserModal from '../components/ImageBrowserModal.vue';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';
import { SHIP_WEAPONS_CATALOG, createWeaponInstance } from '../constants/shipWeapons.js';

export default {
  name: 'ShipSheetsView',
  components: {
    ImageBrowserModal,
  },
  data() {
    return {
      presets: SHIP_PRESETS,
      selectedPresetType: 'Assault Scout',
      ships: [],
      selectedShip: null,
      loading: true,
      creating: false,
      showCreateModal: false,
      showImageBrowser: false,
      imageBrowserTarget: 'sheet',
      showAddWeaponModal: false,
      editingWeaponIndex: null,
      weaponCatalog: SHIP_WEAPONS_CATALOG,
      weaponCategoryFilter: 'All',
      customWeaponForm: {
        name: '',
        damage: '1d10',
        range: 5,
        ammo_max: 0,
      },
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
    currentBrowserImage() {
      if (this.imageBrowserTarget === 'sheet') {
        return this.selectedShip ? (this.selectedShip.avatar_url || '') : '';
      }
      return this.newShipForm ? (this.newShipForm.avatar_url || '') : '';
    },
    imageBrowserTitle() {
      return this.imageBrowserTarget === 'sheet' ? 'Select Ship Token Image' : 'Select Ship Avatar';
    },
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
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeydown);
    }
  },
  beforeUnmount() {
    if (this._scrollSaveTimer) {
      clearTimeout(this._scrollSaveTimer);
      this._scrollSaveTimer = null;
    }
    this.saveScrollPositions();
    this.removeSocketListeners();
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeydown);
    }
  },
  methods: {
    handleKeydown(e) {
      if (e.key === 'Escape' && this.showAddWeaponModal) {
        this.showAddWeaponModal = false;
      }
    },
    getCurrentUserId() {
      return getSafeUserId();
    },
    onScrollSave() {
      if (this._scrollSaveTimer) {
        clearTimeout(this._scrollSaveTimer);
      }
      this._scrollSaveTimer = setTimeout(() => {
        this._scrollSaveTimer = null;
        this.saveScrollPositions();
      }, 150);
    },
    saveScrollPositions() {
      const sidebarEl = this.$refs?.sidebarList || this.$el?.querySelector?.('.sheet-list, .ship-list');
      const mainEl = this.$refs?.mainScroll || this.$el?.querySelector?.('.sheet-detail, .sheet-main');
      const updates = {};
      if (sidebarEl && typeof sidebarEl.scrollTop === 'number') {
        updates.sidebarScrollTop = sidebarEl.scrollTop;
      }
      if (mainEl && typeof mainEl.scrollTop === 'number') {
        updates.mainScrollTop = mainEl.scrollTop;
      }
      if (Object.keys(updates).length > 0) {
        const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
        saveUserState(uid, 'shipSheets', updates);
      }
    },
    restoreScrollPositions(saved) {
      const apply = () => {
        const sidebarEl = this.$refs?.sidebarList || this.$el?.querySelector?.('.sheet-list, .ship-list');
        const mainEl = this.$refs?.mainScroll || this.$el?.querySelector?.('.sheet-detail, .sheet-main');
        if (sidebarEl && typeof saved?.sidebarScrollTop === 'number') {
          sidebarEl.scrollTop = saved.sidebarScrollTop;
        }
        if (mainEl && typeof saved?.mainScrollTop === 'number') {
          mainEl.scrollTop = saved.mainScrollTop;
        }
      };
      if (typeof this.$nextTick === 'function') {
        this.$nextTick(apply);
      } else {
        apply();
      }
    },
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
        const weaponName = (w.name && w.name.trim()) || (w.type && w.type.trim()) || 'Laser Battery';
        return {
          ...w,
          id: w.id || `w_${Date.now()}_${idx}`,
          name: weaponName,
          type: (w.type && w.type.trim()) || weaponName,
          category: w.category || '',
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
      copy.notes = copy.notes || '';
      return copy;
    },
    async fetchShips() {
      this.loading = true;
      try {
        const res = await fetch('/api/ships', { credentials: 'include' });
        if (res.ok) {
          const raw = await res.json();
          this.ships = (raw || []).map((s) => this.normalizeShip(s));
          const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
          const saved = getUserState(uid, 'shipSheets', {
            selectedShipId: null,
            sidebarScrollTop: 0,
            mainScrollTop: 0,
          });
          if (this.ships.length > 0 && !this.selectedShip) {
            const match = saved.selectedShipId != null
              ? this.ships.find((s) => String(s.id) === String(saved.selectedShipId))
              : null;
            this.selectShip(match || this.ships[0]);
            if (this.restoreScrollPositions) {
              this.restoreScrollPositions(saved);
            }
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
      if (this.selectedShip && this.selectedShip.id !== undefined) {
        const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
        saveUserState(uid, 'shipSheets', { selectedShipId: this.selectedShip.id });
      }
    },
    applyPresetToCreateForm() {
      const preset = this.presets.find((p) => p.type === this.selectedPresetType) || this.presets[0];
      this.newShipForm.type = preset.type;
      this.newShipForm.adf = preset.adf;
      this.newShipForm.mr = preset.mr;
      this.newShipForm.dcr = preset.dcr;
      this.newShipForm.max_hull_points = preset.hull_points;
      this.newShipForm.current_hull_points = preset.hull_points;
      this.newShipForm.weapons = this.normalizeWeapons(preset.weapons);
      this.newShipForm.defenses = JSON.parse(JSON.stringify(preset.defenses));
    },
    openCreateModal() {
      this.selectedPresetType = 'Assault Scout';
      this.applyPresetToCreateForm();
      this.newShipForm.name = '';
      this.newShipForm.avatar_url = '';
      this.showCreateModal = true;
    },
    openImageBrowser(target = 'sheet') {
      this.imageBrowserTarget = target;
      this.showImageBrowser = true;
    },
    onImageSelected(url) {
      if (this.imageBrowserTarget === 'sheet') {
        if (this.selectedShip) {
          this.selectedShip.avatar_url = url;
          this.updateShip();
        }
      } else if (this.imageBrowserTarget === 'create') {
        this.newShipForm.avatar_url = url;
      }
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
        this.selectedShip.weapons = this.normalizeWeapons(preset.weapons);
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
          notes: this.selectedShip.notes || '',
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
    openAddWeaponModal() {
      this.showAddWeaponModal = true;
      this.customWeaponForm = {
        name: '',
        damage: '1d10',
        range: 5,
        ammo_max: 0,
      };
      this.weaponCategoryFilter = 'All';
    },
    equipWeapon(weaponTemplate, ammoOverride = null) {
      if (!this.selectedShip) return;
      if (!this.selectedShip.weapons) this.selectedShip.weapons = [];
      const overrides = {};
      if (ammoOverride !== null && ammoOverride !== undefined) {
        overrides.ammo_max = Number(ammoOverride);
        overrides.ammo_current = Number(ammoOverride);
      }
      const instance = createWeaponInstance(weaponTemplate, overrides);
      this.selectedShip.weapons.push(instance);
      this.showAddWeaponModal = false;
      this.updateShip();
    },
    equipCustomWeapon() {
      if (!this.selectedShip) return;
      const name = (this.customWeaponForm.name || '').trim();
      if (!name) return;
      if (!this.selectedShip.weapons) this.selectedShip.weapons = [];
      const instance = createWeaponInstance(this.customWeaponForm, { name });
      this.selectedShip.weapons.push(instance);
      this.showAddWeaponModal = false;
      this.updateShip();
    },
    onWeaponNameChange(wpn) {
      if (!wpn) return;
      const trimmed = (wpn.name || '').trim();
      if (!trimmed) {
        wpn.name = wpn.type || 'Laser Battery';
      } else {
        wpn.name = trimmed;
      }
      wpn.type = wpn.name;
      this.updateShip();
    },
    getWeaponCategory(wpn) {
      if (!wpn) return '';
      if (wpn.category) return wpn.category;
      const str = `${wpn.name || ''} ${wpn.type || ''}`.toLowerCase();
      if (str.includes('laser') || str.includes('electron') || str.includes('proton')) return 'Beam';
      if (str.includes('disruptor')) return 'Energy';
      if (str.includes('rocket') || str.includes('torpedo') || str.includes('mine') || str.includes('missile')) return 'Ordnance';
      const match = SHIP_WEAPONS_CATALOG.find(
        (c) => c.name.toLowerCase() === (wpn.name || '').toLowerCase() || c.name.toLowerCase() === (wpn.type || '').toLowerCase()
      );
      return match?.category || '';
    },
    getCategoryExplanation(wpn) {
      const cat = this.getWeaponCategory(wpn);
      if (cat === 'Beam') return 'Beam weapon: damage halved by Reflective Hull. Attenuated in gas clouds.';
      if (cat === 'Ordnance') return 'Ordnance: ignores Reflective Hull. Can be intercepted by ICMs.';
      if (cat === 'Energy') return 'Energy weapon: ignores Reflective Hull.';
      return '';
    },
    getWeaponTooltip(wpn) {
      const cat = this.getWeaponCategory(wpn);
      const expl = this.getCategoryExplanation(wpn);
      return `${wpn.name || wpn.type || 'Weapon'}${cat ? ` (${cat})` : ''}${expl ? ` - ${expl}` : ''}`;
    },
    startEditWeapon(index, wpn) {
      this.editingWeaponIndex = index;
      this.$nextTick(() => {
        const input = this.$refs.weaponRenameInput;
        const el = Array.isArray(input) ? input[0] : input;
        if (el && typeof el.focus === 'function') {
          el.focus();
          if (typeof el.select === 'function') el.select();
        }
      });
    },
    stopEditWeapon(wpn) {
      this.editingWeaponIndex = null;
      this.onWeaponNameChange(wpn);
    },
    addWeapon() {
      if (!this.selectedShip.weapons) this.selectedShip.weapons = [];
      this.selectedShip.weapons.push({
        id: `w_${Date.now()}`,
        name: 'Laser Battery',
        type: 'Laser Battery',
        category: 'Beam',
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
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ship-sub {
  font-size: 0.8rem;
  color: #e0e0e0;
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
  color: #e0e0e0 !important;
  -webkit-text-fill-color: #e0e0e0;
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
  flex-wrap: nowrap;
  width: 100%;
}

.weapon-title-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.weapon-title-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #e6e6e6 !important;
  -webkit-text-fill-color: #e6e6e6 !important;
  letter-spacing: 0.4px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.weapon-title-name:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.weapon-category-tag {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 3px;
  background-color: #161b22;
  border: 1px solid #30363d;
  color: #8b949e;
  white-space: nowrap;
  flex-shrink: 0;
}

.weapon-category-tag.beam {
  border-color: rgba(0, 255, 255, 0.4);
  color: #00ffff;
  background-color: rgba(0, 40, 40, 0.5);
}

.weapon-category-tag.ordnance {
  border-color: rgba(255, 152, 0, 0.4);
  color: #ffa726;
  background-color: rgba(60, 30, 0, 0.5);
}

.weapon-category-tag.energy {
  border-color: rgba(171, 71, 188, 0.4);
  color: #ba68c8;
  background-color: rgba(45, 15, 50, 0.5);
}

.btn-rename-weapon {
  background: transparent;
  border: none;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 2px 4px;
  opacity: 0.5;
  transition: opacity 0.15s ease, transform 0.1s ease;
  line-height: 1;
  flex-shrink: 0;
}

.btn-rename-weapon:hover {
  opacity: 1;
  transform: scale(1.2);
}

.range-unit {
  color: #8b949e;
  font-size: 0.75rem;
  margin-left: 2px;
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
  width: auto !important;
  flex: 0 0 auto;
  padding: 4px 8px;
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
  flex: 0 0 auto;
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
  cursor: pointer;
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

.btn-browse-avatar {
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid teal !important;
  color: teal !important;
  -webkit-text-fill-color: teal;
  border-radius: var(--radius, 4px);
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-browse-avatar:hover {
  background-color: #051414 !important;
  border-color: #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
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

.notes-section {
  margin-top: 1.5rem;
}

.notes-textarea {
  width: 100%;
  box-sizing: border-box;
  background-color: #121212;
  border: 1px solid #333;
  border-radius: 4px;
  color: #e0e0e0;
  padding: 0.75rem;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
  min-height: 90px;
}

.notes-textarea:focus {
  outline: none;
  border-color: #4fc3f7;
}

.weapon-title-input {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 600;
  color: #e6e6e6 !important;
  -webkit-text-fill-color: #e6e6e6 !important;
  background: rgba(0, 20, 20, 0.6);
  border: 1px dashed rgba(0, 255, 255, 0.6);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: inherit;
  transition: all 0.15s ease-in-out;
}

.weapon-title-input::placeholder {
  color: rgba(0, 255, 255, 0.6) !important;
  -webkit-text-fill-color: rgba(0, 255, 255, 0.6) !important;
  opacity: 1;
}

.weapon-title-input:hover {
  border-color: rgba(0, 255, 255, 0.6);
  background-color: rgba(0, 40, 40, 0.3);
}

.weapon-title-input:focus {
  outline: none;
  background-color: #000000;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.weapon-picker-modal {
  max-width: 650px;
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 128, 128, 0.4);
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.modal-header-row h3 {
  margin: 0;
  color: #00ffff;
  font-size: 1.15rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-close-modal {
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.15s ease;
}

.btn-close-modal:hover {
  color: #f44336;
}

.weapon-filter-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #30363d;
  padding-bottom: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.tab-btn {
  background-color: #161b22;
  border: 1px solid #30363d;
  color: #8b949e;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.tab-btn:hover {
  border-color: teal;
  color: #e0e0e0;
}

.tab-btn.active {
  background-color: #051414;
  border-color: #00a8a8;
  color: #00ffff;
  font-weight: 600;
  box-shadow: 0 0 6px rgba(0, 128, 128, 0.4);
}

.weapon-picker-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: 55vh;
  padding-right: 5px;
}

.weapon-picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background-color: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 10px 14px;
  transition: all 0.15s ease-in-out;
}

.weapon-picker-item:hover {
  border-color: rgba(0, 128, 128, 0.7);
  background-color: #111822;
}

.weapon-picker-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.weapon-picker-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weapon-picker-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #00ffff;
}

.weapon-picker-category {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #8b949e;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 3px;
  padding: 1px 6px;
}

.weapon-picker-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-pill {
  font-size: 0.8rem;
  background: #000000;
  border: 1px solid #30363d;
  border-radius: 4px;
  padding: 2px 8px;
  color: #c9d1d9;
}

.stat-pill.dmg {
  border-color: rgba(244, 67, 54, 0.4);
  color: #ff7b72;
}

.stat-pill.rng {
  border-color: rgba(56, 189, 248, 0.4);
  color: #79c0ff;
}

.stat-pill.ammo {
  border-color: rgba(74, 222, 128, 0.4);
  color: #7ee787;
}

.weapon-picker-desc {
  margin: 0;
  font-size: 0.8rem;
  color: #8b949e;
  line-height: 1.3;
}

.btn-equip-weapon {
  background-color: #000000;
  border: 1px solid teal;
  color: #00ffff;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease-in-out;
}

.btn-equip-weapon:hover {
  background-color: #051414;
  border-color: aqua;
  color: aqua;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.custom-weapon-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.custom-weapon-panel h4 {
  margin: 0;
  color: #00ffff;
  font-size: 0.95rem;
  text-transform: uppercase;
}
</style>

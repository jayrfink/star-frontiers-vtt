<template>
  <div class="sheets-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h3>Ships</h3>
        <button class="btn-primary btn-new-ship" @click="openCreateModal">+ New Ship</button>
      </div>

      <div v-if="loading" class="sidebar-loading">Loading ships...</div>
      <div v-else-if="ships.length === 0" class="sidebar-empty">
        No ships found. Create one to get started!
      </div>
      <ul v-else ref="sidebarList" class="ship-list sheet-list" @scroll="onScrollSave">
        <li
          v-for="(ship, index) in ships"
          :key="ship.id"
          :class="{
            active: selectedShip && selectedShip.id === ship.id,
            dragging: draggedShipIndex === index,
            'drag-over': dragOverShipIndex === index && draggedShipIndex !== index
          }"
          :draggable="canReorder(ship)"
          @dragstart="onDragStart($event, index)"
          @dragover="onDragOver($event, index)"
          @dragleave="onDragLeave($event, index)"
          @drop="onDrop($event, index)"
          @dragend="onDragEnd"
          @click="selectShip(ship)"
        >
          <span
            v-if="canReorder(ship)"
            class="drag-handle"
            title="Drag to reorder"
            @click.stop
          >⋮⋮</span>
          <div class="ship-item-info">
            <span class="ship-name">{{ ship.name || 'Unnamed Ship' }}</span>
            <span class="ship-sub">{{ ship.ship_type || ship.type || 'Fighter' }} • Size {{ getShipHullSize(ship) }} • HP {{ ship.current_hp ?? ship.current_hull_points ?? 0 }}/{{ ship.hull_points ?? ship.max_hull_points ?? 0 }}</span>
          </div>
          <div class="ship-item-actions">
            <div v-if="canReorder(ship)" class="reorder-actions">
              <button
                type="button"
                class="btn-reorder btn-move-up"
                title="Move Up"
                :disabled="index === 0"
                @click.stop="moveShip(index, -1)"
              >▲</button>
              <button
                type="button"
                class="btn-reorder btn-move-down"
                title="Move Down"
                :disabled="index === ships.length - 1"
                @click.stop="moveShip(index, 1)"
              >▼</button>
            </div>
            <button class="btn-delete-small" title="Delete Ship" @click.stop="deleteShip(ship.id)">✕</button>
          </div>
        </li>
      </ul>
    </aside>

    <!-- Main Content Area -->
    <main ref="mainScroll" class="sheet-main sheet-detail" @scroll="onScrollSave">
      <!-- Error Feedback Banner (Bug 29) -->
      <div v-if="errorMessage" class="error-banner">
        <span>⚠️ {{ errorMessage }}</span>
        <button type="button" class="btn-dismiss-error" @click="errorMessage = ''">✕</button>
      </div>

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
            <div class="header-top-row">
              <input
                type="text"
                v-model="selectedShip.name"
                @change="updateShip"
                class="input-name"
                placeholder="Ship Name"
              />
              <span class="badge-hull-size">Hull Size {{ shipHullSize }}</span>
              <button
                type="button"
                class="btn-action-download"
                @click="downloadAsciiSheet"
                title="Download ASCII Ship Sheet (.txt)"
              >
                Download Sheet (.txt)
              </button>
            </div>

            <div class="header-sub-row">
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
              <div v-if="isGm && registeredUsers.length > 0" class="player-select-wrap">
                <label>Player:</label>
                <select v-model="selectedShip.user_id" @change="updateShip" class="select-player">
                  <option v-for="u in registeredUsers" :key="u.id" :value="u.id">
                    {{ u.username }} ({{ u.role === 'GameMaster' ? 'GM' : 'Player' }})
                  </option>
                </select>
              </div>
              <div v-else-if="selectedShip.owner_username" class="player-badge-wrap">
                <span class="badge-player" title="Assigned Player">
                  👤 {{ selectedShip.owner_username }}
                </span>
              </div>
            </div>
          </div>
        </header>

        <!-- Middle Section: Flight Stats (Left) and Compact Trackers (Right) -->
        <div class="middle-section-grid">
          <!-- Left Column: Flight Stats (ADF & MR Stacked) -->
          <section class="card stats-section">
            <div class="panel-header-simple">
              <span class="tracker-label">FLIGHT STATS</span>
            </div>
            <div class="flight-stats-stack">
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
            </div>
          </section>

          <!-- Right Column: Compact Trackers (Hull Points & DCR) -->
          <section class="card compact-trackers-card">
            <!-- Quick Hull Points Tracker -->
            <div class="tracker-item hull-tracker-section">
              <div class="tracker-header">
                <span class="tracker-label">HULL POINTS (HP)</span>
                <div class="tracker-header-right">
                  <button
                    class="btn-action-repair btn-action-reset"
                    @click="resetShipStats"
                    title="Full Repair: Restore HP, DCR, and Ordnance Ammo to maximum"
                  >
                    Full Repair
                  </button>
                  <div class="tracker-values">
                    <span class="current">{{ selectedShip.current_hull_points ?? selectedShip.current_hp ?? 0 }}</span> / 
                    <input
                      type="number"
                      v-model.number="selectedShip.max_hull_points"
                      @change="updateShip"
                      class="input-max-hp input-max-val"
                      min="1"
                    /> Max HP
                  </div>
                </div>
              </div>
              <div class="meter-bar-bg hull-bar-bg">
                <div
                  class="meter-bar-fill hull-bar-fill"
                  :style="{ width: hullPercentage + '%', backgroundColor: hullColor }"
                ></div>
              </div>
              <div class="tracker-controls hull-controls">
                <div class="stepper-group">
                  <button class="btn-hp btn-sub" @click="adjustHullPoints(-5)">-5</button>
                  <button class="btn-hp btn-sub" @click="adjustHullPoints(-1)">-1</button>
                  <button class="btn-hp btn-add" @click="adjustHullPoints(+1)">+1</button>
                  <button class="btn-hp btn-add" @click="adjustHullPoints(+5)">+5</button>
                </div>
                <div class="freeform-delta-group">
                  <input
                    type="number"
                    v-model.number="hullDelta"
                    placeholder="Amt"
                    min="1"
                    class="input-delta"
                    @keydown.enter.prevent="applyHullDamage"
                  />
                  <button class="btn-delta btn-sub" @click="applyHullDamage" title="Subtract damage from Hull Points">- Dmg</button>
                  <button class="btn-delta btn-add" @click="applyHullHeal" title="Repair Hull Points">+ Heal</button>
                </div>
              </div>
            </div>

            <!-- Damage Control Rating (DCR) Tracker -->
            <div class="tracker-item dcr-tracker-section">
              <div class="tracker-header">
                <span class="tracker-label">DAMAGE CONTROL RATING (DCR)</span>
                <div class="tracker-header-right">
                  <button
                    class="btn-action-restore-dcr"
                    @click="restoreDcr"
                    title="Restore DCR to maximum"
                  >
                    Restore DCR
                  </button>
                  <div class="tracker-values">
                    <span class="current">{{ selectedShip.current_dcr ?? selectedShip.dcr ?? 50 }}</span> / 
                    <input
                      type="number"
                      v-model.number="selectedShip.max_dcr"
                      @change="onMaxDcrChange"
                      class="input-max-dcr input-max-val"
                      min="1"
                      max="200"
                    /> Max DCR
                  </div>
                </div>
              </div>
              <div class="meter-bar-bg dcr-bar-bg">
                <div
                  class="meter-bar-fill dcr-bar-fill"
                  :style="{ width: dcrPercentage + '%', backgroundColor: dcrColor }"
                ></div>
              </div>
              <div class="tracker-controls dcr-controls">
                <div class="stepper-group">
                  <button class="btn-dcr btn-sub" @click="adjustDcr(-5)">-5</button>
                  <button class="btn-dcr btn-sub" @click="adjustDcr(-1)">-1</button>
                  <button class="btn-dcr btn-add" @click="adjustDcr(+1)">+1</button>
                  <button class="btn-dcr btn-add" @click="adjustDcr(+5)">+5</button>
                </div>
                <div class="freeform-delta-group">
                  <input
                    type="number"
                    v-model.number="dcrDelta"
                    placeholder="Amt"
                    min="1"
                    class="input-delta"
                    @keydown.enter.prevent="applyDcrDamage"
                  />
                  <button class="btn-delta btn-sub" @click="applyDcrDamage" title="Reduce DCR">- Red</button>
                  <button class="btn-delta btn-add" @click="applyDcrRepair" title="Repair DCR">+ Rep</button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="flip-burn-ship-banner" :class="{ capable: canStandardFlip(selectedShip.mr), 'multi-turn': canLumberingFlip(selectedShip.mr) || canSnapFlip(selectedShip.mr) }">
            <template v-if="canStandardFlip(selectedShip.mr)">
              <span class="fb-badge capable">🔄 Standard Flip Capable (MR {{ selectedShip.mr }} &ge; 3)</span>
              <span class="fb-rule-text">
                Can execute <strong>1-Turn (6s) 180° in-hex pivot</strong> (spends 3 MR). Inertial compensators safely absorb up to <strong>{{ SAFE_COMPENSATOR_DELTA_V }} points of total ΔV ({{ SAFE_COMPENSATOR_DELTA_V }} ADF braking)</strong> with no STA check required. <strong>High-G braking</strong> (<strong>{{ SAFE_COMPENSATOR_DELTA_V + 1 }}+ ADF spent in a single turn</strong>) requires crew STA checks (<strong>-10% per point of ADF spent above {{ SAFE_COMPENSATOR_DELTA_V }}</strong>).
              </span>
            </template>
            <template v-else-if="canLumberingFlip(selectedShip.mr) || canSnapFlip(selectedShip.mr)">
              <span class="fb-badge multi-turn">🔄 Lumbering &amp; Snap Flip Capable (MR {{ selectedShip.mr }} &lt; 3)</span>
              <span class="fb-rule-text">
                Can execute <strong>2-Turn Lumbering Flip</strong> (drifts at speed rotating native MR 60°–120° on Turn 1, completing 180° on Turn 2) or <strong>1-Turn Emergency Snap Flip</strong> (Pilot check; crew centrifugal whip STA check: -10% Bow/Stern, 0% Midships). Safe braking up to {{ SAFE_COMPENSATOR_DELTA_V }} ADF; <strong>High-G braking</strong> ({{ SAFE_COMPENSATOR_DELTA_V + 1 }}+ ADF) requires crew STA checks (-10% per point above {{ SAFE_COMPENSATOR_DELTA_V }}).
              </span>
            </template>
            <template v-else>
              <span class="fb-badge incapable">🚫 Flip &amp; Burn Unavailable (MR 0)</span>
              <span class="fb-rule-text">
                Vessel lacks maneuvering thrusters. Cannot pivot or rotate.
              </span>
            </template>
          </div>

        <!-- Defense & Armament Grid -->
        <div class="two-column-lists">
          <!-- Defenses List -->
          <section class="card list-card">
            <div class="list-header">
              <h4>Defenses</h4>
              <button class="btn-secondary" @click="openAddDefenseModal">+ Add Defense</button>
            </div>
            <div v-if="!defenseList || defenseList.length === 0" class="empty-list">
              No defensive systems equipped.
            </div>
            <div v-else class="defenses-list">
              <template v-for="(defense, index) in defenseList" :key="defense.id || index">
                <!-- Toggle Defense (Reflective Hull, Stasis Screen, Proton Screen, etc.) -->
                <div v-if="defense.type !== 'counter'" class="defense-toggle-row">
                  <span class="defense-label">{{ defense.name }}</span>
                  <div class="defense-controls-row">
                    <button
                      :class="['toggle-btn', defense.online ? 'active' : 'offline']"
                      @click="toggleDefense(defense)"
                    >
                      {{ defense.online ? 'ONLINE' : 'OFFLINE' }}
                    </button>
                    <button class="btn-remove" title="Remove Defense" @click="removeDefense(index)">✕</button>
                  </div>
                </div>

                <!-- Counter Defense (Masking Screens, ICMs, etc.) -->
                <div v-else class="defense-counter-box">
                  <div class="defense-counter-header">
                    <span class="defense-label">{{ defense.name }}</span>
                    <div class="defense-controls-row">
                      <button
                        class="btn-action"
                        :disabled="defense.current <= 0"
                        @click="useDefenseCounter(defense)"
                      >
                        {{ getDefenseActionLabel(defense) }}
                      </button>
                      <button class="btn-remove" title="Remove Defense" @click="removeDefense(index)">✕</button>
                    </div>
                  </div>
                  <div class="counter-inputs">
                    <label>Current:</label>
                    <input
                      type="number"
                      v-model.number="defense.current"
                      @change="onDefenseCounterChange"
                      min="0"
                      class="item-level-input"
                    />
                    <label>Max:</label>
                    <input
                      type="number"
                      v-model.number="defense.max"
                      @change="onDefenseCounterChange"
                      min="0"
                      class="item-level-input"
                    />
                  </div>
                </div>
              </template>
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
                        @keyup.enter="$event.target.blur()"
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
                      <span
                        v-for="tag in (wpn.restrictions || [])"
                        :key="tag"
                        class="wpn-restriction-pill"
                        :class="tag.toLowerCase()"
                      >
                        {{ tag }}
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
                  <div class="detail-field ammo-field" v-if="isLimitedAmmoWeapon(wpn)">
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
          <div v-if="isGm && registeredUsers.length > 0" class="form-group">
            <label>Assigned Player</label>
            <select v-model="newShipForm.user_id" class="ship-create-select">
              <option v-for="u in registeredUsers" :key="u.id" :value="u.id">
                {{ u.username }} ({{ u.role === 'GameMaster' ? 'GM' : 'Player' }})
              </option>
            </select>
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
                  {{ weapon.ammo_max > 0 ? `🔋 Ammo: ${weapon.ammo_max}` : (weapon.category === 'Ordnance' || (weapon.restrictions && weapon.restrictions.includes('LTD')) ? '🔋 Ammo: 0' : '♾️ Unlimited') }}
                </span>
              </div>
              <div v-if="weapon.restrictions && weapon.restrictions.length > 0" class="weapon-picker-restrictions">
                <span
                  v-for="tag in weapon.restrictions"
                  :key="tag"
                  class="wpn-restriction-pill"
                  :class="tag.toLowerCase()"
                >
                  {{ tag }}
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
            <div class="form-group">
              <label>Firing Arcs &amp; Limitations</label>
              <div class="restriction-toggle-group">
                <button
                  v-for="tag in STANDARD_RESTRICTION_TAGS"
                  :key="tag"
                  type="button"
                  class="btn-tag-chip"
                  :class="{ active: customWeaponForm.selectedTags.includes(tag), [tag.toLowerCase()]: true }"
                  @click="toggleRestrictionTag(tag)"
                >
                  {{ tag }}
                </button>
              </div>
              <input
                type="text"
                v-model="customWeaponForm.customRestrictions"
                placeholder="Custom / other restrictions (e.g. Aft, Port)"
                class="custom-restrictions-input"
              />
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

    <!-- Equip Ship Defense Modal -->
    <div v-if="showAddDefenseModal" class="modal-backdrop" @click.self="showAddDefenseModal = false">
      <div class="modal-card weapon-picker-modal">
        <div class="modal-header-row">
          <h3>🛡️ Equip Ship Defense</h3>
          <button type="button" class="btn-close-modal" @click="showAddDefenseModal = false">✕</button>
        </div>

        <!-- Filter Tabs -->
        <div class="weapon-filter-tabs">
          <button
            type="button"
            class="tab-btn"
            :class="{ active: defenseFilterTab === 'All' }"
            @click="defenseFilterTab = 'All'"
          >
            All ({{ defenseCatalog.length }})
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ active: defenseFilterTab === 'Screen' }"
            @click="defenseFilterTab = 'Screen'"
          >
            Screens &amp; Armor ({{ defenseCatalog.filter((d) => d.type === 'toggle').length }})
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ active: defenseFilterTab === 'Countermeasure' }"
            @click="defenseFilterTab = 'Countermeasure'"
          >
            Countermeasures ({{ defenseCatalog.filter((d) => d.type === 'counter').length }})
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ active: defenseFilterTab === 'Custom' }"
            @click="defenseFilterTab = 'Custom'"
          >
            Custom Defense
          </button>
        </div>

        <!-- Defense Catalog List -->
        <div v-if="defenseFilterTab !== 'Custom'" class="weapon-picker-list">
          <div
            v-for="defense in defenseCatalog"
            :key="defense.id"
            v-show="defenseFilterTab === 'All' || (defenseFilterTab === 'Screen' && defense.type === 'toggle') || (defenseFilterTab === 'Countermeasure' && defense.type === 'counter')"
            class="weapon-picker-item"
          >
            <div class="weapon-picker-info">
              <div class="weapon-picker-name-row">
                <span class="weapon-picker-name">{{ defense.name }}</span>
                <span class="weapon-picker-category">{{ defense.category }}</span>
              </div>
              <div class="weapon-picker-stats">
                <span class="stat-pill" :class="defense.type === 'toggle' ? 'rng' : 'ammo'">
                  {{ defense.type === 'toggle' ? '⚡ Toggle Screen' : `🔋 Max Charges: ${defense.max}` }}
                </span>
              </div>
              <p class="weapon-picker-desc">{{ defense.description }}</p>
            </div>
            <button type="button" class="btn-equip-weapon" @click="equipDefense(defense)">
              Equip
            </button>
          </div>
        </div>

        <!-- Custom Defense Form -->
        <div v-else class="custom-weapon-panel">
          <h4>Design Custom Ship Defense</h4>
          <form @submit.prevent="equipCustomDefense">
            <div class="form-group">
              <label>Defense Name *</label>
              <input
                type="text"
                v-model="customDefenseForm.name"
                required
                placeholder="e.g. Reinforced Kinetic Plating"
              />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Defense Type</label>
                <select v-model="customDefenseForm.type" class="form-select">
                  <option value="toggle">Toggle Screen / Armor</option>
                  <option value="counter">Countermeasure (Charges)</option>
                </select>
              </div>
              <div class="form-group" v-if="customDefenseForm.type === 'counter'">
                <label>Max Charges</label>
                <input
                  type="number"
                  v-model.number="customDefenseForm.max"
                  min="1"
                  placeholder="2"
                />
              </div>
              <div class="form-group" v-if="customDefenseForm.type === 'counter'">
                <label>Current Charges</label>
                <input
                  type="number"
                  v-model.number="customDefenseForm.current"
                  min="0"
                  placeholder="2"
                />
              </div>
            </div>
            <div class="form-group">
              <label>Description / Effect</label>
              <input
                type="text"
                v-model="customDefenseForm.description"
                placeholder="Optional description or tactical effects"
              />
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-modal-cancel" @click="showAddDefenseModal = false">Cancel</button>
              <button type="submit" class="btn-modal-create" :disabled="!customDefenseForm.name?.trim()">
                Equip Custom Defense
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal (Bug 36) -->
    <div v-if="confirmModal.show" class="modal-backdrop" @click.self="cancelConfirmModal">
      <div class="modal-card modal-confirm">
        <div class="modal-header">
          <h3>Confirmation</h3>
          <button type="button" class="btn-close-modal" @click="cancelConfirmModal">✕</button>
        </div>
        <div class="modal-body" style="padding: 1rem 0;">
          <p>{{ confirmModal.message }}</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-modal-cancel" @click="cancelConfirmModal">Cancel</button>
          <button type="button" class="btn-modal-confirm" @click="executeConfirmModal">Confirm</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { socket } from '../services/socket.js';
import { useAuthStore } from '../stores/auth.js';
import { SHIP_PRESETS, SHIP_HULL_SIZES } from '../constants/shipPresets.js';
import ImageBrowserModal from '../components/ImageBrowserModal.vue';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';
import { SHIP_WEAPONS_CATALOG, createWeaponInstance } from '../constants/shipWeapons.js';
import {
  SHIP_DEFENSES_CATALOG,
  createDefenseInstance,
  normalizeDefensesData,
  syncLegacyDefenses,
} from '../constants/shipDefenses.js';
import {
  canFlipAndBurn,
  canMultiTurnFlip,
  canStandardFlip,
  canLumberingFlip,
  canSnapFlip,
  SAFE_COMPENSATOR_DELTA_V,
} from '../utils/flipAndBurn.js';
import { downloadShipAscii } from '../utils/shipExport.js';

export default {
  name: 'ShipSheetsView',
  components: {
    ImageBrowserModal,
  },
  data() {
    return {
      SAFE_COMPENSATOR_DELTA_V,
      presets: SHIP_PRESETS,
      selectedPresetType: 'Assault Scout',
      ships: [],
      selectedShip: null,
      loading: true,
      creating: false,
      errorMessage: '',
      draggedShipIndex: null,
      dragOverShipIndex: null,
      confirmModal: {
        show: false,
        message: '',
        onConfirm: null,
      },
      hullDelta: null,
      dcrDelta: null,
      showCreateModal: false,
      showImageBrowser: false,
      imageBrowserTarget: 'sheet',
      showAddWeaponModal: false,
      editingWeaponIndex: null,
      weaponCatalog: SHIP_WEAPONS_CATALOG,
      weaponCategoryFilter: 'All',
      STANDARD_RESTRICTION_TAGS: ['FF', 'T', 'MPO', 'RD', 'LTD'],
      customWeaponForm: {
        name: '',
        damage: '1d10',
        range: 5,
        ammo_max: 0,
        selectedTags: [],
        customRestrictions: '',
      },
      showAddDefenseModal: false,
      defenseCatalog: SHIP_DEFENSES_CATALOG,
      defenseFilterTab: 'All',
      customDefenseForm: {
        name: '',
        type: 'toggle',
        current: 1,
        max: 1,
        description: '',
      },
      registeredUsers: [],
      newShipForm: {
        name: '',
        type: 'Assault Scout',
        avatar_url: '',
        user_id: null,
        adf: 5,
        mr: 4,
        dcr: 35,
        max_dcr: 35,
        current_dcr: 35,
        max_hull_points: 15,
        current_hull_points: 15,
        weapons: [],
        defenses: {},
      },
    };
  },
  computed: {
    shipHullSize() {
      return this.getShipHullSize(this.selectedShip);
    },
    isGm() {
      try {
        const authStore = useAuthStore();
        return authStore.user?.role === 'GameMaster';
      } catch {
        return false;
      }
    },
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
      if (!this.selectedShip) return 0;
      const max = this.selectedShip.max_hull_points ?? this.selectedShip.hull_points ?? 0;
      if (max <= 0) return 0;
      const cur = this.selectedShip.current_hull_points ?? this.selectedShip.current_hp ?? 0;
      const pct = (cur / max) * 100;
      return Math.max(0, Math.min(100, pct));
    },
    hullColor() {
      if (this.hullPercentage > 50) return '#4caf50';
      if (this.hullPercentage > 25) return '#ff9800';
      return '#f44336';
    },
    dcrPercentage() {
      if (!this.selectedShip) return 0;
      const max = this.selectedShip.max_dcr ?? this.selectedShip.dcr ?? 0;
      if (max <= 0) return 0;
      const cur = this.selectedShip.current_dcr ?? this.selectedShip.dcr ?? 0;
      const pct = (cur / max) * 100;
      return Math.max(0, Math.min(100, pct));
    },
    dcrColor() {
      if (this.dcrPercentage > 50) return '#4caf50';
      if (this.dcrPercentage > 25) return '#ff9800';
      return '#f44336';
    },
    defenseList() {
      if (!this.selectedShip || !this.selectedShip.defenses) return [];
      if (Array.isArray(this.selectedShip.defenses)) return this.selectedShip.defenses;
      if (!this.selectedShip.defenses.items) {
        return this.normalizeDefenses(this.selectedShip.defenses).items || [];
      }
      return this.selectedShip.defenses.items || [];
    },
  },
  mounted() {
    this.fetchShips();
    this.setupSocketListeners();
    if (this.isGm) {
      this.fetchUsers();
    }
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
    getShipHullSize(ship) {
      if (!ship) return 1;
      if (ship.hull_size != null && !isNaN(ship.hull_size)) return Number(ship.hull_size);
      if (ship.size != null && !isNaN(ship.size)) return Number(ship.size);
      const type = ship.ship_type || ship.type;
      if (type && SHIP_HULL_SIZES[type] !== undefined) {
        return SHIP_HULL_SIZES[type];
      }
      const hp = ship.max_hull_points ?? ship.hull_points;
      if (hp != null && !isNaN(hp)) {
        return Math.max(1, Math.min(20, Math.round(Number(hp) / 5)));
      }
      return 1;
    },
    canFlipAndBurn,
    canMultiTurnFlip,
    canStandardFlip,
    canLumberingFlip,
    canSnapFlip,
    handleKeydown(e) {
      if (e.key === 'Escape') {
        if (this.showAddWeaponModal) {
          this.showAddWeaponModal = false;
        }
        if (this.showAddDefenseModal) {
          this.showAddDefenseModal = false;
        }
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
      return normalizeDefensesData(defenses);
    },
    normalizeWeapons(weapons) {
      if (!Array.isArray(weapons)) return [];
      return weapons.map((w, idx) => {
        const weaponName = (w.name && w.name.trim()) || (w.type && w.type.trim()) || 'Laser Battery';
        let restrictions = [];
        if (Array.isArray(w.restrictions)) {
          restrictions = w.restrictions.map((r) => String(r).trim()).filter(Boolean);
        } else if (typeof w.restrictions === 'string' && w.restrictions.trim()) {
          restrictions = w.restrictions.split(',').map((r) => r.trim()).filter(Boolean);
        }
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
          restrictions,
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
      copy.hull_points = copy.hull_points !== undefined ? copy.hull_points : (copy.max_hull_points ?? 50);
      copy.max_hull_points = copy.hull_points;
      copy.current_hp = copy.current_hp !== undefined ? copy.current_hp : (copy.current_hull_points !== undefined ? copy.current_hull_points : copy.hull_points);
      copy.current_hull_points = copy.current_hp;
      copy.max_dcr = copy.max_dcr !== undefined ? Number(copy.max_dcr) : (copy.dcr !== undefined ? Number(copy.dcr) : 50);
      copy.current_dcr = copy.current_dcr !== undefined && copy.current_dcr !== null ? Number(copy.current_dcr) : copy.max_dcr;
      copy.dcr = copy.max_dcr;
      copy.defenses = this.normalizeDefenses(copy.defenses);
      copy.weapons = this.normalizeWeapons(copy.weapons);
      copy.notes = copy.notes || '';
      copy.user_id = copy.user_id !== undefined && copy.user_id !== null ? Number(copy.user_id) : null;
      copy.owner_username = copy.owner_username || '';
      return copy;
    },
    async fetchUsers() {
      try {
        const res = await fetch('/api/auth/users', { credentials: 'include' });
        if (res.ok) {
          this.registeredUsers = await res.json();
        } else {
          this.registeredUsers = [];
        }
      } catch {
        this.registeredUsers = [];
      }
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
      this.newShipForm.max_dcr = preset.dcr;
      this.newShipForm.current_dcr = preset.dcr;
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
      let defaultUserId = null;
      try {
        const authStore = useAuthStore();
        defaultUserId = authStore?.user?.id ?? (this.registeredUsers?.[0]?.id ?? null);
      } catch {
        defaultUserId = this.registeredUsers?.[0]?.id ?? null;
      }
      this.newShipForm.user_id = defaultUserId;
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
    openConfirmModal(message, onConfirm) {
      this.confirmModal = {
        show: true,
        message,
        onConfirm,
      };
    },
    cancelConfirmModal() {
      this.confirmModal.show = false;
      this.confirmModal.onConfirm = null;
    },
    executeConfirmModal() {
      if (typeof this.confirmModal.onConfirm === 'function') {
        const fn = this.confirmModal.onConfirm;
        this.confirmModal.show = false;
        this.confirmModal.onConfirm = null;
        fn();
      } else {
        this.confirmModal.show = false;
      }
    },
    onEditPresetChange(newType) {
      const preset = Array.isArray(this.presets)
        ? this.presets.find((p) => p.type === newType)
        : (this.presets ? this.presets[newType] : null);
      this.selectedShip.type = newType;
      this.selectedShip.ship_type = newType;
      if (!preset) {
        this.updateShip();
        return;
      }
      const applyPreset = () => {
        this.selectedShip.adf = preset.adf;
        this.selectedShip.mr = preset.mr;
        this.selectedShip.dcr = preset.dcr;
        this.selectedShip.max_dcr = preset.dcr;
        this.selectedShip.current_dcr = preset.dcr;
        this.selectedShip.max_hull_points = preset.hull_points;
        this.selectedShip.hull_points = preset.hull_points;
        this.selectedShip.current_hull_points = preset.hull_points;
        this.selectedShip.current_hp = preset.hull_points;
        this.selectedShip.weapons = this.normalizeWeapons(JSON.parse(JSON.stringify(preset.weapons || [])));
        this.selectedShip.defenses = this.normalizeDefenses(preset.defenses);
        this.updateShip();
      };

      if (typeof this.openConfirmModal === 'function') {
        this.openConfirmModal(`Load stats, weapons, and defenses for ${newType}?`, applyPreset);
      } else if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (window.confirm(`Load stats, weapons, and defenses for ${newType}?`)) {
          applyPreset();
        } else {
          this.updateShip();
        }
      } else {
        applyPreset();
      }
    },
    async createShip() {
      if (!this.newShipForm.name || !this.newShipForm.name.trim()) return;
      this.creating = true;
      this.errorMessage = '';
      try {
        const payload = {
          name: this.newShipForm.name.trim(),
          ship_type: this.newShipForm.type || 'Fighter',
          avatar_url: this.newShipForm.avatar_url || '',
          user_id: this.newShipForm.user_id !== undefined && this.newShipForm.user_id !== null ? this.newShipForm.user_id : undefined,
          adf: this.newShipForm.adf || 2,
          mr: this.newShipForm.mr || 2,
          dcr: this.newShipForm.max_dcr ?? this.newShipForm.dcr ?? 50,
          current_dcr: this.newShipForm.current_dcr ?? this.newShipForm.max_dcr ?? this.newShipForm.dcr ?? 50,
          hull_points: this.newShipForm.max_hull_points ?? 50,
          current_hp: this.newShipForm.current_hull_points ?? this.newShipForm.max_hull_points ?? 50,
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
          const errData = await res.json().catch(() => ({}));
          console.error('Error creating ship response:', res.status, errData);
          this.errorMessage = errData.error || `Failed to create ship (HTTP ${res.status})`;
        }
      } catch (err) {
        console.error('Error creating ship:', err);
        this.errorMessage = err.message || 'Error creating ship';
      } finally {
        this.creating = false;
      }
    },
    async updateShip() {
      if (!this.selectedShip || !this.selectedShip.id) return;
      this.errorMessage = '';
      try {
        const payload = {
          ...this.selectedShip,
          avatar_url: this.selectedShip.avatar_url || '',
          ship_type: this.selectedShip.type || this.selectedShip.ship_type || 'Fighter',
          user_id: this.selectedShip.user_id !== undefined ? this.selectedShip.user_id : undefined,
          dcr: this.selectedShip.max_dcr ?? this.selectedShip.dcr ?? 50,
          current_dcr: this.selectedShip.current_dcr ?? this.selectedShip.dcr ?? 50,
          hull_points: this.selectedShip.max_hull_points ?? this.selectedShip.hull_points ?? 50,
          current_hp: this.selectedShip.current_hull_points ?? this.selectedShip.current_hp ?? 0,
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
        } else {
          const errData = await res.json().catch(() => ({}));
          this.errorMessage = errData.error || `Failed to update ship (HTTP ${res.status})`;
        }
      } catch (err) {
        console.error('Error updating ship:', err);
        this.errorMessage = err.message || 'Error updating ship';
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
      let newHp = (this.selectedShip.current_hull_points ?? this.selectedShip.current_hp ?? 0) + amount;
      const maxHp = this.selectedShip.max_hull_points ?? this.selectedShip.hull_points ?? 100;
      newHp = Math.max(0, Math.min(maxHp, newHp));
      this.selectedShip.current_hull_points = newHp;
      this.selectedShip.current_hp = newHp;
      this.updateShip();
    },
    applyHullDamage() {
      if (!this.selectedShip) return;
      const delta = Number(this.hullDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      const current = this.selectedShip.current_hull_points ?? this.selectedShip.current_hp ?? 0;
      const next = Math.max(0, current - delta);
      this.selectedShip.current_hull_points = next;
      this.selectedShip.current_hp = next;
      this.hullDelta = null;
      this.updateShip();
    },
    applyHullHeal() {
      if (!this.selectedShip) return;
      const delta = Number(this.hullDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      const maxHp = this.selectedShip.max_hull_points ?? this.selectedShip.hull_points ?? 100;
      const current = this.selectedShip.current_hull_points ?? this.selectedShip.current_hp ?? 0;
      const next = Math.min(maxHp, current + delta);
      this.selectedShip.current_hull_points = next;
      this.selectedShip.current_hp = next;
      this.hullDelta = null;
      this.updateShip();
    },
    adjustDcr(amount) {
      if (!this.selectedShip) return;
      const max = this.selectedShip.max_dcr ?? this.selectedShip.dcr ?? 50;
      let cur = (this.selectedShip.current_dcr ?? this.selectedShip.dcr ?? 50) + amount;
      cur = Math.max(0, Math.min(max, cur));
      this.selectedShip.current_dcr = cur;
      this.updateShip();
    },
    applyDcrDamage() {
      if (!this.selectedShip) return;
      const delta = Number(this.dcrDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      const cur = this.selectedShip.current_dcr ?? this.selectedShip.dcr ?? 50;
      const next = Math.max(0, cur - delta);
      this.selectedShip.current_dcr = next;
      this.dcrDelta = null;
      this.updateShip();
    },
    applyDcrRepair() {
      if (!this.selectedShip) return;
      const delta = Number(this.dcrDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      const max = this.selectedShip.max_dcr ?? this.selectedShip.dcr ?? 50;
      const cur = this.selectedShip.current_dcr ?? this.selectedShip.dcr ?? 50;
      const next = Math.min(max, cur + delta);
      this.selectedShip.current_dcr = next;
      this.dcrDelta = null;
      this.updateShip();
    },
    restoreDcr() {
      if (!this.selectedShip) return;
      const max = this.selectedShip.max_dcr ?? this.selectedShip.dcr ?? 50;
      this.selectedShip.current_dcr = max;
      this.updateShip();
    },
    onMaxDcrChange() {
      if (!this.selectedShip) return;
      let max = Number(this.selectedShip.max_dcr);
      if (!Number.isFinite(max) || max < 1) max = 1;
      this.selectedShip.max_dcr = max;
      this.selectedShip.dcr = max;
      const cur = this.selectedShip.current_dcr ?? max;
      if (cur > max) {
        this.selectedShip.current_dcr = max;
      }
      this.updateShip();
    },
    downloadAsciiSheet() {
      if (!this.selectedShip) return;
      downloadShipAscii(this.selectedShip);
    },
    resetShipStats() {
      if (!this.selectedShip) return;
      const doReset = () => {
        const maxHp = this.selectedShip.max_hull_points ?? this.selectedShip.hull_points ?? 100;
        this.selectedShip.current_hull_points = maxHp;
        this.selectedShip.current_hp = maxHp;

        // Reset DCR to max (or preset DCR if preset matched)
        const shipType = this.selectedShip.ship_type || this.selectedShip.type;
        const preset = (this.presets || SHIP_PRESETS).find(p => p.type === shipType || p.name === shipType);
        if (preset && preset.dcr !== undefined) {
          this.selectedShip.dcr = preset.dcr;
          this.selectedShip.max_dcr = preset.dcr;
          this.selectedShip.current_dcr = preset.dcr;
        } else {
          const maxDcr = this.selectedShip.max_dcr ?? this.selectedShip.dcr ?? 50;
          this.selectedShip.current_dcr = maxDcr;
        }

        // Reset all weapon ammo to ammo_max
        if (Array.isArray(this.selectedShip.weapons)) {
          this.selectedShip.weapons.forEach(w => {
            if (w.ammo_max !== undefined && w.ammo_max > 0) {
              w.ammo_current = w.ammo_max;
            } else if (this.isLimitedAmmoWeapon && this.isLimitedAmmoWeapon(w)) {
              w.ammo_current = w.ammo_max || 0;
            }
          });
        }

        this.updateShip();
      };

      if (typeof this.openConfirmModal === 'function') {
        this.openConfirmModal('Restore Hull Points, DCR, and all weapon ammunition to maximum?', doReset);
      } else {
        doReset();
      }
    },
    deleteShip(id) {
      const doDelete = async () => {
        this.errorMessage = '';
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
          } else {
            const errData = await res.json().catch(() => ({}));
            this.errorMessage = errData.error || `Failed to delete ship (HTTP ${res.status})`;
          }
        } catch (err) {
          console.error('Error deleting ship:', err);
          this.errorMessage = err.message || 'Error deleting ship';
        }
      };

      if (typeof this.openConfirmModal === 'function') {
        this.openConfirmModal('Are you sure you want to delete this ship?', doDelete);
      } else if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (window.confirm('Are you sure you want to delete this ship?')) {
          doDelete();
        }
      } else {
        doDelete();
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
      if (Array.isArray(this.selectedShip.defenses.items)) {
        const item = this.selectedShip.defenses.items.find(
          (d) => d.defense_id === key || d.id === key || d.name?.toLowerCase().replace(/\s+/g, '_') === key
        );
        if (item) {
          item.online = this.selectedShip.defenses[key];
        }
      }
      syncLegacyDefenses(this.selectedShip.defenses);
      this.updateShip();
    },
    deployMaskingScreen() {
      if (!this.selectedShip || !this.selectedShip.defenses) return;
      const item = this.defenseList.find(
        (d) => d.defense_id === 'masking_screens' || d.id === 'masking_screens' || d.name?.toLowerCase().includes('masking')
      );
      if (item && item.current > 0) {
        item.current -= 1;
      } else if (this.selectedShip.defenses.masking_screens_current > 0) {
        this.selectedShip.defenses.masking_screens_current -= 1;
      }
      syncLegacyDefenses(this.selectedShip.defenses);
      this.updateShip();
    },
    launchICM() {
      if (!this.selectedShip || !this.selectedShip.defenses) return;
      const item = this.defenseList.find(
        (d) => d.defense_id === 'icm' || d.id === 'icm' || d.name?.toLowerCase().includes('icm') || d.name?.toLowerCase().includes('interceptor')
      );
      if (item && item.current > 0) {
        item.current -= 1;
      } else if (this.selectedShip.defenses.icm_current > 0) {
        this.selectedShip.defenses.icm_current -= 1;
      }
      syncLegacyDefenses(this.selectedShip.defenses);
      this.updateShip();
    },
    openAddDefenseModal() {
      this.showAddDefenseModal = true;
      this.defenseFilterTab = 'All';
      this.customDefenseForm = {
        name: '',
        type: 'toggle',
        current: 1,
        max: 1,
        description: '',
      };
    },
    equipDefense(defenseTemplate) {
      if (!this.selectedShip) return;
      if (!this.selectedShip.defenses) {
        this.selectedShip.defenses = this.normalizeDefenses({});
      }
      if (!Array.isArray(this.selectedShip.defenses.items)) {
        this.selectedShip.defenses = this.normalizeDefenses(this.selectedShip.defenses);
      }
      const instance = createDefenseInstance(defenseTemplate, {
        online: defenseTemplate.type === 'toggle' ? true : false,
      });
      this.selectedShip.defenses.items.push(instance);
      syncLegacyDefenses(this.selectedShip.defenses);
      this.showAddDefenseModal = false;
      this.updateShip();
    },
    equipCustomDefense() {
      if (!this.selectedShip) return;
      const name = (this.customDefenseForm?.name || '').trim();
      if (!name) return;
      if (!this.selectedShip.defenses) {
        this.selectedShip.defenses = this.normalizeDefenses({});
      }
      if (!Array.isArray(this.selectedShip.defenses.items)) {
        this.selectedShip.defenses = this.normalizeDefenses(this.selectedShip.defenses);
      }
      const instance = createDefenseInstance(this.customDefenseForm, {
        name,
        online: this.customDefenseForm.type === 'toggle' ? true : false,
      });
      this.selectedShip.defenses.items.push(instance);
      syncLegacyDefenses(this.selectedShip.defenses);
      this.showAddDefenseModal = false;
      this.updateShip();
    },
    removeDefense(keyOrIndexOrItem) {
      if (!this.selectedShip || !this.selectedShip.defenses) return;
      if (!Array.isArray(this.selectedShip.defenses.items)) {
        this.selectedShip.defenses = this.normalizeDefenses(this.selectedShip.defenses);
      }
      const items = this.selectedShip.defenses.items;
      if (typeof keyOrIndexOrItem === 'number') {
        items.splice(keyOrIndexOrItem, 1);
      } else if (typeof keyOrIndexOrItem === 'string') {
        const idx = items.findIndex(
          (d) => d.id === keyOrIndexOrItem || d.defense_id === keyOrIndexOrItem || d.name === keyOrIndexOrItem
        );
        if (idx !== -1) {
          items.splice(idx, 1);
        } else if (this.selectedShip.defenses[keyOrIndexOrItem] !== undefined) {
          delete this.selectedShip.defenses[keyOrIndexOrItem];
        }
      } else if (keyOrIndexOrItem && typeof keyOrIndexOrItem === 'object') {
        const idx = items.indexOf(keyOrIndexOrItem);
        if (idx !== -1) {
          items.splice(idx, 1);
        } else if (keyOrIndexOrItem.id) {
          const idIdx = items.findIndex((d) => d.id === keyOrIndexOrItem.id);
          if (idIdx !== -1) items.splice(idIdx, 1);
        }
      }
      syncLegacyDefenses(this.selectedShip.defenses);
      this.updateShip();
    },
    toggleDefense(defense) {
      if (!defense) return;
      defense.online = !defense.online;
      if (this.selectedShip && this.selectedShip.defenses) {
        syncLegacyDefenses(this.selectedShip.defenses);
      }
      this.updateShip();
    },
    useDefenseCounter(defense) {
      if (!defense) return;
      if (defense.current > 0) {
        defense.current -= 1;
        if (this.selectedShip && this.selectedShip.defenses) {
          syncLegacyDefenses(this.selectedShip.defenses);
        }
        this.updateShip();
      }
    },
    onDefenseCounterChange() {
      if (this.selectedShip && this.selectedShip.defenses) {
        syncLegacyDefenses(this.selectedShip.defenses);
      }
      this.updateShip();
    },
    getDefenseActionLabel(defense) {
      if (!defense || !defense.name) return 'Use';
      const name = defense.name.toLowerCase();
      if (name.includes('masking')) return 'Deploy Screen';
      if (name.includes('icm') || name.includes('interceptor')) return 'Launch ICM';
      return 'Deploy';
    },
    openAddWeaponModal() {
      this.showAddWeaponModal = true;
      this.customWeaponForm = {
        name: '',
        damage: '1d10',
        range: 5,
        ammo_max: 0,
        selectedTags: [],
        customRestrictions: '',
      };
      this.weaponCategoryFilter = 'All';
    },
    toggleRestrictionTag(tag) {
      if (!this.customWeaponForm.selectedTags) {
        this.customWeaponForm.selectedTags = [];
      }
      const idx = this.customWeaponForm.selectedTags.indexOf(tag);
      if (idx === -1) {
        this.customWeaponForm.selectedTags.push(tag);
      } else {
        this.customWeaponForm.selectedTags.splice(idx, 1);
      }
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

      const customParts = (this.customWeaponForm.customRestrictions || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const combinedRestrictions = Array.from(new Set([...(this.customWeaponForm.selectedTags || []), ...customParts]));

      const instance = createWeaponInstance(this.customWeaponForm, {
        name,
        restrictions: combinedRestrictions,
      });
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
    isLimitedAmmoWeapon(wpn) {
      if (!wpn) return false;
      return (
        (wpn.ammo_max !== undefined && wpn.ammo_max > 0) ||
        (wpn.ammo_current !== undefined && wpn.ammo_current > 0) ||
        this.getWeaponCategory(wpn) === 'Ordnance' ||
        (Array.isArray(wpn.restrictions) && wpn.restrictions.includes('LTD'))
      );
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
      if (this.editingWeaponIndex === null) return;
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
    canReorder(ship) {
      if (!ship) return false;
      return this.isGm;
    },
    async moveShip(index, direction) {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.ships.length) return;
      const original = [...this.ships];
      const updated = [...this.ships];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);
      this.ships = updated;

      await this.saveShipOrder(original);
    },
    onDragStart(event, index) {
      const ship = this.ships[index];
      if (!this.canReorder(ship)) {
        event.preventDefault();
        return;
      }
      this.draggedShipIndex = index;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      }
    },
    onDragOver(event, index) {
      if (this.draggedShipIndex === null) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.dragOverShipIndex = index;
    },
    onDragLeave(event, index) {
      if (this.dragOverShipIndex === index) {
        this.dragOverShipIndex = null;
      }
    },
    async onDrop(event, targetIndex) {
      event.preventDefault();
      const fromIndex = this.draggedShipIndex;
      this.draggedShipIndex = null;
      this.dragOverShipIndex = null;
      if (fromIndex === null || fromIndex === undefined || fromIndex === targetIndex) return;
      if (fromIndex < 0 || fromIndex >= this.ships.length) return;
      if (targetIndex < 0 || targetIndex >= this.ships.length) return;

      const original = [...this.ships];
      const updated = [...this.ships];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(targetIndex, 0, moved);
      this.ships = updated;

      await this.saveShipOrder(original);
    },
    onDragEnd() {
      this.draggedShipIndex = null;
      this.dragOverShipIndex = null;
    },
    async saveShipOrder(previousShips) {
      this.errorMessage = '';
      try {
        const order = this.ships.map((s) => s.id);
        const res = await fetch('/api/ships/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ order }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          this.errorMessage = errData.error || `Failed to reorder ships (HTTP ${res.status})`;
          this.ships = previousShips;
        }
      } catch (err) {
        console.error('Error reordering ships:', err);
        this.errorMessage = err.message || 'Error reordering ships';
        this.ships = previousShips;
      }
    },
    setupSocketListeners() {
      socket.on('sheet:created', this.handleSheetCreated);
      socket.on('sheet:updated', this.handleSheetUpdated);
      socket.on('sheet:deleted', this.handleSheetDeleted);
      socket.on('sheets:reordered', this.handleSheetsReordered);
    },
    removeSocketListeners() {
      socket.off('sheet:created', this.handleSheetCreated);
      socket.off('sheet:updated', this.handleSheetUpdated);
      socket.off('sheet:deleted', this.handleSheetDeleted);
      socket.off('sheets:reordered', this.handleSheetsReordered);
    },
    handleSheetsReordered(payload) {
      if (payload && payload.type === 'ship' && Array.isArray(payload.order)) {
        const map = new Map(this.ships.map((s) => [s.id, s]));
        const reordered = [];
        for (const id of payload.order) {
          if (map.has(id)) {
            reordered.push(map.get(id));
            map.delete(id);
          }
        }
        for (const remaining of map.values()) {
          reordered.push(remaining);
        }
        this.ships = reordered;
      }
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
  color: var(--text-primary, #cecece);
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
  font-size: 1.21rem;
  color: #45acba;
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
  padding: 10px 12px;
  border-bottom: 1px solid #21262d;
  border-left: 4px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s, border-color 0.2s, opacity 0.2s;
  user-select: none;
}

.ship-list li:hover {
  background: #21262d;
}

.ship-list li.dragging {
  opacity: 0.4;
  background: #1c2128;
}

.ship-list li.drag-over {
  border-top: 2px solid #00e5ff;
  background: rgba(0, 229, 255, 0.08);
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

.drag-handle {
  cursor: grab;
  color: #6e7681;
  font-size: 14px;
  letter-spacing: -2px;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  user-select: none;
  flex-shrink: 0;
  transition: color 0.15s;
}

.drag-handle:hover {
  color: #00e5ff;
}

.drag-handle:active {
  cursor: grabbing;
}

.ship-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
  flex: 1;
}

.ship-item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.reorder-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.btn-reorder {
  background: transparent;
  border: none;
  color: #6e7681;
  cursor: pointer;
  padding: 1px 4px;
  font-size: 9px;
  line-height: 1;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.btn-reorder:hover:not(:disabled) {
  color: #00e5ff;
  background: rgba(0, 229, 255, 0.15);
}

.btn-reorder:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.ship-name {
  font-weight: 600;
  color: #cecece;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ship-sub {
  font-size: 0.8rem;
  color: #cecece;
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
  border-color: var(--accent, #45acba);
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
  flex-direction: column;
  gap: 12px;
}

.header-top-row {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.header-sub-row {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.header-sub-row label {
  font-size: 0.9rem;
}

.btn-action-download {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  margin-left: auto;
}
.btn-action-download:hover {
  background: rgba(16, 185, 129, 0.25);
  border-color: #34d399;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.35);
}

.input-name {
  flex: 1;
  min-width: 180px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  font-size: 1.4rem;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: 4px;
}

.type-wrap,
.player-select-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
}

.input-type-select,
.input-type-select option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
  background-image: none !important;
}

.input-type-select {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: 4px;
  padding: 6px 28px 6px 10px !important;
  padding-right: 28px !important;
  font-size: 0.9rem;
}

.input-type-select:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.select-player,
.select-player option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
  background-image: none !important;
}

.select-player {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: 4px;
  padding: 6px 28px 6px 10px !important;
  padding-right: 28px !important;
  font-size: 0.9rem;
}

.select-player:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.player-badge-wrap {
  display: flex;
  align-items: center;
}

.badge-player {
  border: 1px solid rgba(69, 172, 186, 0.4);
  color: #45acba;
  background: rgba(69, 172, 186, 0.12);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.85rem;
  font-weight: 600;
}

/* Middle Section: Flight Stats (Left - 40%) and Trackers (Right - 60%) */
.middle-section-grid {
  display: grid;
  grid-template-columns: 4fr 6fr;
  gap: 16px;
  align-items: stretch;
}

@media (max-width: 820px) {
  .middle-section-grid {
    grid-template-columns: 1fr;
  }
}

.panel-header-simple {
  margin-bottom: 8px;
}

.tracker-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.75px;
  user-select: none;
}

.flight-stats-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flight-stats-stack .stat-box {
  flex: 1;
}

.compact-trackers-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}

.tracker-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.tracker-item:not(:last-child) {
  padding-bottom: 8px;
  border-bottom: 1px solid #21262d;
}

.tracker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.tracker-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tracker-values {
  font-size: 0.95rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-max-val {
  width: 48px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  text-align: center;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.meter-bar-bg {
  height: 8px;
  background: #21262d;
  border-radius: 4px;
  overflow: hidden;
  margin: 4px 0;
}

.meter-bar-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.tracker-controls {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
}

.stepper-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.freeform-delta-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.input-delta {
  width: 54px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  text-align: center;
  padding: 5px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
}

.btn-delta {
  padding: 5px 10px;
  font-size: 0.82rem;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease-in-out;
}

.btn-action-restore-dcr,
.btn-action-repair,
.btn-action-reset {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  min-width: 88px;
  text-align: center;
}

.btn-action-repair {
  padding: 2px 14px;
}
.btn-action-restore-dcr:hover,
.btn-action-repair:hover,
.btn-action-reset:hover {
  background: rgba(56, 189, 248, 0.25);
  border-color: #38bdf8;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.3);
}

.badge-hull-size {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  user-select: none;
}

.btn-hp,
.btn-dcr {
  padding: 3px 8px;
  font-size: 0.78rem;
  border: none;
  border-radius: 4px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.btn-hp:active,
.btn-dcr:active {
  transform: translateY(1px);
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
  color: #45acba;
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
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
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
  color: #45acba;
  border-radius: 4px;
  padding: 4px;
  margin-top: 4px;
  color-scheme: dark;
}

.stat-input::-webkit-inner-spin-button,
.stat-input::-webkit-outer-spin-button {
  cursor: pointer;
  opacity: 0.85;
  filter: sepia(100%) saturate(300%) hue-rotate(135deg) brightness(1.2);
  transition: opacity 0.15s ease, filter 0.15s ease;
}

.stat-input:hover::-webkit-inner-spin-button,
.stat-input:focus::-webkit-inner-spin-button {
  opacity: 1;
  filter: sepia(100%) saturate(500%) hue-rotate(135deg) brightness(1.4) drop-shadow(0 0 2px #00ffff);
}

/* Flip & Burn Banner */
.flip-burn-ship-banner {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 6px;
  background: rgba(22, 27, 34, 0.8);
  border: 1px solid #30363d;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flip-burn-ship-banner.capable {
  border-color: rgba(56, 189, 248, 0.35);
  background: rgba(56, 189, 248, 0.05);
}

.flip-burn-ship-banner.multi-turn {
  border-color: rgba(99, 102, 241, 0.35);
  background: rgba(99, 102, 241, 0.05);
}

.fb-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
  padding: 3px 8px;
  border-radius: 4px;
}

.fb-badge.capable {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.fb-badge.multi-turn {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.fb-badge.incapable {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.fb-rule-text {
  font-size: 0.8rem;
  color: #8b949e;
  line-height: 1.4;
}

.fb-rule-text strong {
  color: #cecece;
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
  color: #45acba;
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

.defense-controls-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.defense-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
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
  color: #cecece;
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
  font-size: 0.9rem;
  font-weight: 600;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece !important;
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
  background-image: none !important;
}

.status-select {
  width: auto !important;
  flex: 0 0 auto;
  padding: 4px 24px 4px 8px !important;
  padding-right: 24px !important;
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
  color: #45acba;
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
  background-color: #000000;
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
  background-image: none !important;
}

.preset-select {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: var(--radius, 4px);
  padding: 8px 28px 8px 12px !important;
  padding-right: 28px !important;
  font-size: 14px;
  width: 100%;
}

.preset-select:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.ship-create-select,
.ship-create-select option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
  background-image: none !important;
}

.ship-create-select {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: var(--radius, 4px);
  padding: 8px 28px 8px 12px !important;
  padding-right: 28px !important;
  font-size: 14px;
  width: 100%;
}

.ship-create-select:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.modal-card input[type="text"],
.modal-card input[type="number"] {
  color-scheme: dark;
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

.notes-section .section-header {
  padding-bottom: 2%;
}

.notes-section h4 {
  margin: 0;
  color: #45acba;
}

.notes-textarea {
  width: 100%;
  box-sizing: border-box;
  background-color: #121212;
  border: 1px solid #333;
  border-radius: 4px;
  color: #cecece;
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
  font-size: 0.9rem;
  font-weight: 600;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece !important;
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
  font-size: 1.27rem;
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
  color: #cecece;
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
  color: #cecece;
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
  font-size: 1.05rem;
  text-transform: uppercase;
}

.wpn-restriction-pill {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 1px 5px;
  border-radius: 3px;
  background-color: #161b22;
  border: 1px solid #30363d;
  color: #8b949e;
  white-space: nowrap;
  flex-shrink: 0;
}

.wpn-restriction-pill.ff {
  border-color: rgba(56, 189, 248, 0.4);
  color: #79c0ff;
  background-color: rgba(56, 189, 248, 0.1);
}

.wpn-restriction-pill.t {
  border-color: rgba(74, 222, 128, 0.4);
  color: #7ee787;
  background-color: rgba(74, 222, 128, 0.1);
}

.wpn-restriction-pill.mpo {
  border-color: rgba(251, 191, 36, 0.4);
  color: #f6e05e;
  background-color: rgba(251, 191, 36, 0.1);
}

.wpn-restriction-pill.rd {
  border-color: rgba(244, 67, 54, 0.4);
  color: #ff7b72;
  background-color: rgba(244, 67, 54, 0.1);
}

.wpn-restriction-pill.ltd {
  border-color: rgba(171, 71, 188, 0.4);
  color: #ba68c8;
  background-color: rgba(171, 71, 188, 0.1);
}

.weapon-picker-restrictions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.restriction-toggle-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.btn-tag-chip {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  background: #161b22;
  border: 1px solid #30363d;
  color: #8b949e;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-tag-chip:hover {
  border-color: #8b949e;
  color: #cecece;
}

.btn-tag-chip.active {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.2);
  color: #79c0ff;
}

.btn-tag-chip.active.ff {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.25);
  color: #79c0ff;
}

.btn-tag-chip.active.t {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.25);
  color: #7ee787;
}

.btn-tag-chip.active.mpo {
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.25);
  color: #f6e05e;
}

.btn-tag-chip.active.rd {
  border-color: #f43f5e;
  background: rgba(244, 67, 54, 0.25);
  color: #ff7b72;
}

.btn-tag-chip.active.ltd {
  border-color: #ba68c8;
  background: rgba(171, 71, 188, 0.25);
  color: #ba68c8;
}

.custom-restrictions-input {
  width: 100%;
  padding: 6px 10px;
  border-radius: 4px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  font-size: 0.85rem;
  box-sizing: border-box;
}

.error-banner {
  background-color: rgba(220, 53, 69, 0.2);
  border: 1px solid #dc3545;
  color: #ff8591;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.btn-dismiss-error {
  background: transparent;
  border: none;
  color: #ff8591;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0 0.25rem;
}

.btn-dismiss-error:hover {
  color: #cecece;
}

.modal-confirm {
  max-width: 420px;
}

.btn-modal-confirm {
  background-color: #dc3545;
  color: #cecece;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-modal-confirm:hover {
  background-color: #bd2130;
}
</style>

<template>
  <div class="vtt-view">
    <!-- VTT Header -->
    <header class="vtt-header">
      <div class="header-left">
        <h2 class="map-title">{{ activeMap ? activeMap.name : 'No Active Map' }}</h2>
        <span v-if="activeMap" class="map-meta">
          {{ activeMap.width }}x{{ activeMap.height }} grid ({{ activeMap.grid_size }}px)
        </span>
      </div>

      <!-- Zoom Controls -->
      <div class="header-center">
        <div class="zoom-controls">
          <button title="Zoom Out" @click="adjustZoom(-0.15)">-</button>
          <span class="zoom-readout">{{ Math.round(zoomLevel * 100) }}%</span>
          <button title="Zoom In" @click="adjustZoom(0.15)">+</button>
          <button title="Reset Zoom" class="btn-sm" @click="zoomLevel = 1.0">Reset</button>
        </div>
      </div>

      <div class="header-right">
        <!-- GM Controls Drawer Toggle -->
        <button v-if="isGm" class="btn-gm" @click="showGmDrawer = !showGmDrawer">
          🗺️ GM Map Manager
        </button>
        <!-- Token Inspector Toggle -->
        <button class="btn-sidebar" @click="showTokenSidebar = !showTokenSidebar">
          🎯 Tokens {{ tokens.length > 0 ? `(${tokens.length})` : '' }}
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="vtt-body">
      <!-- Floating Toolbar -->
      <nav class="vtt-toolbar">
        <button
          :class="{ active: activeTool === 'select' }"
          title="Select / Move Token"
          @click="activeTool = 'select'"
        >
          👆 Move
        </button>
        <button
          :class="{ active: activeTool === 'pan' }"
          title="Pan Map (or hold Space / Middle Click)"
          @click="activeTool = 'pan'"
        >
          ✋ Pan
        </button>
        <button
          :class="{ active: activeTool === 'measure' }"
          title="Distance Ruler"
          @click="activeTool = 'measure'"
        >
          📏 Ruler
        </button>

        <button class="btn-tool" @click="rollPercentile">
          🎲 Roll d%
        </button>

        <!-- Damage Dice Roller -->
        <div class="dmg-roller-wrapper" ref="dmgMenuRef">
          <div class="dmg-btn-group">
            <button
              class="btn-tool btn-dmg-main"
              :class="{ active: showDmgMenu }"
              @click="toggleDmgMenu"
              title="Click to configure and roll damage dice"
            >
              💥 DMG Die ({{ damageDiceCount }}d10)
            </button>
            <button
              class="btn-dmg-step"
              @click.stop="adjustDamageCount(-1)"
              title="Decrease dice"
              :disabled="damageDiceCount <= 1"
            >−</button>
            <button
              class="btn-dmg-step"
              @click.stop="adjustDamageCount(1)"
              title="Increase dice"
              :disabled="damageDiceCount >= 20"
            >+</button>
          </div>

          <div v-if="showDmgMenu" class="dmg-popover">
            <div class="dmg-popover-header">
              <span>💥 Damage Dice</span>
              <button class="dmg-popover-close" @click.stop="showDmgMenu = false">×</button>
            </div>
            <div class="dmg-stepper">
              <button type="button" class="stepper-btn" @click.stop="adjustDamageCount(-1)" :disabled="damageDiceCount <= 1">−</button>
              <span class="stepper-val">{{ damageDiceCount }}d10</span>
              <button type="button" class="stepper-btn" @click.stop="adjustDamageCount(1)" :disabled="damageDiceCount >= 20">+</button>
            </div>
            <div class="dmg-presets">
              <button
                v-for="n in [1, 2, 3, 4, 5]"
                :key="n"
                type="button"
                class="preset-btn"
                :class="{ active: damageDiceCount === n }"
                @click.stop="damageDiceCount = n"
              >
                {{ n }}d10
              </button>
            </div>
            <button type="button" class="btn-roll-dmg-action" @click.stop="rollDamage">
              🎲 Roll {{ damageDiceCount }}d10 Damage
            </button>
            <div v-if="lastDamageRoll" class="dmg-last-roll-card">
              <div class="last-roll-header">Last Roll ({{ lastDamageRoll.count }}d10):</div>
              <div class="last-roll-result">
                <span class="last-roll-total">{{ lastDamageRoll.total }}</span>
                <span class="last-roll-breakdown">[{{ lastDamageRoll.dice.join(', ') }}]</span>
              </div>
            </div>
          </div>
        </div>

        <button class="btn-tool" @click="clearDice">
          ✖ Clear Dice
        </button>
      </nav>

      <!-- Canvas Area -->
      <div class="vtt-canvas-wrapper" style="position: relative;">

        <!-- Collapsible Die Roll Log HUD -->
        <div class="roll-log-hud">
          <button
            v-if="!isRollLogOpen"
            type="button"
            class="btn-roll-log-pill"
            @click="isRollLogOpen = true"
            title="Open Die Roll Log"
          >
            🎲 Log ({{ rollLog.length }}) ▲
          </button>
          <div v-else class="roll-log-card">
            <div class="roll-log-header">
              <div class="roll-log-title">🎲 Roll Log ({{ rollLog.length }}/20)</div>
              <div class="roll-log-actions">
                <button type="button" class="btn-roll-log-clear" @click="clearRollLog" :disabled="rollLog.length === 0" title="Clear log">Clear</button>
                <button type="button" class="btn-roll-log-toggle" @click="isRollLogOpen = false" title="Minimize log">▼</button>
              </div>
            </div>
            <div class="roll-log-body">
              <div v-if="rollLog.length === 0" class="roll-log-empty">
                No rolls recorded yet.
              </div>
              <ul v-else class="roll-log-list">
                <li v-for="item in rollLog" :key="item.id" class="roll-log-item" :class="item.type">
                  <div class="roll-item-meta">
                    <span class="roll-item-time">{{ item.timestamp }}</span>
                    <span class="roll-item-badge">{{ item.label }}</span>
                  </div>
                  <div class="roll-item-result">
                    <span class="roll-item-total">{{ item.total }}</span>
                    <span class="roll-item-breakdown">{{ item.breakdown }}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Floating Damage HUD Banner -->
        <transition name="hud-pop">
          <div
            v-if="showDamageHud && lastDamageRoll"
            class="damage-hud-banner"
            @click="showDamageHud = false"
          >
            <div class="hud-header">
              <span class="hud-title">💥 DAMAGE TOTAL ({{ lastDamageRoll.count }}d10)</span>
              <button class="hud-close" @click.stop="showDamageHud = false">×</button>
            </div>
            <div class="hud-body">
              <span class="hud-total">{{ lastDamageRoll.total }}</span>
              <span class="hud-dice">({{ lastDamageRoll.dice.join(' + ') }})</span>
            </div>
          </div>
        </transition>

        <!-- Floating Percentile HUD Banner -->
        <transition name="hud-pop">
          <div
            v-if="showPercentileHud && lastPercentileRoll"
            class="percentile-hud-banner"
            @click="showPercentileHud = false"
          >
            <div class="hud-header">
              <span class="hud-title">🎲 PERCENTILE ROLL (d%)</span>
              <button class="hud-close" @click.stop="showPercentileHud = false">×</button>
            </div>
            <div class="hud-body">
              <span class="hud-total">{{ lastPercentileRoll.total }}</span>
              <span class="hud-dice">(Tens: {{ lastPercentileRoll.tens }}, Ones: {{ lastPercentileRoll.ones }})</span>
            </div>
          </div>
        </transition>

        <!-- Dice Box Overlay -->
        <div id="dice-box" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 100;"></div>

        <VttCanvas
          :map="activeMap"
          :tokens="tokens"
          :active-tool="activeTool"
          v-model:zoom-level="zoomLevel"
          :is-gm="isGm"
          :selected-token-id="selectedTokenId"
          @token-moved="onTokenMoved"
          @token-selected="onTokenSelected"
        />

        <!-- No Active Map Overlay -->
        <div v-if="!activeMap" class="no-map-overlay">
          <div class="no-map-card">
            <div class="no-map-icon">🗺️</div>
            <h3>No Active Tactical Map</h3>
            <p v-if="isGm">
              You are logged in as <strong>GameMaster</strong>. Create a tactical map or select an existing map to activate it for all players.
            </p>
            <p v-else>
              Logged in as <strong>Player</strong>. Waiting for the GameMaster to activate a tactical map...
            </p>
            <div v-if="isGm" class="no-map-actions">
              <button class="primary" @click="openCreateMapModal">+ Create New Map</button>
              <button class="btn-gm" @click="showGmDrawer = true">🗺️ Open GM Map Manager</button>
            </div>
          </div>
        </div>
      </div>

      <!-- GM Drawer / Map Manager Modal -->
      <div v-if="showGmDrawer && isGm" class="drawer-backdrop" @click.self="showGmDrawer = false">
        <aside class="gm-drawer">
          <div class="drawer-header">
            <h3>🗺️ GM Map Manager</h3>
            <button class="close-btn" @click="showGmDrawer = false">×</button>
          </div>

          <div class="drawer-content">
            <!-- Create Map Action -->
            <div class="section-actions">
              <button class="primary" @click="openCreateMapModal">+ Create New Map</button>
            </div>

            <!-- Active Map Settings -->
            <div v-if="activeMap" class="section-box">
              <h4>Active Map Settings</h4>
              <div class="form-group">
                <label>Grid Size (px):</label>
                <input
                  type="number"
                  v-model.number="activeMapForm.grid_size"
                  min="20"
                  max="100"
                  @change="updateActiveMapSettings"
                />
              </div>
              <div class="form-group">
                <label>Grid Color:</label>
                <input
                  type="color"
                  v-model="activeMapForm.grid_color"
                  @change="updateActiveMapSettings"
                />
              </div>
              <div class="form-group">
                <label>Background Preset:</label>
                <select v-model="activeMapForm.preset_bg" @change="updateActiveMapSettings" class="tactical-map-select">
                  <option value="grid_only">Grid Only</option>
                  <option value="ship_deck">Ship Deck</option>
                  <option value="volturnus_desert">Volturnus Desert</option>
                  <option value="starfield">Starfield</option>
                  <option value="grassland">Grassland</option>
                </select>
              </div>
              <div class="form-group">
                <label>Background Image:</label>
                <input
                  type="text"
                  v-model="activeMapForm.background_url"
                  placeholder="Image URL or upload file"
                  @change="updateActiveMapSettings"
                />
                <div class="map-bg-btn-row">
                  <input type="file" accept="image/*" @change="onActiveMapUpload" class="map-file-input" />
                  <button type="button" class="btn-browse-avatar" @click="openMapImageBrowser('active_map')">Browse Uploads</button>
                </div>
              </div>
            </div>

            <!-- Map List -->
            <div class="section-box">
              <h4>All Maps</h4>
              <div v-if="mapList.length === 0" class="empty-text">No maps created yet.</div>
              <ul class="map-list">
                <li
                  v-for="m in mapList"
                  :key="m.id"
                  :class="{ active: activeMap && activeMap.id === m.id }"
                >
                  <div class="map-info">
                    <strong>{{ m.name }}</strong>
                    <small>{{ m.width }}x{{ m.height }} ({{ m.preset_bg }})</small>
                  </div>
                  <div class="map-btn-group">
                    <button
                      v-if="!activeMap || activeMap.id !== m.id"
                      class="btn-sm primary"
                      @click="activateMap(m.id)"
                    >
                      Activate
                    </button>
                    <span v-else class="active-badge">Active</span>
                    <button class="btn-sm danger" @click="deleteMap(m.id)">Delete</button>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <!-- Token Inspector Sidebar / Drawer -->
      <aside v-if="showTokenSidebar" class="token-sidebar">
        <div class="sidebar-header">
          <h3>🎯 Token Inspector</h3>
          <button class="close-btn" @click="showTokenSidebar = false">×</button>
        </div>

        <div class="sidebar-content">
          <!-- Token Creation Button -->
          <button class="primary full-width btn-add-token" @click="openAddTokenModal">+ Add New Token</button>

          <!-- Selected Token Details -->
          <div v-if="selectedToken" class="section-box token-inspector">
            <div class="token-title-row">
              <span
                class="token-color-badge"
                :style="{ backgroundColor: selectedToken.color || '#666666' }"
              ></span>
              <h4>{{ selectedToken.name }}</h4>
            </div>

            <!-- Linked Character -->
            <div class="info-row" v-if="selectedToken.character_id">
              <span class="label">Character:</span>
              <span class="value">Linked (ID: {{ selectedToken.character_id }})</span>
            </div>

            <!-- Position -->
            <div class="info-row">
              <span class="label">Position:</span>
              <span class="value">({{ selectedToken.x }}, {{ selectedToken.y }})</span>
            </div>

            <!-- Status Icons Toggles -->
            <div class="status-section">
              <label>Status Effects:</label>
              <div class="status-toggles">
                <button
                  :class="{ active: isStatusActive('stunned') }"
                  @click="toggleStatus('stunned')"
                >
                  ⚡ Stunned
                </button>
                <button
                  :class="{ active: isStatusActive('unconscious') }"
                  @click="toggleStatus('unconscious')"
                >
                  💀 Unconscious
                </button>
                <button
                  :class="{ active: isStatusActive('wounded') }"
                  @click="toggleStatus('wounded')"
                >
                  🩸 Wounded
                </button>
              </div>
            </div>

            <!-- Token Color & Size -->
            <div class="form-group">
              <label>Ring Color:</label>
              <input
                type="color"
                v-model="selectedTokenForm.color"
                @input="onColorInput"
                @change="onColorChange"
              />
            </div>

            <div class="form-group">
              <label>Size (grid cells):</label>
              <select v-model.number="selectedTokenForm.size" @change="updateSelectedToken" class="size-select">
                <option :value="1">1x1 (Medium/Small)</option>
                <option :value="2">2x2 (Large)</option>
                <option :value="3">3x3 (Huge)</option>
              </select>
            </div>

            <!-- Action Buttons -->
            <div class="inspector-actions">
              <button class="danger full-width btn-delete-token" @click="deleteSelectedToken">Delete Token</button>
            </div>
          </div>

          <div v-else-if="tokens.length > 0" class="section-box">
            <h4>Map Tokens ({{ tokens.length }})</h4>
            <ul class="token-list">
              <li
                v-for="t in tokens"
                :key="t.id"
                :class="{ active: selectedTokenId === t.id }"
                @click="selectedTokenId = t.id"
              >
                <span class="token-dot" :style="{ backgroundColor: t.color || '#666666' }"></span>
                <strong>{{ t.name }}</strong>
                <small>({{ t.x }}, {{ t.y }})</small>
              </li>
            </ul>
          </div>
          <div v-else class="empty-text">
            No tokens on map. Click "+ Add New Token" above to add one.
          </div>
        </div>
      </aside>
    </div>

    <!-- Modal: Create New Map -->
    <div v-if="showCreateMapModal" class="modal-backdrop" @click.self="showCreateMapModal = false">
      <div class="modal-card">
        <h3>Create New Tactical Map</h3>
        <form @submit.prevent="submitCreateMap">
          <div class="form-group">
            <label>Map Name *</label>
            <input type="text" v-model="newMapForm.name" required placeholder="e.g. Starship Bridge" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Width (cells)</label>
              <input type="number" v-model.number="newMapForm.width" min="5" max="100" />
            </div>
            <div class="form-group">
              <label>Height (cells)</label>
              <input type="number" v-model.number="newMapForm.height" min="5" max="100" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Grid Size (px)</label>
              <input type="number" v-model.number="newMapForm.grid_size" min="20" max="100" />
            </div>
            <div class="form-group">
              <label>Grid Color</label>
              <input type="color" v-model="newMapForm.grid_color" />
            </div>
          </div>

          <div class="form-group">
            <label>Background Preset</label>
            <select v-model="newMapForm.preset_bg" class="tactical-map-select">
              <option value="grid_only">Grid Only</option>
              <option value="ship_deck">Ship Deck</option>
              <option value="volturnus_desert">Volturnus Desert</option>
              <option value="starfield">Starfield</option>
              <option value="grassland">Grassland</option>
            </select>
          </div>

          <div class="form-group">
            <label>Custom Image URL (Optional)</label>
            <input type="text" v-model="newMapForm.background_url" placeholder="Image URL or upload file" />
            <div class="map-bg-btn-row">
              <input type="file" accept="image/*" @change="e => uploadMapImage(e, newMapForm)" class="map-file-input" />
              <button type="button" class="btn-browse-avatar" @click="openMapImageBrowser('new_map')">Browse Uploads</button>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-modal-cancel" @click="showCreateMapModal = false">Cancel</button>
            <button type="submit" class="btn-add-token-submit">Create Map</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Add Token -->
    <div v-if="showAddTokenModal" class="modal-backdrop" @click.self="showAddTokenModal = false">
      <div class="modal-card">
        <h3>Add Token to Map</h3>
        <form @submit.prevent="submitAddToken">
          <div class="form-group">
            <label>Link to Character Sheet (Optional)</label>
            <select v-model="selectedCharacterId" @change="onCharacterSelected" class="character-sheet-select">
              <option :value="null">-- None (Custom Token) --</option>
              <option v-for="c in characters" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.race || 'Character' }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Token Name *</label>
            <input type="text" v-model="newTokenForm.name" required placeholder="e.g. Captain UPEX" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Ring Color</label>
              <input type="color" v-model="newTokenForm.color" />
            </div>
            <div class="form-group">
              <label>Size (Cells)</label>
              <select v-model.number="newTokenForm.size" class="character-sheet-select">
                <option :value="1">1x1 (Medium)</option>
                <option :value="2">2x2 (Large)</option>
                <option :value="3">3x3 (Huge)</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Start X</label>
              <input type="number" v-model.number="newTokenForm.x" min="0" />
            </div>
            <div class="form-group">
              <label>Start Y</label>
              <input type="number" v-model.number="newTokenForm.y" min="0" />
            </div>
          </div>

          <div class="form-group avatar-upload-section">
            <label>Token Image / Avatar (Optional)</label>
            <div class="avatar-upload-box">
              <div class="avatar-preview-wrapper" :style="{ borderColor: newTokenForm.color || '#666666' }" title="Token Image Preview">
                <img v-if="newTokenForm.avatar_url" :src="newTokenForm.avatar_url" alt="Token Preview" class="token-avatar-preview" />
                <span v-else class="avatar-empty-placeholder">No Image</span>
              </div>
              <div class="avatar-controls">
                <div class="file-btn-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    @change="uploadImage"
                    class="token-file-input"
                    ref="tokenFileInput"
                    :disabled="uploadingAvatar"
                  />
                  <span v-if="uploadingAvatar" class="uploading-spinner">Uploading...</span>
                  <button type="button" class="btn-browse-avatar" @click="openTokenImageBrowser">Browse Uploads</button>
                  <button v-if="newTokenForm.avatar_url" type="button" class="btn-clear-avatar" @click="clearAvatar">Remove</button>
                </div>
                <input
                  type="text"
                  v-model="newTokenForm.avatar_url"
                  placeholder="Or enter image URL (https://...)"
                  class="avatar-url-input"
                />
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-modal-cancel" @click="showAddTokenModal = false">Cancel</button>
            <button type="submit" class="btn-add-token-submit">Add Token</button>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import VttCanvas from '../components/VttCanvas.vue';
import ImageBrowserModal from '../components/ImageBrowserModal.vue';
import { useAuthStore } from '../stores/auth.js';
import { socket } from '../services/socket.js';
import DiceBox from '@3d-dice/dice-box';
import { calculateDamageRoll, calculatePercentileRoll } from '../utils/diceUtils.js';


const authStore = useAuthStore();
const isGm = computed(() => authStore.user?.role === 'GameMaster');


// Dice state
let diceBoxInstance = null;
const damageDiceCount = ref(1);
const showDmgMenu = ref(false);
const dmgMenuRef = ref(null);
const lastDamageRoll = ref(null);
const showDamageHud = ref(false);
let damageHudTimeout = null;

const lastPercentileRoll = ref(null);
const showPercentileHud = ref(false);
let percentileHudTimeout = null;

const RPG_ROLL_LOG_KEY = 'sf_vtt_rpg_roll_log';
const rollLog = ref([]);
const isRollLogOpen = ref(false);

function loadRollLog() {
  try {
    const raw = localStorage.getItem(RPG_ROLL_LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        rollLog.value = parsed.slice(0, 20);
      }
    }
  } catch (err) {
    console.error('Failed to load RPG roll log:', err);
  }
}

function saveRollLog() {
  try {
    localStorage.setItem(RPG_ROLL_LOG_KEY, JSON.stringify(rollLog.value.slice(0, 20)));
  } catch (err) {
    console.error('Failed to save RPG roll log:', err);
  }
}

function addRollToLog(entry) {
  rollLog.value.unshift(entry);
  if (rollLog.value.length > 20) {
    rollLog.value = rollLog.value.slice(0, 20);
  }
  saveRollLog();
}

function clearRollLog() {
  rollLog.value = [];
  try {
    localStorage.removeItem(RPG_ROLL_LOG_KEY);
  } catch (err) {
    console.error('Failed to clear RPG roll log:', err);
  }
}

function adjustDamageCount(delta) {
  damageDiceCount.value = Math.max(1, Math.min(20, damageDiceCount.value + delta));
}

function toggleDmgMenu() {
  showDmgMenu.value = !showDmgMenu.value;
}

async function rollPercentile() {
  if (diceBoxInstance) {
    showPercentileHud.value = false;
    showDamageHud.value = false;
    if (percentileHudTimeout) clearTimeout(percentileHudTimeout);

    try {
      const results = await diceBoxInstance.roll([
        { sides: 10, theme: 'custom-ones', themeColor: '#77d19e', qty: 1 }, // Tens (lighter colored die)
        { sides: 10, theme: 'custom-tens', themeColor: '#22384a', qty: 1 }  // Ones (darker colored die)
      ]);
      const rollSummary = calculatePercentileRoll(results);
      if (rollSummary.valid) {
        lastPercentileRoll.value = rollSummary;
        showPercentileHud.value = true;
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        addRollToLog({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: timeStr,
          type: 'percentile',
          label: 'd%',
          total: rollSummary.total,
          breakdown: `[Tens: ${rollSummary.tens * 10}, Ones: ${rollSummary.ones}]`
        });
        percentileHudTimeout = setTimeout(() => {
          showPercentileHud.value = false;
        }, 8000);
      }
    } catch (err) {
      console.error('Percentile dice roll failed:', err);
    }
  }
}

async function rollDamage() {
  if (diceBoxInstance) {
    showDamageHud.value = false;
    showPercentileHud.value = false;
    if (damageHudTimeout) clearTimeout(damageHudTimeout);
    showDmgMenu.value = false;

    try {
      const results = await diceBoxInstance.roll([
        { sides: 10, theme: 'custom-dmg', themeColor: '#140409', qty: damageDiceCount.value }
      ]);
      const rollSummary = calculateDamageRoll(results);
      if (rollSummary.count > 0) {
        lastDamageRoll.value = rollSummary;
        showDamageHud.value = true;
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        addRollToLog({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: timeStr,
          type: 'damage',
          label: `${rollSummary.count}d10`,
          total: rollSummary.total,
          breakdown: `[${rollSummary.dice.join(', ')}]`
        });
        damageHudTimeout = setTimeout(() => {
          showDamageHud.value = false;
        }, 8000);
      }
    } catch (err) {
      console.error('Damage dice roll failed:', err);
    }
  }
}

function clearDice() {
  if (diceBoxInstance) {
    diceBoxInstance.clear();
  }
}

function onDocClick(e) {
  if (showDmgMenu.value && dmgMenuRef.value && !dmgMenuRef.value.contains(e.target)) {
    showDmgMenu.value = false;
  }
}

// Map & Token state
const activeMap = ref(null);
const tokens = ref([]);
const mapList = ref([]);
const characters = ref([]);

// UI State
const activeTool = ref('select');
const zoomLevel = ref(1.0);
const selectedTokenId = ref(null);
const showGmDrawer = ref(false);
const showTokenSidebar = ref(true);
const showCreateMapModal = ref(false);
const showAddTokenModal = ref(false);
const showImageBrowser = ref(false);
const imageBrowserTarget = ref('token');
const tokenFileInput = ref(null);
const uploadingAvatar = ref(false);

// Forms
const activeMapForm = reactive({
  grid_size: 40,
  grid_color: '#333333',
  preset_bg: 'grid_only',
  background_url: '',
});

const newMapForm = reactive({
  name: '',
  map_type: 'rpg',
  width: 20,
  height: 20,
  grid_size: 40,
  grid_color: '#333333',
  preset_bg: 'grid_only',
  background_url: '',
});

const selectedCharacterId = ref(null);
const newTokenForm = reactive({
  name: '',
  color: '#666666',
  avatar_url: '',
  x: 0,
  y: 0,
  size: 1,
});

const selectedTokenForm = reactive({
  color: '#666666',
  size: 1,
  status_effects: [],
});

const imageBrowserTitle = computed(() => {
  if (imageBrowserTarget.value === 'active_map' || imageBrowserTarget.value === 'new_map') {
    return 'Select Map Background Image';
  }
  return 'Select Token Image';
});

const currentBrowserImage = computed(() => {
  if (imageBrowserTarget.value === 'active_map') return activeMapForm.background_url;
  if (imageBrowserTarget.value === 'new_map') return newMapForm.background_url;
  return newTokenForm.avatar_url;
});

function openTokenImageBrowser() {
  imageBrowserTarget.value = 'token';
  showImageBrowser.value = true;
}

function openMapImageBrowser(target) {
  imageBrowserTarget.value = target;
  showImageBrowser.value = true;
}

const selectedToken = computed(() => {
  if (!selectedTokenId.value) return null;
  return tokens.value.find((t) => t.id === selectedTokenId.value) || null;
});

// Watch selectedToken to sync reactive form
watch(selectedToken, (newToken) => {
  if (newToken) {
    selectedTokenForm.color = newToken.color || '#666666';
    selectedTokenForm.size = newToken.size || 1;
    selectedTokenForm.status_effects = [...(newToken.status_effects || [])];
  }
});

// Watch activeMap to update local settings form
watch(activeMap, (map) => {
  if (map) {
    activeMapForm.grid_size = map.grid_size || 40;
    activeMapForm.grid_color = map.grid_color || '#333333';
    activeMapForm.preset_bg = map.preset_bg || 'grid_only';
    activeMapForm.background_url = map.background_url || '';
  }
});

// API Calls
async function fetchActiveMap() {
  try {
    const res = await fetch('/api/maps/active?type=rpg', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      activeMap.value = data.map;
      tokens.value = data.tokens || [];
    }
  } catch (err) {
    console.error('Failed to fetch active map:', err);
  }
}

async function fetchMapList() {
  try {
    const res = await fetch('/api/maps?type=rpg', { credentials: 'include' });
    if (res.ok) {
      mapList.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch maps:', err);
  }
}

async function fetchCharacters() {
  try {
    const res = await fetch('/api/characters', { credentials: 'include' });
    if (res.ok) {
      characters.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch characters:', err);
  }
}

// Map Actions
async function activateMap(mapId) {
  try {
    const res = await fetch(`/api/maps/${mapId}/activate`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      activeMap.value = data.map;
      tokens.value = data.tokens || [];
      if (isGm.value) fetchMapList();
    }
  } catch (err) {
    console.error('Failed to activate map:', err);
  }
}

async function updateActiveMapSettings() {
  if (!activeMap.value) return;
  try {
    const res = await fetch(`/api/maps/${activeMap.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        background_url: activeMapForm.background_url,
        grid_size: activeMapForm.grid_size,
        grid_color: activeMapForm.grid_color,
        preset_bg: activeMapForm.preset_bg,
      }),
    });
    if (res.ok) {
      activeMap.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to update map settings:', err);
  }
}

async function uploadMapImage(e, formObject) {
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
      formObject.background_url = data.url;
    } else {
      console.error('Upload failed');
    }
  } catch (err) {
    console.error('Upload error:', err);
  }
}

async function onActiveMapUpload(e) {
  await uploadMapImage(e, activeMapForm);
  updateActiveMapSettings();
}

function openCreateMapModal() {
  newMapForm.name = '';
  newMapForm.map_type = 'rpg';
  newMapForm.width = 20;
  newMapForm.height = 20;
  newMapForm.grid_size = 40;
  newMapForm.grid_color = '#333333';
  newMapForm.preset_bg = 'grid_only';
  newMapForm.background_url = '';
  showCreateMapModal.value = true;
}

async function submitCreateMap() {
  try {
    const res = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newMapForm),
    });
    if (res.ok) {
      showCreateMapModal.value = false;
      fetchMapList();
    }
  } catch (err) {
    console.error('Failed to create map:', err);
  }
}

async function deleteMap(mapId) {
  if (!confirm('Are you sure you want to delete this map?')) return;
  try {
    const res = await fetch(`/api/maps/${mapId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      fetchMapList();
      if (activeMap.value && activeMap.value.id === mapId) {
        fetchActiveMap();
      }
    }
  } catch (err) {
    console.error('Failed to delete map:', err);
  }
}

// Token Actions
function getEmptyCenterCoords() {
  const mapW = activeMap.value?.width || 20;
  const mapH = activeMap.value?.height || 20;
  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);

  const occupied = new Set((tokens.value || []).map((t) => `${t.x},${t.y}`));

  const initialRadius = 2;
  const initialCandidates = [];
  for (let dx = -initialRadius; dx <= initialRadius; dx++) {
    for (let dy = -initialRadius; dy <= initialRadius; dy++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
        if (!occupied.has(`${x},${y}`)) {
          initialCandidates.push({ x, y });
        }
      }
    }
  }

  if (initialCandidates.length > 0) {
    const idx = Math.floor(Math.random() * initialCandidates.length);
    return initialCandidates[idx];
  }

  const maxRadius = Math.max(mapW, mapH);
  for (let r = initialRadius + 1; r <= maxRadius; r++) {
    const ringCandidates = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
          if (!occupied.has(`${x},${y}`)) {
            ringCandidates.push({ x, y });
          }
        }
      }
    }
    if (ringCandidates.length > 0) {
      const idx = Math.floor(Math.random() * ringCandidates.length);
      return ringCandidates[idx];
    }
  }

  return { x: cx, y: cy };
}

function openAddTokenModal() {
  selectedCharacterId.value = null;
  newTokenForm.name = '';
  newTokenForm.color = '#666666';
  newTokenForm.avatar_url = '';
  const spawn = getEmptyCenterCoords();
  newTokenForm.x = spawn.x;
  newTokenForm.y = spawn.y;
  newTokenForm.size = 1;
  if (tokenFileInput.value) tokenFileInput.value.value = '';
  showAddTokenModal.value = true;
}

async function uploadImage(event) {
  const file = event.target?.files?.[0];
  if (!file) return;
  uploadingAvatar.value = true;
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
      newTokenForm.avatar_url = data.url || data;
    } else {
      console.error('Failed to upload image: status', res.status);
    }
  } catch (err) {
    console.error('Failed to upload image:', err);
  } finally {
    uploadingAvatar.value = false;
  }
}

function clearAvatar() {
  newTokenForm.avatar_url = '';
  if (tokenFileInput.value) tokenFileInput.value.value = '';
}

function onImageSelected(url) {
  if (imageBrowserTarget.value === 'active_map') {
    activeMapForm.background_url = url;
    updateActiveMapSettings();
  } else if (imageBrowserTarget.value === 'new_map') {
    newMapForm.background_url = url;
  } else {
    newTokenForm.avatar_url = url;
  }
}

function onCharacterSelected() {
  if (!selectedCharacterId.value) return;
  const char = characters.value.find((c) => c.id === selectedCharacterId.value);
  if (char) {
    newTokenForm.name = char.name;
    if (char.avatar_url) newTokenForm.avatar_url = char.avatar_url;
  }
}

async function submitAddToken() {
  if (!activeMap.value) return;
  try {
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        map_id: activeMap.value.id,
        character_id: selectedCharacterId.value,
        name: newTokenForm.name,
        color: newTokenForm.color,
        avatar_url: newTokenForm.avatar_url,
        x: newTokenForm.x,
        y: newTokenForm.y,
        size: newTokenForm.size,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      showAddTokenModal.value = false;
      const exists = tokens.value.some((t) => t.id === created.id);
      if (!exists) tokens.value.push(created);
      selectedTokenId.value = created.id;
    }
  } catch (err) {
    console.error('Failed to create token:', err);
  }
}

let colorDebounceTimer = null;

async function onTokenMoved({ id, x, y }) {
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
  }
  const currentToken = tokens.value.find((t) => t.id === id);
  const color = (selectedToken.value && selectedToken.value.id === id)
    ? selectedTokenForm.color
    : (currentToken?.color || '#666666');

  if (currentToken) {
    currentToken.x = x;
    currentToken.y = y;
    currentToken.color = color;
  }

  try {
    const res = await fetch(`/api/tokens/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ x, y, color }),
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = tokens.value.findIndex((t) => t.id === id);
      if (idx !== -1) tokens.value[idx] = updated;
    }
  } catch (err) {
    console.error('Failed to move token:', err);
  }
}

function onTokenSelected(token) {
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
    updateSelectedToken();
  }
  selectedTokenId.value = token ? token.id : null;
}

function onColorInput() {
  if (selectedToken.value) {
    selectedToken.value.color = selectedTokenForm.color;
  }
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
  }
  colorDebounceTimer = setTimeout(() => {
    colorDebounceTimer = null;
    updateSelectedToken();
  }, 250);
}

function onColorChange() {
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
  }
  updateSelectedToken();
}

async function updateSelectedToken() {
  const token = selectedToken.value;
  if (!token) return;
  const tokenId = token.id;
  const newColor = selectedTokenForm.color;
  token.color = newColor;

  try {
    const res = await fetch(`/api/tokens/${tokenId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        color: newColor,
        size: selectedTokenForm.size,
        status_effects: selectedTokenForm.status_effects,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = tokens.value.findIndex((t) => t.id === updated.id);
      if (idx !== -1) tokens.value[idx] = updated;
    }
  } catch (err) {
    console.error('Failed to update token:', err);
  }
}

function isStatusActive(statusKey) {
  return selectedTokenForm.status_effects.includes(statusKey);
}

function toggleStatus(statusKey) {
  const idx = selectedTokenForm.status_effects.indexOf(statusKey);
  if (idx === -1) {
    selectedTokenForm.status_effects.push(statusKey);
  } else {
    selectedTokenForm.status_effects.splice(idx, 1);
  }
  updateSelectedToken();
}

async function deleteSelectedToken() {
  if (!selectedToken.value) return;
  if (!confirm(`Delete token "${selectedToken.value.name}"?`)) return;
  const tokenId = selectedToken.value.id;
  try {
    const res = await fetch(`/api/tokens/${tokenId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      tokens.value = tokens.value.filter((t) => t.id !== tokenId);
      selectedTokenId.value = null;
    }
  } catch (err) {
    console.error('Failed to delete token:', err);
  }
}

function adjustZoom(delta) {
  let newZoom = Math.min(3.0, Math.max(0.25, zoomLevel.value + delta));
  zoomLevel.value = Math.round(newZoom * 100) / 100;
}

// Socket.io Real-time Event Listeners
function setupSocketListeners() {
  socket.on('map:activated', ({ map, tokens: newTokens }) => {
    if (map && map.map_type === 'rpg') {
      activeMap.value = map;
      tokens.value = newTokens || [];
    }
  });

  socket.on('map:updated', ({ map }) => {
    if (activeMap.value && activeMap.value.id === map.id) {
      activeMap.value = map;
    }
  });

  socket.on('map:created', () => {
    if (isGm.value) fetchMapList();
  });

  socket.on('map:deleted', ({ id }) => {
    if (isGm.value) fetchMapList();
    if (activeMap.value && activeMap.value.id === id) {
      activeMap.value = null;
      tokens.value = [];
    }
  });

  socket.on('token:created', ({ token }) => {
    if (activeMap.value && token.map_id === activeMap.value.id) {
      const exists = tokens.value.some((t) => t.id === token.id);
      if (!exists) tokens.value.push(token);
    }
  });

  socket.on('token:moved', ({ token }) => {
    if (activeMap.value && token.map_id === activeMap.value.id) {
      const idx = tokens.value.findIndex((t) => t.id === token.id);
      if (idx !== -1) {
        tokens.value[idx].x = token.x;
        tokens.value[idx].y = token.y;
      }
    }
  });

  socket.on('token:updated', ({ token }) => {
    if (activeMap.value && token.map_id === activeMap.value.id) {
      const idx = tokens.value.findIndex((t) => t.id === token.id);
      if (idx !== -1) {
        tokens.value[idx] = token;
      }
    }
  });

  socket.on('token:deleted', ({ id }) => {
    tokens.value = tokens.value.filter((t) => t.id !== id);
    if (selectedTokenId.value === id) {
      selectedTokenId.value = null;
    }
  });
}

function cleanupSocketListeners() {
  socket.off('map:activated');
  socket.off('map:updated');
  socket.off('map:created');
  socket.off('map:deleted');
  socket.off('token:created');
  socket.off('token:moved');
  socket.off('token:updated');
  socket.off('token:deleted');
}

onMounted(() => {
  loadRollLog();
  fetchActiveMap();
  fetchCharacters();
  if (isGm.value) {
    fetchMapList();
  }
  
  if (!diceBoxInstance) {
    diceBoxInstance = new DiceBox({
      id: "dice-canvas",
      container: "#dice-box",
      assetPath: '/assets/dice-box/',
      theme: 'default',
      scale: 5,
      offscreen: false
    });
    diceBoxInstance.init();
  }

  setupSocketListeners();
  document.addEventListener('click', onDocClick);
});

onBeforeUnmount(() => {
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
    updateSelectedToken();
  }
  cleanupSocketListeners();
  document.removeEventListener('click', onDocClick);
  if (damageHudTimeout) clearTimeout(damageHudTimeout);
  if (percentileHudTimeout) clearTimeout(percentileHudTimeout);
});
</script>

<style scoped>
.vtt-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

/* Header */
.vtt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  height: 50px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.map-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.map-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.zoom-controls button {
  padding: 2px 8px;
  font-size: 13px;
  height: 26px;
}

.zoom-readout {
  font-size: 13px;
  font-weight: 600;
  min-width: 44px;
  text-align: center;

}

.header-right {
  display: flex;
  gap: 10px;
}

.btn-gm {
  background: #082d33;
  border: 1px solid #007fff;
  color: #00ffff;
}

.btn-gm:hover {
  background: #0d3b44;
  border-color: #3399ff;
  color: #00ffff;
}

.btn-add-token {
  background-color: #021a1e !important;
  background: #021a1e !important;
  border: 1px solid aquamarine !important;
  color: aquamarine !important;
  -webkit-text-fill-color: aquamarine;
  font-weight: 700;
  box-shadow: 0 0 10px rgba(127, 255, 212, 0.25);
  letter-spacing: 0.3px;
  text-shadow: none;
  transition: all 0.15s ease-in-out;
}

.btn-add-token:hover {
  background-color: #04272d !important;
  background: #04272d !important;
  border-color: #a8ffea !important;
  color: #a8ffea !important;
  -webkit-text-fill-color: #a8ffea;
  box-shadow: 0 0 16px rgba(127, 255, 212, 0.5);
}

.btn-add-token:active {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(127, 255, 212, 0.4);
}

/* Main Body Layout */
.vtt-body {
  position: relative;
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Floating Toolbar */
.vtt-toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(22, 27, 34, 0.92);
  backdrop-filter: blur(8px);
  padding: 8px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.vtt-toolbar button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 4px;
  text-align: left;
}

.vtt-toolbar > button.active {
  background: #082d33;
  color: #2dd4bf;
  font-weight: 600;
  border: 1px solid #14b8a6;
  box-shadow: 0 0 8px rgba(20, 184, 166, 0.4);
}

.vtt-toolbar > button.active:hover {
  background: #0d3b44;
  color: #5eead4;
  border-color: #2dd4bf;
  box-shadow: 0 0 12px rgba(45, 212, 191, 0.6);
}

.toolbar-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

/* Damage Dice Roller */
.dmg-roller-wrapper {
  position: relative;
}

.dmg-btn-group {
  display: flex;
  align-items: stretch;
}

.btn-dmg-main {
  flex: 1;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-dmg-main:hover,
.btn-dmg-main.active {
  border-color: #f29249;
  color: #f29249;
}

.btn-dmg-step {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  padding: 0 !important;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-left: none;
  color: var(--text-primary);
  font-size: 13px !important;
  font-weight: bold;
  cursor: pointer;
  border-radius: 0 !important;
}

.btn-dmg-step:last-child {
  border-top-right-radius: 4px !important;
  border-bottom-right-radius: 4px !important;
}

.btn-dmg-step:hover:not(:disabled) {
  background: var(--bg-secondary);
  color: #f29249;
  border-color: #f29249;
}

.btn-dmg-step:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dmg-popover {
  position: absolute;
  top: 0;
  left: calc(100% + 8px);
  width: 200px;
  background: rgba(22, 27, 34, 0.98);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.dmg-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #f29249;
}

.dmg-popover-close {
  background: transparent !important;
  border: none !important;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px !important;
  line-height: 1;
}

.dmg-popover-close:hover {
  color: var(--text-primary);
}

.dmg-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px;
}

.stepper-btn {
  width: 28px;
  height: 28px;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
}

.stepper-btn:hover:not(:disabled) {
  background: #f29249;
  color: #140409;
  border-color: #f29249;
}

.stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stepper-val {
  font-size: 15px;
  font-weight: 700;
  color: #f29249;
  text-align: center;
}

.dmg-presets {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.preset-btn {
  padding: 4px 0 !important;
  font-size: 11px !important;
  text-align: center !important;
  justify-content: center !important;
  border-radius: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
}

.preset-btn:hover {
  border-color: #f29249;
  color: #f29249;
}

.preset-btn.active {
  background: rgba(242, 146, 73, 0.2);
  border-color: #f29249;
  color: #f29249;
  font-weight: 600;
}

.btn-roll-dmg-action {
  padding: 8px 10px !important;
  background: #f29249 !important;
  color: #140409 !important;
  font-weight: 700 !important;
  border-radius: 6px !important;
  border: none !important;
  cursor: pointer;
  text-align: center !important;
  justify-content: center !important;
  transition: filter 0.15s ease;
}

.btn-roll-dmg-action:hover {
  filter: brightness(1.15);
}

/* Damage HUD Banner */
.damage-hud-banner {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 4, 9, 0.94);
  border: 2px solid #f29249;
  border-radius: 8px;
  padding: 10px 18px;
  color: #f29249;
  z-index: 120;
  box-shadow: 0 0 20px rgba(242, 146, 73, 0.45), 0 8px 32px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  backdrop-filter: blur(4px);
}

.damage-hud-banner .hud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.damage-hud-banner .hud-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #f29249aa;
  text-transform: uppercase;
}

.damage-hud-banner .hud-close {
  background: transparent;
  border: none;
  color: #f29249;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.damage-hud-banner .hud-body {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.damage-hud-banner .hud-total {
  font-size: 32px;
  font-weight: 900;
  color: #f29249;
  text-shadow: 0 0 10px rgba(242, 146, 73, 0.7);
  line-height: 1;
}

.damage-hud-banner .hud-dice {
  font-size: 13px;
  color: #e5c07b;
  font-weight: 600;
}

/* Percentile HUD Banner */
.percentile-hud-banner {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(34, 56, 74, 0.94);
  border: 2px solid #77d19e;
  border-radius: 8px;
  padding: 10px 18px;
  color: #77d19e;
  z-index: 120;
  box-shadow: 0 0 20px rgba(119, 209, 158, 0.45), 0 8px 32px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  backdrop-filter: blur(4px);
}

.percentile-hud-banner .hud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.percentile-hud-banner .hud-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: rgba(119, 209, 158, 0.75);
  text-transform: uppercase;
}

.percentile-hud-banner .hud-close {
  background: transparent;
  border: none;
  color: #77d19e;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.percentile-hud-banner .hud-body {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.percentile-hud-banner .hud-total {
  font-size: 32px;
  font-weight: 900;
  color: #77d19e;
  text-shadow: 0 0 10px rgba(119, 209, 158, 0.7);
  line-height: 1;
}

.percentile-hud-banner .hud-dice {
  font-size: 13px;
  color: #bbf2d4;
  font-weight: 600;
}

/* Transitions */
.hud-pop-enter-active,
.hud-pop-leave-active {
  transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.hud-pop-enter-from,
.hud-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px) scale(0.9);
}

/* DMG Menu Dropdown Card */
.dmg-last-roll-card {
  margin-top: 8px;
  padding: 6px 8px;
  background: #140409;
  border: 1px solid #f2924966;
  border-radius: 4px;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dmg-last-roll-card .last-roll-header {
  color: #8b949e;
}

.dmg-last-roll-card .last-roll-result {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.dmg-last-roll-card .last-roll-total {
  color: #f29249;
  font-weight: 800;
  font-size: 14px;
}

.dmg-last-roll-card .last-roll-breakdown {
  color: #e5c07b;
  font-size: 11px;
}

/* Canvas Area */
.vtt-canvas-wrapper {
  flex: 1;
  width: 100%;
  height: 100%;
}

/* GM Drawer Backdrop & Modal */
.drawer-backdrop,
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gm-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 360px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.4);
}

.drawer-header,
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary);
  padding: 0 4px;
}

.drawer-content,
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Token Sidebar */
.token-sidebar {
  width: 320px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 5;
}

.section-box {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-box h4 {
  font-size: 14px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  padding-bottom: 6px;
  margin-bottom: 2px;
}

.map-list,
.token-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-list li,
.token-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
}

.map-list li.active,
.token-list li.active {
  border-color: var(--accent);
  background: rgba(88, 166, 255, 0.1);
}

.token-dot,
.token-color-badge {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.token-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.info-row .label {
  color: var(--text-secondary);
}

.status-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.status-toggles button {
  padding: 4px 8px;
  font-size: 12px;
}

.status-toggles button.active {
  background: var(--accent);
  color: var(--bg-primary);
  border-color: var(--accent);
}

/* Modals */
.modal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  width: 500px;
  max-width: 95vw;
  box-sizing: border-box;
  overflow-x: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.form-group label {
  font-size: 13px;
  color: var(--text-secondary);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.character-sheet-select,
.character-sheet-select option,
.tactical-map-select,
.tactical-map-select option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
}

.character-sheet-select,
.tactical-map-select {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
}

.character-sheet-select:focus,
.tactical-map-select:focus {
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

.token-file-input,
.map-file-input {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  width: auto;
}

.token-file-input::file-selector-button,
.token-file-input::-webkit-file-upload-button,
.map-file-input::file-selector-button,
.map-file-input::-webkit-file-upload-button {
  background-color: #000000 !important;
  border: 1px solid teal !important;
  color: teal !important;
  -webkit-text-fill-color: teal;
  border-radius: var(--radius);
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  margin-right: 10px;
  transition: all 0.15s ease-in-out;
}

.token-file-input::file-selector-button:hover,
.token-file-input::-webkit-file-upload-button:hover,
.map-file-input::file-selector-button:hover,
.map-file-input::-webkit-file-upload-button:hover {
  background-color: #051414 !important;
  border-color: #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
}

.map-bg-btn-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.avatar-upload-box {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px;
  box-sizing: border-box;
  max-width: 100%;
}

.avatar-preview-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 3px solid #666666;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.token-avatar-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-empty-placeholder {
  font-size: 10px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.1;
}

.avatar-controls {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
}

.file-btn-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  box-sizing: border-box;
}

.token-file-input {
  max-width: 100%;
  min-width: 0;
}

.btn-browse-avatar {
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid teal !important;
  color: teal !important;
  -webkit-text-fill-color: teal;
  border-radius: var(--radius);
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

.btn-clear-avatar {
  background: #000000 !important;
  border: 1px solid teal !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-clear-avatar:hover {
  background: #051414 !important;
  border-color: #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  box-shadow: 0 0 6px rgba(0, 128, 128, 0.4);
}

.uploading-spinner {
  font-size: 12px;
  color: #00a8a8;
  font-style: italic;
}

.avatar-url-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 12px;
  padding: 6px 10px;
}

.btn-modal-cancel {
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid teal !important;
  color: teal !important;
  -webkit-text-fill-color: teal;
  padding: 6px 14px;
  border-radius: var(--radius);
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

.btn-add-token-submit {
  background-color: #021a1e !important;
  background: #021a1e !important;
  border: 1px solid aquamarine !important;
  color: aquamarine !important;
  -webkit-text-fill-color: aquamarine;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: var(--radius);
  box-shadow: 0 0 10px rgba(127, 255, 212, 0.25);
  transition: all 0.15s ease-in-out;
}

.btn-add-token-submit:hover:not(:disabled) {
  background-color: #04272d !important;
  background: #04272d !important;
  border-color: #a8ffea !important;
  color: #a8ffea !important;
  -webkit-text-fill-color: #a8ffea;
  box-shadow: 0 0 16px rgba(127, 255, 212, 0.5);
}

.btn-add-token-submit:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(127, 255, 212, 0.4);
}

.full-width {
  width: 100%;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.danger {
  background: var(--danger);
  color: #fff;
  border-color: var(--danger);
}

.btn-delete-token,
.inspector-actions .danger {
  background: #340c0e !important;
  color: #f85149 !important;
  border: 1px solid #da3633 !important;
  box-shadow: 0 0 6px rgba(218, 54, 51, 0.25);
  transition: all 0.15s ease-in-out;
}

.btn-delete-token:hover:not(:disabled),
.inspector-actions .danger:hover:not(:disabled) {
  background: #4a1316 !important;
  border-color: #ff6b6b !important;
  color: #ff8585 !important;
  box-shadow: 0 0 10px rgba(248, 81, 73, 0.45);
}

.size-select,
.size-select option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
}

.size-select {
  border: 1px solid rgba(0, 128, 128, 0.6) !important;
  border-radius: var(--radius);
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 500;
  width: 100%;
}

.size-select:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.4);
}

.empty-text {
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: 8px 0;
}

.no-map-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(13, 17, 23, 0.85);
  backdrop-filter: blur(4px);
  z-index: 10;
}

.no-map-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 440px;
  padding: 32px;
  background: var(--bg-secondary, #161b22);
  border: 1px solid var(--border, #30363d);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.no-map-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.no-map-card h3 {
  font-size: 20px;
  color: var(--text-primary, #f0f6fc);
  margin-bottom: 8px;
}

.no-map-card p {
  font-size: 14px;
  color: var(--text-secondary, #8b949e);
  line-height: 1.5;
  margin-bottom: 20px;
}

.no-map-actions {
  display: flex;
  gap: 12px;
}

/* Bottom-Corner Die Roll Log HUD */
.roll-log-hud {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 105;
  pointer-events: auto;
}

.btn-roll-log-pill {
  background: #000000 !important;
  border: 1px solid rgba(0, 128, 128, 0.7) !important;
  color: #00ffff !important;
  -webkit-text-fill-color: #00ffff;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-roll-log-pill:hover {
  background: #051414 !important;
  border-color: aqua !important;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
}

.roll-log-card {
  width: 290px;
  max-height: 290px;
  background: #000000;
  border: 1px solid rgba(0, 128, 128, 0.8);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.roll-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #051414;
  border-bottom: 1px solid rgba(0, 128, 128, 0.5);
}

.roll-log-title {
  font-size: 12px;
  font-weight: 700;
  color: #00ffff;
  letter-spacing: 0.5px;
}

.roll-log-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-roll-log-clear {
  background: transparent !important;
  border: 1px solid rgba(0, 128, 128, 0.5) !important;
  color: #8b949e !important;
  -webkit-text-fill-color: #8b949e;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-roll-log-clear:hover:not(:disabled) {
  border-color: #f85149 !important;
  color: #f85149 !important;
  -webkit-text-fill-color: #f85149;
}

.btn-roll-log-toggle {
  background: transparent !important;
  border: none !important;
  color: #00ffff !important;
  -webkit-text-fill-color: #00ffff;
  font-size: 11px;
  padding: 2px 4px;
}

.roll-log-body {
  padding: 6px 10px;
  max-height: 240px;
  overflow-y: auto;
}

.roll-log-empty {
  font-size: 11px;
  color: #8b949e;
  text-align: center;
  padding: 12px 0;
  font-style: italic;
}

.roll-log-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.roll-log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  background: rgba(10, 25, 25, 0.5);
  border: 1px solid rgba(0, 128, 128, 0.25);
  border-radius: 4px;
}

.roll-log-item.percentile {
  border-left: 3px solid #00ffff;
}

.roll-log-item.damage {
  border-left: 3px solid #f29249;
}

.roll-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.roll-item-time {
  font-size: 10px;
  color: #8b949e;
  font-family: monospace;
}

.roll-item-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  background: #021a1e;
  color: #a8ffea;
  border: 1px solid rgba(0, 128, 128, 0.5);
}

.roll-log-item.damage .roll-item-badge {
  background: #140409;
  color: #f29249;
  border-color: rgba(242, 146, 73, 0.5);
}

.roll-item-result {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.roll-item-total {
  font-size: 14px;
  font-weight: 800;
  color: #00ffff;
}

.roll-log-item.damage .roll-item-total {
  color: #f29249;
}

.roll-item-breakdown {
  font-size: 10px;
  color: #a0a0a0;
  font-family: monospace;
}
</style>

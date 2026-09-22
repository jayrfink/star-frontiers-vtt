<template>
  <div class="vtt-view">
    <!-- VTT Header -->
    <header class="vtt-header">
      <div class="header-left">
        <h2 class="map-title">{{ activeMap ? activeMap.name : 'No Active Space Map' }}</h2>
        <span v-if="activeMap" class="map-meta">
          {{ activeMap.width }}x{{ activeMap.height }} hexes ({{ activeMap.grid_size }}px)
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
          🚀 GM Map Manager
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
          </div>
        </div>

        <button class="btn-tool" @click="clearDice">
          ✖ Clear Dice
        </button>
        <div class="toolbar-divider"></div>

        <div class="shortcut-tip" title="Rotate selected ship token: Q for counter-clockwise (-60°), E for clockwise (+60°)">
          <span class="key-badge">Q</span>
          <span class="key-badge">E</span>
          <small>Rotate</small>
        </div>
      </nav>

      <!-- Canvas Area -->
      <div class="vtt-canvas-wrapper" style="position: relative;">

        <!-- Dice Box Overlay -->
        <div id="dice-box" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 100;"></div>

        <SpaceVttCanvas
          :map="activeMap"
          :tokens="tokens"
          :active-tool="activeTool"
          v-model:zoom-level="zoomLevel"
          :selected-token-id="selectedTokenId"
          @token-moved="onTokenMoved"
          @token-selected="onTokenSelected"
        />

        <!-- No Active Map Overlay -->
        <div v-if="!activeMap" class="no-map-overlay">
          <div class="no-map-card">
            <div class="no-map-icon">🚀</div>
            <h3>No Active Space Map</h3>
            <p v-if="isGm">
              You are logged in as <strong>GameMaster</strong>. Create a space tactical map or select an existing map to activate it for all players.
            </p>
            <p v-else>
              Logged in as <strong>Player</strong>. Waiting for the GameMaster to activate a space tactical map...
            </p>
            <div v-if="isGm" class="no-map-actions">
              <button class="primary" @click="openCreateMapModal">+ Create Space Map</button>
              <button class="btn-gm" @click="showGmDrawer = true">🚀 Open GM Map Manager</button>
            </div>
          </div>
        </div>
      </div>

      <!-- GM Drawer / Map Manager Modal -->
      <div v-if="showGmDrawer && isGm" class="drawer-backdrop" @click.self="showGmDrawer = false">
        <aside class="gm-drawer">
          <div class="drawer-header">
            <h3>🚀 GM Space Map Manager</h3>
            <button class="close-btn" @click="showGmDrawer = false">×</button>
          </div>

          <div class="drawer-content">
            <!-- Create Map Action -->
            <div class="section-actions">
              <button class="primary full-width" @click="openCreateMapModal">+ Create New Space Map</button>
            </div>

            <!-- Active Map Settings -->
            <div v-if="activeMap" class="section-box">
              <h4>Active Map Settings</h4>
              <div class="form-group">
                <label>Hex Grid Size (px):</label>
                <input
                  type="number"
                  v-model.number="activeMapForm.grid_size"
                  min="20"
                  max="100"
                  @change="updateActiveMapSettings"
                />
              </div>
              <div class="form-group">
                <label>Grid Line Color:</label>
                <input
                  type="color"
                  v-model="activeMapForm.grid_color"
                  @change="updateActiveMapSettings"
                />
              </div>
              <div class="form-group">
                <label>Background Preset:</label>
                <select v-model="activeMapForm.preset_bg" @change="updateActiveMapSettings">
                  <option value="starfield">Starfield (Space)</option>
                  <option value="grid_only">Grid Only</option>
                  <option value="volturnus_desert">Volturnus Desert</option>
                  <option value="ship_deck">Ship Deck</option>
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
                <input type="file" accept="image/*" @change="onActiveMapUpload" />
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
                    <small>{{ m.width }}x{{ m.height }} hexes ({{ m.preset_bg }})</small>
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
                :style="{ backgroundColor: selectedToken.color || '#84d1d1' }"
              ></span>
              <h4>{{ selectedToken.name }}</h4>
            </div>

            <!-- Linked Ship / Character -->
            <div class="info-row" v-if="selectedToken.character_id">
              <span class="label">Linked ID:</span>
              <span class="value">#{{ selectedToken.character_id }}</span>
            </div>

            <!-- Position -->
            <div class="info-row">
              <span class="label">Hex Position:</span>
              <span class="value">({{ selectedToken.x }}, {{ selectedToken.y }})</span>
            </div>

            <!-- Current Speed Control -->
            <div class="form-group">
              <label>Current Speed (hexes/turn):</label>
              <div class="input-with-buttons">
                <input
                  type="number"
                  v-model.number="selectedTokenForm.current_speed"
                  min="0"
                  placeholder="0"
                  @change="updateSelectedToken"
                />
                <div class="btn-group-sm">
                  <button type="button" @click="adjustSelectedSpeed(-1)" :disabled="selectedTokenForm.current_speed <= 0">-1</button>
                  <button type="button" @click="adjustSelectedSpeed(1)">+1</button>
                </div>
              </div>
            </div>

            <!-- Heading / Rotation Control -->
            <div class="form-group">
              <div class="label-with-hint">
                <label>Heading / Rotation (°):</label>
                <span class="hint-text">Q / E</span>
              </div>
              <div class="input-with-buttons">
                <input
                  type="number"
                  v-model.number="selectedTokenForm.rotation"
                  step="60"
                  min="0"
                  max="359"
                  placeholder="0"
                  @change="normalizeAndSaveRotation"
                />
                <div class="btn-group-sm">
                  <button type="button" title="Rotate -60° (Q)" @click="rotateSelectedToken(-60)">⟲ -60°</button>
                  <button type="button" title="Rotate +60° (E)" @click="rotateSelectedToken(60)">⟳ +60°</button>
                </div>
              </div>
            </div>

            <!-- Hull Points (HP) Adjuster -->
            <div class="hp-section">
              <label>Hull Points (HP):</label>
              <div class="hp-inputs">
                <input
                  type="number"
                  v-model.number="selectedTokenForm.current_hp"
                  placeholder="Current"
                  @change="updateSelectedToken"
                />
                <span>/</span>
                <input
                  type="number"
                  v-model.number="selectedTokenForm.max_hp"
                  placeholder="Max"
                  @change="updateSelectedToken"
                />
              </div>
              <div class="hp-quick-buttons">
                <button @click="adjustSelectedHp(-5)">-5</button>
                <button @click="adjustSelectedHp(-1)">-1</button>
                <button @click="adjustSelectedHp(1)">+1</button>
                <button @click="adjustSelectedHp(5)">+5</button>
              </div>
            </div>

            <!-- Tactical Status Effects -->
            <div class="status-section">
              <label>Status Effects:</label>
              <div class="status-toggles">
                <button
                  :class="{ active: isStatusActive('damaged') }"
                  @click="toggleStatus('damaged')"
                >
                  💥 Damaged
                </button>
                <button
                  :class="{ active: isStatusActive('adrift') }"
                  @click="toggleStatus('adrift')"
                >
                  🛰️ Adrift
                </button>
                <button
                  :class="{ active: isStatusActive('disabled') }"
                  @click="toggleStatus('disabled')"
                >
                  ⚡ Disabled
                </button>
                <button
                  :class="{ active: isStatusActive('burning') }"
                  @click="toggleStatus('burning')"
                >
                  🔥 Burning
                </button>
              </div>
            </div>

            <!-- Token Color -->
            <div class="form-group">
              <label>Ring Color:</label>
              <input
                type="color"
                v-model="selectedTokenForm.color"
                @change="updateSelectedToken"
              />
            </div>

            <!-- Action Buttons -->
            <div class="inspector-actions">
              <button class="danger full-width" @click="deleteSelectedToken">Delete Token</button>
            </div>
          </div>

          <!-- Token List When None Selected -->
          <div v-else-if="tokens.length > 0" class="section-box">
            <h4>Tokens on Map ({{ tokens.length }})</h4>
            <ul class="token-list">
              <li
                v-for="t in tokens"
                :key="t.id"
                :class="{ active: selectedTokenId === t.id }"
                @click="selectedTokenId = t.id"
              >
                <div class="token-item-left">
                  <span class="token-dot" :style="{ backgroundColor: t.color || '#84d1d1' }"></span>
                  <strong>{{ t.name }}</strong>
                </div>
                <div class="token-item-right">
                  <span class="badge-speed" title="Current Speed">⚡{{ t.current_speed ?? 0 }}</span>
                  <span class="badge-rotation" title="Heading">🧭{{ t.rotation ?? 0 }}°</span>
                  <small>({{ t.x }}, {{ t.y }})</small>
                </div>
              </li>
            </ul>
          </div>
          <div v-else class="empty-text">
            No tokens on map. Click "+ Add New Token" above to add one.
          </div>
        </div>
      </aside>
    </div>

    <!-- Modal: Create Space Map -->
    <div v-if="showCreateMapModal" class="modal-backdrop" @click.self="showCreateMapModal = false">
      <div class="modal-card">
        <h3>Create New Tactical Space Map</h3>
        <form @submit.prevent="submitCreateMap">
          <div class="form-group">
            <label>Map Name *</label>
            <input type="text" v-model="newMapForm.name" required placeholder="e.g. Battle of Pale" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Width (hexes)</label>
              <input type="number" v-model.number="newMapForm.width" min="5" max="100" />
            </div>
            <div class="form-group">
              <label>Height (hexes)</label>
              <input type="number" v-model.number="newMapForm.height" min="5" max="100" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Hex Grid Size (px)</label>
              <input type="number" v-model.number="newMapForm.grid_size" min="20" max="100" />
            </div>
            <div class="form-group">
              <label>Grid Line Color</label>
              <input type="color" v-model="newMapForm.grid_color" />
            </div>
          </div>

          <div class="form-group">
            <label>Background Preset</label>
            <select v-model="newMapForm.preset_bg">
              <option value="starfield">Starfield (Space)</option>
              <option value="grid_only">Grid Only</option>
              <option value="volturnus_desert">Volturnus Desert</option>
              <option value="ship_deck">Ship Deck</option>
            </select>
          </div>

          <div class="form-group">
            <label>Custom Image URL (Optional)</label>
            <input type="text" v-model="newMapForm.background_url" placeholder="Image URL or upload file" />
            <input type="file" accept="image/*" @change="e => uploadMapImage(e, newMapForm)" />
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="newMapForm.is_active" />
              Set as Active Map immediately
            </label>
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="newMapForm.fog_enabled" />
              Enable Fog of War
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" @click="showCreateMapModal = false">Cancel</button>
            <button type="submit" class="primary">Create Map</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Add Token -->
    <div v-if="showAddTokenModal" class="modal-backdrop" @click.self="showAddTokenModal = false">
      <div class="modal-card">
        <h3>Add Token to Space Map</h3>
        <form @submit.prevent="submitAddToken">

          <!-- Counter Presets -->
          <div class="form-group">
            <label>Knight Hawks Counter Presets:</label>
            <div class="preset-counters">
              <button
                type="button"
                class="counter-btn"
                v-for="preset in counterPresets"
                :key="preset.name"
                @click="applyCounterPreset(preset)"
              >
                <img :src="preset.avatar_url" :alt="preset.name" class="preset-thumb" />
                <span>{{ preset.name }}</span>
              </button>
            </div>
          </div>

          <!-- Link to Ship Sheet -->
          <div class="form-group" v-if="ships.length > 0">
            <label>Link to Ship Sheet (Optional)</label>
            <select v-model="selectedShipId" @change="onShipSelected">
              <option :value="null">-- None (Custom Ship / Token) --</option>
              <option v-for="s in ships" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.ship_type || 'Ship' }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Token Name *</label>
            <input type="text" v-model="newTokenForm.name" required placeholder="e.g. UPF Defender" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Ring Color</label>
              <input type="color" v-model="newTokenForm.color" />
            </div>
            <div class="form-group">
              <label>Initial Speed</label>
              <input type="number" v-model.number="newTokenForm.current_speed" min="0" placeholder="0" />
            </div>
            <div class="form-group">
              <label>Initial Rotation (°)</label>
              <select v-model.number="newTokenForm.rotation">
                <option :value="0">0° (East)</option>
                <option :value="60">60°</option>
                <option :value="120">120°</option>
                <option :value="180">180° (West)</option>
                <option :value="240">240°</option>
                <option :value="300">300°</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Current HP / Hull</label>
              <input type="number" v-model.number="newTokenForm.current_hp" placeholder="15" />
            </div>
            <div class="form-group">
              <label>Max HP / Hull</label>
              <input type="number" v-model.number="newTokenForm.max_hp" placeholder="15" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Start Hex Q (X)</label>
              <input type="number" v-model.number="newTokenForm.x" min="0" />
            </div>
            <div class="form-group">
              <label>Start Hex R (Y)</label>
              <input type="number" v-model.number="newTokenForm.y" min="0" />
            </div>
          </div>

          <div class="form-group">
            <label>Token Image / Avatar (Optional)</label>
            <input type="text" v-model="newTokenForm.avatar_url" placeholder="Image URL or upload file" />
            <input type="file" accept="image/*" @change="uploadImage" />
          </div>

          <div class="modal-actions">
            <button type="button" @click="showAddTokenModal = false">Cancel</button>
            <button type="submit" class="primary">Add Token</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import SpaceVttCanvas from '../components/SpaceVttCanvas.vue';
import { useAuthStore } from '../stores/auth.js';
import { socket } from '../services/socket.js';
import DiceBox from '@3d-dice/dice-box';


const authStore = useAuthStore();
const isGm = computed(() => authStore.user?.role === 'GameMaster');


// Dice state
let diceBoxInstance = null;
const damageDiceCount = ref(1);
const showDmgMenu = ref(false);
const dmgMenuRef = ref(null);

function adjustDamageCount(delta) {
  damageDiceCount.value = Math.max(1, Math.min(20, damageDiceCount.value + delta));
}

function toggleDmgMenu() {
  showDmgMenu.value = !showDmgMenu.value;
}

function rollPercentile() {
  if (diceBoxInstance) {
    diceBoxInstance.roll([
      { sides: 10, theme: 'custom-tens', themeColor: '#22384a', qty: 1 }, // Tens
      { sides: 10, theme: 'custom-ones', themeColor: '#77d19e', qty: 1 }  // Ones
    ]);
  }
}

function rollDamage() {
  if (diceBoxInstance) {
    diceBoxInstance.roll([
      { sides: 10, theme: 'custom-dmg', themeColor: '#140409', qty: damageDiceCount.value }
    ]);
  }
  showDmgMenu.value = false;
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
const ships = ref([]);

// UI State
const activeTool = ref('select');
const zoomLevel = ref(1.0);
const selectedTokenId = ref(null);
const showGmDrawer = ref(false);
const showTokenSidebar = ref(true);
const showCreateMapModal = ref(false);
const showAddTokenModal = ref(false);
const selectedShipId = ref(null);

// Counter Presets
const counterPresets = [
  {
    name: 'UPF Assault Scout',
    avatar_url: '/tokens/space/upf_assault_scout.png',
    hp: 15,
    color: '#84d1d1',
  },
  {
    name: 'Sathar Destroyer',
    avatar_url: '/tokens/space/sathar_destroyer.png',
    hp: 50,
    color: '#ef4444',
  },
  {
    name: 'Planet Volturnus',
    avatar_url: '/tokens/space/planet_volturnus.png',
    hp: 100,
    color: '#10b981',
  },
];

function applyCounterPreset(preset) {
  newTokenForm.name = preset.name;
  newTokenForm.avatar_url = preset.avatar_url;
  newTokenForm.current_hp = preset.hp;
  newTokenForm.max_hp = preset.hp;
  newTokenForm.color = preset.color;
}

// Forms
const activeMapForm = reactive({
  grid_size: 40,
  grid_color: '#334155',
  preset_bg: 'starfield',
  background_url: '',
  fog_enabled: false,
});

const newMapForm = reactive({
  name: '',
  map_type: 'space',
  width: 20,
  height: 20,
  grid_size: 40,
  grid_color: '#334155',
  preset_bg: 'starfield',
  background_url: '',
  is_active: true,
  fog_enabled: false,
});

const newTokenForm = reactive({
  name: '',
  color: '#84d1d1',
  avatar_url: '/tokens/space/upf_assault_scout.png',
  x: 0,
  y: 0,
  size: 1,
  current_hp: 15,
  max_hp: 15,
  current_speed: 0,
  rotation: 0,
});

const selectedTokenForm = reactive({
  current_hp: 0,
  max_hp: 0,
  color: '#84d1d1',
  size: 1,
  status_effects: [],
  current_speed: 0,
  rotation: 0,
});

const selectedToken = computed(() => {
  if (!selectedTokenId.value) return null;
  return tokens.value.find((t) => t.id === selectedTokenId.value) || null;
});

// Watch selectedToken to sync reactive form
watch(selectedToken, (newToken) => {
  if (newToken) {
    selectedTokenForm.current_hp = newToken.current_hp ?? 0;
    selectedTokenForm.max_hp = newToken.max_hp ?? 0;
    selectedTokenForm.color = newToken.color || '#84d1d1';
    selectedTokenForm.size = newToken.size || 1;
    selectedTokenForm.status_effects = [...(newToken.status_effects || [])];
    selectedTokenForm.current_speed = newToken.current_speed ?? 0;
    selectedTokenForm.rotation = newToken.rotation ?? 0;
  }
});

// Watch activeMap to update local settings form
watch(activeMap, (map) => {
  if (map) {
    activeMapForm.grid_size = map.grid_size || 40;
    activeMapForm.grid_color = map.grid_color || '#334155';
    activeMapForm.preset_bg = map.preset_bg || 'starfield';
    activeMapForm.background_url = map.background_url || '';
    activeMapForm.fog_enabled = Boolean(map.fog_enabled);
  }
});

// Keyboard rotation shortcuts: Q (-60) and E (+60)
function onKeyDown(e) {
  // Ignore shortcuts when user is typing into input fields
  const target = e.target;
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  ) {
    return;
  }

  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (showCreateMapModal.value || showAddTokenModal.value) return;

  if (!selectedToken.value) return;

  if (e.key === 'q' || e.key === 'Q') {
    e.preventDefault();
    rotateSelectedToken(-60);
  } else if (e.key === 'e' || e.key === 'E') {
    e.preventDefault();
    rotateSelectedToken(60);
  }
}

async function rotateSelectedToken(delta) {
  if (!selectedToken.value) return;

  const currentRotation = selectedToken.value.rotation || 0;
  let newRotation = (currentRotation + delta) % 360;
  if (newRotation < 0) newRotation += 360;

  // Immediate local update for responsive UI
  selectedTokenForm.rotation = newRotation;
  selectedToken.value.rotation = newRotation;

  try {
    const res = await fetch(`/api/tokens/${selectedToken.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rotation: newRotation }),
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = tokens.value.findIndex((t) => t.id === updated.id);
      if (idx !== -1) {
        tokens.value[idx] = updated;
      }
    }
  } catch (err) {
    console.error('Failed to rotate token:', err);
  }
}

function normalizeAndSaveRotation() {
  let rot = Number(selectedTokenForm.rotation) || 0;
  rot = ((rot % 360) + 360) % 360;
  selectedTokenForm.rotation = rot;
  updateSelectedToken();
}

function adjustSelectedSpeed(delta) {
  selectedTokenForm.current_speed = Math.max(0, (selectedTokenForm.current_speed || 0) + delta);
  updateSelectedToken();
}

// API Calls
async function fetchActiveMap() {
  try {
    const res = await fetch('/api/maps/active?type=space', { credentials: 'include' });
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
    const res = await fetch('/api/maps?type=space', { credentials: 'include' });
    if (res.ok) {
      mapList.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch maps:', err);
  }
}

async function fetchShips() {
  try {
    const res = await fetch('/api/ships', { credentials: 'include' });
    if (res.ok) {
      ships.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch ships:', err);
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
        fog_enabled: activeMapForm.fog_enabled,
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
  newMapForm.map_type = 'space';
  newMapForm.width = 20;
  newMapForm.height = 20;
  newMapForm.grid_size = 40;
  newMapForm.grid_color = '#334155';
  newMapForm.preset_bg = 'starfield';
  newMapForm.background_url = '';
  newMapForm.is_active = true;
  newMapForm.fog_enabled = false;
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
      const created = await res.json();
      showCreateMapModal.value = false;
      fetchMapList();
      if (newMapForm.is_active) {
        activateMap(created.id);
      }
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
function openAddTokenModal() {
  selectedShipId.value = null;
  newTokenForm.name = 'UPF Assault Scout';
  newTokenForm.color = '#84d1d1';
  newTokenForm.avatar_url = '/tokens/space/upf_assault_scout.png';
  newTokenForm.x = 0;
  newTokenForm.y = 0;
  newTokenForm.size = 1;
  newTokenForm.current_hp = 15;
  newTokenForm.max_hp = 15;
  newTokenForm.current_speed = 0;
  newTokenForm.rotation = 0;
  showAddTokenModal.value = true;
}

async function uploadImage(event) {
  const file = event.target?.files?.[0];
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
      newTokenForm.avatar_url = data.url || data;
    } else {
      console.error('Failed to upload image: status', res.status);
    }
  } catch (err) {
    console.error('Failed to upload image:', err);
  }
}


function onShipSelected() {
  if (!selectedShipId.value) return;
  const ship = ships.value.find((s) => s.id === selectedShipId.value);
  if (ship) {
    newTokenForm.name = ship.name;
    const hp = ship.current_hp ?? ship.hull_points ?? 30;
    newTokenForm.current_hp = hp;
    newTokenForm.max_hp = ship.hull_points ?? hp;
    if (ship.ship_type?.toLowerCase().includes('scout')) {
      newTokenForm.avatar_url = '/tokens/space/upf_assault_scout.png';
    } else if (ship.ship_type?.toLowerCase().includes('destroyer')) {
      newTokenForm.avatar_url = '/tokens/space/sathar_destroyer.png';
    }
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
        character_id: selectedShipId.value || null,
        name: newTokenForm.name,
        color: newTokenForm.color,
        avatar_url: newTokenForm.avatar_url,
        x: newTokenForm.x,
        y: newTokenForm.y,
        size: newTokenForm.size,
        current_hp: newTokenForm.current_hp,
        max_hp: newTokenForm.max_hp,
        rotation: newTokenForm.rotation || 0,
        current_speed: newTokenForm.current_speed || 0,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      showAddTokenModal.value = false;
      selectedTokenId.value = created.id;
    }
  } catch (err) {
    console.error('Failed to create token:', err);
  }
}

async function onTokenMoved({ id, x, y }) {
  try {
    const res = await fetch(`/api/tokens/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ x, y }),
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
  selectedTokenId.value = token ? token.id : null;
}

async function updateSelectedToken() {
  if (!selectedToken.value) return;
  try {
    const res = await fetch(`/api/tokens/${selectedToken.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        current_hp: selectedTokenForm.current_hp,
        max_hp: selectedTokenForm.max_hp,
        color: selectedTokenForm.color,
        size: selectedTokenForm.size,
        status_effects: selectedTokenForm.status_effects,
        current_speed: selectedTokenForm.current_speed,
        rotation: selectedTokenForm.rotation,
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

function adjustSelectedHp(delta) {
  if (!selectedToken.value) return;
  selectedTokenForm.current_hp = Math.max(0, (selectedTokenForm.current_hp || 0) + delta);
  selectedToken.value.current_hp = selectedTokenForm.current_hp;
  updateSelectedToken();
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
  if (selectedToken.value) {
    selectedToken.value.status_effects = [...selectedTokenForm.status_effects];
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
    if (map && map.map_type === 'space') {
      activeMap.value = map;
      tokens.value = newTokens || [];
      selectedTokenId.value = null;
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
        if (selectedTokenId.value === token.id) {
          selectedTokenForm.current_hp = token.current_hp ?? 0;
          selectedTokenForm.max_hp = token.max_hp ?? 0;
          selectedTokenForm.color = token.color || '#84d1d1';
          selectedTokenForm.size = token.size || 1;
          selectedTokenForm.status_effects = [...(token.status_effects || [])];
          selectedTokenForm.current_speed = token.current_speed ?? 0;
          selectedTokenForm.rotation = token.rotation ?? 0;
        }
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
  fetchActiveMap();
  fetchShips();
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
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onDocClick);
});

onBeforeUnmount(() => {
  cleanupSocketListeners();
  window.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('click', onDocClick);
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
  background: #082d33 !important;
  border: 1px solid #14b8a6 !important;
  color: #2dd4bf !important;
  font-weight: 700;
  box-shadow: none;
  text-shadow: none;
  transition: all 0.15s ease-in-out;
}

.btn-add-token:hover {
  background: #0d3b44 !important;
  border-color: #2dd4bf !important;
  color: #5eead4 !important;
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

.shortcut-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 6px;
  color: var(--text-secondary);
  font-size: 11px;
}

.key-badge {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 5px;
  font-weight: bold;
  color: var(--text-primary);
  font-size: 10px;
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
  width: 330px;
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

.token-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.token-item-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-speed {
  font-size: 11px;
  background: rgba(105, 199, 158, 0.2);
  color: #69c79e;
  border: 1px solid rgba(105, 199, 158, 0.5);
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
}

.badge-rotation {
  font-size: 11px;
  background: #374151;
  color: #e5e7eb;
  padding: 1px 5px;
  border-radius: 4px;
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

/* Speed & Rotation UI */
.input-with-buttons {
  display: flex;
  gap: 6px;
}

.input-with-buttons input {
  flex: 1;
}

.btn-group-sm {
  display: flex;
  gap: 4px;
}

.btn-group-sm button {
  padding: 4px 8px;
  font-size: 12px;
  white-space: nowrap;
}

.label-with-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hint-text {
  font-size: 11px;
  color: var(--accent);
  background: rgba(88, 166, 255, 0.1);
  padding: 1px 5px;
  border-radius: 3px;
}

.hp-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hp-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hp-quick-buttons {
  display: flex;
  gap: 6px;
}

.hp-quick-buttons button {
  flex: 1;
  padding: 4px;
  font-size: 12px;
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
  width: 460px;
  max-width: 90vw;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;
}





.counter-btn span {
  font-size: 11px;
  color: var(--text-primary);
  line-height: 1.2;
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

.active-badge {
  font-size: 12px;
  color: var(--success);
  font-weight: 600;
  padding: 4px 8px;
}

.preset-counters {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.counter-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  text-align: center;
}

.counter-btn:hover {
  border-color: var(--accent);
  background: rgba(58, 133, 156, 0.05);
}

.preset-thumb {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.counter-btn span {
  font-size: 11px;
  color: var(--text-primary);
}
</style>

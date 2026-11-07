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
          <button title="Reset Zoom" class="btn-sm" @click="zoomLevel = 1.0; panX = 50; panY = 50">Reset</button>
        </div>
      </div>

      <div class="header-right">
        <!-- GM Controls Drawer Toggle -->
        <button v-if="isGm" class="btn-gm" @click="showGmDrawer = !showGmDrawer">
          GM Map Manager
        </button>
        <!-- Token Inspector Toggle -->
        <button
          type="button"
          class="btn-sidebar"
          :class="{ active: showTokenSidebar }"
          @click="toggleTokenSidebar"
          :title="showTokenSidebar ? 'Close Token Inspector' : 'Open Token Inspector'"
        >
          Tokens {{ tokens.length > 0 ? `(${tokens.length})` : '' }}
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
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l3 3"/></svg> Move
        </button>
        <button
          :class="{ active: activeTool === 'pan' }"
          title="Pan Map (or hold Space / Middle Click)"
          @click="activeTool = 'pan'"
        >
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg> Pan
        </button>
        <button
          :class="{ active: activeTool === 'ping' }"
          title="Tactical Ping (Click or drag on map)"
          @click="activeTool = 'ping'"
        >
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg> Ping
        </button>
        <button
          v-if="hasMyActivePing"
          class="btn-tool btn-clear-ping"
          title="Clear your tactical ping"
          @click="clearMyPing"
        >
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg> Clear Ping
        </button>
        <button
          v-if="isGm && activePingsList.length > 0"
          class="btn-tool btn-clear-all-pings"
          title="Clear all tactical pings"
          @click="clearAllPings"
        >
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg> Clear All Pings
        </button>
        
        <button v-if="isGm" class="btn-tool btn-initiative" @click="rollInitiative" title="Roll Combat Initiative (Players vs. Opposition 2d10)">
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Initiative
        </button>

        <button class="btn-tool" @click="rollPercentile">
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/><text x="12" y="15" text-anchor="middle" font-size="9" fill="currentColor" stroke="none" font-weight="bold">%</text></svg> Roll d%
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
              <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 20 12 16.5 6.5 20 8 13.5 3 9l6.5-.5L12 2z"/></svg> DMG Die ({{ damageDiceCount }}d10)
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
              <span><svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 20 12 16.5 6.5 20 8 13.5 3 9l6.5-.5L12 2z"/></svg> Damage Dice</span>
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
              <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/></svg> Roll {{ damageDiceCount }}d10 Damage
            </button>
            <div v-if="lastDamageRoll" class="dmg-last-roll-card">
              <div class="last-roll-header">Last Roll ({{ lastDamageRoll.count }}d10):</div>
              <div class="last-roll-result">
                <span class="last-roll-total">{{ lastDamageRoll.total }}</span>
                <span class="last-roll-breakdown">[{{ Array.isArray(lastDamageRoll?.dice) ? lastDamageRoll.dice.join(', ') : '' }}]</span>
              </div>
            </div>
          </div>
        </div>

        <button class="btn-tool" @click="clearDice">
          <svg class="tool-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9l6 6M15 9l-6 6"/></svg> Clear Dice
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

        <!-- Collapsible Die Roll Log HUD -->
        <div class="roll-log-hud">
          <div v-if="!isRollLogOpen" class="roll-log-pill-row">
            <button
              type="button"
              class="btn-roll-log-pill"
              @click="isRollLogOpen = true"
              title="Open Die Roll Log"
            >
              🎲 Log ({{ rollLog.length }}) ▲
            </button>
            <button
              type="button"
              class="btn-audio-toggle btn-audio-toggle-pill"
              @click="toggleAudioMute"
              :title="isDiceAudioMuted ? 'Unmute dice audio' : 'Mute dice audio'"
              :aria-label="isDiceAudioMuted ? 'Unmute dice audio' : 'Mute dice audio'"
              :aria-pressed="!isDiceAudioMuted"
            >
              {{ isDiceAudioMuted ? '🔇' : '🔊' }}
            </button>
          </div>
          <div v-else class="roll-log-card">
            <div class="roll-log-header">
              <div class="roll-log-title">🎲 Roll Log ({{ rollLog.length }}/20)</div>
              <div class="roll-log-actions">
                <button
                  type="button"
                  class="btn-audio-toggle"
                  @click="toggleAudioMute"
                  :title="isDiceAudioMuted ? 'Unmute dice audio' : 'Mute dice audio'"
                  :aria-label="isDiceAudioMuted ? 'Unmute dice audio' : 'Mute dice audio'"
                  :aria-pressed="!isDiceAudioMuted"
                >
                  {{ isDiceAudioMuted ? '🔇' : '🔊' }}
                </button>
                <button v-if="isGm" type="button" class="btn-roll-log-clear" @click="clearRollLog" :disabled="rollLog.length === 0" title="Clear log">Clear</button>
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
                    <span v-if="item.username" class="roll-user-badge" :class="item.role?.toLowerCase()">
                      {{ item.username }}
                    </span>
                    <span class="roll-item-time">{{ formatRollTime(item) }}</span>
                    <span class="roll-item-badge">{{ item.label }}</span>
                  </div>
                  <div class="roll-item-result">
                    <template v-if="item.type === 'initiative'">
                      <div class="init-log-pills" v-if="(item.rollSummary || item.roll_summary)?.playerRoll">
                        <span class="init-pill-player">Players: {{ (item.rollSummary || item.roll_summary).playerRoll }}</span>
                        <span class="init-pill-opp">Opposition: {{ (item.rollSummary || item.roll_summary).oppRoll }}</span>
                      </div>
                      <span v-else class="roll-item-breakdown">{{ item.breakdown }}</span>
                    </template>
                    <template v-else>
                      <span class="roll-item-total">{{ item.total }}</span>
                      <span class="roll-item-breakdown">{{ item.breakdown }}</span>
                    </template>
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
              <div class="hud-title">
                <span v-if="lastDamageRoll.username" class="hud-user-tag" :class="lastDamageRoll.role?.toLowerCase()">
                  {{ lastDamageRoll.role === 'GameMaster' ? 'GM' : 'PLAYER' }} {{ lastDamageRoll.username }}
                </span>
                💥 Damage Roll ({{ lastDamageRoll.count }}d10)
              </div>
              <button class="hud-close" @click.stop="showDamageHud = false">&times;</button>
            </div>
            <div class="hud-body">
              <span class="hud-total">{{ lastDamageRoll.total }}</span>
              <span class="hud-dice">({{ lastDamageRoll.dice?.length ? lastDamageRoll.dice.join(' + ') : lastDamageRoll.breakdown }})</span>
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
              <div class="hud-title">
                <span v-if="lastPercentileRoll.username" class="hud-user-tag" :class="lastPercentileRoll.role?.toLowerCase()">
                  {{ lastPercentileRoll.role === 'GameMaster' ? 'GM' : 'PLAYER' }} {{ lastPercentileRoll.username }}
                </span>
                🎲 Percentile Roll (d%)
              </div>
              <button class="hud-close" @click.stop="showPercentileHud = false">&times;</button>
            </div>
            <div class="hud-body">
              <span class="hud-total">{{ lastPercentileRoll.total }}</span>
              <span class="hud-dice">(<span class="hud-tens-val">Tens: {{ lastPercentileRoll.tens }}</span>, <span class="hud-ones-val">Ones: {{ lastPercentileRoll.ones }}</span>)</span>
            </div>
          </div>
        </transition>

        <!-- Floating Initiative HUD Banner -->
        <transition name="hud-pop">
          <div
            v-if="showInitiativeHud && lastInitiativeRoll"
            class="initiative-hud-banner"
            @click="showInitiativeHud = false"
          >
            <div class="hud-header">
              <div class="hud-title">
                <span v-if="lastInitiativeRoll.username" class="hud-user-tag" :class="lastInitiativeRoll.role?.toLowerCase()">
                  {{ lastInitiativeRoll.role === 'GameMaster' ? 'GM' : 'PLAYER' }} {{ lastInitiativeRoll.username }}
                </span>
                ⚡ Combat Initiative
              </div>
              <button class="hud-close" @click.stop="showInitiativeHud = false">&times;</button>
            </div>
            <div class="hud-body init-hud-body">
              <div class="init-die-box init-player-die">
                <span class="init-label">PLAYERS</span>
                <span class="init-val">{{ lastInitiativeRoll.playerRoll }}</span>
              </div>
              <span class="init-vs">VS</span>
              <div class="init-die-box init-opp-die">
                <span class="init-label">OPPOSITION</span>
                <span class="init-val">{{ lastInitiativeRoll.oppRoll }}</span>
              </div>
            </div>
          </div>
        </transition>

        <!-- Dice Box Overlay -->
        <div id="dice-box" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 200;"></div>

        <SpaceVttCanvas
          :map="activeMap"
          :tokens="tokens"
          :ships="ships"
          :pings="activePingsList"
          :active-tool="activeTool"
          v-model:zoom-level="zoomLevel"
          v-model:pan-x="panX"
          v-model:pan-y="panY"
          :selected-token-id="selectedTokenId"
          @token-moved="onTokenMoved"
          @token-selected="onTokenSelected"
          @tokens-updated="tokens = $event"
          @map-updated="activeMap = $event"
          @ping-update="onPingUpdate"
          @ping-dismiss="onPingDismiss"
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
              <button class="btn-gm" @click="showGmDrawer = true">Open GM Map Manager</button>
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
              <div class="form-group grid-dimensions-group">
                <label>Grid Dimensions (hexes):</label>
                <div class="grid-dimensions-row">
                  <input
                    type="number"
                    list="space-grid-dimension-options"
                    class="grid-width-input"
                    v-model.number="activeMapForm.width"
                    min="5"
                    max="100"
                    placeholder="Width"
                    @change="updateActiveMapSettings"
                  />
                  <span class="grid-dimensions-x">×</span>
                  <input
                    type="number"
                    list="space-grid-dimension-options"
                    class="grid-height-input"
                    v-model.number="activeMapForm.height"
                    min="5"
                    max="100"
                    placeholder="Height"
                    @change="updateActiveMapSettings"
                  />
                  <datalist id="space-grid-dimension-options">
                    <option v-for="n in gridDimensionOptions" :key="n" :value="n"></option>
                  </datalist>
                </div>
              </div>
              <div class="form-group grid-visible-group">
                <label class="grid-visible-label">
                  <input
                    type="checkbox"
                    class="grid-visible-checkbox"
                    v-model="activeMapForm.grid_visible"
                    @change="updateActiveMapSettings"
                  />
                  Show Grid Lines (tokens still snap to grid)
                </label>
              </div>
              <div class="form-group">
                <label>Grid Line Thickness (px):</label>
                <input
                  type="number"
                  list="space-grid-line-width-options"
                  class="grid-line-width-input"
                  v-model.number="activeMapForm.grid_line_width"
                  min="0.1"
                  max="10"
                  step="0.1"
                  @change="updateActiveMapSettings"
                />
                <datalist id="space-grid-line-width-options">
                  <option v-for="n in gridLineWidthOptions" :key="n" :value="n"></option>
                </datalist>
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
                <select v-model="activeMapForm.preset_bg" @change="updateActiveMapSettings" class="space-map-select">
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
          <h3>Token Inspector</h3>
          <button type="button" class="close-btn" @click="closeTokenSidebar" title="Close Token Inspector">×</button>
        </div>

        <div class="sidebar-content">
          <!-- Token Creation Button -->
          <button class="primary full-width btn-add-token" @click="openAddTokenModal">+ Add New Token</button>

          <!-- Selected Token Inspector -->
          <div v-if="selectedToken" class="section-box token-inspector">
            <div class="token-title-row">
              <span
                v-if="!isCelestialToken(selectedToken)"
                class="token-color-badge"
                :style="{ backgroundColor: selectedToken.color || '#666666' }"
              ></span>
              <h4>{{ selectedToken.name }}</h4>
            </div>

            <!-- Celestial Object Badge -->
            <div v-if="isCelestialToken(selectedToken)" class="celestial-badge">
              🪐 Celestial Object (1 Hex)
            </div>

            <!-- Linked Ship / Character -->
            <div class="info-row" v-if="!isCelestialToken(selectedToken) && selectedToken.character_id">
              <span class="label">Linked ID:</span>
              <span class="value">#{{ selectedToken.character_id }}</span>
            </div>

            <!-- Position -->
            <div class="info-row">
              <span class="label">Hex Position:</span>
              <span class="value">({{ selectedToken.x }}, {{ selectedToken.y }})</span>
            </div>

            <!-- GM Player Visibility Toggle -->
            <div v-if="isGm" class="form-group visibility-section">
              <label>Player Visibility:</label>
              <button
                type="button"
                class="btn-toggle-visibility full-width"
                :class="{ 'is-hidden': selectedToken.layer === 'gm' }"
                @click="toggleTokenVisibility(selectedToken)"
              >
                {{ selectedToken.layer === 'gm' ? '🙈 Hidden from Players (GM Only)' : '👁️ Visible to Players' }}
              </button>
            </div>

            <template v-if="!isCelestialToken(selectedToken)">
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

              <!-- Flip & Burn Maneuver (MR >= 3, MR 1-2, Braking Burns & Crew Checks) -->
              <div class="flip-burn-box" :class="{ collapsed: isFlipBurnCollapsed }">
                <div
                  class="flip-burn-header clickable"
                  @click="isFlipBurnCollapsed = !isFlipBurnCollapsed"
                  :title="isFlipBurnCollapsed ? 'Expand Flip & Burn Controls' : 'Collapse Flip & Burn Controls'"
                  role="button"
                  tabindex="0"
                  @keydown.enter.prevent="isFlipBurnCollapsed = !isFlipBurnCollapsed"
                  @keydown.space.prevent="isFlipBurnCollapsed = !isFlipBurnCollapsed"
                >
                  <div class="flip-burn-header-title">
                    <span class="collapse-caret" :class="{ collapsed: isFlipBurnCollapsed }">▼</span>
                    <label>🔄 Flip &amp; Burn</label>
                  </div>
                  <span v-if="selectedTokenLinkedShip" class="mr-pill" :class="{ eligible: selectedTokenCanStandardFlip || selectedTokenCanLumberingFlip }">
                    MR {{ selectedTokenLinkedShip.mr }}
                  </span>
                </div>

                <div v-show="!isFlipBurnCollapsed" class="flip-burn-body">
                  <!-- MR >= 3 Single-Turn Standard Maneuver -->
                  <template v-if="selectedTokenCanStandardFlip">
                    <button
                      type="button"
                      class="btn-flip-burn full-width"
                      title="Reverse heading 180° in 1 turn (no STA check required)"
                      @click="executeStandardFlip"
                    >
                      🔄 Standard Flip (180° - 1 Turn)
                    </button>
                    <small class="flip-burn-hint">
                      Fast vessel (MR &ge; 3): 1-turn in-hex pivot. Compensators absorb rotation; no crew check required.
                    </small>
                  </template>

                  <!-- MR 1-2 Vessels: Lumbering Flip or Emergency Snap Flip -->
                  <template v-else-if="selectedTokenCanLumberingFlip || selectedTokenCanSnapFlip">
                    <div v-if="selectedTokenInMultiTurnFlip" class="multi-turn-progress-banner">
                      ⏳ Multi-Turn Flip in Progress (Turn 1/2 complete: +90°)
                    </div>
                    <button
                      type="button"
                      class="btn-flip-burn full-width"
                      :class="{ 'in-progress': selectedTokenInMultiTurnFlip }"
                      :title="selectedTokenInMultiTurnFlip ? 'Complete Turn 2/2 (+90°, total 180°)' : 'Start Turn 1/2 (+90°)'"
                      @click="executeLumberingFlip"
                    >
                      {{ selectedTokenInMultiTurnFlip ? '🔄 Complete Lumbering Flip (Turn 2/2: +90°)' : '🔄 Start Lumbering Flip (Turn 1/2: +90°)' }}
                    </button>
                    <button
                      v-if="selectedTokenInMultiTurnFlip"
                      type="button"
                      class="btn-cancel-flip"
                      @click="cancelMultiTurnFlip"
                      title="Cancel multi-turn flip state"
                    >
                      ✕ Cancel Flip
                    </button>
                    <small class="flip-burn-hint">
                      {{ selectedTokenInMultiTurnFlip ? 'Turn 2 of 2: Reverses final 90° (total 180°). No STA check required.' : 'Lower agility vessel (MR 1–2): Takes 2 turns to flip at drift speed. No STA check required.' }}
                    </small>

                    <button
                      type="button"
                      class="btn-snap-flip full-width"
                      title="Overload RCS thrusters for 1-turn flip (requires pilot check and crew STA check)"
                      @click="executeSnapFlip()"
                    >
                      ⚠️ Emergency Snap Flip (180° - 1 Turn)
                    </button>
                    <small class="flip-burn-hint warning">
                      Overloads RCS thrusters: Reverses in 1 turn, but crew suffers centrifugal whip (-10% at extremities).
                    </small>
                  </template>

                  <small v-else-if="selectedTokenLinkedShip" class="flip-burn-ineligible">
                    Vessel lacks maneuvering thrusters (MR 0)
                  </small>

                  <!-- Braking Burn Deceleration Section -->
                  <div class="braking-burn-controls">
                    <div class="braking-header">
                      <label>Braking Burn (Deceleration)</label>
                      <div class="braking-input-group">
                        <span class="dv-label">ΔV</span>
                        <input
                          type="number"
                          v-model.number="brakingDeltaV"
                          min="1"
                          max="20"
                          step="1"
                          class="braking-dv-input"
                        />
                      </div>
                    </div>

                    <div v-if="brakingDeltaV <= 3" class="braking-indicator safe">
                      ✅ Safe Deceleration: Compensators active, 0% penalty
                    </div>
                    <div v-else class="braking-indicator high-g">
                      ⚠️ HIGH-G BRAKING BURN: -{{ (brakingDeltaV - 3) * 10 }}% STA check penalty
                    </div>

                    <button
                      type="button"
                      class="btn-braking-burn full-width"
                      :class="{ 'high-g': brakingDeltaV >= 4 }"
                      @click="executeBrakingBurn"
                    >
                      🚀 Execute Braking Burn (ΔV {{ brakingDeltaV }})
                    </button>
                  </div>

                  <!-- Direct button to open Crew G-Load Check Dialog -->
                  <button
                    type="button"
                    class="btn-crew-gcheck-trigger full-width"
                    @click="openCrewGCheckModal('Manual Check')"
                  >
                    🩺 Crew G-Load Check
                  </button>

                  <!-- Direct button to open Orbital Slingshot Modal -->
                  <button
                    type="button"
                    class="btn-slingshot-trigger full-width"
                    @click="openSlingshotModal()"
                    title="Open Orbital Slingshot & Gravity Well Calculator"
                  >
                    🪐 Orbital Slingshot
                  </button>

                  <div class="flip-burn-roll-btns">
                    <button type="button" class="btn-fb-roll" @click="rollFlipAndBurnStaCheck" title="Roll quick d% STA Check">
                      🎲 Quick STA (d%)
                    </button>
                    <button type="button" class="btn-fb-roll blackout" @click="rollFlipAndBurnBlackout" title="Roll 1d10 × 10 seconds blackout duration">
                      💫 Blackout (1d10×10s)
                    </button>
                  </div>
                </div>
              </div>

              <!-- Orbital Slingshot Proximity Box -->
              <div v-if="isSelectedTokenSlingshotEligible" class="slingshot-box">
                <div class="slingshot-header">
                  <label>🪐 Orbital Slingshot</label>
                  <span class="slingshot-badge" v-if="nearestCelestialBody">
                    {{ nearestCelestialBody.name }} (d={{ nearestCelestialBody.distance }})
                  </span>
                </div>
                <button
                  type="button"
                  class="btn-execute-slingshot full-width"
                  @click="openSlingshotModalFromNearest"
                >
                  🪐 Execute Orbital Slingshot
                </button>
                <small class="slingshot-hint">
                  Celestial gravity well detected within slingshot parameters (Speed &ge; 4).
                </small>
              </div>

              <!-- Ship Weapons Section -->
              <div
                v-if="selectedTokenLinkedShip && selectedTokenLinkedShip.weapons && selectedTokenLinkedShip.weapons.length > 0"
                class="token-weapons-section"
                :class="{ collapsed: isWeaponsCollapsed }"
              >
                <div
                  class="token-weapons-header clickable"
                  @click="isWeaponsCollapsed = !isWeaponsCollapsed"
                  :title="isWeaponsCollapsed ? 'Expand Weapons List' : 'Collapse Weapons List'"
                  role="button"
                  tabindex="0"
                  @keydown.enter.prevent="isWeaponsCollapsed = !isWeaponsCollapsed"
                  @keydown.space.prevent="isWeaponsCollapsed = !isWeaponsCollapsed"
                >
                  <div class="token-weapons-header-title">
                    <span class="collapse-caret" :class="{ collapsed: isWeaponsCollapsed }">▼</span>
                    <label>⚔️ Weapons ({{ selectedTokenLinkedShip.weapons.length }})</label>
                  </div>
                  <span class="weapons-count-pill">
                    {{ selectedTokenLinkedShip.weapons.length }} {{ selectedTokenLinkedShip.weapons.length === 1 ? 'gun' : 'guns' }}
                  </span>
                </div>

                <div v-show="!isWeaponsCollapsed" class="token-weapons-list">
                  <div
                    v-for="(wpn, wIdx) in selectedTokenLinkedShip.weapons"
                    :key="wpn.id || wIdx"
                    class="token-weapon-item"
                  >
                    <div class="token-wpn-header">
                      <span class="token-wpn-name">{{ wpn.name || wpn.type }}</span>
                      <span class="token-wpn-stats">{{ wpn.damage }} | Rng {{ wpn.range }}</span>
                    </div>
                    <div class="token-wpn-tags" v-if="wpn.restrictions && wpn.restrictions.length > 0">
                      <span v-for="tag in (wpn.restrictions || [])" :key="tag" class="token-wpn-tag" :class="tag.toLowerCase()">
                        {{ tag }}
                      </span>
                    </div>
                  </div>
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

              <!-- Token Size (Star Frontiers 1-Hex Rule) -->
              <div class="form-group">
                <label>Size:</label>
                <div class="space-token-size-display" title="All ships and celestial bodies strictly occupy 1 hex under Star Frontiers rules">
                  1 Hex (Standard)
                </div>
              </div>

              <!-- Token Color -->
              <div class="form-group">
                <label>Ring Color:</label>
                <input
                  type="color"
                  v-model="selectedTokenForm.color"
                  @input="onColorInput"
                  @change="onColorChange"
                />
              </div>
            </template>

            <!-- Action Buttons -->
            <div class="inspector-actions">
              <button class="danger full-width btn-delete-token" @click="deleteSelectedToken">Delete Token</button>
            </div>
          </div>

          <!-- Token List When None Selected -->
          <div v-else-if="tokens.length > 0" class="section-box">
            <h4>Tokens on Map ({{ tokens.length }})</h4>
            <ul class="token-list">
              <li
                v-for="t in tokens"
                :key="t.id"
                :class="{ active: selectedTokenId === t.id, 'token-row-hidden': t.layer === 'gm' }"
                @click="selectedTokenId = t.id"
              >
                <div class="token-item-left">
                  <span class="token-dot" :style="{ backgroundColor: t.color || '#666666' }"></span>
                  <strong>{{ t.name }}</strong>
                  <span v-if="t.layer === 'gm'" class="token-hidden-badge" title="Hidden from Players">HIDDEN</span>
                </div>
                <div class="token-item-right">
                  <template v-if="!isCelestialToken(t)">
                    <span class="badge-speed token-list-speed" title="Current Speed">⚡{{ t.current_speed ?? 0 }}</span>
                    <span class="badge-rotation token-list-rotation" title="Heading">🧭{{ t.rotation ?? 0 }}°</span>
                  </template>
                  <span v-else class="token-list-celestial" title="Celestial Object">🪐</span>
                  <small>({{ t.x }}, {{ t.y }})</small>
                  <button
                    v-if="isGm"
                    type="button"
                    class="btn-token-list-visibility"
                    :class="{ 'is-hidden': t.layer === 'gm' }"
                    :title="t.layer === 'gm' ? 'Reveal to Players' : 'Hide from Players'"
                    @click.stop="toggleTokenVisibility(t)"
                  >
                    {{ t.layer === 'gm' ? '🙈' : '👁️' }}
                  </button>
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

    <!-- Modal: Create New Map -->
    <div v-if="showCreateMapModal" class="modal-backdrop" @click.self="showCreateMapModal = false">
      <div class="modal-card">
        <h3>Create New Tactical Space Map</h3>
        <div v-if="createMapError" class="modal-error-banner">⚠️ {{ createMapError }}</div>
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
            <select v-model="newMapForm.preset_bg" class="space-map-select">
              <option value="starfield">Starfield (Space)</option>
              <option value="grid_only">Grid Only</option>
              <option value="volturnus_desert">Volturnus Desert</option>
              <option value="ship_deck">Ship Deck</option>
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
        <h3>Add Token to Space Map</h3>
        <div v-if="createTokenError" class="modal-error-banner">⚠️ {{ createTokenError }}</div>
        <form @submit.prevent="submitAddToken">

          <!-- Token Type Toggle -->
          <div class="form-group">
            <label>Token Type</label>
            <div class="token-type-toggle">
              <button
                type="button"
                class="type-btn"
                :class="{ active: newTokenForm.token_type === 'ship' }"
                @click="newTokenForm.token_type = 'ship'"
              >
                🚀 Ship / Station
              </button>
              <button
                type="button"
                class="type-btn"
                :class="{ active: newTokenForm.token_type === 'celestial' }"
                @click="newTokenForm.token_type = 'celestial'"
              >
                🪐 Celestial Object
              </button>
            </div>
          </div>

          <!-- Link to Ship Sheet -->
          <div class="form-group" v-if="newTokenForm.token_type !== 'celestial' && ships.length > 0">
            <label>Link to Ship Sheet (Optional)</label>
            <select v-model="selectedShipId" @change="onShipSelected" class="ship-sheet-select">
              <option :value="null">-- None (Custom Ship / Token) --</option>
              <option v-for="s in ships" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.ship_type || 'Ship' }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Token Name *</label>
            <input type="text" v-model="newTokenForm.name" required placeholder="e.g. UPF Defender" />
            <div v-if="newTokenForm.token_type === 'celestial'" class="preset-chips">
              <span class="preset-label">Presets:</span>
              <button
                v-for="preset in CELESTIAL_PRESET_NAMES"
                :key="preset"
                type="button"
                class="btn-chip"
                @click="newTokenForm.name = preset"
              >
                {{ preset }}
              </button>
            </div>
          </div>

          <div class="form-row" v-if="newTokenForm.token_type !== 'celestial'">
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
              <select v-model.number="newTokenForm.rotation" class="ship-sheet-select">
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
              <label>Start Hex Q (X)</label>
              <input type="number" v-model.number="newTokenForm.x" min="0" />
            </div>
            <div class="form-group">
              <label>Start Hex R (Y)</label>
              <input type="number" v-model.number="newTokenForm.y" min="0" />
            </div>
          </div>

          <div v-if="isGm" class="form-group spawn-hidden-row">
            <label class="spawn-hidden-label">
              <input type="checkbox" v-model="newTokenForm.is_hidden" class="spawn-hidden-checkbox" />
              <span>🙈 Start Hidden from Players (GM Layer)</span>
            </label>
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

    <!-- Modal: Crew G-Load Check Dialog -->
    <div
      v-if="showCrewGCheckModal"
      class="modal-backdrop crew-gcheck-modal-backdrop"
      @click.self="showCrewGCheckModal = false"
    >
      <div class="modal-card crew-gcheck-modal">
        <div class="crew-gcheck-header">
          <h3>🩺 Crew G-Load STA Check</h3>
          <span class="crew-gcheck-ship-name">{{ selectedToken?.name || 'Vessel' }}</span>
        </div>

        <div class="crew-gcheck-trigger-badge">
          <strong>Trigger:</strong> {{ crewCheckReason }}
          <span v-if="crewCheckDeltaV > 3" class="trigger-dv-tag">ΔV {{ crewCheckDeltaV }} (-{{ (crewCheckDeltaV - 3) * 10 }}%)</span>
        </div>

        <div class="form-group">
          <label>Character / Crew Member Name</label>
          <input
            type="text"
            v-model="crewCheckCharName"
            placeholder="e.g. Capt. Wilhemina or Ensign Ricky"
            class="crew-char-input"
          />
        </div>

        <div class="form-group">
          <label>Base Stamina (STA %)</label>
          <div class="sta-input-row">
            <input
              type="number"
              v-model.number="crewCheckBaseSta"
              min="1"
              max="99"
              step="1"
              class="crew-sta-input"
            />
            <span class="input-unit">%</span>
          </div>
        </div>

        <div class="form-group">
          <label>Posture / Restraint</label>
          <div class="posture-options">
            <label class="radio-option" :class="{ selected: crewCheckPosture === 'couch' }">
              <input type="radio" v-model="crewCheckPosture" value="couch" />
              <div class="option-content">
                <span class="option-title">Crash Couch / Strapped-in</span>
                <span class="option-mod bonus">+20%</span>
              </div>
            </label>
            <label class="radio-option" :class="{ selected: crewCheckPosture === 'braced' }">
              <input type="radio" v-model="crewCheckPosture" value="braced" />
              <div class="option-content">
                <span class="option-title">Braced at Console / Bulkhead</span>
                <span class="option-mod neutral">0%</span>
              </div>
            </label>
            <label class="radio-option" :class="{ selected: crewCheckPosture === 'unbraced' }">
              <input type="radio" v-model="crewCheckPosture" value="unbraced" />
              <div class="option-content">
                <span class="option-title">Unbraced / Moving / Boarding</span>
                <span class="option-mod penalty">-20%</span>
              </div>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>Station / Ship Location</label>
          <div class="location-options">
            <label class="radio-option" :class="{ selected: crewCheckLocation === 'midships' }">
              <input type="radio" v-model="crewCheckLocation" value="midships" />
              <div class="option-content">
                <span class="option-title">Midships (Center of Gravity)</span>
                <span class="option-mod neutral">0%</span>
              </div>
            </label>
            <label class="radio-option" :class="{ selected: crewCheckLocation === 'extremity' }">
              <input type="radio" v-model="crewCheckLocation" value="extremity" />
              <div class="option-content">
                <span class="option-title">Bow / Stern Extremity</span>
                <span class="option-mod penalty">-10%</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Live Target STA Breakdown Display -->
        <div class="sta-target-display">
          <div class="sta-formula-row">
            <span class="formula-label">Modified Target STA:</span>
            <span class="formula-breakdown">{{ crewCheckTargetSta.breakdown }}</span>
          </div>
          <div class="sta-target-badge">
            Target: <strong>{{ crewCheckTargetSta.target }}%</strong>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="modal-actions crew-gcheck-actions">
          <button
            type="button"
            class="btn-roll-gcheck"
            @click="rollCrewGCheck"
          >
            🎲 Roll STA Check (d100)
          </button>
          <button
            type="button"
            class="btn-modal-cancel btn-crew-gcheck-close"
            @click="showCrewGCheckModal = false"
          >
            Close
          </button>
        </div>

        <!-- Result Outcome Display -->
        <div v-if="crewCheckLastResult" class="crew-gcheck-result-card" :class="crewCheckLastResult.severity">
          <div class="result-banner">
            <span class="result-icon">
              {{ crewCheckLastResult.success ? '✅' : (crewCheckLastResult.severity === 'stun' ? '💫' : '⚡') }}
            </span>
            <div class="result-titles">
              <div class="result-headline">
                {{ crewCheckLastResult.success ? 'Check Succeeded!' : 'Check Failed!' }}
                (Roll: {{ crewCheckLastResult.roll }} vs Target: {{ crewCheckLastResult.target }}%)
              </div>
              <div class="result-condition">Condition: {{ crewCheckLastResult.condition }}</div>
            </div>
            <span v-if="!crewCheckLastResult.success" class="margin-pill">
              Margin: +{{ crewCheckLastResult.margin }}
            </span>
          </div>

          <div class="result-summary-text">
            {{ crewCheckLastResult.summaryText }}
          </div>

          <div v-if="!crewCheckLastResult.success" class="result-effects-grid">
            <div v-if="crewCheckLastResult.checkPenalty" class="effect-tag penalty">
              Penalty: {{ crewCheckLastResult.checkPenalty }}% next turn
            </div>
            <div v-if="crewCheckLastResult.stunnedTurns" class="effect-tag warning">
              Stunned: {{ crewCheckLastResult.stunnedTurns }} turn(s)
            </div>
            <div v-if="crewCheckLastResult.damageDice" class="effect-tag damage">
              Impact Damage: {{ crewCheckLastResult.damageDice }} HP
            </div>
            <div v-if="crewCheckLastResult.unconsciousTurnsDice" class="effect-tag danger">
              Unconscious: {{ crewCheckLastResult.unconsciousTurnsDice }} turns (6–30s)
            </div>
            <div v-if="crewCheckLastResult.displacementMetersDice" class="effect-tag danger">
              Hurled: {{ crewCheckLastResult.displacementMetersDice }}m forward
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Orbital Slingshot Calculator Dialog -->
    <div
      v-if="showSlingshotModal"
      class="modal-backdrop slingshot-modal-backdrop"
      @click.self="showSlingshotModal = false"
    >
      <div class="modal-card slingshot-modal">
        <div class="slingshot-modal-header">
          <h3>🪐 Orbital Slingshot Calculator</h3>
          <span class="slingshot-ship-name">{{ selectedToken?.name || 'Vessel' }}</span>
        </div>

        <div class="slingshot-grid">
          <!-- Body Type Selection -->
          <div class="form-group">
            <label>Celestial Body Type</label>
            <select v-model="slingshotBodyType" class="slingshot-select">
              <option value="MOON">Moon (Crater Skim: d=0 only)</option>
              <option value="PLANET">Planet (Outer Well: d=1, Skim: d=0)</option>
              <option value="GAS_GIANT">Gas Giant (Outer Well: d=1-2, Deep Skim: d=0)</option>
            </select>
          </div>

          <!-- Hex Distance Selection -->
          <div class="form-group">
            <label>Distance from Body (Hexes)</label>
            <div class="stepper-row">
              <input
                type="number"
                v-model.number="slingshotDistance"
                min="0"
                :max="slingshotBodyType === 'GAS_GIANT' ? 2 : (slingshotBodyType === 'PLANET' ? 1 : 0)"
                class="stepper-input"
              />
              <div class="btn-group-sm">
                <button type="button" @click="slingshotDistance = Math.max(0, slingshotDistance - 1)" :disabled="slingshotDistance <= 0">-1</button>
                <button
                  type="button"
                  @click="slingshotDistance = slingshotDistance + 1"
                  :disabled="slingshotDistance >= (slingshotBodyType === 'GAS_GIANT' ? 2 : (slingshotBodyType === 'PLANET' ? 1 : 0))"
                >+1</button>
              </div>
            </div>
          </div>

          <!-- Entry Speed Input -->
          <div class="form-group">
            <label>Entry Speed (Hexes/Turn, Min 4)</label>
            <div class="stepper-row">
              <input
                type="number"
                v-model.number="slingshotEntrySpeed"
                min="4"
                max="50"
                class="stepper-input"
              />
              <div class="btn-group-sm">
                <button type="button" @click="slingshotEntrySpeed = Math.max(4, slingshotEntrySpeed - 1)" :disabled="slingshotEntrySpeed <= 4">-1</button>
                <button type="button" @click="slingshotEntrySpeed = slingshotEntrySpeed + 1">+1</button>
              </div>
            </div>
          </div>

          <!-- Pilot Skill Input -->
          <div class="form-group">
            <label>Pilot Skill (%)</label>
            <input
              type="number"
              v-model.number="slingshotPilotSkill"
              min="1"
              max="99"
              class="stepper-input full-width"
            />
          </div>

          <!-- Oberth ADF Spent Stepper (Distance 0 only) -->
          <div class="form-group">
            <div class="label-with-hint">
              <label>Oberth Thrust Burn (ADF Spent)</label>
              <span class="hint-text">Dist 0 only (Max {{ maxSlingshotAdf }})</span>
            </div>
            <div class="stepper-row">
              <input
                type="number"
                v-model.number="slingshotAdfSpent"
                min="0"
                :max="maxSlingshotAdf"
                :disabled="slingshotDistance !== 0"
                class="stepper-input"
              />
              <div class="btn-group-sm">
                <button
                  type="button"
                  @click="slingshotAdfSpent = Math.max(0, slingshotAdfSpent - 1)"
                  :disabled="slingshotDistance !== 0 || slingshotAdfSpent <= 0"
                >-1</button>
                <button
                  type="button"
                  @click="slingshotAdfSpent = Math.min(maxSlingshotAdf, slingshotAdfSpent + 1)"
                  :disabled="slingshotDistance !== 0 || slingshotAdfSpent >= maxSlingshotAdf"
                >+1</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Live Parameters Display -->
        <div v-if="liveSlingshotParams.eligible" class="slingshot-preview-card">
          <div class="preview-header">
            <span class="zone-name-badge">Zone: {{ liveSlingshotParams.zoneName }}</span>
            <span
              class="g-load-pill"
              :class="{ 'safe': !liveSlingshotParams.isHighG, 'high-g': liveSlingshotParams.isHighG }"
            >
              {{ liveSlingshotParams.isHighG ? `⚠️ HIGH-G (Total ΔV ${liveSlingshotParams.totalDeltaV})` : `✅ Safe (Total ΔV ${liveSlingshotParams.totalDeltaV})` }}
            </span>
          </div>

          <div class="preview-metrics">
            <div class="metric-item">
              <span class="metric-label">Vector Bend</span>
              <span class="metric-value">+{{ liveSlingshotParams.bonusMr }} MR ({{ liveSlingshotParams.bonusMr * 60 }}°)</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Free Exit Speed</span>
              <span class="metric-value">+{{ liveSlingshotParams.freeExitSpeed }}</span>
            </div>
            <div class="metric-item" v-if="liveSlingshotParams.oberthExitSpeed > 0">
              <span class="metric-label">Oberth Exit Boost</span>
              <span class="metric-value">+{{ liveSlingshotParams.oberthExitSpeed }}</span>
            </div>
            <div class="metric-item total">
              <span class="metric-label">Total Exit Speed</span>
              <span class="metric-value highlight">{{ liveSlingshotParams.totalExitSpeed }} hexes/turn</span>
            </div>
            <div class="metric-item pilot">
              <span class="metric-label">Pilot Check</span>
              <span class="metric-value" v-if="liveSlingshotParams.requiresPilotCheck">
                {{ liveSlingshotPilotTarget }}%
                <small v-if="liveSlingshotParams.pilotModifier !== 0">({{ liveSlingshotParams.pilotModifier > 0 ? '+' : '' }}{{ liveSlingshotParams.pilotModifier }}%)</small>
              </span>
              <span class="metric-value routine" v-else>Routine (No Roll)</span>
            </div>
          </div>

          <div v-if="liveSlingshotParams.isHighG" class="high-g-warning">
            ⚠️ Total G-load exceeds safe threshold (ΔV {{ liveSlingshotParams.totalDeltaV }} &gt; 3). Requires Crew STA Check at {{ liveSlingshotParams.gPenalty }}% upon completion.
          </div>
        </div>

        <div v-else class="slingshot-ineligible-banner">
          ⚠️ Ineligible Slingshot: {{ liveSlingshotParams.reason }}
        </div>

        <!-- Action Buttons -->
        <div class="modal-actions slingshot-actions">
          <button
            type="button"
            class="btn-execute-slingshot-roll"
            :disabled="!liveSlingshotParams.eligible"
            @click="executeSlingshot"
          >
            {{ liveSlingshotParams.requiresPilotCheck ? '🎲 Execute Slingshot & Roll Pilot Check' : '🪐 Execute Orbital Slingshot' }}
          </button>
          <button
            type="button"
            class="btn-modal-cancel btn-slingshot-close"
            @click="showSlingshotModal = false"
          >
            Close
          </button>
        </div>

        <!-- Result Outcome Display -->
        <div v-if="slingshotLastResult" class="slingshot-result-card" :class="{ 'success': slingshotLastResult.success, 'hazard': slingshotLastResult.isMinorHazard, 'critical': slingshotLastResult.isMajorHazard }">
          <div class="result-headline">
            {{ slingshotLastResult.success ? '✅ Pilot Check Succeeded!' : (slingshotLastResult.isMinorHazard ? '⚠️ Minor Hazard (Atmospheric Skip)' : '💥 Critical Hazard (Capture / Impact)') }}
            (Roll: {{ slingshotLastResult.roll }} vs Target: {{ slingshotLastResult.target }}%)
          </div>
          <div class="result-summary-text">
            {{ slingshotLastResult.summaryText }}
          </div>
        </div>
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
import SpaceVttCanvas from '../components/SpaceVttCanvas.vue';
import ImageBrowserModal from '../components/ImageBrowserModal.vue';
import { useAuthStore } from '../stores/auth.js';
import { socket } from '../services/socket.js';
import { calculateDamageRoll, calculatePercentileRoll, calculateInitiativeRoll } from '../utils/diceUtils.js';
import { executeQueuedDiceRoll } from '../utils/safeDiceRoller.js';
import { diceRollQueue } from '../utils/diceRollQueue.js';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';
import { playDiceSound, toggleMute as toggleDiceMute, isMuted as isDiceMuted } from '../services/diceAudio.js';
import { isCelestialToken, CELESTIAL_PRESET_NAMES } from '../utils/spaceTokens.js';
import {
  canFlipAndBurn,
  canMultiTurnFlip,
  canStandardFlip,
  canLumberingFlip,
  canSnapFlip,
  calculateFlipHeading,
  calculateTurnHeading,
  calculateBlackoutSeconds,
  calculateStaCheckTarget,
  resolveStaCheckResult,
  formatStandardFlipAlert,
  formatLumberingFlipAlert,
  formatSnapFlipAlert,
  formatBrakingBurnAlert,
  formatGLocResultAlert,
  formatFlipAndBurnAlert,
  formatMultiTurnAlert,
  MULTI_TURN_FLIP_STATUS,
  calculateSlingshotParameters,
  resolveSlingshotPilotCheck,
  formatSlingshotSuccessAlert,
  formatSlingshotHazardAlert,
  SAFE_COMPENSATOR_DELTA_V,
} from '../utils/flipAndBurn.js';


const authStore = useAuthStore();
const isGm = computed(() => authStore.user?.role === 'GameMaster');

const isDiceAudioMuted = ref(isDiceMuted());

function toggleAudioMute() {
  const nextState = toggleDiceMute();
  isDiceAudioMuted.value = nextState;
}

const initialVttState = getUserState(getSafeUserId(), 'spaceVtt', {
  panX: 50,
  panY: 50,
  zoomLevel: 1.0,
  activeTool: 'select',
  selectedTokenId: null,
  isRollLogOpen: false,
  showTokenSidebar: true,
});


// Dice state
let diceBoxInstance = null;
let diceBoxInitPromise = null;

async function initDiceBox() {
  if (diceBoxInstance) return diceBoxInstance;
  if (!diceBoxInitPromise) {
    diceBoxInitPromise = (async () => {
      const { default: DiceBox } = await import('@3d-dice/dice-box');
      const box = new DiceBox({
        id: "dice-canvas",
        container: "#dice-box",
        assetPath: '/assets/dice-box/',
        theme: 'default',
        scale: 5,
        offscreen: false
      });
      await box.init();
      diceBoxInstance = box;
      return box;
    })().catch((err) => {
      console.warn('DiceBox init failed:', err);
      diceBoxInitPromise = null;
      return null;
    });
  }
  return diceBoxInitPromise;
}

async function getReadyDiceBox() {
  return await initDiceBox();
}
const damageDiceCount = ref(1);
const showDmgMenu = ref(false);
const dmgMenuRef = ref(null);
const lastDamageRoll = ref(null);
const showDamageHud = ref(false);
let damageHudTimeout = null;

const lastPercentileRoll = ref(null);
const showPercentileHud = ref(false);
let percentileHudTimeout = null;

const lastInitiativeRoll = ref(null);
const showInitiativeHud = ref(false);
let initiativeHudTimeout = null;

const SPACE_ROLL_LOG_KEY = 'sf_vtt_space_roll_log';
const rollLog = ref([]);
const isRollLogOpen = ref(false);
isRollLogOpen.value = !!initialVttState.isRollLogOpen;

function formatRollTime(item) {
  if (!item) return '';
  const raw = item.createdAt || item.timestamp;
  if (!raw) return '';
  const dateStr = typeof raw === 'string' && raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') + 'Z' : raw;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? String(raw) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

async function fetchRollLog() {
  try {
    const res = await fetch('/api/rolls?mode=space', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      rollLog.value = data;
    }
  } catch (err) {
    console.error('Failed to fetch Space roll log:', err);
  }
}

async function sendRollToServer(rollData) {
  try {
    const res = await fetch('/api/rolls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        mode: 'space',
        type: rollData.type,
        label: rollData.label,
        total: rollData.total,
        breakdown: rollData.breakdown,
        rollSummary: rollData.rollSummary
      })
    });
    if (res.ok) {
      const savedRoll = await res.json();
      if (!rollLog.value.some(r => r.id === savedRoll.id)) {
        rollLog.value.unshift(savedRoll);
        if (rollLog.value.length > 20) {
          rollLog.value = rollLog.value.slice(0, 20);
        }
      }
    }
  } catch (err) {
    console.error('Failed to post roll to server:', err);
  }
}

function addRollToLog(entry) {
  sendRollToServer(entry);
}

async function clearRollLog() {
  if (!isGm.value) return;
  try {
    const res = await fetch('/api/rolls?mode=space', {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      rollLog.value = [];
      clearDice();
    }
  } catch (err) {
    console.error('Failed to clear Space roll log on server:', err);
  }
}

function adjustDamageCount(delta) {
  damageDiceCount.value = Math.max(1, Math.min(20, damageDiceCount.value + delta));
}

function toggleDmgMenu() {
  showDmgMenu.value = !showDmgMenu.value;
}

async function rollInitiative() {
  if (!isGm.value) return;
  playDiceSound({ isRemote: false });
  const diceBox = await getReadyDiceBox();
  showInitiativeHud.value = false;
  showPercentileHud.value = false;
  showDamageHud.value = false;
  if (initiativeHudTimeout) clearTimeout(initiativeHudTimeout);

  try {
    const results = await executeQueuedDiceRoll(diceBox, [
      { sides: 10, theme: 'custom-init-player', themeColor: '#021a1e', qty: 1 },
      { sides: 10, theme: 'custom-init-opp', themeColor: '#080d0d', qty: 1 }
    ]);
    const initSummary = calculateInitiativeRoll(results);
    if (initSummary.valid) {
      const rollData = {
        ...initSummary,
        username: authStore.user?.username,
        role: authStore.user?.role
      };
      lastInitiativeRoll.value = rollData;
      showInitiativeHud.value = true;

      sendRollToServer({
        type: 'initiative',
        label: '⚡ Combat Initiative',
        total: initSummary.playerRoll,
        breakdown: `Players: ${initSummary.playerRoll} vs Opposition: ${initSummary.oppRoll}`,
        rollSummary: rollData
      });

      initiativeHudTimeout = setTimeout(() => {
        showInitiativeHud.value = false;
      }, 9000);
    }
  } catch (err) {
    console.error('Initiative roll failed:', err);
  }
}

async function rollPercentile() {
  playDiceSound({ isRemote: false });
  const diceBox = await getReadyDiceBox();
  showPercentileHud.value = false;
  showDamageHud.value = false;
  showInitiativeHud.value = false;
  if (percentileHudTimeout) clearTimeout(percentileHudTimeout);

  try {
    const results = await executeQueuedDiceRoll(diceBox, [
      { sides: 10, theme: 'custom-tens', themeColor: '#77d19e', qty: 1 }, // Tens (lighter colored die)
      { sides: 10, theme: 'custom-ones', themeColor: '#22384a', qty: 1 }  // Ones (darker colored die)
    ]);
    const rollSummary = calculatePercentileRoll(results);
    if (rollSummary.valid) {
      lastPercentileRoll.value = {
        ...rollSummary,
        username: authStore.user?.username,
        role: authStore.user?.role
      };
      showPercentileHud.value = true;
      sendRollToServer({
        type: 'percentile',
        label: 'd%',
        total: rollSummary.total,
        breakdown: `[Tens: ${rollSummary.tens * 10}, Ones: ${rollSummary.ones}]`,
        rollSummary
      });
      percentileHudTimeout = setTimeout(() => {
        showPercentileHud.value = false;
      }, 8000);
    }
  } catch (err) {
    console.error('Percentile dice roll failed:', err);
  }
}

async function rollDamage() {
  playDiceSound({ isRemote: false });
  const diceBox = await getReadyDiceBox();
  showDamageHud.value = false;
  showPercentileHud.value = false;
  showInitiativeHud.value = false;
  if (damageHudTimeout) clearTimeout(damageHudTimeout);
  showDmgMenu.value = false;

  try {
    const results = await executeQueuedDiceRoll(diceBox, [
      { sides: 10, theme: 'custom-dmg', themeColor: '#140409', qty: damageDiceCount.value }
    ]);
    const rollSummary = calculateDamageRoll(results);
    if (rollSummary.count > 0) {
      lastDamageRoll.value = {
        ...rollSummary,
        username: authStore.user?.username,
        role: authStore.user?.role
      };
      showDamageHud.value = true;
      sendRollToServer({
        type: 'damage',
        label: `${rollSummary.count}d10`,
        total: rollSummary.total,
        breakdown: `[${rollSummary.dice.join(', ')}]`,
        rollSummary
      });
      damageHudTimeout = setTimeout(() => {
        showDamageHud.value = false;
      }, 8000);
    }
  } catch (err) {
    console.error('Damage dice roll failed:', err);
  }
}

async function clearDice() {
  const diceBox = await getReadyDiceBox();
  if (diceBox) {
    try {
      diceBox.clear();
    } catch (err) {
      console.warn('Failed to clear dice box:', err);
    }
  }
  showPercentileHud.value = false;
  showDamageHud.value = false;
  showInitiativeHud.value = false;
  if (percentileHudTimeout) {
    clearTimeout(percentileHudTimeout);
    percentileHudTimeout = null;
  }
  if (damageHudTimeout) {
    clearTimeout(damageHudTimeout);
    damageHudTimeout = null;
  }
  if (initiativeHudTimeout) {
    clearTimeout(initiativeHudTimeout);
    initiativeHudTimeout = null;
  }
  showDmgMenu.value = false;
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
const panX = ref(initialVttState.panX ?? 50);
const panY = ref(initialVttState.panY ?? 50);
const activeTool = ref(initialVttState.activeTool || 'select');
const zoomLevel = ref(initialVttState.zoomLevel ?? 1.0);
const selectedTokenId = ref(initialVttState.selectedTokenId ?? null);

// Tactical Pings State
const activePings = ref({});
const activePingsList = computed(() => Object.values(activePings.value));
const hasMyActivePing = computed(() => {
  const myId = authStore.user?.id;
  return myId ? !!activePings.value[myId] : false;
});

watch(
  () => activeMap.value?.id,
  (newId) => {
    activePings.value = {};
    if (newId) {
      socket.emit('ping:request_sync', { mapId: newId });
    }
  }
);

function onPingUpdate({ x, y, isDragging }) {
  if (!activeMap.value?.id) return;
  const currentUserId = authStore.user?.id;
  const currentUsername = authStore.user?.username || 'Player';

  socket.emit('ping:update', {
    mapId: activeMap.value.id,
    x,
    y,
    isDragging,
  });

  if (currentUserId) {
    activePings.value = {
      ...activePings.value,
      [currentUserId]: {
        userId: currentUserId,
        username: currentUsername,
        x,
        y,
        isDragging,
        updatedAt: Date.now(),
      },
    };
  }
}

function onPingDismiss({ userId }) {
  if (!activeMap.value?.id) return;
  socket.emit('ping:clear', {
    mapId: activeMap.value.id,
    targetUserId: userId,
  });
  if (userId && activePings.value[userId]) {
    const next = { ...activePings.value };
    delete next[userId];
    activePings.value = next;
  }
}

function clearMyPing() {
  if (!activeMap.value?.id) return;
  const currentUserId = authStore.user?.id;
  socket.emit('ping:clear', {
    mapId: activeMap.value.id,
    targetUserId: currentUserId,
  });
  if (currentUserId && activePings.value[currentUserId]) {
    const next = { ...activePings.value };
    delete next[currentUserId];
    activePings.value = next;
  }
}

function clearAllPings() {
  if (!activeMap.value?.id) return;
  socket.emit('ping:clear', {
    mapId: activeMap.value.id,
    all: true,
  });
  activePings.value = {};
}

let persistStateTimer = null;

function persistVttStateNow() {
  saveUserState(getSafeUserId(), 'spaceVtt', {
    panX: panX.value,
    panY: panY.value,
    zoomLevel: zoomLevel.value,
    activeTool: activeTool.value,
    selectedTokenId: selectedTokenId.value,
    isRollLogOpen: isRollLogOpen.value,
    showTokenSidebar: showTokenSidebar.value,
  });
}

function persistVttState() {
  if (persistStateTimer) {
    clearTimeout(persistStateTimer);
  }
  persistStateTimer = setTimeout(() => {
    persistStateTimer = null;
    persistVttStateNow();
  }, 150);
}

const showGmDrawer = ref(false);
const showTokenSidebar = ref(initialVttState.showTokenSidebar ?? true);

function toggleTokenSidebar() {
  showTokenSidebar.value = !showTokenSidebar.value;
  persistVttState();
}

function closeTokenSidebar() {
  showTokenSidebar.value = false;
  persistVttState();
}

watch([panX, panY, zoomLevel, activeTool, selectedTokenId, isRollLogOpen, showTokenSidebar], () => {
  persistVttState();
});
const showCreateMapModal = ref(false);
const createMapError = ref('');
const showAddTokenModal = ref(false);
const createTokenError = ref('');
const showImageBrowser = ref(false);
const imageBrowserTarget = ref('token');
const selectedShipId = ref(null);
const tokenFileInput = ref(null);
const uploadingAvatar = ref(false);

// Braking Burn Deceleration (ΔV)
const brakingDeltaV = ref(2);
const isFlipBurnCollapsed = ref(true);
const isWeaponsCollapsed = ref(true);

// Interactive Crew G-Load Check Dialog State
const showCrewGCheckModal = ref(false);
const crewCheckReason = ref('Manual Check');
const crewCheckDeltaV = ref(0);
const crewCheckIsSnapFlip = ref(false);
const crewCheckCharName = ref('Crew Member');
const crewCheckBaseSta = ref(60);
const crewCheckPosture = ref('braced'); // 'couch', 'braced', 'unbraced'
const crewCheckLocation = ref('midships'); // 'midships', 'extremity'
const crewCheckLastResult = ref(null);

// Orbital Slingshot Modal State
const showSlingshotModal = ref(false);
const slingshotBodyType = ref('PLANET'); // 'MOON', 'PLANET', 'GAS_GIANT'
const slingshotDistance = ref(0);
const slingshotEntrySpeed = ref(4);
const slingshotPilotSkill = ref(50);
const slingshotAdfSpent = ref(0);
const slingshotLastResult = ref(null);

// Forms
const gridLineWidthOptions = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];
const gridDimensionOptions = [10, 15, 20, 25, 30, 40, 50, 60, 80, 100];

const activeMapForm = reactive({
  width: 20,
  height: 20,
  grid_line_width: 1,
  grid_visible: true,
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
  fog_enabled: false,
});

const newTokenForm = reactive({
  name: '',
  color: '#666666',
  avatar_url: '',
  x: 0,
  y: 0,
  size: 1,
  current_speed: 0,
  rotation: 0,
  token_type: 'ship',
  is_hidden: false,
});

const selectedTokenForm = reactive({
  color: '#666666',
  size: 1,
  status_effects: [],
  current_speed: 0,
  rotation: 0,
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

const selectedTokenLinkedShip = computed(() => {
  if (!selectedToken.value || isCelestialToken(selectedToken.value) || !selectedToken.value.character_id) {
    return null;
  }
  return ships.value.find((s) => s.id === selectedToken.value.character_id) || null;
});

const selectedTokenCanStandardFlip = computed(() => {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return false;
  if (selectedTokenLinkedShip.value) {
    return canStandardFlip(selectedTokenLinkedShip.value.mr);
  }
  return true;
});

const selectedTokenCanLumberingFlip = computed(() => {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return false;
  if (selectedTokenLinkedShip.value) {
    return canLumberingFlip(selectedTokenLinkedShip.value.mr);
  }
  return false;
});

const selectedTokenCanSnapFlip = computed(() => {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return false;
  if (selectedTokenLinkedShip.value) {
    return canSnapFlip(selectedTokenLinkedShip.value.mr);
  }
  return false;
});

const selectedTokenCanFlipAndBurn = selectedTokenCanStandardFlip;
const selectedTokenCanMultiTurnFlip = selectedTokenCanLumberingFlip;

const selectedTokenInMultiTurnFlip = computed(() => {
  return selectedTokenForm.status_effects.includes(MULTI_TURN_FLIP_STATUS);
});

// Crew G-Load Check live target calculation
const crewCheckTargetSta = computed(() => {
  const isExtremity = crewCheckLocation.value === 'extremity';
  return calculateStaCheckTarget(crewCheckBaseSta.value, {
    deltaV: crewCheckDeltaV.value,
    posture: crewCheckPosture.value,
    location: isExtremity ? 'bow' : 'midships',
    extremity: isExtremity ? 'bow' : 'midships',
    extremityMod: isExtremity ? -10 : 0,
  });
});

// Hex distance calculations in odd-r coordinates
function offsetToCube(col, row) {
  const c = Number(col) || 0;
  const r = Number(row) || 0;
  const q = c - (r - (r & 1)) / 2;
  const s = -q - r;
  return { q, r, s };
}

function hexDistance(a, b) {
  if (!a || !b) return Infinity;
  const ac = offsetToCube(a.x, a.y);
  const bc = offsetToCube(b.x, b.y);
  return (Math.abs(ac.q - bc.q) + Math.abs(ac.r - bc.r) + Math.abs(ac.s - bc.s)) / 2;
}

function getCelestialBodyType(token) {
  if (!token) return null;
  const target = String(token.body_type || token.name || token.label || '').trim();
  if (/asteroid|debris|station/i.test(target)) return null;
  if (/moon/i.test(target)) return 'MOON';
  if (/gas giant|giant|jupiter|saturn/i.test(target)) return 'GAS_GIANT';
  if (/planet|earth|mars|venus|terra|world/i.test(target) || isCelestialToken(token)) return 'PLANET';
  return null;
}

const nearestCelestialBody = computed(() => {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return null;
  const celestials = tokens.value.filter((t) => isCelestialToken(t) && getCelestialBodyType(t) !== null);
  if (celestials.length === 0) return null;

  let nearest = null;
  let minDistance = Infinity;
  for (const c of celestials) {
    const dist = hexDistance(selectedToken.value, c);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = c;
    }
  }

  if (!nearest) return null;
  return {
    token: nearest,
    name: nearest.name || 'Celestial Body',
    bodyType: getCelestialBodyType(nearest),
    distance: minDistance,
  };
});

const isSlingshotZoneEligible = computed(() => {
  if (!nearestCelestialBody.value) return false;
  const { bodyType, distance } = nearestCelestialBody.value;
  if (bodyType === 'MOON') return distance === 0;
  if (bodyType === 'PLANET') return distance <= 1;
  if (bodyType === 'GAS_GIANT') return distance <= 2;
  return false;
});

const isSelectedTokenSlingshotEligible = computed(() => {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return false;
  const speed = Number(selectedTokenForm.current_speed ?? selectedToken.value?.current_speed) || 0;
  return speed >= 4 && isSlingshotZoneEligible.value;
});

const maxSlingshotAdf = computed(() => {
  const val = selectedTokenLinkedShip.value?.adf;
  return val !== undefined && val !== null ? Math.max(0, Number(val)) : 5;
});

const liveSlingshotParams = computed(() => {
  return calculateSlingshotParameters(
    slingshotBodyType.value,
    slingshotDistance.value,
    slingshotEntrySpeed.value,
    slingshotDistance.value === 0 ? slingshotAdfSpent.value : 0
  );
});

const liveSlingshotPilotTarget = computed(() => {
  const base = Number(slingshotPilotSkill.value) || 0;
  const mod = liveSlingshotParams.value?.pilotModifier || 0;
  return Math.max(1, Math.min(99, base + mod));
});

// Watch selectedToken to sync reactive form (Bugs 12 & 31)
watch(selectedToken, (newToken) => {
  if (newToken) {
    selectedTokenForm.color = newToken.color || '#666666';
    selectedTokenForm.size = newToken.size || 1;
    let effects = newToken.status_effects;
    if (typeof effects === 'string') {
      try {
        effects = JSON.parse(effects);
      } catch {
        effects = [];
      }
    }
    selectedTokenForm.status_effects = Array.isArray(effects) ? [...effects] : [];
    selectedTokenForm.current_speed = newToken.current_speed ?? 0;
    selectedTokenForm.rotation = newToken.rotation ?? 0;
  } else {
    selectedTokenForm.color = '#666666';
    selectedTokenForm.size = 1;
    selectedTokenForm.status_effects = [];
    selectedTokenForm.current_speed = 0;
    selectedTokenForm.rotation = 0;
  }
});

// Watch activeMap to update local settings form
watch(activeMap, (map) => {
  if (map) {
    activeMapForm.width = map.width || 20;
    activeMapForm.height = map.height || 20;
    activeMapForm.grid_line_width = map.grid_line_width || 1;
    activeMapForm.grid_visible = map.grid_visible !== false && map.grid_visible !== 0;
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

  if (e.key === 'Escape') {
    if (showCrewGCheckModal.value) {
      showCrewGCheckModal.value = false;
      return;
    }
    if (showSlingshotModal.value) {
      showSlingshotModal.value = false;
      return;
    }
    if (showPercentileHud.value || showDamageHud.value || showDmgMenu.value) {
      clearDice();
      return;
    }
  }

  if (showCreateMapModal.value || showAddTokenModal.value || showCrewGCheckModal.value || showSlingshotModal.value) return;

  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return;

  if (e.key === 'q' || e.key === 'Q') {
    e.preventDefault();
    rotateSelectedToken(-60);
  } else if (e.key === 'e' || e.key === 'E') {
    e.preventDefault();
    rotateSelectedToken(60);
  }
}

async function rotateSelectedToken(delta) {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return;

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

function openCrewGCheckModal(reason = 'Manual Check', options = {}) {
  crewCheckReason.value = reason;
  crewCheckDeltaV.value = Number(options.deltaV) || 0;
  crewCheckIsSnapFlip.value = Boolean(options.isSnapFlip);
  const loc = String(options.location || options.extremity || 'midships').toLowerCase();
  crewCheckLocation.value = (loc === 'bow' || loc === 'stern' || loc === 'extremity') ? 'extremity' : 'midships';
  if (options.posture) {
    crewCheckPosture.value = options.posture;
  }
  if (options.charName) {
    crewCheckCharName.value = options.charName;
  } else if (!crewCheckCharName.value) {
    crewCheckCharName.value = 'Crew Member';
  }
  crewCheckLastResult.value = null;
  showCrewGCheckModal.value = true;
}

async function executeStandardFlip() {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return;
  const shipName = selectedToken.value.name || 'Ship';
  const newRotation = calculateFlipHeading(selectedToken.value.rotation || 0);
  await rotateSelectedToken(180);
  sendRollToServer({
    type: 'percentile',
    label: `${shipName}: 🔄 Standard Flip (180°)`,
    total: newRotation,
    breakdown: formatStandardFlipAlert(shipName, newRotation),
  });
}

async function executeLumberingFlip() {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return;
  const shipName = selectedToken.value.name || 'Ship';

  if (!selectedTokenInMultiTurnFlip.value) {
    // Turn 1: rotate +90 deg and set status effect
    const newRotation = calculateTurnHeading(selectedToken.value.rotation || 0, 90);
    await rotateSelectedToken(90);
    if (!selectedTokenForm.status_effects.includes(MULTI_TURN_FLIP_STATUS)) {
      selectedTokenForm.status_effects.push(MULTI_TURN_FLIP_STATUS);
      await updateSelectedToken();
    }
    sendRollToServer({
      type: 'percentile',
      label: `${shipName}: 🔄 Lumbering Flip (Turn 1/2: +90°)`,
      total: newRotation,
      breakdown: formatLumberingFlipAlert(shipName, 1, newRotation),
    });
  } else {
    // Turn 2: rotate remaining +90 deg (total 180 deg) and clear status effect
    const newRotation = calculateTurnHeading(selectedToken.value.rotation || 0, 90);
    await rotateSelectedToken(90);
    selectedTokenForm.status_effects = selectedTokenForm.status_effects.filter(
      (s) => s !== MULTI_TURN_FLIP_STATUS
    );
    await updateSelectedToken();
    sendRollToServer({
      type: 'percentile',
      label: `${shipName}: 🔄 Lumbering Flip Complete (Turn 2/2: +90°)`,
      total: newRotation,
      breakdown: formatLumberingFlipAlert(shipName, 2, newRotation),
    });
  }
}

async function executeSnapFlip(options = {}) {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return;
  const shipName = selectedToken.value.name || 'Ship';
  const mr = Number(selectedTokenLinkedShip.value?.mr) || 1;
  const pilotTarget = options.pilotSkill ?? 50;
  let roll = options.roll ?? null;

  if (roll === null) {
    playDiceSound({ isRemote: false });
    const diceBox = await getReadyDiceBox();
    try {
      const results = await executeQueuedDiceRoll(diceBox, [
        { sides: 10, theme: 'custom-tens', themeColor: '#77d19e', qty: 1 },
        { sides: 10, theme: 'custom-ones', themeColor: '#22384a', qty: 1 },
      ]);
      const rollSummary = calculatePercentileRoll(results);
      if (rollSummary.valid) roll = rollSummary.total;
    } catch (err) {
      console.error('Snap Flip 3D roll failed:', err);
    }
  }

  if (roll === null) {
    roll = Math.floor(Math.random() * 100) + 1;
  }

  const success = roll <= pilotTarget;

  if (success) {
    const newRotation = calculateFlipHeading(selectedToken.value.rotation || 0);
    await rotateSelectedToken(180);
    sendRollToServer({
      type: 'percentile',
      label: `${shipName}: ⚠️ Emergency Snap Flip (180°) (Pilot Check: ${roll} vs ${pilotTarget}%)`,
      total: newRotation,
      breakdown: formatSnapFlipAlert(shipName, newRotation),
    });
    openCrewGCheckModal('Emergency Snap Flip', {
      isSnapFlip: true,
      extremity: 'extremity',
      deltaV: 0,
    });
  } else {
    // Failed Snap Flip: Rotates native MR only (1-2 faces / 60° or 120°), speed unchanged, prompts crew whip STA check
    const nativeTurnDegrees = mr * 60;
    const currentRot = selectedToken.value.rotation || 0;
    const partialRotation = calculateTurnHeading(currentRot, nativeTurnDegrees);
    await rotateSelectedToken(nativeTurnDegrees);
    sendRollToServer({
      type: 'percentile',
      label: `${shipName}: ⚠️ Emergency Snap Flip FAILED (Pilot Check: ${roll} vs ${pilotTarget}%)`,
      total: partialRotation,
      breakdown: `${shipName}: Emergency Snap Flip FAILED (Roll ${roll} vs ${pilotTarget}%). RCS thrusters fail to complete 180° pivot; rotates native MR only (${nativeTurnDegrees}°, heading: ${partialRotation}°). Main engine braking blocked this turn! Crew suffers centrifugal whip.`,
    });
    openCrewGCheckModal('Emergency Snap Flip (Failed)', {
      isSnapFlip: true,
      extremity: 'extremity',
      deltaV: 0,
    });
  }
}

async function executeBrakingBurn() {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return;
  const shipName = selectedToken.value.name || 'Ship';
  const dv = Math.max(1, Number(brakingDeltaV.value) || 1);
  const isHighG = dv >= 4;

  selectedTokenForm.current_speed = Math.max(0, (selectedTokenForm.current_speed || 0) - dv);
  await updateSelectedToken();

  const labelPrefix = isHighG ? '⚠️ HIGH-G Braking Burn' : 'Braking Burn';
  sendRollToServer({
    type: 'percentile',
    label: `${shipName}: ${labelPrefix} (ΔV ${dv})`,
    total: selectedTokenForm.current_speed,
    breakdown: formatBrakingBurnAlert(shipName, dv),
  });

  if (isHighG) {
    openCrewGCheckModal(`High-G Braking Burn (ΔV ${dv})`, {
      deltaV: dv,
      isSnapFlip: false,
      extremity: 'midships',
    });
  }
}

function openSlingshotModal(preset = {}) {
  const nearest = nearestCelestialBody.value;
  slingshotBodyType.value = preset.bodyType || (nearest ? nearest.bodyType : 'PLANET');
  const maxDistance = slingshotBodyType.value === 'GAS_GIANT' ? 2 : (slingshotBodyType.value === 'PLANET' ? 1 : 0);
  const defaultEligibleDistance = slingshotBodyType.value === 'MOON' ? 0 : 1;

  if (preset.distance !== undefined) {
    slingshotDistance.value = preset.distance;
  } else if (nearest && Number.isFinite(nearest.distance) && nearest.distance <= maxDistance) {
    slingshotDistance.value = nearest.distance;
  } else {
    slingshotDistance.value = defaultEligibleDistance;
  }
  const currentSpeed = Number(selectedTokenForm.current_speed ?? selectedToken.value?.current_speed) || 4;
  slingshotEntrySpeed.value = preset.entrySpeed ?? Math.max(4, currentSpeed);
  slingshotPilotSkill.value = preset.pilotSkill ?? 50;
  slingshotAdfSpent.value = preset.adfSpent ?? 0;
  slingshotLastResult.value = null;
  showSlingshotModal.value = true;
}

watch(slingshotBodyType, (newType) => {
  const maxDist = newType === 'GAS_GIANT' ? 2 : (newType === 'PLANET' ? 1 : 0);
  if (slingshotDistance.value > maxDist) {
    slingshotDistance.value = maxDist;
  }
});

function openSlingshotModalFromNearest() {
  if (!nearestCelestialBody.value) {
    openSlingshotModal();
    return;
  }
  openSlingshotModal({
    bodyType: nearestCelestialBody.value.bodyType,
    distance: nearestCelestialBody.value.distance,
    entrySpeed: Math.max(4, Number(selectedTokenForm.current_speed ?? selectedToken.value?.current_speed) || 4),
  });
}

async function executeSlingshot(options = {}) {
  if (!selectedToken.value || isCelestialToken(selectedToken.value)) return;
  const shipName = selectedToken.value.name || 'Ship';
  const params = liveSlingshotParams.value;

  if (!params.eligible) return;

  // Routine Slingshot (Planet Dist 1 / Gas Giant Dist 1-2): No Pilot Check
  if (!params.requiresPilotCheck) {
    selectedTokenForm.current_speed = params.totalExitSpeed;
    await updateSelectedToken();

    sendRollToServer({
      type: 'percentile',
      label: `${shipName}: 🪐 Orbital Slingshot (${slingshotBodyType.value})`,
      total: params.totalExitSpeed,
      breakdown: formatSlingshotSuccessAlert(
        shipName,
        slingshotBodyType.value,
        params.zoneName,
        params.bonusMr,
        params.totalExitSpeed,
        params.totalDeltaV
      ),
    });

    showSlingshotModal.value = false;
    return;
  }

  // Distance 0 Slingshot: Requires Pilot Check (d100)
  playDiceSound({ isRemote: false });
  let roll = options.roll ?? null;

  if (roll === null) {
    const diceBox = await getReadyDiceBox();
    if (diceBox) {
      showPercentileHud.value = false;
      showDamageHud.value = false;
      showInitiativeHud.value = false;
      if (percentileHudTimeout) clearTimeout(percentileHudTimeout);

      try {
        const results = await executeQueuedDiceRoll(diceBox, [
          { sides: 10, theme: 'custom-tens', themeColor: '#77d19e', qty: 1 },
          { sides: 10, theme: 'custom-ones', themeColor: '#22384a', qty: 1 },
        ]);
        const rollSummary = calculatePercentileRoll(results);
        if (rollSummary.valid) {
          roll = rollSummary.total;
          lastPercentileRoll.value = {
            ...rollSummary,
            username: authStore.user?.username,
            role: authStore.user?.role,
          };
          showPercentileHud.value = true;
          percentileHudTimeout = setTimeout(() => {
            showPercentileHud.value = false;
          }, 8000);
        }
      } catch (err) {
        console.error('Slingshot 3D dice roll failed:', err);
      }
    }
  }

  if (roll === null) {
    roll = Math.floor(Math.random() * 100) + 1;
  }

  const target = liveSlingshotPilotTarget.value;
  const result = resolveSlingshotPilotCheck(roll, target, slingshotBodyType.value);
  slingshotLastResult.value = {
    roll,
    target,
    ...result,
  };

  if (result.success) {
    selectedTokenForm.current_speed = params.totalExitSpeed;
    await updateSelectedToken();

    sendRollToServer({
      type: 'percentile',
      label: `${shipName}: 🪐 Orbital Slingshot SUCCESS`,
      total: roll,
      breakdown: formatSlingshotSuccessAlert(
        shipName,
        slingshotBodyType.value,
        params.zoneName,
        params.bonusMr,
        params.totalExitSpeed,
        params.totalDeltaV
      ),
    });

    if (params.totalDeltaV > SAFE_COMPENSATOR_DELTA_V) {
      showSlingshotModal.value = false;
      openCrewGCheckModal('High-G Orbital Slingshot', {
        deltaV: params.totalDeltaV,
      });
    }
  } else if (result.isMinorHazard) {
    // Minor Hazard (01-19): loses free exit speed
    const exitSpeed = slingshotEntrySpeed.value + (slingshotDistance.value === 0 ? params.oberthExitSpeed : 0);
    selectedTokenForm.current_speed = exitSpeed;
    await updateSelectedToken();

    sendRollToServer({
      type: 'percentile',
      label: `${shipName}: ⚠️ Orbital Slingshot HAZARD`,
      total: roll,
      breakdown: formatSlingshotHazardAlert(
        shipName,
        slingshotBodyType.value,
        false,
        result.hullDamageDice,
        result.summaryText
      ),
    });
  } else if (result.isMajorHazard) {
    // Major Hazard (20+): speed halved, structural damage, Moon scatters 60°, Planet/Gas Giant trapped
    const postSpeed = Math.floor(slingshotEntrySpeed.value * 0.5);
    selectedTokenForm.current_speed = postSpeed;

    if (slingshotBodyType.value === 'MOON') {
      await rotateSelectedToken(60);
    } else {
      if (!selectedTokenForm.status_effects.includes('ORBITAL_DECAY_REQUIRES_2_ADF_ESCAPE')) {
        selectedTokenForm.status_effects.push('ORBITAL_DECAY_REQUIRES_2_ADF_ESCAPE');
      }
    }
    await updateSelectedToken();

    sendRollToServer({
      type: 'percentile',
      label: `${shipName}: ⚠️ Orbital Slingshot CRITICAL HAZARD`,
      total: roll,
      breakdown: formatSlingshotHazardAlert(
        shipName,
        slingshotBodyType.value,
        true,
        result.hullDamageDice,
        result.summaryText
      ),
    });
  }
}

async function executeFlipAndBurn() {
  if (selectedTokenCanStandardFlip.value) {
    await executeStandardFlip();
  } else if (selectedTokenCanLumberingFlip.value) {
    await executeLumberingFlip();
  }
}

async function rollCrewGCheck() {
  const shipName = selectedToken.value?.name || 'Ship';
  const charName = crewCheckCharName.value || 'Crew Member';
  const target = crewCheckTargetSta.value.target;
  const posture = crewCheckPosture.value;

  playDiceSound({ isRemote: false });
  const diceBox = await getReadyDiceBox();
  let roll = null;

  if (diceBox) {
    showPercentileHud.value = false;
    showDamageHud.value = false;
    showInitiativeHud.value = false;
    if (percentileHudTimeout) clearTimeout(percentileHudTimeout);

    try {
      const results = await executeQueuedDiceRoll(diceBox, [
        { sides: 10, theme: 'custom-tens', themeColor: '#77d19e', qty: 1 },
        { sides: 10, theme: 'custom-ones', themeColor: '#22384a', qty: 1 },
      ]);
      const rollSummary = calculatePercentileRoll(results);
      if (rollSummary.valid) {
        roll = rollSummary.total;
        lastPercentileRoll.value = {
          ...rollSummary,
          username: authStore.user?.username,
          role: authStore.user?.role,
        };
        showPercentileHud.value = true;
        percentileHudTimeout = setTimeout(() => {
          showPercentileHud.value = false;
        }, 8000);
      }
    } catch (err) {
      console.error('Crew G check 3D dice roll failed:', err);
    }
  }

  if (roll === null) {
    roll = Math.floor(Math.random() * 100) + 1;
  }

  const result = resolveStaCheckResult(roll, target, posture);
  crewCheckLastResult.value = {
    roll,
    target,
    ...result,
  };

  sendRollToServer({
    type: 'percentile',
    label: `${shipName} Crew (${charName}): STA Check`,
    total: roll,
    breakdown: formatGLocResultAlert(charName, result),
  });
}

async function cancelMultiTurnFlip() {
  if (!selectedToken.value) return;
  selectedTokenForm.status_effects = selectedTokenForm.status_effects.filter(
    (s) => s !== MULTI_TURN_FLIP_STATUS
  );
  await updateSelectedToken();
}

async function rollFlipAndBurnStaCheck() {
  const shipName = selectedToken.value?.name || 'Ship';
  const stageDesc = selectedTokenInMultiTurnFlip.value ? 'STA Check #2' : (selectedTokenCanMultiTurnFlip.value ? 'STA Check #1' : 'STA Check');
  playDiceSound({ isRemote: false });
  const diceBox = await getReadyDiceBox();
  if (diceBox) {
    showPercentileHud.value = false;
    showDamageHud.value = false;
    showInitiativeHud.value = false;
    if (percentileHudTimeout) clearTimeout(percentileHudTimeout);

    try {
      const results = await executeQueuedDiceRoll(diceBox, [
        { sides: 10, theme: 'custom-tens', themeColor: '#77d19e', qty: 1 },
        { sides: 10, theme: 'custom-ones', themeColor: '#22384a', qty: 1 },
      ]);
      const rollSummary = calculatePercentileRoll(results);
      if (rollSummary.valid) {
        lastPercentileRoll.value = {
          ...rollSummary,
          username: authStore.user?.username,
          role: authStore.user?.role,
        };
        showPercentileHud.value = true;
        sendRollToServer({
          type: 'percentile',
          label: `${shipName}: Flip & Burn ${stageDesc} (d%)`,
          total: rollSummary.total,
          breakdown: `[Tens: ${rollSummary.tens * 10}, Ones: ${rollSummary.ones}] Pass if <= STA, or pass out for 1d10×10s`,
          rollSummary,
        });
        percentileHudTimeout = setTimeout(() => {
          showPercentileHud.value = false;
        }, 8000);
      }
    } catch (err) {
      console.error('Flip & Burn STA check roll failed:', err);
    }
  } else {
    const roll = Math.floor(Math.random() * 100) + 1;
    sendRollToServer({
      type: 'percentile',
      label: `${shipName}: Flip & Burn ${stageDesc} (d%)`,
      total: roll,
      breakdown: `Roll: ${roll} (Pass if <= STA, or pass out for 1d10×10s)`,
    });
  }
}

async function rollFlipAndBurnBlackout() {
  const shipName = selectedToken.value?.name || 'Ship';
  playDiceSound({ isRemote: false });
  const diceBox = await getReadyDiceBox();
  if (diceBox) {
    showDamageHud.value = false;
    showPercentileHud.value = false;
    showInitiativeHud.value = false;
    if (damageHudTimeout) clearTimeout(damageHudTimeout);

    try {
      const results = await executeQueuedDiceRoll(diceBox, [
        { sides: 10, theme: 'custom-dmg', themeColor: '#140409', qty: 1 },
      ]);
      const rollSummary = calculateDamageRoll(results);
      if (rollSummary.count > 0) {
        const dieVal = rollSummary.total;
        const seconds = calculateBlackoutSeconds(dieVal);
        lastDamageRoll.value = {
          ...rollSummary,
          total: seconds,
          username: authStore.user?.username,
          role: authStore.user?.role,
        };
        showDamageHud.value = true;
        sendRollToServer({
          type: 'damage',
          label: `${shipName}: Flip & Burn Blackout (1d10×10s)`,
          total: seconds,
          breakdown: `[Die: ${dieVal} × 10 = ${seconds} seconds passed out]`,
          rollSummary: { ...rollSummary, total: seconds },
        });
        damageHudTimeout = setTimeout(() => {
          showDamageHud.value = false;
        }, 8000);
      }
    } catch (err) {
      console.error('Flip & Burn blackout roll failed:', err);
    }
  } else {
    const dieVal = Math.floor(Math.random() * 10) + 1;
    const seconds = calculateBlackoutSeconds(dieVal);
    sendRollToServer({
      type: 'damage',
      label: `${shipName}: Flip & Burn Blackout (1d10×10s)`,
      total: seconds,
      breakdown: `[Die: ${dieVal} × 10 = ${seconds} seconds passed out]`,
    });
  }
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
      selectedTokenId.value = null;
      if (isGm.value) fetchMapList();
    }
  } catch (err) {
    console.error('Failed to activate map:', err);
  }
}

function clampGridLineWidth(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(10, Math.max(0.1, n));
}

function clampGridDimension(value, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback || 20;
  return Math.min(100, Math.max(5, n));
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
        width: clampGridDimension(activeMapForm.width, activeMap.value.width),
        height: clampGridDimension(activeMapForm.height, activeMap.value.height),
        grid_size: activeMapForm.grid_size,
        grid_line_width: clampGridLineWidth(activeMapForm.grid_line_width),
        grid_visible: Boolean(activeMapForm.grid_visible),
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
  createMapError.value = '';
  newMapForm.name = '';
  newMapForm.map_type = 'space';
  newMapForm.width = 20;
  newMapForm.height = 20;
  newMapForm.grid_size = 40;
  newMapForm.grid_color = '#334155';
  newMapForm.preset_bg = 'starfield';
  newMapForm.background_url = '';
  newMapForm.fog_enabled = false;
  showCreateMapModal.value = true;
}

async function submitCreateMap() {
  createMapError.value = '';
  try {
    const res = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...newMapForm, is_active: 1 }),
    });
    if (res.ok) {
      const created = await res.json();
      showCreateMapModal.value = false;
      fetchMapList();
      activateMap(created.id);
    } else {
      const data = await res.json().catch(() => ({}));
      createMapError.value = data.error || `Failed to create map (HTTP ${res.status})`;
    }
  } catch (err) {
    console.error('Failed to create map:', err);
    createMapError.value = err.message || 'Error creating map';
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
  createTokenError.value = '';
  selectedShipId.value = null;
  newTokenForm.token_type = 'ship';
  newTokenForm.name = '';
  newTokenForm.color = '#666666';
  newTokenForm.avatar_url = '';
  const spawn = getEmptyCenterCoords();
  newTokenForm.x = spawn.x;
  newTokenForm.y = spawn.y;
  newTokenForm.size = 1;
  newTokenForm.current_speed = 0;
  newTokenForm.rotation = 0;
  newTokenForm.is_hidden = false;
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


function onShipSelected() {
  if (!selectedShipId.value) return;
  const ship = ships.value.find((s) => s.id === selectedShipId.value);
  if (ship) {
    newTokenForm.name = ship.name;
    newTokenForm.avatar_url = ship.avatar_url || '';
  }
}

async function submitAddToken() {
  createTokenError.value = '';
  if (!activeMap.value) {
    createTokenError.value = 'No active map selected';
    return;
  }
  try {
    const isCelestial = newTokenForm.token_type === 'celestial';
    const isHidden = isGm.value && Boolean(newTokenForm.is_hidden);
    const initialLayer = isHidden ? 'gm' : (isCelestial ? 'celestial' : 'character');
    const initialConditions = (isHidden && isCelestial) ? JSON.stringify(['celestial']) : undefined;
    const bodyPayload = {
      map_id: activeMap.value.id,
      character_id: isCelestial ? null : (selectedShipId.value || null),
      name: newTokenForm.name,
      color: isCelestial ? '' : newTokenForm.color,
      avatar_url: newTokenForm.avatar_url,
      x: newTokenForm.x,
      y: newTokenForm.y,
      size: 1, // Space tokens strictly occupy 1 hex under Star Frontiers rules
      rotation: isCelestial ? 0 : (newTokenForm.rotation || 0),
      current_speed: isCelestial ? null : (newTokenForm.current_speed || 0),
      layer: isHidden ? 'gm' : (isCelestial ? 'celestial' : 'character'),
    };
    if (initialConditions !== undefined) {
      bodyPayload.conditions = initialConditions;
    }
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(bodyPayload),
    });
    if (res.ok) {
      const created = await res.json();
      showAddTokenModal.value = false;
      const exists = tokens.value.some((t) => t.id === created.id);
      if (!exists) tokens.value.push(created);
      selectedTokenId.value = created.id;
    } else {
      const data = await res.json().catch(() => ({}));
      createTokenError.value = data.error || `Failed to create token (HTTP ${res.status})`;
    }
  } catch (err) {
    console.error('Failed to create token:', err);
    createTokenError.value = err.message || 'Error creating token';
  }
}

let colorDebounceTimer = null;

async function onTokenMoved({ id, x, y }) {
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
  }
  const currentToken = tokens.value.find((t) => t.id === id);
  const isCelestial = isCelestialToken(currentToken);
  const color = isCelestial
    ? ''
    : ((selectedToken.value && selectedToken.value.id === id)
        ? selectedTokenForm.color
        : (currentToken?.color || '#666666'));

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
      if (idx !== -1) {
        tokens.value[idx] = updated;
        tokens.value = [...tokens.value];
      }
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

async function toggleTokenVisibility(token) {
  if (!isGm.value || !token || !token.id) return;
  const isCelestial = isCelestialToken(token);
  let nextLayer;
  let nextConditions = token.conditions;
  if (token.layer === 'gm') {
    nextLayer = isCelestial ? 'celestial' : 'character';
  } else {
    nextLayer = 'gm';
    if (isCelestial) {
      let conds = [];
      if (typeof token.conditions === 'string' && token.conditions.trim()) {
        try {
          conds = JSON.parse(token.conditions);
        } catch {
          conds = [];
        }
      } else if (Array.isArray(token.conditions)) {
        conds = [...token.conditions];
      }
      if (!conds.includes('celestial')) {
        conds.push('celestial');
      }
      nextConditions = JSON.stringify(conds);
    }
  }

  const idx = tokens.value.findIndex((t) => t.id === token.id);
  if (idx !== -1) {
    tokens.value[idx] = { ...tokens.value[idx], layer: nextLayer, conditions: nextConditions };
    tokens.value = [...tokens.value];
  }

  try {
    const payload = { layer: nextLayer };
    if (nextConditions !== undefined) {
      payload.conditions = nextConditions;
    }
    const res = await fetch(`/api/tokens/${token.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      const targetIdx = tokens.value.findIndex((t) => t.id === updated.id);
      if (targetIdx !== -1) {
        tokens.value[targetIdx] = updated;
        tokens.value = [...tokens.value];
      }
    }
  } catch (err) {
    console.error('Failed to toggle token visibility:', err);
  }
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

// Socket.io Real-time Event Listeners (Bug 25 - specific handlers)
let onSocketMapActivated = null;
let onSocketMapUpdated = null;
let onSocketMapCreated = null;
let onSocketMapDeleted = null;
let onSocketTokenCreated = null;
let onSocketTokenMoved = null;
let onSocketTokenUpdated = null;
let onSocketTokenDeleted = null;
let onSocketSheetUpdated = null;
let onSocketRollCreated = null;
let onSocketRollCleared = null;
let onSocketPingUpdated = null;
let onSocketPingCleared = null;
let onSocketPingsSync = null;
let onSocketConnect = null;

function setupSocketListeners() {
  socket.on('map:activated', onSocketMapActivated = (payload) => {
    const map = payload?.map;
    if (map && map.map_type === 'space') {
      activeMap.value = map;
      tokens.value = (payload?.tokens || []).filter(t => isGm.value || t.layer !== 'gm');
      selectedTokenId.value = null;
      activePings.value = {};
      socket.emit('ping:request_sync', { mapId: map.id });
    }
  });

  socket.on('map:updated', onSocketMapUpdated = ({ map }) => {
    if (activeMap.value && activeMap.value.id === map.id) {
      activeMap.value = map;
    }
  });

  socket.on('map:created', onSocketMapCreated = () => {
    if (isGm.value) fetchMapList();
  });

  socket.on('map:deleted', onSocketMapDeleted = ({ id }) => {
    if (isGm.value) fetchMapList();
    if (activeMap.value && activeMap.value.id === id) {
      activeMap.value = null;
      tokens.value = [];
      selectedTokenId.value = null;
      activePings.value = {};
    }
  });

  socket.on('token:created', onSocketTokenCreated = ({ token }) => {
    if (activeMap.value && String(token.map_id) === String(activeMap.value.id)) {
      const exists = tokens.value.some((t) => t.id === token.id);
      if (!exists) {
        tokens.value = [...tokens.value, token];
      }
    }
  });

  socket.on('token:moved', onSocketTokenMoved = ({ token }) => {
    if (activeMap.value && String(token.map_id) === String(activeMap.value.id)) {
      const idx = tokens.value.findIndex((t) => t.id === token.id);
      if (idx !== -1) {
        tokens.value[idx] = { ...tokens.value[idx], ...token, x: token.x, y: token.y };
        tokens.value = [...tokens.value];
      } else {
        tokens.value = [...tokens.value, token];
      }
    }
  });

  socket.on('token:updated', onSocketTokenUpdated = ({ token }) => {
    if (activeMap.value && String(token.map_id) === String(activeMap.value.id)) {
      const idx = tokens.value.findIndex((t) => t.id === token.id);
      if (idx !== -1) {
        tokens.value[idx] = token;
        tokens.value = [...tokens.value];
        if (selectedTokenId.value === token.id) {
          selectedTokenForm.color = token.color || '#666666';
          selectedTokenForm.size = token.size || 1;
          let effects = token.status_effects;
          if (typeof effects === 'string') {
            try {
              effects = JSON.parse(effects);
            } catch {
              effects = [];
            }
          }
          selectedTokenForm.status_effects = Array.isArray(effects) ? [...effects] : [];
          selectedTokenForm.current_speed = token.current_speed ?? 0;
          selectedTokenForm.rotation = token.rotation ?? 0;
        }
      } else {
        tokens.value = [...tokens.value, token];
      }
    }
  });

  socket.on('token:deleted', onSocketTokenDeleted = ({ id }) => {
    tokens.value = tokens.value.filter((t) => t.id !== id);
    if (selectedTokenId.value === id) {
      selectedTokenId.value = null;
    }
  });

  socket.on('sheet:updated', onSocketSheetUpdated = ({ type, sheet }) => {
    if (type === 'ship' && sheet?.id) {
      const idx = ships.value.findIndex((s) => s.id === sheet.id);
      if (idx !== -1) {
        ships.value[idx] = sheet;
        ships.value = [...ships.value];
      }
    }
  });

  socket.on('ping:updated', onSocketPingUpdated = ({ mapId, ping }) => {
    if (activeMap.value && String(mapId) === String(activeMap.value.id) && ping?.userId) {
      activePings.value = {
        ...activePings.value,
        [ping.userId]: ping,
      };
    }
  });

  socket.on('ping:cleared', onSocketPingCleared = ({ mapId, userId, all }) => {
    if (activeMap.value && String(mapId) === String(activeMap.value.id)) {
      if (all) {
        activePings.value = {};
      } else if (userId) {
        const next = { ...activePings.value };
        delete next[userId];
        activePings.value = next;
      }
    }
  });

  socket.on('pings:sync', onSocketPingsSync = ({ mapId, pings }) => {
    if (activeMap.value && String(mapId) === String(activeMap.value.id)) {
      const next = {};
      if (Array.isArray(pings)) {
        for (const p of pings) {
          if (p?.userId) next[p.userId] = p;
        }
      }
      activePings.value = next;
    }
  });

  socket.on('connect', onSocketConnect = () => {
    fetchActiveMap();
    if (activeMap.value?.id) {
      socket.emit('ping:request_sync', { mapId: activeMap.value.id });
    }
  });

  socket.on('roll:created', onSocketRollCreated = ({ mode, roll }) => {
    if (mode !== 'space') return;
    if (roll.username !== authStore.user?.username) {
      playDiceSound({ isRemote: true });
    }
    if (!rollLog.value.some(r => r.id === roll.id)) {
      rollLog.value.unshift(roll);
      if (rollLog.value.length > 20) {
        rollLog.value = rollLog.value.slice(0, 20);
      }
    }
    // If peer rolled, show floating banner
    if (roll.userId !== authStore.user?.id) {
      if (roll.type === 'percentile') {
        lastPercentileRoll.value = {
          ...roll.rollSummary,
          username: roll.username,
          role: roll.role,
          total: roll.total
        };
        showPercentileHud.value = true;
        if (percentileHudTimeout) clearTimeout(percentileHudTimeout);
        percentileHudTimeout = setTimeout(() => {
          showPercentileHud.value = false;
        }, 8000);
      } else if (roll.type === 'damage') {
        lastDamageRoll.value = {
          ...roll,
          dice: Array.isArray(roll.rollSummary?.dice) ? roll.rollSummary.dice : [],
          username: roll.username,
          role: roll.role,
          total: roll.total,
          count: roll.rollSummary?.count || (roll.label ? parseInt(roll.label) : 1),
          breakdown: roll.breakdown
        };
        showDamageHud.value = true;
        if (damageHudTimeout) clearTimeout(damageHudTimeout);
        damageHudTimeout = setTimeout(() => {
          showDamageHud.value = false;
        }, 8000);
      } else if (roll.type === 'initiative') {
        lastInitiativeRoll.value = {
          ...roll.rollSummary,
          username: roll.username,
          role: roll.role,
        };
        showInitiativeHud.value = true;
        showPercentileHud.value = false;
        showDamageHud.value = false;
        if (initiativeHudTimeout) clearTimeout(initiativeHudTimeout);
        initiativeHudTimeout = setTimeout(() => {
          showInitiativeHud.value = false;
        }, 9000);
      }
    }
  });

  socket.on('roll:cleared', onSocketRollCleared = ({ mode }) => {
    if (mode === 'space') {
      rollLog.value = [];
      showInitiativeHud.value = false;
      clearDice();
    }
  });
}

function cleanupSocketListeners() {
  if (onSocketMapActivated) socket.off('map:activated', onSocketMapActivated);
  if (onSocketMapUpdated) socket.off('map:updated', onSocketMapUpdated);
  if (onSocketMapCreated) socket.off('map:created', onSocketMapCreated);
  if (onSocketMapDeleted) socket.off('map:deleted', onSocketMapDeleted);
  if (onSocketTokenCreated) socket.off('token:created', onSocketTokenCreated);
  if (onSocketTokenMoved) socket.off('token:moved', onSocketTokenMoved);
  if (onSocketTokenUpdated) socket.off('token:updated', onSocketTokenUpdated);
  if (onSocketTokenDeleted) socket.off('token:deleted', onSocketTokenDeleted);
  if (onSocketSheetUpdated) socket.off('sheet:updated', onSocketSheetUpdated);
  if (onSocketRollCreated) socket.off('roll:created', onSocketRollCreated);
  if (onSocketRollCleared) socket.off('roll:cleared', onSocketRollCleared);
  if (onSocketPingUpdated) socket.off('ping:updated', onSocketPingUpdated);
  if (onSocketPingCleared) socket.off('ping:cleared', onSocketPingCleared);
  if (onSocketPingsSync) socket.off('pings:sync', onSocketPingsSync);
  if (onSocketConnect) socket.off('connect', onSocketConnect);
}

onMounted(() => {
  fetchRollLog();
  fetchActiveMap();
  fetchShips();
  if (isGm.value) {
    fetchMapList();
  }
  
  initDiceBox();

  setupSocketListeners();
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onDocClick);
});

onBeforeUnmount(() => {
  if (persistStateTimer) {
    clearTimeout(persistStateTimer);
    persistStateTimer = null;
  }
  persistVttStateNow();
  if (colorDebounceTimer) {
    clearTimeout(colorDebounceTimer);
    colorDebounceTimer = null;
    updateSelectedToken();
  }
  cleanupSocketListeners();
  window.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('click', onDocClick);
  if (damageHudTimeout) clearTimeout(damageHudTimeout);
  if (percentileHudTimeout) clearTimeout(percentileHudTimeout);
  if (initiativeHudTimeout) clearTimeout(initiativeHudTimeout);
  if (diceBoxInstance) {
    try {
      diceBoxInstance.clear();
    } catch (e) {}

    // Clean up WebGL canvas contexts properly to prevent context leak (Bug 24)
    const canvas = diceBoxInstance.canvas || document.querySelector('#dice-canvas') || document.querySelector('#dice-box canvas');
    if (canvas && typeof canvas.getContext === 'function') {
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const loseContext = gl.getExtension('WEBGL_lose_context');
          if (loseContext) {
            loseContext.loseContext();
          }
        }
      } catch (e) {}
    }
    diceBoxInstance = null;
    diceBoxInitPromise = null;
  }
  const diceBoxContainer = document.querySelector('#dice-box');
  if (diceBoxContainer) {
    diceBoxContainer.innerHTML = '';
  }
});
</script>

<style scoped>
.space-token-size-display {
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  font-size: 0.85rem;
  color: #94a3b8;
  font-weight: 500;
}

/* Initiative Floating HUD */
.initiative-hud-banner {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: #121212;
  border: 2px solid #b5eeff;
  box-shadow: 0 0 20px rgba(181, 238, 255, 0.45), 0 8px 32px rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  padding: 12px 18px;
  min-width: 290px;
  cursor: pointer;
  z-index: 250;
  backdrop-filter: blur(8px);
}
.initiative-hud-banner .hud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}
.initiative-hud-banner .hud-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: rgba(181, 238, 255, 0.85);
  text-transform: uppercase;
  text-shadow: 0 0 8px rgba(181, 238, 255, 0.4);
}
.initiative-hud-banner .hud-close {
  background: transparent;
  border: none;
  color: #b5eeff;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  text-shadow: 0 0 8px rgba(181, 238, 255, 0.5);
}
.init-hud-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 10px 0;
}
.init-die-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.4);
}
.init-player-die {
  background: #021a1e;
  border: 2px solid aquamarine;
  color: aquamarine;
  box-shadow: 0 0 12px rgba(127, 255, 212, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2);
}
.init-player-die .init-val {
  text-shadow: 0 0 10px rgba(181, 238, 255, 0.7);
}
.init-opp-die {
  background: #080d0d;
  border: 2px solid #33b8bd;
  color: #33b8bd;
  box-shadow: 0 0 12px rgba(51, 184, 189, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.1);
}
.init-opp-die .init-val {
  text-shadow: 0 0 10px rgba(51, 184, 189, 0.7);
}
.init-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  opacity: 0.9;
}
.init-val {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  font-family: monospace;
}
.init-vs {
  font-size: 14px;
  font-weight: 900;
  color: #64748b;
  text-shadow: 0 0 6px rgba(100, 116, 139, 0.5);
}

/* Roll Log Initiative Pills */
.init-log-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}
.init-pill-player {
  background: #021a1e;
  color: aquamarine;
  border: 1px solid aquamarine;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 700;
  box-shadow: 0 0 6px rgba(127, 255, 212, 0.35);
}
.init-pill-opp {
  background: #080d0d;
  color: #33b8bd;
  border: 1px solid #33b8bd;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 700;
  box-shadow: 0 0 6px rgba(51, 184, 189, 0.25);
}

/* Multi-Turn Flip & Burn */
.multi-turn-progress-banner {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  font-size: 0.78rem;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  text-align: center;
  font-weight: 600;
}
.btn-cancel-flip {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  color: #fca5a5;
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 4px;
  cursor: pointer;
  width: 100%;
}
.btn-cancel-flip:hover {
  background: rgba(239, 68, 68, 0.35);
}
.btn-flip-burn.in-progress {
  border-color: #38bdf8;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
}
.modal-error-banner {
  background: rgba(220, 53, 69, 0.2);
  border: 1px solid #dc3545;
  color: #ff8591;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}
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
  position: relative;
  z-index: 20;
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
  font-size: 18px;
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

.btn-gm,
.btn-sidebar {
  background: #082d33;
  border: 1px solid #2394a6;
  color: #00ffff;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-gm:hover,
.btn-sidebar:hover {
  background: #0d3b44;
  border-color: #33b5cb;
  color: #00ffff;
}

.btn-sidebar.active {
  background: #0d3b44;
  border-color: #33b5cb;
  color: #a8ffea;
  box-shadow: 0 0 10px rgba(51, 181, 203, 0.4);
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
  background: rgba(5, 18, 24, 0.68);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 8px;
  border-radius: var(--radius);
  border: 1px solid rgba(45, 212, 191, 0.35);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7), 0 0 15px rgba(20, 184, 166, 0.2);
}

.vtt-toolbar button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.3px;
  border-radius: 4px;
  text-align: left;
  background: rgba(13, 59, 68, 0.25);
  border: 1px solid rgba(45, 212, 191, 0.15);
  color: #99f6e4;
  transition: all 0.15s ease-in-out;
}

.vtt-toolbar button:hover {
  background: rgba(13, 59, 68, 0.55);
  border-color: rgba(45, 212, 191, 0.5);
  color: #ccfbf1;
  box-shadow: 0 0 10px rgba(45, 212, 191, 0.3);
}

.vtt-toolbar > button.active {
  background: rgba(8, 45, 51, 0.85);
  color: #2dd4bf;
  font-weight: 600;
  border: 1px solid #14b8a6;
  box-shadow: 0 0 12px rgba(20, 184, 166, 0.5);
}

.vtt-toolbar > button.active:hover {
  background: rgba(13, 59, 68, 0.95);
  color: #5eead4;
  border-color: #2dd4bf;
  box-shadow: 0 0 16px rgba(45, 212, 191, 0.7);
}

.tool-icon {
  width: 14px;
  height: 14px;
  display: inline-block;
  vertical-align: -2px;
  margin-right: 5px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  filter: drop-shadow(0 0 3px currentColor);
  transition: all 0.15s ease-in-out;
}

.tool-icon text {
  fill: currentColor;
  stroke: none;
}

.vtt-toolbar button.active .tool-icon,
.vtt-toolbar button:hover .tool-icon {
  filter: drop-shadow(0 0 6px currentColor);
}

.toolbar-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(45, 212, 191, 0.45), transparent);
  margin: 4px 0;
}

.btn-clear-ping {
  color: #f87171;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.btn-clear-ping:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.6);
  color: #fca5a5;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.35);
}

.btn-clear-all-pings {
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.3);
}

.btn-clear-all-pings:hover {
  background: rgba(245, 158, 11, 0.15);
  border-color: #f59e0b;
  color: #fde68a;
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
  z-index: 250;
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
  z-index: 250;
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

.percentile-hud-banner .hud-tens-val {
  color: #77d19e;
  font-weight: 700;
}

.percentile-hud-banner .hud-ones-val {
  color: #38bdf8;
  font-weight: 700;
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
  min-width: 0;
  min-height: 0;
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
  flex-shrink: 0;
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
  font-size: 15.5px;
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

.badge-speed,
.token-list-speed {
  font-size: 11px;
  background: rgba(105, 199, 158, 0.2);
  color: #69c79e;
  border: 1px solid rgba(105, 199, 158, 0.5);
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
}

.badge-rotation,
.token-list-rotation {
  font-size: 11px;
  background: #374151;
  color: #cecece;
  padding: 1px 5px;
  border-radius: 4px;
}

.token-list-celestial {
  font-size: 13px;
  line-height: 1;
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
  background: #000000;
  border: 1px solid #00a8a8;
  color: #00ffff;
  padding: 4px 8px;
  font-size: 12px;
  white-space: nowrap;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-group-sm button:hover:not(:disabled) {
  background: #082020;
  border-color: #00dada;
  color: #00dada;
  box-shadow: 0 0 6px rgba(0, 218, 218, 0.4);
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

.ship-sheet-select,
.ship-sheet-select option,
.space-map-select,
.space-map-select option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
}

.ship-sheet-select,
.space-map-select {
  background-color: #000000;
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
}

.ship-sheet-select:focus,
.space-map-select:focus {
  outline: none;
  border-color: aqua;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
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

.token-file-input,
.map-file-input {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  width: auto;
}

.token-file-input::file-selector-button,
.map-file-input::file-selector-button {
  background-color: #000000 !important;
  border: 1px solid #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  border-radius: var(--radius);
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  margin-right: 10px;
  transition: all 0.15s ease-in-out;
}

.token-file-input::-webkit-file-upload-button,
.map-file-input::-webkit-file-upload-button {
  background-color: #000000 !important;
  border: 1px solid #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  border-radius: var(--radius);
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  margin-right: 10px;
  transition: all 0.15s ease-in-out;
}

.token-file-input::file-selector-button:hover,
.map-file-input::file-selector-button:hover {
  background-color: #082020 !important;
  border-color: #00dada !important;
  color: #00dada !important;
  -webkit-text-fill-color: #00dada;
  box-shadow: 0 0 8px rgba(0, 218, 218, 0.4);
}

.token-file-input::-webkit-file-upload-button:hover,
.map-file-input::-webkit-file-upload-button:hover {
  background-color: #082020 !important;
  border-color: #00dada !important;
  color: #00dada !important;
  -webkit-text-fill-color: #00dada;
  box-shadow: 0 0 8px rgba(0, 218, 218, 0.4);
}

.btn-browse-avatar {
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  border-radius: var(--radius);
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-browse-avatar:hover {
  background-color: #082020 !important;
  border-color: #00dada !important;
  color: #00dada !important;
  -webkit-text-fill-color: #00dada;
  box-shadow: 0 0 8px rgba(0, 218, 218, 0.4);
}

.btn-clear-avatar {
  background: #000000 !important;
  border: 1px solid #00a8a8 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-clear-avatar:hover {
  background: #082020 !important;
  border-color: #00dada !important;
  color: #00dada !important;
  -webkit-text-fill-color: #00dada;
  box-shadow: 0 0 6px rgba(0, 218, 218, 0.4);
}

.uploading-spinner {
  font-size: 12px;
  color: #00dada;
  font-style: italic;
}

.avatar-url-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 12px;
  padding: 6px 10px;
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.btn-modal-cancel {
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-modal-cancel:hover {
  background-color: #082020 !important;
  border-color: #00dada !important;
  color: #00dada !important;
  -webkit-text-fill-color: #00dada;
  box-shadow: 0 0 8px rgba(0, 218, 218, 0.4);
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

.full-width {
  width: 100%;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.danger {
  background: var(--danger);
  color: #cecece;
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
  font-size: 22px;
  color: var(--text-primary, #cecece);
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

/* Bottom-Corner Die Roll Log HUD */
.roll-log-hud {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 105;
  pointer-events: auto;
}

.roll-log-pill-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-audio-toggle {
  background: transparent !important;
  border: 1px solid rgba(0, 128, 128, 0.5) !important;
  color: #00ffff !important;
  -webkit-text-fill-color: #00ffff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-audio-toggle:hover {
  background: #051414 !important;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
}

.btn-audio-toggle-pill {
  background: #000000 !important;
  border: 1px solid rgba(0, 128, 128, 0.7) !important;
  color: #00ffff !important;
  -webkit-text-fill-color: #00ffff;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-audio-toggle-pill:hover {
  background: #051414 !important;
  border-color: aqua !important;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
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
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 255, 255, 0.45) rgba(5, 15, 20, 0.8);
}

.roll-log-body::-webkit-scrollbar {
  width: 6px;
}

.roll-log-body::-webkit-scrollbar-track {
  background: rgba(5, 15, 20, 0.8);
  border-radius: 3px;
}

.roll-log-body::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.4);
  border: 1px solid rgba(0, 255, 255, 0.6);
  border-radius: 3px;
}

.roll-log-body::-webkit-scrollbar-thumb:hover {
  background: #00ffff;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
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

.roll-log-item.initiative {
  border-left: 3px solid #b5eeff;
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

.roll-log-item.initiative .roll-item-badge {
  background: #080d0d;
  color: #33b8bd;
  border-color: rgba(51, 184, 189, 0.5);
  box-shadow: 0 0 6px rgba(51, 184, 189, 0.35);
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

.hud-user-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-right: 6px;
  text-transform: uppercase;
}
.hud-user-tag.gamemaster, .roll-user-badge.gamemaster {
  background: rgba(229, 192, 123, 0.25);
  color: #e5c07b;
  border: 1px solid rgba(229, 192, 123, 0.4);
}
.hud-user-tag.player, .roll-user-badge.player {
  background: rgba(119, 209, 158, 0.2);
  color: #77d19e;
  border: 1px solid rgba(119, 209, 158, 0.35);
}
.roll-user-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  margin-right: 6px;
}

.grid-dimensions-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grid-dimensions-row input {
  flex: 1;
  min-width: 0;
}

.grid-dimensions-x {
  color: #8b949e;
}

/* Token Type Toggle & Preset Chips */
.token-type-toggle {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.type-btn {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-tertiary, #1f2937);
  border: 1px solid var(--border-color, #374151);
  border-radius: var(--radius, 6px);
  color: var(--text-secondary, #9ca3af);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.type-btn:hover {
  background: var(--bg-secondary, #111827);
  border-color: #00ffff;
  color: #cecece;
}

.type-btn.active {
  background: rgba(0, 255, 255, 0.12);
  border-color: #00ffff;
  color: #00ffff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.25);
  font-weight: 600;
}

.preset-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.preset-label {
  font-size: 11px;
  color: var(--text-secondary, #8b949e);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-chip {
  background: #000000 !important;
  border: 1px solid rgba(0, 128, 128, 0.7) !important;
  color: #00ffff !important;
  -webkit-text-fill-color: #00ffff;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.btn-chip:hover {
  background: #051414 !important;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.celestial-badge {
  background: rgba(147, 112, 219, 0.15);
  border: 1px solid rgba(147, 112, 219, 0.45);
  color: #d8b4fe;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 12px;
  text-align: center;
  letter-spacing: 0.5px;
}

/* Flip & Burn Section */
.flip-burn-box {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  padding: 10px;
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s ease;
}

.flip-burn-box.collapsed {
  padding: 8px 10px;
  gap: 0;
  background: rgba(15, 23, 42, 0.5);
  border-color: rgba(56, 189, 248, 0.15);
}

.flip-burn-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flip-burn-header.clickable {
  cursor: pointer;
  user-select: none;
}

.flip-burn-header.clickable:hover label {
  color: #7dd3fc;
}

.flip-burn-header.clickable:hover .collapse-caret {
  color: #7dd3fc;
}

.flip-burn-header-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.collapse-caret {
  font-size: 9px;
  color: #38bdf8;
  display: inline-block;
  transition: transform 0.2s ease, color 0.15s ease;
}

.collapse-caret.collapsed {
  transform: rotate(-90deg);
}

.flip-burn-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.flip-burn-header label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #38bdf8;
  margin: 0;
}

.mr-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.mr-pill.eligible {
  background: rgba(52, 211, 153, 0.2);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.4);
}

.btn-flip-burn {
  background: linear-gradient(135deg, #1e3a8a 0%, #0369a1 100%);
  color: #e0f2fe;
  border: 1px solid #38bdf8;
  border-radius: 4px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-flip-burn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #0284c7 100%);
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
  color: #cecece;
}

.btn-flip-burn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #475569;
  background: #1e293b;
  color: #94a3b8;
}

.flip-burn-ineligible {
  font-size: 11px;
  color: #f87171;
  font-style: italic;
  line-height: 1.3;
}

.flip-burn-hint {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.3;
}

.flip-burn-roll-btns {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}

.btn-fb-roll {
  flex: 1;
  padding: 5px 6px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid rgba(52, 211, 153, 0.4);
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.btn-fb-roll:hover {
  background: rgba(16, 185, 129, 0.25);
  border-color: #34d399;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.3);
}

.btn-fb-roll.blackout {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.15);
  color: #fcd34d;
}

.btn-fb-roll.blackout:hover {
  background: rgba(245, 158, 11, 0.25);
  border-color: #fbbf24;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);
}

.btn-snap-flip {
  background: linear-gradient(135deg, #78350f 0%, #b45309 100%);
  color: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 4px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 6px;
}

.btn-snap-flip:hover {
  background: linear-gradient(135deg, #92400e 0%, #d97706 100%);
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
  color: #cecece;
}

.flip-burn-hint.warning {
  color: #fbbf24;
}

/* Braking Burn Deceleration Section */
.braking-burn-controls {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.braking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.braking-header label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.braking-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dv-label {
  font-size: 11px;
  font-weight: 700;
  color: #38bdf8;
}

.braking-dv-input {
  width: 44px;
  background: #0f172a;
  border: 1px solid #334155;
  color: #cecece;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.braking-dv-input:focus {
  border-color: #38bdf8;
  outline: none;
}

.braking-indicator {
  font-size: 10px;
  line-height: 1.3;
  padding: 4px 6px;
  border-radius: 4px;
}

.braking-indicator.safe {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #6ee7b7;
}

.braking-indicator.high-g {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  font-weight: 600;
}

.btn-braking-burn {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: #cecece;
  border: 1px solid #475569;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-braking-burn:hover {
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  color: #cecece;
  box-shadow: 0 0 8px rgba(148, 163, 184, 0.3);
}

.btn-braking-burn.high-g {
  background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
  border-color: #ef4444;
  color: #fee2e2;
}

.btn-braking-burn.high-g:hover {
  background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
  color: #cecece;
}

.btn-crew-gcheck-trigger {
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-crew-gcheck-trigger:hover {
  background: rgba(56, 189, 248, 0.25);
  border-color: #38bdf8;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.3);
  color: #cecece;
}

/* Crew G-Load Check Dialog */
.crew-gcheck-modal {
  max-width: 500px;
  width: 90vw;
  background: #0f172a;
  border: 1px solid #38bdf8;
  box-shadow: 0 0 24px rgba(56, 189, 248, 0.25);
  max-height: 90vh;
  overflow-y: auto;
}

.crew-gcheck-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.crew-gcheck-header h3 {
  margin: 0;
  font-size: 1.27rem;
  color: #38bdf8;
}

.crew-gcheck-ship-name {
  font-family: 'Orbitron', var(--font-family-header, sans-serif);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(56, 189, 248, 0.15);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.crew-gcheck-trigger-badge {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid #334155;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #cecece;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.trigger-dv-tag {
  background: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
  border: 1px solid #ef4444;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
}

.crew-char-input {
  width: 100%;
  background: #1e293b;
  border: 1px solid #334155;
  color: #cecece;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 0.9rem;
}

.crew-char-input:focus {
  border-color: #38bdf8;
  outline: none;
}

.sta-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.crew-sta-input {
  width: 80px;
  background: #1e293b;
  border: 1px solid #334155;
  color: #cecece;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 0.95rem;
  font-weight: 700;
}

.crew-sta-input:focus {
  border-color: #38bdf8;
  outline: none;
}

.input-unit {
  color: #94a3b8;
  font-weight: 600;
}

.posture-options,
.location-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.radio-option:hover {
  background: #253349;
  border-color: #475569;
}

.radio-option.selected {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
}

.radio-option input[type="radio"] {
  cursor: pointer;
}

.option-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.option-title {
  font-size: 0.85rem;
  color: #cecece;
}

.option-mod {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
}

.option-mod.bonus {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.option-mod.neutral {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

.option-mod.penalty {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.sta-target-display {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid #38bdf8;
  border-radius: 6px;
  padding: 10px 12px;
  margin: 12px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sta-formula-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.formula-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #94a3b8;
}

.formula-breakdown {
  font-size: 0.8rem;
  color: #cecece;
  font-family: monospace;
}

.sta-target-badge {
  background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%);
  color: #cecece;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.95rem;
  white-space: nowrap;
  border: 1px solid #38bdf8;
}

.crew-gcheck-actions {
  display: flex;
  gap: 10px;
}

.btn-roll-gcheck {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: #cecece;
  border: 1px solid #34d399;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.btn-roll-gcheck:hover {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  box-shadow: 0 0 14px rgba(16, 185, 129, 0.5);
  color: #064e3b;
}

.crew-gcheck-result-card {
  margin-top: 14px;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: fadeIn 0.2s ease;
}

.crew-gcheck-result-card.none {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid #10b981;
}

.crew-gcheck-result-card.stun {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid #f59e0b;
}

.crew-gcheck-result-card.g-loc {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
}

.result-banner {
  display: flex;
  align-items: center;
  gap: 10px;
}

.result-icon {
  font-size: 1.5rem;
}

.result-titles {
  flex: 1;
}

.result-headline {
  font-size: 0.95rem;
  font-weight: 700;
  color: #cecece;
}

.result-condition {
  font-size: 0.85rem;
  font-weight: 600;
  color: #cecece;
}

.margin-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.result-summary-text {
  font-size: 0.85rem;
  line-height: 1.4;
  color: #cecece;
}

.result-effects-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.effect-tag {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
}

.effect-tag.penalty {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.effect-tag.warning {
  background: rgba(234, 179, 8, 0.2);
  color: #fef08a;
  border: 1px solid rgba(234, 179, 8, 0.4);
}

.effect-tag.damage {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.effect-tag.danger {
  background: rgba(185, 28, 28, 0.3);
  color: #fecaca;
  border: 1px solid #ef4444;
}

/* Token Weapons Section */
.token-weapons-section {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  padding: 10px;
  margin-top: 10px;
  transition: all 0.2s ease;
}

.token-weapons-section.collapsed {
  padding: 8px 10px;
  background: rgba(15, 23, 42, 0.5);
  border-color: rgba(56, 189, 248, 0.15);
}

.token-weapons-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.token-weapons-header.clickable {
  cursor: pointer;
  user-select: none;
}

.token-weapons-header.clickable:hover label {
  color: #7dd3fc;
}

.token-weapons-header.clickable:hover .collapse-caret {
  color: #7dd3fc;
}

.token-weapons-header-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.weapons-count-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(56, 189, 248, 0.15);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.token-weapons-section label {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #38bdf8;
  margin: 0;
  cursor: pointer;
}

.token-weapons-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.token-weapon-item {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 4px;
  padding: 6px 8px;
}

.token-wpn-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: #cecece;
}

.token-wpn-stats {
  font-size: 0.75rem;
  color: #8b949e;
  font-family: monospace;
}

.token-wpn-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.token-wpn-tag {
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
}

.token-wpn-tag.ff {
  border-color: rgba(56, 189, 248, 0.4);
  color: #79c0ff;
  background-color: rgba(56, 189, 248, 0.1);
}

.token-wpn-tag.t {
  border-color: rgba(74, 222, 128, 0.4);
  color: #7ee787;
  background-color: rgba(74, 222, 128, 0.1);
}

.token-wpn-tag.mpo {
  border-color: rgba(251, 191, 36, 0.4);
  color: #f6e05e;
  background-color: rgba(251, 191, 36, 0.1);
}

.token-wpn-tag.rd {
  border-color: rgba(244, 67, 54, 0.4);
  color: #ff7b72;
  background-color: rgba(244, 67, 54, 0.1);
}

.token-wpn-tag.ltd {
  border-color: rgba(171, 71, 188, 0.4);
  color: #ba68c8;
  background-color: rgba(171, 71, 188, 0.1);
}

/* Orbital Slingshot & Gravity Well Styling */
.btn-slingshot-trigger {
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.4);
  color: #c084fc;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 4px;
}

.btn-slingshot-trigger:hover {
  background: rgba(168, 85, 247, 0.25);
  border-color: #c084fc;
  box-shadow: 0 0 8px rgba(168, 85, 247, 0.3);
  color: #cecece;
}

.slingshot-box {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-radius: 6px;
  padding: 10px;
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slingshot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slingshot-header label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #c084fc;
  margin: 0;
}

.slingshot-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(168, 85, 247, 0.2);
  color: #e9d5ff;
  border: 1px solid rgba(168, 85, 247, 0.4);
}

.btn-execute-slingshot {
  background: linear-gradient(135deg, #7e22ce 0%, #9333ea 100%);
  color: #cecece;
  border: 1px solid #a855f7;
  border-radius: 4px;
  padding: 7px 10px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-execute-slingshot:hover {
  background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%);
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
}

.slingshot-hint {
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.3;
}

/* Orbital Slingshot Modal */
.slingshot-modal {
  max-width: 520px;
  width: 92vw;
  background: #0f172a;
  border: 1px solid #a855f7;
  box-shadow: 0 0 24px rgba(168, 85, 247, 0.25);
  max-height: 90vh;
  overflow-y: auto;
}

.slingshot-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.slingshot-modal-header h3 {
  margin: 0;
  font-size: 1.27rem;
  color: #c084fc;
}

.slingshot-ship-name {
  font-family: 'Orbitron', var(--font-family-header, sans-serif);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(168, 85, 247, 0.15);
  color: #e9d5ff;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.slingshot-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.slingshot-select {
  width: 100%;
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #cecece;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 0.9rem;
}

.slingshot-select:focus {
  border-color: #a855f7;
  outline: none;
}

.slingshot-preview-card {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.zone-name-badge {
  font-size: 0.85rem;
  font-weight: 700;
  color: #cecece;
}

.g-load-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

.g-load-pill.safe {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border: 1px solid #10b981;
}

.g-load-pill.high-g {
  background: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
  border: 1px solid #ef4444;
}

.preview-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 4px;
}

.metric-item {
  background: #0f172a;
  border: 1px solid #243248;
  border-radius: 4px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
}

.metric-item.total,
.metric-item.pilot {
  grid-column: span 1;
}

.metric-label {
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 600;
}

.metric-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: #cecece;
}

.metric-value.highlight {
  color: #38bdf8;
}

.metric-value.routine {
  color: #34d399;
}

.high-g-warning {
  margin-top: 4px;
  font-size: 0.78rem;
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 4px;
  padding: 6px 8px;
}

.slingshot-ineligible-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  color: #fca5a5;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 0.85rem;
  margin-bottom: 14px;
}

.slingshot-actions {
  display: flex;
  gap: 10px;
}

.btn-execute-slingshot-roll {
  background: linear-gradient(135deg, #7e22ce 0%, #9333ea 100%);
  color: #cecece;
  border: 1px solid #a855f7;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.btn-execute-slingshot-roll:hover:not(:disabled) {
  background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%);
  box-shadow: 0 0 14px rgba(168, 85, 247, 0.5);
}

.btn-execute-slingshot-roll:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slingshot-result-card {
  margin-top: 14px;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: fadeIn 0.2s ease;
}

.slingshot-result-card.success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid #10b981;
}

.slingshot-result-card.hazard {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid #f59e0b;
}

.slingshot-result-card.critical {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
}

.visibility-section {
  margin-top: 8px;
}

.btn-toggle-visibility {
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(16, 185, 129, 0.5);
  color: #34d399;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-toggle-visibility:hover {
  background: rgba(16, 185, 129, 0.25);
}

.btn-toggle-visibility.is-hidden {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(245, 158, 11, 0.6);
  color: #fbbf24;
}

.btn-toggle-visibility.is-hidden:hover {
  background: rgba(245, 158, 11, 0.28);
}

.token-row-hidden {
  opacity: 0.72;
}

.token-hidden-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #fbbf24;
  letter-spacing: 0.4px;
}

.btn-token-list-visibility {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 0.75rem;
  cursor: pointer;
  margin-left: auto;
}

.btn-token-list-visibility.is-hidden {
  border-color: rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.12);
}

.spawn-hidden-row {
  margin-top: 4px;
}

.spawn-hidden-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #fbbf24;
  cursor: pointer;
}
</style>

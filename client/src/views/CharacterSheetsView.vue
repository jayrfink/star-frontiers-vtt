<template>
  <div
    class="sheets-layout has-sheet-bg"
    :class="{ 'sidebar-collapsed': isSidebarCollapsed }"
  >
    <!-- Sidebar -->
    <aside class="sidebar">
      <button
        type="button"
        class="sidebar-toggle-btn"
        :title="isSidebarCollapsed ? 'Show Navigation Panel' : 'Hide Navigation Panel'"
        :aria-label="isSidebarCollapsed ? 'Show Navigation Panel' : 'Hide Navigation Panel'"
        @click="toggleSidebar"
      >
        <span class="toggle-icon">{{ isSidebarCollapsed ? '▶' : '◀' }}</span>
      </button>
      <div class="sidebar-header">
        <h3>Characters</h3>
        <button class="btn-primary btn-new-character" @click="openCreateModal">+ New</button>
      </div>

      <div v-if="loading" class="sidebar-loading">Loading characters...</div>
      <div v-else-if="characters.length === 0" class="sidebar-empty">
        No characters found. Create one to get started!
      </div>
      <ul v-else ref="sidebarList" class="character-list sheet-list" @scroll="onScrollSave">
        <li
          v-for="(char, index) in characters"
          :key="char.id"
          :class="{
            active: selectedChar && selectedChar.id === char.id,
            dragging: draggedCharIndex === index,
            'drag-over': dragOverCharIndex === index && draggedCharIndex !== index
          }"
          :draggable="canReorder(char)"
          @dragstart="onDragStart($event, index)"
          @dragover="onDragOver($event, index)"
          @dragleave="onDragLeave($event, index)"
          @drop="onDrop($event, index)"
          @dragend="onDragEnd"
          @click="selectCharacter(char)"
        >
          <span
            v-if="canReorder(char)"
            class="drag-handle"
            title="Drag to reorder"
            @click.stop
          >⋮⋮</span>
          <div class="char-item-info">
            <span class="char-name">{{ char.name || 'Unnamed' }}</span>
            <span class="char-sub">{{ char.race || 'Unknown Species' }} • Tier {{ getCharTier(char) }} • STA {{ char.current_stamina }}/{{ char.max_stamina }}</span>
          </div>
          <div class="char-item-actions">
            <div v-if="canReorder(char)" class="reorder-actions">
              <button
                type="button"
                class="btn-reorder btn-move-up"
                title="Move Up"
                :disabled="index === 0"
                @click.stop="moveCharacter(index, -1)"
              >▲</button>
              <button
                type="button"
                class="btn-reorder btn-move-down"
                title="Move Down"
                :disabled="index === characters.length - 1"
                @click.stop="moveCharacter(index, 1)"
              >▼</button>
            </div>
            <button class="btn-delete-small" title="Delete Character" @click.stop="deleteCharacter(char.id)">✕</button>
          </div>
        </li>
      </ul>
    </aside>

    <!-- Main Content Area -->
    <main
      ref="mainScroll"
      class="sheet-main sheet-detail has-sheet-bg"
      @scroll="onScrollSave"
    >
      <!-- Error Feedback Banner (Bug 29) -->
      <div v-if="errorMessage" class="error-banner">
        <span>⚠️ {{ errorMessage }}</span>
        <button type="button" class="btn-dismiss-error" @click="errorMessage = ''">✕</button>
      </div>

      <div v-if="!selectedChar" class="no-selection">
        <div class="stub-icon">📋</div>
        <h2>Select or Create a Character</h2>
        <p>Choose a character sheet from the sidebar or build a new Alpha Dawn hero.</p>
      </div>

      <div v-else class="sheet-container">
        <!-- Header Info -->
        <header class="sheet-header">
          <div class="header-main">
            <div class="portrait-box" @click="openImageBrowser('char')" title="Click to select character portrait">
              <img v-if="selectedChar.avatar_url" :src="selectedChar.avatar_url" class="portrait-img" alt="Character Portrait" />
              <div v-else class="portrait-placeholder">Click to select<br/>Token Image</div>
            </div>
            <div class="header-content">
              <div class="header-top-row">
                <input
                  type="text"
                  v-model="selectedChar.name"
                  @change="updateCharacter"
                  class="input-name"
                  placeholder="Character Name"
                />
                <span class="badge-tier">Tier {{ characterTier }}</span>
                <button
                  class="btn-action-download"
                  @click="downloadAsciiSheet"
                  title="Download ASCII Character Record (.txt)"
                >
                  Download Sheet (.txt)
                </button>
              </div>

              <div class="header-sub-row">
                <div class="race-select-wrap">
                  <label>Species:</label>
                  <select v-model="selectedRaceCategory" class="select-race">
                    <option value="Human">Human</option>
                    <option value="Dralasite">Dralasite</option>
                    <option value="Vrusk">Vrusk</option>
                    <option value="Yazirian">Yazirian</option>
                    <option value="Custom">Custom</option>
                  </select>
                  <input
                    v-if="selectedRaceCategory === 'Custom'"
                    type="text"
                    v-model="selectedChar.race"
                    @change="onCustomRaceChange"
                    class="input-custom-race"
                    placeholder="Custom Species Name"
                  />
                </div>
                <div class="psa-select-wrap">
                  <label>PSA:</label>
                  <select v-model="selectedChar.psa" @change="updateCharacter" class="select-psa">
                    <option value="Military">Military</option>
                    <option value="Technological">Technological</option>
                    <option value="Biosocial">Biosocial</option>
                  </select>
                </div>
                <div v-if="isGm && registeredUsers.length > 0" class="player-select-wrap">
                  <label>Player:</label>
                  <select v-model="selectedChar.user_id" @change="updateCharacter" class="select-player">
                    <option v-for="u in registeredUsers" :key="u.id" :value="u.id">
                      {{ u.username }} ({{ u.role === 'GameMaster' ? 'GM' : 'Player' }})
                    </option>
                  </select>
                </div>
                <div v-else-if="selectedChar.owner_username" class="player-badge-wrap">
                  <span class="badge-player" title="Assigned Player">
                    👤 {{ selectedChar.owner_username }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Derived Tactical Sub-Stats Bar -->
          <div class="tactical-bar">
            <div class="tactical-stat">
              <span class="tactical-label">IM</span>
              <span class="tactical-value">+{{ derivedIM }}</span>
            </div>
            <div class="tactical-stat">
              <span class="tactical-label">Melee Base Hit</span>
              <span class="tactical-value">{{ derivedMeleeHit }}%</span>
            </div>
            <div class="tactical-stat">
              <span class="tactical-label">Movement (Walk/Run/Glide)</span>
              <span class="tactical-value">
                {{ movementRates.walk }} / {{ movementRates.run }} / {{ movementRates.glide }} m/s
              </span>
            </div>
            <div class="tactical-stat encumbrance-stat">
              <span class="tactical-label">Encumbrance ({{ totalInventoryWeight }} / {{ unencumberedMaxWeight }} kg)</span>
              <div class="encumbrance-bar-bg">
                <div
                  class="encumbrance-bar-fill"
                  :style="{ width: encumbrancePct + '%', backgroundColor: encumbranceColor }"
                ></div>
              </div>
              <span class="encumbrance-sub" :class="{ 'over-limit': isOverloaded }">
                Max Carry: {{ maxCarryWeight }} kg
              </span>
            </div>
          </div>
        </header>

        <!-- Middle Section: Primary Attributes (Left) and Compact Trackers (Right) -->
        <div class="middle-section-grid">
          <!-- Left Column: Primary D100 Stats (2x2 Grid) -->
          <section class="card stats-section">
            <div class="panel-header-simple">
              <span class="tracker-label">PRIMARY ATTRIBUTES</span>
            </div>
            <div class="stats-grid">
              <!-- STR / STA -->
              <div class="stat-pair-box">
                <div class="stat-pair-header">STR / STA</div>
                <div class="stat-inputs-row">
                  <div class="sub-stat">
                    <label>STR</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.str"
                      @change="onStatChange('str')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div class="shift-controls">
                    <button class="btn-shift" title="Shift point to STR" @click="shiftStat('str', 'sta', 1)">◄</button>
                    <button class="btn-shift" title="Shift point to STA" @click="shiftStat('str', 'sta', -1)">►</button>
                  </div>
                  <div class="sub-stat">
                    <label>STA</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.sta"
                      @change="onStatChange('sta')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <!-- DEX / RS -->
              <div class="stat-pair-box">
                <div class="stat-pair-header">DEX / RS</div>
                <div class="stat-inputs-row">
                  <div class="sub-stat">
                    <label>DEX</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.dex"
                      @change="onStatChange('dex')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div class="shift-controls">
                    <button class="btn-shift" title="Shift point to DEX" @click="shiftStat('dex', 'rs', 1)">◄</button>
                    <button class="btn-shift" title="Shift point to RS" @click="shiftStat('dex', 'rs', -1)">►</button>
                  </div>
                  <div class="sub-stat">
                    <label>RS</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.rs"
                      @change="onStatChange('rs')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <!-- INT / LOG -->
              <div class="stat-pair-box">
                <div class="stat-pair-header">INT / LOG</div>
                <div class="stat-inputs-row">
                  <div class="sub-stat">
                    <label>INT</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.int"
                      @change="onStatChange('int')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div class="shift-controls">
                    <button class="btn-shift" title="Shift point to INT" @click="shiftStat('int', 'log', 1)">◄</button>
                    <button class="btn-shift" title="Shift point to LOG" @click="shiftStat('int', 'log', -1)">►</button>
                  </div>
                  <div class="sub-stat">
                    <label>LOG</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.log"
                      @change="onStatChange('log')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <!-- PER / LDR -->
              <div class="stat-pair-box">
                <div class="stat-pair-header">PER / LDR</div>
                <div class="stat-inputs-row">
                  <div class="sub-stat">
                    <label>PER</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.per"
                      @change="onStatChange('per')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div class="shift-controls">
                    <button class="btn-shift" title="Shift point to PER" @click="shiftStat('per', 'ldr', 1)">◄</button>
                    <button class="btn-shift" title="Shift point to LDR" @click="shiftStat('per', 'ldr', -1)">►</button>
                  </div>
                  <div class="sub-stat">
                    <label>LDR</label>
                    <input
                      type="number"
                      v-model.number="selectedChar.ldr"
                      @change="onStatChange('ldr')"
                      class="stat-input"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Right Column: Compact Trackers (STA, SEU, XP) -->
          <section class="card trackers-section">
            <!-- Stamina Tracker -->
            <div class="tracker-item stamina-section">
              <div class="stamina-header">
                <span class="tracker-label">STAMINA (STA)</span>
                <div class="stamina-header-right">
                  <button class="btn-action-reset" @click="resetCharacterStats" title="Full Rest: Restore STA and SEU to maximum">
                    Rest
                  </button>
                  <div class="stamina-values">
                    <span class="current">{{ selectedChar.current_stamina }}</span> /
                    <input
                      type="number"
                      v-model.number="selectedChar.max_stamina"
                      @change="onMaxStaminaChange"
                      class="input-max-sta"
                      min="1"
                    /> Max
                  </div>
                </div>
              </div>
              <div class="stamina-bar-bg">
                <div
                  class="stamina-bar-fill"
                  :style="{ width: staminaPercentage + '%', backgroundColor: staminaColor }"
                ></div>
              </div>
              <div class="stamina-controls">
                <div class="stepper-group">
                  <button class="btn-sta btn-sub" @click="adjustStamina(-5)">-5</button>
                  <button class="btn-sta btn-sub" @click="adjustStamina(-1)">-1</button>
                  <button class="btn-sta btn-add" @click="adjustStamina(+1)">+1</button>
                  <button class="btn-sta btn-add" @click="adjustStamina(+5)">+5</button>
                </div>
                <div class="freeform-delta-group">
                  <input
                    type="number"
                    v-model.number="staminaDelta"
                    placeholder="Amt"
                    min="1"
                    class="input-delta"
                    @keydown.enter.prevent="applyStaminaDamage"
                  />
                  <button class="btn-delta btn-sub" @click="applyStaminaDamage" title="Subtract damage from Stamina">- Dmg</button>
                  <button class="btn-delta btn-add" @click="applyStaminaHeal" title="Add healing to Stamina">+ Heal</button>
                </div>
              </div>
            </div>

            <!-- SEU Energy Pool Tracker -->
            <div class="tracker-item seu-section">
              <div class="seu-header">
                <span class="tracker-label">SEU ENERGY POOL</span>
                <div class="seu-header-right">
                  <button class="btn-action-reload" @click="reloadSeu" title="Reload: Restore SEU to maximum">
                    Reload
                  </button>
                  <div class="seu-values">
                    <span class="current">{{ selectedChar.current_seu ?? 50 }}</span> /
                    <input
                      type="number"
                      v-model.number="selectedChar.max_seu"
                      @change="onMaxSeuChange"
                      class="input-max-seu"
                      min="0"
                    /> Max
                  </div>
                </div>
              </div>
              <div class="seu-bar-bg">
                <div
                  class="seu-bar-fill"
                  :style="{ width: seuPercentage + '%', backgroundColor: seuColor }"
                ></div>
              </div>
              <div class="seu-controls">
                <div class="stepper-group">
                  <button class="btn-seu btn-sub" @click="adjustSeu(-5)" title="Heavy Laser / Screen Turn (-5 SEU)">-5</button>
                  <button class="btn-seu btn-sub" @click="adjustSeu(-1)" title="Fire Laser Pistol / Stunner (-1 SEU)">-1</button>
                  <button class="btn-seu btn-add" @click="adjustSeu(+1)" title="Recharge / Add 1 SEU (+1 SEU)">+1</button>
                  <button class="btn-seu btn-add" @click="adjustSeu(+5)" title="Recharge / Add 5 SEU (+5 SEU)">+5</button>
                </div>
                <div class="freeform-delta-group">
                  <input
                    type="number"
                    v-model.number="seuDelta"
                    placeholder="Amt"
                    min="1"
                    class="input-delta"
                    @keydown.enter.prevent="applySeuBurn"
                  />
                  <button class="btn-delta btn-sub" @click="applySeuBurn" title="Burn / Spend SEU">- Spend</button>
                  <button class="btn-delta btn-add" @click="applySeuRecharge" title="Recharge / Add SEU">+ Charge</button>
                </div>
              </div>
            </div>

            <!-- Experience Points (XP) Tracker -->
            <div class="tracker-item xp-section">
              <div class="xp-header">
                <span class="tracker-label">EXPERIENCE POINTS (XP)</span>
                <div class="xp-header-right">
                  <div class="xp-values">
                    <span class="current">{{ selectedChar.current_xp ?? 0 }} XP</span>
                  </div>
                  <div class="freeform-delta-group xp-delta-group">
                    <input
                      type="number"
                      v-model.number="xpDelta"
                      placeholder="Amt"
                      min="1"
                      class="input-delta"
                      @keydown.enter.prevent="applyXpAward"
                    />
                    <button class="btn-delta btn-sub" @click="applyXpSpend" title="Spend XP">- Spend</button>
                    <button class="btn-delta btn-add" @click="applyXpAward" title="Award XP">+ Award</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Detailed Species Abilities Panel -->
        <section class="card racial-panel species-traits-banner">
          <span class="traits-badge">🧬 Species Traits &amp; Abilities &bull; {{ selectedChar.race }}</span>
          <div v-if="selectedChar.race === 'Human'" class="traits-rule-text">
            <span><strong>Human Adaptability:</strong> Versatile species. Receives a <strong>+5 bonus</strong> to any single ability score during creation.</span>
          </div>
          <div v-else-if="selectedChar.race === 'Dralasite'" class="traits-rule-text">
            <span><strong>Elasticity:</strong> Can sprout up to <strong>{{ dralasiteLimbsLimit }}</strong> limbs (DEX / 10).</span>
            <span><strong>Lie Detection:</strong> <strong>{{ lieDetectionChance }}%</strong> base chance (5% base + 5% per level if skill used).</span>
          </div>
          <div v-else-if="selectedChar.race === 'Vrusk'" class="traits-rule-text">
            <span><strong>Ambidexterity:</strong> Can use either hand without off-hand penalty.</span>
            <span><strong>Comprehension:</strong> <strong>{{ comprehensionChance }}%</strong> base chance to understand unknown machinery/technology.</span>
          </div>
          <div v-else-if="selectedChar.race === 'Yazirian'" class="traits-rule-text">
            <span><strong>Gliding:</strong> Can glide using skin membranes (Glide movement: <strong>4 m/s</strong>).</span>
            <span><strong>Battle Rage:</strong> <strong>{{ battleRageChance }}%</strong> base chance. When enraged, gains <strong>+20 bonus</strong> to hit in melee.</span>
          </div>
          <div v-else class="traits-rule-text">
            <span><strong>Custom Species:</strong> Custom species without standard Star Frontiers species traits.</span>
          </div>
        </section>

        <!-- Lists: Skills & Inventory -->
        <div class="two-column-lists">
          <!-- Skills -->
          <section class="card list-card">
            <div class="list-header">
              <h4>Skills & Experience</h4>
              <button class="btn-secondary" @click="showSkillsModal = true">+ Skill</button>
            </div>
            <div class="skills-search-wrap" style="margin-bottom: 12px;">
              <input 
                type="text" 
                v-model="searchSkillsQuery" 
                placeholder="Search Skills..." 
                class="item-name-input" 
                style="width: 100%; box-sizing: border-box;"
              />
            </div>
            <div v-if="!filteredSkills || filteredSkills.length === 0" class="empty-list">
              {{ searchSkillsQuery ? 'No matching skills.' : 'No skills added. Click + Skill to add from catalog!' }}
            </div>
            <ul v-else class="items-list skills-items-scroll">
              <li
                v-for="(skill, index) in filteredSkills"
                :key="skill.id || index"
                class="item-row skill-row"
                :class="{ 'drag-over': dragOverSkillIndex === index, 'dragging': draggedSkillIndex === index }"
                draggable="true"
                @dragstart="onSkillDragStart($event, index)"
                @dragover="onSkillDragOver($event, index)"
                @dragleave="onSkillDragLeave($event, index)"
                @drop="onSkillDrop($event, index)"
                @dragend="onSkillDragEnd"
              >
                <span
                  class="drag-handle"
                  title="Drag to reorder skill"
                  @click.stop
                >⋮⋮</span>
                <div class="skill-name-col">
                  <span class="item-name-text">{{ skill.name }}</span>
                  <span class="skill-psa-tag">[{{ getSkillPSA(skill.name) }}]</span>
                </div>
                <div class="skill-chance-col">
                  <span class="skill-chance-badge" title="Calculated Success Chance">
                    {{ getSkillSuccessChance(skill) }}%
                  </span>
                </div>
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
                  <button
                    v-if="skill.level < 6"
                    class="btn-xp-upgrade"
                    :title="`Upgrade to Level ${skill.level + 1}`"
                    @click="upgradeSkillLevel(skill)"
                  >
                    +Lvl ({{ getXPCost(skill.name, skill.level + 1, skill.psa) }} XP)
                  </button>
                  <span
                    v-else
                    class="btn-xp-upgrade btn-xp-placeholder"
                    aria-hidden="true"
                  ></span>
                </div>
                <div class="reorder-actions">
                  <button
                    type="button"
                    class="btn-reorder btn-move-up"
                    title="Move Skill Up"
                    :disabled="isSkillMoveDisabled(skill, -1)"
                    @click.stop="moveSkill(skill, -1)"
                  >▲</button>
                  <button
                    type="button"
                    class="btn-reorder btn-move-down"
                    title="Move Skill Down"
                    :disabled="isSkillMoveDisabled(skill, 1)"
                    @click.stop="moveSkill(skill, 1)"
                  >▼</button>
                </div>
                <button class="btn-remove" title="Remove Skill" @click="removeSkill(skill)">✕</button>
              </li>
            </ul>
          </section>

          <!-- Inventory -->
          <section class="card list-card">
            <div class="list-header">
              <h4>Inventory & Mass</h4>
              <div class="list-header-actions">
                <button class="btn-secondary" @click="showEquipmentModal = true">+ Equipment</button>
                <button class="btn-secondary" @click="addInventoryItem">+ Custom Item</button>
              </div>
            </div>
            <div class="inventory-search-wrap" style="margin-bottom: 12px;">
              <input 
                type="text" 
                v-model="searchInventoryQuery" 
                placeholder="Search Inventory..." 
                class="item-name-input" 
                style="width: 100%; box-sizing: border-box;"
              />
            </div>
            <div v-if="!filteredInventory || filteredInventory.length === 0" class="empty-list">
              {{ searchInventoryQuery ? 'No matching items in inventory.' : 'No equipment in inventory. Search available equipment or add a custom item!' }}
            </div>
            <ul v-else class="items-list inventory-items-scroll">
              <li
                v-for="(item, index) in filteredInventory"
                :key="item.id || index"
                class="item-row inventory-row"
                :class="{ 'drag-over': dragOverInventoryIndex === index, 'dragging': draggedInventoryIndex === index }"
                draggable="true"
                @dragstart="onInventoryDragStart($event, index)"
                @dragover="onInventoryDragOver($event, index)"
                @dragleave="onInventoryDragLeave($event, index)"
                @drop="onInventoryDrop($event, index)"
                @dragend="onInventoryDragEnd"
              >
                <span
                  class="drag-handle"
                  title="Drag to reorder item"
                  @click.stop
                >⋮⋮</span>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                  <template v-if="editingItemIndex === index">
                    <input
                      ref="itemNameInput"
                      type="text"
                      v-model="item.name"
                      @blur="finishEditItemName"
                      @keydown.enter.prevent="finishEditItemName"
                      placeholder="Item Name"
                      class="item-name-input editing"
                    />
                  </template>
                  <template v-else>
                    <span
                      class="item-name-text"
                      @dblclick="startEditItemName(item, index)"
                      title="Double-click to rename item"
                    >{{ item.name }}</span>
                  </template>
                  <input 
                    type="text"
                    v-model="item.notes"
                    @change="updateCharacter"
                    placeholder="Notes / Capabilities"
                    class="item-name-input"
                    style="font-size: 0.8rem; color: #8b949e; background: transparent; border: 1px dashed #30363d;"
                  />
                </div>
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
                <div class="reorder-actions">
                  <button
                    type="button"
                    class="btn-reorder btn-move-up"
                    title="Move Item Up"
                    :disabled="isInventoryMoveDisabled(item, -1)"
                    @click.stop="moveInventoryItem(item, -1)"
                  >▲</button>
                  <button
                    type="button"
                    class="btn-reorder btn-move-down"
                    title="Move Item Down"
                    :disabled="isInventoryMoveDisabled(item, 1)"
                    @click.stop="moveInventoryItem(item, 1)"
                  >▼</button>
                </div>
                <button class="btn-remove" title="Remove Item" @click="removeInventoryItem(item)">✕</button>
              </li>
            </ul>
          </section>
        </div>

        <!-- Notes Section -->
        <section class="notes-section">
          <div class="section-header notes-section-header">
            <h4>Notes</h4>
            <button
              type="button"
              class="btn-secondary btn-add-note-panel"
              :disabled="selectedChar.note_panels && selectedChar.note_panels.length >= 4"
              @click="addNotePanel"
              :title="selectedChar.note_panels && selectedChar.note_panels.length >= 4 ? 'Maximum of 4 note panels reached' : 'Add Note Panel'"
            >
              + Add Note Panel
            </button>
          </div>
          <div v-if="!selectedChar.note_panels || selectedChar.note_panels.length === 0" class="panels-empty card">
            <p>No note panels yet. Click <strong>+ Add Note Panel</strong> above to create one!</p>
          </div>
          <div v-else class="note-panels-grid">
            <section
              v-for="(panel, index) in selectedChar.note_panels"
              :key="panel.id || index"
              class="note-panel-card card"
              :class="{ 'panel-drag-over': dragOverNotePanelIndex === index }"
              draggable="true"
              @dragstart="onNotePanelDragStart($event, index)"
              @dragover.prevent="onNotePanelDragOver($event, index)"
              @dragleave="onNotePanelDragLeave($event, index)"
              @drop="onNotePanelDrop($event, index)"
              @dragend="onNotePanelDragEnd"
            >
              <div class="panel-card-header">
                <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
                <input
                  type="text"
                  v-model="panel.title"
                  @change="updateNotePanels"
                  class="panel-title-input"
                  placeholder="Note Title"
                />
                <div class="reorder-actions">
                  <button
                    type="button"
                    class="btn-reorder btn-move-up"
                    title="Move Panel Up"
                    :disabled="index === 0"
                    @click.stop="moveNotePanel(index, -1)"
                  >▲</button>
                  <button
                    type="button"
                    class="btn-reorder btn-move-down"
                    title="Move Panel Down"
                    :disabled="index === selectedChar.note_panels.length - 1"
                    @click.stop="moveNotePanel(index, 1)"
                  >▼</button>
                </div>
                <button
                  type="button"
                  class="btn-delete-panel"
                  title="Delete Note Panel"
                  @click="deleteNotePanel(index)"
                >✕</button>
              </div>
              <textarea
                v-model="panel.content"
                @change="updateNotePanels"
                class="notes-textarea panel-content-textarea"
                rows="6"
                placeholder="Write notes, background details, mission logs..."
              ></textarea>
            </section>
          </div>
        </section>
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
            <label>Character Portrait / Avatar (Optional)</label>
            <div class="modal-avatar-row">
              <div v-if="newCharForm.avatar_url" class="modal-avatar-preview" @click="openImageBrowser('create')" title="Click to change image">
                <img :src="newCharForm.avatar_url" alt="Character Avatar Preview" />
                <button type="button" class="btn-remove-avatar" title="Remove image" @click.stop="newCharForm.avatar_url = ''">✕</button>
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
            <label>Species</label>
            <select v-model="newCharForm.race" class="char-create-select">
              <option value="Human">Human (+5 XP bonus / adaptable)</option>
              <option value="Dralasite">Dralasite (Lie Detection & Elasticity)</option>
              <option value="Vrusk">Vrusk (Ambidexterity & Comprehensive)</option>
              <option value="Yazirian">Yazirian (Battle Rage & Gliding)</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div v-if="newCharForm.race === 'Custom'" class="form-group custom-race-input-group">
            <label>Custom Species Name</label>
            <input
              type="text"
              v-model="newCharForm.customRaceName"
              class="char-create-input"
              placeholder="Enter custom species name..."
            />
          </div>
          <div class="form-group">
            <label>Primary System Area (PSA)</label>
            <select v-model="newCharForm.psa" class="char-create-select">
              <option value="Military">Military</option>
              <option value="Technological">Technological</option>
              <option value="Biosocial">Biosocial</option>
            </select>
          </div>
          <div v-if="isGm && registeredUsers.length > 0" class="form-group">
            <label>Assigned Player</label>
            <select v-model="newCharForm.user_id" class="char-create-select">
              <option v-for="u in registeredUsers" :key="u.id" :value="u.id">
                {{ u.username }} ({{ u.role === 'GameMaster' ? 'GM' : 'Player' }})
              </option>
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
            <button type="button" class="btn-modal-cancel" @click="showCreateModal = false">Cancel</button>
            <button type="submit" class="btn-modal-create" :disabled="creating">Create Character</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Equipment Catalog Modal -->
    <div v-if="showEquipmentModal" class="modal-backdrop" @click.self="showEquipmentModal = false">
      <div class="modal-card equipment-modal">
        <div class="equipment-modal-header">
          <h3>Available Equipment Catalog</h3>
          <button class="btn-close-modal" title="Close" @click="showEquipmentModal = false">✕</button>
        </div>
        <p class="equipment-modal-desc">
          Search weapons, defenses, and gear from the Star Frontiers catalog. Click <strong>+ Add</strong> to add an item to your character's inventory.
        </p>

        <!-- Category Filter Tabs -->
        <div class="equipment-category-tabs" role="tablist" aria-label="Equipment Categories">
          <button
            v-for="cat in equipmentCategories"
            :key="cat"
            type="button"
            role="tab"
            class="cat-tab"
            :class="{ active: (activeEquipmentCategory || 'All') === cat }"
            :aria-selected="(activeEquipmentCategory || 'All') === cat"
            @click="activeEquipmentCategory = cat"
          >
            {{ cat }} <span class="cat-count">({{ getCategoryCount(cat) }})</span>
          </button>
        </div>

        <input 
          type="text" 
          v-model="equipmentSearchQuery" 
          placeholder="Search available equipment by name, category, or capability..." 
          class="modal-search"
          autofocus
        />
        <div class="equipment-list">
          <div v-if="filteredEquipmentList.length === 0" class="empty-list">No equipment found matching your search.</div>
          <div v-for="item in filteredEquipmentList" :key="item.name" class="equipment-card">
            <div class="eq-header">
              <span class="eq-name">{{ item.name }}</span>
              <button
                class="btn-secondary eq-add-btn"
                :class="{ 'btn-added': recentlyAddedMap[item.name] }"
                @click="addEquipment(item)"
              >
                {{ recentlyAddedMap[item.name] ? '✓ Added' : '+ Add' }}
              </button>
            </div>
            <div class="eq-details">
              <span class="eq-tag">{{ item.category }}</span>
              <span class="eq-cost">{{ item.cost }} Cr</span>
              <span class="eq-weight">{{ item.weight }} kg</span>
            </div>
            <div class="eq-capabilities">{{ item.capabilities }}</div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="showEquipmentModal = false">Done</button>
        </div>
      </div>
    </div>

    <!-- Skills Catalog Modal -->
    <div v-if="showSkillsModal" class="modal-backdrop" @click.self="showSkillsModal = false">
      <div class="modal-card equipment-modal">
        <div class="equipment-modal-header">
          <h3>Available Skills Catalog</h3>
          <button class="btn-close-modal" title="Close" @click="showSkillsModal = false">✕</button>
        </div>
        <p class="equipment-modal-desc">
          Browse official Star Frontiers skills. Click <strong>+ Add</strong> to add a skill to your character sheet.
        </p>

        <!-- Category Filter Tabs -->
        <div class="equipment-category-tabs" role="tablist" aria-label="Skill Categories">
          <button
            v-for="cat in skillCategories"
            :key="cat"
            type="button"
            role="tab"
            class="cat-tab"
            :class="{ active: (activeSkillCategory || 'All') === cat }"
            :aria-selected="(activeSkillCategory || 'All') === cat"
            @click="activeSkillCategory = cat"
          >
            {{ cat }} <span class="cat-count">({{ getSkillCategoryCount(cat) }})</span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="equipment-search-wrap">
          <input
            type="text"
            v-model="skillsCatalogSearchQuery"
            placeholder="Search skills by name, PSA, or base attribute..."
            class="equipment-search-input"
          />
        </div>

        <!-- Skills List -->
        <div class="equipment-catalog-list">
          <div v-if="filteredSkillsCatalog.length === 0" class="empty-list">
            No skills found matching your filter criteria.
          </div>
          <div v-for="skill in filteredSkillsCatalog" :key="skill.name" class="equipment-card">
            <div class="eq-header">
              <span class="eq-name">{{ skill.name }}</span>
              <button
                class="btn-secondary eq-add-btn"
                :class="{
                  'btn-added': recentlyAddedSkillMap[skill.name] || isSkillInSheet(skill.name)
                }"
                :disabled="!!isSkillInSheet(skill.name)"
                @click="addSkillFromCatalog(skill)"
              >
                {{
                  recentlyAddedSkillMap[skill.name]
                    ? '✓ Added'
                    : isSkillInSheet(skill.name)
                    ? `In Sheet (Lvl ${isSkillInSheet(skill.name).level})`
                    : '+ Add'
                }}
              </button>
            </div>
            <div class="eq-details">
              <span class="eq-tag">{{ skill.psa }}</span>
              <span class="eq-cost">Base: {{ skill.baseChance }}</span>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="showSkillsModal = false">Done</button>
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

<script>
import { socket } from '../services/socket.js';
import { useAuthStore } from '../stores/auth.js';
import {
  RACES_DATA,
  OFFICIAL_SKILLS,
  calcIM,
  calcMeleeHit,
  calcMaxCarry,
  calcUnencumberedMax,
  calcXPCost,
} from '../constants/characterRules.js';
import ImageBrowserModal from '../components/ImageBrowserModal.vue';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';
import { downloadCharacterAscii } from '../utils/characterExport.js';

export function parseCharacterNotePanels(notes) {
  if (Array.isArray(notes)) {
    return notes.slice(0, 4).map((p, idx) => ({
      id: p.id || `p_${Date.now()}_${idx}`,
      title: p.title !== undefined ? String(p.title) : 'Note',
      content: p.content !== undefined ? String(p.content) : '',
    }));
  }
  if (typeof notes === 'string' && notes.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(notes);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 4).map((p, idx) => ({
          id: p.id || `p_${Date.now()}_${idx}`,
          title: p.title !== undefined ? String(p.title) : 'Note',
          content: p.content !== undefined ? String(p.content) : '',
        }));
      }
    } catch {
      // Fallback to legacy plain string
    }
  }
  if (typeof notes === 'string' && notes.trim()) {
    return [
      { id: 'p_notes', title: 'Notes', content: notes.trim() },
    ];
  }
  return [];
}

export default {
  name: 'CharacterSheetsView',
  components: {
    ImageBrowserModal,
  },
  data() {
    let collapsed = false;
    try {
      const stored = localStorage.getItem('sf_chars_sidebar_collapsed');
      if (stored !== null) collapsed = JSON.parse(stored);
    } catch (e) {
      // ignore
    }
    return {
      showSheetBackground: true,
      isSidebarCollapsed: collapsed,
      characters: [],
      selectedChar: null,
      loading: true,
      creating: false,
      errorMessage: '',
      draggedCharIndex: null,
      dragOverCharIndex: null,
      draggedSkillIndex: null,
      dragOverSkillIndex: null,
      draggedInventoryIndex: null,
      dragOverInventoryIndex: null,
      editingItemIndex: null,
      draggedNotePanelIndex: null,
      dragOverNotePanelIndex: null,
      showCreateModal: false,
      showImageBrowser: false,
      imageBrowserTarget: 'char',
      racesData: RACES_DATA,
      officialSkills: OFFICIAL_SKILLS,
      equipmentList: [],
      showEquipmentModal: false,
      activeEquipmentCategory: 'All',
      equipmentCategories: ['All', 'Weapon', 'Ammunition', 'Defense', 'Toolkit', 'Medical', 'Gear', 'Power'],
      equipmentSearchQuery: '',
      searchInventoryQuery: '',
      searchSkillsQuery: '',
      showSkillsModal: false,
      activeSkillCategory: 'All',
      skillsCatalogSearchQuery: '',
      recentlyAddedSkillMap: {},
      skillCategories: ['All', 'Military', 'Technological', 'Biosocial', 'Spaceship'],
      recentlyAddedMap: {},
      registeredUsers: [],
      newCharForm: {
        name: '',
        race: 'Human',
        customRaceName: '',
        psa: 'Military',
        avatar_url: '',
        user_id: null,
        str_sta: 50,
        dex_rs: 50,
        int_log: 50,
        per_ldr: 50,
        max_stamina: 50,
        current_stamina: 50,
        current_xp: 0,
      },
      staminaDelta: null,
      seuDelta: null,
      xpDelta: null,
    };
  },
  computed: {
    characterTier() {
      return this.getCharTier(this.selectedChar);
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
      if (this.imageBrowserTarget === 'char') {
        return this.selectedChar ? (this.selectedChar.avatar_url || '') : '';
      }
      return this.newCharForm ? (this.newCharForm.avatar_url || '') : '';
    },
    imageBrowserTitle() {
      return this.imageBrowserTarget === 'char' ? 'Select Character Portrait' : 'Select Character Avatar';
    },
    filteredEquipmentList() {
      if (!this.equipmentList) return [];
      let list = this.equipmentList;
      if (this.activeEquipmentCategory && this.activeEquipmentCategory !== 'All') {
        list = list.filter(item => item.category === this.activeEquipmentCategory);
      }
      if (!this.equipmentSearchQuery) return list;
      const q = this.equipmentSearchQuery.toLowerCase().trim();
      return list.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) || 
        (item.category && item.category.toLowerCase().includes(q)) || 
        (item.capabilities && item.capabilities.toLowerCase().includes(q))
      );
    },
    filteredInventory() {
      if (!this.selectedChar || !this.selectedChar.inventory) return [];
      if (!this.searchInventoryQuery) return this.selectedChar.inventory;
      const q = this.searchInventoryQuery.toLowerCase().trim();
      return this.selectedChar.inventory.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    },
    filteredSkills() {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.skills)) return [];
      const q = (this.searchSkillsQuery || '').trim().toLowerCase();
      if (!q) return this.selectedChar.skills;
      const skills = this.officialSkills || OFFICIAL_SKILLS;
      return this.selectedChar.skills.filter((sk) => {
        const nameMatch = sk.name && sk.name.toLowerCase().includes(q);
        const shortPsa = this.getSkillPSA(sk.name);
        const found = skills.find((s) => s.name.toLowerCase() === (sk.name || '').toLowerCase());
        const fullPsa = found ? found.psa : 'Custom';
        const psaMatch = (shortPsa && shortPsa.toLowerCase().includes(q)) || (fullPsa && fullPsa.toLowerCase().includes(q));
        return nameMatch || psaMatch;
      });
    },
    filteredSkillsCatalog() {
      let list = this.officialSkills || [];
      const cat = this.activeSkillCategory || 'All';
      if (cat !== 'All') {
        list = list.filter((sk) => sk.psa === cat);
      }
      const q = (this.skillsCatalogSearchQuery || '').trim().toLowerCase();
      if (q) {
        list = list.filter((sk) =>
          sk.name.toLowerCase().includes(q) ||
          (sk.psa && sk.psa.toLowerCase().includes(q)) ||
          (sk.baseChance && sk.baseChance.toLowerCase().includes(q))
        );
      }
      return list;
    },
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
    seuPercentage() {
      if (!this.selectedChar || !this.selectedChar.max_seu) return 0;
      const pct = (this.selectedChar.current_seu / this.selectedChar.max_seu) * 100;
      return Math.max(0, Math.min(100, pct));
    },
    seuColor() {
      const pct = typeof this.seuPercentage === 'number' ? this.seuPercentage : (this.selectedChar?.max_seu ? (this.selectedChar.current_seu / this.selectedChar.max_seu) * 100 : 0);
      if (pct > 50) return '#4caf50';
      if (pct > 25) return '#ff9800';
      return '#f44336';
    },
    derivedIM() {
      if (!this.selectedChar) return 5;
      return calcIM(this.selectedChar.rs);
    },
    derivedMeleeHit() {
      if (!this.selectedChar) return 25;
      return calcMeleeHit(this.selectedChar.str, this.selectedChar.dex);
    },
    maxCarryWeight() {
      if (!this.selectedChar) return 50;
      return calcMaxCarry(this.selectedChar.str);
    },
    unencumberedMaxWeight() {
      if (!this.selectedChar) return 25;
      return calcUnencumberedMax(this.selectedChar.str);
    },
    totalInventoryWeight() {
      if (!this.selectedChar || !this.selectedChar.inventory) return 0;
      return this.selectedChar.inventory.reduce((sum, item) => {
        const qty = item.quantity || 1;
        const w = Number(item.weight) || 0;
        return sum + qty * w;
      }, 0);
    },
    encumbrancePct() {
      if (!this.maxCarryWeight) return 0;
      return Math.min(100, Math.round((this.totalInventoryWeight / this.maxCarryWeight) * 100));
    },
    encumbranceColor() {
      if (this.totalInventoryWeight > this.maxCarryWeight) return '#f44336';
      if (this.totalInventoryWeight > this.unencumberedMaxWeight) return '#ff9800';
      return '#4caf50';
    },
    isOverloaded() {
      return this.totalInventoryWeight > this.maxCarryWeight;
    },
    selectedRaceCategory: {
      get() {
        if (!this.selectedChar) return 'Human';
        if (!this.selectedChar.race) return 'Custom';
        return this.isCustomRace(this.selectedChar.race) ? 'Custom' : this.selectedChar.race;
      },
      set(val) {
        if (!this.selectedChar) return;
        if (val === 'Custom') {
          if (!this.isCustomRace(this.selectedChar.race) || !this.selectedChar.race?.trim()) {
            this.selectedChar.race = 'Custom';
            this.updateCharacter();
          }
        } else {
          this.selectedChar.race = val;
          this.updateCharacter();
        }
      },
    },
    movementRates() {
      if (!this.selectedChar || !RACES_DATA[this.selectedChar.race]) {
        return { walk: 2, run: 6, glide: 0 };
      }
      return RACES_DATA[this.selectedChar.race].movement;
    },
    dralasiteLimbsLimit() {
      if (!this.selectedChar) return 5;
      return Math.floor((this.selectedChar.dex ?? 50) / 10);
    },
    lieDetectionChance() {
      return 5;
    },
    comprehensionChance() {
      return 15;
    },
    battleRageChance() {
      return 5;
    },
  },
  mounted() {
    if (this.isGm) {
      this.fetchUsers();
    }
    this.fetchCharacters();
    this.fetchEquipment();
    this.setupSocketListeners();
  },
  beforeUnmount() {
    if (this._scrollSaveTimer) {
      clearTimeout(this._scrollSaveTimer);
      this._scrollSaveTimer = null;
    }
    this.saveScrollPositions();
    this.removeSocketListeners();
  },
  methods: {
    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
      try {
        localStorage.setItem('sf_chars_sidebar_collapsed', JSON.stringify(this.isSidebarCollapsed));
      } catch (e) {
        // ignore
      }
    },
    getCharTier(char) {
      if (!char) return 1;
      if (char.tier != null && !isNaN(char.tier)) return Number(char.tier);
      if (char.threat_tier != null && !isNaN(char.threat_tier)) return Number(char.threat_tier);
      const skills = Array.isArray(char.skills) ? char.skills : [];
      if (!skills.length) return 1;
      const levels = skills.map(s => Number(s.level) || 0);
      const maxLvl = Math.max(...levels, 0);
      const totalLevels = levels.reduce((sum, lvl) => sum + lvl, 0);
      if (maxLvl >= 6 || totalLevels >= 15) return 5;
      if (maxLvl >= 5 || totalLevels >= 10) return 4;
      if (maxLvl >= 3 || totalLevels >= 6) return 3;
      if (maxLvl >= 2 || totalLevels >= 3) return 2;
      return 1;
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
      const sidebarEl = this.$refs?.sidebarList || this.$el?.querySelector?.('.sheet-list, .character-list');
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
        saveUserState(uid, 'characterSheets', updates);
      }
    },
    restoreScrollPositions(saved) {
      const apply = () => {
        const sidebarEl = this.$refs?.sidebarList || this.$el?.querySelector?.('.sheet-list, .character-list');
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
    normalizeCharacterData(char) {
      const c = { ...char };
      if (!c.psa) c.psa = 'Military';
      // Ensure individual stats are set from paired stats if missing
      if (c.str === undefined) c.str = c.str_sta || 50;
      if (c.sta === undefined) c.sta = c.max_stamina !== undefined ? c.max_stamina : (c.str_sta || 50);
      c.max_stamina = c.sta;
      c.current_stamina = c.current_sta !== undefined ? c.current_sta : (c.current_stamina !== undefined ? c.current_stamina : c.sta);
      c.max_seu = c.max_seu !== undefined ? Number(c.max_seu) : 50;
      c.current_seu = c.current_seu !== undefined ? Number(c.current_seu) : c.max_seu;
      c.current_xp = Number(c.current_xp || 0);
      c.owner_username = c.owner_username || '';
      c.user_id = c.user_id !== undefined && c.user_id !== null ? Number(c.user_id) : null;

      if (c.dex === undefined) c.dex = c.dex_rs || 50;
      if (c.rs === undefined) c.rs = c.dex_rs || 50;
      c.int = c.int_stat ?? c.int ?? c.int_log ?? 50;
      c.log = c.log_stat ?? c.log ?? c.int_log ?? 50;
      if (c.per === undefined) c.per = c.per_ldr || 50;
      if (c.ldr === undefined) c.ldr = c.per_ldr || 50;

      if (!c.skills) c.skills = [];
      if (!c.inventory) c.inventory = [];
      c.avatar_url = c.avatar_url || '';
      c.notes = c.notes || '';
      if (Array.isArray(c.note_panels)) {
        c.note_panels = parseCharacterNotePanels(c.note_panels);
      } else {
        c.note_panels = parseCharacterNotePanels(c.notes);
      }
      return c;
    },
    async fetchCharacters() {
      this.loading = true;
      try {
        const res = await fetch('/api/characters', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          this.characters = data.map((c) => this.normalizeCharacterData(c));
          const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
          const saved = getUserState(uid, 'characterSheets', {
            selectedCharId: null,
            sidebarScrollTop: 0,
            mainScrollTop: 0,
          });
          if (this.characters.length > 0 && !this.selectedChar) {
            const match = saved.selectedCharId != null
              ? this.characters.find((c) => String(c.id) === String(saved.selectedCharId))
              : null;
            this.selectedChar = JSON.parse(JSON.stringify(match || this.characters[0]));
            if (this.restoreScrollPositions) {
              this.restoreScrollPositions(saved);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching characters:', err);
      } finally {
        this.loading = false;
      }
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
    isCustomRace(race) {
      return !['Human', 'Dralasite', 'Vrusk', 'Yazirian'].includes(race);
    },
    onCustomRaceChange() {
      if (!this.selectedChar) return;
      if (!this.selectedChar.race?.trim()) {
        this.selectedChar.race = 'Custom';
      } else {
        this.selectedChar.race = this.selectedChar.race.trim();
      }
      this.updateCharacter();
    },
    selectCharacter(char) {
      this.selectedChar = JSON.parse(JSON.stringify(this.normalizeCharacterData(char)));
      if (this.selectedChar && this.selectedChar.id !== undefined) {
        const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
        saveUserState(uid, 'characterSheets', { selectedCharId: this.selectedChar.id });
      }
    },
    openCreateModal() {
      let defaultUserId = null;
      try {
        const authStore = useAuthStore();
        defaultUserId = authStore?.user?.id ?? (this.registeredUsers?.[0]?.id ?? null);
      } catch {
        defaultUserId = this.registeredUsers?.[0]?.id ?? null;
      }
      this.newCharForm = {
        name: '',
        race: 'Human',
        customRaceName: '',
        psa: 'Military',
        avatar_url: '',
        user_id: defaultUserId,
        str_sta: 50,
        dex_rs: 50,
        int_log: 50,
        per_ldr: 50,
        max_stamina: 50,
        current_stamina: 50,
        current_xp: 0,
      };
      this.showCreateModal = true;
    },
    openImageBrowser(target = 'char') {
      this.imageBrowserTarget = target;
      this.showImageBrowser = true;
    },
    onImageSelected(url) {
      if (this.imageBrowserTarget === 'char') {
        if (this.selectedChar) {
          this.selectedChar.avatar_url = url;
          this.updateCharacter();
        }
      } else if (this.imageBrowserTarget === 'create') {
        this.newCharForm.avatar_url = url;
      }
    },
    async createCharacter() {
      if (!this.newCharForm.name.trim()) return;
      this.creating = true;
      this.errorMessage = '';
      try {
        const effectiveRace = this.newCharForm.race === 'Custom'
          ? (this.newCharForm.customRaceName?.trim() || 'Custom')
          : this.newCharForm.race;
        const raceMods = RACES_DATA[this.newCharForm.race]?.modifiers || RACES_DATA[effectiveRace]?.modifiers || {
          str: 0, sta: 0, dex: 0, rs: 0, int: 0, log: 0, per: 0, ldr: 0
        };

        const rawStr = this.newCharForm.str ?? this.newCharForm.str_sta ?? 50;
        const rawSta = this.newCharForm.sta ?? this.newCharForm.str_sta ?? 50;
        const rawDex = this.newCharForm.dex ?? this.newCharForm.dex_rs ?? 50;
        const rawRs = this.newCharForm.rs ?? this.newCharForm.dex_rs ?? 50;
        const rawInt = this.newCharForm.int ?? this.newCharForm.int_stat ?? this.newCharForm.int_log ?? 50;
        const rawLog = this.newCharForm.log ?? this.newCharForm.log_stat ?? this.newCharForm.int_log ?? 50;
        const rawPer = this.newCharForm.per ?? this.newCharForm.per_ldr ?? 50;
        const rawLdr = this.newCharForm.ldr ?? this.newCharForm.per_ldr ?? 50;

        const finalStr = rawStr + (raceMods.str ?? 0);
        const finalSta = rawSta + (raceMods.sta ?? 0);
        const finalDex = rawDex + (raceMods.dex ?? 0);
        const finalRs = rawRs + (raceMods.rs ?? 0);
        const finalInt = rawInt + (raceMods.int ?? 0);
        const finalLog = rawLog + (raceMods.log ?? 0);
        const finalPer = rawPer + (raceMods.per ?? 0);
        const finalLdr = rawLdr + (raceMods.ldr ?? 0);

        const payload = {
          ...this.newCharForm,
          race: effectiveRace,
          avatar_url: this.newCharForm.avatar_url || '',
          str: finalStr,
          sta: finalSta,
          current_sta: finalSta,
          dex: finalDex,
          rs: finalRs,
          int: finalInt,
          log: finalLog,
          int_stat: finalInt,
          log_stat: finalLog,
          per: finalPer,
          ldr: finalLdr,
          max_stamina: finalSta,
          current_stamina: finalSta,
          max_seu: 50,
          current_seu: 50,
          current_xp: Number(this.newCharForm.current_xp || 0),
          skills: [],
          inventory: [],
        };
        const res = await fetch('/api/characters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const rawCreated = await res.json();
          const created = this.normalizeCharacterData(rawCreated);
          this.showCreateModal = false;
          if (!this.characters.some((c) => c.id === created.id)) {
            this.characters.push(created);
          }
          this.selectedChar = JSON.parse(JSON.stringify(created));
          if (this.selectedChar && this.selectedChar.id !== undefined) {
            const uid = this.getCurrentUserId ? this.getCurrentUserId() : getSafeUserId();
            saveUserState(uid, 'characterSheets', { selectedCharId: this.selectedChar.id });
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          this.errorMessage = errData.error || `Failed to create character (HTTP ${res.status})`;
        }
      } catch (err) {
        console.error('Error creating character:', err);
        this.errorMessage = err.message || 'Error creating character';
      } finally {
        this.creating = false;
      }
    },
    async updateCharacter() {
      if (!this.selectedChar || !this.selectedChar.id) return;
      this.errorMessage = '';
      try {
        if (this.selectedChar.max_stamina !== undefined) {
          this.selectedChar.sta = this.selectedChar.max_stamina;
        }
        const payload = {
          ...this.selectedChar,
          int_stat: this.selectedChar.int,
          log_stat: this.selectedChar.log,
          sta: this.selectedChar.sta ?? this.selectedChar.max_stamina ?? 50,
          current_sta: this.selectedChar.current_stamina ?? 50,
          max_seu: this.selectedChar.max_seu !== undefined ? this.selectedChar.max_seu : 50,
          current_seu: this.selectedChar.current_seu !== undefined ? this.selectedChar.current_seu : 50,
          current_xp: this.selectedChar.current_xp !== undefined ? Number(this.selectedChar.current_xp) : 0,
        };
        const res = await fetch(`/api/characters/${this.selectedChar.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const rawUpdated = await res.json();
          const updated = this.normalizeCharacterData(rawUpdated);
          const idx = this.characters.findIndex((c) => c.id === updated.id);
          if (idx !== -1) {
            this.characters[idx] = { ...updated };
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          this.errorMessage = errData.error || `Failed to update character (HTTP ${res.status})`;
        }
      } catch (err) {
        console.error('Error updating character:', err);
        this.errorMessage = err.message || 'Error updating character';
      }
    },
    onMaxStaminaChange() {
      if (!this.selectedChar) return;
      if (this.selectedChar.max_stamina !== undefined) {
        if (this.selectedChar.max_stamina < 1) {
          this.selectedChar.max_stamina = 1;
        }
        this.selectedChar.sta = this.selectedChar.max_stamina;
        if ((this.selectedChar.current_stamina || 0) > this.selectedChar.max_stamina) {
          this.selectedChar.current_stamina = this.selectedChar.max_stamina;
        }
      }
      this.updateCharacter();
    },
    shiftStat(statA, statB, amount) {
      if (!this.selectedChar) return;
      const newA = (this.selectedChar[statA] || 50) + amount;
      const newB = (this.selectedChar[statB] || 50) - amount;
      if (newA < 1 || newA > 100 || newB < 1 || newB > 100) return;
      this.selectedChar[statA] = newA;
      this.selectedChar[statB] = newB;
      if (statA === 'sta') this.selectedChar.max_stamina = newA;
      if (statB === 'sta') this.selectedChar.max_stamina = newB;
      if (this.selectedChar.current_stamina > this.selectedChar.max_stamina) {
        this.selectedChar.current_stamina = this.selectedChar.max_stamina;
      }
      this.updateCharacter();
    },
    onStatChange(statName) {
      if (statName === 'sta' && this.selectedChar) {
        this.selectedChar.max_stamina = this.selectedChar.sta;
      }
      this.updateCharacter();
    },
    adjustStamina(amount) {
      if (!this.selectedChar) return;
      let newSta = (this.selectedChar.current_stamina || 0) + amount;
      newSta = Math.max(0, Math.min(this.selectedChar.max_stamina || 100, newSta));
      this.selectedChar.current_stamina = newSta;
      this.updateCharacter();
    },
    applyStaminaDamage() {
      if (!this.selectedChar) return;
      const delta = Number(this.staminaDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      this.selectedChar.current_stamina = Math.max(0, (this.selectedChar.current_stamina || 0) - delta);
      this.staminaDelta = null;
      this.updateCharacter();
    },
    applyStaminaHeal() {
      if (!this.selectedChar) return;
      const delta = Number(this.staminaDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      const max = this.selectedChar.max_stamina || 100;
      this.selectedChar.current_stamina = Math.min(max, (this.selectedChar.current_stamina || 0) + delta);
      this.staminaDelta = null;
      this.updateCharacter();
    },
    downloadAsciiSheet() {
      if (!this.selectedChar) return;
      downloadCharacterAscii(this.selectedChar);
    },
    resetCharacterStats() {
      if (!this.selectedChar) return;
      this.selectedChar.current_stamina = this.selectedChar.max_stamina || 50;
      this.selectedChar.current_seu = this.selectedChar.max_seu !== undefined ? this.selectedChar.max_seu : 50;
      this.updateCharacter();
    },
    adjustSeu(amount) {
      if (!this.selectedChar) return;
      const max = this.selectedChar.max_seu !== undefined ? this.selectedChar.max_seu : 50;
      let newSeu = (this.selectedChar.current_seu !== undefined ? this.selectedChar.current_seu : max) + amount;
      newSeu = Math.max(0, Math.min(max, newSeu));
      this.selectedChar.current_seu = newSeu;
      this.updateCharacter();
    },
    reloadSeu() {
      if (!this.selectedChar) return;
      const max = this.selectedChar.max_seu !== undefined ? this.selectedChar.max_seu : 50;
      this.selectedChar.current_seu = max;
      this.updateCharacter();
    },
    applySeuBurn() {
      if (!this.selectedChar) return;
      const delta = Number(this.seuDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      const max = this.selectedChar.max_seu !== undefined ? this.selectedChar.max_seu : 50;
      this.selectedChar.current_seu = Math.max(0, (this.selectedChar.current_seu !== undefined ? this.selectedChar.current_seu : max) - delta);
      this.seuDelta = null;
      this.updateCharacter();
    },
    applySeuRecharge() {
      if (!this.selectedChar) return;
      const delta = Number(this.seuDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      const max = this.selectedChar.max_seu !== undefined ? this.selectedChar.max_seu : 50;
      this.selectedChar.current_seu = Math.min(max, (this.selectedChar.current_seu || 0) + delta);
      this.seuDelta = null;
      this.updateCharacter();
    },
    onMaxSeuChange() {
      if (!this.selectedChar) return;
      if (this.selectedChar.max_seu === undefined || this.selectedChar.max_seu < 0) {
        this.selectedChar.max_seu = 0;
      }
      if ((this.selectedChar.current_seu || 0) > this.selectedChar.max_seu) {
        this.selectedChar.current_seu = this.selectedChar.max_seu;
      }
      this.updateCharacter();
    },
    adjustXP(amount) {
      if (!this.selectedChar) return;
      this.selectedChar.current_xp = Math.max(0, (this.selectedChar.current_xp || 0) + amount);
      this.updateCharacter();
    },
    onXpInputChange() {
      if (!this.selectedChar) return;
      this.selectedChar.current_xp = Math.max(0, Math.min(1000000, Number(this.selectedChar.current_xp || 0)));
      this.updateCharacter();
    },
    applyXpSpend() {
      if (!this.selectedChar) return;
      const delta = Number(this.xpDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      this.selectedChar.current_xp = Math.max(0, (this.selectedChar.current_xp || 0) - delta);
      this.xpDelta = null;
      this.updateCharacter();
    },
    applyXpAward() {
      if (!this.selectedChar) return;
      const delta = Number(this.xpDelta);
      if (!Number.isFinite(delta) || delta <= 0) return;
      this.selectedChar.current_xp = Math.max(0, (this.selectedChar.current_xp || 0) + delta);
      this.xpDelta = null;
      this.updateCharacter();
    },
    async deleteCharacter(id) {
      if (!confirm('Are you sure you want to delete this character?')) return;
      this.errorMessage = '';
      try {
        const res = await fetch(`/api/characters/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (res.ok) {
          this.characters = this.characters.filter((c) => c.id !== id);
          if (this.selectedChar && this.selectedChar.id === id) {
            this.selectedChar = this.characters.length > 0 ? JSON.parse(JSON.stringify(this.characters[0])) : null;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          this.errorMessage = errData.error || `Failed to delete character (HTTP ${res.status})`;
        }
      } catch (err) {
        console.error('Error deleting character:', err);
        this.errorMessage = err.message || 'Error deleting character';
      }
    },
    addSkill() {
      if (!this.selectedChar.skills) this.selectedChar.skills = [];
      const defaultSkill = OFFICIAL_SKILLS[0].name;
      this.selectedChar.skills.push({ name: defaultSkill, level: 1 });
      this.updateCharacter();
    },
    getSkillPSA(skillName) {
      if (!skillName) return 'Custom';
      const skills = this?.officialSkills || OFFICIAL_SKILLS;
      const found = skills.find((s) => s.name.toLowerCase() === skillName.toLowerCase());
      const rawPSA = found ? found.psa : 'Custom';
      const map = {
        Military: 'Mil',
        Biosocial: 'Bio',
        Technological: 'Tech',
        Spaceship: 'Space',
      };
      return map[rawPSA] || rawPSA;
    },
    removeSkill(skillOrIndex) {
      if (!this.selectedChar || !this.selectedChar.skills) return;
      if (typeof skillOrIndex === 'number') {
        this.selectedChar.skills.splice(skillOrIndex, 1);
      } else {
        const idx = this.selectedChar.skills.indexOf(skillOrIndex);
        if (idx !== -1) {
          this.selectedChar.skills.splice(idx, 1);
        }
      }
      this.updateCharacter();
    },
    isSkillMoveDisabled(skillOrIndex, direction) {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.skills)) return true;
      const idx = typeof skillOrIndex === 'number'
        ? skillOrIndex
        : this.selectedChar.skills.indexOf(skillOrIndex);
      if (idx === -1) return true;
      const targetIndex = idx + direction;
      return targetIndex < 0 || targetIndex >= this.selectedChar.skills.length;
    },
    moveSkill(skillOrIndex, direction) {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.skills)) return;
      const index = typeof skillOrIndex === 'number'
        ? skillOrIndex
        : this.selectedChar.skills.indexOf(skillOrIndex);
      if (index === -1) return;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.selectedChar.skills.length) return;
      const [moved] = this.selectedChar.skills.splice(index, 1);
      this.selectedChar.skills.splice(targetIndex, 0, moved);
      this.updateCharacter();
    },
    onSkillDragStart(event, index) {
      const tag = event.target?.tagName?.toLowerCase();
      if (['input', 'select', 'textarea', 'button'].includes(tag)) {
        event.preventDefault();
        return;
      }
      this.draggedSkillIndex = index;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      }
    },
    onSkillDragOver(event, index) {
      if (this.draggedSkillIndex === null) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.dragOverSkillIndex = index;
    },
    onSkillDragLeave(event, index) {
      if (this.dragOverSkillIndex === index) {
        this.dragOverSkillIndex = null;
      }
    },
    onSkillDrop(event, targetFilteredIndex) {
      event.preventDefault();
      const fromFilteredIndex = this.draggedSkillIndex;
      this.draggedSkillIndex = null;
      this.dragOverSkillIndex = null;
      if (fromFilteredIndex === null || fromFilteredIndex === undefined || fromFilteredIndex === targetFilteredIndex) return;
      if (!this.selectedChar || !Array.isArray(this.selectedChar.skills)) return;

      const list = this.filteredSkills || this.selectedChar.skills;
      const sourceSkill = list[fromFilteredIndex];
      const targetSkill = list[targetFilteredIndex];
      if (!sourceSkill || !targetSkill) return;

      const actualFromIndex = this.selectedChar.skills.indexOf(sourceSkill);
      const actualTargetIndex = this.selectedChar.skills.indexOf(targetSkill);
      if (actualFromIndex === -1 || actualTargetIndex === -1) return;

      const [moved] = this.selectedChar.skills.splice(actualFromIndex, 1);
      this.selectedChar.skills.splice(actualTargetIndex, 0, moved);
      this.updateCharacter();
    },
    onSkillDragEnd() {
      this.draggedSkillIndex = null;
      this.dragOverSkillIndex = null;
    },
    upgradeSkillLevel(skillOrIndex) {
      const sk = typeof skillOrIndex === 'number'
        ? this.selectedChar?.skills?.[skillOrIndex]
        : skillOrIndex;
      if (sk && sk.level < 6) {
        const cost = this.getXPCost(sk.name, sk.level + 1, sk.psa);
        const currentXP = Number(this.selectedChar.current_xp || 0);
        if (currentXP >= cost) {
          this.selectedChar.current_xp = currentXP - cost;
          sk.level += 1;
          this.updateCharacter();
        } else {
          this.errorMessage = `Insufficient XP to upgrade ${sk.name} to Level ${sk.level + 1} (requires ${cost} XP, have ${currentXP} XP)`;
        }
      }
    },
    getXPCost(skillName, targetLevel, skillPSA = null) {
      const charPSA = this.selectedChar ? this.selectedChar.psa || 'Military' : 'Military';
      return calcXPCost(skillName, targetLevel, charPSA, skillPSA);
    },
    getSkillSuccessChance(skill) {
      if (!this.selectedChar || !skill) return 0;
      const offSk = OFFICIAL_SKILLS.find((s) => s.name === skill.name);
      let baseVal = 50;
      if (offSk) {
        const isSpaceship = offSk.psa === 'Spaceship' || ['Piloting', 'Astrogation', 'Engineering', 'Gunnery'].includes(offSk.name);
        if (offSk.baseChance === 'Dexterity') {
          const stat = this.selectedChar.dex ?? 50;
          baseVal = isSpaceship ? stat : Math.ceil(stat / 2);
        } else if (offSk.baseChance === 'Reaction Speed') {
          const stat = this.selectedChar.rs ?? 50;
          baseVal = isSpaceship ? stat : Math.ceil(stat / 2);
        } else if (offSk.baseChance === 'Logic') {
          const stat = this.selectedChar.log ?? 50;
          baseVal = isSpaceship ? stat : Math.ceil(stat / 2);
        } else if (offSk.baseChance === 'Intuition') {
          const stat = this.selectedChar.int ?? 50;
          baseVal = isSpaceship ? stat : Math.ceil(stat / 2);
        } else if (offSk.baseChance === 'Personality') {
          const stat = this.selectedChar.per ?? 50;
          baseVal = isSpaceship ? stat : Math.ceil(stat / 2);
        } else if (offSk.baseChance.includes('Melee Base')) {
          baseVal = this.derivedMeleeHit;
        }
      }
      const lvl = (typeof skill.level === 'number' && skill.level > 0) ? skill.level : 0;
      const lvlBonus = lvl * 10;
      return baseVal + lvlBonus;
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
          this.selectedChar.avatar_url = data.url;
          this.updateCharacter();
        } else {
          console.error('Upload failed');
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    },
    async fetchEquipment() {
      try {
        const res = await fetch('/api/equipment', { credentials: 'include' });
        if (res.ok) {
          this.equipmentList = await res.json();
        }
      } catch (err) {
        console.error('Error fetching equipment:', err);
      }
    },
    getCategoryCount(category) {
      if (!this.equipmentList) return 0;
      if (category === 'All') return this.equipmentList.length;
      return this.equipmentList.filter(item => item.category === category).length;
    },
    addEquipment(item) {
      if (!this.selectedChar) return;
      if (!this.selectedChar.inventory) this.selectedChar.inventory = [];
      this.selectedChar.inventory.push({
        name: item.name,
        quantity: 1,
        weight: Number(item.weight) || 0,
        notes: item.capabilities || ''
      });
      this.updateCharacter();
      this.recentlyAddedMap = { ...this.recentlyAddedMap, [item.name]: true };
      setTimeout(() => {
        const copy = { ...this.recentlyAddedMap };
        delete copy[item.name];
        this.recentlyAddedMap = copy;
      }, 1500);
    },
    getSkillCategoryCount(category) {
      if (!this.officialSkills) return 0;
      if (!category || category === 'All') return this.officialSkills.length;
      return this.officialSkills.filter((sk) => sk.psa === category).length;
    },
    isSkillInSheet(skillName) {
      if (!skillName || !this.selectedChar || !Array.isArray(this.selectedChar.skills)) return null;
      return this.selectedChar.skills.find(
        (sk) => sk.name && sk.name.toLowerCase() === skillName.toLowerCase()
      ) || null;
    },
    addSkillFromCatalog(offSkill) {
      if (!this.selectedChar) return;
      if (!Array.isArray(this.selectedChar.skills)) this.selectedChar.skills = [];
      const existing = this.isSkillInSheet(offSkill.name);
      if (existing) {
        return;
      }
      this.selectedChar.skills.push({ name: offSkill.name, level: 1 });
      this.updateCharacter();
      this.recentlyAddedSkillMap = { ...this.recentlyAddedSkillMap, [offSkill.name]: true };
      setTimeout(() => {
        this.recentlyAddedSkillMap = { ...this.recentlyAddedSkillMap, [offSkill.name]: false };
      }, 1500);
    },
    addInventoryItem() {
      if (!this.selectedChar) return;
      if (!this.selectedChar.inventory) this.selectedChar.inventory = [];
      let name = 'Custom Item';
      if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
        const input = window.prompt('Enter item name:', 'Custom Item');
        if (input === null) return;
        if (input.trim()) name = input.trim();
      }
      this.selectedChar.inventory.push({ name, quantity: 1, weight: 1.0, notes: '' });
      this.updateCharacter();
    },
    startEditItemName(item, index) {
      this.editingItemIndex = index;
      this.$nextTick(() => {
        const input = this.$refs.itemNameInput;
        if (Array.isArray(input) && input.length > 0) {
          input[0].focus();
          input[0].select();
        } else if (input && input.focus) {
          input.focus();
          input.select();
        }
      });
    },
    finishEditItemName() {
      this.editingItemIndex = null;
      this.updateCharacter();
    },
    removeInventoryItem(itemOrIndex) {
      if (!this.selectedChar || !this.selectedChar.inventory) return;
      if (typeof itemOrIndex === 'number') {
        this.selectedChar.inventory.splice(itemOrIndex, 1);
      } else {
        const idx = this.selectedChar.inventory.indexOf(itemOrIndex);
        if (idx !== -1) {
          this.selectedChar.inventory.splice(idx, 1);
        }
      }
      this.updateCharacter();
    },
    isInventoryMoveDisabled(item, direction) {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.inventory)) return true;
      const idx = this.selectedChar.inventory.indexOf(item);
      if (idx === -1) return true;
      const targetIndex = idx + direction;
      return targetIndex < 0 || targetIndex >= this.selectedChar.inventory.length;
    },
    moveInventoryItem(itemOrIndex, direction) {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.inventory)) return;
      const index = typeof itemOrIndex === 'number'
        ? itemOrIndex
        : this.selectedChar.inventory.indexOf(itemOrIndex);
      if (index === -1) return;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.selectedChar.inventory.length) return;
      const [moved] = this.selectedChar.inventory.splice(index, 1);
      this.selectedChar.inventory.splice(targetIndex, 0, moved);
      this.updateCharacter();
    },
    onInventoryDragStart(event, index) {
      const tag = event.target?.tagName?.toLowerCase();
      if (['input', 'select', 'textarea', 'button'].includes(tag)) {
        event.preventDefault();
        return;
      }
      this.draggedInventoryIndex = index;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      }
    },
    onInventoryDragOver(event, index) {
      if (this.draggedInventoryIndex === null) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.dragOverInventoryIndex = index;
    },
    onInventoryDragLeave(event, index) {
      if (this.dragOverInventoryIndex === index) {
        this.dragOverInventoryIndex = null;
      }
    },
    onInventoryDrop(event, targetFilteredIndex) {
      event.preventDefault();
      const fromFilteredIndex = this.draggedInventoryIndex;
      this.draggedInventoryIndex = null;
      this.dragOverInventoryIndex = null;
      if (fromFilteredIndex === null || fromFilteredIndex === undefined || fromFilteredIndex === targetFilteredIndex) return;
      if (!this.selectedChar || !Array.isArray(this.selectedChar.inventory)) return;
      const list = this.filteredInventory;
      const sourceItem = list[fromFilteredIndex];
      const targetItem = list[targetFilteredIndex];
      if (!sourceItem || !targetItem) return;

      const actualFromIndex = this.selectedChar.inventory.indexOf(sourceItem);
      const actualTargetIndex = this.selectedChar.inventory.indexOf(targetItem);
      if (actualFromIndex === -1 || actualTargetIndex === -1) return;

      const [moved] = this.selectedChar.inventory.splice(actualFromIndex, 1);
      this.selectedChar.inventory.splice(actualTargetIndex, 0, moved);
      this.updateCharacter();
    },
    onInventoryDragEnd() {
      this.draggedInventoryIndex = null;
      this.dragOverInventoryIndex = null;
    },
    parseNotePanels(notes) {
      return parseCharacterNotePanels(notes);
    },
    addNotePanel(defaultTitle = 'New Note') {
      if (!this.selectedChar) return;
      if (!Array.isArray(this.selectedChar.note_panels)) {
        this.selectedChar.note_panels = this.parseNotePanels(this.selectedChar.notes);
      }
      if (this.selectedChar.note_panels.length >= 4) return;
      const nextNum = this.selectedChar.note_panels.length + 1;
      const title = typeof defaultTitle === 'string' && defaultTitle !== 'New Note'
        ? defaultTitle
        : `Note ${nextNum}`;
      this.selectedChar.note_panels.push({
        id: `panel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title,
        content: '',
      });
      this.updateNotePanels();
    },
    deleteNotePanel(index) {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.note_panels)) return;
      if (typeof confirm === 'function' && !confirm('Delete this note panel?')) {
        return;
      }
      this.selectedChar.note_panels.splice(index, 1);
      this.updateNotePanels();
    },
    moveNotePanel(index, direction) {
      if (!this.selectedChar || !Array.isArray(this.selectedChar.note_panels)) return;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.selectedChar.note_panels.length) return;
      const [moved] = this.selectedChar.note_panels.splice(index, 1);
      this.selectedChar.note_panels.splice(targetIndex, 0, moved);
      this.updateNotePanels();
    },
    onNotePanelDragStart(event, index) {
      const tag = event.target?.tagName?.toLowerCase();
      if (['input', 'textarea', 'button'].includes(tag)) {
        event.preventDefault();
        return;
      }
      this.draggedNotePanelIndex = index;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      }
    },
    onNotePanelDragOver(event, index) {
      if (this.draggedNotePanelIndex === null) return;
      event.preventDefault();
      if (this.draggedNotePanelIndex !== index) {
        this.dragOverNotePanelIndex = index;
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
      }
    },
    onNotePanelDragLeave(event, index) {
      if (this.dragOverNotePanelIndex === index) {
        this.dragOverNotePanelIndex = null;
      }
    },
    onNotePanelDrop(event, targetIndex) {
      event.preventDefault();
      this.dragOverNotePanelIndex = null;
      const fromIndex = this.draggedNotePanelIndex;
      this.draggedNotePanelIndex = null;
      if (fromIndex === null || fromIndex === undefined || fromIndex === targetIndex) return;
      if (!this.selectedChar || !Array.isArray(this.selectedChar.note_panels)) return;
      const [moved] = this.selectedChar.note_panels.splice(fromIndex, 1);
      this.selectedChar.note_panels.splice(targetIndex, 0, moved);
      this.updateNotePanels();
    },
    onNotePanelDragEnd() {
      this.draggedNotePanelIndex = null;
      this.dragOverNotePanelIndex = null;
    },
    updateNotePanels() {
      if (!this.selectedChar) return;
      this.selectedChar.notes = JSON.stringify(this.selectedChar.note_panels);
      this.updateCharacter();
    },
    canReorder(char) {
      if (!char) return false;
      return this.isGm;
    },
    async moveCharacter(index, direction) {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.characters.length) return;
      const original = [...this.characters];
      const updated = [...this.characters];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);
      this.characters = updated;

      await this.saveCharacterOrder(original);
    },
    onDragStart(event, index) {
      const char = this.characters[index];
      if (!this.canReorder(char)) {
        event.preventDefault();
        return;
      }
      this.draggedCharIndex = index;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      }
    },
    onDragOver(event, index) {
      if (this.draggedCharIndex === null) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.dragOverCharIndex = index;
    },
    onDragLeave(event, index) {
      if (this.dragOverCharIndex === index) {
        this.dragOverCharIndex = null;
      }
    },
    async onDrop(event, targetIndex) {
      event.preventDefault();
      const fromIndex = this.draggedCharIndex;
      this.draggedCharIndex = null;
      this.dragOverCharIndex = null;
      if (fromIndex === null || fromIndex === undefined || fromIndex === targetIndex) return;
      if (fromIndex < 0 || fromIndex >= this.characters.length) return;
      if (targetIndex < 0 || targetIndex >= this.characters.length) return;

      const original = [...this.characters];
      const updated = [...this.characters];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(targetIndex, 0, moved);
      this.characters = updated;

      await this.saveCharacterOrder(original);
    },
    onDragEnd() {
      this.draggedCharIndex = null;
      this.dragOverCharIndex = null;
    },
    async saveCharacterOrder(previousCharacters) {
      this.errorMessage = '';
      try {
        const order = this.characters.map((c) => c.id);
        const res = await fetch('/api/characters/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ order }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          this.errorMessage = errData.error || `Failed to reorder characters (HTTP ${res.status})`;
          this.characters = previousCharacters;
        }
      } catch (err) {
        console.error('Error reordering characters:', err);
        this.errorMessage = err.message || 'Error reordering characters';
        this.characters = previousCharacters;
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
      if (payload && payload.type === 'character' && Array.isArray(payload.order)) {
        const map = new Map(this.characters.map((c) => [c.id, c]));
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
        this.characters = reordered;
      }
    },
    handleSheetCreated(payload) {
      if (payload && payload.type === 'character' && payload.sheet) {
        const sheet = this.normalizeCharacterData(payload.sheet);
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
        const sheet = this.normalizeCharacterData(payload.sheet);
        const idx = this.characters.findIndex((c) => c.id === sheet.id);
        if (idx !== -1) {
          this.characters[idx] = sheet;
          if (this.selectedChar && this.selectedChar.id === sheet.id) {
            this.selectedChar = JSON.parse(JSON.stringify(sheet));
          }
        }
      }
    },
    handleSheetDeleted(payload) {
      if (payload && payload.type === 'character') {
        const id = payload.id;
        this.characters = this.characters.filter((c) => c.id !== id);
        if (this.selectedChar && this.selectedChar.id === id) {
          this.selectedChar = this.characters.length > 0 ? JSON.parse(JSON.stringify(this.characters[0])) : null;
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
  background:
    linear-gradient(rgba(13, 17, 23, 0.20), rgba(13, 17, 23, 0.28)),
    url('/uploads/sheet-backgrounds/starfiel-cyan.jpg') center / cover no-repeat fixed;
  color: var(--text-primary, #cecece);
  overflow: hidden;
  position: relative;
}

.sheets-layout.has-sheet-bg {
  background:
    linear-gradient(rgba(13, 17, 23, 0.20), rgba(13, 17, 23, 0.28)),
    url('/uploads/sheet-backgrounds/starfiel-cyan.jpg') center / cover no-repeat fixed;
}

/* Sidebar */
.sidebar {
  width: 280px;
  background: rgba(22, 27, 34, 0.32);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-right: 1px solid rgba(48, 54, 61, 0.45);
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 12px rgba(6, 182, 212, 0.25);
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sheets-layout.sidebar-collapsed .sidebar {
  margin-left: -280px;
}

.sidebar-toggle-btn {
  position: absolute;
  top: 14px;
  right: -24px;
  width: 24px;
  height: 38px;
  background: rgba(22, 27, 34, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid #30363d;
  border-left: none;
  border-radius: 0 6px 6px 0;
  color: #00ffff;
  cursor: pointer;
  z-index: 20;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  padding: 0;
  transition: background-color 0.15s, color 0.15s, box-shadow 0.15s;
}

.sidebar-toggle-btn:hover {
  background: rgba(5, 40, 46, 0.68);
  color: #a8ffea;
  box-shadow: 2px 0 10px rgba(6, 182, 212, 0.4);
}

.sidebar-toggle-btn .toggle-icon {
  line-height: 1;
  user-select: none;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid rgba(48, 54, 61, 0.35);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.21rem;
  color: var(--text-primary);
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.6), 0 0 20px rgba(6, 182, 212, 0.35);
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
  padding: 10px 12px;
  border-bottom: 1px solid rgba(33, 38, 45, 0.3);
  border-left: 4px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s, border-color 0.2s, opacity 0.2s;
  user-select: none;
}

.character-list li:hover {
  background: rgba(33, 38, 45, 0.35);
}

.character-list li.dragging {
  opacity: 0.4;
  background: rgba(28, 33, 40, 0.3);
}

.character-list li.drag-over {
  border-top: 2px solid #00e5ff;
  background: rgba(0, 229, 255, 0.08);
}

.character-list li.active {
  background: rgba(5, 40, 46, 0.5);
  border-left: 4px solid aquamarine;
  box-shadow: inset 0 0 10px rgba(6, 182, 212, 0.25);
}

.character-list li.active:hover {
  background: rgba(8, 56, 65, 0.65);
}

.character-list li.active .char-name {
  color: #a8ffea;
  text-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}

.character-list li.active .char-sub {
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

.char-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
  flex: 1;
}

.char-item-actions {
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

.char-name {
  font-family: 'Orbitron', var(--font-family-header, sans-serif);
  font-weight: 600;
  color: #cecece;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.char-sub {
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
  background: transparent;
}

.sheet-main.has-sheet-bg {
  background: transparent;
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
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: rgba(22, 27, 34, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 16px;
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}

/* Header */
.sheet-header {
  background: rgba(22, 27, 34, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}

.header-main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.header-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.header-top-row {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
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

.input-name {
  font-family: 'Orbitron', var(--font-family-header, sans-serif);
  flex: 1;
  min-width: 180px;
  background: transparent;
  border: 1px solid transparent;
  color: #cecece;
  font-size: 1.4rem;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: 4px;
  text-shadow: 0 0 8px rgba(6, 150, 230, 0.9), 0 0 16px rgba(6, 150, 230, 0.7), 0 0 24px rgba(6, 150, 230, 0.5);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.input-name:focus {
  outline: none;
  background: rgba(13, 17, 23, 0.4);
  border-color: rgba(6, 150, 230, 0.4);
}

.race-select-wrap,
.psa-select-wrap,
.player-select-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
}

.select-race,
.select-psa,
.select-player,
.select-race option,
.select-psa option,
.select-player option {
  background-color: #000000 !important;
  color: #c0c0c0 !important;
  -webkit-text-fill-color: #c0c0c0;
  background-image: none !important;
}

.select-race,
.select-psa,
.select-player {
  border: 1px solid #30363d !important;
  border-radius: 4px;
  padding: 6px 28px 6px 10px !important;
  padding-right: 28px !important;
  font-size: 0.9rem;
}

.select-race:focus,
.select-psa:focus,
.select-player:focus {
  outline: none;
  border-color: #8b949e !important;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.15);
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
  padding: 3px 7px;
  font-size: 0.77rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.input-custom-race {
  background: #000000 !important;
  background-color: #000000 !important;
  color: #c0c0c0;
  border: 1px solid #30363d;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  margin-left: 6px;
  min-width: 140px;
  box-sizing: border-box;
}
.input-custom-race:focus {
  border-color: #8b949e;
  outline: none;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.15);
}
.custom-race-input-group {
  margin-top: 8px;
}

/* Derived Tactical Sub-Stats Bar */
.tactical-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr) 2fr;
  gap: 12px;
  align-items: center;
  background: transparent;
  padding: 0;
}

.tactical-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tactical-label {
  font-size: 0.75rem;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tactical-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #c0c0c0;
}

.encumbrance-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.encumbrance-bar-bg {
  height: 8px;
  background: #21262d;
  border-radius: 4px;
  overflow: hidden;
}

.encumbrance-bar-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.encumbrance-sub {
  font-size: 0.75rem;
  color: #8b949e;
}

.encumbrance-sub.over-limit {
  color: #f85149;
  font-weight: bold;
}

/* Middle Section: Attributes (Left) & Compact Trackers (Right) */
.middle-section-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

.trackers-section {
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

/* Stamina & SEU & XP Headers */
.stamina-header,
.seu-header,
.xp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.stamina-header-right,
.seu-header-right,
.xp-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stamina-values,
.seu-values,
.xp-values {
  font-size: 0.95rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #cecece;
}

.input-max-sta,
.input-max-seu {
  width: 48px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  text-align: center;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.stamina-bar-bg,
.seu-bar-bg {
  height: 8px;
  background: #21262d;
  border-radius: 4px;
  overflow: hidden;
  margin: 4px 0;
}

.stamina-bar-fill,
.seu-bar-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.stamina-controls,
.seu-controls,
.xp-controls {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
}

.stepper-group {
  display: flex;
  gap: 3px;
  align-items: center;
}

.freeform-delta-group {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

.input-delta {
  width: 46px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  text-align: center;
  padding: 3px 4px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  flex-shrink: 0;
  box-sizing: border-box;
}

.btn-delta {
  padding: 3px 6px;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease-in-out;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
}

.freeform-delta-group .btn-sub {
  width: 60px;
  min-width: 60px;
  flex-shrink: 0;
}

.freeform-delta-group .btn-add {
  width: 66px;
  min-width: 66px;
  flex-shrink: 0;
}

.btn-action-reset,
.btn-action-reload {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 58px;
  text-align: center;
}

.btn-action-reset {
  padding: 2px 14px;
}
.btn-action-reset:hover,
.btn-action-reload:hover {
  background: rgba(56, 189, 248, 0.25);
  border-color: #38bdf8;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.3);
}

.badge-tier {
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

.btn-sta,
.btn-seu,
.btn-xp {
  padding: 3px 8px;
  font-size: 0.78rem;
  border: none;
  border-radius: 4px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.btn-sta:active,
.btn-seu:active,
.btn-xp:active {
  transform: translateY(1px);
}
.btn-sub {
  background: #da363322;
  color: #f85149;
  border: 1px solid #f8514944;
}
.btn-sub:hover {
  background: #da363344;
  box-shadow: 0 0 8px rgba(248, 81, 73, 0.4);
}
.btn-add {
  background: #23863622;
  color: #3fb950;
  border: 1px solid #3fb95044;
}
.btn-add:hover {
  background: #23863644;
  box-shadow: var(--sci-glow-green);
}

/* Primary Stats Grid (2x2) */
.stats-section h4 {
  margin: 0 0 12px 0;
  color: #45acba;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stat-pair-box {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-pair-header {
  font-weight: 600;
  font-size: 0.78rem;
  color: #8b949e;
  text-align: center;
  letter-spacing: 0.5px;
}

.stat-inputs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.sub-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.sub-stat label {
  font-size: 0.72rem;
  font-weight: bold;
  color: #cecece;
}

.stat-input {
  width: 48px;
  font-size: 1.05rem;
  font-weight: 700;
  text-align: center;
  background: #161b22;
  border: 1px solid #30363d;
  color: #c0c0c0;
  border-radius: 4px;
  padding: 3px 2px;
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

.shift-controls {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.btn-shift {
  background: #000000;
  border: 1px solid #00a8a8;
  color: #00a8a8;
  font-size: 0.65rem;
  padding: 2px 5px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.btn-shift:hover {
  background: #082020;
  border-color: #00dada;
  color: #00dada;
  box-shadow: 0 0 6px rgba(0, 218, 218, 0.4);
}
.btn-shift:active {
  transform: translateY(1px);
}

/* Species Traits Banner (styled after Ship Sheets Standard Flip Capable banner) */
.racial-panel.species-traits-banner {
  padding: 10px 14px;
  border-radius: 6px;
  background: rgba(56, 189, 248, 0.05);
  border: 1px solid rgba(56, 189, 248, 0.35);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.traits-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.traits-rule-text {
  font-size: 0.8rem;
  color: #8b949e;
  line-height: 1.4;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.traits-rule-text strong {
  color: #cecece;
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
  color: #45acba;
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

.inventory-items-scroll,
.skills-items-scroll {
  max-height: 310px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 255, 255, 0.3) #0d1117;
}

.inventory-items-scroll::-webkit-scrollbar,
.skills-items-scroll::-webkit-scrollbar {
  width: 6px;
}

.inventory-items-scroll::-webkit-scrollbar-track,
.skills-items-scroll::-webkit-scrollbar-track {
  background: #0d1117;
  border-radius: 3px;
}

.inventory-items-scroll::-webkit-scrollbar-thumb,
.skills-items-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.25);
  border-radius: 3px;
  border: 1px solid rgba(0, 255, 255, 0.35);
}

.inventory-items-scroll::-webkit-scrollbar-thumb:hover,
.skills-items-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 255, 0.5);
  border-color: #00ffff;
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.4);
}

.item-name-text {
  color: #cecece;
  font-weight: 600;
  font-size: 0.855rem;
  cursor: pointer;
  user-select: text;
  padding: 2px 0;
  line-height: 1.2;
}

.item-name-text:hover {
  color: #00ffff;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: border-color 0.15s, background-color 0.15s;
}

.item-row.drag-over {
  border-color: #00e5ff;
  background: rgba(0, 229, 255, 0.08);
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.35);
}

.item-row.dragging {
  opacity: 0.4;
}

.skill-main-select {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.skill-name-col {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.skill-chance-col {
  width: 52px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.skill-row .level-wrap {
  width: 170px;
  min-width: 170px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.skill-psa-tag {
  font-size: 0.75rem;
  color: #8b949e;
  font-weight: 500;
  white-space: nowrap;
}

.skill-row .item-name-text {
  cursor: default;
}
.skill-row .item-name-text:hover {
  color: #cecece;
}

.select-official-skill,
.select-official-skill option {
  background-color: #000000 !important;
  color: #cecece !important;
  -webkit-text-fill-color: #cecece;
  background-image: none !important;
}

.select-official-skill {
  flex: 1;
  border: 1px solid #30363d !important;
  border-radius: 4px;
  padding: 6px 24px 6px 8px !important;
  padding-right: 24px !important;
  font-size: 0.85rem;
}

.select-official-skill:focus {
  outline: none;
  border-color: #8b949e !important;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.15);
}

.skill-chance-badge {
  background: rgba(6, 182, 212, 0.12);
  color: #22d3ee;
  font-weight: 700;
  font-size: 0.72rem;
  font-family: monospace;
  padding: 3px 5px;
  border-radius: 4px;
  border: 1px solid rgba(6, 182, 212, 0.4);
  box-shadow: 0 0 6px rgba(6, 182, 212, 0.25);
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.btn-xp-upgrade {
  background: linear-gradient(135deg, #065f46 0%, #059669 100%);
  border: 1px solid #10b981;
  color: #ecfdf5;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 4px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--sci-glow-green);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  transition: all 0.15s ease-in-out;
  width: 96px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex-shrink: 0;
}

.btn-xp-upgrade.btn-xp-placeholder {
  visibility: hidden;
  pointer-events: none;
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}
.btn-xp-upgrade:hover {
  box-shadow: var(--sci-glow-green-hover);
  border-color: #34d399;
}
.btn-xp-upgrade:active {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

.item-name-input {
  flex: 1;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  padding: 6px 8px;
  border-radius: 4px;
}

.item-weight-wrap,
.level-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #8b949e;
}

.item-weight-input {
  width: 48px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  text-align: center;
  padding: 6px 4px;
  border-radius: 4px;
}

.item-level-input {
  width: 42px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
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
.btn-new-character {
  background-color: #021a1e !important;
  background: #021a1e !important;
  border: 1px solid aquamarine !important;
  color: aquamarine !important;
  -webkit-text-fill-color: aquamarine;
  padding: 6px 14px;
  border-radius: 4px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.5);
  letter-spacing: 0.3px;
  transition: all 0.15s ease-in-out;
}
.btn-new-character:hover {
  background-color: #04272d !important;
  background: #04272d !important;
  border-color: #a8ffea !important;
  color: #a8ffea !important;
  -webkit-text-fill-color: #a8ffea;
  box-shadow: 0 0 18px rgba(6, 182, 212, 0.8);
}
.btn-new-character:active {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(127, 255, 212, 0.4);
}

.btn-primary {
  background: linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #14b8a6 100%);
  color: #07131e;
  border: 1px solid #38bdf8;
  padding: 6px 14px;
  border-radius: 4px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.5);
  letter-spacing: 0.3px;
  transition: all 0.15s ease-in-out;
}
.btn-primary:hover {
  background: linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #14b8a6 100%);
  box-shadow: 0 0 18px rgba(6, 182, 212, 0.8);
  border-color: #7dd3fc;
  color: #07131e;
}
.btn-primary:active {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(6, 182, 212, 0.6);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #05282e !important;
  background-color: #05282e !important;
  color: #a8ffea !important;
  -webkit-text-fill-color: #a8ffea;
  border: 1px solid aquamarine !important;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  letter-spacing: 0.3px;
  box-shadow: inset 0 0 10px rgba(6, 182, 212, 0.25), 0 0 8px rgba(6, 182, 212, 0.2);
  text-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
  transition: all 0.15s ease-in-out;
}
.btn-secondary:hover:not(:disabled) {
  background: #083841 !important;
  background-color: #083841 !important;
  border-color: aquamarine !important;
  color: #a8ffea !important;
  -webkit-text-fill-color: #a8ffea;
  box-shadow: inset 0 0 12px rgba(6, 182, 212, 0.4), 0 0 12px rgba(127, 255, 212, 0.4);
}
.btn-secondary:active:not(:disabled) {
  transform: translateY(1px);
}
.btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
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
  width: 440px;
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

.char-create-select,
.char-create-select option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
  background-image: none !important;
}

.char-create-select {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: var(--radius, 4px);
  padding: 8px 12px;
  padding-right: 28px !important;
  font-size: 14px;
  width: 100%;
}

.char-create-select:focus {
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

.modal-card .btn-modal-cancel {
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  padding: 6px 14px;
  border-radius: var(--radius, 4px);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.modal-card .btn-modal-cancel:hover {
  background-color: #082020 !important;
  border-color: #00dada !important;
  color: #00dada !important;
  -webkit-text-fill-color: #00dada;
  box-shadow: 0 0 8px rgba(0, 218, 218, 0.4);
}

.modal-card .btn-modal-create {
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

.modal-card .btn-modal-create:hover:not(:disabled) {
  background-color: #04272d !important;
  border-color: #a8ffea !important;
  color: #a8ffea !important;
  -webkit-text-fill-color: #a8ffea;
  box-shadow: 0 0 16px rgba(127, 255, 212, 0.5);
}

.modal-card .btn-modal-create:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(127, 255, 212, 0.4);
}

.modal-card .btn-modal-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.list-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.equipment-modal {
  max-width: 650px;
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.equipment-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.equipment-modal-header h3 {
  margin: 0;
  color: #45acba;
}

.btn-close-modal {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.btn-close-modal:hover {
  color: var(--text-primary);
}

.equipment-modal-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.equipment-category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.cat-tab {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid #334455;
  color: #8899aa;
  padding: 0.35rem 0.65rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.cat-tab:hover {
  background: rgba(0, 229, 255, 0.1);
  border-color: #00e5ff;
  color: #cecece;
}

.cat-tab.active {
  background: rgba(0, 229, 255, 0.2);
  border-color: #00e5ff;
  color: #00e5ff;
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.3);
  font-weight: bold;
}

.cat-count {
  font-size: 0.75rem;
  opacity: 0.8;
}

.modal-search,
.equipment-search-input {
  margin-bottom: 14px;
  padding: 8px 12px;
  background-color: #000000 !important;
  border: 1px solid rgba(0, 128, 128, 0.6) !important;
  color: #00ffff !important;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}

.modal-search:focus,
.equipment-search-input:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.equipment-list,
.equipment-catalog-list {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
  padding-right: 6px;
  max-height: 55vh;
}

.equipment-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  transition: border-color 0.15s ease;
}

.equipment-card:hover {
  border-color: rgba(69, 172, 186, 0.5);
}

.eq-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.eq-name {
  font-weight: 700;
  font-size: 15px;
  color: #45acba;
}

.eq-add-btn {
  padding: 4px 14px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s ease;
}

.eq-add-btn.btn-added {
  background: #0d2818 !important;
  border-color: #4ade80 !important;
  color: #39d353 !important;
}

.eq-details {
  display: flex;
  gap: 14px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  align-items: center;
}

.eq-tag {
  background: rgba(69, 172, 186, 0.18);
  color: #45acba;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.eq-cost {
  color: #cecece;
  font-weight: 500;
}

.eq-weight {
  color: #8b949e;
}

.eq-capabilities {
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-primary);
}

.portrait-box {
  width: 57px;
  height: 57px;
  border: 1px dashed rgba(0, 128, 128, 0.6);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  background: #000000;
  flex-shrink: 0;
  transition: all 0.15s ease-in-out;
}

.portrait-box:hover {
  border-color: aqua;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.portrait-placeholder {
  font-size: 9px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.15;
  padding: 2px;
}

.portrait-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  border: 1px solid #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  border-radius: var(--radius, 4px);
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

.notes-section {
  margin-top: 0;
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
  background: #0d1117;
  border: 1px solid #30363d;
  color: #cecece;
  border-radius: 6px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 0.92rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 90px;
}

.notes-textarea:focus {
  outline: none;
  border-color: #2394a6;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.35);
}

.notes-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-add-note-panel {
  font-size: 0.85rem;
  padding: 6px 12px;
}

.btn-add-note-panel:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #30363d;
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
  color: #c3c3c3;
  font-size: 1rem;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 6px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.panel-title-input:focus {
  outline: none;
  border-color: #2394a6;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.35);
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

.note-panel-card.panel-drag-over {
  border-color: #2394a6;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.25);
}

.panels-empty {
  text-align: center;
  color: #94a3b8;
  padding: 24px 16px;
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
</style>

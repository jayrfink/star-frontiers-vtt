<template>
  <div class="sheets-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h3>Character Sheets</h3>
        <button class="btn-primary btn-new-character" @click="openCreateModal">+ New Character</button>
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
            <div class="portrait-box" @click="openImageBrowser('char')" title="Click to select character portrait">
              <img v-if="selectedChar.avatar_url" :src="selectedChar.avatar_url" class="portrait-img" alt="Character Portrait" />
              <div v-else class="portrait-placeholder">Click to select<br/>Token Image</div>
            </div>
            <input
              type="text"
              v-model="selectedChar.name"
              @change="updateCharacter"
              class="input-name"
              placeholder="Character Name"
            />
            <div class="race-select-wrap">
              <label>Race:</label>
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
                placeholder="Custom Race Name"
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
          </div>
          <div class="race-ability-banner">
            <strong>Racial Info:</strong> {{ racesData[selectedChar.race]?.abilitiesDescription || 'Custom species without default racial abilities.' }}
          </div>
        </header>

        <!-- Derived Tactical Sub-Stats Bar -->
        <section class="tactical-bar card">
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
        </section>

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

        <!-- Primary Stats Grid with Point-Shift Controls -->
        <section class="stats-section card">
          <h4>Primary D100 Stats</h4>
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
                  <button class="btn-shift" title="Shift point to STA" @click="shiftStat('str', 'sta', -1)">◄</button>
                  <button class="btn-shift" title="Shift point to STR" @click="shiftStat('str', 'sta', 1)">►</button>
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
                  <button class="btn-shift" title="Shift point to RS" @click="shiftStat('dex', 'rs', -1)">◄</button>
                  <button class="btn-shift" title="Shift point to DEX" @click="shiftStat('dex', 'rs', 1)">►</button>
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
                  <button class="btn-shift" title="Shift point to LOG" @click="shiftStat('int', 'log', -1)">◄</button>
                  <button class="btn-shift" title="Shift point to INT" @click="shiftStat('int', 'log', 1)">►</button>
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
                  <button class="btn-shift" title="Shift point to LDR" @click="shiftStat('per', 'ldr', -1)">◄</button>
                  <button class="btn-shift" title="Shift point to PER" @click="shiftStat('per', 'ldr', 1)">►</button>
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

        <!-- Detailed Racial Abilities Panel -->
        <section class="card racial-panel">
          <h4>Racial Traits & Abilities</h4>
          <div v-if="selectedChar.race === 'Human'" class="racial-details">
            <p><strong>Human Adaptability:</strong> Versatile species. Receives a +5 bonus to any single ability score during creation.</p>
          </div>
          <div v-else-if="selectedChar.race === 'Dralasite'" class="racial-details">
            <p><strong>Elasticity:</strong> Can sprout up to <strong>{{ dralasiteLimbsLimit }}</strong> limbs (DEX / 10).</p>
            <p><strong>Lie Detection:</strong> <strong>{{ lieDetectionChance }}%</strong> base chance (5% base + 5% per level if skill used).</p>
          </div>
          <div v-else-if="selectedChar.race === 'Vrusk'" class="racial-details">
            <p><strong>Ambidexterity:</strong> Can use either hand without off-hand penalty.</p>
            <p><strong>Comprehension:</strong> <strong>{{ comprehensionChance }}%</strong> base chance to understand unknown machinery/technology.</p>
          </div>
          <div v-else-if="selectedChar.race === 'Yazirian'" class="racial-details">
            <p><strong>Gliding:</strong> Can glide using skin membranes (Glide movement: 4 m/s).</p>
            <p><strong>Battle Rage:</strong> <strong>{{ battleRageChance }}%</strong> base chance. When enraged, gains +20 bonus to hit in melee.</p>
          </div>
          <div v-else class="racial-details">
            <p><strong>Custom Species:</strong> Custom race without standard Star Frontiers racial traits.</p>
          </div>
        </section>

        <!-- Lists: Skills & Inventory -->
        <div class="two-column-lists">
          <!-- Skills -->
          <section class="card list-card">
            <div class="list-header">
              <h4>Skills & Experience</h4>
              <button class="btn-secondary" @click="addSkill">+ Add Skill</button>
            </div>
            <div v-if="!selectedChar.skills || selectedChar.skills.length === 0" class="empty-list">
              No skills added.
            </div>
            <ul class="items-list">
              <li v-for="(skill, index) in selectedChar.skills" :key="index" class="item-row skill-row">
                <div class="skill-main-select">
                  <select v-model="skill.name" @change="updateCharacter" class="select-official-skill">
                    <option v-for="offSk in officialSkills" :key="offSk.name" :value="offSk.name">
                      {{ offSk.name }} ({{ offSk.psa }})
                    </option>
                  </select>
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
                    @click="upgradeSkillLevel(index)"
                  >
                    +Lvl ({{ getXPCost(skill.name, skill.level + 1) }} XP)
                  </button>
                </div>
                <button class="btn-remove" @click="removeSkill(index)">✕</button>
              </li>
            </ul>
          </section>

          <!-- Inventory -->
          <section class="card list-card">
            <div class="list-header">
              <h4>Inventory & Mass</h4>
              <div class="list-header-actions">
                <button class="btn-secondary" @click="showEquipmentModal = true">+ Add Equipment</button>
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
            <ul v-else class="items-list">
              <li v-for="(item, index) in filteredInventory" :key="index" class="item-row inventory-row">
                <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                  <input
                    type="text"
                    v-model="item.name"
                    @change="updateCharacter"
                    placeholder="Item Name"
                    class="item-name-input"
                  />
                  <input 
                    type="text"
                    v-model="item.notes"
                    @change="updateCharacter"
                    placeholder="Notes / Capabilities"
                    class="item-name-input"
                    style="font-size: 0.8rem; color: #8b949e; background: transparent; border: 1px dashed #30363d;"
                  />
                </div>
                <div class="item-weight-wrap">
                  <label>Kg:</label>
                  <input
                    type="number"
                    step="0.1"
                    v-model.number="item.weight"
                    @change="updateCharacter"
                    min="0"
                    class="item-weight-input"
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
                <button class="btn-remove" title="Remove Item" @click="removeInventoryItem(item)">✕</button>
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
            <label>Race</label>
            <select v-model="newCharForm.race" class="char-create-select">
              <option value="Human">Human (+5 XP bonus / adaptable)</option>
              <option value="Dralasite">Dralasite (Lie Detection & Elasticity)</option>
              <option value="Vrusk">Vrusk (Ambidexterity & Comprehensive)</option>
              <option value="Yazirian">Yazirian (Battle Rage & Gliding)</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div v-if="newCharForm.race === 'Custom'" class="form-group custom-race-input-group">
            <label>Custom Race Name</label>
            <input
              type="text"
              v-model="newCharForm.customRaceName"
              class="char-create-input"
              placeholder="Enter custom race name..."
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

export default {
  name: 'CharacterSheetsView',
  components: {
    ImageBrowserModal,
  },
  data() {
    return {
      characters: [],
      selectedChar: null,
      loading: true,
      creating: false,
      showCreateModal: false,
      showImageBrowser: false,
      imageBrowserTarget: 'char',
      racesData: RACES_DATA,
      officialSkills: OFFICIAL_SKILLS,
      equipmentList: [],
      showEquipmentModal: false,
      equipmentSearchQuery: '',
      searchInventoryQuery: '',
      recentlyAddedMap: {},
      newCharForm: {
        name: '',
        race: 'Human',
        customRaceName: '',
        psa: 'Military',
        avatar_url: '',
        str_sta: 50,
        dex_rs: 50,
        int_log: 50,
        per_ldr: 50,
        max_stamina: 50,
        current_stamina: 50,
      },
    };
  },
  computed: {
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
      if (!this.equipmentSearchQuery) return this.equipmentList;
      const q = this.equipmentSearchQuery.toLowerCase().trim();
      return this.equipmentList.filter(item => 
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
      if (!this.unencumberedMaxWeight) return 0;
      return Math.min(100, Math.round((this.totalInventoryWeight / this.unencumberedMaxWeight) * 100));
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
      return Math.floor((this.selectedChar.dex || 50) / 10);
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
    this.fetchCharacters();
    this.fetchEquipment();
    this.setupSocketListeners();
  },
  beforeUnmount() {
    this.removeSocketListeners();
  },
  methods: {
    normalizeCharacterData(char) {
      const c = { ...char };
      if (!c.psa) c.psa = 'Military';
      // Ensure individual stats are set from paired stats if missing
      if (c.str === undefined) c.str = c.str_sta || 50;
      if (c.sta === undefined) c.sta = c.max_stamina !== undefined ? c.max_stamina : (c.str_sta || 50);
      c.max_stamina = c.sta;
      c.current_stamina = c.current_sta !== undefined ? c.current_sta : (c.current_stamina !== undefined ? c.current_stamina : c.sta);

      if (c.dex === undefined) c.dex = c.dex_rs || 50;
      if (c.rs === undefined) c.rs = c.dex_rs || 50;
      c.int = c.int_stat ?? c.int ?? c.int_log ?? 50;
      c.log = c.log_stat ?? c.log ?? c.int_log ?? 50;
      if (c.per === undefined) c.per = c.per_ldr || 50;
      if (c.ldr === undefined) c.ldr = c.per_ldr || 50;

      if (!c.skills) c.skills = [];
      if (!c.inventory) c.inventory = [];
      c.avatar_url = c.avatar_url || '';
      return c;
    },
    async fetchCharacters() {
      this.loading = true;
      try {
        const res = await fetch('/api/characters', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          this.characters = data.map((c) => this.normalizeCharacterData(c));
          if (this.characters.length > 0 && !this.selectedChar) {
            this.selectedChar = JSON.parse(JSON.stringify(this.characters[0]));
          }
        }
      } catch (err) {
        console.error('Error fetching characters:', err);
      } finally {
        this.loading = false;
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
    },
    openCreateModal() {
      this.newCharForm = {
        name: '',
        race: 'Human',
        customRaceName: '',
        psa: 'Military',
        avatar_url: '',
        str_sta: 50,
        dex_rs: 50,
        int_log: 50,
        per_ldr: 50,
        max_stamina: 50,
        current_stamina: 50,
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
      try {
        const effectiveRace = this.newCharForm.race === 'Custom'
          ? (this.newCharForm.customRaceName?.trim() || 'Custom')
          : this.newCharForm.race;
        const payload = {
          ...this.newCharForm,
          race: effectiveRace,
          avatar_url: this.newCharForm.avatar_url || '',
          str: this.newCharForm.str_sta,
          sta: this.newCharForm.max_stamina ?? this.newCharForm.str_sta,
          current_sta: this.newCharForm.current_stamina ?? this.newCharForm.str_sta,
          dex: this.newCharForm.dex_rs,
          rs: this.newCharForm.dex_rs,
          int: this.newCharForm.int_log,
          log: this.newCharForm.int_log,
          int_stat: this.newCharForm.int_log,
          log_stat: this.newCharForm.int_log,
          per: this.newCharForm.per_ldr,
          ldr: this.newCharForm.per_ldr,
          max_stamina: this.newCharForm.max_stamina ?? this.newCharForm.str_sta,
          current_stamina: this.newCharForm.current_stamina ?? this.newCharForm.str_sta,
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
        if (this.selectedChar.sta !== undefined) {
          this.selectedChar.max_stamina = this.selectedChar.sta;
        }
        const payload = {
          ...this.selectedChar,
          int_stat: this.selectedChar.int,
          log_stat: this.selectedChar.log,
          sta: this.selectedChar.sta ?? this.selectedChar.max_stamina ?? 50,
          current_sta: this.selectedChar.current_stamina ?? 50,
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
        }
      } catch (err) {
        console.error('Error updating character:', err);
      }
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
    async deleteCharacter(id) {
      if (!confirm('Are you sure you want to delete this character?')) return;
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
        }
      } catch (err) {
        console.error('Error deleting character:', err);
      }
    },
    addSkill() {
      if (!this.selectedChar.skills) this.selectedChar.skills = [];
      const defaultSkill = OFFICIAL_SKILLS[0].name;
      this.selectedChar.skills.push({ name: defaultSkill, level: 1 });
      this.updateCharacter();
    },
    removeSkill(index) {
      this.selectedChar.skills.splice(index, 1);
      this.updateCharacter();
    },
    upgradeSkillLevel(index) {
      const sk = this.selectedChar.skills[index];
      if (sk && sk.level < 6) {
        sk.level += 1;
        this.updateCharacter();
      }
    },
    getXPCost(skillName, targetLevel) {
      const charPSA = this.selectedChar ? this.selectedChar.psa || 'Military' : 'Military';
      return calcXPCost(skillName, targetLevel, charPSA);
    },
    getSkillSuccessChance(skill) {
      if (!this.selectedChar) return 0;
      const offSk = OFFICIAL_SKILLS.find((s) => s.name === skill.name);
      let baseVal = 50;
      if (offSk) {
        if (offSk.baseChance === 'Dexterity') baseVal = this.selectedChar.dex || 50;
        else if (offSk.baseChance === 'Reaction Speed') baseVal = this.selectedChar.rs || 50;
        else if (offSk.baseChance === 'Logic') baseVal = this.selectedChar.log || 50;
        else if (offSk.baseChance === 'Intuition') baseVal = this.selectedChar.int || 50;
        else if (offSk.baseChance === 'Personality') baseVal = this.selectedChar.per || 50;
        else if (offSk.baseChance.includes('Melee Base')) baseVal = this.derivedMeleeHit;
      }
      const lvlBonus = (skill.level || 1) * 10;
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
    addInventoryItem() {
      if (!this.selectedChar) return;
      if (!this.selectedChar.inventory) this.selectedChar.inventory = [];
      this.selectedChar.inventory.push({ name: 'New Item', quantity: 1, weight: 1.0, notes: '' });
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
  border-left: 4px solid transparent;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s, border-color 0.2s;
}

.character-list li:hover {
  background: #21262d;
}

.character-list li.active {
  background: #05282e;
  border-left: 4px solid aquamarine;
}

.character-list li.active:hover {
  background: #083841;
}

.character-list li.active .char-name {
  color: #a8ffea;
}

.character-list li.active .char-sub {
  color: #80cbc4;
}

.char-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.char-name {
  font-weight: 600;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.char-sub {
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
  max-width: 960px;
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

.race-select-wrap,
.psa-select-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.select-race,
.select-psa,
.select-race option,
.select-psa option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
}

.select-race,
.select-psa {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 1rem;
}

.select-race:focus,
.select-psa:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.input-custom-race {
  background: var(--bg-surface-2, #1f293d);
  color: #fff;
  border: 1px solid var(--border-color, #2b3954);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.95rem;
  margin-left: 6px;
  min-width: 140px;
  box-sizing: border-box;
}
.input-custom-race:focus {
  border-color: var(--accent-cyan, #00d2ff);
  outline: none;
}
.custom-race-input-group {
  margin-top: 8px;
}

.race-ability-banner {
  background: #1f6feb15;
  border-left: 3px solid #3a859c;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: #8b949e;
}

.race-ability-banner strong {
  color: #f0f6fc;
}

/* Derived Tactical Sub-Stats Bar */
.tactical-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr) 2fr;
  gap: 12px;
  align-items: center;
  background: #0d1117;
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
  color: #3a859c;
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

/* Stamina Section */
.stamina-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.stamina-header h4 {
  margin: 0;
  color: #3a859c;
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
  transition: all 0.15s ease-in-out;
}
.btn-sta:active {
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

/* Primary Stats Grid */
.stats-section h4 {
  margin: 0 0 12px 0;
  color: #3a859c;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-pair-box {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-pair-header {
  font-weight: 700;
  font-size: 0.85rem;
  color: #8b949e;
  text-align: center;
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
  font-size: 0.75rem;
  font-weight: bold;
  color: #f0f6fc;
}

.stat-input {
  width: 48px;
  font-size: 1.1rem;
  font-weight: 700;
  text-align: center;
  background: #161b22;
  border: 1px solid #30363d;
  color: #3a859c;
  border-radius: 4px;
  padding: 4px 2px;
}

.shift-controls {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.btn-shift {
  background: #000000;
  border: 1px solid teal;
  color: aqua;
  font-size: 0.65rem;
  padding: 2px 5px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.btn-shift:hover {
  background: #051414;
  border-color: #00a8a8;
  color: #00a8a8;
  box-shadow: 0 0 6px rgba(0, 128, 128, 0.4);
}
.btn-shift:active {
  transform: translateY(1px);
}

/* Racial Traits Panel */
.racial-panel h4 {
  margin: 0 0 10px 0;
  color: #3a859c;
}

.racial-details p {
  margin: 4px 0;
  font-size: 0.9rem;
  color: #c9d1d9;
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
  color: #3a859c;
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

.skill-main-select {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.select-official-skill,
.select-official-skill option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
}

.select-official-skill {
  flex: 1;
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 0.85rem;
}

.select-official-skill:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.4);
}

.skill-chance-badge {
  background: rgba(6, 182, 212, 0.12);
  color: #22d3ee;
  font-weight: 700;
  font-size: 0.8rem;
  font-family: monospace;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid rgba(6, 182, 212, 0.4);
  box-shadow: 0 0 6px rgba(6, 182, 212, 0.25);
  letter-spacing: 0.5px;
}

.btn-xp-upgrade {
  background: linear-gradient(135deg, #065f46 0%, #059669 100%);
  border: 1px solid #10b981;
  color: #ecfdf5;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--sci-glow-green);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  transition: all 0.15s ease-in-out;
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
  color: #f0f6fc;
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
  color: #f0f6fc;
  text-align: center;
  padding: 6px 4px;
  border-radius: 4px;
}

.item-level-input {
  width: 42px;
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
  box-shadow: 0 0 10px rgba(127, 255, 212, 0.25);
  letter-spacing: 0.3px;
  transition: all 0.15s ease-in-out;
}
.btn-new-character:hover {
  background-color: #04272d !important;
  background: #04272d !important;
  border-color: #a8ffea !important;
  color: #a8ffea !important;
  -webkit-text-fill-color: #a8ffea;
  box-shadow: 0 0 16px rgba(127, 255, 212, 0.5);
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
  background-color: #000000 !important;
  background: #000000 !important;
  color: teal !important;
  -webkit-text-fill-color: teal;
  border: 1px solid teal !important;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.3px;
  transition: all 0.15s ease-in-out;
}
.btn-secondary:hover:not(:disabled) {
  background-color: #051414 !important;
  border-color: #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
}
.btn-secondary:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 0 6px rgba(0, 128, 128, 0.6);
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

.char-create-select,
.char-create-select option {
  background-color: #000000 !important;
  color: aqua !important;
  -webkit-text-fill-color: aqua;
}

.char-create-select {
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  border-radius: var(--radius, 4px);
  padding: 8px 12px;
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

.modal-card .btn-modal-cancel:hover {
  background-color: #051414 !important;
  border-color: #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
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
  color: #3a859c;
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

.modal-search {
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

.modal-search:focus {
  outline: none;
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}

.equipment-list {
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
  border-color: rgba(58, 133, 156, 0.5);
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
  color: #3a859c;
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
  background: rgba(58, 133, 156, 0.18);
  color: #3a859c;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.eq-cost {
  color: #e6edf3;
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
  width: 52px;
  height: 52px;
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
</style>

<template>
  <div class="sheets-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h3>Character Sheets</h3>
        <button class="btn-primary" @click="openCreateModal">+ New Character</button>
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
            <input
              type="text"
              v-model="selectedChar.name"
              @change="updateCharacter"
              class="input-name"
              placeholder="Character Name"
            />
            <div class="race-select-wrap">
              <label>Race:</label>
              <select v-model="selectedChar.race" @change="updateCharacter" class="select-race">
                <option value="Human">Human</option>
                <option value="Dralasite">Dralasite</option>
                <option value="Vrusk">Vrusk</option>
                <option value="Yazirian">Yazirian</option>
              </select>
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
            <strong>Racial Info:</strong> {{ racesData[selectedChar.race]?.abilitiesDescription || 'None' }}
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
              <button class="btn-secondary" @click="addInventoryItem">+ Add Item</button>
            </div>
            <div v-if="!selectedChar.inventory || selectedChar.inventory.length === 0" class="empty-list">
              No equipment in inventory.
            </div>
            <ul class="items-list">
              <li v-for="(item, index) in selectedChar.inventory" :key="index" class="item-row inventory-row">
                <input
                  type="text"
                  v-model="item.name"
                  @change="updateCharacter"
                  placeholder="Item Name"
                  class="item-name-input"
                />
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
                <button class="btn-remove" @click="removeInventoryItem(index)">✕</button>
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
            <label>Race</label>
            <select v-model="newCharForm.race">
              <option value="Human">Human (+5 XP bonus / adaptable)</option>
              <option value="Dralasite">Dralasite (Lie Detection & Elasticity)</option>
              <option value="Vrusk">Vrusk (Ambidexterity & Comprehensive)</option>
              <option value="Yazirian">Yazirian (Battle Rage & Gliding)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Primary System Area (PSA)</label>
            <select v-model="newCharForm.psa">
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
import {
  RACES_DATA,
  OFFICIAL_SKILLS,
  calcIM,
  calcMeleeHit,
  calcMaxCarry,
  calcUnencumberedMax,
  calcXPCost,
} from '../constants/characterRules.js';

export default {
  name: 'CharacterSheetsView',
  data() {
    return {
      characters: [],
      selectedChar: null,
      loading: true,
      creating: false,
      showCreateModal: false,
      racesData: RACES_DATA,
      officialSkills: OFFICIAL_SKILLS,
      newCharForm: {
        name: '',
        race: 'Human',
        psa: 'Military',
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
    selectCharacter(char) {
      this.selectedChar = JSON.parse(JSON.stringify(this.normalizeCharacterData(char)));
    },
    openCreateModal() {
      this.newCharForm = {
        name: '',
        race: 'Human',
        psa: 'Military',
        str_sta: 50,
        dex_rs: 50,
        int_log: 50,
        per_ldr: 50,
        max_stamina: 50,
        current_stamina: 50,
      };
      this.showCreateModal = true;
    },
    async createCharacter() {
      if (!this.newCharForm.name.trim()) return;
      this.creating = true;
      try {
        const payload = {
          ...this.newCharForm,
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
        else if (offSk.baseChance === 'Logic') baseVal = this.selectedChar.log || 50;
        else if (offSk.baseChance === 'Intuition') baseVal = this.selectedChar.int || 50;
        else if (offSk.baseChance === 'Personality') baseVal = this.selectedChar.per || 50;
        else if (offSk.baseChance.includes('Melee Base')) baseVal = this.derivedMeleeHit;
      }
      const lvlBonus = (skill.level || 1) * 10;
      return baseVal + lvlBonus;
    },
    addInventoryItem() {
      if (!this.selectedChar.inventory) this.selectedChar.inventory = [];
      this.selectedChar.inventory.push({ name: 'New Item', quantity: 1, weight: 1.0 });
      this.updateCharacter();
    },
    removeInventoryItem(index) {
      this.selectedChar.inventory.splice(index, 1);
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
  color: #58a6ff;
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
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.character-list li:hover {
  background: #21262d;
}

.character-list li.active {
  background: #1f6feb22;
  border-left: 4px solid #58a6ff;
}

.char-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.char-name {
  font-weight: 600;
  color: #f0f6fc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.char-sub {
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
.select-psa {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #58a6ff;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 1rem;
}

.race-ability-banner {
  background: #1f6feb15;
  border-left: 3px solid #58a6ff;
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
  color: #58a6ff;
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
  color: #58a6ff;
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
  color: #58a6ff;
  border-radius: 4px;
  padding: 4px 2px;
}

.shift-controls {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.btn-shift {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  font-size: 0.65rem;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
}
.btn-shift:hover {
  background: #30363d;
  color: #58a6ff;
}

/* Racial Traits Panel */
.racial-panel h4 {
  margin: 0 0 10px 0;
  color: #58a6ff;
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
  color: #58a6ff;
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

.select-official-skill {
  flex: 1;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #f0f6fc;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.skill-chance-badge {
  background: #1f6feb33;
  color: #58a6ff;
  font-weight: bold;
  font-size: 0.8rem;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid #1f6feb66;
}

.btn-xp-upgrade {
  background: #23863633;
  color: #3fb950;
  border: 1px solid #23863666;
  font-size: 0.75rem;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}
.btn-xp-upgrade:hover {
  background: #23863666;
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
  width: 440px;
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

<template>
  <div class="quick-reference-container">
    <!-- Toolbar: Category Navigation & Search -->
    <header class="ref-toolbar">
      <nav class="category-tabs" aria-label="Reference Categories">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="tab-button"
          :class="{ active: activeCategory === tab.id }"
          @click="activeCategory = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </nav>

      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Filter rules & tables..."
          aria-label="Filter rules and tables"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="clear-search-btn"
          title="Clear filter"
          @click="searchQuery = ''"
        >
          ✕
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="ref-content">
      <!-- Empty State -->
      <div v-if="noResults" class="empty-state">
        <div class="empty-icon">🛰️</div>
        <h3>No matching rules or tables found</h3>
        <p>No results found matching "{{ searchQuery }}" in {{ currentTabLabel }}.</p>
        <button type="button" class="clear-filter-btn" @click="searchQuery = ''">Clear Filter</button>
      </div>

      <!-- ================= SHIP COMBAT ================= -->
      <div v-else-if="activeCategory === 'ship'" class="category-panel">
        <!-- Sequence of Play -->
        <section v-if="filteredShipSequence.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Phase Guide</span>
            Sequence of Play
          </h2>
          <div class="sequence-grid">
            <div
              v-for="step in filteredShipSequence"
              :key="step.step"
              class="step-card"
            >
              <div class="step-header">
                <span class="step-num">Step {{ step.step }}</span>
                <h3 class="step-name">{{ step.name }}</h3>
              </div>
              <p class="step-desc">{{ step.description }}</p>
            </div>
          </div>
        </section>

        <!-- Ship Weapons Table -->
        <section v-if="filteredShipWeapons.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Armament</span>
            Ship Weapons
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Damage</th>
                  <th>Range (Hexes)</th>
                  <th>Ammo</th>
                  <th>RoF</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="w in filteredShipWeapons" :key="w.name">
                  <td class="col-name font-bold">{{ w.name }}</td>
                  <td><span class="type-tag">{{ w.type }}</span></td>
                  <td class="col-highlight font-mono">{{ w.damage }}</td>
                  <td class="font-mono text-center">{{ w.rangeHexes }}</td>
                  <td>{{ w.ammo }}</td>
                  <td class="font-mono text-center">{{ w.rof }}</td>
                  <td class="col-notes">{{ w.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Defenses & Countermeasures Table -->
        <section v-if="filteredShipDefenses.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Shields & ECM</span>
            Defenses & Countermeasures
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Effect</th>
                  <th>Limitations</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in filteredShipDefenses" :key="d.name">
                  <td class="col-name font-bold">{{ d.name }}</td>
                  <td><span class="type-tag">{{ d.type }}</span></td>
                  <td class="col-effect">{{ d.effect }}</td>
                  <td class="col-notes text-muted">{{ d.limitations }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Critical Hit Table -->
        <section v-if="filteredShipCriticalHits.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge danger">Catastrophic</span>
            Critical Hit Table
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 100px;">Roll (d10)</th>
                  <th style="width: 200px;">Location</th>
                  <th>Effect</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in filteredShipCriticalHits" :key="c.roll + c.location">
                  <td class="font-mono font-bold text-center roll-cell">{{ c.roll }}</td>
                  <td class="col-name font-bold">{{ c.location }}</td>
                  <td class="col-effect">{{ c.effect }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ================= RANGED COMBAT ================= -->
      <div v-else-if="activeCategory === 'ranged'" class="category-panel">
        <!-- Turn Sequence -->
        <section v-if="filteredRangedSequence.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Tactical Flow</span>
            Turn Sequence & Actions
          </h2>
          <div class="sequence-grid">
            <div
              v-for="step in filteredRangedSequence"
              :key="step.step"
              class="step-card"
            >
              <div class="step-header">
                <span class="step-num">Step {{ step.step }}</span>
                <h3 class="step-name">{{ step.name }}</h3>
              </div>
              <p class="step-desc">{{ step.description }}</p>
            </div>
          </div>
        </section>

        <!-- Ranged Weapons Table -->
        <section v-if="filteredRangedWeapons.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Arsenal</span>
            Ranged Weapons
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Damage</th>
                  <th>RoF</th>
                  <th>Short</th>
                  <th>Medium</th>
                  <th>Long</th>
                  <th>Ammo</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="w in filteredRangedWeapons" :key="w.name">
                  <td class="col-name font-bold">{{ w.name }}</td>
                  <td><span class="type-tag">{{ w.category }}</span></td>
                  <td class="col-highlight font-mono">{{ w.damage }}</td>
                  <td class="font-mono text-center">{{ w.rof }}</td>
                  <td class="font-mono text-center">{{ w.shortRange }}</td>
                  <td class="font-mono text-center">{{ w.medRange }}</td>
                  <td class="font-mono text-center">{{ w.longRange }}</td>
                  <td>{{ w.ammo }}</td>
                  <td class="col-notes">{{ w.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- To-Hit Modifiers Table -->
        <section v-if="filteredRangedModifiers.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Targeting</span>
            To-Hit Modifiers
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 260px;">Condition</th>
                  <th style="width: 180px;">Modifier</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in filteredRangedModifiers" :key="m.condition">
                  <td class="col-name font-bold">{{ m.condition }}</td>
                  <td>
                    <span class="modifier-pill" :class="modifierClass(m.modifier)">
                      {{ m.modifier }}
                    </span>
                  </td>
                  <td class="col-notes text-muted">{{ m.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Armor & Screens Table -->
        <section v-if="filteredRangedArmor.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Defense</span>
            Armor & Screens
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Protection</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in filteredRangedArmor" :key="a.name">
                  <td class="col-name font-bold">{{ a.name }}</td>
                  <td><span class="type-tag">{{ a.type }}</span></td>
                  <td class="col-effect font-medium">{{ a.protection }}</td>
                  <td class="col-notes text-muted">{{ a.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ================= MELEE COMBAT ================= -->
      <div v-else-if="activeCategory === 'melee'" class="category-panel">
        <!-- Formula Callout Banner -->
        <div v-if="showMeleeFormula" class="formula-banner">
          <div class="formula-icon">⚔️</div>
          <div class="formula-details">
            <span class="formula-subtitle">Base Hit Chance Formula</span>
            <div class="formula-code">{{ MELEE_COMBAT_REF.attackBaseFormula }}</div>
          </div>
        </div>

        <!-- Unarmed Combat Table -->
        <section v-if="filteredMeleeUnarmed.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Brawling</span>
            Unarmed Combat
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 200px;">STR Bracket</th>
                  <th style="width: 220px;">Punch Damage</th>
                  <th>Kick Damage</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in filteredMeleeUnarmed" :key="u.strBracket">
                  <td class="col-name font-bold font-mono">{{ u.strBracket }}</td>
                  <td class="col-highlight font-mono">{{ u.punchDamage }}</td>
                  <td class="col-highlight font-mono">{{ u.kickDamage }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Melee Weapons Table -->
        <section v-if="filteredMeleeWeapons.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Weapons</span>
            Melee Weapons
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Damage</th>
                  <th>Weight</th>
                  <th>Special Properties</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="w in filteredMeleeWeapons" :key="w.name">
                  <td class="col-name font-bold">{{ w.name }}</td>
                  <td class="col-highlight font-mono">{{ w.damage }}</td>
                  <td class="font-mono">{{ w.weight }}</td>
                  <td class="col-notes">{{ w.special }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Melee Modifiers Table -->
        <section v-if="filteredMeleeModifiers.length > 0" class="ref-section">
          <h2 class="section-title">
            <span class="title-badge">Tactics</span>
            Melee Modifiers
          </h2>
          <div class="table-responsive">
            <table class="ref-table">
              <thead>
                <tr>
                  <th style="width: 260px;">Situation</th>
                  <th style="width: 220px;">Modifier</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in filteredMeleeModifiers" :key="m.situation">
                  <td class="col-name font-bold">{{ m.situation }}</td>
                  <td>
                    <span class="modifier-pill" :class="modifierClass(m.modifier)">
                      {{ m.modifier }}
                    </span>
                  </td>
                  <td class="col-notes text-muted">{{ m.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  SHIP_COMBAT_REF,
  RANGED_COMBAT_REF,
  MELEE_COMBAT_REF
} from '../constants/combatReference.js';
import { getUserState, saveUserState, getSafeUserId } from '../utils/userState.js';

const props = defineProps({
  initialCategory: {
    type: String,
    default: undefined
  },
  initialSearch: {
    type: String,
    default: undefined
  }
});

const tabs = [
  { id: 'ship', label: 'Ship-to-Ship Combat', icon: '🚀' },
  { id: 'ranged', label: 'Ranged Weapon Combat', icon: '🔫' },
  { id: 'melee', label: 'Melee Combat', icon: '⚔️' }
];

const savedQuickRef = getUserState(getSafeUserId(), 'rulebooks', {
  quickRefCategory: 'ship',
  quickRefSearch: '',
});

const activeCategory = ref(props.initialCategory ?? savedQuickRef.quickRefCategory ?? 'ship');
const searchQuery = ref(props.initialSearch ?? savedQuickRef.quickRefSearch ?? '');

watch([activeCategory, searchQuery], () => {
  saveUserState(getSafeUserId(), 'rulebooks', {
    quickRefCategory: activeCategory.value,
    quickRefSearch: searchQuery.value,
  });
});

const currentTabLabel = computed(() => {
  const current = tabs.find((t) => t.id === activeCategory.value);
  return current ? current.label : '';
});

// Helper search matcher across all properties of an item
function matchesQuery(item, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return Object.values(item).some((val) => {
    if (val === null || val === undefined) return false;
    return String(val).toLowerCase().includes(q);
  });
}

// Styling helper for modifier pills
function modifierClass(modifierStr) {
  if (!modifierStr) return 'neutral';
  const str = String(modifierStr).trim();
  if (str.startsWith('+')) return 'positive';
  if (str.startsWith('-')) return 'negative';
  return 'neutral';
}

// Filtered Ship Combat items
const filteredShipSequence = computed(() =>
  SHIP_COMBAT_REF.sequenceOfPlay.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredShipWeapons = computed(() =>
  SHIP_COMBAT_REF.weapons.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredShipDefenses = computed(() =>
  SHIP_COMBAT_REF.defenses.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredShipCriticalHits = computed(() =>
  SHIP_COMBAT_REF.criticalHits.filter((item) => matchesQuery(item, searchQuery.value))
);

// Filtered Ranged Combat items
const filteredRangedSequence = computed(() =>
  RANGED_COMBAT_REF.sequenceOfPlay.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredRangedWeapons = computed(() =>
  RANGED_COMBAT_REF.weapons.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredRangedModifiers = computed(() =>
  RANGED_COMBAT_REF.modifiers.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredRangedArmor = computed(() =>
  RANGED_COMBAT_REF.armor.filter((item) => matchesQuery(item, searchQuery.value))
);

// Filtered Melee Combat items
const showMeleeFormula = computed(() => {
  if (!searchQuery.value.trim()) return true;
  const q = searchQuery.value.trim().toLowerCase();
  return (
    MELEE_COMBAT_REF.attackBaseFormula.toLowerCase().includes(q) ||
    'base hit formula attack'.includes(q)
  );
});
const filteredMeleeUnarmed = computed(() =>
  MELEE_COMBAT_REF.unarmedDamage.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredMeleeWeapons = computed(() =>
  MELEE_COMBAT_REF.weapons.filter((item) => matchesQuery(item, searchQuery.value))
);
const filteredMeleeModifiers = computed(() =>
  MELEE_COMBAT_REF.modifiers.filter((item) => matchesQuery(item, searchQuery.value))
);

// Empty state check per active category
const noResults = computed(() => {
  if (!searchQuery.value.trim()) return false;
  if (activeCategory.value === 'ship') {
    return (
      filteredShipSequence.value.length === 0 &&
      filteredShipWeapons.value.length === 0 &&
      filteredShipDefenses.value.length === 0 &&
      filteredShipCriticalHits.value.length === 0
    );
  }
  if (activeCategory.value === 'ranged') {
    return (
      filteredRangedSequence.value.length === 0 &&
      filteredRangedWeapons.value.length === 0 &&
      filteredRangedModifiers.value.length === 0 &&
      filteredRangedArmor.value.length === 0
    );
  }
  if (activeCategory.value === 'melee') {
    return (
      !showMeleeFormula.value &&
      filteredMeleeUnarmed.value.length === 0 &&
      filteredMeleeWeapons.value.length === 0 &&
      filteredMeleeModifiers.value.length === 0
    );
  }
  return false;
});
</script>

<style scoped>
.quick-reference-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
}

/* Toolbar */
.ref-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background: var(--border);
  color: var(--text-primary);
}

.tab-button.active {
  background-color: #021a1e !important;
  border-color: aquamarine !important;
  color: aquamarine !important;
  -webkit-text-fill-color: aquamarine;
  font-weight: 600;
  box-shadow: 0 0 8px rgba(127, 255, 212, 0.3);
}

.tab-icon {
  font-size: 16px;
}

.search-box {
  position: relative;
  min-width: 260px;
  max-width: 380px;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  opacity: 0.6;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 32px;
  background-color: #000000 !important;
  border: 1px solid rgba(0, 128, 128, 0.6) !important;
  border-radius: var(--radius);
  color: #00ffff !important;
  font-size: 13px;
}

.search-input:focus {
  border-color: aqua !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
  outline: none;
}

.clear-search-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.clear-search-btn:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

/* Content Area */
.ref-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.category-panel {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.ref-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.title-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  background: rgba(88, 166, 255, 0.15);
  color: var(--accent);
  border: 1px solid rgba(88, 166, 255, 0.3);
  border-radius: 12px;
  letter-spacing: 0.5px;
}

.title-badge.danger {
  background: rgba(248, 81, 73, 0.15);
  color: var(--danger);
  border-color: rgba(248, 81, 73, 0.3);
}

/* Sequence Grid & Cards */
.sequence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.step-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.step-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-num {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  background: var(--bg-tertiary);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
}

.step-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.step-desc {
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-secondary);
  margin: 0;
}

/* Formula Callout Banner */
.formula-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(88, 166, 255, 0.08);
  border: 1px solid rgba(88, 166, 255, 0.3);
  border-radius: var(--radius);
}

.formula-icon {
  font-size: 28px;
}

.formula-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.formula-subtitle {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent);
}

.formula-code {
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Tables */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-secondary);
}

.ref-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

.ref-table th {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.ref-table td {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(48, 54, 61, 0.6);
  color: var(--text-primary);
  vertical-align: middle;
}

.ref-table tbody tr:last-child td {
  border-bottom: none;
}

.ref-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.025);
}

.col-name {
  color: #fff;
  white-space: nowrap;
}

.col-highlight {
  color: var(--accent);
  font-weight: 600;
}

.col-notes {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.col-effect {
  color: var(--text-primary);
  line-height: 1.4;
}

.type-tag {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.roll-cell {
  background: var(--bg-tertiary);
  color: var(--accent);
}

/* Modifier Pills */
.modifier-pill {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.modifier-pill.positive {
  background: rgba(63, 185, 80, 0.15);
  color: var(--success);
  border: 1px solid rgba(63, 185, 80, 0.4);
}

.modifier-pill.negative {
  background: rgba(248, 81, 73, 0.15);
  color: var(--danger);
  border: 1px solid rgba(248, 81, 73, 0.4);
}

.modifier-pill.neutral {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

/* Utilities */
.font-bold {
  font-weight: 600;
}

.font-medium {
  font-weight: 500;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.text-center {
  text-align: center;
}

.text-muted {
  color: var(--text-secondary);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  gap: 12px;
}

.empty-icon {
  font-size: 40px;
}

.empty-state h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.empty-state p {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 0;
}

.clear-filter-btn {
  margin-top: 8px;
  padding: 6px 14px;
  font-size: 12px;
  background-color: #000000 !important;
  background: #000000 !important;
  border: 1px solid teal !important;
  color: teal !important;
  -webkit-text-fill-color: teal;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.clear-filter-btn:hover {
  background-color: #051414 !important;
  border-color: #00a8a8 !important;
  color: #00a8a8 !important;
  -webkit-text-fill-color: #00a8a8;
  box-shadow: 0 0 8px rgba(0, 128, 128, 0.4);
}
</style>

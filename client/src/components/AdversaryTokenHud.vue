<template>
  <aside v-if="token" class="adversary-token-hud" :class="{ 'has-template': Boolean(template) }">
    <!-- Header -->
    <div class="hud-header">
      <div class="hud-header-left">
        <div class="hud-avatar-circle" :style="{ borderColor: tierColor }">
          <img v-if="token.avatar_url" :src="token.avatar_url" alt="Token" />
          <span v-else class="hud-avatar-placeholder">👤</span>
        </div>
        <div class="hud-title-box">
          <h3 class="hud-token-name">{{ token.name || 'Adversary' }}</h3>
          <span v-if="template" class="hud-tier-badge" :style="{ backgroundColor: tierColor }">
            Tier {{ template.threat_tier }} {{ template.category === 'creature' ? 'Creature' : 'NPC' }}
          </span>
        </div>
      </div>
      <div class="hud-header-actions">
        <button
          v-if="isGm"
          type="button"
          class="btn-hud-visibility"
          :class="{ 'is-hidden': token.layer === 'gm' }"
          :title="token.layer === 'gm' ? 'Hidden from Players (click to reveal)' : 'Visible to Players (click to hide)'"
          @click="toggleVisibility"
        >
          {{ token.layer === 'gm' ? '🙈 Hidden' : '👁️ Visible' }}
        </button>
        <button class="hud-close-btn" @click="$emit('close')" title="Close HUD">✕</button>
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="hud-body">
      <!-- TOP MUTABLE TACTICAL BAR -->
      <section class="hud-section mutable-bar">
        <!-- Stamina / HP Tracker with Delta Math -->
        <div class="tracker-group">
          <div class="tracker-header">
            <label class="tracker-label">STA (HP)</label>
            <span class="tracker-sub">Delta math supported (e.g. -12, +5)</span>
          </div>
          <div class="tracker-controls">
            <input
              type="text"
              class="tracker-input"
              :value="token.current_hp"
              @change="onHpCommit($event.target.value)"
              @keyup.enter="$event.target.blur()"
              placeholder="HP"
            />
            <span class="tracker-slash">/</span>
            <span class="tracker-max">{{ maxHp }}</span>

            <!-- Quick Delta Chips -->
            <div class="quick-chips">
              <button class="chip chip-sub" @click="applyDelta(-10)">-10</button>
              <button class="chip chip-sub" @click="applyDelta(-5)">-5</button>
              <button class="chip chip-sub" @click="applyDelta(-1)">-1</button>
              <button class="chip chip-add" @click="applyDelta(+1)">+1</button>
              <button class="chip chip-add" @click="applyDelta(+5)">+5</button>
            </div>
          </div>
        </div>

        <!-- SEU Pool Tracker (if present) -->
        <div v-if="hasSeuPool" class="tracker-group seu-group">
          <div class="tracker-header">
            <label class="tracker-label">SEU Energy Pool</label>
          </div>
          <div class="tracker-controls">
            <input
              type="number"
              class="tracker-input"
              :value="token.seu_current"
              @change="onSeuCommit($event.target.value)"
              min="0"
            />
            <span class="tracker-slash">/</span>
            <span class="tracker-max">{{ maxSeu }}</span>

            <div class="quick-chips">
              <button class="chip chip-sub" @click="applySeuDelta(-5)">-5</button>
              <button class="chip chip-sub" @click="applySeuDelta(-1)">-1</button>
              <button class="chip chip-add" @click="applySeuDelta(+5)">+5</button>
            </div>
          </div>
        </div>

        <!-- Tactical Conditions Pill Selector -->
        <div class="conditions-group">
          <label class="tracker-label">Tactical Conditions</label>
          <div class="condition-pills">
            <button
              v-for="cond in availableConditions"
              :key="cond.name"
              class="cond-pill"
              :class="{ active: isConditionActive(cond.name) }"
              @click="toggleCondition(cond.name)"
            >
              {{ cond.icon }} {{ cond.name }}
            </button>
          </div>
        </div>
      </section>

      <!-- BOTTOM READ-ONLY REFERENCE CARD -->
      <section v-if="template" class="hud-section reference-card">
        <!-- Quick Stats Overview -->
        <div class="stats-overview-grid">
          <div class="overview-item">
            <span class="item-label">IM (Initiative)</span>
            <span class="item-value">+{{ template.initiative_mod || 0 }}</span>
          </div>
          <div class="overview-item">
            <span class="item-label">Movement</span>
            <span class="item-value">{{ template.movement || '12 m/s' }}</span>
          </div>
          <div class="overview-item full-width-item">
            <span class="item-label">Defenses & Armor</span>
            <span class="item-value">{{ template.defense_summary || 'None' }}</span>
          </div>
        </div>

        <!-- Pre-Calculated Actions & Attacks -->
        <div v-if="template.actions && template.actions.length > 0" class="actions-group">
          <h4 class="section-title">Combat Actions & Attacks</h4>
          <div class="action-cards-list">
            <div v-for="(act, idx) in template.actions" :key="idx" class="action-card">
              <div class="action-card-header">
                <span class="action-name">{{ act.name }}</span>
                <span class="action-pct-badge">🎯 {{ act.target_pct }}% to Hit</span>
              </div>
              <div class="action-card-details">
                <span class="detail-chip">💥 {{ act.damage }}</span>
                <span v-if="act.range" class="detail-chip">📏 {{ act.range }}</span>
                <span v-if="act.seu_cost" class="detail-chip">⚡ {{ act.seu_cost }} SEU</span>
              </div>
              <p v-if="act.description" class="action-desc">{{ act.description }}</p>
              <div class="action-buttons-row">
                <button class="btn-action-roll hit" @click="$emit('roll-attack', { action: act, token })">
                  Roll to Hit
                </button>
                <button class="btn-action-roll dmg" @click="$emit('roll-damage', { action: act, token })">
                  Roll Damage
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Traits & Special Abilities -->
        <div v-if="template.traits && template.traits.length > 0" class="traits-group">
          <h4 class="section-title">Special Traits & Skills</h4>
          <div class="traits-list">
            <div v-for="(tr, idx) in template.traits" :key="idx" class="trait-card">
              <strong>{{ tr.name }}:</strong> {{ tr.description }}
            </div>
          </div>
        </div>
      </section>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'AdversaryTokenHud',
  props: {
    token: {
      type: Object,
      default: null,
    },
    isGm: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'update:token', 'roll-attack', 'roll-damage'],
  data() {
    return {
      availableConditions: [
        { name: 'Stunned', icon: '⚡' },
        { name: 'Unconscious', icon: '💀' },
        { name: 'Wounded', icon: '🩸' },
        { name: 'Pinned', icon: '🎯' },
        { name: 'In Cover', icon: '🛡️' },
        { name: 'Prone', icon: '👣' },
        { name: 'Poisoned', icon: '🧪' },
        { name: 'Burning', icon: '🔥' },
      ],
    };
  },
  computed: {
    template() {
      return this.token?.template || null;
    },
    tierColor() {
      const tier = this.template?.threat_tier || 1;
      return this.getTierColor(tier);
    },
    maxHp() {
      return this.token?.max_hp ?? this.token?.template?.hp_max ?? 50;
    },
    hasSeuPool() {
      return (
        this.token?.seu_current !== null &&
        this.token?.seu_current !== undefined
      );
    },
    maxSeu() {
      return this.template?.system_data?.seu_max || 50;
    },
  },
  methods: {
    getTierColor(tier) {
      const map = {
        1: '#2ecc71', // Green
        2: '#3498db', // Blue
        3: '#9b59b6', // Purple
        4: '#f1c40f', // Gold
        5: '#e74c3c', // Crimson
      };
      return map[tier] || '#3498db';
    },
    calculateNewHp(currentHp, maxHp, inputStr) {
      const cur = Number(currentHp) || 0;
      const max = Number(maxHp) || 0;
      if (inputStr === null || inputStr === undefined) return cur;

      const raw = String(inputStr).trim();
      if (!raw) return cur;

      if (raw.startsWith('+')) {
        const val = parseInt(raw.slice(1), 10);
        if (isNaN(val)) return cur;
        return Math.min(max, Math.max(0, cur + val));
      }
      if (raw.startsWith('-')) {
        const val = parseInt(raw.slice(1), 10);
        if (isNaN(val)) return cur;
        return Math.min(max, Math.max(0, cur - val));
      }
      const direct = parseInt(raw, 10);
      if (isNaN(direct)) return cur;
      return Math.min(max, Math.max(0, direct));
    },
    toggleConditionItem(existingList, conditionName) {
      let list = existingList;
      if (typeof list === 'string') {
        try {
          list = JSON.parse(list);
        } catch {
          list = [];
        }
      }
      list = Array.isArray(list) ? [...list] : [];
      const idx = list.indexOf(conditionName);
      if (idx !== -1) {
        list.splice(idx, 1);
      } else {
        list.push(conditionName);
      }
      return list;
    },
    onHpCommit(val) {
      if (!this.token) return;
      const nextHp = this.calculateNewHp(this.token.current_hp, this.maxHp, val);
      this.$emit('update:token', {
        ...this.token,
        current_hp: nextHp,
      });
    },
    applyDelta(delta) {
      if (!this.token) return;
      const prefix = delta >= 0 ? `+${delta}` : `${delta}`;
      const nextHp = this.calculateNewHp(this.token.current_hp, this.maxHp, prefix);
      this.$emit('update:token', {
        ...this.token,
        current_hp: nextHp,
      });
    },
    onSeuCommit(val) {
      if (!this.token) return;
      const nextSeu = Math.max(0, Math.min(this.maxSeu, parseInt(val, 10) || 0));
      this.$emit('update:token', {
        ...this.token,
        seu_current: nextSeu,
      });
    },
    applySeuDelta(delta) {
      if (!this.token) return;
      const cur = this.token.seu_current || 0;
      const nextSeu = Math.max(0, Math.min(this.maxSeu, cur + delta));
      this.$emit('update:token', {
        ...this.token,
        seu_current: nextSeu,
      });
    },
    isConditionActive(name) {
      let conditions = this.token?.conditions;
      if (typeof conditions === 'string') {
        try {
          conditions = JSON.parse(conditions);
        } catch {
          conditions = [];
        }
      }
      return Array.isArray(conditions) && conditions.includes(name);
    },
    toggleCondition(name) {
      if (!this.token) return;
      const next = this.toggleConditionItem(this.token.conditions, name);
      this.$emit('update:token', {
        ...this.token,
        conditions: next,
      });
    },
    toggleVisibility() {
      if (!this.token) return;
      const nextLayer = this.token.layer === 'gm' ? 'character' : 'gm';
      this.$emit('update:token', {
        ...this.token,
        layer: nextLayer,
      });
    },
  },
};
</script>

<style scoped>
.hud-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-hud-visibility {
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(16, 185, 129, 0.5);
  color: #34d399;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-hud-visibility:hover {
  background: rgba(16, 185, 129, 0.25);
}

.btn-hud-visibility.is-hidden {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(245, 158, 11, 0.6);
  color: #fbbf24;
}

.btn-hud-visibility.is-hidden:hover {
  background: rgba(245, 158, 11, 0.28);
}

.adversary-token-hud {
  position: absolute;
  top: 16px;
  bottom: 16px;
  right: 16px;
  width: 360px;
  max-width: 90vw;
  max-height: calc(100% - 32px);
  background-color: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.85), 0 0 16px rgba(0, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 150;
  color: #cecece;
  overflow: hidden;
  font-family: inherit;
}

.hud-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background-color: #21262d;
  border-bottom: 1px solid #30363d;
}

.hud-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hud-avatar-circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid #3498db;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d1117;
}

.hud-avatar-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hud-token-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #cecece;
}

.hud-tier-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: bold;
  padding: 1px 6px;
  border-radius: 4px;
  color: #cecece;
  margin-top: 2px;
}

.hud-close-btn {
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.hud-close-btn:hover {
  color: #00ffff;
  background-color: #30363d;
}

.hud-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 14px 32px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hud-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tracker-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tracker-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.tracker-label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #8b949e;
  letter-spacing: 0.05em;
}

.tracker-sub {
  font-size: 0.7rem;
  color: #64748b;
}

.tracker-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tracker-input {
  width: 58px;
  background-color: #0d1117;
  border: 1px solid #30363d;
  border-radius: 4px;
  color: #cecece;
  font-weight: bold;
  font-size: 1rem;
  padding: 4px 6px;
  text-align: center;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.tracker-input:focus {
  outline: none;
  border-color: #00ffff;
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.35);
}

.tracker-slash {
  color: #64748b;
}

.tracker-max {
  font-size: 0.95rem;
  color: #8b949e;
  margin-right: 6px;
}

.quick-chips {
  display: flex;
  gap: 4px;
}

.chip {
  border: none;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
}

.chip-sub {
  background-color: #7f1d1d;
  color: #fecaca;
}

.chip-sub:hover {
  background-color: #991b1b;
}

.chip-add {
  background-color: #14532d;
  color: #bbf7d0;
}

.chip-add:hover {
  background-color: #166534;
}

.condition-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.cond-pill {
  background-color: #21262d;
  border: 1px solid #30363d;
  color: #8b949e;
  font-size: 0.75rem;
  padding: 3px 7px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cond-pill:hover {
  border-color: #58a6ff;
  color: #cecece;
}

.cond-pill.active {
  background-color: #082d33;
  color: #00ffff;
  border-color: #00ffff;
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.3);
}

/* Reference Card Styles */
.reference-card {
  border-top: 1px solid #30363d;
  padding-top: 12px;
}

.stats-overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background-color: #21262d;
  border: 1px solid #30363d;
  padding: 10px;
  border-radius: 6px;
}

.overview-item {
  display: flex;
  flex-direction: column;
}

.full-width-item {
  grid-column: span 2;
}

.item-label {
  font-size: 0.7rem;
  color: #8b949e;
  text-transform: uppercase;
}

.item-value {
  font-size: 0.85rem;
  font-weight: 500;
  color: #cecece;
}

.section-title {
  font-size: 0.9rem;
  text-transform: uppercase;
  color: #00ffff;
  margin: 10px 0 6px 0;
  letter-spacing: 0.05em;
}

.action-cards-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-card {
  background-color: #21262d;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 10px;
}

.action-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #cecece;
}

.action-pct-badge {
  background-color: #082d33;
  border: 1px solid rgba(0, 255, 255, 0.4);
  color: #00ffff;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
}

.action-card-details {
  display: flex;
  gap: 6px;
  margin: 6px 0;
}

.detail-chip {
  font-size: 0.72rem;
  background-color: #0d1117;
  border: 1px solid #30363d;
  padding: 2px 6px;
  border-radius: 4px;
  color: #8b949e;
}

.action-desc {
  margin: 4px 0 8px 0;
  font-size: 0.75rem;
  color: #8b949e;
}

.action-buttons-row {
  display: flex;
  gap: 8px;
}

.btn-action-roll {
  flex: 1;
  padding: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-action-roll.hit {
  background-color: #238636;
  border-color: #3fb950;
  color: #cecece;
}

.btn-action-roll.hit:hover {
  background-color: #2ea043;
}

.btn-action-roll.dmg {
  background-color: #d97706;
  border-color: #f59e0b;
  color: #cecece;
}

.btn-action-roll.dmg:hover {
  background-color: #b45309;
}

.traits-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trait-card {
  background-color: #21262d;
  border: 1px solid #30363d;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 0.78rem;
  color: #cecece;
}
</style>

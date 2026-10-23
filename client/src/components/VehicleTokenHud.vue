<template>
  <aside v-if="token && vehicleData" class="vehicle-token-hud">
    <!-- Header -->
    <div class="hud-header">
      <div class="hud-header-left">
        <div class="hud-avatar-circle" :style="{ borderColor: token.color || '#00e5ff' }">
          <img v-if="avatarUrl" :src="avatarUrl" alt="Vehicle" />
          <span v-else class="hud-avatar-placeholder">🚗</span>
        </div>
        <div class="hud-title-box">
          <h3 class="hud-token-name">{{ vehicleData.name || token.name || 'Vehicle' }}</h3>
          <span class="hud-type-badge">{{ vehicleData.type || 'Vehicle' }}</span>
        </div>
      </div>
      <button type="button" class="hud-close-btn" @click="$emit('close')" title="Close HUD">✕</button>
    </div>

    <!-- Scrollable Body -->
    <div class="hud-body">
      <!-- MUTABLE TACTICAL STATUS BAR -->
      <section class="hud-section mutable-bar">
        <!-- Speedometer -->
        <div class="tracker-group speedometer-group">
          <div class="tracker-header">
            <label class="tracker-label">Speedometer</label>
            <span class="speed-limits-meta">
              Top: {{ vehicleData.top_speed }} m/t | Turn: {{ vehicleData.turn_speed }} m/t
            </span>
          </div>

          <div class="speedometer-display">
            <div class="speed-readout-box">
              <span class="speed-readout">{{ currentSpeed }} m/t</span>
              <span class="speed-kph">({{ speedKph }} kph)</span>
            </div>
            <div class="speed-input-wrapper">
              <label class="input-sublabel">Set:</label>
              <input
                type="number"
                class="tracker-input speed-input"
                :value="currentSpeed"
                min="0"
                :max="vehicleData.top_speed"
                @change="onSpeedDirectChange($event.target.value)"
                @keyup.enter="$event.target.blur()"
              />
            </div>
          </div>

          <!-- Speed Controls -->
          <div class="speed-controls-row">
            <button
              type="button"
              class="btn-accel"
              @click="accelerate"
              :title="`Accelerate by ${vehicleData.accel} m/t`"
            >
              + Accel (+{{ vehicleData.accel }})
            </button>
            <button
              type="button"
              class="btn-decel"
              @click="decelerate"
              :title="`Decelerate by ${vehicleData.decel} m/t`"
            >
              - Decel (-{{ vehicleData.decel }})
            </button>
            <button
              type="button"
              class="btn-stop"
              @click="emergencyStop"
              title="Emergency Stop (Set speed to 0)"
            >
              Emergency Stop
            </button>
          </div>
        </div>

        <!-- Parabattery Energy Gauge -->
        <div class="tracker-group battery-group">
          <div class="tracker-header">
            <label class="tracker-label">Parabattery Energy</label>
            <span class="battery-readout">{{ currentSeu }} / {{ maxSeu }} SEU</span>
          </div>

          <!-- Progress bar -->
          <div class="battery-meter">
            <div
              class="battery-fill"
              :style="{ width: seuPercentage + '%', backgroundColor: seuMeterColor }"
            ></div>
          </div>

          <!-- Quick Drain Chips -->
          <div class="quick-chips battery-chips">
            <button type="button" class="chip chip-seu-1" @click="drainSeu(1)">-1</button>
            <button type="button" class="chip chip-seu-5" @click="drainSeu(5)">-5</button>
            <button type="button" class="chip chip-seu-10" @click="drainSeu(10)">-10</button>
            <button type="button" class="chip chip-recharge chip-seu-recharge" @click="rechargeSeu">Recharge</button>
          </div>
        </div>

        <!-- Vehicle Damage Table Conditions -->
        <div class="conditions-group">
          <label class="tracker-label">Vehicle Damage Conditions</label>
          <div class="condition-pills">
            <button
              v-for="cond in availableConditions"
              :key="cond.name"
              type="button"
              class="cond-pill"
              :class="[cond.className, { active: isConditionActive(cond.name) }]"
              @click="toggleCondition(cond.name)"
            >
              {{ cond.icon }} {{ cond.name }}
            </button>
          </div>
        </div>

        <!-- Quick Action Dice Rolls -->
        <div class="dice-actions-group">
          <label class="tracker-label">Tactical Dice Actions</label>
          <div class="dice-buttons-row">
            <button
              type="button"
              class="btn-dice-action btn-roll-control"
              @click="$emit('roll-control', { token })"
              title="Roll Control Table Check (d100)"
            >
              🎲 Control Table (d100)
            </button>
            <button
              type="button"
              class="btn-dice-action btn-roll-damage"
              @click="$emit('roll-damage', { token })"
              title="Roll Vehicle Damage Table (2d10)"
            >
              💥 Damage Table (2d10)
            </button>
          </div>
        </div>

        <!-- Crew and Cargo Notes -->
        <div class="notes-group">
          <div class="note-row">
            <label class="note-label">Driver / Crew</label>
            <input
              type="text"
              class="driver-notes-input note-input"
              :value="vehicleData.driver || vehicleData.driver_notes || ''"
              placeholder="e.g. Driver: Ace (Dex 65)"
              @change="onDriverNotesChange($event.target.value)"
              @keyup.enter="$event.target.blur()"
            />
          </div>
          <div class="note-row">
            <label class="note-label">Cargo Notes</label>
            <input
              type="text"
              class="cargo-notes-input note-input"
              :value="vehicleData.cargo_notes"
              placeholder="e.g. Survey gear, 2x 100 SEU clips"
              @change="onCargoNotesChange($event.target.value)"
              @keyup.enter="$event.target.blur()"
            />
          </div>
        </div>
      </section>

      <!-- READ-ONLY ALPHA DAWN REFERENCE CARD -->
      <section class="hud-section reference-card">
        <h4 class="section-title">Alpha Dawn Rulebook Stats</h4>
        <div class="stats-overview-grid">
          <div class="overview-item">
            <span class="item-label">Top Speed</span>
            <span class="item-value">{{ vehicleData.top_speed }} m/t</span>
          </div>
          <div class="overview-item">
            <span class="item-label">Cruise Speed</span>
            <span class="item-value">{{ cruiseSpeedKph }} kph</span>
          </div>
          <div class="overview-item">
            <span class="item-label">Acceleration</span>
            <span class="item-value">{{ vehicleData.accel }} m/t</span>
          </div>
          <div class="overview-item">
            <span class="item-label">Deceleration</span>
            <span class="item-value">{{ vehicleData.decel }} m/t</span>
          </div>
          <div class="overview-item">
            <span class="item-label">Turn Speed</span>
            <span class="item-value">{{ vehicleData.turn_speed }} m/t</span>
          </div>
          <div class="overview-item">
            <span class="item-label">Passengers</span>
            <span class="item-value">{{ vehicleData.passengers_capacity || (typeof vehicleData.passengers === 'number' || (!isNaN(Number(vehicleData.passengers)) && vehicleData.passengers !== '') ? vehicleData.passengers : '-') }}</span>
          </div>
          <div class="overview-item">
            <span class="item-label">Cargo</span>
            <span class="item-value">{{ vehicleData.cargo_kg ? `${vehicleData.cargo_kg} kg` : '-' }}</span>
          </div>
          <div class="overview-item">
            <span class="item-label">Battery Type</span>
            <span class="item-value">{{ vehicleData.battery_type || 'Parabattery' }}</span>
          </div>
        </div>
        <p v-if="vehicleData.description" class="ref-desc">
          {{ vehicleData.description }}
        </p>
      </section>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'VehicleTokenHud',
  props: {
    token: {
      type: Object,
      default: null,
    },
  },
  emits: ['close', 'update:token', 'roll-control', 'roll-damage'],
  data() {
    return {
      availableConditions: [
        { name: 'Turn Speed -15', icon: '🔄', className: 'condition-turn-speed' },
        { name: 'Accel -20', icon: '📉', className: 'condition-accel' },
        { name: 'Top Speed -30', icon: '⏱️', className: 'condition-top-speed' },
        { name: 'Steering Jammed', icon: '🛑', className: 'condition-steering-jammed' },
        { name: 'Decel -20/turn', icon: '⛔', className: 'condition-decel' },
        { name: 'Spin', icon: '💫', className: 'condition-spin' },
        { name: '🔥 Burning', icon: '🔥', className: 'condition-burning' },
        { name: 'Roll & Burn', icon: '💥', className: 'condition-roll-burn' },
      ],
    };
  },
  computed: {
    vehicleData() {
      return this.token?.vehicle_data || null;
    },
    avatarUrl() {
      return this.vehicleData?.avatar_url || this.token?.avatar_url || '';
    },
    currentSpeed() {
      return Number(this.vehicleData?.current_speed) || 0;
    },
    speedKph() {
      const topM = Number(this.vehicleData?.top_speed) || 175;
      const topKph = Number(this.vehicleData?.top_speed_kph) || Math.round(topM * 0.36);
      if (topM <= 0) return 0;
      return Math.round(this.currentSpeed * (topKph / topM));
    },
    cruiseSpeedKph() {
      if (this.vehicleData?.cruise_speed_kph) {
        return this.vehicleData.cruise_speed_kph;
      }
      const topKph = Number(this.vehicleData?.top_speed_kph) || Math.round((this.vehicleData?.top_speed || 100) * 0.36);
      return Math.round(topKph * 0.6);
    },
    currentSeu() {
      return Number(this.vehicleData?.current_seu ?? this.maxSeu);
    },
    maxSeu() {
      return Number(this.vehicleData?.max_seu) || 100;
    },
    seuPercentage() {
      if (this.maxSeu <= 0) return 0;
      return Math.min(100, Math.max(0, Math.round((this.currentSeu / this.maxSeu) * 100)));
    },
    seuMeterColor() {
      if (this.seuPercentage > 50) return '#10b981'; // emerald
      if (this.seuPercentage > 20) return '#f59e0b'; // amber
      return '#ef4444'; // red
    },
    conditions() {
      return Array.isArray(this.vehicleData?.damage_conditions)
        ? this.vehicleData.damage_conditions
        : [];
    },
  },
  methods: {
    emitVehicleUpdate(updatedVehData) {
      if (!this.token) return;
      this.$emit('update:token', {
        ...this.token,
        vehicle_data: {
          ...this.vehicleData,
          ...updatedVehData,
        },
      });
    },
    accelerate() {
      const accel = Number(this.vehicleData?.accel) || 20;
      const top = Number(this.vehicleData?.top_speed) || 175;
      const newSpeed = Math.min(top, this.currentSpeed + accel);
      this.emitVehicleUpdate({ current_speed: newSpeed });
    },
    decelerate() {
      const decel = Number(this.vehicleData?.decel) || 20;
      const newSpeed = Math.max(0, this.currentSpeed - decel);
      this.emitVehicleUpdate({ current_speed: newSpeed });
    },
    emergencyStop() {
      this.emitVehicleUpdate({ current_speed: 0 });
    },
    onSpeedDirectChange(val) {
      const parsed = parseInt(val, 10);
      const top = Number(this.vehicleData?.top_speed) || 175;
      const speed = isNaN(parsed) ? 0 : Math.min(top, Math.max(0, parsed));
      this.emitVehicleUpdate({ current_speed: speed });
    },
    drainSeu(amount) {
      const nextSeu = Math.max(0, this.currentSeu - amount);
      this.emitVehicleUpdate({ current_seu: nextSeu });
    },
    rechargeSeu() {
      this.emitVehicleUpdate({ current_seu: this.maxSeu });
    },
    isConditionActive(name) {
      return this.conditions.includes(name);
    },
    toggleCondition(name) {
      const next = [...this.conditions];
      const idx = next.indexOf(name);
      if (idx !== -1) {
        next.splice(idx, 1);
      } else {
        next.push(name);
      }
      this.emitVehicleUpdate({ damage_conditions: next });
    },
    onDriverNotesChange(val) {
      this.emitVehicleUpdate({
        driver: val,
        driver_notes: val,
      });
    },
    saveDriverNotes(val) {
      this.onDriverNotesChange(val);
    },
    onCargoNotesChange(val) {
      this.emitVehicleUpdate({ cargo_notes: val });
    },
  },
};
</script>

<style scoped>
.vehicle-token-hud {
  position: absolute;
  top: 70px;
  right: 16px;
  width: 380px;
  max-width: 90vw;
  max-height: calc(100vh - 100px);
  background-color: #0b1320;
  border: 1px solid #1e293b;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.75);
  display: flex;
  flex-direction: column;
  z-index: 150;
  color: #f1f5f9;
  overflow: hidden;
  font-family: inherit;
}

.hud-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background-color: #111d33;
  border-bottom: 1px solid #1e293b;
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
  border: 2px solid #00e5ff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #030712;
}

.hud-avatar-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hud-avatar-placeholder {
  font-size: 1.25rem;
}

.hud-token-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #f8fafc;
}

.hud-type-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: bold;
  padding: 1px 6px;
  border-radius: 4px;
  background-color: #0284c7;
  color: #ffffff;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hud-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.hud-close-btn:hover {
  color: #f8fafc;
}

.hud-body {
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hud-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tracker-group {
  background-color: #131f37;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tracker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tracker-label {
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.speed-limits-meta {
  font-size: 0.75rem;
  color: #64748b;
}

.speedometer-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.speed-readout-box {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.speed-readout {
  font-size: 1.35rem;
  font-weight: 700;
  color: #38bdf8;
  font-family: monospace;
}

.speed-kph {
  font-size: 0.85rem;
  color: #94a3b8;
}

.speed-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-sublabel {
  font-size: 0.75rem;
  color: #64748b;
}

.tracker-input {
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
  color: #f8fafc;
  padding: 3px 6px;
  font-size: 0.85rem;
  width: 55px;
  text-align: center;
}

.speed-controls-row {
  display: flex;
  gap: 6px;
}

.btn-accel,
.btn-decel,
.btn-stop {
  flex: 1;
  padding: 6px 4px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.btn-accel {
  background-color: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #34d399;
}

.btn-accel:hover {
  background-color: rgba(16, 185, 129, 0.35);
}

.btn-decel {
  background-color: rgba(245, 158, 11, 0.2);
  border-color: #f59e0b;
  color: #fbbf24;
}

.btn-decel:hover {
  background-color: rgba(245, 158, 11, 0.35);
}

.btn-stop {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #f87171;
}

.btn-stop:hover {
  background-color: rgba(239, 68, 68, 0.35);
}

.battery-readout {
  font-size: 0.82rem;
  font-weight: 600;
  color: #38bdf8;
  font-family: monospace;
}

.battery-meter {
  height: 8px;
  background-color: #0f172a;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #334155;
}

.battery-fill {
  height: 100%;
  transition: width 0.2s ease, background-color 0.2s ease;
}

.quick-chips {
  display: flex;
  gap: 6px;
}

.chip {
  flex: 1;
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  border-radius: 4px;
  padding: 4px 0;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.chip:hover {
  background-color: #334155;
  color: #ffffff;
}

.chip-recharge {
  flex: 1.5;
  background-color: rgba(14, 165, 233, 0.2);
  border-color: #0ea5e9;
  color: #38bdf8;
}

.chip-recharge:hover {
  background-color: rgba(14, 165, 233, 0.35);
}

.conditions-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.condition-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.cond-pill {
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  border-radius: 4px;
  padding: 3px 7px;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cond-pill:hover {
  border-color: #64748b;
  color: #cbd5e1;
}

.cond-pill.active {
  background-color: rgba(239, 68, 68, 0.25);
  border-color: #ef4444;
  color: #fca5a5;
  font-weight: 600;
}

.dice-actions-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dice-buttons-row {
  display: flex;
  gap: 6px;
}

.btn-dice-action {
  flex: 1;
  padding: 7px 6px;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #38bdf8;
  background-color: rgba(56, 189, 248, 0.15);
  color: #e0f2fe;
  transition: background-color 0.15s ease;
}

.btn-dice-action:hover {
  background-color: rgba(56, 189, 248, 0.3);
}

.btn-roll-damage {
  border-color: #f97316;
  background-color: rgba(249, 115, 22, 0.15);
  color: #ffedd5;
}

.btn-roll-damage:hover {
  background-color: rgba(249, 115, 22, 0.3);
}

.notes-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.note-label {
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
}

.note-input {
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
  color: #f8fafc;
  padding: 5px 8px;
  font-size: 0.8rem;
}

.note-input:focus {
  outline: none;
  border-color: #38bdf8;
}

.reference-card {
  border-top: 1px solid #1e293b;
  padding-top: 10px;
}

.section-title {
  margin: 0 0 6px 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.stats-overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.overview-item {
  background-color: #131f37;
  padding: 6px 8px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

.item-label {
  font-size: 0.65rem;
  color: #64748b;
  text-transform: uppercase;
}

.item-value {
  font-size: 0.82rem;
  font-weight: 600;
  color: #e2e8f0;
}

.ref-desc {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 6px 0 0 0;
  line-height: 1.4;
  font-style: italic;
}
</style>

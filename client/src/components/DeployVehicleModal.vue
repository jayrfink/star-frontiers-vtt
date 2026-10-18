<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div class="modal-card deploy-vehicle-modal" role="dialog" aria-modal="true" aria-labelledby="deploy-vehicle-title">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-title-row">
          <span class="header-icon">🚀</span>
          <h3 id="deploy-vehicle-title">Deploy Vehicle</h3>
        </div>
        <button type="button" class="btn-close close-btn" title="Close" @click="close">✕</button>
      </div>

      <!-- Tab Buttons -->
      <div class="modal-tabs">
        <button
          type="button"
          class="tab-btn tab-standard"
          :class="{ active: activeTab === 'standard' }"
          @click="activeTab = 'standard'"
        >
          Standard Vehicles
        </button>
        <button
          type="button"
          class="tab-btn tab-custom"
          :class="{ active: activeTab === 'custom' }"
          @click="activeTab = 'custom'"
        >
          Custom Vehicles
        </button>
      </div>

      <div class="modal-body">
        <!-- Error & Status Banners -->
        <div v-if="errorMessage" class="error-banner">
          ⚠️ {{ errorMessage }}
        </div>
        <div v-if="loadingVehicles" class="loading-state">
          Loading vehicles...
        </div>

        <div v-else>
          <!-- TAB 1: STANDARD VEHICLES -->
          <div v-if="activeTab === 'standard'" class="tab-content">
            <div class="form-group">
              <label for="standard-vehicle-picker">Select Vehicle Blueprint</label>
              <select
                id="standard-vehicle-picker"
                v-model="selectedVehicleId"
                class="vehicle-select"
                @change="onVehicleSelected"
              >
                <option
                  v-for="veh in standardVehicles"
                  :key="veh.id"
                  :value="veh.id"
                >
                  {{ veh.name }} ({{ veh.type }} - Top Speed {{ veh.top_speed_kph }} kph)
                </option>
              </select>
            </div>

            <!-- Selected Vehicle Spec Preview Card -->
            <div v-if="selectedVehicle" class="spec-card">
              <div class="spec-header">
                <div class="spec-title-area">
                  <h4>{{ selectedVehicle.name }}</h4>
                  <span class="type-badge">{{ selectedVehicle.type }}</span>
                </div>
                <div class="spec-cost">
                  {{ selectedVehicle.cost }} Cr
                </div>
              </div>

              <div class="specs-grid">
                <div class="spec-item">
                  <span class="spec-label">Top Speed</span>
                  <span class="spec-value">Top Speed: {{ selectedVehicle.top_speed_kph }} kph ({{ selectedVehicle.top_speed_m_turn }} m/t)</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Cruise Speed</span>
                  <span class="spec-value">{{ selectedVehicle.cruise_speed_kph || Math.round(selectedVehicle.top_speed_kph * 0.6) }} kph</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Acceleration</span>
                  <span class="spec-value">{{ selectedVehicle.accel }} m/t</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Deceleration</span>
                  <span class="spec-value">{{ selectedVehicle.decel }} m/t</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Turn Speed</span>
                  <span class="spec-value">{{ selectedVehicle.turn_speed }} m/t</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Passengers</span>
                  <span class="spec-value">Passengers: {{ selectedVehicle.passengers }}</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Cargo</span>
                  <span class="spec-value">{{ selectedVehicle.cargo_kg }} kg ({{ selectedVehicle.cargo_m3 || 1.0 }} m³)</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Battery / Power</span>
                  <span class="spec-value">{{ selectedVehicle.battery_type }}</span>
                </div>
              </div>

              <div v-if="selectedVehicle.description" class="spec-desc">
                {{ selectedVehicle.description }}
              </div>
            </div>
          </div>

          <!-- TAB 2: CUSTOM VEHICLES -->
          <div v-if="activeTab === 'custom'" class="tab-content">
            <!-- Existing Custom Vehicles List -->
            <div class="custom-vehicles-section">
              <h4>Saved Custom Templates</h4>
              <div v-if="customVehicles.length === 0" class="empty-custom">
                No custom vehicle templates yet. Create one below.
              </div>
              <div v-else class="custom-vehicles-list">
                <div
                  v-for="cv in customVehicles"
                  :key="cv.id"
                  class="custom-vehicle-row"
                  :class="{ selected: selectedVehicleId === cv.id }"
                >
                  <div class="custom-veh-meta">
                    <strong>{{ cv.name }}</strong>
                    <span class="badge">{{ cv.type }}</span>
                    <span class="stats-summary">
                      Speed: {{ cv.top_speed_m_turn }} m/t | Pass: {{ cv.passengers }} | Size: {{ cv.token_size }}x{{ cv.token_size }}
                    </span>
                  </div>
                  <div class="custom-veh-actions">
                    <button
                      type="button"
                      class="btn-select-custom"
                      @click="selectCustomVehicle(cv.id)"
                    >
                      {{ selectedVehicleId === cv.id ? '✓ Selected' : 'Select' }}
                    </button>
                    <button
                      type="button"
                      class="delete-custom-btn"
                      title="Delete Template"
                      @click="deleteCustomVehicle(cv.id)"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Create Custom Vehicle Template Form -->
            <div class="create-custom-section">
              <h4>Create New Vehicle Template</h4>
              <form class="create-custom-form" @submit.prevent="createCustomVehicle">
                <div class="form-row">
                  <div class="form-group flex-2">
                    <label>Vehicle Name *</label>
                    <input
                      v-model="customForm.name"
                      type="text"
                      class="custom-name-input"
                      placeholder="e.g. Armored Frontier Scout"
                      required
                    />
                  </div>
                  <div class="form-group flex-1">
                    <label>Type</label>
                    <select v-model="customForm.type" class="custom-select">
                      <option value="Ground">Ground</option>
                      <option value="Hover">Hover</option>
                      <option value="Water">Water</option>
                      <option value="Flying">Flying</option>
                    </select>
                  </div>
                  <div class="form-group flex-1">
                    <label>Cost (Cr)</label>
                    <input v-model.number="customForm.cost" type="number" min="0" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Top Speed (kph)</label>
                    <input v-model.number="customForm.top_speed_kph" type="number" min="1" />
                  </div>
                  <div class="form-group">
                    <label>Top Speed (m/t)</label>
                    <input v-model.number="customForm.top_speed_m_turn" type="number" min="1" />
                  </div>
                  <div class="form-group">
                    <label>Cruise Speed (kph)</label>
                    <input v-model.number="customForm.cruise_speed_kph" type="number" min="1" />
                  </div>
                  <div class="form-group">
                    <label>Accel (m/t)</label>
                    <input v-model.number="customForm.accel" type="number" min="1" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Decel (m/t)</label>
                    <input v-model.number="customForm.decel" type="number" min="1" />
                  </div>
                  <div class="form-group">
                    <label>Turn Speed (m/t)</label>
                    <input v-model.number="customForm.turn_speed" type="number" min="1" />
                  </div>
                  <div class="form-group">
                    <label>Passengers</label>
                    <input v-model.number="customForm.passengers" type="number" min="1" />
                  </div>
                  <div class="form-group">
                    <label>Token Size</label>
                    <select v-model.number="customForm.token_size" class="custom-select">
                      <option :value="1">1x1 (Cycle / Small)</option>
                      <option :value="2">2x2 (Car / Skimmer)</option>
                      <option :value="3">3x3 (Heavy Transport)</option>
                      <option :value="4">4x4 (Massive)</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Cargo (kg)</label>
                    <input v-model.number="customForm.cargo_kg" type="number" min="0" />
                  </div>
                  <div class="form-group flex-1">
                    <label>Cargo (m³)</label>
                    <input v-model.number="customForm.cargo_m3" type="number" step="0.1" min="0" />
                  </div>
                  <div class="form-group flex-2">
                    <label>Battery / Power Source</label>
                    <input v-model="customForm.battery_type" type="text" placeholder="e.g. Type 2 (100 SEU)" />
                  </div>
                  <div class="form-group flex-1">
                    <label>Max SEU</label>
                    <input v-model.number="customForm.max_seu" type="number" min="0" />
                  </div>
                </div>

                <div class="form-group">
                  <label>Avatar / Image URL</label>
                  <input v-model="customForm.avatar_url" type="text" placeholder="e.g. /uploads/buggy.png" />
                </div>

                <div class="form-group">
                  <label>Description</label>
                  <textarea
                    v-model="customForm.description"
                    rows="2"
                    placeholder="Vehicle description and capabilities..."
                  ></textarea>
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn-create-custom" :disabled="creatingCustom">
                    {{ creatingCustom ? 'Saving...' : '+ Save Custom Vehicle' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- COMMON DEPLOYMENT SECTION (Form Deploy) -->
          <form class="deploy-form" @submit.prevent="submitDeploy">
            <div class="deploy-box">
              <div class="deploy-box-title">
                <span>📍 Deployment Configuration</span>
                <span v-if="selectedVehicle" class="active-veh-tag">
                  Deploying: <strong>{{ deployName || selectedVehicle.name }}</strong> (Size {{ deploySize || selectedVehicle.token_size }})
                </span>
              </div>

              <div class="form-row">
                <div class="form-group flex-2">
                  <label>Token Name Override</label>
                  <input
                    v-model="deployName"
                    type="text"
                    class="name-input"
                    :placeholder="selectedVehicle ? selectedVehicle.name : 'Vehicle Name'"
                  />
                </div>
                <div class="form-group flex-1">
                  <label>Token Size</label>
                  <select v-model.number="deploySize" class="size-select">
                    <option :value="1">1x1</option>
                    <option :value="2">2x2</option>
                    <option :value="3">3x3</option>
                    <option :value="4">4x4</option>
                  </select>
                </div>
                <div class="form-group color-group">
                  <label>Ring Color</label>
                  <input v-model="deployColor" type="color" class="color-input" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Driver / Crew Notes</label>
                  <input
                    v-model="deployDriver"
                    type="text"
                    class="driver-input"
                    placeholder="e.g. Driver: Ace (Dex 65)"
                  />
                </div>
                <div class="form-group flex-1">
                  <label>Cargo Notes</label>
                  <input
                    v-model="deployCargo"
                    type="text"
                    class="cargo-input"
                    placeholder="e.g. Survival kit, 100 SEU clips"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Start X (Grid)</label>
                  <input v-model.number="deployX" type="number" class="x-input" min="0" />
                </div>
                <div class="form-group">
                  <label>Start Y (Grid)</label>
                  <input v-model.number="deployY" type="number" class="y-input" min="0" />
                </div>
              </div>
            </div>

            <!-- Modal Action Buttons -->
            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="close">
                Cancel
              </button>
              <button
                type="submit"
                class="btn-deploy"
                :disabled="!selectedVehicle"
              >
                🚀 Deploy Vehicle to Map
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DeployVehicleModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    isGm: {
      type: Boolean,
      default: true,
    },
    defaultX: {
      type: Number,
      default: 0,
    },
    defaultY: {
      type: Number,
      default: 0,
    },
  },
  emits: ['update:modelValue', 'deploy'],
  data() {
    return {
      activeTab: 'standard',
      vehicles: [],
      loadingVehicles: false,
      creatingCustom: false,
      errorMessage: null,
      selectedVehicleId: null,

      // Deployment options
      deployName: '',
      deploySize: 2,
      deployColor: '#00e5ff',
      deployDriver: '',
      deployCargo: '',
      deployX: this.defaultX,
      deployY: this.defaultY,

      // Custom creation form
      customForm: {
        name: '',
        type: 'Ground',
        cost: 5000,
        top_speed_kph: 100,
        top_speed_m_turn: 175,
        cruise_speed_kph: 60,
        accel: 60,
        decel: 40,
        turn_speed: 80,
        passengers: 4,
        cargo_kg: 150,
        cargo_m3: 1.0,
        battery_type: 'Type 2 (100 SEU)',
        max_seu: 100,
        token_size: 2,
        avatar_url: '',
        description: '',
      },
    };
  },
  computed: {
    standardVehicles() {
      return this.vehicles.filter((v) => v.is_canonical !== false);
    },
    customVehicles() {
      return this.vehicles.filter((v) => v.is_canonical === false);
    },
    selectedVehicle() {
      if (!this.selectedVehicleId) return null;
      return this.vehicles.find((v) => v.id === this.selectedVehicleId) || null;
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(val) {
        if (val) {
          this.errorMessage = null;
          this.deployX = this.defaultX;
          this.deployY = this.defaultY;
          this.fetchVehicles();
        }
      },
    },
    defaultX(val) {
      this.deployX = val;
    },
    defaultY(val) {
      this.deployY = val;
    },
    selectedVehicle(newVeh) {
      if (newVeh) {
        if (!this.deployName || this.vehicles.some((v) => v.name === this.deployName)) {
          this.deployName = newVeh.name;
        }
        if (newVeh.token_size) {
          this.deploySize = newVeh.token_size;
        }
      }
    },
  },
  methods: {
    close() {
      this.$emit('update:modelValue', false);
    },
    async fetchVehicles() {
      this.loadingVehicles = true;
      this.errorMessage = null;
      try {
        const res = await fetch('/api/vehicles', {
          credentials: 'include',
        });
        if (!res.ok) {
          throw new Error('Failed to load vehicle catalog');
        }
        const data = await res.json();
        this.vehicles = Array.isArray(data) ? data : [];
        if (!this.selectedVehicleId && this.vehicles.length > 0) {
          this.selectedVehicleId = this.vehicles[0].id;
          this.deployName = this.vehicles[0].name;
          this.deploySize = this.vehicles[0].token_size || 2;
        }
      } catch (err) {
        console.error('Error loading vehicles:', err);
        this.errorMessage = err.message || 'Error loading vehicles';
      } finally {
        this.loadingVehicles = false;
      }
    },
    onVehicleSelected() {
      if (this.selectedVehicle) {
        this.deployName = this.selectedVehicle.name;
        this.deploySize = this.selectedVehicle.token_size || 2;
      }
    },
    selectCustomVehicle(id) {
      this.selectedVehicleId = id;
      this.onVehicleSelected();
    },
    async createCustomVehicle() {
      if (!this.customForm.name || !this.customForm.name.trim()) {
        this.errorMessage = 'Vehicle name is required.';
        return;
      }
      this.creatingCustom = true;
      this.errorMessage = null;
      try {
        const res = await fetch('/api/vehicles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(this.customForm),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to create custom vehicle');
        }
        const created = await res.json();
        this.vehicles.push(created);
        this.selectedVehicleId = created.id;
        this.deployName = created.name;
        this.deploySize = created.token_size || 2;

        // Reset form name
        this.customForm.name = '';
        this.customForm.description = '';
      } catch (err) {
        console.error('Error creating custom vehicle:', err);
        this.errorMessage = err.message || 'Failed to create custom vehicle';
      } finally {
        this.creatingCustom = false;
      }
    },
    async deleteCustomVehicle(id) {
      this.errorMessage = null;
      try {
        const res = await fetch(`/api/vehicles/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to delete vehicle template');
        }
        this.vehicles = this.vehicles.filter((v) => v.id !== id);
        if (this.selectedVehicleId === id) {
          this.selectedVehicleId = this.vehicles.length > 0 ? this.vehicles[0].id : null;
          if (this.selectedVehicle) {
            this.deployName = this.selectedVehicle.name;
            this.deploySize = this.selectedVehicle.token_size || 2;
          }
        }
      } catch (err) {
        console.error('Error deleting custom vehicle:', err);
        this.errorMessage = err.message || 'Failed to delete custom vehicle';
      }
    },
    submitDeploy() {
      if (!this.selectedVehicle) {
        this.errorMessage = 'Please select a vehicle to deploy.';
        return;
      }

      const vehicleData = {
        template_id: this.selectedVehicle.id,
        name: this.deployName || this.selectedVehicle.name,
        type: this.selectedVehicle.type,
        current_speed: 0,
        top_speed: Number(this.selectedVehicle.top_speed_m_turn || this.selectedVehicle.top_speed || 175),
        accel: Number(this.selectedVehicle.accel ?? 60),
        decel: Number(this.selectedVehicle.decel ?? 40),
        turn_speed: Number(this.selectedVehicle.turn_speed ?? 80),
        current_seu: Number(this.selectedVehicle.max_seu ?? 100),
        max_seu: Number(this.selectedVehicle.max_seu ?? 100),
        damage_conditions: [],
        passengers: this.deployDriver || '',
        cargo_notes: this.deployCargo || '',
        token_size: Number(this.deploySize || this.selectedVehicle.token_size || 2),
        avatar_url: this.selectedVehicle.avatar_url || '',
        description: this.selectedVehicle.description || '',
      };

      const payload = {
        name: this.deployName || this.selectedVehicle.name,
        color: this.deployColor || '#00e5ff',
        size: Number(this.deploySize || this.selectedVehicle.token_size || 2),
        x: Number(this.deployX ?? 0),
        y: Number(this.deployY ?? 0),
        avatar_url: this.selectedVehicle.avatar_url || '',
        vehicle_data: vehicleData,
      };

      this.$emit('deploy', payload);
      this.close();
    },
  },
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 16px;
}

.deploy-vehicle-modal {
  width: 620px;
  max-width: 95vw;
  max-height: 90vh;
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #f8fafc;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 1.25rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #00e5ff;
  font-weight: 600;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
}
.close-btn:hover {
  color: #ffffff;
}

.modal-tabs {
  display: flex;
  background-color: #0b1120;
  border-bottom: 1px solid #334155;
}

.tab-btn {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #e2e8f0;
}

.tab-btn.active {
  color: #00e5ff;
  border-bottom-color: #00e5ff;
  background-color: rgba(0, 229, 255, 0.05);
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.loading-state {
  text-align: center;
  padding: 24px;
  color: #94a3b8;
  font-style: italic;
}

.error-banner {
  background-color: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  color: #fca5a5;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.flex-2 {
  flex: 2;
}

input,
select,
textarea {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 8px 10px;
  color: #f8fafc;
  font-size: 0.9rem;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #00e5ff;
}

.spec-card {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px 14px;
  margin-top: 8px;
}

.spec-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #334155;
  padding-bottom: 8px;
  margin-bottom: 10px;
}

.spec-title-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.spec-title-area h4 {
  margin: 0;
  font-size: 1.1rem;
  color: #38bdf8;
}

.type-badge {
  background-color: #0284c7;
  color: #ffffff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.spec-cost {
  color: #facc15;
  font-weight: 600;
  font-size: 0.95rem;
}

.specs-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  font-size: 0.85rem;
}

.spec-item {
  display: flex;
  flex-direction: column;
}

.spec-label {
  color: #94a3b8;
  font-size: 0.75rem;
}

.spec-value {
  color: #e2e8f0;
  font-weight: 500;
}

.spec-desc {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #334155;
  font-size: 0.82rem;
  color: #94a3b8;
  font-style: italic;
}

/* Custom Tab Styles */
.custom-vehicles-section {
  border-bottom: 1px solid #334155;
  padding-bottom: 14px;
  margin-bottom: 14px;
}

.custom-vehicles-section h4,
.create-custom-section h4 {
  margin: 0 0 10px 0;
  font-size: 0.95rem;
  color: #00e5ff;
}

.empty-custom {
  font-size: 0.85rem;
  color: #94a3b8;
  font-style: italic;
  padding: 6px 0;
}

.custom-vehicles-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 140px;
  overflow-y: auto;
}

.custom-vehicle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 6px 10px;
}

.custom-vehicle-row.selected {
  border-color: #00e5ff;
  background-color: rgba(0, 229, 255, 0.08);
}

.custom-veh-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.custom-veh-meta .badge {
  background-color: #334155;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.stats-summary {
  color: #94a3b8;
  font-size: 0.75rem;
}

.custom-veh-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-select-custom {
  background-color: #0284c7;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-select-custom:hover {
  background-color: #0369a1;
}

.delete-custom-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 0.9rem;
}

.delete-custom-btn:hover {
  filter: brightness(1.2);
}

.create-custom-section {
  background-color: #0b1120;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 12px;
}

.btn-create-custom {
  background-color: #059669;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 8px 14px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-create-custom:hover:not(:disabled) {
  background-color: #047857;
}

.btn-create-custom:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Deploy Form Section */
.deploy-form {
  border-top: 1px solid #334155;
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.deploy-box {
  background-color: rgba(30, 41, 59, 0.6);
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
}

.deploy-box-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #cbd5e1;
}

.active-veh-tag {
  color: #00e5ff;
  font-size: 0.8rem;
}

.color-group {
  width: 90px;
}

.color-input {
  height: 38px;
  padding: 2px 4px;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
}

.btn-cancel {
  background-color: #334155;
  color: #cbd5e1;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-cancel:hover {
  background-color: #475569;
  color: #ffffff;
}

.btn-deploy {
  background-color: #00e5ff;
  color: #090d16;
  border: none;
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.4);
  transition: all 0.2s;
}

.btn-deploy:hover:not(:disabled) {
  background-color: #38bdf8;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.6);
}

.btn-deploy:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
</style>

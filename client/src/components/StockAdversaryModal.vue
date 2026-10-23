<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div class="modal-card stock-adversary-modal">
      <div class="modal-header">
        <div class="header-title-row">
          <span class="header-icon">⚔️</span>
          <h3>Stock Adversary Encounter</h3>
        </div>
        <button type="button" class="close-btn" @click="close" title="Close">✕</button>
      </div>

      <!-- Mode Toggle Tabs -->
      <div class="modal-tabs">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: mode === 'existing' }"
          @click="mode = 'existing'"
        >
          Existing Templates ({{ templates.length }})
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: mode === 'custom' }"
          @click="mode = 'custom'"
        >
          Create Custom Adversary
        </button>
      </div>

      <div class="modal-body">
        <!-- TAB 1: EXISTING TEMPLATES -->
        <div v-if="mode === 'existing'" class="tab-content">
          <div v-if="loadingTemplates" class="loading-state">
            <span>Loading adversary templates...</span>
          </div>
          <div v-else-if="templates.length === 0" class="empty-state">
            <p>No adversary templates saved yet.</p>
            <button type="button" class="btn-create-first" @click="mode = 'custom'">
              + Create First Adversary
            </button>
          </div>
          <div v-else class="existing-picker-layout">
            <div class="form-group">
              <div class="template-select-header">
                <label>Select Blueprint / Template</label>
                <button
                  v-if="currentSelectedTemplate"
                  type="button"
                  class="btn-delete-template"
                  title="Delete selected template"
                  :disabled="isUpdatingToken || isGeneratingArt || isSpawning"
                  @click="deleteSelectedTemplate"
                >
                  🗑️ Delete Template
                </button>
              </div>
              <select v-model="selectedTemplateId" class="template-select">
                <option v-for="tpl in templates" :key="tpl.template_id" :value="tpl.template_id">
                  Tier {{ tpl.threat_tier }} • {{ tpl.name }} ({{ tpl.category === 'creature' ? 'Creature' : 'NPC' }})
                </option>
              </select>
            </div>

            <!-- Selected Template Preview Card -->
            <div v-if="currentSelectedTemplate" class="template-preview-card">
              <div class="preview-header">
                <div class="preview-avatar-circle" :style="{ borderColor: getTierColor(currentSelectedTemplate.threat_tier) }">
                  <img
                    v-if="currentSelectedTemplate.token_image_path && !existingTokenImageError"
                    :src="currentSelectedTemplate.token_image_path"
                    alt="Token"
                    @error="existingTokenImageError = true"
                  />
                  <span v-else class="preview-placeholder">
                    {{ currentSelectedTemplate.category === 'creature' ? '🐾' : '👤' }}
                  </span>
                </div>
                <div class="preview-meta">
                  <h4>{{ currentSelectedTemplate.name }}</h4>
                  <div class="preview-badges-row">
                    <span
                      class="tier-badge"
                      :style="{ backgroundColor: getTierColor(currentSelectedTemplate.threat_tier) }"
                    >
                      Tier {{ currentSelectedTemplate.threat_tier }} {{ currentSelectedTemplate.category.toUpperCase() }}
                    </span>
                    <span v-if="existingTokenImageError" class="missing-token-badge" title="The token image file could not be found. Upload or browse a new image below.">
                      ⚠️ Missing Token Image
                    </span>
                  </div>
                </div>
              </div>

              <!-- Change / Upload Token Artwork Controls for Existing Template -->
              <div class="existing-token-controls">
                <span class="token-controls-label">Token Art:</span>
                <div class="art-buttons-row">
                  <label class="btn-upload-file" :class="{ disabled: isUpdatingToken }">
                    {{ isUpdatingToken ? '⏳ Updating...' : '⬆️ Upload Token' }}
                    <input
                      type="file"
                      accept="image/*"
                      :disabled="isUpdatingToken"
                      @change="handleExistingTokenFileUpload"
                      style="display: none;"
                    />
                  </label>
                  <button
                    type="button"
                    class="btn-browse-art"
                    :disabled="isUpdatingToken"
                    @click="$emit('browse-image')"
                  >
                    📁 Browse Uploads
                  </button>
                  <button
                    type="button"
                    class="btn-generate-ai-art"
                    :disabled="isGeneratingArt || isUpdatingToken || cooldownSeconds > 0"
                    @click="generateExistingTemplateAiArt"
                  >
                    <span v-if="isGeneratingArt">⏳ Generating...</span>
                    <span v-else-if="cooldownSeconds > 0">⏳ Cooldown ({{ cooldownSeconds }}s)</span>
                    <span v-else>✨ AI Token Art</span>
                  </button>
                </div>
              </div>

              <div class="preview-stats-grid">
                <div class="p-stat">
                  <span class="p-label">STA (HP)</span>
                  <span class="p-val">{{ currentSelectedTemplate.hp_max }}</span>
                </div>
                <div class="p-stat">
                  <span class="p-label">Initiative</span>
                  <span class="p-val">+{{ currentSelectedTemplate.initiative_mod || 0 }}</span>
                </div>
                <div class="p-stat">
                  <span class="p-label">Movement</span>
                  <span class="p-val">{{ currentSelectedTemplate.movement || '12 m/s' }}</span>
                </div>
                <div class="p-stat">
                  <span class="p-label">Defenses</span>
                  <span class="p-val">{{ currentSelectedTemplate.defense_summary || 'None' }}</span>
                </div>
              </div>

              <!-- Action List Preview -->
              <div v-if="currentSelectedTemplate.actions?.length" class="preview-actions">
                <label>Combat Actions:</label>
                <div v-for="(act, idx) in currentSelectedTemplate.actions" :key="idx" class="preview-action-row">
                  <span class="act-name">{{ act.name }}</span>
                  <span class="act-pct">{{ act.target_pct }}% to hit</span>
                  <span class="act-dmg">{{ act.damage }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: CREATE CUSTOM ADVERSARY -->
        <div v-else class="tab-content custom-adversary-layout">
          <!-- Adversary Name -->
          <div class="form-group">
            <label>Adversary Name *</label>
            <input
              type="text"
              v-model="customForm.name"
              placeholder="e.g. Sathar Shock Trooper, Sand Viper, Pirate Boarder"
              required
            />
          </div>

          <!-- Category Toggle -->
          <div class="form-group">
            <label>Adversary Type</label>
            <div class="pill-toggle-group">
              <button
                type="button"
                class="pill-btn"
                :class="{ active: customForm.category === 'npc' }"
                @click="customForm.category = 'npc'"
              >
                👤 Sentient NPC
              </button>
              <button
                type="button"
                class="pill-btn"
                :class="{ active: customForm.category === 'creature' }"
                @click="customForm.category = 'creature'"
              >
                🐾 Alien Creature / Beast
              </button>
            </div>
          </div>

          <!-- Threat Tier Selector -->
          <div class="form-group">
            <label>Threat Tier (Difficulty Scaling)</label>
            <div class="tier-chips-row">
              <button
                v-for="tier in [1, 2, 3, 4, 5]"
                :key="tier"
                type="button"
                class="tier-chip"
                :class="{ active: customForm.threat_tier === tier }"
                :style="customForm.threat_tier === tier ? { borderColor: getTierColor(tier), backgroundColor: getTierColor(tier) + '22' } : {}"
                @click="customForm.threat_tier = tier"
              >
                <span class="chip-dot" :style="{ backgroundColor: getTierColor(tier) }"></span>
                Tier {{ tier }}
              </button>
            </div>
          </div>

          <!-- NPC Specific Fields -->
          <div v-if="customForm.category === 'npc'" class="type-fields-box">
            <div class="form-row">
              <div class="form-group">
                <label>Species / Race</label>
                <select v-model="customForm.species" class="custom-select">
                  <option value="Sathar">Sathar</option>
                  <option value="Human">Human</option>
                  <option value="Vrusk">Vrusk</option>
                  <option value="Dralasite">Dralasite</option>
                  <option value="Yazirian">Yazirian</option>
                  <option value="Mechanon">Mechanon</option>
                </select>
              </div>
              <div class="form-group">
                <label>Primary Weapon</label>
                <input
                  type="text"
                  v-model="customForm.weapon"
                  placeholder="e.g. Laser Rifle, Auto Rifle, Vibroknife"
                />
              </div>
            </div>
            <div class="form-group">
              <label>Armor / Defense Screen</label>
              <input
                type="text"
                v-model="customForm.armor"
                placeholder="e.g. Skein Suit, Albedo Suit, Powered Armor"
              />
            </div>
          </div>

          <!-- Creature Specific Fields -->
          <div v-else class="type-fields-box">
            <div class="form-row">
              <div class="form-group">
                <label>Natural Attacks</label>
                <input
                  type="text"
                  v-model="customForm.attacks"
                  placeholder="e.g. Claw, Bite, Acid Spit"
                />
              </div>
              <div class="form-group">
                <label>Size</label>
                <select v-model="customForm.size" class="custom-select">
                  <option value="Small">Small (1x1)</option>
                  <option value="Medium">Medium (1x1)</option>
                  <option value="Large">Large (2x2)</option>
                  <option value="Very Large">Very Large (3x3)</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Special Predatory Traits</label>
              <input
                type="text"
                v-model="customForm.traits"
                placeholder="e.g. Ambush Predator, Poisonous, Chitin Armor"
              />
            </div>
          </div>

          <!-- Adversary Description & Gear Details -->
          <div class="form-group">
            <label>Visual Description & Armament Details</label>
            <textarea
              v-model="customForm.description"
              rows="2"
              class="custom-textarea"
              placeholder="Describe appearance, combat gear, weapons, posture, etc. (e.g. four-armed Yazirian with twin thermal daggers and battle goggles)..."
            ></textarea>
          </div>

          <!-- Token Image / Avatar Selection -->
          <div class="form-group token-art-section">
            <label>Token Artwork / Source Portrait</label>
            <div class="art-picker-box">
              <div
                class="token-ring-preview"
                :style="{ borderColor: getTierColor(customForm.threat_tier) }"
              >
                <img
                  v-if="customForm.source_image_url"
                  :src="customForm.source_image_url"
                  alt="Token Art"
                />
                <span v-else class="procedural-preview-text">
                  {{ customForm.category === 'creature' ? '🐾' : '👤' }}
                </span>
              </div>
              <div class="art-picker-controls">
                <div class="art-buttons-row">
                  <button
                    type="button"
                    class="btn-generate-ai-art"
                    :disabled="isGeneratingArt || cooldownSeconds > 0"
                    @click="generateAiTokenArt"
                  >
                    <span v-if="isGeneratingArt">⏳ Generating...</span>
                    <span v-else-if="cooldownSeconds > 0">⏳ Cooldown ({{ cooldownSeconds }}s)</span>
                    <span v-else>✨ Generate AI Token Art</span>
                  </button>
                  <button type="button" class="btn-browse-art" @click="$emit('browse-image')">
                    📁 Browse Uploads Library
                  </button>
                  <label class="btn-upload-file">
                    ⬆️ Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      @change="handleFileUpload"
                      style="display: none;"
                    />
                  </label>
                  <button
                    v-if="customForm.source_image_url"
                    type="button"
                    class="btn-clear-art"
                    @click="customForm.source_image_url = ''"
                  >
                    Clear
                  </button>
                </div>
                <input
                  type="text"
                  v-model="customForm.source_image_url"
                  placeholder="Or paste image URL (/uploads/... or https://...)"
                  class="art-url-input"
                />
                <span class="art-hint">
                  Source images will be circular-masked with a Tier {{ customForm.threat_tier }} border ring.
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- SHARED: SPAWN QUANTITY & MAP TARGET -->
        <div class="spawn-config-footer">
          <div class="form-row spawn-row">
            <div class="form-group count-group">
              <label>Spawn Quantity (#1 to #N)</label>
              <div class="count-stepper">
                <button type="button" @click="customCount = Math.max(1, customCount - 1)">-</button>
                <input type="number" v-model.number="customCount" min="1" max="10" />
                <button type="button" @click="customCount = Math.min(10, customCount + 1)">+</button>
              </div>
            </div>
            <div class="form-group map-target-group">
              <label>Target Battle Map</label>
              <span class="active-map-badge">
                🗺️ {{ activeMap ? activeMap.name : 'No Active Map Selected' }}
              </span>
            </div>
          </div>

          <div v-if="errorMessage" class="error-banner">
            ⚠️ {{ errorMessage }}
          </div>
        </div>
      </div>

      <!-- Modal Actions -->
      <div class="modal-actions">
        <button type="button" class="btn-cancel" @click="close">Cancel</button>
        <button
          type="button"
          class="btn-spawn-submit"
          :disabled="isSpawning || !activeMap"
          @click="submitSpawn"
        >
          <span v-if="isSpawning">Spawning...</span>
          <span v-else>⚔️ Spawn {{ customCount }} {{ customCount === 1 ? 'Adversary' : 'Adversaries' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { socket } from '../services/socket.js';

export default {
  name: 'StockAdversaryModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    activeMap: {
      type: Object,
      default: null,
    },
    isGm: {
      type: Boolean,
      default: true,
    },
    selectedImageUrl: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'spawned', 'browse-image'],
  data() {
    return {
      mode: 'existing',
      templates: [],
      loadingTemplates: false,
      selectedTemplateId: null,
      customCount: 1,
      isSpawning: false,
      isGeneratingArt: false,
      isUpdatingToken: false,
      existingTokenImageError: false,
      cooldownSeconds: 0,
      artCooldownTimer: null,
      errorMessage: null,
      customForm: {
        name: 'Sathar Shock Trooper',
        description: '',
        category: 'npc',
        threat_tier: 2,
        species: 'Sathar',
        weapon: 'Laser Rifle',
        armor: 'Skein Suit',
        attacks: 'Claw, Bite',
        traits: 'Ambush Predator',
        diet: 'Carnivore',
        size: 'Medium',
        source_image_url: '',
      },
    };
  },
  computed: {
    currentSelectedTemplate() {
      if (!this.selectedTemplateId) return null;
      return this.templates.find((t) => t.template_id === this.selectedTemplateId) || null;
    },
  },
  watch: {
    modelValue(val) {
      if (val) {
        this.errorMessage = null;
        this.fetchTemplates();
      }
    },
    selectedTemplateId() {
      this.existingTokenImageError = false;
    },
    selectedImageUrl(newVal) {
      if (!newVal) return;
      if (this.mode === 'existing' && this.selectedTemplateId) {
        this.updateExistingTemplateToken(newVal);
      } else {
        this.customForm.source_image_url = newVal;
      }
    },
  },
  methods: {
    close() {
      this.$emit('update:modelValue', false);
    },
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
    buildSpawnPayload(params) {
      const { mode, selectedTemplateId, customForm, count, mapId } = params;
      if (mode === 'existing') {
        return {
          mapId,
          templateId: selectedTemplateId,
          count,
        };
      }
      return {
        mapId,
        template: {
          name: customForm.name,
          description: customForm.description || '',
          category: customForm.category,
          threat_tier: customForm.threat_tier,
          species: customForm.species,
          weapon: customForm.weapon,
          armor: customForm.armor,
          attacks: customForm.attacks,
          traits: customForm.traits,
          diet: customForm.diet,
          size: customForm.size,
        },
        source_image_url: customForm.source_image_url || null,
        count,
      };
    },
    async fetchTemplates() {
      this.loadingTemplates = true;
      try {
        const res = await fetch('/api/adversaries', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          this.templates = data;
          if (data.length > 0 && !this.selectedTemplateId) {
            this.selectedTemplateId = data[0].template_id;
          }
        }
      } catch (err) {
        console.error('Failed to load adversary templates:', err);
      } finally {
        this.loadingTemplates = false;
      }
    },
    async handleFileUpload(event) {
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
          this.customForm.source_image_url = data.url;
        }
      } catch (err) {
        console.error('Failed to upload adversary image:', err);
      }
    },
    startArtCooldown(seconds) {
      if (this.artCooldownTimer) clearInterval(this.artCooldownTimer);
      this.cooldownSeconds = Math.max(1, Math.round(seconds));
      this.artCooldownTimer = setInterval(() => {
        this.cooldownSeconds--;
        if (this.cooldownSeconds <= 0) {
          clearInterval(this.artCooldownTimer);
          this.artCooldownTimer = null;
          this.cooldownSeconds = 0;
        }
      }, 1000);
    },
    async generateAiTokenArt() {
      if (this.cooldownSeconds > 0) return;
      this.isGeneratingArt = true;
      this.errorMessage = null;
      try {
        const payload = {
          prompt: this.customForm.description || '',
          name: this.customForm.name,
          species: this.customForm.species,
          category: this.customForm.category,
          threat_tier: this.customForm.threat_tier,
          weapon: this.customForm.weapon,
          armor: this.customForm.armor,
          attacks: this.customForm.attacks,
        };

        const res = await fetch('/api/adversaries/generate-token-art', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if ((res.status === 429 || errData.retryAfter) && typeof this.startArtCooldown === 'function') {
            this.startArtCooldown(errData.retryAfter || 45);
          }
          throw new Error(errData.message || errData.error || 'Failed to generate token art');
        }

        const data = await res.json();
        if (data.token_image_url) {
          this.customForm.source_image_url = data.token_image_url;
        }
        // Start a 45s pacing cooldown after successful generation
        if (typeof this.startArtCooldown === 'function') {
          this.startArtCooldown(45);
        }
      } catch (err) {
        console.error('Failed to generate token art:', err);
        this.errorMessage = err.message;
      } finally {
        this.isGeneratingArt = false;
      }
    },
    async submitSpawn() {
      if (!this.activeMap) {
        this.errorMessage = 'No active tactical map found to stock adversaries onto.';
        return;
      }

      this.isSpawning = true;
      this.errorMessage = null;

      try {
        const payload = this.buildSpawnPayload({
          mode: this.mode,
          selectedTemplateId: this.selectedTemplateId,
          customForm: this.customForm,
          count: this.customCount,
          mapId: this.activeMap.id,
        });

        const res = await fetch('/api/adversaries/spawn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Server failed to spawn adversaries');
        }

        const result = await res.json();
        this.$emit('spawned', result);
        this.close();
      } catch (err) {
        console.error('Error spawning adversaries:', err);
        this.errorMessage = err.message || 'Failed to spawn adversaries.';
      } finally {
        this.isSpawning = false;
      }
    },
    async deleteSelectedTemplate() {
      const tpl = this.currentSelectedTemplate;
      if (!tpl) return;
      if (typeof confirm === 'function' && !confirm(`Delete adversary template "${tpl.name}"?`)) {
        return;
      }
      this.errorMessage = null;
      try {
        const res = await fetch(`/api/adversaries/${encodeURIComponent(tpl.template_id)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to delete adversary template');
        }
        this.templates = this.templates.filter((t) => t.template_id !== tpl.template_id);
        this.selectedTemplateId = this.templates.length > 0 ? this.templates[0].template_id : null;
        this.existingTokenImageError = false;
      } catch (err) {
        console.error('Failed to delete template:', err);
        this.errorMessage = err.message || 'Failed to delete adversary template.';
      }
    },
    async updateExistingTemplateToken(sourceImageUrl) {
      if (!this.selectedTemplateId) return;
      this.isUpdatingToken = true;
      this.errorMessage = null;
      try {
        const res = await fetch(`/api/adversaries/${encodeURIComponent(this.selectedTemplateId)}/token`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ source_image_url: sourceImageUrl }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Failed to update template token');
        }
        const data = await res.json();
        if (data.template) {
          const idx = this.templates.findIndex((t) => t.template_id === data.template.template_id);
          if (idx !== -1) {
            this.templates.splice(idx, 1, data.template);
          }
          this.existingTokenImageError = false;
        }
      } catch (err) {
        console.error('Failed to update template token:', err);
        this.errorMessage = err.message || 'Failed to update template token.';
      } finally {
        this.isUpdatingToken = false;
      }
    },
    async handleExistingTokenFileUpload(event) {
      const file = event.target?.files?.[0];
      if (!file) return;
      this.errorMessage = null;
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to upload token image');
        }
        const data = await res.json();
        if (data.url) {
          await this.updateExistingTemplateToken(data.url);
        }
      } catch (err) {
        console.error('Failed to upload token image:', err);
        this.errorMessage = err.message || 'Failed to upload token image.';
      } finally {
        if (event.target) event.target.value = '';
      }
    },
    async generateExistingTemplateAiArt() {
      const tpl = this.currentSelectedTemplate;
      if (!tpl || this.cooldownSeconds > 0) return;
      this.isGeneratingArt = true;
      this.errorMessage = null;
      try {
        const actionNames = Array.isArray(tpl.actions) ? tpl.actions.map((a) => a.name).join(', ') : '';
        const payload = {
          prompt: tpl.system_data?.description || '',
          name: tpl.name,
          species: tpl.system_data?.race || tpl.system_data?.species || tpl.name,
          category: tpl.category,
          threat_tier: tpl.threat_tier,
          weapon: actionNames,
          armor: tpl.defense_summary || '',
          attacks: actionNames,
        };
        const res = await fetch('/api/adversaries/generate-token-art', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if ((res.status === 429 || errData.retryAfter) && typeof this.startArtCooldown === 'function') {
            this.startArtCooldown(errData.retryAfter || 45);
          }
          throw new Error(errData.message || errData.error || 'Failed to generate token art');
        }
        const data = await res.json();
        if (data.token_image_url) {
          await this.updateExistingTemplateToken(data.token_image_url);
        }
        if (typeof this.startArtCooldown === 'function') {
          this.startArtCooldown(45);
        }
      } catch (err) {
        console.error('Failed to generate AI token art for template:', err);
        this.errorMessage = err.message;
      } finally {
        this.isGeneratingArt = false;
      }
    },
    handleAdversarySaved({ template } = {}) {
      if (!template) return;
      const id = template.template_id || template.id;
      const idx = this.templates.findIndex((t) => (t.template_id || t.id) === id);
      if (idx !== -1) {
        this.templates.splice(idx, 1, template);
      } else {
        this.templates.push(template);
      }
      if (!this.selectedTemplateId && this.templates.length > 0) {
        this.selectedTemplateId = this.templates[0].template_id || this.templates[0].id;
      }
    },
    handleAdversaryDeleted({ id } = {}) {
      if (!id) return;
      this.templates = this.templates.filter((t) => (t.template_id || t.id) !== id);
      if (this.selectedTemplateId === id) {
        this.selectedTemplateId = this.templates.length > 0 ? (this.templates[0].template_id || this.templates[0].id) : null;
      }
    },
  },
  mounted() {
    socket.on('adversary:saved', this.handleAdversarySaved);
    socket.on('adversary:deleted', this.handleAdversaryDeleted);
  },
  beforeUnmount() {
    socket.off('adversary:saved', this.handleAdversarySaved);
    socket.off('adversary:deleted', this.handleAdversaryDeleted);
    if (this.artCooldownTimer) {
      clearInterval(this.artCooldownTimer);
      this.artCooldownTimer = null;
    }
  },
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 16px;
}

.stock-adversary-modal {
  width: 580px;
  max-width: 95vw;
  max-height: 90vh;
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);
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
  font-size: 1.15rem;
  color: #38bdf8;
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
  background-color: #111827;
  border-bottom: 1px solid #334155;
}

.tab-btn {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #94a3b8;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #f1f5f9;
}

.tab-btn.active {
  color: #38bdf8;
  border-bottom-color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.08);
}

.modal-body {
  padding: 16px 18px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-group input[type="text"],
.form-group textarea,
.form-group select {
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #f8fafc;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
}

.form-row {
  display: flex;
  gap: 12px;
}
.form-row .form-group {
  flex: 1;
}

.pill-toggle-group {
  display: flex;
  gap: 8px;
}

.pill-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #334155;
  background-color: #1e293b;
  color: #94a3b8;
  font-size: 0.85rem;
  cursor: pointer;
  font-weight: 500;
}
.pill-btn.active {
  background-color: #0284c7;
  color: #ffffff;
  border-color: #38bdf8;
}

.tier-chips-row {
  display: flex;
  gap: 6px;
}

.tier-chip {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #334155;
  border-radius: 6px;
  background-color: #1e293b;
  color: #cbd5e1;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-weight: 500;
}
.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.token-art-section .art-picker-box {
  display: flex;
  gap: 12px;
  align-items: center;
  background-color: #1e293b;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #334155;
}

.token-ring-preview {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid #38bdf8;
  overflow: hidden;
  background-color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.token-ring-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.procedural-preview-text {
  font-size: 1.5rem;
}

.art-picker-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.art-buttons-row {
  display: flex;
  gap: 8px;
}

.btn-generate-ai-art {
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #a855f7;
  background: linear-gradient(135deg, #7c3aed, #9333ea);
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;
}
.btn-generate-ai-art:hover:not(:disabled) {
  background: linear-gradient(135deg, #6d28d9, #7e22ce);
  box-shadow: 0 0 8px rgba(168, 85, 247, 0.4);
}
.btn-generate-ai-art:disabled {
  opacity: 0.6;
  cursor: wait;
}

.btn-browse-art,
.btn-upload-file,
.btn-clear-art {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.78rem;
  cursor: pointer;
  border: 1px solid #475569;
  background-color: #334155;
  color: #f8fafc;
}
.btn-browse-art:hover,
.btn-upload-file:hover {
  background-color: #475569;
}
.btn-clear-art {
  background-color: #dc2626;
  border-color: #ef4444;
}

.art-url-input {
  background-color: #0f172a;
  border: 1px solid #334155;
  color: #cbd5e1;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.art-hint {
  font-size: 0.7rem;
  color: #64748b;
}

.template-select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-delete-template {
  background-color: rgba(220, 38, 38, 0.15);
  border: 1px solid #ef4444;
  color: #fca5a5;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-delete-template:hover:not(:disabled) {
  background-color: #dc2626;
  color: #ffffff;
}

.btn-delete-template:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preview-badges-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.missing-token-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(245, 158, 11, 0.2);
  border: 1px solid #f59e0b;
  color: #fcd34d;
}

.existing-token-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background-color: #0f172a;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #1e293b;
}

.token-controls-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
}

.btn-upload-file.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.template-preview-card {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid #3498db;
  overflow: hidden;
  background-color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-avatar-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-meta h4 {
  margin: 0 0 3px 0;
  font-size: 1rem;
}

.tier-badge {
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  color: #ffffff;
}

.preview-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background-color: #0f172a;
  padding: 8px;
  border-radius: 4px;
}

.p-stat {
  display: flex;
  flex-direction: column;
}
.p-label {
  font-size: 0.65rem;
  color: #94a3b8;
  text-transform: uppercase;
}
.p-val {
  font-size: 0.85rem;
  font-weight: 600;
}

.preview-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.preview-actions label {
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
}
.preview-action-row {
  display: flex;
  gap: 8px;
  background-color: #0f172a;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}
.act-name {
  font-weight: 600;
  flex: 1;
}
.act-pct {
  color: #38bdf8;
}
.act-dmg {
  color: #f87171;
}

.spawn-config-footer {
  background-color: #111827;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #1f2937;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.count-stepper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.count-stepper button {
  width: 32px;
  height: 32px;
  background-color: #334155;
  border: 1px solid #475569;
  color: #ffffff;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.count-stepper input {
  width: 50px;
  text-align: center;
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #ffffff;
  height: 32px;
  border-radius: 4px;
  font-weight: bold;
}

.active-map-badge {
  display: inline-block;
  padding: 6px 10px;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #38bdf8;
  font-weight: 500;
}

.error-banner {
  background-color: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  color: #fca5a5;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  background-color: #1e293b;
  border-top: 1px solid #334155;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #475569;
  color: #cbd5e1;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-spawn-submit {
  background-color: #0284c7;
  border: 1px solid #38bdf8;
  color: #ffffff;
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}
.btn-spawn-submit:hover:not(:disabled) {
  background-color: #0369a1;
}
.btn-spawn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

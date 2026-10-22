/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StockAdversaryModal from '../src/components/StockAdversaryModal.vue';

describe('StockAdversaryModal Component', () => {
  it('exports component definition with props and default state', () => {
    expect(StockAdversaryModal).toBeDefined();
    expect(StockAdversaryModal.props).toBeDefined();
    expect(StockAdversaryModal.props.modelValue).toBeDefined();
    expect(StockAdversaryModal.props.activeMap).toBeDefined();
  });

  describe('Form Data & Methods', () => {
    it('returns default tier colors matching Threat Tiers 1 to 5', () => {
      const getColor = StockAdversaryModal.methods.getTierColor;
      expect(getColor(1)).toBe('#2ecc71');
      expect(getColor(2)).toBe('#3498db');
      expect(getColor(3)).toBe('#9b59b6');
      expect(getColor(4)).toBe('#f1c40f');
      expect(getColor(5)).toBe('#e74c3c');
    });

    it('builds spawn payload correctly for existing template', () => {
      const buildPayload = StockAdversaryModal.methods.buildSpawnPayload;
      const payload = buildPayload({
        mode: 'existing',
        selectedTemplateId: 'sathar-trooper-t2',
        count: 3,
        mapId: 16,
      });

      expect(payload.mapId).toBe(16);
      expect(payload.templateId).toBe('sathar-trooper-t2');
      expect(payload.count).toBe(3);
    });

    it('builds spawn payload correctly for custom adversary', () => {
      const buildPayload = StockAdversaryModal.methods.buildSpawnPayload;
      const payload = buildPayload({
        mode: 'custom',
        customForm: {
          name: 'Volturnian Stalker',
          category: 'creature',
          threat_tier: 3,
          attacks: 'Claw, Bite',
          traits: 'Ambush Predator',
          description: 'A terrifying desert beast with scythe claws',
          source_image_url: '/uploads/beast.png',
        },
        count: 2,
        mapId: 16,
      });

      expect(payload.mapId).toBe(16);
      expect(payload.count).toBe(2);
      expect(payload.template.name).toBe('Volturnian Stalker');
      expect(payload.template.category).toBe('creature');
      expect(payload.template.threat_tier).toBe(3);
      expect(payload.template.description).toBe('A terrifying desert beast with scythe claws');
      expect(payload.source_image_url).toBe('/uploads/beast.png');
    });

    it('generates AI token art and sets source_image_url on success', async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        expect(url).toBe('/api/adversaries/generate-token-art');
        expect(options.method).toBe('POST');
        const body = JSON.parse(options.body);
        expect(body.name).toBe('Yazirian Sniper');
        expect(body.prompt).toBe('Yazirian with thermal goggles');
        return {
          ok: true,
          json: async () => ({
            token_image_url: '/uploads/tokens/token_yazirian_sniper.png',
            source_image_url: '/uploads/raw_yazirian_sniper.jpg',
          }),
        };
      };

      try {
        const ctx = {
          isGeneratingArt: false,
          errorMessage: null,
          customForm: {
            name: 'Yazirian Sniper',
            description: 'Yazirian with thermal goggles',
            species: 'Yazirian',
            category: 'npc',
            threat_tier: 2,
            weapon: 'Laser Rifle',
            armor: 'Skein Suit',
            source_image_url: '',
          },
        };

        await StockAdversaryModal.methods.generateAiTokenArt.call(ctx);
        expect(ctx.isGeneratingArt).toBe(false);
        expect(ctx.customForm.source_image_url).toBe('/uploads/tokens/token_yazirian_sniper.png');
        expect(ctx.errorMessage).toBeNull();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('handles rate limit error and starts cooldown timer', async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => ({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Rate limit reached',
          message: 'AI image rate limit reached. Please wait 35 seconds.',
          retryAfter: 35,
        }),
      });

      try {
        let startedCooldown = 0;
        const ctx = {
          isGeneratingArt: false,
          errorMessage: null,
          cooldownSeconds: 0,
          customForm: { name: 'Trooper' },
          startArtCooldown(s) { startedCooldown = s; },
        };

        await StockAdversaryModal.methods.generateAiTokenArt.call(ctx);
        expect(ctx.isGeneratingArt).toBe(false);
        expect(startedCooldown).toBe(35);
        expect(ctx.errorMessage).toContain('AI image rate limit reached');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('deletes selected template via DELETE /api/adversaries/:id and selects next available template', async () => {
      const originalFetch = global.fetch;
      const originalConfirm = global.confirm;
      global.confirm = () => true;
      global.fetch = async (url, options) => {
        expect(url).toBe('/api/adversaries/sathar-t2');
        expect(options.method).toBe('DELETE');
        return { ok: true, json: async () => ({ success: true }) };
      };

      try {
        const ctx = {
          selectedTemplateId: 'sathar-t2',
          templates: [
            { template_id: 'sathar-t2', name: 'Sathar Trooper', threat_tier: 2, category: 'npc' },
            { template_id: 'pirate-t1', name: 'Pirate Raider', threat_tier: 1, category: 'npc' },
          ],
          get currentSelectedTemplate() {
            return this.templates.find((t) => t.template_id === this.selectedTemplateId) || null;
          },
          errorMessage: null,
        };

        await StockAdversaryModal.methods.deleteSelectedTemplate.call(ctx);
        expect(ctx.templates).toHaveLength(1);
        expect(ctx.templates[0].template_id).toBe('pirate-t1');
        expect(ctx.selectedTemplateId).toBe('pirate-t1');
      } finally {
        global.fetch = originalFetch;
        global.confirm = originalConfirm;
      }
    });

    it('updates existing template token via PATCH /api/adversaries/:id/token', async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        expect(url).toBe('/api/adversaries/sathar-t2/token');
        expect(options.method).toBe('PATCH');
        const body = JSON.parse(options.body);
        expect(body.source_image_url).toBe('/uploads/new_sathar.png');
        return {
          ok: true,
          json: async () => ({
            template: {
              template_id: 'sathar-t2',
              name: 'Sathar Trooper',
              threat_tier: 2,
              category: 'npc',
              token_image_path: '/uploads/tokens/sathar-t2.png?v=12345',
            },
            updatedTokensCount: 2,
          }),
        };
      };

      try {
        const ctx = {
          selectedTemplateId: 'sathar-t2',
          isUpdatingToken: false,
          existingTokenImageError: true,
          errorMessage: null,
          templates: [
            {
              template_id: 'sathar-t2',
              name: 'Sathar Trooper',
              threat_tier: 2,
              category: 'npc',
              token_image_path: '/uploads/tokens/old.png',
            },
          ],
        };

        await StockAdversaryModal.methods.updateExistingTemplateToken.call(ctx, '/uploads/new_sathar.png');
        expect(ctx.templates[0].token_image_path).toBe('/uploads/tokens/sathar-t2.png?v=12345');
        expect(ctx.existingTokenImageError).toBe(false);
        expect(ctx.isUpdatingToken).toBe(false);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('uploads a custom file on Existing Templates tab and calls updateExistingTemplateToken', async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        expect(url).toBe('/api/upload');
        expect(options.method).toBe('POST');
        return {
          ok: true,
          json: async () => ({ url: '/uploads/uploaded_custom_token.png' }),
        };
      };

      try {
        let updatedWithUrl = null;
        const ctx = {
          selectedTemplateId: 'sathar-t2',
          errorMessage: null,
          async updateExistingTemplateToken(url) {
            updatedWithUrl = url;
          },
        };

        const fakeEvent = {
          target: {
            files: [new Blob(['fake-image'], { type: 'image/png' })],
            value: 'C:\\fakepath\\token.png',
          },
        };

        await StockAdversaryModal.methods.handleExistingTokenFileUpload.call(ctx, fakeEvent);
        expect(updatedWithUrl).toBe('/uploads/uploaded_custom_token.png');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('routes selectedImageUrl watcher to updateExistingTemplateToken when mode is existing', async () => {
      let calledUrl = null;
      const ctx = {
        mode: 'existing',
        selectedTemplateId: 'sathar-t2',
        customForm: { source_image_url: '' },
        updateExistingTemplateToken(url) {
          calledUrl = url;
        },
      };

      StockAdversaryModal.watch.selectedImageUrl.call(ctx, '/uploads/from_library.png');
      expect(calledUrl).toBe('/uploads/from_library.png');
      expect(ctx.customForm.source_image_url).toBe('');
    });

    it('generates existing template AI token art and updates template token', async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        expect(url).toBe('/api/adversaries/generate-token-art');
        expect(options.method).toBe('POST');
        const body = JSON.parse(options.body);
        expect(body.name).toBe('Sathar Warrior');
        expect(body.threat_tier).toBe(2);
        return {
          ok: true,
          json: async () => ({
            token_image_url: '/uploads/tokens/token_sathar_warrior.png',
          }),
        };
      };

      try {
        let updatedWithUrl = null;
        let cooldownSet = null;
        const ctx = {
          isGeneratingArt: false,
          errorMessage: null,
          cooldownSeconds: 0,
          currentSelectedTemplate: {
            name: 'Sathar Warrior',
            category: 'npc',
            threat_tier: 2,
            actions: [{ name: 'Laser Rifle' }],
            system_data: { description: 'A deadly Sathar warrior' },
          },
          startArtCooldown(s) {
            cooldownSet = s;
          },
          async updateExistingTemplateToken(url) {
            updatedWithUrl = url;
          },
        };

        await StockAdversaryModal.methods.generateExistingTemplateAiArt.call(ctx);
        expect(ctx.isGeneratingArt).toBe(false);
        expect(updatedWithUrl).toBe('/uploads/tokens/token_sathar_warrior.png');
        expect(cooldownSet).toBe(45);
        expect(ctx.errorMessage).toBeNull();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Template Rendering & Controls', () => {
    it('disables delete template button when operations are active', async () => {
      const wrapper = mount(StockAdversaryModal, {
        props: {
          modelValue: true,
          activeMap: { id: 1, name: 'Arena' },
        },
        data() {
          return {
            templates: [
              { template_id: 'tpl-1', name: 'Sathar', category: 'npc', threat_tier: 2 },
            ],
            selectedTemplateId: 'tpl-1',
            isUpdatingToken: false,
            isGeneratingArt: false,
            isSpawning: false,
          };
        },
      });

      const btn = wrapper.find('.btn-delete-template');
      expect(btn.exists()).toBe(true);
      expect(btn.element.disabled).toBe(false);

      await wrapper.setData({ isUpdatingToken: true });
      expect(btn.element.disabled).toBe(true);

      await wrapper.setData({ isUpdatingToken: false, isGeneratingArt: true });
      expect(btn.element.disabled).toBe(true);

      await wrapper.setData({ isGeneratingArt: false, isSpawning: true });
      expect(btn.element.disabled).toBe(true);

      await wrapper.setData({ isSpawning: false });
      expect(btn.element.disabled).toBe(false);
    });
  });
});

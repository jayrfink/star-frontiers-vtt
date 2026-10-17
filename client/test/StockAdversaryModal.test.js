import { describe, it, expect } from 'vitest';
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
  });
});

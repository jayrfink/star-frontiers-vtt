import { describe, it, expect, vi } from 'vitest';
import { getTokenDamageOverlayState, drawTokenDamageOverlay } from '../src/utils/tokenDamageOverlay.js';

describe('Token Damage & Wounded Red Overlay', () => {
  describe('getTokenDamageOverlayState', () => {
    it('returns null for null/undefined or vehicle tokens', () => {
      expect(getTokenDamageOverlayState(null)).toBeNull();
      expect(
        getTokenDamageOverlayState({
          current_hp: 5,
          max_hp: 50,
          vehicle_data: { hull_points: 5 },
        })
      ).toBeNull();
    });

    it('returns null when adversary STA is 50% or higher and not wounded', () => {
      expect(getTokenDamageOverlayState({ current_hp: 50, max_hp: 50 })).toBeNull();
      expect(getTokenDamageOverlayState({ current_hp: 25, max_hp: 50 })).toBeNull();
    });

    it('returns "bloodied" when adversary STA is strictly less than 50% and at least 20%', () => {
      expect(getTokenDamageOverlayState({ current_hp: 24, max_hp: 50 })).toBe('bloodied');
      expect(getTokenDamageOverlayState({ current_hp: 10, max_hp: 50 })).toBe('bloodied');
    });

    it('returns "critical" when adversary STA is strictly less than 20% and greater than 0', () => {
      expect(getTokenDamageOverlayState({ current_hp: 9, max_hp: 50 })).toBe('critical');
      expect(getTokenDamageOverlayState({ current_hp: 1, max_hp: 50 })).toBe('critical');
    });

    it('returns "dead" when adversary STA is 0 or negative', () => {
      expect(getTokenDamageOverlayState({ current_hp: 0, max_hp: 50 })).toBe('dead');
      expect(getTokenDamageOverlayState({ current_hp: -5, max_hp: 50 })).toBe('dead');
    });

    it('returns "bloodied" for PC tokens marked wounded in status_effects or conditions', () => {
      expect(
        getTokenDamageOverlayState({
          name: 'Captain Carter',
          character_id: 1,
          status_effects: ['wounded'],
        })
      ).toBe('bloodied');

      expect(
        getTokenDamageOverlayState({
          name: 'Dralasite Medic',
          status_effects: ['🩸'],
        })
      ).toBe('bloodied');

      expect(
        getTokenDamageOverlayState({
          name: 'NPC Ally',
          conditions: ['Wounded'],
        })
      ).toBe('bloodied');

      // Safely handles JSON string representation of status_effects or conditions
      expect(
        getTokenDamageOverlayState({
          name: 'Vrusk Scout',
          status_effects: '["wounded"]',
        })
      ).toBe('bloodied');

      expect(
        getTokenDamageOverlayState({
          name: 'Human Tech',
          conditions: '["Stunned", "Wounded"]',
        })
      ).toBe('bloodied');

      // Gracefully ignores invalid JSON strings
      expect(
        getTokenDamageOverlayState({
          name: 'Corrupted Token',
          status_effects: 'invalid json [',
          conditions: 'not json',
        })
      ).toBeNull();
    });

    it('prioritizes "dead" and "critical" over "wounded" status when STA is below 20% or 0', () => {
      expect(
        getTokenDamageOverlayState({
          current_hp: 5,
          max_hp: 50,
          status_effects: ['wounded'],
          conditions: ['Wounded'],
        })
      ).toBe('critical');

      expect(
        getTokenDamageOverlayState({
          current_hp: 0,
          max_hp: 50,
          status_effects: ['wounded'],
        })
      ).toBe('dead');
    });
  });

  describe('drawTokenDamageOverlay', () => {
    function createMockCtx() {
      const stops = [];
      const gradientMock = {
        addColorStop: vi.fn((offset, color) => stops.push({ offset, color })),
      };
      return {
        stops,
        gradientMock,
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        clip: vi.fn(),
        fill: vi.fn(),
        createLinearGradient: vi.fn(() => gradientMock),
        fillStyle: null,
      };
    }

    it('draws full transparent red circle when state is "dead"', () => {
      const ctx = createMockCtx();
      drawTokenDamageOverlay(ctx, 'dead', 100, 100, 20);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalledWith(100, 100, 20, 0, Math.PI * 2);
      expect(ctx.fillStyle).toBe('rgba(230, 15, 15, 0.62)');
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('draws bottom-up linear gradient to mid-token when state is "bloodied"', () => {
      const ctx = createMockCtx();
      drawTokenDamageOverlay(ctx, 'bloodied', 100, 100, 20);

      // bottomY = 120, endY = 100 - 20 * 0.10 = 98
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(100, 120, 100, 98);
      expect(ctx.stops[0].offset).toBe(0);
      expect(ctx.stops[ctx.stops.length - 1]).toEqual({ offset: 1, color: 'rgba(255, 25, 25, 0)' });
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('draws higher bottom-up linear gradient when state is "critical"', () => {
      const ctx = createMockCtx();
      drawTokenDamageOverlay(ctx, 'critical', 100, 100, 20);

      // bottomY = 120, endY = 100 - 20 * 0.65 = 87
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(100, 120, 100, 87);
      expect(ctx.stops[0].offset).toBe(0);
      expect(ctx.stops[ctx.stops.length - 1]).toEqual({ offset: 1, color: 'rgba(255, 20, 20, 0)' });
      expect(ctx.fill).toHaveBeenCalled();
    });
  });
});

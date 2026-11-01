import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getShipDamageOverlayState,
  drawShipDamageOverlay,
} from '../src/utils/shipDamageOverlay.js';

describe('Ship Damage & Out of Commission Overlay (Space VTT)', () => {
  describe('getShipDamageOverlayState', () => {
    it('returns null for null, undefined, or celestial tokens', () => {
      expect(getShipDamageOverlayState(null)).toBeNull();
      expect(
        getShipDamageOverlayState({
          layer: 'celestial',
          current_hp: 0,
          max_hp: 50,
        })
      ).toBeNull();
      expect(
        getShipDamageOverlayState({
          token_type: 'celestial',
          current_hp: 10,
          max_hp: 50,
        })
      ).toBeNull();
      expect(
        getShipDamageOverlayState({
          conditions: ['celestial'],
          current_hp: 0,
        })
      ).toBeNull();
    });

    it('returns null when ship Hull Points are 100% (undamaged)', () => {
      expect(getShipDamageOverlayState({ current_hp: 50, max_hp: 50 })).toBeNull();
      expect(getShipDamageOverlayState({ current_hp: 60, max_hp: 60 })).toBeNull();
    });

    it('returns "light" when ship has sustained light damage (50% to 99% HP)', () => {
      expect(getShipDamageOverlayState({ current_hp: 45, max_hp: 50 })).toBe('light');
      expect(getShipDamageOverlayState({ current_hp: 25, max_hp: 50 })).toBe('light');
    });

    it('returns "heavy" when ship has sustained heavy damage (20% to 49% HP)', () => {
      expect(getShipDamageOverlayState({ current_hp: 24, max_hp: 50 })).toBe('heavy');
      expect(getShipDamageOverlayState({ current_hp: 10, max_hp: 50 })).toBe('heavy');
    });

    it('returns "critical" when ship has sustained critical damage (< 20% HP and > 0)', () => {
      expect(getShipDamageOverlayState({ current_hp: 9, max_hp: 50 })).toBe('critical');
      expect(getShipDamageOverlayState({ current_hp: 1, max_hp: 50 })).toBe('critical');
    });

    it('returns "out_of_commission" when ship reaches 0 or negative Hull Points', () => {
      expect(getShipDamageOverlayState({ current_hp: 0, max_hp: 50 })).toBe('out_of_commission');
      expect(getShipDamageOverlayState({ current_hp: -10, max_hp: 50 })).toBe('out_of_commission');
    });

    it('extracts HP stats from linked ship sheet when not on token directly', () => {
      const token = { id: 1, name: 'UPF Strike Cruiser', character_id: 101 };
      const damagedShip = { id: 101, name: 'UPF Strike Cruiser', hull_points: 60, current_hp: 25 };
      expect(getShipDamageOverlayState(token, damagedShip)).toBe('heavy');

      const deadShip = { id: 101, name: 'UPF Strike Cruiser', hull_points: 60, current_hp: 0 };
      expect(getShipDamageOverlayState(token, deadShip)).toBe('out_of_commission');
    });

    it('falls back to status_effects and conditions when numeric HP is absent', () => {
      expect(
        getShipDamageOverlayState({
          name: 'Derelict Hulk',
          conditions: ['hulk'],
        })
      ).toBe('out_of_commission');

      expect(
        getShipDamageOverlayState({
          name: 'Destroyed Frigate',
          status_effects: ['destroyed'],
        })
      ).toBe('out_of_commission');

      expect(
        getShipDamageOverlayState({
          name: 'Damaged Scout',
          conditions: ['damaged'],
        })
      ).toBe('heavy');

      expect(
        getShipDamageOverlayState({
          name: 'Adrift Freighter',
          status_effects: ['adrift'],
        })
      ).toBe('heavy');
    });
  });

  describe('drawShipDamageOverlay', () => {
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

    it('draws full circular light grey translucent overlay when ship is out of commission at 0 HP', () => {
      const ctx = createMockCtx();
      drawShipDamageOverlay(ctx, 'out_of_commission', 100, 100, 24);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalledWith(100, 100, 24, 0, Math.PI * 2);
      expect(ctx.clip).toHaveBeenCalled();
      expect(ctx.fillStyle).toBe('rgba(210, 218, 226, 0.62)');
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('draws gradual translucent orange linear gradient rising from bottom for damaged ships', () => {
      const ctx = createMockCtx();
      drawShipDamageOverlay(ctx, 'heavy', 100, 100, 24);

      // bottomY = 124, endY = 100 - 24 * 0.15 = 96.4
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(100, 124, 100, 96.4);
      expect(ctx.stops[0].offset).toBe(0);
      expect(ctx.stops[0].color).toContain('255, 125, 10');
      expect(ctx.stops[ctx.stops.length - 1]).toEqual({ offset: 1, color: 'rgba(255, 170, 50, 0)' });
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('draws deeper gradual translucent orange linear gradient for critically damaged ships', () => {
      const ctx = createMockCtx();
      drawShipDamageOverlay(ctx, 'critical', 100, 100, 24);

      // bottomY = 124, endY = 100 - 24 * 0.70 = 83.2
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(100, 124, 100, 83.2);
      expect(ctx.stops[0].offset).toBe(0);
      expect(ctx.stops[0].color).toContain('255, 110, 0');
      expect(ctx.stops[ctx.stops.length - 1]).toEqual({ offset: 1, color: 'rgba(255, 160, 40, 0)' });
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('supports continuous gradient scaling when exact ratio is supplied', () => {
      const ctx = createMockCtx();
      drawShipDamageOverlay(ctx, 'heavy', 100, 100, 24, 0.4);

      expect(ctx.createLinearGradient).toHaveBeenCalled();
      expect(ctx.stops[0].offset).toBe(0);
      expect(ctx.stops[ctx.stops.length - 1].offset).toBe(1);
      expect(ctx.fill).toHaveBeenCalled();
    });
  });

  describe('SpaceVttCanvas Integration', () => {
    const spaceCanvasSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/components/SpaceVttCanvas.vue'),
      'utf8'
    );
    const spaceViewSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/views/SpaceVttView.vue'),
      'utf8'
    );

    it('SpaceVttCanvas imports and calls drawShipDamageOverlay', () => {
      expect(spaceCanvasSrc).toContain('drawShipDamageOverlay');
      expect(spaceCanvasSrc).toContain('getShipDamageOverlayState');
      expect(spaceCanvasSrc).toContain('props.ships');
    });

    it('SpaceVttView passes ships prop to SpaceVttCanvas and updates on sheet:updated', () => {
      expect(spaceViewSrc).toMatch(/<SpaceVttCanvas[\s\S]*?:ships="ships"/);
      expect(spaceViewSrc).toContain("'sheet:updated'");
    });
  });
});

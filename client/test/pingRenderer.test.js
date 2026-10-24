import { describe, it, expect, vi } from 'vitest';
import {
  getPingBadgeBounds,
  isPingDismissHit,
  drawPing,
  drawAllPings,
  PING_COLORS,
} from '../src/utils/pingRenderer.js';

describe('Ping Renderer & Hit-Testing Utility', () => {
  describe('getPingBadgeBounds', () => {
    it('returns null for null, undefined, or invalid ping objects', () => {
      expect(getPingBadgeBounds(null)).toBeNull();
      expect(getPingBadgeBounds(undefined)).toBeNull();
      expect(getPingBadgeBounds({})).toBeNull();
      expect(getPingBadgeBounds({ x: '100', y: 100 })).toBeNull();
      expect(getPingBadgeBounds({ x: 100, y: NaN })).toBeNull();
    });

    it('calculates bounding box and close button coordinates relative to ping.x and ping.y', () => {
      const ping = { x: 200, y: 150, username: 'Scout' };
      const bounds = getPingBadgeBounds(ping);

      expect(bounds).not.toBeNull();
      expect(bounds.x).toBe(218); // x + 18
      expect(bounds.y).toBe(126); // y - 24
      expect(bounds.height).toBe(20);
      expect(bounds.width).toBeGreaterThan(40);
      expect(bounds.closeRadius).toBeGreaterThanOrEqual(6);
      expect(bounds.closeX).toBeGreaterThan(bounds.x + 30);
      expect(bounds.closeX).toBeLessThan(bounds.x + bounds.width);
      expect(bounds.closeY).toBe(bounds.y + bounds.height / 2);
    });

    it('uses fallback "Player" when username is not provided', () => {
      const ping1 = { x: 100, y: 100 };
      const ping2 = { x: 100, y: 100, username: 'Player' };
      const bounds1 = getPingBadgeBounds(ping1);
      const bounds2 = getPingBadgeBounds(ping2);

      expect(bounds1).not.toBeNull();
      expect(bounds1.width).toBe(bounds2.width);
    });

    it('increases width for longer usernames', () => {
      const shortPing = { x: 100, y: 100, username: 'Jo' };
      const longPing = { x: 100, y: 100, username: 'Commander_Vrusk_99' };
      const shortBounds = getPingBadgeBounds(shortPing);
      const longBounds = getPingBadgeBounds(longPing);

      expect(longBounds.width).toBeGreaterThan(shortBounds.width);
    });
  });

  describe('isPingDismissHit', () => {
    it('returns false for invalid inputs', () => {
      expect(isPingDismissHit(null, 100, 100)).toBe(false);
      expect(isPingDismissHit({ x: 100, y: 100 }, NaN, 100)).toBe(false);
      expect(isPingDismissHit({ x: 100, y: 100 }, 100, undefined)).toBe(false);
    });

    it('returns true when coordinates fall precisely on or within the close button radius', () => {
      const ping = { x: 200, y: 150, username: 'Pilot' };
      const bounds = getPingBadgeBounds(ping);

      // Center of close button
      expect(isPingDismissHit(ping, bounds.closeX, bounds.closeY)).toBe(true);

      // Within radius
      expect(isPingDismissHit(ping, bounds.closeX + bounds.closeRadius - 1, bounds.closeY)).toBe(true);
      expect(isPingDismissHit(ping, bounds.closeX, bounds.closeY + bounds.closeRadius - 1)).toBe(true);

      // Exactly on edge of radius
      expect(isPingDismissHit(ping, bounds.closeX + bounds.closeRadius, bounds.closeY)).toBe(true);
    });

    it('returns false when coordinates are outside the close button radius', () => {
      const ping = { x: 200, y: 150, username: 'Pilot' };
      const bounds = getPingBadgeBounds(ping);

      // Just outside the radius
      expect(isPingDismissHit(ping, bounds.closeX + bounds.closeRadius + 1, bounds.closeY)).toBe(false);
      expect(isPingDismissHit(ping, bounds.closeX, bounds.closeY + bounds.closeRadius + 1)).toBe(false);

      // On badge text area
      expect(isPingDismissHit(ping, bounds.x + 5, bounds.y + 5)).toBe(false);

      // On ping center
      expect(isPingDismissHit(ping, 200, 150)).toBe(false);
    });
  });

  describe('drawPing', () => {
    function createMockCtx() {
      const gradientMock = {
        addColorStop: vi.fn(),
      };
      return {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        roundRect: vi.fn(),
        createRadialGradient: vi.fn(() => gradientMock),
        gradientMock,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        textBaseline: '',
      };
    }

    it('does not throw and ignores invalid ping or missing context', () => {
      const ctx = createMockCtx();
      expect(() => drawPing(null, { x: 100, y: 100 }, 1000)).not.toThrow();
      expect(() => drawPing(ctx, null, 1000)).not.toThrow();
      expect(() => drawPing(ctx, { x: 'invalid', y: 100 }, 1000)).not.toThrow();
      expect(ctx.save).not.toHaveBeenCalled();
    });

    it('renders ping radial gradient, ripple rings, badge background, text, and close icon', () => {
      const ctx = createMockCtx();
      const ping = { x: 150, y: 250, username: 'Dralasite' };
      const timestamp = 1200;

      drawPing(ctx, ping, timestamp);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();

      // Radial gradient for aqua core
      expect(ctx.createRadialGradient).toHaveBeenCalledWith(150, 250, 0, 150, 250, expect.any(Number));
      expect(ctx.gradientMock.addColorStop).toHaveBeenCalledWith(0, expect.stringMatching(/#00ffff|#22d3ee/i));

      // Ripple rings
      expect(ctx.arc).toHaveBeenCalledWith(150, 250, expect.any(Number), 0, Math.PI * 2);
      expect(ctx.stroke).toHaveBeenCalled();

      // Username text
      expect(ctx.fillText).toHaveBeenCalledWith('Dralasite', expect.any(Number), expect.any(Number));

      // Close icon ✕
      expect(ctx.fillText).toHaveBeenCalledWith('✕', expect.any(Number), expect.any(Number));
    });

    it('uses Math.sin(timestamp / 200) to animate ripple rings based on timestamp', () => {
      const ctx1 = createMockCtx();
      const ctx2 = createMockCtx();
      const ping = { x: 100, y: 100 };

      drawPing(ctx1, ping, 0);
      drawPing(ctx2, ping, 314); // Half period of ~628ms

      // Collect the radii of ripple rings drawn
      const arcCalls1 = ctx1.arc.mock.calls.map(call => call[2]);
      const arcCalls2 = ctx2.arc.mock.calls.map(call => call[2]);

      expect(arcCalls1).not.toEqual(arcCalls2);
    });

    it('exposes standard sci-fi color constants', () => {
      expect(PING_COLORS).toBeDefined();
      expect(PING_COLORS.aqua).toMatch(/#00ffff|#22d3ee/i);
      expect(PING_COLORS.teal).toMatch(/#0d9488|#14b8a6|#00e5ff/i);
      expect(PING_COLORS.badgeBg).toBe('rgba(13, 17, 23, 0.9)');
    });
  });

  describe('drawAllPings', () => {
    function createMockCtx() {
      return {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      };
    }

    it('handles null, undefined, and empty collections without error', () => {
      const ctx = createMockCtx();
      expect(() => drawAllPings(ctx, null, 100)).not.toThrow();
      expect(() => drawAllPings(ctx, undefined, 100)).not.toThrow();
      expect(() => drawAllPings(ctx, [], 100)).not.toThrow();
      expect(() => drawAllPings(ctx, {}, 100)).not.toThrow();
      expect(ctx.save).not.toHaveBeenCalled();
    });

    it('draws all pings when pings is an Array', () => {
      const ctx = createMockCtx();
      const pings = [
        { x: 100, y: 100, username: 'Player1' },
        { x: 200, y: 200, username: 'Player2' },
      ];

      drawAllPings(ctx, pings, 500);

      // save/restore called once per valid ping
      expect(ctx.save).toHaveBeenCalledTimes(2);
      expect(ctx.restore).toHaveBeenCalledTimes(2);
    });

    it('draws all pings when pings is an Object/Map keyed by userId', () => {
      const ctx = createMockCtx();
      const pingsMap = {
        'user-1': { x: 100, y: 100, username: 'Player1' },
        'user-2': { x: 200, y: 200, username: 'Player2' },
        'user-3': null, // Should be ignored safely
      };

      drawAllPings(ctx, pingsMap, 500);

      expect(ctx.save).toHaveBeenCalledTimes(2);
      expect(ctx.restore).toHaveBeenCalledTimes(2);
    });
  });
});

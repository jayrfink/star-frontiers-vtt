import { describe, it, expect } from 'vitest';
import {
  canFlipAndBurn,
  calculateFlipHeading,
  calculateBlackoutSeconds,
  formatFlipAndBurnAlert,
} from '../src/utils/flipAndBurn.js';

describe('Space Combat: Flip and Burn Mechanics', () => {
  describe('canFlipAndBurn', () => {
    it('returns false when MR is less than 3 (2 or less)', () => {
      expect(canFlipAndBurn(0)).toBe(false);
      expect(canFlipAndBurn(1)).toBe(false);
      expect(canFlipAndBurn(2)).toBe(false);
      expect(canFlipAndBurn(null)).toBe(false);
      expect(canFlipAndBurn(undefined)).toBe(false);
    });

    it('returns true when MR is 3 or above (MR >= 3)', () => {
      expect(canFlipAndBurn(3)).toBe(true);
      expect(canFlipAndBurn('3')).toBe(true);
      expect(canFlipAndBurn(4)).toBe(true);
      expect(canFlipAndBurn(5)).toBe(true);
      expect(canFlipAndBurn('4')).toBe(true);
    });
  });

  describe('calculateFlipHeading', () => {
    it('rotates heading by 180 degrees modulo 360', () => {
      expect(calculateFlipHeading(0)).toBe(180);
      expect(calculateFlipHeading(60)).toBe(240);
      expect(calculateFlipHeading(120)).toBe(300);
      expect(calculateFlipHeading(180)).toBe(0);
      expect(calculateFlipHeading(240)).toBe(60);
      expect(calculateFlipHeading(300)).toBe(120);
    });
  });

  describe('calculateBlackoutSeconds', () => {
    it('calculates 1d10 * 10 seconds (10s to 100s)', () => {
      expect(calculateBlackoutSeconds(1)).toBe(10);
      expect(calculateBlackoutSeconds(5)).toBe(50);
      expect(calculateBlackoutSeconds(10)).toBe(100);
    });
  });

  describe('formatFlipAndBurnAlert', () => {
    it('includes ship name, new heading, STA check requirement, and 1d10*10s blackout duration', () => {
      const msg = formatFlipAndBurnAlert('UPF Interceptor', 180);
      expect(msg).toContain('UPF Interceptor');
      expect(msg).toContain('180°');
      expect(msg).toContain('STA');
      expect(msg).toContain('1d10');
    });
  });
});

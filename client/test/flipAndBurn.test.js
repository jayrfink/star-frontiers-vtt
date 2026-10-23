import { describe, it, expect } from 'vitest';
import {
  canFlipAndBurn,
  canMultiTurnFlip,
  calculateFlipHeading,
  calculateTurnHeading,
  calculateBlackoutSeconds,
  formatFlipAndBurnAlert,
  formatMultiTurnAlert,
  MULTI_TURN_FLIP_STATUS,
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

  describe('canMultiTurnFlip (MR < 3)', () => {
    it('returns true when MR is 1 or 2', () => {
      expect(canMultiTurnFlip(1)).toBe(true);
      expect(canMultiTurnFlip(2)).toBe(true);
      expect(canMultiTurnFlip('1')).toBe(true);
      expect(canMultiTurnFlip('2')).toBe(true);
    });

    it('returns false when MR is 3 or greater (uses standard 1-turn flip)', () => {
      expect(canMultiTurnFlip(3)).toBe(false);
      expect(canMultiTurnFlip(4)).toBe(false);
    });

    it('returns false when MR is 0, null, or invalid', () => {
      expect(canMultiTurnFlip(0)).toBe(false);
      expect(canMultiTurnFlip(null)).toBe(false);
      expect(canMultiTurnFlip(undefined)).toBe(false);
    });
  });

  describe('calculateTurnHeading', () => {
    it('rotates heading by 90 degrees per turn', () => {
      expect(calculateTurnHeading(0, 90)).toBe(90);
      expect(calculateTurnHeading(90, 90)).toBe(180);
      expect(calculateTurnHeading(270, 90)).toBe(0);
      expect(calculateTurnHeading(300, 90)).toBe(30);
    });
  });

  describe('formatMultiTurnAlert', () => {
    it('formats Turn 1 announcement with STA Check #1', () => {
      const msg = formatMultiTurnAlert('Assault Scout', 1, 90);
      expect(msg).toContain('Turn 1/2 of Multi-Turn Flip');
      expect(msg).toContain('Assault Scout');
      expect(msg).toContain('90°');
      expect(msg).toContain('STA Check #1');
    });

    it('formats Turn 2 announcement with STA Check #2 and full 180 reversal', () => {
      const msg = formatMultiTurnAlert('Assault Scout', 2, 180);
      expect(msg).toContain('Turn 2/2 completed');
      expect(msg).toContain('180° reversal');
      expect(msg).toContain('STA Check #2');
    });
  });

  describe('MULTI_TURN_FLIP_STATUS constant', () => {
    it('exports standard status string', () => {
      expect(MULTI_TURN_FLIP_STATUS).toBe('🔄 Flip & Burn (Turn 1/2)');
    });
  });
});

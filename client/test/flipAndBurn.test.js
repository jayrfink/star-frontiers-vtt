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
  canStandardFlip,
  canLumberingFlip,
  canSnapFlip,
  calculateStaCheckTarget,
  resolveStaCheckResult,
  formatStandardFlipAlert,
  formatLumberingFlipAlert,
  formatSnapFlipAlert,
  formatBrakingBurnAlert,
  formatGLocResultAlert,
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

  /* -------------------------------------------------------------
   * Knight Hawks Combat Flip & Burn Physics and G-LOC Rules
   * ----------------------------------------------------------- */

  describe('Maneuver Classification by MR', () => {
    describe('canStandardFlip (MR >= 3)', () => {
      it('returns true for MR 3 and higher', () => {
        expect(canStandardFlip(3)).toBe(true);
        expect(canStandardFlip('3')).toBe(true);
        expect(canStandardFlip(4)).toBe(true);
        expect(canStandardFlip(5)).toBe(true);
      });

      it('returns false for MR 0, 1, 2, or invalid', () => {
        expect(canStandardFlip(0)).toBe(false);
        expect(canStandardFlip(1)).toBe(false);
        expect(canStandardFlip(2)).toBe(false);
        expect(canStandardFlip('2')).toBe(false);
        expect(canStandardFlip(null)).toBe(false);
        expect(canStandardFlip(undefined)).toBe(false);
      });
    });

    describe('canLumberingFlip (MR 1-2)', () => {
      it('returns true for MR 1 and 2', () => {
        expect(canLumberingFlip(1)).toBe(true);
        expect(canLumberingFlip('1')).toBe(true);
        expect(canLumberingFlip(2)).toBe(true);
        expect(canLumberingFlip('2')).toBe(true);
      });

      it('returns false for MR 0, MR >= 3, or invalid', () => {
        expect(canLumberingFlip(0)).toBe(false);
        expect(canLumberingFlip(3)).toBe(false);
        expect(canLumberingFlip(4)).toBe(false);
        expect(canLumberingFlip(null)).toBe(false);
        expect(canLumberingFlip(undefined)).toBe(false);
      });
    });

    describe('canSnapFlip (MR 1-2)', () => {
      it('returns true for MR 1 and 2 (pilot overloads RCS)', () => {
        expect(canSnapFlip(1)).toBe(true);
        expect(canSnapFlip('1')).toBe(true);
        expect(canSnapFlip(2)).toBe(true);
        expect(canSnapFlip('2')).toBe(true);
      });

      it('returns false for MR 0, MR >= 3, or invalid', () => {
        expect(canSnapFlip(0)).toBe(false);
        expect(canSnapFlip(3)).toBe(false);
        expect(canSnapFlip(4)).toBe(false);
        expect(canSnapFlip(null)).toBe(false);
        expect(canSnapFlip(undefined)).toBe(false);
      });
    });
  });

  describe('calculateStaCheckTarget', () => {
    it('calculates target without modifiers for braced posture and safe burn', () => {
      const res = calculateStaCheckTarget(60, { deltaV: 1, posture: 'braced' });
      expect(res.target).toBe(60);
      expect(res.gPenalty).toBe(0);
      expect(res.postureMod).toBe(0);
      expect(res.extremityMod).toBe(0);
      expect(typeof res.breakdown).toBe('string');
    });

    it('calculates target for safe burn threshold (ΔV 1-2 gives 0 penalty)', () => {
      const res1 = calculateStaCheckTarget(50, { deltaV: 1 });
      const res2 = calculateStaCheckTarget(50, { deltaV: 2 });
      expect(res1.gPenalty).toBe(0);
      expect(res2.gPenalty).toBe(0);
      expect(res1.target).toBe(50);
      expect(res2.target).toBe(50);
    });

    it('applies -10% per hex of ΔV > 2 for high-G burns', () => {
      const res3 = calculateStaCheckTarget(50, { deltaV: 3 });
      expect(res3.gPenalty).toBe(-10);
      expect(res3.target).toBe(40);

      const res4 = calculateStaCheckTarget(50, { deltaV: 4 });
      expect(res4.gPenalty).toBe(-20);
      expect(res4.target).toBe(30);

      const res5 = calculateStaCheckTarget(50, { deltaV: 5 });
      expect(res5.gPenalty).toBe(-30);
      expect(res5.target).toBe(20);
    });

    it('applies posture modifiers correctly', () => {
      // Couch / strapped: +20%
      const couch = calculateStaCheckTarget(50, { posture: 'couch' });
      expect(couch.postureMod).toBe(20);
      expect(couch.target).toBe(70);

      const strapped = calculateStaCheckTarget(50, { posture: 'strapped-in' });
      expect(strapped.postureMod).toBe(20);
      expect(strapped.target).toBe(70);

      // Braced: 0%
      const braced = calculateStaCheckTarget(50, { posture: 'braced' });
      expect(braced.postureMod).toBe(0);
      expect(braced.target).toBe(50);

      // Unbraced / moving: -20%
      const unbraced = calculateStaCheckTarget(50, { posture: 'unbraced' });
      expect(unbraced.postureMod).toBe(-20);
      expect(unbraced.target).toBe(30);
    });

    it('applies extremity / whip modifiers (-10% for bow/stern, 0% for midships)', () => {
      const stern = calculateStaCheckTarget(50, { location: 'stern' });
      expect(stern.extremityMod).toBe(-10);
      expect(stern.target).toBe(40);

      const bow = calculateStaCheckTarget(50, { extremity: 'bow' });
      expect(bow.extremityMod).toBe(-10);
      expect(bow.target).toBe(40);

      const mid = calculateStaCheckTarget(50, { location: 'midships' });
      expect(mid.extremityMod).toBe(0);
      expect(mid.target).toBe(50);
    });

    it('computes exact spec test case: base 60 with ΔV 4 (-20%), couch (+20%), stern (-10%) = 50%', () => {
      const res = calculateStaCheckTarget(60, {
        deltaV: 4,
        posture: 'couch',
        location: 'stern',
      });
      expect(res.gPenalty).toBe(-20);
      expect(res.postureMod).toBe(20);
      expect(res.extremityMod).toBe(-10);
      expect(res.target).toBe(50);
      expect(res.breakdown).toContain('60');
      expect(res.breakdown).toContain('50');
    });

    it('clamps target STA between 1 and 99', () => {
      // Underflow clamped to 1
      const low = calculateStaCheckTarget(20, {
        deltaV: 6, // -40%
        posture: 'unbraced', // -20%
        location: 'stern', // -10%
      });
      expect(low.target).toBe(1);

      // Overflow clamped to 99
      const high = calculateStaCheckTarget(90, {
        deltaV: 1,
        posture: 'couch', // +20%
      });
      expect(high.target).toBe(99);
    });
  });

  describe('resolveStaCheckResult', () => {
    it('handles successful STA check (roll <= target)', () => {
      const res = resolveStaCheckResult(45, 50, 'braced');
      expect(res.success).toBe(true);
      expect(res.margin).toBe(0);
      expect(res.severity).toBe('none');
      expect(res.condition).toBe('Normal');
      expect(res.stunnedTurns).toBe(0);
      expect(res.checkPenalty).toBe(0);
      expect(res.damageDice).toBeNull();
      expect(res.unconsciousTurnsDice).toBeNull();
      expect(res.displacementMetersDice).toBeNull();
      expect(res.summaryText).toContain('withstands');
    });

    describe('Margin 1-19: Grey-Out / G-Stun', () => {
      it('resolves secured crew (couch or braced): stunned 1 turn, -20% next turn, no damage', () => {
        const res = resolveStaCheckResult(65, 50, 'couch');
        expect(res.success).toBe(false);
        expect(res.margin).toBe(15);
        expect(res.severity).toBe('stun');
        expect(res.condition).toBe('G-Stun');
        expect(res.stunnedTurns).toBe(1);
        expect(res.checkPenalty).toBe(-20);
        expect(res.damageDice).toBeNull();
        expect(res.unconsciousTurnsDice).toBeNull();
        expect(res.displacementMetersDice).toBeNull();
        expect(res.summaryText).toContain('stunned');
      });

      it('resolves unbraced crew: stunned 1 turn, knocked prone, takes 1d3 damage', () => {
        const res = resolveStaCheckResult(55, 50, 'unbraced');
        expect(res.success).toBe(false);
        expect(res.margin).toBe(5);
        expect(res.severity).toBe('stun');
        expect(res.condition).toContain('Prone');
        expect(res.stunnedTurns).toBe(1);
        expect(res.damageDice).toBe('1d3');
        expect(res.unconsciousTurnsDice).toBeNull();
        expect(res.displacementMetersDice).toBeNull();
        expect(res.summaryText).toContain('1d3');
        expect(res.summaryText).toContain('prone');
      });
    });

    describe('Margin 20+: Full G-LOC Blackout', () => {
      it('resolves secured crew: passes out cold for 1d6 turns, no impact damage', () => {
        const res = resolveStaCheckResult(70, 50, 'braced');
        expect(res.success).toBe(false);
        expect(res.margin).toBe(20);
        expect(res.severity).toBe('g-loc');
        expect(res.condition).toBe('G-LOC Blackout');
        expect(res.unconsciousTurnsDice).toBe('1d6');
        expect(res.damageDice).toBeNull();
        expect(res.displacementMetersDice).toBeNull();
        expect(res.summaryText).toContain('1d6');
      });

      it('resolves unbraced crew: hurled 1d3m, 1d6 damage, 1d6 turns unconscious', () => {
        const res = resolveStaCheckResult(85, 50, 'unbraced');
        expect(res.success).toBe(false);
        expect(res.margin).toBe(35);
        expect(res.severity).toBe('g-loc');
        expect(res.condition).toContain('Hurled');
        expect(res.unconsciousTurnsDice).toBe('1d6');
        expect(res.damageDice).toBe('1d6');
        expect(res.displacementMetersDice).toBe('1d3');
        expect(res.summaryText).toContain('1d6');
        expect(res.summaryText).toContain('1d3');
      });
    });
  });

  describe('Alert Formatters', () => {
    describe('formatStandardFlipAlert', () => {
      it('formats clean in-hex 1-turn reversal with no crew check', () => {
        const msg = formatStandardFlipAlert('UPF Heavy Cruiser', 180);
        expect(msg).toContain('UPF Heavy Cruiser');
        expect(msg).toContain('180°');
        expect(msg).toContain('Standard Flip');
        expect(msg).toMatch(/no crew (?:STA )?check/i);
      });
    });

    describe('formatLumberingFlipAlert', () => {
      it('formats Turn 1 announcement with drift', () => {
        const msg = formatLumberingFlipAlert('Assault Scout', 1, 90);
        expect(msg).toContain('Assault Scout');
        expect(msg).toContain('Turn 1/2');
        expect(msg).toContain('90°');
        expect(msg).toMatch(/no crew (?:STA )?check/i);
      });

      it('formats Turn 2 announcement with 180 reversal', () => {
        const msg = formatLumberingFlipAlert('Assault Scout', 2, 180);
        expect(msg).toContain('Assault Scout');
        expect(msg).toContain('Turn 2/2');
        expect(msg).toContain('180°');
        expect(msg).toMatch(/no crew (?:STA )?check/i);
      });
    });

    describe('formatSnapFlipAlert', () => {
      it('formats emergency snap flip with pilot check and crew STA check requirement', () => {
        const msg = formatSnapFlipAlert('Sathari Raider', 180);
        expect(msg).toContain('Sathari Raider');
        expect(msg).toContain('Emergency Snap Flip');
        expect(msg).toContain('180°');
        expect(msg).toMatch(/pilot/i);
        expect(msg).toMatch(/STA/i);
      });
    });

    describe('formatBrakingBurnAlert', () => {
      it('formats safe deceleration (ΔV <= 2) requiring no crew check', () => {
        const msg = formatBrakingBurnAlert('Explorer', 2);
        expect(msg).toContain('Explorer');
        expect(msg).toContain('2');
        expect(msg).toMatch(/safe/i);
        expect(msg).toMatch(/no crew (?:STA )?check/i);
      });

      it('formats High-G deceleration (ΔV >= 3) with penalty and check warning', () => {
        const msg = formatBrakingBurnAlert('Explorer', 4);
        expect(msg).toContain('Explorer');
        expect(msg).toContain('4');
        expect(msg).toMatch(/high-g/i);
        expect(msg).toContain('-20%');
        expect(msg).toMatch(/STA check/i);
      });
    });

    describe('formatGLocResultAlert', () => {
      it('formats success result', () => {
        const result = resolveStaCheckResult(40, 50, 'braced');
        const msg = formatGLocResultAlert('Capt. Wilhemina', result);
        expect(msg).toContain('Capt. Wilhemina');
        expect(msg).toContain('SUCCESS');
      });

      it('formats G-Stun result', () => {
        const result = resolveStaCheckResult(60, 50, 'couch');
        const msg = formatGLocResultAlert('Lt. Larry', result);
        expect(msg).toContain('Lt. Larry');
        expect(msg).toContain('FAILED');
        expect(msg).toContain('G-Stun');
      });

      it('formats G-LOC result', () => {
        const result = resolveStaCheckResult(80, 50, 'unbraced');
        const msg = formatGLocResultAlert('Ensign Ricky', result);
        expect(msg).toContain('Ensign Ricky');
        expect(msg).toContain('FAILED');
        expect(msg).toContain('G-LOC');
      });
    });
  });
});


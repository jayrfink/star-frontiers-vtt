import { describe, it, expect, vi } from 'vitest';
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
  SAFE_COMPENSATOR_DELTA_V,
  rollD5,
  calculateSlingshotParameters,
  calculateCompoundDeltaV,
  resolveSlingshotPilotCheck,
  formatSlingshotSuccessAlert,
  formatSlingshotHazardAlert,
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

  describe('SAFE_COMPENSATOR_DELTA_V constant', () => {
    it('defines safe threshold as 3 ΔV', () => {
      expect(SAFE_COMPENSATOR_DELTA_V).toBe(3);
    });
  });

  describe('rollD5 helper', () => {
    it('returns an integer between 1 and 5', () => {
      for (let i = 0; i < 50; i++) {
        const val = rollD5();
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(5);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    it('maps native 1d10 rolls 1-10 to ceil(d10 / 2)', () => {
      // Mock Math.random to test 1..10 values
      const testCases = [
        { rand: 0.0, expected: 1 }, // d10 = 1 -> ceil(1/2) = 1
        { rand: 0.15, expected: 1 }, // d10 = 2 -> ceil(2/2) = 1
        { rand: 0.25, expected: 2 }, // d10 = 3 -> ceil(3/2) = 2
        { rand: 0.35, expected: 2 }, // d10 = 4 -> ceil(4/2) = 2
        { rand: 0.45, expected: 3 }, // d10 = 5 -> ceil(5/2) = 3
        { rand: 0.55, expected: 3 }, // d10 = 6 -> ceil(6/2) = 3
        { rand: 0.65, expected: 4 }, // d10 = 7 -> ceil(7/2) = 4
        { rand: 0.75, expected: 4 }, // d10 = 8 -> ceil(8/2) = 4
        { rand: 0.85, expected: 5 }, // d10 = 9 -> ceil(9/2) = 5
        { rand: 0.95, expected: 5 }, // d10 = 10 -> ceil(10/2) = 5
      ];

      for (const { rand, expected } of testCases) {
        const spy = vi.spyOn(Math, 'random').mockReturnValue(rand);
        expect(rollD5()).toBe(expected);
        spy.mockRestore();
      }
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

    it('calculates target for safe burn threshold (ΔV 1, 2, 3 gives 0 penalty)', () => {
      const res1 = calculateStaCheckTarget(50, { deltaV: 1 });
      const res2 = calculateStaCheckTarget(50, { deltaV: 2 });
      const res3 = calculateStaCheckTarget(50, { deltaV: 3 });
      expect(res1.gPenalty).toBe(0);
      expect(res2.gPenalty).toBe(0);
      expect(res3.gPenalty).toBe(0);
      expect(res1.target).toBe(50);
      expect(res2.target).toBe(50);
      expect(res3.target).toBe(50);
    });

    it('applies -10% per hex of ΔV > 3 for high-G burns', () => {
      const res4 = calculateStaCheckTarget(50, { deltaV: 4 });
      expect(res4.gPenalty).toBe(-10);
      expect(res4.target).toBe(40);

      const res5 = calculateStaCheckTarget(50, { deltaV: 5 });
      expect(res5.gPenalty).toBe(-20);
      expect(res5.target).toBe(30);

      const res6 = calculateStaCheckTarget(50, { deltaV: 6 });
      expect(res6.gPenalty).toBe(-30);
      expect(res6.target).toBe(20);
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

    it('computes exact spec test case: base 60 with ΔV 4 (-10%), couch (+20%), stern (-10%) = 60%', () => {
      const res = calculateStaCheckTarget(60, {
        deltaV: 4,
        posture: 'couch',
        location: 'stern',
      });
      expect(res.gPenalty).toBe(-10);
      expect(res.postureMod).toBe(20);
      expect(res.extremityMod).toBe(-10);
      expect(res.target).toBe(60);
      expect(res.breakdown).toContain('60');
    });

    it('clamps target STA between 1 and 99', () => {
      // Underflow clamped to 1
      const low = calculateStaCheckTarget(20, {
        deltaV: 7, // -40%
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
    it('defensively handles 0 and non-finite numeric values', () => {
      const resZero = resolveStaCheckResult(0, 50, 'braced');
      expect(resZero.success).toBe(true);
      expect(resZero.margin).toBe(0);

      const resNaN = resolveStaCheckResult('invalid', 'invalid', 'braced');
      expect(resNaN.success).toBe(true);
    });

    it('handles successful STA check (roll <= target)', () => {
      const res = resolveStaCheckResult(45, 50, 'braced');
      expect(res.success).toBe(true);
      expect(res.margin).toBe(0);
      expect(res.severity).toBe('none');
      expect(res.condition).toBe('Normal');
      expect(res.isProne).toBe(false);
      expect(res.stunnedTurns).toBe(0);
      expect(res.checkPenalty).toBe(0);
      expect(res.damageDice).toBeNull();
      expect(res.unconsciousTurnsDice).toBeNull();
      expect(res.displacementMetersDice).toBeNull();
      expect(res.summaryText).toContain('withstands');
    });

    describe('Margin 1-19: Grey-Out / G-Stun', () => {
      it('resolves secured crew (couch or braced): stunned 1 turn, -20% next turn, no damage, not prone', () => {
        const res = resolveStaCheckResult(65, 50, 'couch');
        expect(res.success).toBe(false);
        expect(res.margin).toBe(15);
        expect(res.severity).toBe('stun');
        expect(res.condition).toBe('G-Stun');
        expect(res.isProne).toBe(false);
        expect(res.stunnedTurns).toBe(1);
        expect(res.checkPenalty).toBe(-20);
        expect(res.damageDice).toBeNull();
        expect(res.unconsciousTurnsDice).toBeNull();
        expect(res.displacementMetersDice).toBeNull();
        expect(res.summaryText).toContain('stunned');
      });

      it('resolves unbraced crew: stunned 1 turn, knocked prone, takes ceil(1d10 / 2) damage', () => {
        const res = resolveStaCheckResult(55, 50, 'unbraced');
        expect(res.success).toBe(false);
        expect(res.margin).toBe(5);
        expect(res.severity).toBe('stun');
        expect(res.condition).toContain('Prone');
        expect(res.isProne).toBe(true);
        expect(res.stunnedTurns).toBe(1);
        expect(res.checkPenalty).toBe(-20);
        expect(res.damageDice).toBe('ceil(1d10 / 2)');
        expect(res.unconsciousTurnsDice).toBeNull();
        expect(res.displacementMetersDice).toBeNull();
        expect(res.summaryText).toContain('ceil(1d10 / 2)');
        expect(res.summaryText).toContain('prone');
      });
    });

    describe('Margin 20+: Full G-LOC Blackout', () => {
      it('resolves secured crew: passes out cold for ceil(1d10 / 2) turns, no impact damage', () => {
        const res = resolveStaCheckResult(70, 50, 'braced');
        expect(res.success).toBe(false);
        expect(res.margin).toBe(20);
        expect(res.severity).toBe('g-loc');
        expect(res.condition).toBe('G-LOC Blackout');
        expect(res.isProne).toBe(false);
        expect(res.unconsciousTurnsDice).toBe('ceil(1d10 / 2)');
        expect(res.damageDice).toBeNull();
        expect(res.displacementMetersDice).toBeNull();
        expect(res.summaryText).toContain('ceil(1d10 / 2)');
      });

      it('resolves unbraced crew: hurled ceil(1d10 / 2)m, 1d10 damage, ceil(1d10 / 2) turns unconscious', () => {
        const res = resolveStaCheckResult(85, 50, 'unbraced');
        expect(res.success).toBe(false);
        expect(res.margin).toBe(35);
        expect(res.severity).toBe('g-loc');
        expect(res.condition).toContain('Hurled');
        expect(res.isProne).toBe(true);
        expect(res.unconsciousTurnsDice).toBe('ceil(1d10 / 2)');
        expect(res.damageDice).toBe('1d10');
        expect(res.displacementMetersDice).toBe('ceil(1d10 / 2)');
        expect(res.summaryText).toContain('1d10');
        expect(res.summaryText).toContain('ceil(1d10 / 2)');
      });
    });
  });

  describe('Slingshot Calculations', () => {
    describe('calculateSlingshotParameters', () => {
      it('rejects entries with speed < 4 hexes/turn', () => {
        const res = calculateSlingshotParameters('PLANET', 0, 3);
        expect(res.eligible).toBe(false);
        expect(res.reason).toContain('Minimum entry speed 4');
      });

      describe('Moon Slingshot', () => {
        it('calculates Crater Skim (Distance 0)', () => {
          const res = calculateSlingshotParameters('MOON', 0, 8);
          expect(res.eligible).toBe(true);
          expect(res.zoneName).toBe('Crater Skim');
          expect(res.bonusMr).toBe(1);
          expect(res.freeExitSpeed).toBe(1);
          expect(res.baseGravityDeltaV).toBe(2);
          expect(res.requiresPilotCheck).toBe(true);
          expect(res.pilotModifier).toBe(0);
          expect(res.totalExitSpeed).toBe(9);
          expect(res.totalDeltaV).toBe(2);
          expect(res.isHighG).toBe(false);
          expect(res.gPenalty).toBe(0);
        });

        it('applies pilot check penalty for Moon speed > 8', () => {
          const res = calculateSlingshotParameters('MOON', 0, 10);
          expect(res.pilotModifier).toBe(-10); // (10 - 8) * -5
        });

        it('rejects Moon distance > 0', () => {
          const res = calculateSlingshotParameters('MOON', 1, 6);
          expect(res.eligible).toBe(false);
          expect(res.reason).toMatch(/shallow/i);
        });
      });

      describe('Planet Slingshot', () => {
        it('calculates Outer Well (Distance 1)', () => {
          const res = calculateSlingshotParameters('PLANET', 1, 6);
          expect(res.eligible).toBe(true);
          expect(res.zoneName).toBe('Outer Well');
          expect(res.bonusMr).toBe(1);
          expect(res.freeExitSpeed).toBe(1);
          expect(res.baseGravityDeltaV).toBe(1);
          expect(res.requiresPilotCheck).toBe(false);
          expect(res.pilotModifier).toBe(0);
          expect(res.totalExitSpeed).toBe(7);
          expect(res.totalDeltaV).toBe(1);
          expect(res.isHighG).toBe(false);
        });

        it('calculates Low-Orbit Skim (Distance 0)', () => {
          const res = calculateSlingshotParameters('PLANET', 0, 6);
          expect(res.eligible).toBe(true);
          expect(res.zoneName).toBe('Low-Orbit Skim');
          expect(res.bonusMr).toBe(2);
          expect(res.freeExitSpeed).toBe(2);
          expect(res.baseGravityDeltaV).toBe(3);
          expect(res.requiresPilotCheck).toBe(true);
          expect(res.pilotModifier).toBe(0);
          expect(res.totalExitSpeed).toBe(8);
          expect(res.totalDeltaV).toBe(3);
          expect(res.isHighG).toBe(false);
        });

        it('applies pilot check penalty for Planet Low-Orbit Skim speed > 6', () => {
          const res = calculateSlingshotParameters('PLANET', 0, 8);
          expect(res.pilotModifier).toBe(-10); // (8 - 6) * -5
        });

        it('rejects Planet distance > 1', () => {
          const res = calculateSlingshotParameters('PLANET', 2, 6);
          expect(res.eligible).toBe(false);
        });
      });

      describe('Gas Giant Slingshot', () => {
        it('calculates Outer Well (Distance 1 and 2)', () => {
          const res1 = calculateSlingshotParameters('GAS_GIANT', 1, 5);
          expect(res1.eligible).toBe(true);
          expect(res1.zoneName).toBe('Outer Well');
          expect(res1.bonusMr).toBe(1);
          expect(res1.freeExitSpeed).toBe(1);
          expect(res1.baseGravityDeltaV).toBe(2);
          expect(res1.requiresPilotCheck).toBe(false);

          const res2 = calculateSlingshotParameters('gas giant', 2, 5);
          expect(res2.eligible).toBe(true);
          expect(res2.zoneName).toBe('Outer Well');
          expect(res2.bonusMr).toBe(1);
          expect(res2.freeExitSpeed).toBe(1);
          expect(res2.baseGravityDeltaV).toBe(2);
          expect(res2.requiresPilotCheck).toBe(false);
        });

        it('calculates Deep Skim (Distance 0)', () => {
          const res = calculateSlingshotParameters('GAS_GIANT', 0, 6);
          expect(res.eligible).toBe(true);
          expect(res.zoneName).toBe('Deep Skim');
          expect(res.bonusMr).toBe(3);
          expect(res.freeExitSpeed).toBe(3);
          expect(res.baseGravityDeltaV).toBe(4);
          expect(res.requiresPilotCheck).toBe(true);
          expect(res.pilotModifier).toBe(-20); // base -20%
          expect(res.totalExitSpeed).toBe(9);
          expect(res.totalDeltaV).toBe(4);
          expect(res.isHighG).toBe(true);
          expect(res.gPenalty).toBe(-10); // (4 - 3) * -10
        });

        it('applies speed scaling to Gas Giant Deep Skim pilot check when speed > 6', () => {
          const res = calculateSlingshotParameters('GAS_GIANT', 0, 8);
          expect(res.pilotModifier).toBe(-30); // -20 + (8 - 6) * -5 = -30
        });

        it('rejects Gas Giant distance > 2', () => {
          const res = calculateSlingshotParameters('GAS_GIANT', 3, 5);
          expect(res.eligible).toBe(false);
        });
      });

      describe('Oberth Powered Slingshot (ADF spent at Distance 0)', () => {
        it('calculates Oberth compound ΔV: Planet Dist 0 (base 3) + 2 ADF (4 exit speed) = 7 ΔV (-40% penalty)', () => {
          const res = calculateSlingshotParameters('PLANET', 0, 6, 2);
          expect(res.eligible).toBe(true);
          expect(res.baseGravityDeltaV).toBe(3);
          expect(res.oberthExitSpeed).toBe(4); // 2 ADF * 2
          expect(res.totalExitSpeed).toBe(12); // entry 6 + free 2 + oberth 4
          expect(res.totalDeltaV).toBe(7); // base 3 + oberth 4
          expect(res.isHighG).toBe(true);
          expect(res.gPenalty).toBe(-40); // (7 - 3) * -10
        });

        it('ignores ADF spent outside Distance 0', () => {
          const res = calculateSlingshotParameters('PLANET', 1, 6, 2);
          expect(res.oberthExitSpeed).toBe(0);
          expect(res.totalExitSpeed).toBe(7); // entry 6 + free 1
          expect(res.totalDeltaV).toBe(1); // base 1
          expect(res.isHighG).toBe(false);
          expect(res.gPenalty).toBe(0);
        });
      });
    });

    describe('calculateCompoundDeltaV helper', () => {
      it('calculates compound ΔV from base gravity ΔV and ADF spent', () => {
        expect(calculateCompoundDeltaV(3, 2)).toBe(7);
        expect(calculateCompoundDeltaV(2, 1)).toBe(4);
        expect(calculateCompoundDeltaV(4, 0)).toBe(4);
      });
    });

    describe('resolveSlingshotPilotCheck', () => {
      it('resolves successful check (roll <= targetSkill)', () => {
        const res = resolveSlingshotPilotCheck(35, 50, 'PLANET');
        expect(res.success).toBe(true);
        expect(res.margin).toBe(0);
        expect(res.isMinorHazard).toBe(false);
        expect(res.isMajorHazard).toBe(false);
        expect(res.hullDamageDice).toBeNull();
        expect(res.ignoresScreens).toBe(false);
        expect(res.crewDamageDice).toBeNull();
        expect(res.crewProne).toBe(false);
        expect(res.speedMultiplier).toBe(1);
        expect(res.losesFreeExitSpeed).toBe(false);
        expect(res.summaryText).toContain('flawlessly');
      });

      describe('Minor Hazard (Margin 1-19)', () => {
        it('resolves Moon Crater Skim minor hazard: loses free speed, 1d10 hull (screens absorb), crew prone + ceil(1d10 / 2)', () => {
          const res = resolveSlingshotPilotCheck(60, 50, 'MOON');
          expect(res.success).toBe(false);
          expect(res.margin).toBe(10);
          expect(res.isMinorHazard).toBe(true);
          expect(res.isMajorHazard).toBe(false);
          expect(res.hullDamageDice).toBe('1d10');
          expect(res.ignoresScreens).toBe(false);
          expect(res.crewDamageDice).toBe('ceil(1d10 / 2)');
          expect(res.crewProne).toBe(true);
          expect(res.losesFreeExitSpeed).toBe(true);
          expect(res.speedMultiplier).toBe(1);
        });

        it('resolves Planet Low-Orbit Skim minor hazard: loses free speed, 2d10 structural hull (ignores screens), crew prone + ceil(1d10 / 2)', () => {
          const res = resolveSlingshotPilotCheck(65, 50, 'PLANET');
          expect(res.success).toBe(false);
          expect(res.margin).toBe(15);
          expect(res.isMinorHazard).toBe(true);
          expect(res.isMajorHazard).toBe(false);
          expect(res.hullDamageDice).toBe('2d10');
          expect(res.ignoresScreens).toBe(true);
          expect(res.crewDamageDice).toBe('ceil(1d10 / 2)');
          expect(res.crewProne).toBe(true);
          expect(res.losesFreeExitSpeed).toBe(true);
        });

        it('resolves Gas Giant Deep Skim minor hazard: 2d10 structural hull (ignores screens)', () => {
          const res = resolveSlingshotPilotCheck(60, 50, 'GAS_GIANT');
          expect(res.hullDamageDice).toBe('2d10');
          expect(res.ignoresScreens).toBe(true);
        });
      });

      describe('Major Hazard (Margin 20+)', () => {
        it('resolves Moon Ridge Impact: 3d10 structural (ignores screens), scatter 1 face, halves speed', () => {
          const res = resolveSlingshotPilotCheck(75, 50, 'MOON');
          expect(res.success).toBe(false);
          expect(res.margin).toBe(25);
          expect(res.isMinorHazard).toBe(false);
          expect(res.isMajorHazard).toBe(true);
          expect(res.hullDamageDice).toBe('3d10');
          expect(res.ignoresScreens).toBe(true);
          expect(res.scatterFaces).toBe(1);
          expect(res.speedMultiplier).toBe(0.5);
          expect(res.trappedInHex).toBe(false);
          expect(res.requiresEscapeAdf).toBe(0);
        });

        it('resolves Planet Sub-Orbital Decay: 4d10 structural (ignores screens), trapped in hex, requires 2 ADF escape, halves speed', () => {
          const res = resolveSlingshotPilotCheck(80, 50, 'PLANET');
          expect(res.success).toBe(false);
          expect(res.margin).toBe(30);
          expect(res.isMinorHazard).toBe(false);
          expect(res.isMajorHazard).toBe(true);
          expect(res.hullDamageDice).toBe('4d10');
          expect(res.ignoresScreens).toBe(true);
          expect(res.speedMultiplier).toBe(0.5);
          expect(res.trappedInHex).toBe(true);
          expect(res.requiresEscapeAdf).toBe(2);
          expect(res.statusEffect).toBe('ORBITAL_DECAY_REQUIRES_2_ADF_ESCAPE');
        });

        it('resolves Gas Giant Gravity Capture: 4d10 structural, trapped in hex with escape status', () => {
          const res = resolveSlingshotPilotCheck(90, 50, 'GAS_GIANT');
          expect(res.hullDamageDice).toBe('4d10');
          expect(res.ignoresScreens).toBe(true);
          expect(res.trappedInHex).toBe(true);
          expect(res.requiresEscapeAdf).toBe(2);
          expect(res.statusEffect).toBe('ORBITAL_DECAY_REQUIRES_2_ADF_ESCAPE');
        });
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
      it('formats safe deceleration (ΔV <= 3) requiring no crew check', () => {
        const msg2 = formatBrakingBurnAlert('Explorer', 2);
        expect(msg2).toContain('Explorer');
        expect(msg2).toContain('2');
        expect(msg2).toMatch(/safe/i);
        expect(msg2).toMatch(/no crew (?:STA )?check/i);

        const msg3 = formatBrakingBurnAlert('Explorer', 3);
        expect(msg3).toContain('Explorer');
        expect(msg3).toContain('3');
        expect(msg3).toMatch(/safe/i);
        expect(msg3).toMatch(/no crew (?:STA )?check/i);
      });

      it('formats High-G deceleration (ΔV > 3) with penalty and check warning', () => {
        const msg4 = formatBrakingBurnAlert('Explorer', 4);
        expect(msg4).toContain('Explorer');
        expect(msg4).toContain('4');
        expect(msg4).toMatch(/high-g/i);
        expect(msg4).toContain('-10%');
        expect(msg4).toMatch(/STA check/i);

        const msg5 = formatBrakingBurnAlert('Explorer', 5);
        expect(msg5).toContain('-20%');
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

    describe('formatSlingshotSuccessAlert', () => {
      it('formats success alert with ship name, body, zone, exit speed, bonus MR, and safe ΔV note', () => {
        const msg = formatSlingshotSuccessAlert('UPF Exeter', 'PLANET', 'Low-Orbit Skim', 2, 8, 3);
        expect(msg).toContain('UPF Exeter');
        expect(msg).toContain('PLANET');
        expect(msg).toContain('Low-Orbit Skim');
        expect(msg).toContain('8');
        expect(msg).toContain('+2');
        expect(msg).toContain('3 ΔV');
        expect(msg).toMatch(/safe/i);
      });

      it('formats success alert with High-G warning for ΔV > 3', () => {
        const msg = formatSlingshotSuccessAlert('UPF Exeter', 'GAS_GIANT', 'Deep Skim', 3, 9, 4);
        expect(msg).toContain('HIGH-G');
        expect(msg).toContain('-10%');
      });
    });

    describe('formatSlingshotHazardAlert', () => {
      it('formats hazard alert with ship name, body, damage dice, and summary', () => {
        const msg = formatSlingshotHazardAlert('Sathari Scout', 'MOON', false, '1d10', 'Scraped lunar crater');
        expect(msg).toContain('Sathari Scout');
        expect(msg).toContain('MOON');
        expect(msg).toContain('HAZARD');
        expect(msg).toContain('1d10');
        expect(msg).toContain('Scraped lunar crater');
      });

      it('formats critical hazard alert for major failure', () => {
        const msg = formatSlingshotHazardAlert('Sathari Scout', 'PLANET', true, '4d10', 'Trapped in decay orbit');
        expect(msg).toContain('CRITICAL HAZARD');
        expect(msg).toContain('4d10');
        expect(msg).toContain('Trapped in decay orbit');
      });
    });
  });
});


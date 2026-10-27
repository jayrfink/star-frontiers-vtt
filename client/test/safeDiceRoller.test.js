import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSyntheticRoll, executeQueuedDiceRoll } from '../src/utils/safeDiceRoller.js';
import { diceRollQueue } from '../src/utils/diceRollQueue.js';
import { calculatePercentileRoll, calculateDamageRoll, calculateInitiativeRoll } from '../src/utils/diceUtils.js';

describe('safeDiceRoller with executeQueuedDiceRoll', () => {
  beforeEach(() => {
    diceRollQueue.clear();
  });

  describe('generateSyntheticRoll', () => {
    it('generates 2 d10 dice for percentile notation with valid formatting', () => {
      const notation = [
        { sides: 10, theme: 'custom-tens', themeColor: '#77d19e', qty: 1 },
        { sides: 10, theme: 'custom-ones', themeColor: '#22384a', qty: 1 }
      ];
      const results = generateSyntheticRoll(notation);
      expect(results.length).toBe(2);

      const rollSummary = calculatePercentileRoll(results);
      expect(rollSummary.valid).toBe(true);
      expect(rollSummary.total).toBeGreaterThanOrEqual(1);
      expect(rollSummary.total).toBeLessThanOrEqual(100);
    });

    it('generates correct number of dice for damage notation', () => {
      const notation = [
        { sides: 10, theme: 'custom-dmg', themeColor: '#140409', qty: 4 }
      ];
      const results = generateSyntheticRoll(notation);
      expect(results.length).toBe(4);

      const rollSummary = calculateDamageRoll(results);
      expect(rollSummary.count).toBe(4);
      expect(rollSummary.total).toBeGreaterThanOrEqual(4);
      expect(rollSummary.total).toBeLessThanOrEqual(40);
    });

    it('generates player and opposition dice for initiative notation', () => {
      const notation = [
        { sides: 10, theme: 'custom-init-player', themeColor: '#0b222e', qty: 1 },
        { sides: 10, theme: 'custom-init-opp', themeColor: '#400a22', qty: 1 }
      ];
      const results = generateSyntheticRoll(notation);
      expect(results.length).toBe(2);

      const initSummary = calculateInitiativeRoll(results);
      expect(initSummary.valid).toBe(true);
      expect(initSummary.playerRoll).toBeGreaterThanOrEqual(1);
      expect(initSummary.playerRoll).toBeLessThanOrEqual(10);
      expect(initSummary.oppRoll).toBeGreaterThanOrEqual(1);
      expect(initSummary.oppRoll).toBeLessThanOrEqual(10);
    });
  });

  describe('executeQueuedDiceRoll serialization & fast succession protection', () => {
    it('captures all rolls when triggered in rapid succession without losing the first', async () => {
      const roll1Result = [
        { sides: 10, theme: 'custom-tens', value: 2, groupId: 0 },
        { sides: 10, theme: 'custom-ones', value: 5, groupId: 1 }
      ];
      const roll2Result = [
        { sides: 10, theme: 'custom-tens', value: 8, groupId: 0 },
        { sides: 10, theme: 'custom-ones', value: 0, groupId: 1 }
      ];

      const mockBox = {
        roll: vi.fn()
          .mockImplementationOnce(async () => {
            // First roll takes 40ms to animate
            await new Promise(r => setTimeout(r, 40));
            return roll1Result;
          })
          .mockImplementationOnce(async () => {
            // Second roll takes 20ms to animate
            await new Promise(r => setTimeout(r, 20));
            return roll2Result;
          })
      };

      const notation = [
        { sides: 10, theme: 'custom-tens', qty: 1 },
        { sides: 10, theme: 'custom-ones', qty: 1 }
      ];

      // User clicks roll twice in immediate succession (0ms apart)
      const p1 = executeQueuedDiceRoll(mockBox, notation);
      const p2 = executeQueuedDiceRoll(mockBox, notation);

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(res1).toEqual(roll1Result);
      expect(res2).toEqual(roll2Result);
      expect(mockBox.roll).toHaveBeenCalledTimes(2);

      const summary1 = calculatePercentileRoll(res1);
      const summary2 = calculatePercentileRoll(res2);
      expect(summary1.total).toBe(25);
      expect(summary2.total).toBe(80);
    });

    it('falls back to synthetic roll and logs if 3D animation times out', async () => {
      const mockBox = {
        roll: vi.fn().mockImplementation(() => new Promise(() => {})) // never resolves
      };
      const notation = [
        { sides: 10, theme: 'custom-dmg', qty: 2 }
      ];

      const results = await executeQueuedDiceRoll(mockBox, notation, { timeoutMs: 30 });
      expect(results.length).toBe(2);
      const summary = calculateDamageRoll(results);
      expect(summary.count).toBe(2);
      expect(summary.total).toBeGreaterThanOrEqual(2);
    });

    it('falls back to synthetic roll and captures results even if 3D diceBox is null', async () => {
      const notation = [
        { sides: 10, theme: 'custom-tens', qty: 1 },
        { sides: 10, theme: 'custom-ones', qty: 1 }
      ];
      const results = await executeQueuedDiceRoll(null, notation);
      expect(results.length).toBe(2);
      const summary = calculatePercentileRoll(results);
      expect(summary.valid).toBe(true);
    });
  });
});

import { describe, it, expect } from 'vitest';
import AdversaryTokenHud from '../src/components/AdversaryTokenHud.vue';

describe('AdversaryTokenHud Component', () => {
  it('exports component definition with props and methods', () => {
    expect(AdversaryTokenHud).toBeDefined();
    expect(AdversaryTokenHud.props).toBeDefined();
    expect(AdversaryTokenHud.props.token).toBeDefined();
  });

  describe('Delta Math in Component Methods', () => {
    it('applies direct numeric value, positive delta, and negative delta', () => {
      const applyDelta = AdversaryTokenHud.methods.calculateNewHp;

      // Direct value
      expect(applyDelta(50, 60, '35')).toBe(35);

      // Negative delta
      expect(applyDelta(50, 60, '-12')).toBe(38);
      expect(applyDelta(10, 60, '-25')).toBe(0); // Floor at 0

      // Positive delta
      expect(applyDelta(30, 60, '+15')).toBe(45);
      expect(applyDelta(55, 60, '+20')).toBe(60); // Cap at max
    });
  });

  describe('Condition Toggling Logic', () => {
    it('adds and removes conditions in the array', () => {
      const toggle = AdversaryTokenHud.methods.toggleConditionItem;

      let list = ['Wounded'];
      list = toggle(list, 'Stunned');
      expect(list).toContain('Wounded');
      expect(list).toContain('Stunned');

      list = toggle(list, 'Wounded');
      expect(list).not.toContain('Wounded');
      expect(list).toContain('Stunned');
    });
  });

  describe('Threat Tier Styling Helpers', () => {
    it('returns appropriate tier colors and labels', () => {
      const getColor = AdversaryTokenHud.methods.getTierColor;
      expect(getColor(1)).toBe('#2ecc71');
      expect(getColor(2)).toBe('#3498db');
      expect(getColor(3)).toBe('#9b59b6');
      expect(getColor(4)).toBe('#f1c40f');
      expect(getColor(5)).toBe('#e74c3c');
    });
  });
});

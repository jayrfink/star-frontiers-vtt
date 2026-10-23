import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
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

    it('safely handles and preserves stringified conditions in toggleConditionItem and isConditionActive (Bug 22)', () => {
      const toggle = AdversaryTokenHud.methods.toggleConditionItem;
      const isActive = AdversaryTokenHud.methods.isConditionActive;

      // toggleConditionItem parses JSON string
      const stringifiedList = JSON.stringify(['Wounded', 'In Cover']);
      const updated = toggle(stringifiedList, 'Stunned');
      expect(updated).toEqual(['Wounded', 'In Cover', 'Stunned']);

      // toggle existing condition out of stringified array
      const removed = toggle(stringifiedList, 'Wounded');
      expect(removed).toEqual(['In Cover']);

      // isConditionActive detects condition from stringified array
      const context = {
        token: {
          conditions: JSON.stringify(['Wounded', 'Pinned']),
        },
      };
      expect(isActive.call(context, 'Wounded')).toBe(true);
      expect(isActive.call(context, 'Pinned')).toBe(true);
      expect(isActive.call(context, 'Stunned')).toBe(false);

      // handles invalid JSON gracefully
      const contextCorrupt = {
        token: {
          conditions: '{not valid json',
        },
      };
      expect(isActive.call(contextCorrupt, 'Wounded')).toBe(false);
      expect(toggle('{not valid json', 'Wounded')).toEqual(['Wounded']);
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

  describe('maxHp Fallback Logic', () => {
    it('uses explicit token.max_hp if present', () => {
      const context = {
        token: {
          max_hp: 75,
          template: { hp_max: 40 },
        },
      };
      expect(AdversaryTokenHud.computed.maxHp.call(context)).toBe(75);
    });

    it('falls back to template.hp_max when token.max_hp is undefined or null', () => {
      const contextWithoutMax = {
        token: {
          template: { hp_max: 42 },
        },
      };
      expect(AdversaryTokenHud.computed.maxHp.call(contextWithoutMax)).toBe(42);

      const contextWithNullMax = {
        token: {
          max_hp: null,
          template: { hp_max: 65 },
        },
      };
      expect(AdversaryTokenHud.computed.maxHp.call(contextWithNullMax)).toBe(65);
    });

    it('falls back to default 50 when neither max_hp nor template.hp_max is provided', () => {
      const contextEmpty = {
        token: {},
      };
      expect(AdversaryTokenHud.computed.maxHp.call(contextEmpty)).toBe(50);
    });
  });

  describe('Input Event Handling Polish', () => {
    it('blurs target on keyup.enter to avoid double execution on HP commit', () => {
      const sfcContent = fs.readFileSync(
        path.resolve(__dirname, '../src/components/AdversaryTokenHud.vue'),
        'utf8'
      );
      expect(sfcContent).toContain('@keyup.enter="$event.target.blur()"');
      expect(sfcContent).not.toMatch(/@keyup\.enter="onHpCommit/);
    });
  });
});

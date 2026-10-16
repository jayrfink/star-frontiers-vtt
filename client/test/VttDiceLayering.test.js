import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('VTT Dice and Roll Banners Layering', () => {
  const rpgViewPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const spaceViewPath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const rpgContent = fs.readFileSync(rpgViewPath, 'utf8');
  const spaceContent = fs.readFileSync(spaceViewPath, 'utf8');

  function extractZIndex(content, selector) {
    // If inline style: id="dice-box" ... z-index: (\d+)
    if (selector.startsWith('#')) {
      const match = content.match(new RegExp(`id="${selector.slice(1)}"[^>]*style="[^"]*z-index:\\s*(\\d+)`));
      if (match) return parseInt(match[1], 10);
    }
    // If CSS rule: .selector { ... z-index: (\d+); ... }
    const cssMatch = content.match(new RegExp(`\\${selector}\\s*\\{[^}]*z-index:\\s*(\\d+)`, 's'));
    if (cssMatch) return parseInt(cssMatch[1], 10);
    return null;
  }

  describe('RPG VTT View', () => {
    it('sets #dice-box z-index higher than all page widgets', () => {
      const diceZ = extractZIndex(rpgContent, '#dice-box');
      const rollLogZ = extractZIndex(rpgContent, '.roll-log-hud');
      const toolbarZ = extractZIndex(rpgContent, '.vtt-toolbar');
      const popoverZ = extractZIndex(rpgContent, '.dmg-popover');

      expect(diceZ).toBeGreaterThan(rollLogZ);
      expect(diceZ).toBeGreaterThan(toolbarZ);
      expect(diceZ).toBeGreaterThan(popoverZ);
      expect(diceZ).toBe(200);
    });

    it('sets damage and percentile HUD banners z-index higher than #dice-box', () => {
      const diceZ = extractZIndex(rpgContent, '#dice-box');
      const damageHudZ = extractZIndex(rpgContent, '.damage-hud-banner');
      const percentileHudZ = extractZIndex(rpgContent, '.percentile-hud-banner');

      expect(damageHudZ).toBeGreaterThan(diceZ);
      expect(percentileHudZ).toBeGreaterThan(diceZ);
      expect(damageHudZ).toBe(250);
      expect(percentileHudZ).toBe(250);
    });
  });

  describe('Space VTT View', () => {
    it('sets #dice-box z-index higher than all page widgets', () => {
      const diceZ = extractZIndex(spaceContent, '#dice-box');
      const rollLogZ = extractZIndex(spaceContent, '.roll-log-hud');
      const toolbarZ = extractZIndex(spaceContent, '.vtt-toolbar');
      const popoverZ = extractZIndex(spaceContent, '.dmg-popover');

      expect(diceZ).toBeGreaterThan(rollLogZ);
      expect(diceZ).toBeGreaterThan(toolbarZ);
      expect(diceZ).toBeGreaterThan(popoverZ);
      expect(diceZ).toBe(200);
    });

    it('sets damage and percentile HUD banners z-index higher than #dice-box', () => {
      const diceZ = extractZIndex(spaceContent, '#dice-box');
      const damageHudZ = extractZIndex(spaceContent, '.damage-hud-banner');
      const percentileHudZ = extractZIndex(spaceContent, '.percentile-hud-banner');

      expect(damageHudZ).toBeGreaterThan(diceZ);
      expect(percentileHudZ).toBeGreaterThan(diceZ);
      expect(damageHudZ).toBe(250);
      expect(percentileHudZ).toBe(250);
    });
  });
});

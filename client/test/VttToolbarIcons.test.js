import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('VttToolbarIcons Wireframe Lined Shapes', () => {
  const rpgPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const spacePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const rpgContent = fs.readFileSync(rpgPath, 'utf8');
  const spaceContent = fs.readFileSync(spacePath, 'utf8');

  // Extract the <nav class="vtt-toolbar">...</nav> section
  const extractToolbar = (content) => {
    const match = content.match(/<nav class="vtt-toolbar">([\s\S]*?)<\/nav>/);
    return match ? match[1] : '';
  };

  const rpgToolbar = extractToolbar(rpgContent);
  const spaceToolbar = extractToolbar(spaceContent);

  const EMOJIS = ['👆', '✋', '📏', '📍', '⚡', '🎲', '💥', '✖', '🧹'];

  describe('RpgVttView toolbar icons', () => {
    it('contains no toolbar button emojis', () => {
      for (const emoji of EMOJIS) {
        expect(rpgToolbar).not.toContain(emoji);
      }
    });

    it('contains vector wireframe tool-icon SVGs for all toolbar buttons', () => {
      expect(rpgToolbar).toContain('<svg class="tool-icon"');
      // Verify specific icons
      // Move
      expect(rpgToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Move/);
      // Pan
      expect(rpgToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Pan/);
      // Ruler
      expect(rpgToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Ruler/);
      // Ping
      expect(rpgToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Ping/);
      // Clear Ping
      expect(rpgToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Clear Ping/);
      // Clear All Pings
      expect(rpgToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Clear All Pings/);
      // Initiative
      expect(rpgToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Initiative/);
      // Roll d%
      expect(rpgToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Roll d%/);
      // DMG Die
      expect(rpgToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*DMG Die/);
      // Clear Dice
      expect(rpgToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Clear Dice/);
    });

    it('defines .tool-icon CSS rules with dynamic glow drop-shadow', () => {
      expect(rpgContent).toContain('.tool-icon');
      expect(rpgContent).toMatch(/drop-shadow\(0 0 3px currentColor\)/);
      expect(rpgContent).toMatch(/drop-shadow\(0 0 6px currentColor\)/);
    });
  });

  describe('SpaceVttView toolbar icons', () => {
    it('contains no toolbar button emojis', () => {
      for (const emoji of EMOJIS) {
        expect(spaceToolbar).not.toContain(emoji);
      }
    });

    it('contains vector wireframe tool-icon SVGs for all toolbar buttons', () => {
      expect(spaceToolbar).toContain('<svg class="tool-icon"');
      // Verify specific icons
      // Move
      expect(spaceToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Move/);
      // Pan
      expect(spaceToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Pan/);
      // Ping
      expect(spaceToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Ping/);
      // Clear Ping
      expect(spaceToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Clear Ping/);
      // Clear All Pings
      expect(spaceToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Clear All Pings/);
      // Initiative
      expect(spaceToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Initiative/);
      // Roll d%
      expect(spaceToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Roll d%/);
      // DMG Die
      expect(spaceToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*DMG Die/);
      // Clear Dice
      expect(spaceToolbar).toMatch(/<svg class="tool-icon"[^>]*>[\s\S]*?<\/svg>\s*Clear Dice/);
    });

    it('defines .tool-icon CSS rules with dynamic glow drop-shadow', () => {
      expect(spaceContent).toContain('.tool-icon');
      expect(spaceContent).toMatch(/drop-shadow\(0 0 3px currentColor\)/);
      expect(spaceContent).toMatch(/drop-shadow\(0 0 6px currentColor\)/);
    });
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { calculateInitiativeRoll } from '../src/utils/diceUtils.js';

describe('Initiative Dice & HUD System', () => {
  const spacePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const rpgPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const spaceContent = fs.readFileSync(spacePath, 'utf8');
  const rpgContent = fs.readFileSync(rpgPath, 'utf8');

  describe('SpaceVttView Initiative Integration', () => {
    it('has Initiative button in toolbar', () => {
      expect(spaceContent).toMatch(/class="btn-tool btn-initiative"/);
      expect(spaceContent).toMatch(/@click="rollInitiative"/);
      expect(spaceContent).toMatch(/⚡ Initiative/);
    });

    it('has floating Initiative HUD banner with player and opposition cards and no winner determination', () => {
      expect(spaceContent).toMatch(/v-if="showInitiativeHud && lastInitiativeRoll"/);
      expect(spaceContent).toMatch(/class="initiative-hud-banner"/);
      expect(spaceContent).toMatch(/class="[^"]*init-player-die[^"]*"/);
      expect(spaceContent).toMatch(/class="[^"]*init-opp-die[^"]*"/);
      expect(spaceContent).not.toMatch(/class="init-winner-banner"/);
      expect(spaceContent).toMatch(/class="hud-user-tag"/);
    });

    it('has roll log pill markup for initiative displaying players and opposition', () => {
      expect(spaceContent).toMatch(/item\.type === 'initiative'/);
      expect(spaceContent).toMatch(/class="init-log-pills"/);
      expect(spaceContent).toMatch(/class="init-pill-player"/);
      expect(spaceContent).toMatch(/class="init-pill-opp"/);
      expect(spaceContent).not.toMatch(/init-pill-winner/);
    });

    it('handles socket roll:created and clearDice for initiative', () => {
      expect(spaceContent).toMatch(/roll\.type === 'initiative'/);
      expect(spaceContent).toMatch(/initiativeHudTimeout/);
      expect(spaceContent).toMatch(/showInitiativeHud\.value = false/);
    });

    it('defines CSS colors matching user specifications', () => {
      // Player: body #0b222e, numbers #b5eeff
      expect(spaceContent).toMatch(/#0b222e/);
      expect(spaceContent).toMatch(/#b5eeff/);
      // Opposition: body #400a22, numbers #c9abb9
      expect(spaceContent).toMatch(/#400a22/);
      expect(spaceContent).toMatch(/#c9abb9/);
    });
  });

  describe('RpgVttView Initiative Integration', () => {
    it('has Initiative button in toolbar', () => {
      expect(rpgContent).toMatch(/class="btn-tool btn-initiative"/);
      expect(rpgContent).toMatch(/@click="rollInitiative"/);
      expect(rpgContent).toMatch(/⚡ Initiative/);
    });

    it('has floating Initiative HUD banner with player and opposition cards and no winner determination', () => {
      expect(rpgContent).toMatch(/v-if="showInitiativeHud && lastInitiativeRoll"/);
      expect(rpgContent).toMatch(/class="initiative-hud-banner"/);
      expect(rpgContent).toMatch(/class="[^"]*init-player-die[^"]*"/);
      expect(rpgContent).toMatch(/class="[^"]*init-opp-die[^"]*"/);
      expect(rpgContent).not.toMatch(/class="init-winner-banner"/);
      expect(rpgContent).toMatch(/class="hud-user-tag"/);
    });

    it('has roll log pill markup for initiative displaying players and opposition', () => {
      expect(rpgContent).toMatch(/item\.type === 'initiative'/);
      expect(rpgContent).toMatch(/class="init-log-pills"/);
      expect(rpgContent).toMatch(/class="init-pill-player"/);
      expect(rpgContent).toMatch(/class="init-pill-opp"/);
      expect(rpgContent).not.toMatch(/init-pill-winner/);
    });

    it('handles socket roll:created and clearDice for initiative', () => {
      expect(rpgContent).toMatch(/roll\.type === 'initiative'/);
      expect(rpgContent).toMatch(/initiativeHudTimeout/);
      expect(rpgContent).toMatch(/showInitiativeHud\.value = false/);
    });

    it('defines CSS colors matching user specifications', () => {
      // Player: body #0b222e, numbers #b5eeff
      expect(rpgContent).toMatch(/#0b222e/);
      expect(rpgContent).toMatch(/#b5eeff/);
      expect(rpgContent).toMatch(/#400a22/);
      expect(rpgContent).toMatch(/#c9abb9/);
    });
  });

  describe('3D Dice Themes', () => {
    it('custom-init-player theme exists with required asset files', () => {
      const themeDir = path.resolve(__dirname, '../public/assets/dice-box/themes/custom-init-player');
      expect(fs.existsSync(path.join(themeDir, 'theme.config.json'))).toBe(true);
      expect(fs.existsSync(path.join(themeDir, 'diffuse-light.png'))).toBe(true);
      expect(fs.existsSync(path.join(themeDir, 'normal.png'))).toBe(true);
    });

    it('custom-init-opp theme exists with required asset files', () => {
      const themeDir = path.resolve(__dirname, '../public/assets/dice-box/themes/custom-init-opp');
      expect(fs.existsSync(path.join(themeDir, 'theme.config.json'))).toBe(true);
      expect(fs.existsSync(path.join(themeDir, 'diffuse-light.png'))).toBe(true);
      expect(fs.existsSync(path.join(themeDir, 'normal.png'))).toBe(true);
    });
  });

  describe('Initiative Roll Winner Determination', () => {
    it('correctly parses dice rolls with new #0b222e themeColor', () => {
      const res = calculateInitiativeRoll([
        { theme: 'custom-init-player', themeColor: '#0b222e', value: 8 },
        { theme: 'custom-init-opp', themeColor: '#400a22', value: 4 }
      ]);
      expect(res.playerRoll).toBe(8);
      expect(res.oppRoll).toBe(4);
      expect(res.valid).toBe(true);
    });

    it('correctly identifies opposition victory', () => {
      const res = calculateInitiativeRoll([
        { theme: 'custom-init-player', themeColor: '#17304a', value: 2 },
        { theme: 'custom-init-opp', themeColor: '#400a22', value: 7 }
      ]);
      expect(res.winner).toBe('opposition');
      expect(res.playerRoll).toBe(2);
      expect(res.oppRoll).toBe(7);
      expect(res.valid).toBe(true);
    });

    it('correctly identifies a tie', () => {
      const res = calculateInitiativeRoll([
        { theme: 'custom-init-player', themeColor: '#17304a', value: 6 },
        { theme: 'custom-init-opp', themeColor: '#400a22', value: 6 }
      ]);
      expect(res.winner).toBe('tie');
      expect(res.playerRoll).toBe(6);
      expect(res.oppRoll).toBe(6);
      expect(res.valid).toBe(true);
    });
  });
});

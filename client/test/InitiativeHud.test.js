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
    it('has Initiative button in toolbar for GM only', () => {
      expect(spaceContent).toMatch(/v-if="isGm"[^>]*class="btn-tool btn-initiative"/);
      expect(spaceContent).toMatch(/@click="rollInitiative"/);
      expect(spaceContent).toMatch(/Initiative/);
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
      // Player: body #021a1e, border/text aquamarine
      expect(spaceContent).toMatch(/#021a1e/);
      expect(spaceContent).toMatch(/aquamarine/);
      expect(spaceContent).toMatch(/#202020/);
      expect(spaceContent).toMatch(/#33b8bd/);
      expect(spaceContent).toMatch(/background:\s*#121212/);
    });

    it('defines glow effect box-shadow and text-shadow on initiative HUD banner', () => {
      expect(spaceContent).toMatch(/box-shadow:\s*0\s+0\s+20px\s+rgba\(181,\s*238,\s*255,\s*0\.45\)/);
      expect(spaceContent).toMatch(/text-shadow:\s*0\s+0\s+10px\s+rgba\(181,\s*238,\s*255,\s*0\.7\)/);
    });
  });

  describe('RpgVttView Initiative Integration', () => {
    it('has Initiative button in toolbar for GM only', () => {
      expect(rpgContent).toMatch(/v-if="isGm"[^>]*class="btn-tool btn-initiative"/);
      expect(rpgContent).toMatch(/@click="rollInitiative"/);
      expect(rpgContent).toMatch(/Initiative/);
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
      // Player: body #021a1e, border/text aquamarine
      expect(rpgContent).toMatch(/#021a1e/);
      expect(rpgContent).toMatch(/aquamarine/);
      expect(rpgContent).toMatch(/#202020/);
      expect(rpgContent).toMatch(/#33b8bd/);
      expect(rpgContent).toMatch(/background:\s*#121212/);
    });

    it('defines glow effect box-shadow and text-shadow on initiative HUD banner', () => {
      expect(rpgContent).toMatch(/box-shadow:\s*0\s+0\s+20px\s+rgba\(181,\s*238,\s*255,\s*0\.45\)/);
      expect(rpgContent).toMatch(/text-shadow:\s*0\s+0\s+10px\s+rgba\(181,\s*238,\s*255,\s*0\.7\)/);
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
    it('correctly parses dice rolls with token button and dark gray theme colors (#021a1e player, #202020 opp)', () => {
      const res = calculateInitiativeRoll([
        { theme: 'custom-init-player', themeColor: '#021a1e', value: 8 },
        { theme: 'custom-init-opp', themeColor: '#202020', value: 4 }
      ]);
      expect(res.playerRoll).toBe(8);
      expect(res.oppRoll).toBe(4);
      expect(res.valid).toBe(true);
    });

    it('correctly parses dice rolls with 30% desaturated inverted theme colors (#97c966 player, #0f1a18 opp)', () => {
      const res = calculateInitiativeRoll([
        { theme: 'custom-init-player', themeColor: '#97c966', value: 8 },
        { theme: 'custom-init-opp', themeColor: '#0f1a18', value: 4 }
      ]);
      expect(res.playerRoll).toBe(8);
      expect(res.oppRoll).toBe(4);
      expect(res.valid).toBe(true);
    });

    it('correctly parses dice rolls with desaturated inverted theme colors (#97e847 player, #09201b opp)', () => {
      const res = calculateInitiativeRoll([
        { theme: 'custom-init-player', themeColor: '#97e847', value: 8 },
        { theme: 'custom-init-opp', themeColor: '#09201b', value: 4 }
      ]);
      expect(res.playerRoll).toBe(8);
      expect(res.oppRoll).toBe(4);
      expect(res.valid).toBe(true);
    });

    it('correctly parses dice rolls with inverted theme colors (#97f23d player, #07221c opp)', () => {
      const res = calculateInitiativeRoll([
        { theme: 'custom-init-player', themeColor: '#97f23d', value: 8 },
        { theme: 'custom-init-opp', themeColor: '#07221c', value: 4 }
      ]);
      expect(res.playerRoll).toBe(8);
      expect(res.oppRoll).toBe(4);
      expect(res.valid).toBe(true);
    });

    it('correctly parses dice rolls with #70e6b3 and #07221c themeColors', () => {
      const res = calculateInitiativeRoll([
        { theme: 'custom-init-player', themeColor: '#70e6b3', value: 8 },
        { theme: 'custom-init-opp', themeColor: '#07221c', value: 4 }
      ]);
      expect(res.playerRoll).toBe(8);
      expect(res.oppRoll).toBe(4);
      expect(res.valid).toBe(true);
    });

    it('correctly parses dice rolls with #70e6b3 and #124a3d themeColors', () => {
      const res = calculateInitiativeRoll([
        { theme: 'custom-init-player', themeColor: '#70e6b3', value: 8 },
        { theme: 'custom-init-opp', themeColor: '#124a3d', value: 4 }
      ]);
      expect(res.playerRoll).toBe(8);
      expect(res.oppRoll).toBe(4);
      expect(res.valid).toBe(true);
    });

    it('correctly parses dice rolls with #70e6b3 and #1d705d themeColors', () => {
      const res = calculateInitiativeRoll([
        { theme: 'custom-init-player', themeColor: '#70e6b3', value: 8 },
        { theme: 'custom-init-opp', themeColor: '#1d705d', value: 4 }
      ]);
      expect(res.playerRoll).toBe(8);
      expect(res.oppRoll).toBe(4);
      expect(res.valid).toBe(true);
    });

    it('correctly parses dice rolls with lightened/saturated #12415a and #6f0e39 themeColors', () => {
      const res = calculateInitiativeRoll([
        { theme: 'custom-init-player', themeColor: '#12415a', value: 8 },
        { theme: 'custom-init-opp', themeColor: '#6f0e39', value: 4 }
      ]);
      expect(res.playerRoll).toBe(8);
      expect(res.oppRoll).toBe(4);
      expect(res.valid).toBe(true);
    });

    it('correctly parses dice rolls with legacy #0b222e themeColor', () => {
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

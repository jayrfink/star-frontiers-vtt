import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { calculatePercentileRoll } from '../src/utils/diceUtils.js';

describe('Percentile Dice Custom Colors', () => {
  const rpgPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const spacePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const rpgContent = fs.readFileSync(rpgPath, 'utf-8');
  const spaceContent = fs.readFileSync(spacePath, 'utf-8');

  describe('3D Dice Themes', () => {
    it('custom-tens diffuse texture has numbers colored #00ffff matching GM Map manager text', async () => {
      const diffPath = path.resolve(__dirname, '../public/assets/dice-box/themes/custom-tens/diffuse-light.png');
      expect(fs.existsSync(diffPath)).toBe(true);
      const { data } = await sharp(diffPath).raw().toBuffer({ resolveWithObject: true });
      let foundMatchingPixel = false;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 200) {
          // Check for #00ffff (r=0, g=255, b=255)
          if (data[i] === 0 && data[i + 1] === 255 && data[i + 2] === 255) {
            foundMatchingPixel = true;
            break;
          }
        }
      }
      expect(foundMatchingPixel).toBe(true);
    });

    it('custom-ones diffuse texture retains original #77d19e numbers', async () => {
      const diffPath = path.resolve(__dirname, '../public/assets/dice-box/themes/custom-ones/diffuse-light.png');
      expect(fs.existsSync(diffPath)).toBe(true);
      const { data } = await sharp(diffPath).raw().toBuffer({ resolveWithObject: true });
      let foundMatchingPixel = false;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 200) {
          // Check for #77d19e (r=0x77=119, g=0xd1=209, b=0x9e=158)
          if (data[i] === 0x77 && data[i + 1] === 0xd1 && data[i + 2] === 0x9e) {
            foundMatchingPixel = true;
            break;
          }
        }
      }
      expect(foundMatchingPixel).toBe(true);
    });
  });

  describe('VTT Views Dice Configurations', () => {
    it('configures tens die with GM Map Manager background #082d33 and ones die 50% darker #111c25 in RpgVttView', () => {
      expect(rpgContent).toContain("theme: 'custom-tens', themeColor: '#082d33'");
      expect(rpgContent).toContain("theme: 'custom-ones', themeColor: '#111c25'");
      expect(rpgContent).not.toContain("theme: 'custom-tens', themeColor: '#77d19e'");
      expect(rpgContent).not.toContain("theme: 'custom-ones', themeColor: '#182734'");
    });

    it('configures tens die with GM Map Manager background #082d33 and ones die 50% darker #111c25 in SpaceVttView', () => {
      expect(spaceContent).toContain("theme: 'custom-tens', themeColor: '#082d33'");
      expect(spaceContent).toContain("theme: 'custom-ones', themeColor: '#111c25'");
      expect(spaceContent).not.toContain("theme: 'custom-tens', themeColor: '#77d19e'");
      expect(spaceContent).not.toContain("theme: 'custom-ones', themeColor: '#182734'");
    });
  });

  describe('calculatePercentileRoll with updated colors', () => {
    it('correctly calculates roll with tens #082d33 and ones #111c25 regardless of order', () => {
      const roll1 = calculatePercentileRoll([
        { value: 6, themeColor: '#082d33' },
        { value: 4, themeColor: '#111c25' }
      ]);
      expect(roll1).toEqual({
        total: 64,
        tens: 6,
        ones: 4,
        valid: true
      });

      const roll2 = calculatePercentileRoll([
        { value: 7, themeColor: '#111c25' },
        { value: 3, themeColor: '#082d33' }
      ]);
      expect(roll2).toEqual({
        total: 37,
        tens: 3,
        ones: 7,
        valid: true
      });
    });

    it('supports alternative 50% darker color #0c141a as well as legacy colors', () => {
      const rollAlt = calculatePercentileRoll([
        { value: 9, themeColor: '#0c141a' },
        { value: 2, themeColor: '#082d33' }
      ]);
      expect(rollAlt).toEqual({
        total: 29,
        tens: 2,
        ones: 9,
        valid: true
      });

      const rollLegacy = calculatePercentileRoll([
        { value: 8, themeColor: '#182734' },
        { value: 5, themeColor: '#77d19e' }
      ]);
      expect(rollLegacy).toEqual({
        total: 58,
        tens: 5,
        ones: 8,
        valid: true
      });
    });
  });
});

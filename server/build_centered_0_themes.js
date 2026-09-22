import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../client');

const origThemeDir = path.join(root, 'node_modules/@3d-dice/dice-themes/themes/default');
const origDiffPath = path.join(origThemeDir, 'diffuse-light.png');
const origNormPath = path.join(origThemeDir, 'normal.png');

async function main() {
  console.log('Loading original textures from node_modules...');
  const diffRaw = await sharp(origDiffPath).raw().toBuffer({ resolveWithObject: true });
  const normRaw = await sharp(origNormPath).raw().toBuffer({ resolveWithObject: true });

  const W_diff = 1024;
  const H_diff = 1024;
  const W_norm = 512;
  const H_norm = 512;

  // --- 1. Process Diffuse: Extract '0' of '10' and shift to center ---
  const dData = Buffer.from(diffRaw.data);
  const zeroPixels = [];

  for (let y = 800; y <= 844; y++) {
    for (let x = 352; x <= 400; x++) {
      const p = (y * W_diff + x) * 4;
      const alpha = dData[p + 3];
      if (alpha > 5) {
        const d0 = (x - 375) ** 2 + (y - 820) ** 2;
        const d1 = (x - 356) ** 2 + (y - 852.6) ** 2;
        if (d0 < d1 && y < 844) {
          zeroPixels.push({ x, y, r: dData[p], g: dData[p + 1], b: dData[p + 2], a: alpha });
        }
      }
    }
  }

  // Clear out entire '10' bounding box on diffuse
  for (let y = 795; y <= 865; y++) {
    for (let x = 330; x <= 405; x++) {
      const p = (y * W_diff + x) * 4;
      dData[p] = 0;
      dData[p + 1] = 0;
      dData[p + 2] = 0;
      dData[p + 3] = 0;
    }
  }

  // Shift to midpoint between original 1 and 0: dx = -9, dy = 16
  const shiftX = -9;
  const shiftY = 16;
  for (const pt of zeroPixels) {
    const nx = pt.x + shiftX;
    const ny = pt.y + shiftY;
    if (nx >= 0 && nx < W_diff && ny >= 0 && ny < H_diff) {
      const np = (ny * W_diff + nx) * 4;
      dData[np] = pt.r;
      dData[np + 1] = pt.g;
      dData[np + 2] = pt.b;
      dData[np + 3] = pt.a;
    }
  }

  // --- 2. Process Normal Map: Clear '1' and shift '0' ---
  const nData = Buffer.from(normRaw.data);
  const zeroNorm = [];

  for (let y = 398; y <= 422; y++) {
    for (let x = 175; x <= 200; x++) {
      const p = (y * W_norm + x) * 3;
      const r = nData[p], g = nData[p + 1], b = nData[p + 2];
      const diff = Math.abs(r - 127) + Math.abs(g - 128) + Math.abs(b - 255);
      if (diff > 5) {
        const d0 = (x - 187.5) ** 2 + (y - 410) ** 2;
        const d1 = (x - 178) ** 2 + (y - 426.3) ** 2;
        if (d0 < d1 && y < 422) {
          zeroNorm.push({ x, y, r, g, b });
        }
      }
    }
  }

  // Clear 10 area in normal map to flat vector [127, 128, 255]
  for (let y = 395; y <= 435; y++) {
    for (let x = 165; x <= 205; x++) {
      const p = (y * W_norm + x) * 3;
      nData[p] = 127;
      nData[p + 1] = 128;
      nData[p + 2] = 255;
    }
  }

  // Shift normal map '0' by dx = -5, dy = 8
  const shiftNormX = -5;
  const shiftNormY = 8;
  for (const pt of zeroNorm) {
    const nx = pt.x + shiftNormX;
    const ny = pt.y + shiftNormY;
    if (nx >= 0 && nx < W_norm && ny >= 0 && ny < H_norm) {
      const np = (ny * W_norm + nx) * 3;
      nData[np] = pt.r;
      nData[np + 1] = pt.g;
      nData[np + 2] = pt.b;
    }
  }

  // --- 3. Generate normal.png buffer ---
  const normBuffer = await sharp(nData, { raw: { width: W_norm, height: H_norm, channels: 3 } })
    .png()
    .toBuffer();

  // --- 4. Tint diffuse for tens (#77d19e) and ones (#d1cea5) ---
  async function makeDiffuse(r, g, b) {
    const tintedData = Buffer.from(dData);
    for (let i = 0; i < W_diff * H_diff; i++) {
      const a = tintedData[i * 4 + 3];
      if (a > 0) {
        tintedData[i * 4] = r;
        tintedData[i * 4 + 1] = g;
        tintedData[i * 4 + 2] = b;
      }
    }
    return sharp(tintedData, { raw: { width: W_diff, height: H_diff, channels: 4 } })
      .png()
      .toBuffer();
  }

  const tensDiffuseBuffer = await makeDiffuse(0x77, 0xd1, 0x9e); // #77d19e
  const onesDiffuseBuffer = await makeDiffuse(0xd1, 0xce, 0xa5); // #d1cea5

  // --- 5. Write to both custom-tens and custom-ones ---
  const tensDir = path.join(root, 'public/assets/dice-box/themes/custom-tens');
  fs.writeFileSync(path.join(tensDir, 'diffuse-light.png'), tensDiffuseBuffer);
  fs.writeFileSync(path.join(tensDir, 'diffuse-dark.png'), tensDiffuseBuffer);
  fs.writeFileSync(path.join(tensDir, 'normal.png'), normBuffer);
  console.log('Saved updated textures to custom-tens (#77d19e)');

  const onesDir = path.join(root, 'public/assets/dice-box/themes/custom-ones');
  fs.writeFileSync(path.join(onesDir, 'diffuse-light.png'), onesDiffuseBuffer);
  fs.writeFileSync(path.join(onesDir, 'diffuse-dark.png'), onesDiffuseBuffer);
  fs.writeFileSync(path.join(onesDir, 'normal.png'), normBuffer);
  console.log('Saved updated textures to custom-ones (#d1cea5)');

  console.log('All textures successfully generated with centered 0 and cleaned normal map!');
}

main().catch(console.error);

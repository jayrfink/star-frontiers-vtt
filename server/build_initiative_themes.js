import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../client');

const origThemeDir = path.join(root, 'node_modules/@3d-dice/dice-themes/themes/default');
const origDiffPath = path.join(origThemeDir, 'diffuse-light.png');
const origNormPath = path.join(origThemeDir, 'normal.png');
const tensDir = path.join(root, 'public/assets/dice-box/themes/custom-tens');

async function main() {
  console.log('Loading textures for initiative dice...');
  const diffRaw = await sharp(origDiffPath).raw().toBuffer({ resolveWithObject: true });
  const normRaw = await sharp(origNormPath).raw().toBuffer({ resolveWithObject: true });

  const W_diff = 1024;
  const H_diff = 1024;
  const W_norm = 512;
  const H_norm = 512;

  // 1. Process Diffuse: Extract '0' of '10' and shift to center
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

  // 2. Process Normal Map
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

  for (let y = 395; y <= 435; y++) {
    for (let x = 165; x <= 205; x++) {
      const p = (y * W_norm + x) * 3;
      nData[p] = 127;
      nData[p + 1] = 128;
      nData[p + 2] = 255;
    }
  }

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

  const normBuffer = await sharp(nData, { raw: { width: W_norm, height: H_norm, channels: 3 } })
    .png()
    .toBuffer();

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

  const filesToCopy = ['default.json', 'package.json', 'specular.jpg', 'theme.config.json'];

  // Player theme: #b5eeff
  const playerDiffuse = await makeDiffuse(0xb5, 0xee, 0xff);
  const playerDir = path.join(root, 'public/assets/dice-box/themes/custom-init-player');
  if (!fs.existsSync(playerDir)) fs.mkdirSync(playerDir, { recursive: true });
  for (const f of filesToCopy) {
    fs.copyFileSync(path.join(tensDir, f), path.join(playerDir, f));
  }
  fs.writeFileSync(path.join(playerDir, 'diffuse-light.png'), playerDiffuse);
  fs.writeFileSync(path.join(playerDir, 'diffuse-dark.png'), playerDiffuse);
  fs.writeFileSync(path.join(playerDir, 'normal.png'), normBuffer);
  console.log('Generated custom-init-player theme (#b5eeff)');

  // Opposition theme: #c9abb9
  const oppDiffuse = await makeDiffuse(0xc9, 0xab, 0xb9);
  const oppDir = path.join(root, 'public/assets/dice-box/themes/custom-init-opp');
  if (!fs.existsSync(oppDir)) fs.mkdirSync(oppDir, { recursive: true });
  for (const f of filesToCopy) {
    fs.copyFileSync(path.join(tensDir, f), path.join(oppDir, f));
  }
  fs.writeFileSync(path.join(oppDir, 'diffuse-light.png'), oppDiffuse);
  fs.writeFileSync(path.join(oppDir, 'diffuse-dark.png'), oppDiffuse);
  fs.writeFileSync(path.join(oppDir, 'normal.png'), normBuffer);
  console.log('Generated custom-init-opp theme (#c9abb9)');
}

main().catch(console.error);

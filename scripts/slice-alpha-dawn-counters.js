import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const scriptDir = new URL('.', import.meta.url).pathname;
const inputFile = path.join(scriptDir, '../assets/rpg/Alpha Dawn printables/SF7007-Counters.jpg');
const outputDir = path.join(scriptDir, '../client/public/tokens/rpg');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Extract a few placeholder tokens for the RPG VTT
export const regions = [
  { name: 'character_human.png', left: 150, top: 1800, width: 90, height: 90 },
  { name: 'character_yazirian.png', left: 250, top: 1800, width: 90, height: 90 },
  { name: 'character_vrusk.png', left: 150, top: 1950, width: 90, height: 90 },
  { name: 'character_dralasite.png', left: 900, top: 2000, width: 90, height: 90 },
  { name: 'alien_sathar.png', left: 900, top: 700, width: 90, height: 90 },
  { name: 'npc_pirate.png', left: 150, top: 1100, width: 90, height: 90 }
];

export async function slice() {
  for (const region of regions) {
    const circleMask = Buffer.from(
      `<svg width="${region.width}" height="${region.height}"><circle cx="${region.width / 2}" cy="${region.height / 2}" r="${Math.min(region.width, region.height) / 2}" fill="white" /></svg>`
    );

    await sharp(inputFile)
      .extract({ left: region.left, top: region.top, width: region.width, height: region.height })
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(outputDir, region.name));
    console.log(`Extracted ${region.name}`);
  }
}

slice().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

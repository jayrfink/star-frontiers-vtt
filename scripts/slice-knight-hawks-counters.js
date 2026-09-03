import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const scriptDir = new URL('.', import.meta.url).pathname;
const inputFile = path.join(scriptDir, '../assets/space/Knight Hawks printables/Star Frontiers-7011-Knight Hawks-counters.jpg');
const outputDir = path.join(scriptDir, '../client/public/tokens/space');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Extract key counters for testing (UPF Assault Scout, Sathar Destroyer, Volturnus)
export const regions = [
  { name: 'upf_assault_scout.png', left: 45, top: 57, width: 90, height: 90 },
  { name: 'sathar_destroyer.png', left: 500, top: 500, width: 90, height: 90 },
  { name: 'planet_volturnus.png', left: 800, top: 800, width: 150, height: 150 }
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

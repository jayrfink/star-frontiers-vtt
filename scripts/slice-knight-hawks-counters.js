import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputFile = path.join(process.cwd(), 'assets/space/Knight Hawks printables/Star Frontiers-7011-Knight Hawks-counters.jpg');
const outputDir = path.join(process.cwd(), 'client/public/tokens/space');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Just extract a few key counters for testing (UPF Assault Scout, Sathar Destroyer, Volturnus)
// Assumes rough crop coordinates for testing the VTT engine
export const regions = [
  { name: 'upf_assault_scout.png', left: 45, top: 57, width: 90, height: 90 },
  { name: 'sathar_destroyer.png', left: 500, top: 500, width: 90, height: 90 },
  { name: 'planet_volturnus.png', left: 800, top: 800, width: 150, height: 150 }
];

export async function slice() {
  for (const region of regions) {
    await sharp(inputFile)
      .extract({ left: region.left, top: region.top, width: region.width, height: region.height })
      .png()
      .toFile(path.join(outputDir, region.name));
    console.log(`Extracted ${region.name}`);
  }
}

slice().catch(console.error);

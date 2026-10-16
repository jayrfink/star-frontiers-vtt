import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createDb } from '../server/src/db.js';
import { generateNpcStats, generateCreatureStats, validateAdversaryTemplate } from '../server/src/adversaryMathEngine.js';
import { generateTokenRingImage } from '../server/src/tokenImagePipeline.js';
import { spawnAdversaries } from '../server/src/adversarySpawner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_UPLOADS_DIR = path.join(__dirname, '../data/uploads');

/**
 * Stock an encounter on a tactical map.
 */
export async function stockEncounter(options = {}) {
  const db = options.db || createDb();
  const uploadsDir = options.uploadsDir || DEFAULT_UPLOADS_DIR;
  const count = Math.max(1, parseInt(options.count, 10) || 1);

  // 1. Synthesize AdversaryTemplate
  let template;
  if (options.json) {
    template = typeof options.json === 'string' ? JSON.parse(options.json) : options.json;
  } else {
    const category = (options.category || 'npc').toLowerCase();
    const threatTier = Math.min(5, Math.max(1, parseInt(options.threat_tier || options.tier, 10) || 2));
    const name = options.name || (category === 'creature' ? 'Alien Creature' : 'Trooper');

    if (category === 'creature') {
      const attacks = Array.isArray(options.attacks)
        ? options.attacks
        : typeof options.attacks === 'string'
        ? options.attacks.split(',').map((s) => s.trim())
        : ['Bite', 'Claws'];
      const traits = Array.isArray(options.traits)
        ? options.traits
        : typeof options.traits === 'string'
        ? options.traits.split(',').map((s) => ({ name: s.trim(), description: 'Special creature trait.' }))
        : undefined;

      template = generateCreatureStats(threatTier, {
        name,
        attacks,
        traits,
        diet: options.diet,
        size: options.size,
      });
    } else {
      template = generateNpcStats(threatTier, {
        name,
        race: options.species || options.race,
        weapon: options.weapon,
        armor: options.armor,
      });
    }
  }

  // Ensure template IDs are aligned
  if (!template.template_id && template.id) {
    template.template_id = template.id;
  }
  if (!template.id && template.template_id) {
    template.id = template.template_id;
  }

  // Validate template schema
  validateAdversaryTemplate(template);

  // 2. Token Image Generation
  const tokensUploadDir = path.join(uploadsDir, 'tokens');
  if (!fs.existsSync(tokensUploadDir)) {
    fs.mkdirSync(tokensUploadDir, { recursive: true });
  }

  const tokenImageFilename = `${template.template_id}.png`;
  const tokenImagePath = path.join(tokensUploadDir, tokenImageFilename);

  const sourceImage = options.source_image || options.image || null;
  if (!fs.existsSync(tokenImagePath) || sourceImage) {
    await generateTokenRingImage({
      sourceImagePath: sourceImage,
      outputPath: tokenImagePath,
      label: template.name,
      threatTier: template.threat_tier,
      size: 256,
      ringThickness: 12,
    });
  }

  template.token_image_path = `/uploads/tokens/${tokenImageFilename}`;

  // 3. Resolve target map
  let map;
  if (options.map_id) {
    map = db.prepare('SELECT * FROM maps WHERE id = ?').get(options.map_id);
  }
  if (!map) {
    map = db.prepare("SELECT * FROM maps WHERE is_active = 1 AND map_type = 'rpg' LIMIT 1").get();
  }
  if (!map) {
    map = db.prepare("SELECT * FROM maps WHERE map_type = 'rpg' ORDER BY id ASC LIMIT 1").get();
  }
  if (!map) {
    map = db.prepare('SELECT * FROM maps ORDER BY id ASC LIMIT 1').get();
  }
  if (!map) {
    const insertMap = db.prepare(`
      INSERT INTO maps (name, map_type, is_active, grid_size, width, height)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = insertMap.run('Staging Battle Map', 'rpg', 1, 40, 30, 30);
    map = db.prepare('SELECT * FROM maps WHERE id = ?').get(info.lastInsertRowid);
  }

  // 4. Spawn tokens using spawnAdversaries
  const spawnResult = await spawnAdversaries({
    db,
    io: options.io || null,
    mapId: map.id,
    template,
    count,
  });

  return {
    map,
    template: spawnResult.template,
    tokens: spawnResult.tokens,
  };
}

// CLI entry point
function parseCliArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-/g, '_');
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

if (process.argv[1] === __filename) {
  (async () => {
    try {
      const args = parseCliArgs(process.argv);
      const result = await stockEncounter(args);
      console.log(`\n=== Adversary Stocking Complete ===`);
      console.log(`Map: "${result.map.name}" (ID: ${result.map.id})`);
      console.log(`Template: "${result.template.name}" [${result.template.id || result.template.template_id}] (Tier ${result.template.threat_tier} ${result.template.category.toUpperCase()})`);
      console.log(`Token Image: ${result.template.token_image_path}`);
      console.log(`Spawned ${result.tokens.length} tokens:`);
      for (const t of result.tokens) {
        console.log(`  - ${t.name}: x=${t.x}, y=${t.y}, HP=${t.current_hp}/${t.max_hp}, SEU=${t.seu_current ?? 'N/A'}`);
      }
      process.exit(0);
    } catch (err) {
      console.error('Error stocking encounter:', err);
      process.exit(1);
    }
  })();
}

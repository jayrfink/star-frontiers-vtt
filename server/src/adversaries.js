import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from './middleware.js';
import { validateAdversaryTemplate, generateNpcStats, generateCreatureStats } from './adversaryMathEngine.js';
import { spawnAdversaries } from './adversarySpawner.js';
import { generateTokenRingImage } from './tokenImagePipeline.js';
import { generateTokenArtFromDescription } from './imageGeneratorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');

function safeJsonParse(val, fallback) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export function formatAdversary(row) {
  if (!row) return null;
  return {
    template_id: row.id,
    name: row.name,
    category: row.category,
    threat_tier: row.threat_tier,
    token_image_path: row.token_image_path,
    token_size: row.token_size,
    hp_max: row.hp_max,
    defense_summary: row.defense_summary,
    movement: row.movement,
    initiative_mod: row.initiative_mod,
    actions: safeJsonParse(row.actions, []),
    traits: safeJsonParse(row.traits, []),
    system_data: safeJsonParse(row.system_data, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function createAdversariesRouter(db, io) {
  const router = Router();
  router.use(requireAuth);

  // GET /api/adversaries - List all templates
  router.get('/', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM adversary_templates ORDER BY threat_tier ASC, name ASC').all();
      res.json(rows.map(formatAdversary));
    } catch (err) {
      console.error('Error listing adversaries:', err);
      res.status(500).json({ error: 'Failed to list adversaries' });
    }
  });

  // GET /api/adversaries/:id - Get specific template
  router.get('/:id', (req, res) => {
    try {
      const row = db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(req.params.id);
      if (!row) {
        return res.status(404).json({ error: 'Adversary template not found' });
      }
      res.json(formatAdversary(row));
    } catch (err) {
      console.error('Error fetching adversary:', err);
      res.status(500).json({ error: 'Failed to fetch adversary' });
    }
  });

  // POST /api/adversaries/generate-token-art - Generate AI token portrait & masked ring
  router.post('/generate-token-art', async (req, res) => {
    try {
      const { prompt, name, species, category, threat_tier, weapon, armor, attacks } = req.body;
      const result = await generateTokenArtFromDescription({
        prompt,
        name,
        species,
        category,
        threat_tier: Number(threat_tier) || 2,
        weapon,
        armor,
        attacks,
      });
      res.json(result);
    } catch (err) {
      console.error('Error generating AI token art:', err);
      const statusCode = err.status || (err.code === 'RATE_LIMITED' ? 429 : 500);
      res.status(statusCode).json({
        error: err.code === 'RATE_LIMITED' ? 'Rate limit reached' : 'Failed to generate token art',
        message: err.message,
        retryAfter: err.retryAfter,
      });
    }
  });

  // POST /api/adversaries - Register / create template
  router.post('/', (req, res) => {
    try {
      const validation = validateAdversaryTemplate(req.body);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Invalid template payload', details: validation.errors });
      }

      const {
        template_id,
        name,
        category,
        threat_tier,
        token_image_path = '',
        token_size = 1,
        hp_max,
        defense_summary = '',
        movement = '12 m/s',
        initiative_mod = 0,
        actions = [],
        traits = [],
        system_data = {},
      } = req.body;

      const actionsStr = JSON.stringify(actions);
      const traitsStr = JSON.stringify(traits);
      const systemDataStr = JSON.stringify(system_data);

      const stmt = db.prepare(`
        INSERT INTO adversary_templates (
          id, name, category, threat_tier, token_image_path, token_size,
          hp_max, defense_summary, movement, initiative_mod,
          actions, traits, system_data
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          category = excluded.category,
          threat_tier = excluded.threat_tier,
          token_image_path = excluded.token_image_path,
          token_size = excluded.token_size,
          hp_max = excluded.hp_max,
          defense_summary = excluded.defense_summary,
          movement = excluded.movement,
          initiative_mod = excluded.initiative_mod,
          actions = excluded.actions,
          traits = excluded.traits,
          system_data = excluded.system_data,
          updated_at = CURRENT_TIMESTAMP
      `);

      stmt.run(
        template_id, name, category, threat_tier, token_image_path, token_size,
        hp_max, defense_summary, movement, initiative_mod,
        actionsStr, traitsStr, systemDataStr
      );

      const saved = db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(template_id);
      const formatted = formatAdversary(saved);

      if (io) {
        io.emit('adversary:saved', { template: formatted });
      }

      res.status(201).json(formatted);
    } catch (err) {
      console.error('Error creating adversary:', err);
      res.status(500).json({ error: 'Failed to save adversary template' });
    }
  });

  // POST /api/adversaries/spawn - Spawn N tokens on a map
  router.post('/spawn', async (req, res) => {
    try {
      const { mapId, templateId, template: templateInput, count = 1, source_image_url } = req.body;
      if (!mapId) {
        return res.status(400).json({ error: 'mapId is required' });
      }

      let templateObj;
      if (templateId) {
        const row = db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(templateId);
        if (!row) {
          return res.status(404).json({ error: `Adversary template with id "${templateId}" not found` });
        }
        templateObj = formatAdversary(row);
      } else if (templateInput && typeof templateInput === 'object') {
        if (!templateInput.actions || templateInput.actions.length === 0) {
          const threatTier = Math.min(5, Math.max(1, parseInt(templateInput.threat_tier || templateInput.tier, 10) || 2));
          if (templateInput.category === 'creature') {
            const attacks = Array.isArray(templateInput.attacks)
              ? templateInput.attacks
              : typeof templateInput.attacks === 'string'
              ? templateInput.attacks.split(',').map((s) => s.trim())
              : ['Bite', 'Claws'];
            const traits = Array.isArray(templateInput.traits)
              ? templateInput.traits
              : typeof templateInput.traits === 'string'
              ? templateInput.traits.split(',').map((s) => ({ name: s.trim(), description: 'Special creature trait.' }))
              : undefined;

            templateObj = generateCreatureStats(threatTier, {
              name: templateInput.name,
              attacks,
              traits,
              diet: templateInput.diet,
              size: templateInput.size,
            });
          } else {
            templateObj = generateNpcStats(threatTier, {
              name: templateInput.name,
              race: templateInput.species || templateInput.race,
              weapon: templateInput.weapon,
              armor: templateInput.armor,
            });
          }
        } else {
          templateObj = { ...templateInput };
        }
      } else {
        return res.status(400).json({ error: 'Either templateId or template object is required' });
      }

      if (!templateObj.template_id && templateObj.id) {
        templateObj.template_id = templateObj.id;
      }
      if (!templateObj.id && templateObj.template_id) {
        templateObj.id = templateObj.template_id;
      }

      // Handle token image generation / circular masking
      const tokensUploadDir = path.join(DATA_DIR, 'uploads/tokens');
      if (!fs.existsSync(tokensUploadDir)) {
        fs.mkdirSync(tokensUploadDir, { recursive: true });
      }

      const tokenFileName = `${templateObj.template_id}.png`;
      const tokenOutputPath = path.join(tokensUploadDir, tokenFileName);

      let sourceDiskPath = null;
      if (source_image_url) {
        const rel = source_image_url.startsWith('/uploads/')
          ? source_image_url.replace(/^\/uploads\//, '')
          : source_image_url.replace(/^\//, '');
        const candidate = path.join(DATA_DIR, 'uploads', rel);
        if (fs.existsSync(candidate)) {
          sourceDiskPath = candidate;
        }
      }

      if (sourceDiskPath) {
        if (source_image_url.includes('/tokens/')) {
          fs.copyFileSync(sourceDiskPath, tokenOutputPath);
          templateObj.token_image_path = `/uploads/tokens/${tokenFileName}`;
        } else {
          await generateTokenRingImage({
            sourceImagePath: sourceDiskPath,
            outputPath: tokenOutputPath,
            threatTier: templateObj.threat_tier,
            category: templateObj.category,
            label: templateObj.name,
            size: 256,
          });
          templateObj.token_image_path = `/uploads/tokens/${tokenFileName}`;
        }
      } else if (!fs.existsSync(tokenOutputPath) || !templateObj.token_image_path) {
        await generateTokenRingImage({
          outputPath: tokenOutputPath,
          threatTier: templateObj.threat_tier,
          category: templateObj.category,
          label: templateObj.name,
          size: 256,
        });
        templateObj.token_image_path = `/uploads/tokens/${tokenFileName}`;
      }

      const result = await spawnAdversaries({
        db,
        io,
        mapId: Number(mapId),
        template: templateObj,
        count: Math.max(1, parseInt(count, 10) || 1),
      });

      res.status(201).json(result);
    } catch (err) {
      console.error('Error spawning adversaries:', err);
      res.status(500).json({ error: 'Failed to spawn adversaries', message: err.message });
    }
  });

  // DELETE /api/adversaries/:id
  router.delete('/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT id FROM adversary_templates WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Adversary template not found' });
      }

      db.prepare('DELETE FROM adversary_templates WHERE id = ?').run(req.params.id);

      if (io) {
        io.emit('adversary:deleted', { id: req.params.id });
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting adversary:', err);
      res.status(500).json({ error: 'Failed to delete adversary template' });
    }
  });

  return router;
}

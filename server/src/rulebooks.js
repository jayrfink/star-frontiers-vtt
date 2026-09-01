import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from './middleware.js';
import { extractRulebooks } from '../scripts/extract-rulebooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULEBOOKS_JSON = path.join(__dirname, '../../data/rulebooks.json');

export function createRulebooksRouter() {
  const router = Router();

  router.get('/', requireAuth, async (req, res) => {
    try {
      if (!fs.existsSync(RULEBOOKS_JSON)) {
        await extractRulebooks();
      }
      const data = fs.readFileSync(RULEBOOKS_JSON, 'utf-8');
      res.json(JSON.parse(data));
    } catch (err) {
      console.error('Error fetching rulebooks:', err);
      res.status(500).json({ error: 'Failed to load rulebooks' });
    }
  });

  return router;
}

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from './middleware.js';
import { extractRulebooks } from '../scripts/extract-rulebooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULEBOOKS_JSON = path.join(__dirname, '../../data/rulebooks.json');

const BOOK_FILES = {
  'ad-basic': 'SF7007-AlphaDawn-Basic_Game_Rules.pdf',
  'ad-expanded': 'SF7007-AlphaDawn-Expanded_Game_Rules.pdf',
  'ad-volturnus': 'SF7007-AlphaDawn-Crash_on_Volturnus.pdf',
  'kh-basic': 'Star_Frontiers-7011-Knight_Hawks-Basic_Rules.pdf',
  'kh-expansion': 'Star_Frontiers-7011-Knight_Hawks-Expansion_Rules.pdf',
  'kh-mission': 'Star_Frontiers-7011-Knight_Hawks-Mission_Brief.pdf',
};

export function createRulebooksRouter() {
  const router = Router();

  router.get('/pdf/:bookId', requireAuth, (req, res) => {
    const fileName = BOOK_FILES[req.params.bookId];
    if (!fileName) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const filePath = path.join(__dirname, '../../assets/rulebooks', fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF file missing' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    fs.createReadStream(filePath).pipe(res);
  });

  router.get('/', requireAuth, async (req, res) => {
    try {
      if (!fs.existsSync(RULEBOOKS_JSON)) {
        await extractRulebooks();
      }
      const data = fs.readFileSync(RULEBOOKS_JSON, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    } catch (err) {
      console.error('Error fetching rulebooks:', err);
      res.status(500).json({ error: 'Failed to load rulebooks' });
    }
  });

  return router;
}

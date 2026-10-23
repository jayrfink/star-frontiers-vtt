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

let extractionPromise = null;

export async function ensureRulebooksExtracted() {
  if (fs.existsSync(RULEBOOKS_JSON)) {
    return;
  }
  if (!extractionPromise) {
    extractionPromise = extractRulebooks().finally(() => {
      extractionPromise = null;
    });
  }
  return extractionPromise;
}

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

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream PDF' });
      } else {
        res.end();
      }
    });

    res.on('close', () => {
      stream.destroy();
    });

    stream.pipe(res);
  });

  router.get('/', requireAuth, async (req, res) => {
    try {
      await ensureRulebooksExtracted();
      const data = fs.readFileSync(RULEBOOKS_JSON, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    } catch (err) {
      console.error('Error fetching rulebooks:', err);
      res.status(500).json({ error: 'Failed to load rulebooks' });
    }
  });

  // Legacy page endpoints
  router.get('/page/:id', requireAuth, async (req, res) => {
    try {
      await ensureRulebooksExtracted();
      if (!fs.existsSync(RULEBOOKS_JSON)) {
        return res.status(404).json({ error: 'Rulebook page not found' });
      }
      const data = JSON.parse(fs.readFileSync(RULEBOOKS_JSON, 'utf-8'));
      const page = data.find(p => p.id === req.params.id);
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }
      res.json(page);
    } catch (err) {
      console.error('Error fetching page:', err);
      res.status(500).json({ error: 'Failed to load page' });
    }
  });

  router.get('/:bookId/page/:page', requireAuth, async (req, res) => {
    try {
      await ensureRulebooksExtracted();
      if (!fs.existsSync(RULEBOOKS_JSON)) {
        return res.status(404).json({ error: 'Rulebook page not found' });
      }
      const pageNum = parseInt(req.params.page, 10);
      const data = JSON.parse(fs.readFileSync(RULEBOOKS_JSON, 'utf-8'));
      const page = data.find(p => p.bookId === req.params.bookId && p.page === pageNum);
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }
      res.json(page);
    } catch (err) {
      console.error('Error fetching book page:', err);
      res.status(500).json({ error: 'Failed to load page' });
    }
  });

  router.get('/:bookId', requireAuth, async (req, res) => {
    if (req.params.bookId === 'pdf' || req.params.bookId === 'page') {
      return res.status(404).json({ error: 'Route not found' });
    }
    try {
      await ensureRulebooksExtracted();
      if (!fs.existsSync(RULEBOOKS_JSON)) {
        return res.status(404).json({ error: 'Rulebooks not found' });
      }
      const data = JSON.parse(fs.readFileSync(RULEBOOKS_JSON, 'utf-8'));
      const pages = data.filter(p => p.bookId === req.params.bookId);
      if (pages.length === 0) {
        return res.status(404).json({ error: 'Book not found' });
      }
      res.json(pages);
    } catch (err) {
      console.error('Error fetching book:', err);
      res.status(500).json({ error: 'Failed to load book' });
    }
  });

  return router;
}

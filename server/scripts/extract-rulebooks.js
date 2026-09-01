import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULEBOOKS_DIR = path.join(__dirname, '../../assets/rulebooks');
const OUTPUT_FILE = path.join(__dirname, '../../data/rulebooks.json');

const BOOKS = [
  { file: 'SF7007-AlphaDawn-Basic_Game_Rules.pdf', bookId: 'ad-basic', bookTitle: 'Alpha Dawn Basic Game Rules', system: 'Alpha Dawn' },
  { file: 'SF7007-AlphaDawn-Expanded_Game_Rules.pdf', bookId: 'ad-expanded', bookTitle: 'Alpha Dawn Expanded Game Rules', system: 'Alpha Dawn' },
  { file: 'SF7007-AlphaDawn-Crash_on_Volturnus.pdf', bookId: 'ad-volturnus', bookTitle: 'Crash on Volturnus Module', system: 'Alpha Dawn' },
  { file: 'Star_Frontiers-7011-Knight_Hawks-Basic_Rules.pdf', bookId: 'kh-basic', bookTitle: 'Knight Hawks Basic Rules', system: 'Knight Hawks' },
  { file: 'Star_Frontiers-7011-Knight_Hawks-Expansion_Rules.pdf', bookId: 'kh-expansion', bookTitle: 'Knight Hawks Expansion Rules', system: 'Knight Hawks' },
  { file: 'Star_Frontiers-7011-Knight_Hawks-Mission_Brief.pdf', bookId: 'kh-mission', bookTitle: 'Knight Hawks Mission Brief', system: 'Knight Hawks' }
];

export async function extractRulebooks() {
  const allEntries = [];

  for (const b of BOOKS) {
    const filePath = path.join(RULEBOOKS_DIR, b.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer, {
      pagerender: function (pageData) {
        return pageData.getTextContent().then(textContent => {
          let lastY, text = '';
          for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
              text += item.str + ' ';
            } else {
              text += '\n' + item.str + ' ';
            }
            lastY = item.transform[5];
          }
          return text;
        });
      }
    });

    const pages = pdfData.text.split(/\n\s*\n\s*\n|\f/);
    let pageNum = 1;
    for (let pageContent of pages) {
      const cleanContent = pageContent.replace(/\s+/g, ' ').trim();
      if (cleanContent.length > 20) {
        allEntries.push({
          id: `${b.bookId}-p${pageNum}`,
          bookId: b.bookId,
          bookTitle: b.bookTitle,
          system: b.system,
          page: pageNum,
          section: `Page ${pageNum}`,
          content: cleanContent
        });
      }
      pageNum++;
    }
  }

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allEntries, null, 2));
  console.log(`Extracted ${allEntries.length} pages/sections to ${OUTPUT_FILE}`);
  return allEntries;
}

if (process.argv[1] && process.argv[1].endsWith('extract-rulebooks.js')) {
  extractRulebooks().catch(console.error);
}

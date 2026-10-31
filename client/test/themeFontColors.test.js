import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Global Font Color Theming (#cecece)', () => {
  const cssPath = path.resolve(__dirname, '../src/main.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('defines --text-primary as #cecece in main.css', () => {
    expect(cssContent).toMatch(/--text-primary:\s*#cecece;/);
  });

  it('ensures no white or near-white color declarations remain in main.css', () => {
    expect(cssContent).not.toMatch(/color:\s*(#ffffff|#fff\b|white\b|#f0f6fc|#e6edf3|#e0e0e0)/i);
  });
});

describe('View-specific Font Color Theming', () => {
  const views = [
    { name: 'CharacterSheetsView.vue', path: path.resolve(__dirname, '../src/views/CharacterSheetsView.vue') },
    { name: 'ShipSheetsView.vue', path: path.resolve(__dirname, '../src/views/ShipSheetsView.vue') },
    { name: 'GmNotesView.vue', path: path.resolve(__dirname, '../src/views/GmNotesView.vue') },
    { name: 'SpaceVttView.vue', path: path.resolve(__dirname, '../src/views/SpaceVttView.vue') },
    { name: 'RpgVttView.vue', path: path.resolve(__dirname, '../src/views/RpgVttView.vue') },
  ];

  views.forEach(({ name, path: viewPath }) => {
    it(`ensures ${name} uses #cecece for primary text and fill-in fields`, () => {
      const content = fs.readFileSync(viewPath, 'utf-8');
      expect(content).toMatch(/#cecece/);
      // Ensure no raw white or near-white color rules remain
      const whiteMatches = content.match(/(?:color|-webkit-text-fill-color)\s*:\s*(?:#ffffff|#fff\b|white\b|#f8fafc|#f1f5f9|#f0f6fc|#e6edf3|#e0e0e0|#d0d0d0)\b/gi);
      expect(whiteMatches).toBeNull();
    });
  });
});

describe('Muted Steel-Cyan Theme Migration (#3a859c -> #45acba)', () => {
  const files = [
    path.resolve(__dirname, '../src/main.css'),
    path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'),
    path.resolve(__dirname, '../src/views/ShipSheetsView.vue'),
    path.resolve(__dirname, '../src/views/AdminView.vue'),
  ];

  it('ensures no #3a859c declarations remain and #45acba is present', () => {
    files.forEach(f => {
      const content = fs.readFileSync(f, 'utf-8');
      expect(content).not.toMatch(/#3a859c/i);
      expect(content).toMatch(/#45acba/i);
    });
  });
});

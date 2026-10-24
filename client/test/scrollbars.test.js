import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Global Base Scrollbar Theme (main.css)', () => {
  const cssPath = path.resolve(__dirname, '../src/main.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('defines standard scrollbar-width and scrollbar-color on *', () => {
    expect(cssContent).toMatch(/scrollbar-width:\s*thin;/);
    expect(cssContent).toMatch(/scrollbar-color:\s*rgba\(0,\s*255,\s*255,\s*0\.3\)\s*#0d1117;/);
  });

  it('defines WebKit scrollbar dimensions', () => {
    expect(cssContent).toMatch(/::-webkit-scrollbar\s*\{[^}]*width:\s*8px;[^}]*height:\s*8px;/);
  });

  it('styles WebKit scrollbar track', () => {
    expect(cssContent).toMatch(/::-webkit-scrollbar-track\s*\{[^}]*background:\s*#0d1117;[^}]*border-radius:\s*4px;/);
  });

  it('styles WebKit scrollbar thumb with border-radius, background, and hover effects', () => {
    expect(cssContent).toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*rgba\(0,\s*255,\s*255,\s*0\.25\);/);
    expect(cssContent).toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*border-radius:\s*4px;/);
    expect(cssContent).toMatch(/::-webkit-scrollbar-thumb:hover\s*\{[^}]*background:\s*rgba\(0,\s*255,\s*255,\s*0\.5\);/);
    expect(cssContent).toMatch(/::-webkit-scrollbar-thumb:hover\s*\{[^}]*border-color:\s*#00ffff;/);
  });

  it('styles WebKit scrollbar corner', () => {
    expect(cssContent).toMatch(/::-webkit-scrollbar-corner\s*\{[^}]*background:\s*#0d1117;/);
  });
});

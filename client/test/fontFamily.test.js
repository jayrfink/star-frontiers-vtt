import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Sitewide Font Family (D&D Beyond Character Sheet Font - Roboto)', () => {
  const indexHtmlPath = path.resolve(__dirname, '../index.html');
  const mainCssPath = path.resolve(__dirname, '../src/main.css');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  const mainCss = fs.readFileSync(mainCssPath, 'utf-8');

  it('loads Roboto from Google Fonts in index.html', () => {
    expect(indexHtml).toMatch(/fonts\.googleapis\.com\/css2\?family=.*Roboto/);
    expect(indexHtml).toMatch(/rel=["']preconnect["']\s+href=["']https:\/\/fonts\.googleapis\.com["']/);
  });

  it('defines local @font-face rules for offline and local serving in main.css', () => {
    expect(mainCss).toMatch(/@font-face\s*\{[^}]*font-family:\s*['"]Roboto['"][^}]*src:\s*url\(['"]\/fonts\/Roboto-Regular\.ttf['"]\)/);
    expect(mainCss).toMatch(/@font-face\s*\{[^}]*font-family:\s*['"]Roboto['"][^}]*src:\s*url\(['"]\/fonts\/Roboto-Bold\.ttf['"]\)/);
  });

  it('defines local @font-face rules for Modesto header font in main.css', () => {
    expect(mainCss).toMatch(/@font-face\s*\{[^}]*font-family:\s*['"]Modesto['"][^}]*src:\s*url\(['"]\/fonts\/Modesto-Regular\.otf['"]\)/);
    expect(mainCss).toMatch(/@font-face\s*\{[^}]*font-family:\s*['"]Modesto['"][^}]*src:\s*url\(['"]\/fonts\/Modesto-Bold\.otf['"]\)/);
  });

  it('sets Consolas with fall through to Roboto as font-family on headings in main.css', () => {
    expect(mainCss).toMatch(/--font-family-header:\s*['"]?Consolas['"]?,\s*['"]?Roboto['"]?/);
    expect(mainCss).toMatch(/h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6[^{]*\{[^}]*font-family:\s*var\(--font-family-header\)/);
  });

  it('sets Consolas with fallback to Roboto on SFVTT brand title in NavBar.vue and main.css', () => {
    const navBarPath = path.resolve(__dirname, '../src/components/NavBar.vue');
    const navBarContent = fs.readFileSync(navBarPath, 'utf-8');
    expect(navBarContent).toMatch(/\.navbar-brand\s*\{[^}]*font-family:\s*var\(--font-family-header/);
    expect(mainCss).toMatch(/\.navbar-brand/);
  });

  it('defines 10% larger font sizes for headings in main.css', () => {
    expect(mainCss).toMatch(/h1\s*\{[^}]*font-size:\s*2\.2rem;/);
    expect(mainCss).toMatch(/h2\s*\{[^}]*font-size:\s*1\.65rem;/);
    expect(mainCss).toMatch(/h3\s*\{[^}]*font-size:\s*1\.3rem;/);
    expect(mainCss).toMatch(/h4\s*\{[^}]*font-size:\s*1\.1rem;/);
  });

  it('sets Roboto as the primary font-family on body in main.css', () => {
    expect(mainCss).toMatch(/font-family:\s*[^;]*['"]?Roboto['"]?[^;]*;/);
    expect(mainCss).toMatch(/body\s*\{[^}]*font-family:\s*[^;]*['"]?Roboto['"]?[^;]*;/);
  });

  it('ensures form controls inherit the sitewide font family', () => {
    expect(mainCss).toMatch(/button\s*\{[^}]*font-family:\s*inherit;/);
    expect(mainCss).toMatch(/(?:input|select|textarea)[^{]*\{[^}]*font-family:\s*inherit;/);
  });
});

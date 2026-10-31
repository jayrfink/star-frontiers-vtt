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

  it('sets Roboto as the primary font-family on body in main.css', () => {
    expect(mainCss).toMatch(/font-family:\s*[^;]*['"]?Roboto['"]?[^;]*;/);
    expect(mainCss).toMatch(/body\s*\{[^}]*font-family:\s*[^;]*['"]?Roboto['"]?[^;]*;/);
  });

  it('ensures form controls inherit the sitewide font family', () => {
    expect(mainCss).toMatch(/button\s*\{[^}]*font-family:\s*inherit;/);
    expect(mainCss).toMatch(/(?:input|select|textarea)[^{]*\{[^}]*font-family:\s*inherit;/);
  });
});

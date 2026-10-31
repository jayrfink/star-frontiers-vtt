import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Global Form Control & Number Spinner Theme (main.css)', () => {
  const cssPath = path.resolve(__dirname, '../src/main.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('defines color-scheme: dark on :root', () => {
    expect(cssContent).toMatch(/:root\s*\{[^}]*color-scheme:\s*dark;/);
  });

  it('defines color-scheme: dark on input[type="number"]', () => {
    expect(cssContent).toMatch(/input\[type=["']?number["']?\]\s*\{[^}]*color-scheme:\s*dark;/);
  });

  it('styles WebKit number input spin buttons with themed filter and pointer cursor', () => {
    expect(cssContent).toMatch(/input\[type=["']?number["']?\]::-webkit-inner-spin-button/);
    expect(cssContent).toMatch(/filter:\s*sepia\(100%\)\s*saturate\(300%\)\s*hue-rotate\(135deg\)/);
  });

  it('styles WebKit number input spin button hover with glow and increased brightness', () => {
    expect(cssContent).toMatch(/input\[type=["']?number["']?\]:hover::-webkit-inner-spin-button/);
    expect(cssContent).toMatch(/drop-shadow\(0\s*0\s*2px\s*#00ffff\)/);
  });

  it('styles select dropdowns with custom sci-fi up/down arrow SVG and appearance: none', () => {
    expect(cssContent).toMatch(/select\s*\{[^}]*appearance:\s*none;/);
    expect(cssContent).toMatch(/select\s*\{[^}]*color-scheme:\s*dark;/);
    expect(cssContent).toMatch(/background-image:\s*url\("data:image\/svg\+xml/);
  });

  it('prevents select dropdown arrows from tiling/repeating and ensures options have no background image', () => {
    expect(cssContent).toMatch(/select\s*\{[^}]*background-repeat:\s*no-repeat\s*!important;/);
    expect(cssContent).toMatch(/select\s*\{[^}]*background-position:\s*right\s+10px\s+center\s*!important;/);
    expect(cssContent).toMatch(/select:hover:not\(:disabled\)\s*\{[^}]*background-repeat:\s*no-repeat\s*!important;/);
    expect(cssContent).toMatch(/select\s+option\s*\{[^}]*background-image:\s*none\s*!important;/);
  });
});

describe('View-specific Stat Inputs Theming', () => {
  const shipSheetsPath = path.resolve(__dirname, '../src/views/ShipSheetsView.vue');
  const charSheetsPath = path.resolve(__dirname, '../src/views/CharacterSheetsView.vue');

  it('styles .stat-input in ShipSheetsView.vue with color-scheme: dark and custom spin buttons', () => {
    const content = fs.readFileSync(shipSheetsPath, 'utf-8');
    expect(content).toMatch(/\.stat-input\s*\{[^}]*color-scheme:\s*dark;/);
    expect(content).toMatch(/\.stat-input::-webkit-inner-spin-button/);
  });

  it('styles .stat-input in CharacterSheetsView.vue with color-scheme: dark and custom spin buttons', () => {
    const content = fs.readFileSync(charSheetsPath, 'utf-8');
    expect(content).toMatch(/\.stat-input\s*\{[^}]*color-scheme:\s*dark;/);
    expect(content).toMatch(/\.stat-input::-webkit-inner-spin-button/);
  });

  it('enforces color-scheme: dark on modal-card number inputs in RpgVttView.vue and SpaceVttView.vue', () => {
    const rpgPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
    const spacePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
    const rpgContent = fs.readFileSync(rpgPath, 'utf-8');
    const spaceContent = fs.readFileSync(spacePath, 'utf-8');

    expect(rpgContent).toMatch(/\.modal-card input\[type="number"\]\s*\{[^}]*color-scheme:\s*dark;/);
    expect(spaceContent).toMatch(/\.modal-card input\[type="number"\]\s*\{[^}]*color-scheme:\s*dark;/);
  });

  it('uses background-color instead of background shorthand on selects in CharacterSheetsView, ShipSheetsView, and SpaceVttView to prevent repeating arrows', () => {
    const charContent = fs.readFileSync(charSheetsPath, 'utf-8');
    const shipContent = fs.readFileSync(shipSheetsPath, 'utf-8');
    const spacePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
    const spaceContent = fs.readFileSync(spacePath, 'utf-8');

    expect(charContent).not.toMatch(/\.form-group\s+select\s*\{[^}]*background:\s*#/);
    expect(charContent).toMatch(/\.form-group\s+select\s*\{[^}]*background-color:\s*#/);
    expect(shipContent).not.toMatch(/\.form-group\s+select\s*\{[^}]*background:\s*#/);
    expect(shipContent).toMatch(/\.form-group\s+select\s*\{[^}]*background-color:\s*#/);
    expect(spaceContent).not.toMatch(/\.slingshot-select\s*\{[^}]*background:\s*#/);
    expect(spaceContent).toMatch(/\.slingshot-select\s*\{[^}]*background-color:\s*#/);
  });
});

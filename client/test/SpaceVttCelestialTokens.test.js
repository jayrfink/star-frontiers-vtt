import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SpaceVttView Celestial Tokens Integration', () => {
  const filePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('imports spaceTokens utilities', () => {
    expect(content).toMatch(/import\s*\{[^}]*isCelestialToken[^}]*\}\s*from\s*['"]\.\.\/utils\/spaceTokens(\.js)?['"]/);
    expect(content).toMatch(/import\s*\{[^}]*CELESTIAL_PRESET_NAMES[^}]*\}\s*from\s*['"]\.\.\/utils\/spaceTokens(\.js)?['"]/);
  });

  it('contains token_type in newTokenForm', () => {
    expect(content).toMatch(/token_type:\s*['"](ship|celestial)['"]/);
  });

  it('includes celestial preset buttons or chips in Add Token Modal', () => {
    expect(content).toContain('CELESTIAL_PRESET_NAMES');
    expect(content).toContain('btn-chip');
  });

  it('sends layer celestial when submitting celestial token', () => {
    const submitSection = content.slice(content.indexOf('async function submitAddToken'));
    expect(submitSection).toMatch(/layer:\s*.*celestial/);
  });

  it('guards speed, rotation, and status effects in sidebar inspector with isCelestialToken', () => {
    const inspectorSection = content.slice(content.indexOf('<!-- Selected Token Inspector -->'), content.indexOf('<!-- Token List When None Selected -->'));
    expect(inspectorSection).toMatch(/isCelestialToken/);
    expect(inspectorSection).toContain('celestial-badge');
  });
});

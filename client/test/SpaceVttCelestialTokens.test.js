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

  it('guards rotation and keyboard shortcuts with isCelestialToken', () => {
    const rotateSection = content.slice(content.indexOf('async function rotateSelectedToken'));
    expect(rotateSection).toMatch(/if\s*\(!selectedToken\.value\s*\|\|\s*isCelestialToken\(selectedToken\.value\)\)\s*return/);

    const onKeyDownSection = content.slice(content.indexOf('function onKeyDown'), content.indexOf('async function rotateSelectedToken'));
    expect(onKeyDownSection).toMatch(/if\s*\(!selectedToken\.value\s*\|\|\s*isCelestialToken\(selectedToken\.value\)\)\s*return/);
  });

  it('preserves empty color string in onTokenMoved for celestial tokens', () => {
    const movedSection = content.slice(content.indexOf('async function onTokenMoved'));
    expect(movedSection).toMatch(/const\s+isCelestial\s*=\s*isCelestialToken\(currentToken\)/);
    expect(movedSection).toMatch(/const\s+color\s*=\s*isCelestial\s*\?\s*['"]['"]\s*:/);
  });

  it('hides token-color-badge in inspector header for celestial tokens', () => {
    const headerSection = content.slice(content.indexOf('class="token-title-row"'), content.indexOf('class="celestial-badge"'));
    expect(headerSection).toMatch(/v-if="!isCelestialToken\(selectedToken\)"/);
  });

  it('hides speed/rotation and displays celestial icon in token-list for celestial tokens', () => {
    const listSection = content.slice(content.indexOf('class="token-list"'), content.indexOf('No tokens on map'));
    expect(listSection).toMatch(/!isCelestialToken\(t\)/);
    expect(listSection).toContain('token-list-celestial');
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SpaceVttCanvas Celestial Token Rendering', () => {
  const filePath = path.resolve(__dirname, '../src/components/SpaceVttCanvas.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('imports isCelestialToken in SpaceVttCanvas', () => {
    expect(content).toMatch(/import\s*\{[^}]*isCelestialToken[^}]*\}\s*from\s*['"]\.\.\/utils\/spaceTokens(\.js)?['"]/);
  });

  it('checks isCelestialToken in renderSingleToken', () => {
    const renderSection = content.slice(content.indexOf('function renderSingleToken'));
    expect(renderSection).toMatch(/const\s+isCelestial\s*=\s*isCelestialToken\(token\)/);
  });

  it('guards ring border with !isCelestial', () => {
    const renderSection = content.slice(content.indexOf('function renderSingleToken'));
    expect(renderSection).toMatch(/if\s*\(!isCelestial\)\s*\{[^}]*token\.color/);
  });

  it('guards speed badge with !isCelestial', () => {
    const renderSection = content.slice(content.indexOf('function renderSingleToken'));
    expect(renderSection).toMatch(/!isCelestial\s*&&\s*speed\s*!==\s*null/);
  });

  it('guards status effects with !isCelestial', () => {
    const renderSection = content.slice(content.indexOf('function renderSingleToken'));
    expect(renderSection).toMatch(/!isCelestial\s*&&\s*statusEffects\.length\s*>\s*0/);
  });

  it('resets rotation to 0 for celestial tokens', () => {
    const renderSection = content.slice(content.indexOf('function renderSingleToken'));
    expect(renderSection).toMatch(/isCelestial\s*\?\s*0\s*:\s*\(token\.rotation\s*\|\|\s*0\)/);
  });
});

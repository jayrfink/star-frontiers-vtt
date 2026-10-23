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

  it('sorts tokens in drawTokens so celestial tokens render before ship tokens', () => {
    const drawSection = content.slice(content.indexOf('function drawTokens'), content.indexOf('function drawGhostToken'));
    expect(drawSection).toMatch(/const\s+sortedTokens\s*=\s*\[\.\.\.props\.tokens\]\.sort\(/);
    expect(drawSection).toMatch(/isCelestialToken\(a\)\s*\?\s*0\s*:\s*1/);
    expect(drawSection).toMatch(/isCelestialToken\(b\)\s*\?\s*0\s*:\s*1/);
  });

  it('sorts tokens for hit-testing in reverse layer order (ships first, celestials last) in onMouseDown', () => {
    const mouseSection = content.slice(content.indexOf('function onMouseDown'), content.indexOf('function onMouseMove'));
    expect(mouseSection).toMatch(/const\s+hitTestOrder\s*=\s*\[\.\.\.props\.tokens\]\.sort\(/);
    expect(mouseSection).toMatch(/bCel\s*-\s*aCel/);
    expect(mouseSection).toMatch(/const\s+hitToken\s*=\s*hitTestOrder\.find\(/);
  });

  it('disconnects and nullifies resizeObserver on unmount', () => {
    const unmountSection = content.slice(content.indexOf('onBeforeUnmount('));
    expect(unmountSection).toContain('resizeObserver.disconnect()');
    expect(unmountSection).toContain('resizeObserver = null');
  });

  it('emits updates without mutating props in asset event handlers', () => {
    const assetSection = content.slice(content.indexOf('function handleAssetRenamed'), content.indexOf('const hexSize'));
    expect(assetSection).not.toMatch(/(?<!=)t\.avatar_url\s*=\s*(?!=)/);
    expect(assetSection).not.toMatch(/(?<!=)props\.map\.background_url\s*=\s*(?!=)/);
    expect(assetSection).toContain("emit('tokens-updated'");
    expect(assetSection).toContain("emit('map-updated'");
  });
});

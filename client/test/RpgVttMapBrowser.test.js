import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('RpgVttView Map Background Browser & Modal Layout', () => {
  const filePath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('defines imageBrowserTarget state with map target support', () => {
    expect(content).toMatch(/imageBrowserTarget\s*=\s*ref\(['"]token['"]\)/);
  });

  it('has openMapImageBrowser function', () => {
    expect(content).toMatch(/function openMapImageBrowser\s*\(/);
  });

  it('includes Browse Uploads button for active map in Map Manager drawer', () => {
    const activeMapSection = content.slice(content.indexOf('<!-- Active Map Settings -->'), content.indexOf('<!-- Map List -->'));
    expect(activeMapSection).toMatch(/openMapImageBrowser\(['"]active_map['"]\)/);
  });

  it('includes Browse Uploads button in Create New Map modal', () => {
    const createMapSection = content.slice(content.indexOf('<!-- Modal: Create New Map -->'), content.indexOf('<!-- Modal: Add Token -->'));
    expect(createMapSection).toMatch(/openMapImageBrowser\(['"]new_map['"]\)/);
  });

  it('updates activeMapForm and calls updateActiveMapSettings when active_map image selected', () => {
    expect(content).toMatch(/activeMapForm\.background_url\s*=\s*url/);
    expect(content).toMatch(/updateActiveMapSettings\s*\(\)/);
  });

  it('includes flex-wrap and bounds on file-btn-wrapper to prevent overflow', () => {
    expect(content).toMatch(/\.file-btn-wrapper\s*\{[^}]*flex-wrap:\s*wrap/);
  });
});

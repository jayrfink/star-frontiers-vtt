import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const views = [
  { name: 'RpgVttView', datalist: 'rpg-grid-dimension-options' },
  { name: 'SpaceVttView', datalist: 'space-grid-dimension-options' },
];

describe.each(views)('$name - Grid Dimensions in Map Manager', ({ name, datalist }) => {
  const src = fs.readFileSync(path.resolve(__dirname, `../src/views/${name}.vue`), 'utf-8');

  it('renders editable width and height inputs backed by a datalist', () => {
    expect(src).toContain('v-model.number="activeMapForm.width"');
    expect(src).toContain('v-model.number="activeMapForm.height"');
    expect(src).toContain(`list="${datalist}"`);
    expect(src).toContain(`<datalist id="${datalist}">`);
  });

  it('syncs width/height from the active map and sends them clamped on update', () => {
    expect(src).toContain('activeMapForm.width = map.width || 20;');
    expect(src).toContain('activeMapForm.height = map.height || 20;');
    expect(src).toContain('width: clampGridDimension(activeMapForm.width, activeMap.value.width)');
    expect(src).toContain('height: clampGridDimension(activeMapForm.height, activeMap.value.height)');
  });
});

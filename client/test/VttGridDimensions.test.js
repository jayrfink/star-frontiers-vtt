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

describe.each(views)('$name - Grid Line Thickness in Map Manager', ({ name }) => {
  const src = fs.readFileSync(path.resolve(__dirname, `../src/views/${name}.vue`), 'utf-8');

  it('renders a thickness input and sends a clamped grid_line_width on update', () => {
    expect(src).toContain('v-model.number="activeMapForm.grid_line_width"');
    expect(src).toContain('grid_line_width: clampGridLineWidth(activeMapForm.grid_line_width)');
    expect(src).toContain('activeMapForm.grid_line_width = map.grid_line_width || 1;');
  });
});

describe.each(['VttCanvas', 'SpaceVttCanvas'])('%s - grid line thickness rendering', (comp) => {
  it('uses map.grid_line_width when drawing the grid', () => {
    const src = fs.readFileSync(path.resolve(__dirname, `../src/components/${comp}.vue`), 'utf-8');
    expect(src).toContain('grid_line_width');
  });
});

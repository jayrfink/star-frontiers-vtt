import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('VttCanvas Hit-Testing, Event Handling & Lifecycle Polish', () => {
  const filePath = path.resolve(__dirname, '../src/components/VttCanvas.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('casts tx, ty, and size to Number in onMouseDown hit-testing', () => {
    const mouseSection = content.slice(content.indexOf('function onMouseDown'), content.indexOf('function onMouseMove'));
    expect(mouseSection).toContain('const tx = Number(t.x) || 0;');
    expect(mouseSection).toContain('const ty = Number(t.y) || 0;');
    expect(mouseSection).toContain('const size = Number(t.size) || 1;');
    expect(mouseSection).toContain('cell.x >= tx &&');
    expect(mouseSection).toContain('cell.x < tx + size &&');
    expect(mouseSection).toContain('cell.y >= ty &&');
    expect(mouseSection).toContain('cell.y < ty + size');
  });

  it('emits updates without mutating props directly in asset event handlers', () => {
    const assetSection = content.slice(content.indexOf('function handleAssetRenamed'), content.indexOf('const gridPx'));
    expect(assetSection).not.toMatch(/(?<!=)t\.avatar_url\s*=\s*(?!=)/);
    expect(assetSection).not.toMatch(/(?<!=)props\.map\.background_url\s*=\s*(?!=)/);
    expect(assetSection).toContain("emit('tokens-updated'");
    expect(assetSection).toContain("emit('map-updated'");
  });

  it('disconnects and nullifies resizeObserver on unmount', () => {
    const unmountSection = content.slice(content.indexOf('onBeforeUnmount('));
    expect(unmountSection).toContain('resizeObserver.disconnect()');
    expect(unmountSection).toContain('resizeObserver = null');
  });

  describe('Bug 11: Non-Sticky Measurement Ruler', () => {
    it('defines isMeasuring ref and controls ruler tracking lifecycle', () => {
      expect(content).toContain('const isMeasuring = ref(false);');

      const mouseDown = content.slice(content.indexOf('function onMouseDown'), content.indexOf('function onMouseMove'));
      expect(mouseDown).toContain('isMeasuring.value = true;');

      const mouseMove = content.slice(content.indexOf('function onMouseMove'), content.indexOf('function onMouseUp'));
      expect(mouseMove).toContain('props.activeTool === \'measure\' && isMeasuring.value');

      const mouseUp = content.slice(content.indexOf('function onMouseUp'), content.indexOf('function onWheel'));
      expect(mouseUp).toContain('if (isMeasuring.value)');
      expect(mouseUp).toContain('isMeasuring.value = false;');
    });
  });

  describe('Bug 20: On-Demand Render Loop with Dirty Flag', () => {
    const spacePath = path.resolve(__dirname, '../src/components/SpaceVttCanvas.vue');
    const spaceContent = fs.readFileSync(spacePath, 'utf8');

    it('implements requestRender and dirty check in VttCanvas instead of unthrottled loop', () => {
      expect(content).toContain('let needsRender = false;');
      expect(content).toContain('function requestRender()');
      expect(content).not.toContain('animationFrameId = requestAnimationFrame(render);');
      expect(content).toMatch(/watch\(\s*\(\)\s*=>\s*props\.tokens/);
      expect(content).toMatch(/watch\(\s*\(\)\s*=>\s*props\.map/);
      expect(content).toMatch(/watch\(\s*\(\)\s*=>\s*props\.activeTool/);
      expect(content).toMatch(/watch\(\s*\(\)\s*=>\s*props\.selectedTokenId/);
    });

    it('implements requestRender and dirty check in SpaceVttCanvas instead of unthrottled loop', () => {
      expect(spaceContent).toContain('let needsRender = false;');
      expect(spaceContent).toContain('function requestRender()');
      expect(spaceContent).not.toContain('animationFrameId = requestAnimationFrame(render);');
      expect(spaceContent).toMatch(/watch\(\s*\(\)\s*=>\s*props\.tokens/);
      expect(spaceContent).toMatch(/watch\(\s*\(\)\s*=>\s*props\.map/);
      expect(spaceContent).toMatch(/watch\(\s*\(\)\s*=>\s*props\.activeTool/);
      expect(spaceContent).toMatch(/watch\(\s*\(\)\s*=>\s*props\.selectedTokenId/);
    });
  });

  describe('Bug 21: Stringified status_effects Parsing in VttCanvas', () => {
    it('safely parses token.status_effects JSON string before rendering icons', () => {
      const renderSection = content.slice(content.indexOf('function renderSingleToken'), content.indexOf('function drawInitials'));
      expect(renderSection).toContain('let statusEffects = token.status_effects;');
      expect(renderSection).toContain('typeof statusEffects === \'string\'');
      expect(renderSection).toContain('statusEffects = JSON.parse(statusEffects);');
    });
  });

  describe('Bug 32: Token Layer & Z-Index Sorting by Size', () => {
    it('sorts tokens in drawTokens so larger tokens render underneath smaller character tokens', () => {
      const drawSection = content.slice(content.indexOf('function drawTokens'), content.indexOf('function drawGhostToken'));
      expect(drawSection).toContain('const sortedTokens = [...props.tokens].sort(');
      expect(drawSection).toContain('sizeB - sizeA');
    });

    it('sorts hit-testing order in onMouseDown so smaller tokens on top are clicked first', () => {
      const mouseSection = content.slice(content.indexOf('function onMouseDown'), content.indexOf('function onMouseMove'));
      expect(mouseSection).toContain('const hitTestOrder = [...props.tokens].sort(');
      expect(mouseSection).toContain('sizeA - sizeB');
    });
  });

  describe('Bug 33: Space Key preventDefault to Prevent Window Scrolling', () => {
    const spacePath = path.resolve(__dirname, '../src/components/SpaceVttCanvas.vue');
    const spaceContent = fs.readFileSync(spacePath, 'utf8');

    it('calls e.preventDefault() in onKeyDown when Space is pressed in VttCanvas', () => {
      const keySection = content.slice(content.indexOf('function onKeyDown'), content.indexOf('function onKeyUp'));
      expect(keySection).toContain("e.code === 'Space'");
      expect(keySection).toContain('e.preventDefault()');
    });

    it('calls e.preventDefault() in onKeyDown when Space is pressed in SpaceVttCanvas', () => {
      const keySection = spaceContent.slice(spaceContent.indexOf('function onKeyDown'), spaceContent.indexOf('function onKeyUp'));
      expect(keySection).toContain("e.code === 'Space'");
      expect(keySection).toContain('e.preventDefault()');
    });
  });
});

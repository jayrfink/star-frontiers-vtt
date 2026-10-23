import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Canvas HiDPI (devicePixelRatio) Scaling', () => {
  const vttSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/VttCanvas.vue'), 'utf-8');
  const spaceSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/SpaceVttCanvas.vue'), 'utf-8');

  it('VttCanvas scales canvas width/height by devicePixelRatio and sets CSS styles', () => {
    expect(vttSrc).toContain('window.devicePixelRatio');
    expect(vttSrc).toContain('canvasRef.value.width = Math.round(rect.width * dpr)');
    expect(vttSrc).toContain('canvasRef.value.height = Math.round(rect.height * dpr)');
    expect(vttSrc).toContain('canvasRef.value.style.width = `${rect.width}px`');
    expect(vttSrc).toContain('canvasRef.value.style.height = `${rect.height}px`');
    expect(vttSrc).toContain('ctx.scale(dpr, dpr)');
  });

  it('SpaceVttCanvas scales canvas width/height by devicePixelRatio and sets CSS styles', () => {
    expect(spaceSrc).toContain('window.devicePixelRatio');
    expect(spaceSrc).toContain('canvasRef.value.width = Math.round(rect.width * dpr)');
    expect(spaceSrc).toContain('canvasRef.value.height = Math.round(rect.height * dpr)');
    expect(spaceSrc).toContain('canvasRef.value.style.width = `${rect.width}px`');
    expect(spaceSrc).toContain('canvasRef.value.style.height = `${rect.height}px`');
    expect(spaceSrc).toContain('ctx.scale(dpr, dpr)');
  });

  it('preserves CSS-space pointer coordinate calculations in getWorldFromScreen', () => {
    // Both components should calculate mouseX and mouseY from getBoundingClientRect() and divide by zoomLevel
    expect(vttSrc).toContain('const mouseX = sx - rect.left;');
    expect(vttSrc).toContain('x: (mouseX - panX.value) / props.zoomLevel');

    expect(spaceSrc).toContain('const mouseX = sx - rect.left;');
    expect(spaceSrc).toContain('x: (mouseX - panX.value) / props.zoomLevel');
  });
});

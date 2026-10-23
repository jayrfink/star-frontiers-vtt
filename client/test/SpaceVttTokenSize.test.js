import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Space VTT 1-Hex Rule & Multi-Ship Stacking', () => {
  const spaceViewPath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const spaceViewContent = fs.readFileSync(spaceViewPath, 'utf8');

  const canvasPath = path.resolve(__dirname, '../src/components/SpaceVttCanvas.vue');
  const canvasContent = fs.readFileSync(canvasPath, 'utf8');

  it('Add Token Modal in SpaceVttView enforces 1 hex size without multi-hex selector', () => {
    const startIndex = spaceViewContent.indexOf('v-if="showAddTokenModal"');
    const endIndex = spaceViewContent.indexOf('</form>', startIndex);
    const modalSection = spaceViewContent.slice(startIndex, endIndex);
    expect(modalSection).not.toMatch(/<select[^>]*newTokenForm\.size/);
  });

  it('submitAddToken strictly sends size 1 for space tokens', () => {
    const submitSection = spaceViewContent.slice(
      spaceViewContent.indexOf('async function submitAddToken'),
      spaceViewContent.indexOf('async function onFileUpload')
    );
    expect(submitSection).toMatch(/size:\s*1/);
  });

  it('Selected Token Inspector in SpaceVttView displays fixed 1 Hex without multi-hex dropdown', () => {
    const inspectorSection = spaceViewContent.slice(
      spaceViewContent.indexOf('<!-- Selected Token Inspector -->'),
      spaceViewContent.indexOf('<!-- Token List When None Selected -->')
    );
    expect(inspectorSection).toMatch(/1 Hex \(Standard\)/);
    expect(inspectorSection).not.toMatch(/<select[^>]*selectedTokenForm\.size/);
  });

  it('SpaceVttCanvas enforces 1-hex token radius and supports multi-ship stack badge', () => {
    const drawTokenSection = canvasContent.slice(
      canvasContent.indexOf('function renderSingleToken('),
      canvasContent.indexOf('function drawInitials(')
    );
    expect(drawTokenSection).toMatch(/hexSize\.value\s*\*\s*0\.8/);
    expect(canvasContent).toContain('drawStackBadge');
  });

  it('SpaceVttCanvas onMouseDown cycles through multiple tokens occupying the same hex', () => {
    const onMouseDownSection = canvasContent.slice(
      canvasContent.indexOf('function onMouseDown('),
      canvasContent.indexOf('function onMouseMove(')
    );
    expect(onMouseDownSection).toMatch(/candidates/);
    expect(onMouseDownSection).toMatch(/currentIdx\s*\+\s*1/);
  });
});

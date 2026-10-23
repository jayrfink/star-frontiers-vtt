import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Space VTT Token Size Control (Bug 3.4)', () => {
  const spaceViewPath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const spaceViewContent = fs.readFileSync(spaceViewPath, 'utf8');

  const canvasPath = path.resolve(__dirname, '../src/components/SpaceVttCanvas.vue');
  const canvasContent = fs.readFileSync(canvasPath, 'utf8');

  it('Add Token Modal in SpaceVttView includes a size control bound to newTokenForm.size', () => {
    const startIndex = spaceViewContent.indexOf('v-if="showAddTokenModal"');
    const endIndex = spaceViewContent.indexOf('</form>', startIndex);
    const modalSection = spaceViewContent.slice(startIndex, endIndex);
    expect(modalSection).toMatch(/v-model(\.number)?="newTokenForm\.size"/);
  });

  it('submitAddToken sends dynamic newTokenForm.size instead of hardcoded 1', () => {
    const submitSection = spaceViewContent.slice(
      spaceViewContent.indexOf('async function submitAddToken'),
      spaceViewContent.indexOf('async function onFileUpload')
    );
    expect(submitSection).not.toMatch(/size:\s*1\s*,/);
    expect(submitSection).toMatch(/size:\s*.*newTokenForm\.size/);
  });

  it('Selected Token Inspector in SpaceVttView includes a size control bound to selectedTokenForm.size', () => {
    const inspectorSection = spaceViewContent.slice(
      spaceViewContent.indexOf('<!-- Selected Token Inspector -->'),
      spaceViewContent.indexOf('<!-- Token List When None Selected -->')
    );
    expect(inspectorSection).toMatch(/v-model(\.number)?="selectedTokenForm\.size"/);
    expect(inspectorSection).toMatch(/@change="updateSelectedToken"/);
  });

  it('SpaceVttCanvas scales rendered token radius by token.size', () => {
    const drawTokenSection = canvasContent.slice(
      canvasContent.indexOf('function renderSingleToken('),
      canvasContent.indexOf('function drawInitials(')
    );
    expect(drawTokenSection).toMatch(/token\.size/);
  });
});

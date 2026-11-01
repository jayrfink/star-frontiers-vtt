import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('GM Token Visibility Controls in RpgVttView and SpaceVttView', () => {
  const rpgViewContent = fs.readFileSync(
    path.resolve(__dirname, '../src/views/RpgVttView.vue'),
    'utf8'
  );
  const spaceViewContent = fs.readFileSync(
    path.resolve(__dirname, '../src/views/SpaceVttView.vue'),
    'utf8'
  );

  it('includes GM visibility toggle button in RpgVttView Token Inspector and Map Tokens list', () => {
    expect(rpgViewContent).toContain('btn-toggle-visibility');
    expect(rpgViewContent).toContain('btn-token-list-visibility');
    expect(rpgViewContent).toContain('toggleTokenVisibility');
    expect(rpgViewContent).toContain('Start Hidden from Players');
  });

  it('passes :is-gm="isGm" to AdversaryTokenHud and VehicleTokenHud and forwards layer in RpgVttView', () => {
    expect(rpgViewContent).toMatch(/<AdversaryTokenHud[\s\S]*?:is-gm="isGm"/);
    expect(rpgViewContent).toMatch(/<VehicleTokenHud[\s\S]*?:is-gm="isGm"/);
    expect(rpgViewContent).toMatch(/onAdversaryTokenUpdate[\s\S]*?layer:\s*updatedToken\.layer/);
    expect(rpgViewContent).toMatch(/onVehicleTokenUpdate[\s\S]*?layer:\s*updatedToken\.layer/);
    expect(rpgViewContent).toMatch(/onDeployVehicle[\s\S]*?layer:\s*payload\.layer/);
  });

  it('includes GM visibility toggle button in SpaceVttView Token Inspector and Map Tokens list', () => {
    expect(spaceViewContent).toContain('btn-toggle-visibility');
    expect(spaceViewContent).toContain('btn-token-list-visibility');
    expect(spaceViewContent).toContain('toggleTokenVisibility');
    expect(spaceViewContent).toContain('Start Hidden from Players');
  });

  it('preserves celestial identity via conditions when hiding or revealing celestial tokens in SpaceVttView', () => {
    expect(spaceViewContent).toMatch(/toggleTokenVisibility[\s\S]*?isCelestialToken/);
    expect(spaceViewContent).toMatch(/conditions.*celestial/s);
  });
});

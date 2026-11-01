import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Token Popup HUD Applet Double-Click & Scrolling Behavior', () => {
  const vttCanvasContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/VttCanvas.vue'),
    'utf8'
  );
  const rpgViewContent = fs.readFileSync(
    path.resolve(__dirname, '../src/views/RpgVttView.vue'),
    'utf8'
  );
  const adversaryHudContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/AdversaryTokenHud.vue'),
    'utf8'
  );
  const vehicleHudContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/VehicleTokenHud.vue'),
    'utf8'
  );

  it('VttCanvas defines token-dblclick emit and onDoubleClick handler', () => {
    expect(vttCanvasContent).toContain("'token-dblclick'");
    expect(vttCanvasContent).toContain('@dblclick="onDoubleClick"');
    expect(vttCanvasContent).toContain('function onDoubleClick(e)');
    expect(vttCanvasContent).toContain("emit('token-dblclick', hitToken);");
  });

  it('RpgVttView binds @token-dblclick to onTokenDblClick and isolates activeHudToken from selectedToken', () => {
    expect(rpgViewContent).toContain('@token-dblclick="onTokenDblClick"');
    expect(rpgViewContent).toContain('const openHudTokenId = ref(null);');
    expect(rpgViewContent).toContain('const activeHudToken = computed(');
    expect(rpgViewContent).toMatch(/<AdversaryTokenHud[\s\S]*?v-if="activeHudToken/);
    expect(rpgViewContent).toMatch(/<VehicleTokenHud[\s\S]*?v-if="activeHudToken/);
    expect(rpgViewContent).toContain('function onTokenDblClick(token)');
    expect(rpgViewContent).toContain('@dblclick="onTokenListDblClick(t)"');
  });

  it('AdversaryTokenHud.vue styles contain within canvas wrapper with flex scrolling to bottom', () => {
    expect(adversaryHudContent).toContain('max-height: calc(100% - 32px);');
    expect(adversaryHudContent).toMatch(/\.hud-body\s*\{[\s\S]*?overflow-y:\s*auto;/);
    expect(adversaryHudContent).toMatch(/\.hud-body\s*\{[\s\S]*?min-height:\s*0;/);
    expect(adversaryHudContent).toMatch(/\.hud-body\s*\{[\s\S]*?padding:\s*14px\s+14px\s+32px\s+14px;/);
  });

  it('VehicleTokenHud.vue styles contain within canvas wrapper with flex scrolling to bottom', () => {
    expect(vehicleHudContent).toContain('max-height: calc(100% - 32px);');
    expect(vehicleHudContent).toMatch(/\.hud-body\s*\{[\s\S]*?overflow-y:\s*auto;/);
    expect(vehicleHudContent).toMatch(/\.hud-body\s*\{[\s\S]*?min-height:\s*0;/);
    expect(vehicleHudContent).toMatch(/\.hud-body\s*\{[\s\S]*?padding:\s*12px\s+12px\s+32px\s+12px;/);
  });
});

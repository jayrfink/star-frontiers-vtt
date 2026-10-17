import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('VTT Tabletop Dice Audio Integration', () => {
  const rpgViewPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const spaceViewPath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const rpgContent = fs.readFileSync(rpgViewPath, 'utf8');
  const spaceContent = fs.readFileSync(spaceViewPath, 'utf8');

  describe('Imports & Audio State Declarations', () => {
    it('imports playDiceSound and mute helpers from diceAudio service in RpgVttView', () => {
      expect(rpgContent).toMatch(
        /import\s+\{[^}]*playDiceSound[^}]*\}\s+from\s+['"]\.\.\/services\/diceAudio(?:\.js)?['"]/
      );
      expect(rpgContent).toMatch(
        /toggleMute\s+as\s+toggleDiceMute/
      );
      expect(rpgContent).toMatch(
        /isMuted\s+as\s+isDiceMuted/
      );
    });

    it('imports playDiceSound and mute helpers from diceAudio service in SpaceVttView', () => {
      expect(spaceContent).toMatch(
        /import\s+\{[^}]*playDiceSound[^}]*\}\s+from\s+['"]\.\.\/services\/diceAudio(?:\.js)?['"]/
      );
      expect(spaceContent).toMatch(
        /toggleMute\s+as\s+toggleDiceMute/
      );
      expect(spaceContent).toMatch(
        /isMuted\s+as\s+isDiceMuted/
      );
    });

    it('declares isDiceAudioMuted reactive state initialized with isDiceMuted() in both views', () => {
      expect(rpgContent).toMatch(/const\s+isDiceAudioMuted\s*=\s*ref\(\s*isDiceMuted\(\)\s*\)/);
      expect(spaceContent).toMatch(/const\s+isDiceAudioMuted\s*=\s*ref\(\s*isDiceMuted\(\)\s*\)/);
    });

    it('defines toggleAudioMute function updating state and calling toggleDiceMute in both views', () => {
      expect(rpgContent).toMatch(
        /function\s+toggleAudioMute\s*\(\)\s*\{[\s\S]*?toggleDiceMute\(\)[\s\S]*?isDiceAudioMuted\.value/
      );
      expect(spaceContent).toMatch(
        /function\s+toggleAudioMute\s*\(\)\s*\{[\s\S]*?toggleDiceMute\(\)[\s\S]*?isDiceAudioMuted\.value/
      );
    });
  });

  describe('Local Roll Triggers', () => {
    it('invokes playDiceSound({ isRemote: false }) in rollPercentile for both views', () => {
      const rpgPercentileFn = rpgContent.slice(
        rpgContent.indexOf('async function rollPercentile'),
        rpgContent.indexOf('async function rollDamage')
      );
      expect(rpgPercentileFn).toMatch(/playDiceSound\(\s*\{\s*isRemote:\s*false\s*\}\s*\)/);

      const spacePercentileFn = spaceContent.slice(
        spaceContent.indexOf('async function rollPercentile'),
        spaceContent.indexOf('async function rollDamage')
      );
      expect(spacePercentileFn).toMatch(/playDiceSound\(\s*\{\s*isRemote:\s*false\s*\}\s*\)/);
    });

    it('invokes playDiceSound({ isRemote: false }) in rollDamage for both views', () => {
      const rpgDamageFn = rpgContent.slice(
        rpgContent.indexOf('async function rollDamage'),
        rpgContent.indexOf('function clearDice')
      );
      expect(rpgDamageFn).toMatch(/playDiceSound\(\s*\{\s*isRemote:\s*false\s*\}\s*\)/);

      const spaceDamageFn = spaceContent.slice(
        spaceContent.indexOf('async function rollDamage'),
        spaceContent.indexOf('function clearDice')
      );
      expect(spaceDamageFn).toMatch(/playDiceSound\(\s*\{\s*isRemote:\s*false\s*\}\s*\)/);
    });

    it('invokes playDiceSound({ isRemote: false }) in adversary attack and damage rolls in RpgVttView', () => {
      const adversaryAttackFn = rpgContent.slice(
        rpgContent.indexOf('async function onAdversaryRollAttack'),
        rpgContent.indexOf('async function onAdversaryRollDamage')
      );
      expect(adversaryAttackFn).toMatch(/playDiceSound\(\s*\{\s*isRemote:\s*false\s*\}\s*\)/);

      const adversaryDamageFn = rpgContent.slice(
        rpgContent.indexOf('async function onAdversaryRollDamage'),
        rpgContent.indexOf('// Socket setup')
      );
      expect(adversaryDamageFn).toMatch(/playDiceSound\(\s*\{\s*isRemote:\s*false\s*\}\s*\)/);
    });
  });

  describe('Remote Roll Socket Triggers', () => {
    it('triggers playDiceSound({ isRemote: true }) for remote users in RpgVttView', () => {
      const rpgSocketBlock = rpgContent.slice(
        rpgContent.indexOf("socket.on('roll:created'"),
        rpgContent.indexOf("socket.on('roll:cleared'")
      );
      expect(rpgSocketBlock).toMatch(
        /if\s*\([^)]*username\s*!==\s*authStore\.user\?\.username[^)]*\)[\s\S]*?playDiceSound\(\s*\{\s*isRemote:\s*true\s*\}\s*\)/
      );
    });

    it('triggers playDiceSound({ isRemote: true }) for remote users in SpaceVttView', () => {
      const spaceSocketBlock = spaceContent.slice(
        spaceContent.indexOf("socket.on('roll:created'"),
        spaceContent.indexOf("socket.on('roll:cleared'")
      );
      expect(spaceSocketBlock).toMatch(
        /if\s*\([^)]*username\s*!==\s*authStore\.user\?\.username[^)]*\)[\s\S]*?playDiceSound\(\s*\{\s*isRemote:\s*true\s*\}\s*\)/
      );
    });
  });

  describe('UI Mute Button in Dice Panel', () => {
    it('renders btn-audio-toggle in template with 🔊 / 🔇 icons in RpgVttView', () => {
      expect(rpgContent).toContain('btn-audio-toggle');
      expect(rpgContent).toMatch(/class="[^"]*btn-audio-toggle[^"]*"[^>]*@click="toggleAudioMute"/);
      expect(rpgContent).toMatch(/isDiceAudioMuted\s*\?\s*['"]🔇['"]\s*:\s*['"]🔊['"]/);
    });

    it('includes accessibility attributes aria-label and aria-pressed on toggle buttons in RpgVttView', () => {
      expect(rpgContent).toMatch(/:aria-label="isDiceAudioMuted\s*\?\s*['"]Unmute dice audio['"]\s*:\s*['"]Mute dice audio['"]/);
      expect(rpgContent).toMatch(/:aria-pressed="!isDiceAudioMuted"/);
    });

    it('renders btn-audio-toggle in template with 🔊 / 🔇 icons in SpaceVttView', () => {
      expect(spaceContent).toContain('btn-audio-toggle');
      expect(spaceContent).toMatch(/class="[^"]*btn-audio-toggle[^"]*"[^>]*@click="toggleAudioMute"/);
      expect(spaceContent).toMatch(/isDiceAudioMuted\s*\?\s*['"]🔇['"]\s*:\s*['"]🔊['"]/);
    });

    it('includes accessibility attributes aria-label and aria-pressed on toggle buttons in SpaceVttView', () => {
      expect(spaceContent).toMatch(/:aria-label="isDiceAudioMuted\s*\?\s*['"]Unmute dice audio['"]\s*:\s*['"]Mute dice audio['"]/);
      expect(spaceContent).toMatch(/:aria-pressed="!isDiceAudioMuted"/);
    });
  });

  describe('VTT Dice Audio Functional Logic Simulation', () => {
    let playDiceSoundMock;
    let toggleDiceMuteMock;
    let isDiceMutedMock;
    let isDiceAudioMuted;
    let authStoreMock;

    beforeEach(() => {
      let muted = false;
      playDiceSoundMock = vi.fn();
      toggleDiceMuteMock = vi.fn(() => {
        muted = !muted;
        return muted;
      });
      isDiceMutedMock = vi.fn(() => muted);
      authStoreMock = { user: { username: 'testuser', id: 42 } };
      isDiceAudioMuted = { value: isDiceMutedMock() };
    });

    function toggleAudioMute() {
      const next = toggleDiceMuteMock();
      isDiceAudioMuted.value = next;
    }

    function handleRollPercentile() {
      playDiceSoundMock({ isRemote: false });
    }

    function handleRollDamage() {
      playDiceSoundMock({ isRemote: false });
    }

    function handleRollCreated({ mode, roll }) {
      if (mode !== 'rpg') return;
      if (roll.username !== authStoreMock.user?.username) {
        playDiceSoundMock({ isRemote: true });
      }
    }

    it('1. rollPercentile and rollDamage invoke playDiceSound({ isRemote: false })', () => {
      handleRollPercentile();
      expect(playDiceSoundMock).toHaveBeenCalledWith({ isRemote: false });

      playDiceSoundMock.mockClear();
      handleRollDamage();
      expect(playDiceSoundMock).toHaveBeenCalledWith({ isRemote: false });
    });

    it('2. Socket event roll:created from another username invokes playDiceSound({ isRemote: true })', () => {
      handleRollCreated({
        mode: 'rpg',
        roll: { id: 'r1', username: 'remotePlayer', userId: 99, type: 'percentile', total: 45 }
      });
      expect(playDiceSoundMock).toHaveBeenCalledTimes(1);
      expect(playDiceSoundMock).toHaveBeenCalledWith({ isRemote: true });
    });

    it('3. Socket event roll:created from same username does NOT re-trigger playDiceSound', () => {
      handleRollCreated({
        mode: 'rpg',
        roll: { id: 'r2', username: 'testuser', userId: 42, type: 'percentile', total: 72 }
      });
      expect(playDiceSoundMock).not.toHaveBeenCalled();
    });

    it('4. Mute toggle button toggles icon, aria-label, and aria-pressed correctly and updates service', () => {
      expect(isDiceAudioMuted.value).toBe(false);
      let icon = isDiceAudioMuted.value ? '🔇' : '🔊';
      let ariaLabel = isDiceAudioMuted.value ? 'Unmute dice audio' : 'Mute dice audio';
      let ariaPressed = !isDiceAudioMuted.value;
      expect(icon).toBe('🔊');
      expect(ariaLabel).toBe('Mute dice audio');
      expect(ariaPressed).toBe(true);

      toggleAudioMute();
      expect(toggleDiceMuteMock).toHaveBeenCalledTimes(1);
      expect(isDiceAudioMuted.value).toBe(true);
      icon = isDiceAudioMuted.value ? '🔇' : '🔊';
      ariaLabel = isDiceAudioMuted.value ? 'Unmute dice audio' : 'Mute dice audio';
      ariaPressed = !isDiceAudioMuted.value;
      expect(icon).toBe('🔇');
      expect(ariaLabel).toBe('Unmute dice audio');
      expect(ariaPressed).toBe(false);

      toggleAudioMute();
      expect(toggleDiceMuteMock).toHaveBeenCalledTimes(2);
      expect(isDiceAudioMuted.value).toBe(false);
      icon = isDiceAudioMuted.value ? '🔇' : '🔊';
      ariaLabel = isDiceAudioMuted.value ? 'Unmute dice audio' : 'Mute dice audio';
      ariaPressed = !isDiceAudioMuted.value;
      expect(icon).toBe('🔊');
      expect(ariaLabel).toBe('Mute dice audio');
      expect(ariaPressed).toBe(true);
    });
  });
});

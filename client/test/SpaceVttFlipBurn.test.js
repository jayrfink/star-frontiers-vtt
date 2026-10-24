import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  canStandardFlip,
  canLumberingFlip,
  canSnapFlip,
  calculateStaCheckTarget,
  resolveStaCheckResult,
  formatStandardFlipAlert,
  formatLumberingFlipAlert,
  formatSnapFlipAlert,
  formatBrakingBurnAlert,
  formatGLocResultAlert,
  MULTI_TURN_FLIP_STATUS,
  calculateFlipHeading,
  calculateTurnHeading,
  SAFE_COMPENSATOR_DELTA_V,
} from '../src/utils/flipAndBurn.js';

describe('SpaceVttView Flip & Burn and Crew G-Load Check Integration', () => {
  const filePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  describe('Source Code & Import Verification', () => {
    it('imports all required Knight Hawks physics and alert helpers from flipAndBurn.js', () => {
      expect(content).toMatch(/import\s*\{[^}]*canStandardFlip[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*canLumberingFlip[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*canSnapFlip[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*calculateStaCheckTarget[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*resolveStaCheckResult[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*formatStandardFlipAlert[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*formatLumberingFlipAlert[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*formatSnapFlipAlert[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*formatBrakingBurnAlert[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*formatGLocResultAlert[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*MULTI_TURN_FLIP_STATUS[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
    });

    it('declares reactive state for Braking Burn controls and Crew G-Load Check modal', () => {
      expect(content).toMatch(/brakingDeltaV\s*=\s*ref\(/);
      expect(content).toMatch(/showCrewGCheckModal\s*=\s*ref\(/);
      expect(content).toMatch(/crewCheckCharName\s*=\s*ref\(/);
      expect(content).toMatch(/crewCheckBaseSta\s*=\s*ref\(/);
      expect(content).toMatch(/crewCheckPosture\s*=\s*ref\(/);
      expect(content).toMatch(/crewCheckLocation\s*=\s*ref\(/);
      expect(content).toMatch(/crewCheckDeltaV\s*=\s*ref\(/);
      expect(content).toMatch(/crewCheckReason\s*=\s*ref\(/);
      expect(content).toMatch(/crewCheckLastResult\s*=\s*ref\(/);
    });

    it('declares computed properties for Standard, Lumbering, and Snap flips', () => {
      expect(content).toMatch(/selectedTokenCanStandardFlip/);
      expect(content).toMatch(/selectedTokenCanLumberingFlip/);
      expect(content).toMatch(/selectedTokenCanSnapFlip/);
      expect(content).toMatch(/crewCheckTargetSta/);
    });
  });

  describe('Token Inspector Template Markup', () => {
    it('contains Standard Flip button for MR >= 3 vessels', () => {
      expect(content).toContain('Standard Flip (180° - 1 Turn)');
      expect(content).toMatch(/executeStandardFlip/);
    });

    it('contains Lumbering Flip and Emergency Snap Flip buttons for MR 1-2 vessels', () => {
      expect(content).toContain('Start Lumbering Flip (Turn 1/2: +90°)');
      expect(content).toContain('Complete Lumbering Flip (Turn 2/2: +90°)');
      expect(content).toContain('Emergency Snap Flip (180° - 1 Turn)');
      expect(content).toMatch(/executeLumberingFlip/);
      expect(content).toMatch(/executeSnapFlip/);
      expect(content).toMatch(/cancelMultiTurnFlip/);
    });

    it('contains Braking Burn controls with deltaV stepper and Safe vs High-G indicators', () => {
      expect(content).toMatch(/v-model\.number="brakingDeltaV"/);
      expect(content).toContain('Execute Braking Burn');
      expect(content).toMatch(/executeBrakingBurn/);
      expect(content).toMatch(/Safe Deceleration/i);
      expect(content).toMatch(/HIGH-G BRAKING BURN/i);
    });

    it('contains a direct button to trigger the Crew G-Load Check modal', () => {
      expect(content).toContain('Crew G-Load Check');
      expect(content).toMatch(/openCrewGCheckModal/);
    });
  });

  describe('Crew G-Load Check Dialog Template Markup', () => {
    it('contains modal overlay and container classes', () => {
      expect(content).toContain('crew-gcheck-modal-backdrop');
      expect(content).toContain('crew-gcheck-modal');
    });

    it('includes character name and base STA inputs', () => {
      expect(content).toMatch(/v-model="crewCheckCharName"/);
      expect(content).toMatch(/v-model\.number="crewCheckBaseSta"/);
    });

    it('includes posture options: crash couch, braced, unbraced', () => {
      expect(content).toMatch(/value="couch"/);
      expect(content).toMatch(/value="braced"/);
      expect(content).toMatch(/value="unbraced"/);
      expect(content).toContain('+20%');
      expect(content).toContain('-20%');
    });

    it('includes location / extremity options: midships and extremity', () => {
      expect(content).toMatch(/value="midships"/);
      expect(content).toMatch(/value="extremity"/);
      expect(content).toContain('-10%');
    });

    it('includes live target STA calculation display and roll button', () => {
      expect(content).toMatch(/crewCheckTargetSta/);
      expect(content).toContain('Roll STA Check (d100)');
      expect(content).toMatch(/rollCrewGCheck/);
    });

    it('includes result outcome display with condition, damage, and duration', () => {
      expect(content).toMatch(/crewCheckLastResult/);
      expect(content).toContain('btn-crew-gcheck-close');
    });
  });

  describe('Modal Keydown & Escape Handling in SpaceVttView', () => {
    it('handles Escape key before general modal guard so crew G-check modal can close', () => {
      const onKeyDownSource = content.slice(content.indexOf('function onKeyDown(e) {'));
      const escapeIndex = onKeyDownSource.indexOf("e.key === 'Escape'");
      const guardIndex = onKeyDownSource.search(/if\s*\(showCreateMapModal\.value\s*\|\|\s*showAddTokenModal\.value\s*\|\|\s*showCrewGCheckModal\.value(\s*\|\|\s*showSlingshotModal\.value)?\)\s*return;/);
      expect(escapeIndex).toBeGreaterThan(-1);
      expect(guardIndex).toBeGreaterThan(-1);
      expect(escapeIndex).toBeLessThan(guardIndex);
      expect(onKeyDownSource).toMatch(/if\s*\(showCrewGCheckModal\.value\)\s*\{\s*showCrewGCheckModal\.value\s*=\s*false;\s*return;\s*\}/);
    });

    it('normalizes location and resets to midships in openCrewGCheckModal', () => {
      expect(content).toMatch(/const loc = String\(options\.location \|\| options\.extremity \|\| 'midships'\)\.toLowerCase\(\);/);
      expect(content).toMatch(/crewCheckLocation\.value = \(loc === 'bow' \|\| loc === 'stern' \|\| loc === 'extremity'\) \? 'extremity' : 'midships';/);
    });
  });
});

describe('Maneuver & Crew G-Check Logic Simulation', () => {
  let mockServerRolls = [];
  function sendRollToServer(payload) {
    mockServerRolls.push(payload);
  }

  beforeEach(() => {
    mockServerRolls = [];
  });

  describe('Maneuver availability classification', () => {
    it('enables Standard Flip and disables Lumbering/Snap for MR >= 3', () => {
      const mr = 3;
      expect(canStandardFlip(mr)).toBe(true);
      expect(canLumberingFlip(mr)).toBe(false);
      expect(canSnapFlip(mr)).toBe(false);
    });

    it('enables Lumbering and Snap Flips and disables Standard for MR 1-2', () => {
      [1, 2].forEach((mr) => {
        expect(canStandardFlip(mr)).toBe(false);
        expect(canLumberingFlip(mr)).toBe(true);
        expect(canSnapFlip(mr)).toBe(true);
      });
    });

    it('disables all maneuvers for MR 0 (ineligible)', () => {
      const mr = 0;
      expect(canStandardFlip(mr)).toBe(false);
      expect(canLumberingFlip(mr)).toBe(false);
      expect(canSnapFlip(mr)).toBe(false);
    });
  });

  describe('Standard Flip execution', () => {
    it('rotates heading 180 degrees and alerts roll log with no STA check', () => {
      const shipName = 'UPF Interceptor';
      const initialHeading = 60;
      const newHeading = calculateFlipHeading(initialHeading);
      expect(newHeading).toBe(240);

      const alert = formatStandardFlipAlert(shipName, newHeading);
      sendRollToServer({
        type: 'percentile',
        label: `${shipName}: 🔄 Standard Flip (180°)`,
        total: newHeading,
        breakdown: alert,
      });

      expect(mockServerRolls.length).toBe(1);
      expect(mockServerRolls[0].total).toBe(240);
      expect(mockServerRolls[0].breakdown).toMatch(/no crew (?:STA )?check/i);
    });
  });

  describe('Lumbering Flip execution across two turns', () => {
    it('executes Turn 1 (+90°) and sets status effect with no STA check', () => {
      const shipName = 'Assault Scout';
      let rotation = 0;
      let statusEffects = [];

      rotation = calculateTurnHeading(rotation, 90);
      statusEffects.push(MULTI_TURN_FLIP_STATUS);
      const alert = formatLumberingFlipAlert(shipName, 1, rotation);

      sendRollToServer({
        type: 'percentile',
        label: `${shipName}: 🔄 Lumbering Flip (Turn 1/2: +90°)`,
        total: rotation,
        breakdown: alert,
      });

      expect(rotation).toBe(90);
      expect(statusEffects).toContain(MULTI_TURN_FLIP_STATUS);
      expect(mockServerRolls[0].breakdown).toMatch(/Turn 1\/2/);
      expect(mockServerRolls[0].breakdown).toMatch(/no crew (?:STA )?check/i);
    });

    it('executes Turn 2 (+90°, 180° total) and clears status effect with no STA check', () => {
      const shipName = 'Assault Scout';
      let rotation = 90;
      let statusEffects = [MULTI_TURN_FLIP_STATUS];

      rotation = calculateTurnHeading(rotation, 90);
      statusEffects = statusEffects.filter((s) => s !== MULTI_TURN_FLIP_STATUS);
      const alert = formatLumberingFlipAlert(shipName, 2, rotation);

      sendRollToServer({
        type: 'percentile',
        label: `${shipName}: 🔄 Lumbering Flip Complete (Turn 2/2: +90°)`,
        total: rotation,
        breakdown: alert,
      });

      expect(rotation).toBe(180);
      expect(statusEffects).not.toContain(MULTI_TURN_FLIP_STATUS);
      expect(mockServerRolls[0].breakdown).toMatch(/Turn 2\/2/);
      expect(mockServerRolls[0].breakdown).toMatch(/no crew (?:STA )?check/i);
    });
  });

  describe('Emergency Snap Flip execution', () => {
    it('reverses heading 180 degrees in 1 turn and requires pilot and crew STA checks', () => {
      const shipName = 'Sathari Raider';
      const initialHeading = 120;
      const newHeading = calculateFlipHeading(initialHeading);
      expect(newHeading).toBe(300);

      const alert = formatSnapFlipAlert(shipName, newHeading);
      sendRollToServer({
        type: 'percentile',
        label: `${shipName}: ⚠️ Emergency Snap Flip (180°)`,
        total: newHeading,
        breakdown: alert,
      });

      expect(mockServerRolls.length).toBe(1);
      expect(mockServerRolls[0].breakdown).toMatch(/Emergency Snap Flip/);
      expect(mockServerRolls[0].breakdown).toMatch(/pilot/i);
      expect(mockServerRolls[0].breakdown).toMatch(/STA/i);
    });
  });

  describe('Braking Burn execution and threshold triggers', () => {
    it('asserts SAFE_COMPENSATOR_DELTA_V is 3', () => {
      expect(SAFE_COMPENSATOR_DELTA_V).toBe(3);
    });

    it('handles Safe Deceleration (ΔV <= 3) without triggering modal', () => {
      const shipName = 'Explorer';
      let currentSpeed = 5;
      const deltaV = 3;

      currentSpeed = Math.max(0, currentSpeed - deltaV);
      expect(currentSpeed).toBe(2);

      const isHighG = deltaV >= 4;
      expect(isHighG).toBe(false);

      const alert = formatBrakingBurnAlert(shipName, deltaV);
      sendRollToServer({
        type: 'percentile',
        label: `${shipName}: Braking Burn (ΔV ${deltaV})`,
        total: currentSpeed,
        breakdown: alert,
      });

      expect(mockServerRolls.length).toBe(1);
      expect(mockServerRolls[0].breakdown).toMatch(/safe/i);
      expect(mockServerRolls[0].breakdown).toMatch(/no crew (?:STA )?check/i);
    });

    it('handles High-G Deceleration (ΔV >= 4) and alerts STA penalty', () => {
      const shipName = 'Explorer';
      let currentSpeed = 5;
      const deltaV = 4;

      currentSpeed = Math.max(0, currentSpeed - deltaV);
      expect(currentSpeed).toBe(1);

      const isHighG = deltaV >= 4;
      expect(isHighG).toBe(true);

      const alert = formatBrakingBurnAlert(shipName, deltaV);
      sendRollToServer({
        type: 'percentile',
        label: `${shipName}: ⚠️ HIGH-G Braking Burn (ΔV ${deltaV})`,
        total: currentSpeed,
        breakdown: alert,
      });

      expect(mockServerRolls.length).toBe(1);
      expect(mockServerRolls[0].breakdown).toMatch(/high-g/i);
      expect(mockServerRolls[0].breakdown).toContain('-10%');
    });
  });

  describe('Crew G-Load Check calculation and resolution in dialog', () => {
    it('calculates target for high-g burn with crash couch at stern extremity', () => {
      const baseSta = 60;
      const targetData = calculateStaCheckTarget(baseSta, {
        deltaV: 5,
        posture: 'couch',
        extremity: 'bow',
      });

      expect(targetData.target).toBe(50);
      expect(targetData.gPenalty).toBe(-20);
      expect(targetData.postureMod).toBe(20);
      expect(targetData.extremityMod).toBe(-10);
    });

    it('resolves successful check when roll <= target', () => {
      const target = 50;
      const roll = 35;
      const res = resolveStaCheckResult(roll, target, 'couch');

      expect(res.success).toBe(true);
      expect(res.condition).toBe('Normal');

      const logMsg = formatGLocResultAlert('Capt. Wilhemina', res);
      expect(logMsg).toContain('Capt. Wilhemina');
      expect(logMsg).toContain('SUCCESS');
    });

    it('resolves G-Stun for secured crew when margin is between 1 and 19', () => {
      const target = 50;
      const roll = 65; // margin 15
      const res = resolveStaCheckResult(roll, target, 'braced');

      expect(res.success).toBe(false);
      expect(res.severity).toBe('stun');
      expect(res.stunnedTurns).toBe(1);
      expect(res.checkPenalty).toBe(-20);
      expect(res.damageDice).toBeNull();

      const logMsg = formatGLocResultAlert('Lt. Larry', res);
      expect(logMsg).toContain('FAILED');
      expect(logMsg).toContain('G-Stun');
    });

    it('resolves G-Stun for unbraced crew with ceil(1d10 / 2) damage and prone condition', () => {
      const target = 50;
      const roll = 55; // margin 5
      const res = resolveStaCheckResult(roll, target, 'unbraced');

      expect(res.success).toBe(false);
      expect(res.severity).toBe('stun');
      expect(res.condition).toContain('Prone');
      expect(res.damageDice).toBe('ceil(1d10 / 2)');
      expect(res.stunnedTurns).toBe(1);
    });

    it('resolves full G-LOC Blackout for secured crew when margin >= 20', () => {
      const target = 50;
      const roll = 75; // margin 25
      const res = resolveStaCheckResult(roll, target, 'couch');

      expect(res.success).toBe(false);
      expect(res.severity).toBe('g-loc');
      expect(res.condition).toBe('G-LOC Blackout');
      expect(res.unconsciousTurnsDice).toBe('ceil(1d10 / 2)');
      expect(res.damageDice).toBeNull();
    });

    it('resolves full G-LOC Blackout for unbraced crew with 1d10 damage and ceil(1d10 / 2)m hurled', () => {
      const target = 50;
      const roll = 85; // margin 35
      const res = resolveStaCheckResult(roll, target, 'unbraced');

      expect(res.success).toBe(false);
      expect(res.severity).toBe('g-loc');
      expect(res.condition).toContain('Hurled');
      expect(res.damageDice).toBe('1d10');
      expect(res.unconsciousTurnsDice).toBe('ceil(1d10 / 2)');
      expect(res.displacementMetersDice).toBe('ceil(1d10 / 2)');
    });
  });

  describe('Modal state & Escape key handling simulation', () => {
    it('closes showCrewGCheckModal when Escape key is pressed', () => {
      let showCrewGCheckModal = true;
      let showCreateMapModal = false;
      let showAddTokenModal = false;

      function simulateOnKeyDown(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        if (e.key === 'Escape') {
          if (showCrewGCheckModal) {
            showCrewGCheckModal = false;
            return;
          }
        }

        if (showCreateMapModal || showAddTokenModal || showCrewGCheckModal) return;
      }

      simulateOnKeyDown({ key: 'Escape' });
      expect(showCrewGCheckModal).toBe(false);
    });

    it('openCrewGCheckModal resets location to midships when subsequent check passes extremity: midships', () => {
      let crewCheckLocation = 'midships';

      function simulateOpenCrewGCheckModal(options = {}) {
        const loc = String(options.location || options.extremity || 'midships').toLowerCase();
        crewCheckLocation = (loc === 'bow' || loc === 'stern' || loc === 'extremity') ? 'extremity' : 'midships';
      }

      // Initial check at bow extremity
      simulateOpenCrewGCheckModal({ extremity: 'bow' });
      expect(crewCheckLocation).toBe('extremity');

      // Subsequent check specifying midships
      simulateOpenCrewGCheckModal({ extremity: 'midships' });
      expect(crewCheckLocation).toBe('midships');

      // Subsequent check specifying stern extremity
      simulateOpenCrewGCheckModal({ location: 'stern' });
      expect(crewCheckLocation).toBe('extremity');

      // Subsequent check without location defaults to midships
      simulateOpenCrewGCheckModal({});
      expect(crewCheckLocation).toBe('midships');
    });
  });
});

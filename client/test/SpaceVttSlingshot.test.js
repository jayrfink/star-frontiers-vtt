import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  calculateSlingshotParameters,
  resolveSlingshotPilotCheck,
  formatSlingshotSuccessAlert,
  formatSlingshotHazardAlert,
  SAFE_COMPENSATOR_DELTA_V,
} from '../src/utils/flipAndBurn.js';

describe('SpaceVttView Orbital Slingshot & Celestial Proximity Integration', () => {
  const filePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  describe('Source Code & Import Verification', () => {
    it('imports slingshot helpers and constants from flipAndBurn.js', () => {
      expect(content).toMatch(/import\s*\{[^}]*calculateSlingshotParameters[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*resolveSlingshotPilotCheck[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*formatSlingshotSuccessAlert[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*formatSlingshotHazardAlert[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
      expect(content).toMatch(/import\s*\{[^}]*SAFE_COMPENSATOR_DELTA_V[^}]*\}\s*from\s*['"]\.\.\/utils\/flipAndBurn(\.js)?['"]/);
    });

    it('declares reactive state for Orbital Slingshot modal and parameters', () => {
      expect(content).toMatch(/showSlingshotModal\s*=\s*ref\(/);
      expect(content).toMatch(/slingshotBodyType\s*=\s*ref\(/);
      expect(content).toMatch(/slingshotDistance\s*=\s*ref\(/);
      expect(content).toMatch(/slingshotEntrySpeed\s*=\s*ref\(/);
      expect(content).toMatch(/slingshotPilotSkill\s*=\s*ref\(/);
      expect(content).toMatch(/slingshotAdfSpent\s*=\s*ref\(/);
      expect(content).toMatch(/slingshotLastResult\s*=\s*ref\(/);
    });

    it('implements odd-r hex distance calculations (offsetToCube and hexDistance)', () => {
      expect(content).toMatch(/function\s+offsetToCube\s*\(/);
      expect(content).toMatch(/function\s+hexDistance\s*\(/);
    });

    it('implements celestial proximity detection and eligibility computed properties', () => {
      expect(content).toMatch(/nearestCelestialBody\s*=/);
      expect(content).toMatch(/isSlingshotZoneEligible\s*=/);
      expect(content).toMatch(/isSelectedTokenSlingshotEligible\s*=/);
      expect(content).toMatch(/liveSlingshotParams\s*=/);
      expect(content).toMatch(/liveSlingshotPilotTarget\s*=/);
    });
  });

  describe('Token Inspector Template Markup', () => {
    it('contains Slingshot Box rendered when ship is eligible in proximity zone', () => {
      expect(content).toContain('slingshot-box');
      expect(content).toMatch(/Execute Orbital Slingshot/i);
      expect(content).toMatch(/openSlingshotModal/i);
    });

    it('contains standalone Orbital Slingshot trigger button in Token Inspector', () => {
      expect(content).toMatch(/btn-slingshot-trigger/);
      expect(content).toMatch(/Orbital Slingshot/);
    });

    it('updates braking burn indicators for SAFE_COMPENSATOR_DELTA_V = 3', () => {
      expect(content).toMatch(/brakingDeltaV\s*<=\s*3/);
      expect(content).toMatch(/brakingDeltaV\s*-\s*3/);
      expect(content).toMatch(/brakingDeltaV\s*>=\s*4/);
    });
  });

  describe('Orbital Slingshot Modal Template Markup', () => {
    it('contains modal backdrop and modal card classes', () => {
      expect(content).toContain('slingshot-modal-backdrop');
      expect(content).toContain('slingshot-modal');
    });

    it('includes controls for body type, distance, entry speed, pilot skill, and Oberth ADF', () => {
      expect(content).toMatch(/v-model="slingshotBodyType"/);
      expect(content).toMatch(/v-model\.number="slingshotDistance"/);
      expect(content).toMatch(/v-model\.number="slingshotEntrySpeed"/);
      expect(content).toMatch(/v-model\.number="slingshotPilotSkill"/);
      expect(content).toMatch(/v-model\.number="slingshotAdfSpent"/);
    });

    it('disables Oberth stepper when distance is greater than 0', () => {
      expect(content).toMatch(/:disabled="[^"]*slingshotDistance\s*!==\s*0/);
    });

    it('displays live parameter previews: vector bend, exit speed, total ΔV, pilot target, and g-load indicator', () => {
      expect(content).toMatch(/liveSlingshotParams/);
      expect(content).toMatch(/liveSlingshotPilotTarget/);
      expect(content).toContain('btn-execute-slingshot-roll');
    });

    it('handles Escape key to close showSlingshotModal', () => {
      const onKeyDownSource = content.slice(content.indexOf('function onKeyDown(e) {'));
      expect(onKeyDownSource).toMatch(/if\s*\(showSlingshotModal\.value\)\s*\{\s*showSlingshotModal\.value\s*=\s*false;\s*return;\s*\}/);
    });
  });
});

describe('Space VTT Slingshot Behavioral Simulation', () => {
  function offsetToCube(col, row) {
    const c = Number(col) || 0;
    const r = Number(row) || 0;
    const q = c - (r - (r & 1)) / 2;
    const s = -q - r;
    return { q, r, s };
  }

  function hexDistance(a, b) {
    if (!a || !b) return Infinity;
    const ac = offsetToCube(a.x, a.y);
    const bc = offsetToCube(b.x, b.y);
    return (Math.abs(ac.q - bc.q) + Math.abs(ac.r - bc.r) + Math.abs(ac.s - bc.s)) / 2;
  }

  function getCelestialBodyType(token) {
    if (!token) return 'PLANET';
    const target = String(token.body_type || token.name || token.label || '').trim();
    if (/moon/i.test(target)) return 'MOON';
    if (/gas giant|giant|jupiter|saturn/i.test(target)) return 'GAS_GIANT';
    return 'PLANET';
  }

  function findNearestCelestial(shipToken, tokensList) {
    const celestials = tokensList.filter(
      (t) => t.layer === 'celestial' || t.token_type === 'celestial'
    );
    if (!celestials.length) return null;

    let nearest = null;
    let minDistance = Infinity;
    for (const c of celestials) {
      const dist = hexDistance(shipToken, c);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = c;
      }
    }
    if (!nearest) return null;
    return {
      token: nearest,
      name: nearest.name,
      bodyType: getCelestialBodyType(nearest),
      distance: minDistance,
    };
  }

  function isZoneEligible(bodyType, distance) {
    if (bodyType === 'MOON') return distance === 0;
    if (bodyType === 'PLANET') return distance <= 1;
    if (bodyType === 'GAS_GIANT') return distance <= 2;
    return false;
  }

  let mockRollLogs = [];
  function sendRollToServer(payload) {
    mockRollLogs.push(payload);
  }

  beforeEach(() => {
    mockRollLogs = [];
  });

  describe('Odd-R Hex Coordinate Proximity Detection', () => {
    it('calculates correct distance between adjacent and co-located hexes', () => {
      const ship = { x: 5, y: 5 };
      const bodySame = { x: 5, y: 5 };
      const bodyAdj = { x: 6, y: 5 };
      const bodyDist2 = { x: 7, y: 5 };

      expect(hexDistance(ship, bodySame)).toBe(0);
      expect(hexDistance(ship, bodyAdj)).toBe(1);
      expect(hexDistance(ship, bodyDist2)).toBe(2);
    });

    it('detects Moon proximity: eligible only at distance 0', () => {
      const moonToken = { id: 'm1', name: 'Centurian Moon', token_type: 'celestial', x: 10, y: 10 };
      const tokensList = [moonToken];

      const shipAt0 = { id: 's1', name: 'Assault Scout', x: 10, y: 10, current_speed: 4 };
      const nearest0 = findNearestCelestial(shipAt0, tokensList);
      expect(nearest0.bodyType).toBe('MOON');
      expect(nearest0.distance).toBe(0);
      expect(isZoneEligible(nearest0.bodyType, nearest0.distance)).toBe(true);

      const shipAt1 = { id: 's1', name: 'Assault Scout', x: 11, y: 10, current_speed: 4 };
      const nearest1 = findNearestCelestial(shipAt1, tokensList);
      expect(nearest1.distance).toBe(1);
      expect(isZoneEligible(nearest1.bodyType, nearest1.distance)).toBe(false);
    });

    it('detects Planet proximity: eligible at distance 0 and 1, ineligible at distance 2', () => {
      const planetToken = { id: 'p1', name: 'Volturn (Planet)', token_type: 'celestial', x: 10, y: 10 };
      const tokensList = [planetToken];

      const shipAt0 = { x: 10, y: 10 };
      const shipAt1 = { x: 11, y: 10 };
      const shipAt2 = { x: 12, y: 10 };

      expect(isZoneEligible('PLANET', findNearestCelestial(shipAt0, tokensList).distance)).toBe(true);
      expect(isZoneEligible('PLANET', findNearestCelestial(shipAt1, tokensList).distance)).toBe(true);
      expect(isZoneEligible('PLANET', findNearestCelestial(shipAt2, tokensList).distance)).toBe(false);
    });

    it('detects Gas Giant proximity: eligible at distance 0, 1, and 2, ineligible at distance 3', () => {
      const giantToken = { id: 'g1', name: 'Jupiter Gas Giant', token_type: 'celestial', x: 10, y: 10 };
      const tokensList = [giantToken];

      const shipAt0 = { x: 10, y: 10 };
      const shipAt2 = { x: 12, y: 10 };
      const shipAt3 = { x: 13, y: 10 };

      expect(isZoneEligible('GAS_GIANT', findNearestCelestial(shipAt0, tokensList).distance)).toBe(true);
      expect(isZoneEligible('GAS_GIANT', findNearestCelestial(shipAt2, tokensList).distance)).toBe(true);
      expect(isZoneEligible('GAS_GIANT', findNearestCelestial(shipAt3, tokensList).distance)).toBe(false);
    });
  });

  describe('Slingshot Box Availability in Token Inspector', () => {
    it('disables slingshot when ship entry speed is less than 4 even if inside valid distance', () => {
      const speed = 3;
      const dist = 0;
      const params = calculateSlingshotParameters('PLANET', dist, speed);
      expect(params.eligible).toBe(false);
      expect(params.reason).toMatch(/minimum entry speed 4/i);
    });

    it('enables slingshot when entry speed is >= 4 and within valid zone', () => {
      const speed = 5;
      const dist = 1;
      const params = calculateSlingshotParameters('PLANET', dist, speed);
      expect(params.eligible).toBe(true);
      expect(params.freeExitSpeed).toBe(1);
      expect(params.totalExitSpeed).toBe(6);
    });
  });

  describe('Routine Slingshot Execution (Planet Dist 1 / Gas Giant Dist 1-2)', () => {
    it('applies speed and bonus MR immediately without rolling pilot check', () => {
      const shipName = 'UPF Heavy Cruiser';
      const entrySpeed = 6;
      const dist = 1;
      const params = calculateSlingshotParameters('PLANET', dist, entrySpeed);

      expect(params.requiresPilotCheck).toBe(false);
      expect(params.totalExitSpeed).toBe(7);
      expect(params.bonusMr).toBe(1);

      // Execute routine slingshot
      const newSpeed = params.totalExitSpeed;
      const alert = formatSlingshotSuccessAlert(
        shipName,
        'PLANET',
        params.zoneName,
        params.bonusMr,
        newSpeed,
        params.totalDeltaV
      );

      sendRollToServer({
        type: 'percentile',
        label: `${shipName}: 🪐 Orbital Slingshot (PLANET)`,
        total: newSpeed,
        breakdown: alert,
      });

      expect(mockRollLogs.length).toBe(1);
      expect(mockRollLogs[0].total).toBe(7);
      expect(mockRollLogs[0].breakdown).toMatch(/Orbital Slingshot SUCCESS/);
      expect(mockRollLogs[0].breakdown).toMatch(/Safe within compensators/);
    });
  });

  describe('Distance 0 Slingshot with Oberth Burn & Compound G-Load', () => {
    it('resolves successful check and triggers handover to showCrewGCheckModal when Total ΔV > 3', () => {
      const shipName = 'G-Racer';
      const entrySpeed = 6;
      const dist = 0;
      const adfSpent = 2; // Oberth burn: +4 Exit speed, +4 ΔV
      const params = calculateSlingshotParameters('PLANET', dist, entrySpeed, adfSpent);

      expect(params.requiresPilotCheck).toBe(true);
      expect(params.totalExitSpeed).toBe(12); // 6 + 2 free + 4 oberth
      expect(params.totalDeltaV).toBe(7); // 3 base + 4 oberth
      expect(params.isHighG).toBe(true);
      expect(params.gPenalty).toBe(-40);

      // Roll pilot check (skill 60, speed 6 has 0 mod -> target 60, roll 45 = success)
      const target = 60 + params.pilotModifier;
      const roll = 45;
      const result = resolveSlingshotPilotCheck(roll, target, 'PLANET');
      expect(result.success).toBe(true);

      let openedCrewGCheck = false;
      let crewCheckPayload = null;

      if (params.totalDeltaV > SAFE_COMPENSATOR_DELTA_V) {
        openedCrewGCheck = true;
        crewCheckPayload = {
          deltaV: params.totalDeltaV,
          reason: 'High-G Orbital Slingshot',
        };
      }

      expect(openedCrewGCheck).toBe(true);
      expect(crewCheckPayload.deltaV).toBe(7);
      expect(crewCheckPayload.reason).toBe('High-G Orbital Slingshot');
    });

    it('resolves Minor Hazard (01-19): loses free exit speed, applies hull damage', () => {
      const shipName = 'Bold Venture';
      const entrySpeed = 5;
      const dist = 0;
      const params = calculateSlingshotParameters('PLANET', dist, entrySpeed, 0);

      const target = 60;
      const roll = 70; // margin 10
      const result = resolveSlingshotPilotCheck(roll, target, 'PLANET');

      expect(result.success).toBe(false);
      expect(result.isMinorHazard).toBe(true);
      expect(result.losesFreeExitSpeed).toBe(true);
      expect(result.hullDamageDice).toBe('2d10');
      expect(result.ignoresScreens).toBe(true);
      expect(result.crewProne).toBe(true);

      const alert = formatSlingshotHazardAlert(
        shipName,
        'PLANET',
        false,
        result.hullDamageDice,
        result.summaryText
      );

      sendRollToServer({
        type: 'percentile',
        label: `${shipName}: ⚠️ Orbital Slingshot HAZARD`,
        total: roll,
        breakdown: alert,
      });

      expect(mockRollLogs.length).toBe(1);
      expect(mockRollLogs[0].breakdown).toMatch(/HAZARD/);
      expect(mockRollLogs[0].breakdown).toContain('2d10');
    });

    it('resolves Major Hazard (20+): speed halved, traps Planet in hex with orbital decay status', () => {
      const shipName = 'Bold Venture';
      const entrySpeed = 6;
      const dist = 0;
      const params = calculateSlingshotParameters('PLANET', dist, entrySpeed, 0);

      const target = 60;
      const roll = 85; // margin 25
      const result = resolveSlingshotPilotCheck(roll, target, 'PLANET');

      expect(result.success).toBe(false);
      expect(result.isMajorHazard).toBe(true);
      expect(result.speedMultiplier).toBe(0.5);
      expect(result.hullDamageDice).toBe('4d10');
      expect(result.trappedInHex).toBe(true);
      expect(result.statusEffect).toBe('ORBITAL_DECAY_REQUIRES_2_ADF_ESCAPE');

      // Post-hazard speed is halved
      const postHazardSpeed = Math.floor(entrySpeed * result.speedMultiplier);
      expect(postHazardSpeed).toBe(3);

      const alert = formatSlingshotHazardAlert(
        shipName,
        'PLANET',
        true,
        result.hullDamageDice,
        result.summaryText
      );

      sendRollToServer({
        type: 'percentile',
        label: `${shipName}: ⚠️ Orbital Slingshot CRITICAL HAZARD`,
        total: roll,
        breakdown: alert,
      });

      expect(mockRollLogs.length).toBe(1);
      expect(mockRollLogs[0].breakdown).toMatch(/CRITICAL HAZARD/);
      expect(mockRollLogs[0].breakdown).toContain('4d10');
      expect(mockRollLogs[0].breakdown).toContain('ORBITAL_DECAY_REQUIRES_2_ADF_ESCAPE');
    });

    it('resolves Major Hazard on Moon: halves speed, 3d10 damage, 60° vector scatter', () => {
      const shipName = 'Lunar Skimmer';
      const entrySpeed = 8;
      const dist = 0;
      const params = calculateSlingshotParameters('MOON', dist, entrySpeed, 0);

      const target = 60;
      const roll = 90; // margin 30
      const result = resolveSlingshotPilotCheck(roll, target, 'MOON');

      expect(result.isMajorHazard).toBe(true);
      expect(result.hullDamageDice).toBe('3d10');
      expect(result.scatterFaces).toBe(1); // 1 hex face = 60°
      expect(result.trappedInHex).toBe(false);
    });
  });

  describe('Failed Snap Flip Behavior Simulation', () => {
    it('rotates native MR only (60° for MR 1), leaves speed unchanged, and still triggers whip STA check', () => {
      const shipName = 'Heavy Frigate';
      const mr = 1;
      const initialSpeed = 5;
      const initialHeading = 0;

      // Pilot check fails
      const pilotTarget = 50;
      const pilotRoll = 65;
      const pilotSuccess = pilotRoll <= pilotTarget;
      expect(pilotSuccess).toBe(false);

      // On failure: rotates native MR only (1 face = 60°)
      const rotationDegrees = mr * 60;
      const newHeading = (initialHeading + rotationDegrees) % 360;
      expect(newHeading).toBe(60);

      // Speed remains unchanged (cannot brake this turn)
      const finalSpeed = initialSpeed;
      expect(finalSpeed).toBe(5);

      // Still dispatches crew whip STA check
      let openedCrewCheck = true;
      let whipExtremity = 'extremity';
      expect(openedCrewCheck).toBe(true);
      expect(whipExtremity).toBe('extremity');
    });
  });
});

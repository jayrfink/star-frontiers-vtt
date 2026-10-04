import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SpaceVttView Center Token Placement', () => {
  const filePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('contains getEmptyCenterCoords function', () => {
    expect(content).toMatch(/function getEmptyCenterCoords\s*\(/);
  });

  it('calls getEmptyCenterCoords in openAddTokenModal', () => {
    const modalSection = content.slice(content.indexOf('function openAddTokenModal'));
    expect(modalSection).toMatch(/getEmptyCenterCoords\s*\(/);
  });

  it('evaluates coordinates within radius 2 of map center', () => {
    expect(content).toMatch(/initialRadius\s*=\s*2/);
  });
});

describe('Space VTT Center Placement Algorithm simulation', () => {
  function simulateSpawn(mapW, mapH, tokens) {
    const cx = Math.floor(mapW / 2);
    const cy = Math.floor(mapH / 2);
    const occupied = new Set(tokens.map((t) => `${t.x},${t.y}`));

    const initialRadius = 2;
    const initialCandidates = [];
    for (let dx = -initialRadius; dx <= initialRadius; dx++) {
      for (let dy = -initialRadius; dy <= initialRadius; dy++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
          if (!occupied.has(`${x},${y}`)) {
            initialCandidates.push({ x, y });
          }
        }
      }
    }

    if (initialCandidates.length > 0) {
      const idx = Math.floor(Math.random() * initialCandidates.length);
      return initialCandidates[idx];
    }

    const maxRadius = Math.max(mapW, mapH);
    for (let r = initialRadius + 1; r <= maxRadius; r++) {
      const ringCandidates = [];
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
            if (!occupied.has(`${x},${y}`)) {
              ringCandidates.push({ x, y });
            }
          }
        }
      }
      if (ringCandidates.length > 0) {
        const idx = Math.floor(Math.random() * ringCandidates.length);
        return ringCandidates[idx];
      }
    }

    return { x: cx, y: cy };
  }

  it('spawns within radius 2 on an empty 20x20 space hex map', () => {
    for (let i = 0; i < 20; i++) {
      const spawn = simulateSpawn(20, 20, []);
      expect(spawn.x).toBeGreaterThanOrEqual(8);
      expect(spawn.x).toBeLessThanOrEqual(12);
      expect(spawn.y).toBeGreaterThanOrEqual(8);
      expect(spawn.y).toBeLessThanOrEqual(12);
    }
  });

  it('avoids occupied hexes in center', () => {
    const tokens = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 9, y: 9 }];
    for (let i = 0; i < 20; i++) {
      const spawn = simulateSpawn(20, 20, tokens);
      expect(tokens.some((t) => t.x === spawn.x && t.y === spawn.y)).toBe(false);
    }
  });

  it('falls back to outer rings when center 5x5 is fully occupied', () => {
    const fullCenterTokens = [];
    for (let x = 8; x <= 12; x++) {
      for (let y = 8; y <= 12; y++) {
        fullCenterTokens.push({ x, y });
      }
    }
    const spawn = simulateSpawn(20, 20, fullCenterTokens);
    expect(fullCenterTokens.some((t) => t.x === spawn.x && t.y === spawn.y)).toBe(false);
    const dist = Math.max(Math.abs(spawn.x - 10), Math.abs(spawn.y - 10));
    expect(dist).toBe(3);
  });
});

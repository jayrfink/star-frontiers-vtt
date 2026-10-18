import { describe, it, expect } from 'vitest';
import { isCelestialToken, CELESTIAL_PRESET_NAMES } from '../src/utils/spaceTokens.js';

describe('spaceTokens utility', () => {
  it('exports canonical preset names', () => {
    expect(CELESTIAL_PRESET_NAMES).toEqual(['Asteroid', 'Moon', 'Centurian Moon', 'Planet']);
  });

  it('correctly identifies celestial tokens by layer', () => {
    expect(isCelestialToken({ layer: 'celestial' })).toBe(true);
    expect(isCelestialToken({ layer: 'character' })).toBe(false);
    expect(isCelestialToken({ layer: '' })).toBe(false);
    expect(isCelestialToken({})).toBe(false);
    expect(isCelestialToken(null)).toBe(false);
    expect(isCelestialToken(undefined)).toBe(false);
  });

  it('identifies celestial tokens if token_type is celestial for fallback', () => {
    expect(isCelestialToken({ token_type: 'celestial' })).toBe(true);
  });
});

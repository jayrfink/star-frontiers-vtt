export const CELESTIAL_PRESET_NAMES = [
  'Asteroid',
  'Moon',
  'Centurian Moon',
  'Planet',
];

export function isCelestialToken(token) {
  if (!token) return false;
  return token.layer === 'celestial' || token.token_type === 'celestial';
}

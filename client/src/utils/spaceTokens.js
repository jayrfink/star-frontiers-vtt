export const CELESTIAL_PRESET_NAMES = [
  'Asteroid',
  'Moon',
  'Centurian Moon',
  'Planet',
];

export function isCelestialToken(token) {
  if (!token) return false;
  if (token.layer === 'celestial' || token.token_type === 'celestial') return true;
  if (token.vehicle_data && token.vehicle_data.token_type === 'celestial') return true;
  let conds = token.conditions;
  if (typeof conds === 'string' && conds.trim()) {
    try {
      conds = JSON.parse(conds);
    } catch {
      conds = [];
    }
  }
  if (Array.isArray(conds) && conds.includes('celestial')) return true;
  return false;
}

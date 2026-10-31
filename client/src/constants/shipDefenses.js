export const SHIP_DEFENSES_CATALOG = [
  {
    id: 'reflective_hull',
    name: 'Reflective Hull',
    type: 'toggle',
    category: 'Passive Armor',
    description: 'Deflects laser and energy attacks; halves laser and beam weapon damage rounded down.',
  },
  {
    id: 'masking_screens',
    name: 'Masking Screens',
    type: 'counter',
    max: 2,
    current: 2,
    category: 'ECM Screen',
    description: 'Dispenses masking clouds to disrupt targeting and sensors (+10% / -10% hit modifier).',
  },
  {
    id: 'icm',
    name: 'ICMs',
    type: 'counter',
    max: 4,
    current: 4,
    category: 'Countermeasure',
    description: 'Interceptor Missiles launched to shoot down incoming torpedoes and rockets.',
  },
  {
    id: 'stasis_screen',
    name: 'Stasis Screen',
    type: 'toggle',
    category: 'Energy Screen',
    description: 'Generates an energy dampening field deflecting electrical beam weapons.',
  },
  {
    id: 'stealth_screen',
    name: 'Stealth Screen',
    type: 'toggle',
    category: 'Energy Screen',
    description: 'Absorbs sensor and radar sweeps, reducing ship detection profile.',
  },
  {
    id: 'proton_screen',
    name: 'Proton Screen',
    type: 'toggle',
    category: 'Energy Screen',
    description: 'Absorbs proton and energy attacks; reduces incoming energy weapon damage.',
  },
  {
    id: 'electron_screen',
    name: 'Electron Screen',
    type: 'toggle',
    category: 'Energy Screen',
    description: 'Deflects electron beam weapons and related particle attacks.',
  },
];

export function createDefenseInstance(template = {}, overrides = {}) {
  const name = overrides.name || template.name || 'Custom Defense';
  const type = overrides.type || template.type || 'toggle';
  const max = overrides.max !== undefined
    ? Number(overrides.max)
    : (template.max !== undefined ? Number(template.max) : (type === 'counter' ? 1 : 0));
  const current = overrides.current !== undefined
    ? Number(overrides.current)
    : (template.current !== undefined ? Number(template.current) : (type === 'counter' ? max : 0));
  const online = overrides.online !== undefined
    ? Boolean(overrides.online)
    : (template.online !== undefined ? Boolean(template.online) : false);

  return {
    id: overrides.id || `def_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    defense_id: overrides.defense_id || template.id || null,
    name,
    type,
    category: overrides.category || template.category || (type === 'counter' ? 'Countermeasure' : 'Screen'),
    description: overrides.description || template.description || '',
    online: type === 'toggle' ? online : false,
    current: type === 'counter' ? current : 0,
    max: type === 'counter' ? max : 0,
    status: overrides.status || template.status || 'Online',
  };
}

export function syncLegacyDefenses(defensesObj) {
  if (!defensesObj) return defensesObj;
  const items = Array.isArray(defensesObj.items) ? defensesObj.items : [];

  const rh = items.find((d) => d.id === 'reflective_hull' || d.defense_id === 'reflective_hull' || d.name?.toLowerCase().includes('reflective'));
  defensesObj.reflective_hull = rh ? (rh.online !== false) : false;

  const stasis = items.find((d) => d.id === 'stasis_screen' || d.defense_id === 'stasis_screen' || d.name?.toLowerCase().includes('stasis'));
  defensesObj.stasis_screen = stasis ? (stasis.online !== false) : false;

  const stealth = items.find((d) => d.id === 'stealth_screen' || d.defense_id === 'stealth_screen' || d.name?.toLowerCase().includes('stealth'));
  defensesObj.stealth_screen = stealth ? (stealth.online !== false) : false;

  const masking = items.find((d) => d.id === 'masking_screens' || d.defense_id === 'masking_screens' || d.name?.toLowerCase().includes('masking'));
  defensesObj.masking_screens_max = masking ? Number(masking.max || 0) : 0;
  defensesObj.masking_screens_current = masking ? Number(masking.current || 0) : 0;

  const icm = items.find((d) => d.id === 'icm' || d.defense_id === 'icm' || d.name?.toLowerCase().includes('icm') || d.name?.toLowerCase().includes('interceptor'));
  defensesObj.icm_max = icm ? Number(icm.max || 0) : 0;
  defensesObj.icm_current = icm ? Number(icm.current || 0) : 0;

  return defensesObj;
}

export function normalizeDefensesData(defenses) {
  if (Array.isArray(defenses)) {
    const items = defenses.map((d) => createDefenseInstance(d, d));
    const result = { items };
    return syncLegacyDefenses(result);
  }

  const def = defenses || {};
  let items = [];

  if (Array.isArray(def.items)) {
    items = def.items.map((d) => createDefenseInstance(d, d));
  } else {
    // Derive items from legacy keys
    const hasReflect = def.reflective_hull !== undefined ? def.reflective_hull : (def.reflect || false);
    if (hasReflect) {
      items.push(createDefenseInstance({
        id: 'reflective_hull',
        name: 'Reflective Hull',
        type: 'toggle',
        category: 'Passive Armor',
        description: 'Deflects laser and energy attacks; halves laser and beam weapon damage rounded down.',
        online: true,
      }));
    }

    if (def.stasis_screen) {
      items.push(createDefenseInstance({
        id: 'stasis_screen',
        name: 'Stasis Screen',
        type: 'toggle',
        category: 'Energy Screen',
        description: 'Generates an energy dampening field deflecting electrical beam weapons.',
        online: true,
      }));
    }

    if (def.stealth_screen) {
      items.push(createDefenseInstance({
        id: 'stealth_screen',
        name: 'Stealth Screen',
        type: 'toggle',
        category: 'Energy Screen',
        description: 'Absorbs sensor and radar sweeps, reducing ship detection profile.',
        online: true,
      }));
    }

    const maskMax = def.masking_screens_max !== undefined ? def.masking_screens_max : (def.masking ? 1 : 0);
    const maskCur = def.masking_screens_current !== undefined ? def.masking_screens_current : (def.masking ? 1 : 0);
    if (maskMax > 0) {
      items.push(createDefenseInstance({
        id: 'masking_screens',
        name: 'Masking Screens',
        type: 'counter',
        max: maskMax,
        current: maskCur,
        category: 'ECM Screen',
        description: 'Dispenses masking clouds to disrupt targeting and sensors (+10% / -10% hit modifier).',
      }));
    }

    const icmMax = def.icm_max !== undefined ? def.icm_max : (def.icm_count || 0);
    const icmCur = def.icm_current !== undefined ? def.icm_current : (def.icm_count || 0);
    if (icmMax > 0) {
      items.push(createDefenseInstance({
        id: 'icm',
        name: 'ICMs',
        type: 'counter',
        max: icmMax,
        current: icmCur,
        category: 'Countermeasure',
        description: 'Interceptor Missiles launched to shoot down incoming torpedoes and rockets.',
      }));
    }
  }

  const result = {
    reflective_hull: def.reflective_hull !== undefined ? def.reflective_hull : (def.reflect || false),
    stasis_screen: def.stasis_screen || false,
    stealth_screen: def.stealth_screen || false,
    masking_screens_max: def.masking_screens_max !== undefined ? def.masking_screens_max : (def.masking ? 1 : 0),
    masking_screens_current: def.masking_screens_current !== undefined ? def.masking_screens_current : (def.masking ? 1 : 0),
    icm_max: def.icm_max !== undefined ? def.icm_max : (def.icm_count || 0),
    icm_current: def.icm_current !== undefined ? def.icm_current : (def.icm_count || 0),
    items,
  };

  return syncLegacyDefenses(result);
}

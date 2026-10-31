import { describe, it, expect } from 'vitest';
import { SHIP_DEFENSES_CATALOG, createDefenseInstance } from '../src/constants/shipDefenses.js';

describe('Ship Defenses Catalog & Instance Factory', () => {
  it('contains standard Knight Hawks defenses', () => {
    const names = SHIP_DEFENSES_CATALOG.map((d) => d.name);
    expect(names).toContain('Reflective Hull');
    expect(names).toContain('Masking Screens');
    expect(names).toContain('ICMs');
    expect(names).toContain('Stasis Screen');
    expect(names).toContain('Stealth Screen');
    expect(names).toContain('Proton Screen');
    expect(names).toContain('Electron Screen');
  });

  it('verifies standard defense types in catalog', () => {
    const rh = SHIP_DEFENSES_CATALOG.find((d) => d.name === 'Reflective Hull');
    expect(rh.type).toBe('toggle');

    const masking = SHIP_DEFENSES_CATALOG.find((d) => d.name === 'Masking Screens');
    expect(masking.type).toBe('counter');
    expect(masking.max).toBe(2);

    const icm = SHIP_DEFENSES_CATALOG.find((d) => d.name === 'ICMs');
    expect(icm.type).toBe('counter');
    expect(icm.max).toBe(4);

    const proton = SHIP_DEFENSES_CATALOG.find((d) => d.name === 'Proton Screen');
    expect(proton.type).toBe('toggle');

    const electron = SHIP_DEFENSES_CATALOG.find((d) => d.name === 'Electron Screen');
    expect(electron.type).toBe('toggle');
  });

  it('creates a toggle defense instance with defaults', () => {
    const instance = createDefenseInstance({
      name: 'Stasis Screen',
      type: 'toggle',
      category: 'Energy Screen',
    });

    expect(instance.id).toMatch(/^def_/);
    expect(instance.name).toBe('Stasis Screen');
    expect(instance.type).toBe('toggle');
    expect(instance.online).toBe(false);
    expect(instance.status).toBe('Online');
  });

  it('creates a counter defense instance with current and max charges', () => {
    const instance = createDefenseInstance(
      {
        name: 'Masking Screens',
        type: 'counter',
        max: 2,
        current: 2,
      },
      { max: 3, current: 3 }
    );

    expect(instance.id).toMatch(/^def_/);
    expect(instance.name).toBe('Masking Screens');
    expect(instance.type).toBe('counter');
    expect(instance.max).toBe(3);
    expect(instance.current).toBe(3);
  });
});

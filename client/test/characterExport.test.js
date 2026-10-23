import { describe, it, expect } from 'vitest';
import { formatCharacterAscii } from '../src/utils/characterExport.js';

describe('formatCharacterAscii Utility', () => {
  const sampleCharacter = {
    id: 1,
    name: 'Wilks',
    race: 'Vrusk',
    psa: 'Military',
    gender: 'Male',
    height: '1.5m',
    weight: '85kg',
    str: 55,
    sta: 60,
    current_sta: 50,
    current_stamina: 50,
    max_stamina: 60,
    dex: 50,
    rs: 65,
    int: 45,
    log: 55,
    per: 40,
    ldr: 50,
    max_seu: 50,
    current_seu: 42,
    racial_abilities: {
      Ambidexterity: '85%',
      Comprehension: '15%',
    },
    skills: [
      { name: 'Beam Weapons', level: 2 },
      { name: 'Martial Arts', level: 1 },
      { name: 'Technician', level: 1 },
    ],
    inventory: [
      { name: 'Laser Pistol', weight: 1, quantity: 1, notes: 'SEU 20' },
      { name: 'Albedo Suit', weight: 2, quantity: 1, notes: 'Reflective' },
      { name: 'Medkit', weight: 1.5, quantity: 2, notes: '5 doses' },
    ],
    notes: 'Veteran scout from Pale. Specializes in frontline perimeter reconnaissance.',
  };

  it('formats full character details into clean ASCII text', () => {
    const text = formatCharacterAscii(sampleCharacter);

    // Title & Identity
    expect(text).toContain('STAR FRONTIERS (ALPHA DAWN) CHARACTER SHEET');
    expect(text).toContain('Name:        Wilks');
    expect(text).toContain('Species:     Vrusk');
    expect(text).toContain('Primary PSA: Military');
    expect(text).toContain('Gender:      Male');
    expect(text).toContain('Height:      1.5m');
    expect(text).toContain('Weight:      85kg');

    // Ability scores & tactical stats
    expect(text).toContain('STR / STA:   55 / 60');
    expect(text).toContain('Stamina: 50 / 60');
    expect(text).toContain('DEX / RS:    50 / 65');
    expect(text).toContain('Initiative Modifier: +6');
    expect(text).toContain('INT / LOG:   45 / 55');
    expect(text).toContain('PER / LDR:   40 / 50');
    expect(text).toContain('Energy Pool: 42 / 50 SEU');

    // Species abilities
    expect(text).toContain('Ambidexterity');
    expect(text).toContain('85%');
    expect(text).toContain('Comprehension');
    expect(text).toContain('15%');

    // Skills
    expect(text).toContain('Beam Weapons (Level 2)');
    expect(text).toContain('Martial Arts (Level 1)');
    expect(text).toContain('Technician (Level 1)');

    // Notes
    expect(text).toContain('Veteran scout from Pale.');
  });

  it('strictly excludes all equipment and inventory from the exported file', () => {
    const text = formatCharacterAscii(sampleCharacter);

    expect(text).not.toContain('Laser Pistol');
    expect(text).not.toContain('Albedo Suit');
    expect(text).not.toContain('Medkit');
    expect(text).not.toContain('INVENTORY');
    expect(text).not.toContain('EQUIPMENT');
  });

  it('handles empty or missing optional fields gracefully without undefined or null output', () => {
    const minimalCharacter = {
      name: 'Nameless Hero',
      race: 'Human',
    };

    const text = formatCharacterAscii(minimalCharacter);

    expect(text).toContain('Name:        Nameless Hero');
    expect(text).toContain('Species:     Human');
    expect(text).toContain('Primary PSA: Military');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('null');
    expect(text).not.toContain('NaN');
  });
});

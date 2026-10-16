import { describe, it, expect } from 'vitest';
import { buildTokenPrompt } from '../src/imageGeneratorService.js';

describe('imageGeneratorService', () => {
  it('builds prompt from explicit user visual description', () => {
    const prompt = buildTokenPrompt({
      prompt: 'A four-armed Yazirian pirate with a thermal dagger and dark battle goggles',
      name: 'Yazirian Pirate Captain',
      species: 'Yazirian',
      category: 'npc',
      weapon: 'Thermal Dagger',
    });

    expect(prompt).toContain('A four-armed Yazirian pirate with a thermal dagger');
    expect(prompt).toContain('Cinematic sci-fi character portrait');
    expect(prompt).toContain('centered composition for circular tabletop battle token');
  });

  it('builds prompt for NPC when no description is provided', () => {
    const prompt = buildTokenPrompt({
      name: 'Sathar Sniper',
      species: 'Sathar',
      category: 'npc',
      weapon: 'Heavy Laser Rifle',
      armor: 'Skein Suit',
    });

    expect(prompt).toContain('Star Frontiers Sathar soldier');
    expect(prompt).toContain('Heavy Laser Rifle');
    expect(prompt).toContain('Skein Suit');
  });

  it('builds prompt for Creature when no description is provided', () => {
    const prompt = buildTokenPrompt({
      name: 'Sand Burrower',
      category: 'creature',
      attacks: 'Venomous Stinger, Mandibles',
    });

    expect(prompt).toContain('alien predatory beast called Sand Burrower');
    expect(prompt).toContain('Venomous Stinger, Mandibles');
  });
});

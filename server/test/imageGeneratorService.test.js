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

  it('throws RATE_LIMITED error with retryAfter when provider returns 402/429', async () => {
    const { generateAiImage } = await import('../src/imageGeneratorService.js');
    const origFetch = global.fetch;
    global.fetch = async () => ({
      ok: false,
      status: 402,
      headers: {
        get: (h) => (h.toLowerCase() === 'retry-after' ? '30' : null),
      },
      json: async () => ({
        error: { message: 'Free limit reached: 1 image every 45 seconds per IP. Retry after 30s' },
      }),
    });

    try {
      await expect(generateAiImage('test prompt')).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        status: 429,
        retryAfter: 30,
      });
    } finally {
      global.fetch = origFetch;
    }
  });

  it('saves generated AI token art directly into the specified target folder without creating duplicate raw files', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const sharp = (await import('sharp')).default;
    const { generateTokenArtFromDescription } = await import('../src/imageGeneratorService.js');

    const tmpUploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-ai-folder-test-'));
    const origFetch = global.fetch;

    const pngBuffer = await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 20, g: 120, b: 200, alpha: 1 } },
    })
      .png()
      .toBuffer();

    global.fetch = async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => pngBuffer.buffer.slice(pngBuffer.byteOffset, pngBuffer.byteOffset + pngBuffer.byteLength),
    });

    try {
      const result = await generateTokenArtFromDescription({
        prompt: 'Cybernetic bounty hunter',
        name: 'Vrusk Hunter',
        species: 'Vrusk',
        category: 'npc',
        threat_tier: 2,
        folder: 'species/vrusk',
        uploadDir: tmpUploadsDir,
      });

      expect(result.token_image_url).toMatch(/^\/uploads\/species\/vrusk\/vrusk-hunter-\d+\.png$/);
      expect(result.source_image_url).toBe(result.token_image_url);
      expect(result.folder).toBe('species/vrusk');

      const savedRelPath = result.token_image_url.replace(/^\/uploads\//, '');
      const savedFullPath = path.join(tmpUploadsDir, savedRelPath);
      expect(fs.existsSync(savedFullPath)).toBe(true);

      // Ensure no raw_*.jpg file was dumped in root uploadsDir
      const rootFiles = fs.readdirSync(tmpUploadsDir).filter((f) => f.startsWith('raw_'));
      expect(rootFiles).toHaveLength(0);
    } finally {
      global.fetch = origFetch;
      fs.rmSync(tmpUploadsDir, { recursive: true, force: true });
    }
  });

  it('rejects path traversal in folder parameter with status 400', async () => {
    const { generateTokenArtFromDescription } = await import('../src/imageGeneratorService.js');
    await expect(
      generateTokenArtFromDescription({
        name: 'Traversal Test',
        folder: '../../etc',
      })
    ).rejects.toMatchObject({
      status: 400,
    });
  });
});

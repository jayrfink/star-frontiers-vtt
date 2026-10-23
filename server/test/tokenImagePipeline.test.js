import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  generateTokenRingImage,
  getTierRingColor,
} from '../src/tokenImagePipeline.js';

describe('Token Image & Circular Masking Pipeline', () => {
  const testOutputDir = path.resolve(__dirname, 'fixtures/token_output');

  beforeEach(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('maps Threat Tiers to distinct ring border colors', () => {
    expect(getTierRingColor(1)).toBe('#2ecc71'); // Green
    expect(getTierRingColor(2)).toBe('#3498db'); // Blue
    expect(getTierRingColor(3)).toBe('#9b59b6'); // Purple
    expect(getTierRingColor(4)).toBe('#f1c40f'); // Gold
    expect(getTierRingColor(5)).toBe('#e74c3c'); // Crimson
  });

  it('generates a 256x256 transparent PNG token with circular ring border for an NPC', async () => {
    const outputPath = path.join(testOutputDir, 'sathar_trooper.png');

    const result = await generateTokenRingImage({
      label: 'Sathar Trooper',
      threatTier: 2,
      category: 'npc',
      outputPath,
      size: 256,
    });

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(result.outputPath).toBe(outputPath);
    expect(result.ringColor).toBe('#3498db');

    const metadata = await sharp(outputPath).metadata();
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
    expect(metadata.format).toBe('png');
    expect(metadata.channels).toBe(4); // RGBA with transparency
  });

  it('generates a 256x256 token for a creature with Tier 3 purple ring', async () => {
    const outputPath = path.join(testOutputDir, 'volturnian_stalker.png');

    const result = await generateTokenRingImage({
      label: 'Volturnian Stalker',
      threatTier: 3,
      category: 'creature',
      outputPath,
      size: 256,
    });

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(result.ringColor).toBe('#9b59b6');

    const metadata = await sharp(outputPath).metadata();
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
  });

  it('masks an existing source portrait into a circular token with Threat Tier border ring', async () => {
    const sourcePath = path.join(testOutputDir, 'raw_portrait.png');
    const outputPath = path.join(testOutputDir, 'masked_token.png');

    // Create a dummy source portrait
    await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 200, g: 50, b: 50 },
      },
    })
      .png()
      .toFile(sourcePath);

    const result = await generateTokenRingImage({
      label: 'Sathar Elite',
      threatTier: 4,
      category: 'npc',
      sourceImagePath: sourcePath,
      outputPath,
      size: 256,
    });

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(result.ringColor).toBe('#f1c40f'); // Tier 4 Gold

    const metadata = await sharp(outputPath).metadata();
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
    expect(metadata.format).toBe('png');
    expect(metadata.channels).toBe(4);
  });

  it('generates token without throwing when label contains special XML characters (<, &, >)', async () => {
    const outputPath = path.join(testOutputDir, 'special_chars.png');

    const result = await generateTokenRingImage({
      label: '<Unknown> & Hostile',
      threatTier: 1,
      category: 'creature',
      outputPath,
      size: 256,
    });

    expect(fs.existsSync(outputPath)).toBe(true);
    const metadata = await sharp(outputPath).metadata();
    expect(metadata.width).toBe(256);
    expect(metadata.format).toBe('png');
  });
});

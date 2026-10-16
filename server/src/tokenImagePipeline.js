import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Maps Threat Tiers (1-5) to distinct tactical border ring colors
 */
export function getTierRingColor(tier) {
  const map = {
    1: '#2ecc71', // Tier 1: Emerald Green (Minion/Green)
    2: '#3498db', // Tier 2: Cobalt Blue (Regular/Soldier)
    3: '#9b59b6', // Tier 3: Amethyst Purple (Veteran/Apex)
    4: '#f1c40f', // Tier 4: Imperial Gold (Elite/Behemoth)
    5: '#e74c3c', // Tier 5: Crimson Red (Boss/Gargantuan)
  };
  return map[tier] || '#95a5a6';
}

/**
 * Generates an SVG string for a circular masked sci-fi token with a Threat Tier border ring
 */
function buildTokenSvg({ label, threatTier, category, size, ringColor }) {
  const radius = size / 2;
  const strokeWidth = Math.max(4, Math.round(size * 0.035));
  const innerRadius = radius - strokeWidth - 2;

  const initials = (label || 'ADV')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Distinct category icon glyph
  const categoryIcon = category === 'creature' ? '🐾' : '👤';

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Radial dark sci-fi background gradient -->
        <radialGradient id="tokenBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1f2937" />
          <stop offset="85%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#020617" />
        </radialGradient>
        
        <!-- Subtle glow for tier ring -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${ringColor}" flood-opacity="0.6"/>
        </filter>
      </defs>

      <!-- Base circle with gradient -->
      <circle cx="${radius}" cy="${radius}" r="${innerRadius}" fill="url(#tokenBg)" />

      <!-- Center Silhouette / Initials -->
      <text x="${radius}" y="${radius - 10}" 
            font-family="system-ui, -apple-system, sans-serif" 
            font-size="${Math.round(size * 0.28)}px" 
            font-weight="bold" 
            fill="#f8fafc" 
            text-anchor="middle" 
            dominant-baseline="central">
        ${initials}
      </text>

      <!-- Category Glyph -->
      <text x="${radius}" y="${radius + Math.round(size * 0.22)}" 
            font-size="${Math.round(size * 0.15)}px" 
            text-anchor="middle" 
            dominant-baseline="central">
        ${categoryIcon}
      </text>

      <!-- Outer Threat Tier Ring -->
      <circle cx="${radius}" cy="${radius}" r="${innerRadius}" 
              fill="none" 
              stroke="${ringColor}" 
              stroke-width="${strokeWidth}" 
              filter="url(#glow)" />

      <!-- Inner accent hairline ring -->
      <circle cx="${radius}" cy="${radius}" r="${innerRadius - strokeWidth}" 
              fill="none" 
              stroke="${ringColor}" 
              stroke-opacity="0.3" 
              stroke-width="1.5" />
    </svg>
  `;
}

/**
 * Processes or generates a circular ringed token image asset
 */
export async function generateTokenRingImage({
  label = 'Adversary',
  threatTier = 1,
  category = 'npc',
  sourceImagePath = null,
  outputPath,
  size = 256,
}) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const ringColor = getTierRingColor(threatTier);

  if (sourceImagePath && fs.existsSync(sourceImagePath)) {
    // Composite source image with circular mask and border ring
    const radius = size / 2;
    const strokeWidth = Math.max(4, Math.round(size * 0.035));
    const innerRadius = radius - strokeWidth - 2;

    const maskSvg = Buffer.from(`
      <svg width="${size}" height="${size}">
        <circle cx="${radius}" cy="${radius}" r="${innerRadius}" fill="#fff" />
      </svg>
    `);

    const ringSvg = Buffer.from(`
      <svg width="${size}" height="${size}">
        <circle cx="${radius}" cy="${radius}" r="${innerRadius}" fill="none" stroke="${ringColor}" stroke-width="${strokeWidth}" />
      </svg>
    `);

    await sharp(sourceImagePath)
      .resize(size, size, { fit: 'cover' })
      .composite([
        { input: maskSvg, blend: 'dest-in' },
        { input: ringSvg, blend: 'over' },
      ])
      .png()
      .toFile(outputPath);
  } else {
    // Generate stylized SVG token
    const svg = buildTokenSvg({ label, threatTier, category, size, ringColor });
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
  }

  return {
    outputPath,
    ringColor,
    format: 'png',
    size,
  };
}

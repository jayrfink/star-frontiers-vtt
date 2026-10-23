import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTokenRingImage } from './tokenImagePipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');

/**
 * Builds an enhanced image generation prompt for sci-fi tokens
 */
export function buildTokenPrompt({ prompt, name, species, category, weapon, armor, attacks }) {
  const parts = [];
  if (prompt && prompt.trim()) {
    parts.push(prompt.trim());
  } else if (category === 'creature') {
    parts.push(`A vicious alien predatory beast called ${name || 'Alien Stalker'}`);
    if (attacks) parts.push(`with natural attacks: ${attacks}`);
  } else {
    parts.push(`A Star Frontiers ${species || 'alien'} soldier called ${name || 'Trooper'}`);
    if (weapon) parts.push(`armed with a futuristic ${weapon}`);
    if (armor) parts.push(`wearing ${armor}`);
  }

  return `${parts.join(', ')}. Cinematic sci-fi character portrait, high contrast, centered composition for circular tabletop battle token, dark dramatic lighting.`;
}

/**
 * Fetches an AI-generated image from available providers
 */
export async function generateAiImage(enhancedPrompt) {
  // 1. OpenAI DALL-E if API key present
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const b64 = data.data?.[0]?.b64_json;
        if (b64) return Buffer.from(b64, 'base64');
      }
    } catch (err) {
      console.warn('OpenAI image generation failed, falling back to Pollinations:', err.message);
    }
  }

  // 2. Pollinations AI (free, no API key required, supports POLLINATIONS_API_KEY / POLLEN_KEY)
  const apiKey = process.env.POLLINATIONS_API_KEY || process.env.POLLEN_KEY;
  const encoded = encodeURIComponent(enhancedPrompt);
  const seed = Math.floor(Math.random() * 1000000);
  let url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${seed}&nologo=true`;
  if (apiKey) {
    url += `&key=${apiKey}`;
  }

  const fetchWithTimeout = async (targetUrl) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const headers = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const res = await fetch(targetUrl, { signal: controller.signal, headers });
      clearTimeout(timeout);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  };

  let res = await fetchWithTimeout(url);

  if (!res.ok) {
    const retryHeader = res.headers.get('retry-after');
    let retrySeconds = retryHeader ? parseInt(retryHeader, 10) : 0;
    let providerError = '';
    try {
      const errorJson = await res.json();
      providerError = errorJson?.error?.message || '';
      if (!retrySeconds && errorJson?.error?.message) {
        const match = errorJson.error.message.match(/retry after (\d+)s/i);
        if (match) retrySeconds = parseInt(match[1], 10);
      }
    } catch {
      // not json
    }

    // Auto-retry once if retry wait is short (<= 8s)
    if ((res.status === 402 || res.status === 429) && retrySeconds > 0 && retrySeconds <= 8) {
      await new Promise((r) => setTimeout(r, (retrySeconds + 1) * 1000));
      res = await fetchWithTimeout(url);
    }

    if (!res.ok) {
      if (res.status === 402 || res.status === 429) {
        const waitTime = retrySeconds || 45;
        const err = new Error(
          `AI image rate limit reached (free tier allows 1 generation every 45s). Please wait ${waitTime} seconds before trying again, or select/upload an image.`
        );
        err.code = 'RATE_LIMITED';
        err.status = 429;
        err.retryAfter = waitTime;
        throw err;
      }
      throw new Error(`AI generation provider returned status ${res.status}: ${providerError || 'Unknown provider error'}`);
    }
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generates AI token art, saves raw image, applies circular mask + tier ring
 */
export async function generateTokenArtFromDescription({
  prompt,
  name = 'Adversary',
  species = 'Human',
  category = 'npc',
  threat_tier = 2,
  weapon,
  armor,
  attacks,
  uploadDir,
}) {
  const enhancedPrompt = buildTokenPrompt({ prompt, name, species, category, weapon, armor, attacks });
  const imageBuffer = await generateAiImage(enhancedPrompt);

  const uploadsDir = uploadDir || path.join(DATA_DIR, 'uploads');
  const tokensUploadDir = path.join(uploadsDir, 'tokens');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(tokensUploadDir)) fs.mkdirSync(tokensUploadDir, { recursive: true });

  const slug = `${(name || 'adversary').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-6)}`;
  const rawFileName = `raw_${slug}.jpg`;
  const rawFilePath = path.join(uploadsDir, rawFileName);
  fs.writeFileSync(rawFilePath, imageBuffer);

  const tokenFileName = `token_${slug}.png`;
  const tokenFilePath = path.join(tokensUploadDir, tokenFileName);

  await generateTokenRingImage({
    sourceImagePath: rawFilePath,
    outputPath: tokenFilePath,
    threatTier: threat_tier,
    category,
    label: name,
    size: 256,
  });

  return {
    source_image_url: `/uploads/${rawFileName}`,
    token_image_url: `/uploads/tokens/${tokenFileName}`,
    enhanced_prompt: enhancedPrompt,
  };
}

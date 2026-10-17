/**
 * Tabletop Dice Audio Manager Service
 *
 * Provides physical wooden tabletop dice roll audio effects with:
 * - Anti-repetition track selection
 * - Pitch/playbackRate micro-variations (0.96 - 1.04)
 * - Remote roll volume attenuation (volume * 0.55)
 * - Mute and volume state persistence via localStorage (sf_vtt_audio_settings)
 * - Autoplay policy rejection resilience
 */

export const SOUND_FILES = [
  '/assets/sounds/dice/roll_wood_1.mp3',
  '/assets/sounds/dice/roll_wood_2.mp3',
  '/assets/sounds/dice/roll_wood_3.mp3',
];

export const STORAGE_KEY = 'sf_vtt_audio_settings';

const DEFAULT_SETTINGS = {
  muted: false,
  volume: 0.8,
};

let currentSettings = loadSettings();
let lastTrackIndex = -1;
const preloadedPool = [];

function getAudioConstructor() {
  if (typeof Audio !== 'undefined') {
    return Audio;
  }
  if (typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
    return window.Audio;
  }
  return null;
}

function loadSettings() {
  if (typeof localStorage === 'undefined' || !localStorage.getItem) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      muted: typeof parsed?.muted === 'boolean' ? parsed.muted : DEFAULT_SETTINGS.muted,
      volume:
        typeof parsed?.volume === 'number' && !Number.isNaN(parsed.volume)
          ? Math.max(0, Math.min(1, parsed.volume))
          : DEFAULT_SETTINGS.volume,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  if (typeof localStorage === 'undefined' || !localStorage.setItem) {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
  } catch {
    // Ignore storage write errors (e.g. quota exceeded or private mode)
  }
}

function preloadSounds() {
  const AudioCtor = getAudioConstructor();
  if (!AudioCtor) return;
  try {
    for (const src of SOUND_FILES) {
      const audio = new AudioCtor(src);
      if ('preload' in audio) {
        audio.preload = 'auto';
      }
      preloadedPool.push(audio);
    }
  } catch {
    // Ignore preload failures in restricted/test environments
  }
}

preloadSounds();

function selectNextTrackIndex() {
  if (SOUND_FILES.length <= 1) return 0;
  let nextIndex;
  do {
    nextIndex = Math.floor(Math.random() * SOUND_FILES.length);
  } while (nextIndex === lastTrackIndex);
  lastTrackIndex = nextIndex;
  return nextIndex;
}

/**
 * Returns whether dice sound effects are muted.
 * @returns {boolean}
 */
export function isMuted() {
  return currentSettings.muted;
}

/**
 * Sets explicit mute state and persists settings.
 * @param {boolean} muted
 */
export function setMuted(muted) {
  currentSettings.muted = Boolean(muted);
  saveSettings();
}

/**
 * Toggles current mute state and persists settings.
 * @returns {boolean} New mute state
 */
export function toggleMute() {
  currentSettings.muted = !currentSettings.muted;
  saveSettings();
  return currentSettings.muted;
}

/**
 * Returns current master volume (0.0 to 1.0).
 * @returns {number}
 */
export function getVolume() {
  return currentSettings.volume;
}

/**
 * Sets master volume clamped between 0.0 and 1.0 and persists settings.
 * @param {number} volume
 */
export function setVolume(volume) {
  if (typeof volume !== 'number' || Number.isNaN(volume) || !Number.isFinite(volume)) {
    return;
  }
  currentSettings.volume = Math.max(0, Math.min(1, volume));
  saveSettings();
}

/**
 * Plays a tabletop dice roll sound effect.
 *
 * @param {Object} [options]
 * @param {boolean} [options.isRemote=false] If true, applies 0.55 volume scale factor
 * @returns {Promise<void>}
 */
export async function playDiceSound({ isRemote = false } = {}) {
  if (isMuted()) {
    return;
  }

  const AudioCtor = getAudioConstructor();
  if (!AudioCtor) {
    return;
  }

  const trackIndex = selectNextTrackIndex();
  const soundUrl = SOUND_FILES[trackIndex];

  try {
    const audio = new AudioCtor(soundUrl);

    // Subtle pitch/speed variation (0.96x - 1.04x) for natural acoustics
    const rate = 0.96 + Math.random() * (1.04 - 0.96);
    audio.playbackRate = rate;

    // Remote rolls are scaled down by 0.55 (default 0.8 * 0.55 = 0.44)
    const effectiveVolume = isRemote ? currentSettings.volume * 0.55 : currentSettings.volume;
    audio.volume = Math.max(0, Math.min(1, effectiveVolume));

    try {
      audio.currentTime = 0;
    } catch {
      // Ignore in mock or restricted environments
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      await playPromise.catch(() => {});
    }
  } catch {
    // Silently swallow errors (e.g. autoplay restriction or playback failure)
  }
}

export default {
  playDiceSound,
  toggleMute,
  setMuted,
  isMuted,
  setVolume,
  getVolume,
  SOUND_FILES,
  STORAGE_KEY,
};

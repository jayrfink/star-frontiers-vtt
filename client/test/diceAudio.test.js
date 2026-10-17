import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('diceAudio service', () => {
  let createdAudios = [];
  let storage = {};
  let originalAudio;
  let originalLocalStorage;

  beforeEach(() => {
    createdAudios = [];
    storage = {};

    originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: vi.fn((key) => (key in storage ? storage[key] : null)),
      setItem: vi.fn((key, value) => {
        storage[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete storage[key];
      }),
      clear: vi.fn(() => {
        storage = {};
      }),
    };

    originalAudio = globalThis.Audio;
    class MockAudio {
      constructor(src) {
        this.src = src;
        this.volume = 1.0;
        this.playbackRate = 1.0;
        this.currentTime = 0;
        this.paused = true;
        this.play = vi.fn().mockImplementation(() => {
          this.paused = false;
          return Promise.resolve();
        });
        this.pause = vi.fn().mockImplementation(() => {
          this.paused = true;
        });
        this.cloneNode = vi.fn().mockImplementation(() => {
          const clone = new MockAudio(this.src);
          clone.volume = this.volume;
          clone.playbackRate = this.playbackRate;
          return clone;
        });
        createdAudios.push(this);
      }
    }
    globalThis.Audio = MockAudio;
    if (typeof window !== 'undefined') {
      window.Audio = MockAudio;
    }
  });

  afterEach(() => {
    vi.resetModules();
    globalThis.Audio = originalAudio;
    globalThis.localStorage = originalLocalStorage;
  });

  it('1. isMuted() defaults to false and getVolume() defaults to 0.8', async () => {
    const diceAudio = await import('../src/services/diceAudio.js');
    expect(diceAudio.isMuted()).toBe(false);
    expect(diceAudio.getVolume()).toBeCloseTo(0.8, 2);
  });

  it('2. toggleMute() toggles mute state and persists to localStorage', async () => {
    const diceAudio = await import('../src/services/diceAudio.js');
    expect(diceAudio.isMuted()).toBe(false);

    const mutedState = diceAudio.toggleMute();
    expect(mutedState).toBe(true);
    expect(diceAudio.isMuted()).toBe(true);

    const saved = JSON.parse(storage['sf_vtt_audio_settings']);
    expect(saved.muted).toBe(true);

    const unmutedState = diceAudio.toggleMute();
    expect(unmutedState).toBe(false);
    expect(diceAudio.isMuted()).toBe(false);

    const saved2 = JSON.parse(storage['sf_vtt_audio_settings']);
    expect(saved2.muted).toBe(false);
  });

  it('3. setMuted(boolean) explicitly sets mute state and persists', async () => {
    const diceAudio = await import('../src/services/diceAudio.js');
    diceAudio.setMuted(true);
    expect(diceAudio.isMuted()).toBe(true);
    expect(JSON.parse(storage['sf_vtt_audio_settings']).muted).toBe(true);

    diceAudio.setMuted(false);
    expect(diceAudio.isMuted()).toBe(false);
    expect(JSON.parse(storage['sf_vtt_audio_settings']).muted).toBe(false);
  });

  it('4. setVolume() clamps between 0.0 and 1.0 and persists', async () => {
    const diceAudio = await import('../src/services/diceAudio.js');

    diceAudio.setVolume(0.5);
    expect(diceAudio.getVolume()).toBeCloseTo(0.5, 2);
    expect(JSON.parse(storage['sf_vtt_audio_settings']).volume).toBeCloseTo(0.5, 2);

    // Clamps upper bound to 1.0
    diceAudio.setVolume(1.8);
    expect(diceAudio.getVolume()).toBe(1.0);
    expect(JSON.parse(storage['sf_vtt_audio_settings']).volume).toBe(1.0);

    // Clamps lower bound to 0.0
    diceAudio.setVolume(-0.4);
    expect(diceAudio.getVolume()).toBe(0.0);
    expect(JSON.parse(storage['sf_vtt_audio_settings']).volume).toBe(0.0);

    // Calling setVolume with NaN or non-number preserves existing volume
    diceAudio.setVolume(0.65);
    expect(diceAudio.getVolume()).toBeCloseTo(0.65, 2);

    diceAudio.setVolume(NaN);
    expect(diceAudio.getVolume()).toBeCloseTo(0.65, 2);
    expect(JSON.parse(storage['sf_vtt_audio_settings']).volume).toBeCloseTo(0.65, 2);

    diceAudio.setVolume('invalid');
    expect(diceAudio.getVolume()).toBeCloseTo(0.65, 2);

    diceAudio.setVolume(null);
    expect(diceAudio.getVolume()).toBeCloseTo(0.65, 2);

    diceAudio.setVolume(undefined);
    expect(diceAudio.getVolume()).toBeCloseTo(0.65, 2);

    diceAudio.setVolume(Infinity);
    expect(diceAudio.getVolume()).toBeCloseTo(0.65, 2);
  });

  it('5. restores saved settings from localStorage on initial load', async () => {
    storage['sf_vtt_audio_settings'] = JSON.stringify({ muted: true, volume: 0.35 });
    const diceAudio = await import('../src/services/diceAudio.js');

    expect(diceAudio.isMuted()).toBe(true);
    expect(diceAudio.getVolume()).toBeCloseTo(0.35, 2);
  });

  it('6. playDiceSound() creates/plays audio element with volume 0.8 for local roll', async () => {
    const diceAudio = await import('../src/services/diceAudio.js');
    createdAudios = [];

    await diceAudio.playDiceSound();

    expect(createdAudios.length).toBeGreaterThan(0);
    const playedAudio = createdAudios[createdAudios.length - 1];
    expect(playedAudio.play).toHaveBeenCalledTimes(1);
    expect(playedAudio.volume).toBeCloseTo(0.8, 2);
    expect(playedAudio.src).toMatch(/\/assets\/sounds\/dice\/roll_wood_[123]\.mp3$/);
  });

  it('7. playDiceSound({ isRemote: true }) scales volume to volume * 0.55 = 0.44', async () => {
    const diceAudio = await import('../src/services/diceAudio.js');
    createdAudios = [];

    await diceAudio.playDiceSound({ isRemote: true });

    const playedAudio = createdAudios[createdAudios.length - 1];
    expect(playedAudio.play).toHaveBeenCalledTimes(1);
    expect(playedAudio.volume).toBeCloseTo(0.44, 2);
  });

  it('8. playDiceSound() does nothing when muted', async () => {
    const diceAudio = await import('../src/services/diceAudio.js');
    diceAudio.setMuted(true);
    createdAudios = [];

    await diceAudio.playDiceSound();

    const playedCalls = createdAudios.filter((a) => a.play.mock.calls.length > 0);
    expect(playedCalls.length).toBe(0);
  });

  it('9. Anti-repetition: sequential calls alternate among available tracks', async () => {
    const diceAudio = await import('../src/services/diceAudio.js');

    const playedSources = [];
    for (let i = 0; i < 20; i++) {
      createdAudios = [];
      await diceAudio.playDiceSound();
      const last = createdAudios[createdAudios.length - 1];
      playedSources.push(last.src);
    }

    expect(playedSources.length).toBe(20);
    for (let i = 1; i < playedSources.length; i++) {
      expect(playedSources[i]).not.toBe(playedSources[i - 1]);
    }
  });

  it('10. playDiceSound applies randomized playbackRate between 0.96 and 1.04', async () => {
    const diceAudio = await import('../src/services/diceAudio.js');

    const rates = [];
    for (let i = 0; i < 10; i++) {
      createdAudios = [];
      await diceAudio.playDiceSound();
      const last = createdAudios[createdAudios.length - 1];
      rates.push(last.playbackRate);
    }

    rates.forEach((rate) => {
      expect(rate).toBeGreaterThanOrEqual(0.96);
      expect(rate).toBeLessThanOrEqual(1.04);
    });
    // Check that not all rates are completely identical
    const uniqueRates = new Set(rates.map((r) => r.toFixed(4)));
    expect(uniqueRates.size).toBeGreaterThan(1);
  });

  it('11. Graceful handling when Audio.prototype.play() rejects (autoplay policy)', async () => {
    const diceAudio = await import('../src/services/diceAudio.js');
    createdAudios = [];

    // Make play reject with NotAllowedError (standard browser autoplay block)
    class RejectingAudio {
      constructor(src) {
        this.src = src;
        this.volume = 1.0;
        this.playbackRate = 1.0;
        this.currentTime = 0;
        this.play = vi.fn().mockRejectedValue(new Error('NotAllowedError: play() failed because the user didn\'t interact with the document first.'));
        this.pause = vi.fn();
        createdAudios.push(this);
      }
    }
    globalThis.Audio = RejectingAudio;

    // Should resolve cleanly without throwing
    await expect(diceAudio.playDiceSound()).resolves.not.toThrow();
  });
});

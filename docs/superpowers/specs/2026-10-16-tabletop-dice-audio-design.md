# Tabletop Dice Rolling Sound Effects Design Specification

## Overview
This specification details the architecture, audio assets, audio management service, user controls, and testing strategy for authentic physical dice-rolling sound effects in the Star Frontiers Virtual Tabletop. When a user rolls percentile dice, damage dice, or adversary attack/damage actions, the application plays a realistic acoustic recording of dice tumbling across a solid wooden tabletop. Sound also plays at a softer volume when remote rolls are received from teammates over Socket.io, with a one-click mute toggle accessible on both tabletops.

---

## 1. Audio Assets & Storage

### 1.1 Audio Files
- **Directory**: `client/public/assets/sounds/dice/`
- **Files**:
  - `roll_wood_1.mp3`: Standard 2-die tumble and settling on solid hardwood (~1.2s duration).
  - `roll_wood_2.mp3`: Energetic multi-bounce roll with crisp resonant clatter (~1.4s duration).
  - `roll_wood_3.mp3`: Shorter, direct tabletop tumble and rattle (~1.1s duration).
- **Encoding**: 44.1 kHz, 128 kbps stereo MP3, normalized peak levels, lightweight (< 40 KB per file, ~100 KB total).

---

## 2. Audio Service Architecture (`client/src/services/diceAudio.js`)

A dedicated audio manager encapsulates all audio loading, playback, randomization, and user preference persistence.

### 2.1 Interface & Methods
```javascript
export function playDiceSound({ isRemote = false } = {}): Promise<void>;
export function toggleMute(): boolean;
export function setMuted(muted: boolean): void;
export function isMuted(): boolean;
export function setVolume(volume: number): void;
export function getVolume(): number;
```

### 2.2 Audio Engine Logic
1. **Audio Instance Pooling & Preloading**:
   - Maintains an internal array of pre-instantiated `Audio` elements for each sound file.
   - On first call or during component mount, prepares audio elements to ensure zero playback latency when the dice are rolled.
2. **Organic Variation & Anti-Repetition**:
   - Randomly picks an audio variation from the sound pool.
   - Tracks the last played track index and avoids playing the exact same audio file twice in a row.
   - Applies subtle randomized playback rate variation (`playbackRate` between `0.96` and `1.04`) on each roll so identical samples sound acoustically unique.
3. **Local vs. Remote Acoustic Hierarchy**:
   - Master volume defaults to `0.8` (configurable between `0.0` and `1.0`).
   - **Local rolls** (`isRemote: false`): Play at full master volume (`volume * 1.0`).
   - **Remote rolls** (`isRemote: true`): Play at a softer volume (`volume * 0.55`) so players have clear spatial and acoustic distinction between their own physical dice and teammate rolls.
4. **Error Handling & Browser Autoplay Policies**:
   - Wraps `audio.play()` in a `.catch()` block to gracefully handle any browser autoplay restrictions (e.g., if a remote roll arrives before the user has interacted with the page) without console errors or crashing the VTT.
5. **State Persistence**:
   - Persists audio settings (`isMuted`, `volume`) in `localStorage` under `sf_vtt_audio_settings` via `userState.js` utilities.

---

## 3. VTT Integration & UI Controls

### 3.1 RPG VTT & Space VTT Integration
In [`client/src/views/RpgVttView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/RpgVttView.vue) and [`client/src/views/SpaceVttView.vue`](file:///Users/jrf/star-frontiers-vtt/client/src/views/SpaceVttView.vue):

1. **Local Roll Triggers**:
   - `rollPercentile()`: Calls `playDiceSound({ isRemote: false })` immediately upon throwing 3D dice.
   - `rollDamage()`: Calls `playDiceSound({ isRemote: false })` immediately upon throwing 3D dice.
   - `onAdversaryRollAttack()` & `onAdversaryRollDamage()`: Calls `playDiceSound({ isRemote: false })`.
2. **Remote Roll Trigger**:
   - In Socket.io listener `socket.on('roll:created', (data) => ...)`:
     - If `data?.roll?.username !== authStore.user?.username`, calls `playDiceSound({ isRemote: true })`.

### 3.2 UI Mute Button
- Placed directly in the dice roller toolbar / bottom dice panel beside the Roll Log toggle button in both `RpgVttView.vue` and `SpaceVttView.vue`:
  ```html
  <button
    type="button"
    class="btn-audio-toggle"
    :title="isDiceAudioMuted ? 'Unmute dice audio' : 'Mute dice audio'"
    @click="toggleDiceAudio"
  >
    {{ isDiceAudioMuted ? '🔇' : '🔊' }}
  </button>
  ```
- Reactive state `isDiceAudioMuted` synchronized with `diceAudio.isMuted()`.

---

## 4. Verification & Testing

### 4.1 Unit Tests (`client/test/diceAudio.test.js`)
- Preloads audio files and initializes audio instances.
- Verifies `playDiceSound` handles `{ isRemote: false }` and `{ isRemote: true }` with correct volume scaling.
- Verifies anti-repetition and pitch/playbackRate variation.
- Verifies mute state toggles, suppresses sound playback when muted, and persists in storage.
- Verifies graceful error suppression when `audio.play()` rejects.

### 4.2 Component & Integration Tests (`client/test/RpgVttDiceAudio.test.js` / `SpaceVttRollLog.test.js`)
- Verifies local percentile and damage roll actions trigger `playDiceSound({ isRemote: false })`.
- Verifies remote socket `roll:created` triggers `playDiceSound({ isRemote: true })` only when roll is from another user.
- Verifies clicking the mute button updates UI icon and calls `toggleMute()`.

### 4.3 End-to-End Build & Test Run
- Full client suite passes (`docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`).
- Full server suite passes (`docker exec sf-vtt-dev bash -c "cd server && npm test"`).

# Tabletop Dice Rolling Sound Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add realistic tabletop dice rolling sound effects to the Star Frontiers VTT that play during local 3D rolls and remote teammate rolls with anti-repetition variation, volume scaling, and a one-click mute toggle.

**Architecture:** Create an audio manager service `client/src/services/diceAudio.js` that preloads authentic wooden tabletop dice roll MP3 assets, manages randomized playback variation (pitch/playback rate `0.96`–`1.04`), distinguishes local vs. remote volume (`1.0` vs `0.55`), and persists mute state in `localStorage`. Integrate audio triggers into `RpgVttView.vue` and `SpaceVttView.vue` across local rolls and `roll:created` socket events, with a `🔊 / 🔇` toggle button in the dice roller toolbar.

**Tech Stack:** HTML5 Audio API, Vue 3, Pinia, Socket.io-client, Vitest.

## Global Constraints
- Run all test and build commands in container: `docker exec sf-vtt-dev bash -c "<command>"`
- Full client test suite & build: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
- Full server test suite: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
- Audio files must reside in `client/public/assets/sounds/dice/` and be lightweight (< 50 KB each, high clarity).
- Audio service must handle browser autoplay restrictions gracefully via `.catch()` without logging errors or throwing.
- Sound playback must be non-blocking and have zero latency.
- Mute state and volume must be persisted per user in `localStorage` (`sf_vtt_audio_settings`).
- Remote rolls must play at reduced volume (`0.55 * masterVolume`) to distinguish from local rolls.
- Dark sci-fi aesthetic for the mute/unmute UI button matching existing VTT controls.

---

### Task 1: Tabletop Dice Audio Assets & Audio Manager Service with Unit Tests

**Files:**
- Create: `client/public/assets/sounds/dice/roll_wood_1.mp3`, `client/public/assets/sounds/dice/roll_wood_2.mp3`, `client/public/assets/sounds/dice/roll_wood_3.mp3`
- Create: `client/src/services/diceAudio.js`
- Test: `client/test/diceAudio.test.js`

**Interfaces:**
- Produces:
  - `playDiceSound({ isRemote = false } = {}): Promise<void>`
  - `toggleMute(): boolean`
  - `setMuted(boolean): void`
  - `isMuted(): boolean`
  - `setVolume(number): void`
  - `getVolume(): number`

- [ ] **Step 1: Create authentic tabletop dice audio files**

Generate/bundle 3 distinct wooden tabletop dice roll audio files (`roll_wood_1.mp3`, `roll_wood_2.mp3`, `roll_wood_3.mp3`) in `client/public/assets/sounds/dice/`.
Each sample features initial table impact, polyhedral tumbling rattle, and final settling clicks.

- [ ] **Step 2: Write failing unit tests in `client/test/diceAudio.test.js`**

Add unit tests covering:
1. `isMuted()` defaults to false and `getVolume()` defaults to 0.8.
2. `toggleMute()` toggles mute state and persists to `localStorage`.
3. `setVolume()` clamps between 0.0 and 1.0 and persists.
4. `playDiceSound()` creates/plays audio element with volume 0.8 for local roll.
5. `playDiceSound({ isRemote: true })` scales volume to `0.8 * 0.55 = 0.44`.
6. `playDiceSound()` does nothing when muted.
7. Anti-repetition: sequential calls alternate among available tracks.
8. Graceful handling when `Audio.prototype.play()` rejects (autoplay policy).

- [ ] **Step 3: Run test to verify failure**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/diceAudio.test.js"`
Expected: FAIL (module `client/src/services/diceAudio.js` does not exist).

- [ ] **Step 4: Implement `client/src/services/diceAudio.js`**

Implement:
1. Load audio files array:
   `const SOUND_FILES = ['/assets/sounds/dice/roll_wood_1.mp3', '/assets/sounds/dice/roll_wood_2.mp3', '/assets/sounds/dice/roll_wood_3.mp3'];`
2. Pool of `Audio` elements with preloading.
3. Storage key `sf_vtt_audio_settings` read/write helper.
4. `isMuted`, `toggleMute`, `setMuted`, `setVolume`, `getVolume`.
5. `playDiceSound({ isRemote = false })`:
   - If muted, returns early.
   - Selects track index differing from previous.
   - Clones or resets audio element, sets `playbackRate` to randomized value `0.96`–`1.04`.
   - Computes volume: `isRemote ? volume * 0.55 : volume`.
   - Calls `audio.play().catch(() => {})`.

- [ ] **Step 5: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/diceAudio.test.js"`
Expected: PASS (all tests green).

- [ ] **Step 6: Commit**

```bash
git add client/public/assets/sounds/dice/ client/src/services/diceAudio.js client/test/diceAudio.test.js
git commit -m "feat(audio): add tabletop dice audio assets and diceAudio manager service"
```

---

### Task 2: VTT Roller Integration, Remote Roll Socket Trigger, UI Mute Button & Tests

**Files:**
- Modify: `client/src/views/RpgVttView.vue`
- Modify: `client/src/views/SpaceVttView.vue`
- Test: `client/test/RpgVttDiceAudio.test.js`

**Interfaces:**
- Consumes:
  - `playDiceSound`, `toggleMute`, `isMuted` from `client/src/services/diceAudio.js`
- Connects:
  - Local rolls: `rollPercentile()`, `rollDamage()`, `onAdversaryRollAttack()`, `onAdversaryRollDamage()`
  - Remote rolls: `socket.on('roll:created')`

- [ ] **Step 1: Write failing tests in `client/test/RpgVttDiceAudio.test.js`**

Add tests covering:
1. `rollPercentile` and `rollDamage` invoke `playDiceSound({ isRemote: false })`.
2. Socket event `roll:created` from another username invokes `playDiceSound({ isRemote: true })`.
3. Socket event `roll:created` from same username does NOT re-trigger `playDiceSound`.
4. Mute toggle button renders in dice panel and toggles icon between `🔊` and `🔇`.

- [ ] **Step 2: Run test to verify failure**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/RpgVttDiceAudio.test.js"`
Expected: FAIL.

- [ ] **Step 3: Implement integration in `RpgVttView.vue` & `SpaceVttView.vue`**

Implement:
1. Import `playDiceSound, toggleMute as toggleDiceMute, isMuted as isDiceMuted` from `../services/diceAudio.js`.
2. Reactive ref `isDiceAudioMuted = ref(isDiceMuted())`.
3. Function `toggleAudioMute()`: calls `toggleDiceMute()` and updates `isDiceAudioMuted.value`.
4. Add mute button `btn-audio-toggle` in bottom dice roller tray beside the Roll Log toggle.
5. In `rollPercentile()`: call `playDiceSound({ isRemote: false })`.
6. In `rollDamage()`: call `playDiceSound({ isRemote: false })`.
7. In `onAdversaryRollAttack()` & `onAdversaryRollDamage()`: call `playDiceSound({ isRemote: false })`.
8. In `setupSocketListeners()` on `roll:created`: if `roll.username !== authStore.user?.username`, call `playDiceSound({ isRemote: true })`.
9. Mirror same integration into `SpaceVttView.vue`.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/RpgVttDiceAudio.test.js"`
Expected: PASS.

- [ ] **Step 5: Verify full client test suite, production build, and server tests**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: PASS (all tests pass, build succeeds).

- [ ] **Step 6: Commit**

```bash
git add client/src/views/RpgVttView.vue client/src/views/SpaceVttView.vue client/test/RpgVttDiceAudio.test.js
git commit -m "feat(vtt): integrate tabletop dice audio triggers and mute toggle in RPG and Space VTTs"
```

# Freeform Damage/Heal, Full Reset Buttons & Character SEU Tracker Implementation Plan

This implementation plan delivers:
1. Freeform `+/-` delta damage and healing inputs on Character Sheets (Stamina) and Ship Sheets (Hull Points).
2. Full Reset buttons on Character Sheets (`🔄 Full Rest`) and Ship Sheets (`🔄 Full Repair & Resupply`).
3. Dedicated SEU Energy Pool Tracker on Character Sheets (Approach A) with token sync and database persistence.

---

## Proposed File Changes

| File | Subsystem | Responsibility |
| --- | --- | --- |
| `server/src/db.js` | Server DB | Add `max_seu` and `current_seu` columns to `character_sheets` with automated SQLite migration. |
| `server/src/sheets.js` | Server API | Accept and persist `max_seu` & `current_seu` in character CRUD; cascade `current_seu` to active `tokens.seu_current`. |
| `server/test/sheets.test.js` | Server Tests | Unit tests verifying `max_seu` and `current_seu` persistence, clamping, and token sync. |
| `client/src/views/CharacterSheetsView.vue` | Client View | Add freeform damage/heal inputs, Full Rest button, and SEU Tracker Card with quick burns and styles. |
| `client/test/CharacterSheetsView.test.js` | Client Tests | Unit tests verifying STA freeform delta, Full Rest button, and SEU Tracker functionality. |
| `client/src/views/ShipSheetsView.vue` | Client View | Add freeform damage/heal inputs and Full Repair & Resupply button restoring HP, DCR, and ammo. |
| `client/test/ShipSheetsView.test.js` | Client Tests | Unit tests verifying HP freeform delta and Full Repair & Resupply button. |

---

## Tasks

### Task 1: Backend Database & Character Sheets API for SEU Tracking

**Files:**
- `server/src/db.js`
- `server/src/sheets.js`
- `server/test/sheets.test.js`

**Step 1.1: Write failing test in `server/test/sheets.test.js`**
- Test that `POST /api/characters` accepts `max_seu` and `current_seu` (defaulting to 50 if omitted).
- Test that `PUT /api/characters/:id` updates `current_seu` and clamps it between 0 and `max_seu`.
- Test that updating a character sheet with a new `current_seu` cascades to any active map token with matching `character_id`.

**Step 1.2: Run test to confirm failure**
```bash
docker exec sf-vtt-dev sh -c "cd server && npx vitest run test/sheets.test.js"
```

**Step 1.3: Implement schema migration in `server/src/db.js`**
- In `CREATE TABLE IF NOT EXISTS character_sheets`, add `max_seu INTEGER NOT NULL DEFAULT 50` and `current_seu INTEGER NOT NULL DEFAULT 50`.
- In `migrate(db)`, check `PRAGMA table_info(character_sheets)` and add `max_seu` and `current_seu` columns via `ALTER TABLE` if not already present.

**Step 1.4: Implement API handling in `server/src/sheets.js`**
- In `POST /api/characters`, sanitize and insert `max_seu` and `current_seu`.
- In `PUT /api/characters/:id`, sanitize, clamp (`0 <= current_seu <= max_seu`), and update `max_seu` and `current_seu`.
- When `current_seu` is updated, update `tokens.seu_current` where `character_id = ?` and emit socket event `token:updated`.

**Step 1.5: Run tests to confirm passing**
```bash
docker exec sf-vtt-dev sh -c "cd server && npx vitest run test/sheets.test.js"
```

**Step 1.6: Commit Task 1**
```bash
git add server/src/db.js server/src/sheets.js server/test/sheets.test.js
git commit -m "feat(server): add character sheet SEU columns, migration, API support, and token cascade"
```

---

### Task 2: Character Sheet UI — Freeform Delta, Full Rest & SEU Tracker

**Files:**
- `client/src/views/CharacterSheetsView.vue`
- `client/test/CharacterSheetsView.test.js`

**Step 2.1: Write failing tests in `client/test/CharacterSheetsView.test.js`**
- Test that freeform delta input exists in `.stamina-controls` and `applyStaminaDamage` / `applyStaminaHeal` clamp appropriately.
- Test that `🔄 Full Rest` button restores `current_stamina` to `max_stamina` and `current_seu` to `max_seu`.
- Test that SEU energy pool card renders with quick burn buttons (`-1`, `-2`, `-5`, `+5`), bar fill, and freeform delta input.

**Step 2.2: Run test to confirm failure**
```bash
docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/CharacterSheetsView.test.js"
```

**Step 2.3: Implement Freeform Delta & Full Rest in `CharacterSheetsView.vue`**
- Add `staminaDelta` state.
- In `.stamina-controls`, add delta input and `- Dmg` / `+ Heal` buttons.
- In `.stamina-header`, add `🔄 Full Rest` button calling `resetCharacterStats()`.
- Add methods:
  - `applyStaminaDamage()`: `Math.max(0, current_stamina - staminaDelta)`
  - `applyStaminaHeal()`: `Math.min(max_stamina, current_stamina + staminaDelta)`
  - `resetCharacterStats()`: sets `current_stamina = max_stamina`, `current_seu = max_seu` and calls `updateCharacter()`.

**Step 2.4: Implement SEU Energy Pool Tracker card in `CharacterSheetsView.vue`**
- Add `seuDelta` state.
- Add computed properties `seuPercentage` and `seuColor` (cyan when full, yellow < 50%, red < 25%).
- Add methods:
  - `adjustSeu(amount)`
  - `applySeuBurn()`
  - `applySeuRecharge()`
  - `onMaxSeuChange()`
- Add template markup directly beneath Stamina card.
- Add scoped CSS styles for `.seu-section`, `.seu-bar-bg`, `.seu-bar-fill`, `.btn-seu`, `.freeform-delta-group`, `.btn-action-reset`.

**Step 2.5: Run tests to confirm passing**
```bash
docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/CharacterSheetsView.test.js"
```

**Step 2.6: Commit Task 2**
```bash
git add client/src/views/CharacterSheetsView.vue client/test/CharacterSheetsView.test.js
git commit -m "feat(characters): add freeform damage/heal, full rest button, and SEU energy pool tracker"
```

---

### Task 3: Ship Sheet UI — Freeform Delta & Full Repair/Resupply

**Files:**
- `client/src/views/ShipSheetsView.vue`
- `client/test/ShipSheetsView.test.js`

**Step 3.1: Write failing tests in `client/test/ShipSheetsView.test.js`**
- Test that freeform delta input exists in `.hull-controls` and `applyHullDamage` / `applyHullHeal` clamp appropriately.
- Test that `🔄 Full Repair & Resupply` restores `current_hull_points` to `max_hull_points`, `dcr` to max/preset, and sets all weapon `ammo_current = ammo_max`.

**Step 3.2: Run test to confirm failure**
```bash
docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/ShipSheetsView.test.js"
```

**Step 3.3: Implement Freeform Delta in `ShipSheetsView.vue`**
- Add `hullDelta` state.
- In `.hull-controls`, add delta input and `- Dmg` / `+ Heal` buttons.
- Add methods:
  - `applyHullDamage()`: `Math.max(0, (current_hull_points ?? 0) - hullDelta)`
  - `applyHullHeal()`: `Math.min(max_hull_points, (current_hull_points ?? 0) + hullDelta)`

**Step 3.4: Implement Full Repair & Resupply in `ShipSheetsView.vue`**
- In `.hull-header` / `.ship-actions-bar`, add `🔄 Full Repair & Resupply` button calling `resetShipStats()`.
- Add method `resetShipStats()`:
  - Restores `current_hull_points` to `max_hull_points`.
  - Finds preset in `shipPresets.js` matching `selectedShip.ship_type`; if found, resets `selectedShip.dcr = preset.dcr`.
  - For each weapon in `selectedShip.weapons`, if `ammo_max > 0`, sets `ammo_current = ammo_max`.
  - Calls `updateShip()`.

**Step 3.5: Run tests to confirm passing**
```bash
docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/ShipSheetsView.test.js"
```

**Step 3.6: Commit Task 3**
```bash
git add client/src/views/ShipSheetsView.vue client/test/ShipSheetsView.test.js
git commit -m "feat(ships): add freeform hull damage/heal and full repair & resupply button"
```

---

### Task 4: Full Suite Verification & Build

**Step 4.1: Run all client Vitest tests**
```bash
docker exec sf-vtt-dev sh -c "cd client && npx vitest run"
```

**Step 4.2: Run all server Vitest tests**
```bash
docker exec sf-vtt-dev sh -c "cd server && npm test"
```

**Step 4.3: Build client production assets**
```bash
docker exec sf-vtt-dev sh -c "cd client && npm run build"
```

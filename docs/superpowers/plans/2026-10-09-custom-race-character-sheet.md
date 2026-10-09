# Custom Race Option for Character Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow players and Game Masters to select "Custom" race and enter a custom race name when creating or editing character sheets, storing the custom race name directly while preserving baseline stats and movement rates.

**Architecture:** Update backend SQLite schema constraint and endpoint validation to accept custom race strings; update frontend CharacterSheetsView modal and header with "Custom" dropdown option, dynamic custom race text inputs, and fallback racial calculations.

**Tech Stack:** Vue 3, Express, SQLite (better-sqlite3), Vitest, Supertest.

## Global Constraints
- Run all test and build commands in the container: `docker exec sf-vtt-dev bash -c "<command>"`
- Character race defaults to `"Custom"` if custom race name is left blank when Custom is selected.
- Baseline movement rates for custom races: `{ walk: 2, run: 6, glide: 0 }`.
- Baseline stat modifiers for custom races: 0 modifiers (standard 50s).
- Maintain dark sci-fi VTT theme for all added inputs and labels.

---

### Task 1: Backend Database Migration and Validation for Custom Races

**Files:**
- Modify: `server/src/db.js`
- Modify: `server/src/sheets.js`
- Modify: `server/test/sheets.test.js`

**Interfaces:**
- Consumes: `POST /api/sheets`, `PUT /api/sheets/:id`
- Produces: API acceptance of custom `race` strings (e.g. `'Saurian'`, `'Klingon'`, `'Custom'`) while rejecting empty/whitespace-only race strings.

- [ ] **Step 1: Write the failing tests in `server/test/sheets.test.js`**

Add tests for custom race creation, update, and rejection of empty/whitespace race:
```javascript
it('allows creating a character sheet with a custom race', async () => {
  const res = await request(app)
    .post('/api/sheets')
    .set('Cookie', authCookie)
    .send({
      name: 'Gronk',
      race: 'Saurian',
      psa: 'Military',
      str: 60,
      sta: 60,
      dex: 40,
      rs: 40,
      int_stat: 45,
      log_stat: 45,
      per: 50,
      ldr: 50,
    });

  expect(res.status).toBe(201);
  expect(res.body.name).toBe('Gronk');
  expect(res.body.race).toBe('Saurian');
});

it('allows updating a character sheet to a custom race', async () => {
  const createRes = await request(app)
    .post('/api/sheets')
    .set('Cookie', authCookie)
    .send({
      name: 'Torg',
      race: 'Human',
      psa: 'Military',
      str: 50, sta: 50, dex: 50, rs: 50, int_stat: 50, log_stat: 50, per: 50, ldr: 50,
    });

  const updateRes = await request(app)
    .put(`/api/sheets/${createRes.body.id}`)
    .set('Cookie', authCookie)
    .send({
      race: 'Cyborg-Alpha',
    });

  expect(updateRes.status).toBe(200);
  expect(updateRes.body.race).toBe('Cyborg-Alpha');
});

it('rejects empty or whitespace-only race', async () => {
  const res = await request(app)
    .post('/api/sheets')
    .set('Cookie', authCookie)
    .send({
      name: 'Blanko',
      race: '   ',
      psa: 'Military',
    });

  expect(res.status).toBe(400);
});
```
Update the existing test asserting `Klingon` fails so it asserts that empty race fails instead:
```javascript
it('validates invalid race or missing fields', async () => {
  const invalidRaceRes = await request(app)
    .post('/api/sheets')
    .set('Cookie', authCookie)
    .send({
      name: 'Invalid',
      race: '   ',
    });
  expect(invalidRaceRes.status).toBe(400);

  const missingNameRes = await request(app)
    .post('/api/sheets')
    .set('Cookie', authCookie)
    .send({
      race: 'Human',
    });
  expect(missingNameRes.status).toBe(400);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npm test -- test/sheets.test.js"
```
Expected: FAIL due to `Invalid race` status 400.

- [ ] **Step 3: Update `server/src/db.js` and `server/src/sheets.js`**

In `server/src/db.js`:
1. Change `CREATE TABLE IF NOT EXISTS character_sheets` column definition:
```sql
race TEXT NOT NULL CHECK(length(trim(race)) > 0),
```
2. In `migrate(db)`, add table migration to relax the CHECK constraint on existing databases:
```javascript
const charTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='character_sheets'").get();
if (charTableInfo && charTableInfo.sql && charTableInfo.sql.includes("CHECK(race IN ('Human', 'Dralasite', 'Vrusk', 'Yazirian'))")) {
  db.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE character_sheets_dg_tmp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      race TEXT NOT NULL CHECK(length(trim(race)) > 0),
      psa TEXT NOT NULL DEFAULT 'Military' CHECK(psa IN ('Military', 'Technological', 'Biosocial')),
      gender TEXT,
      height TEXT,
      weight TEXT,
      str INTEGER NOT NULL DEFAULT 50,
      sta INTEGER NOT NULL DEFAULT 50,
      current_sta INTEGER NOT NULL DEFAULT 50,
      dex INTEGER NOT NULL DEFAULT 50,
      rs INTEGER NOT NULL DEFAULT 50,
      int_stat INTEGER NOT NULL DEFAULT 50,
      log_stat INTEGER NOT NULL DEFAULT 50,
      per INTEGER NOT NULL DEFAULT 50,
      ldr INTEGER NOT NULL DEFAULT 50,
      racial_abilities TEXT DEFAULT '{}',
      skills TEXT DEFAULT '[]',
      inventory TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    INSERT INTO character_sheets_dg_tmp (
      id, user_id, name, race, psa, gender, height, weight,
      str, sta, current_sta, dex, rs, int_stat, log_stat, per, ldr,
      racial_abilities, skills, inventory, notes, avatar_url, created_at, updated_at
    )
    SELECT
      id, user_id, name, race, psa, gender, height, weight,
      str, sta, current_sta, dex, rs, int_stat, log_stat, per, ldr,
      racial_abilities, skills, inventory, notes, avatar_url, created_at, updated_at
    FROM character_sheets;
    DROP TABLE character_sheets;
    ALTER TABLE character_sheets_dg_tmp RENAME TO character_sheets;
    PRAGMA foreign_keys = ON;
  `);
}
```

In `server/src/sheets.js`:
In `POST /`:
```javascript
if (!name || !race || typeof race !== 'string' || !race.trim()) {
  return res.status(400).json({ error: 'Name and race are required' });
}
```
Remove `const validRaces = ['Human', 'Dralasite', 'Vrusk', 'Yazirian'];` check.

In `PUT /:id`:
```javascript
if (!race || typeof race !== 'string' || !race.trim()) {
  return res.status(400).json({ error: 'Valid race is required' });
}
```
Remove `const validRaces = ['Human', 'Dralasite', 'Vrusk', 'Yazirian'];` check.

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npm test"
```
Expected: PASS all server tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/db.js server/src/sheets.js server/test/sheets.test.js
git commit -m "feat(server): support custom races in character sheets schema and api"
```

---

### Task 2: Client Custom Race Selection, Form Inputs, Fallback Stats & Unit Tests

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue`
- Create: `client/test/CharacterSheetsCustomRace.test.js`

**Interfaces:**
- Consumes: `POST /api/sheets`, `PUT /api/sheets/:id`
- Produces: UI options to select "Custom" race, enter custom race name, display custom race across sheets, and fallback to base movement and stats.

- [ ] **Step 1: Write the failing tests in `client/test/CharacterSheetsCustomRace.test.js`**

Create test file testing custom race modal behavior, custom race editing in sheet header, and fallback movement rates:
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';

describe('CharacterSheetsView - Custom Race', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));
  });

  it('renders Custom option in the create character modal race select', () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.showCreateModal = true;
    const options = wrapper.findAll('.char-create-select option');
    const values = options.map(o => o.attributes('value'));
    expect(values).toContain('Custom');
  });

  it('shows custom race input when Custom is selected in create modal', async () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.showCreateModal = true;
    wrapper.vm.newCharForm.race = 'Custom';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.custom-race-input-group').exists()).toBe(true);
  });

  it('recognizes custom race and falls back to default movement rates', async () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.selectedChar = {
      id: 99,
      name: 'Gronk',
      race: 'Saurian',
      psa: 'Military',
      str: 50, sta: 50, dex: 50, rs: 50,
      int_stat: 50, log_stat: 50, per: 50, ldr: 50,
      skills: [], inventory: []
    };
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isCustomRace('Saurian')).toBe(true);
    expect(wrapper.vm.isCustomRace('Human')).toBe(false);
    expect(wrapper.vm.movementRates).toEqual({ walk: 2, run: 6, glide: 0 });
    expect(wrapper.find('.input-custom-race').exists()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/CharacterSheetsCustomRace.test.js"
```
Expected: FAIL.

- [ ] **Step 3: Implement Custom Race UI in `client/src/views/CharacterSheetsView.vue`**

1. In template (Header):
Replace:
```html
            <div class="race-select-wrap">
              <label>Race:</label>
              <select v-model="selectedChar.race" @change="updateCharacter" class="select-race">
                <option value="Human">Human</option>
                <option value="Dralasite">Dralasite</option>
                <option value="Vrusk">Vrusk</option>
                <option value="Yazirian">Yazirian</option>
              </select>
            </div>
```
With:
```html
            <div class="race-select-wrap">
              <label>Race:</label>
              <select v-model="selectedRaceCategory" class="select-race">
                <option value="Human">Human</option>
                <option value="Dralasite">Dralasite</option>
                <option value="Vrusk">Vrusk</option>
                <option value="Yazirian">Yazirian</option>
                <option value="Custom">Custom</option>
              </select>
              <input
                v-if="selectedRaceCategory === 'Custom'"
                type="text"
                v-model="selectedChar.race"
                @change="updateCharacter"
                class="input-custom-race"
                placeholder="Custom Race Name"
              />
            </div>
```

2. In template (`race-ability-banner`):
```html
          <div class="race-ability-banner">
            <strong>Racial Info:</strong> {{ racesData[selectedChar.race]?.abilitiesDescription || 'Custom species without default racial abilities.' }}
          </div>
```

3. In template (`racial-panel`):
Add fallback after `Yazirian`:
```html
          <div v-else class="racial-details">
            <p><strong>Custom Species:</strong> Custom race without standard Star Frontiers racial traits.</p>
          </div>
```

4. In template (Create modal):
In race select:
```html
              <option value="Custom">Custom</option>
```
After race select:
```html
          <div v-if="newCharForm.race === 'Custom'" class="form-group custom-race-input-group">
            <label>Custom Race Name</label>
            <input
              type="text"
              v-model="newCharForm.customRaceName"
              class="char-create-input"
              placeholder="Enter custom race name..."
            />
          </div>
```

5. In script:
In `data()`:
Add `customRaceName: ''` to `newCharForm`:
```javascript
newCharForm: {
  name: '',
  race: 'Human',
  customRaceName: '',
  ...
}
```

Add methods:
```javascript
isCustomRace(race) {
  return !['Human', 'Dralasite', 'Vrusk', 'Yazirian'].includes(race);
},
```

In computed:
```javascript
selectedRaceCategory: {
  get() {
    if (!this.selectedChar || !this.selectedChar.race) return 'Human';
    return this.isCustomRace(this.selectedChar.race) ? 'Custom' : this.selectedChar.race;
  },
  set(val) {
    if (!this.selectedChar) return;
    if (val === 'Custom') {
      if (!this.isCustomRace(this.selectedChar.race)) {
        this.selectedChar.race = 'Custom';
        this.updateCharacter();
      }
    } else {
      this.selectedChar.race = val;
      this.updateCharacter();
    }
  }
},
movementRates() {
  if (!this.selectedChar || !RACES_DATA[this.selectedChar.race]) {
    return { walk: 2, run: 6, glide: 0 };
  }
  return RACES_DATA[this.selectedChar.race].movement;
},
```

In `submitCreateCharacter()`:
```javascript
const effectiveRace = this.newCharForm.race === 'Custom'
  ? (this.newCharForm.customRaceName?.trim() || 'Custom')
  : this.newCharForm.race;
```
Pass `effectiveRace` in the `fetch` POST body.

6. In style:
Add styles for `.input-custom-race` and `.custom-race-input-group`:
```css
.input-custom-race {
  background: var(--bg-surface-2, #1f293d);
  color: #fff;
  border: 1px solid var(--border-color, #2b3954);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.95rem;
  margin-left: 6px;
  min-width: 140px;
  box-sizing: border-box;
}
.input-custom-race:focus {
  border-color: var(--accent-cyan, #00d2ff);
  outline: none;
}
.custom-race-input-group {
  margin-top: 8px;
}
```

- [ ] **Step 4: Run tests and build to verify they pass**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/CharacterSheetsCustomRace.test.js && npm run build"
```
Expected: PASS and build succeeds.

- [ ] **Step 5: Run full test suites**

Run:
```bash
docker exec sf-vtt-dev bash -c "cd server && npm test"
docker exec sf-vtt-dev bash -c "cd client && npx vitest run"
```
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/views/CharacterSheetsView.vue client/test/CharacterSheetsCustomRace.test.js
git commit -m "feat(character-sheets): add custom race option and input controls"
```

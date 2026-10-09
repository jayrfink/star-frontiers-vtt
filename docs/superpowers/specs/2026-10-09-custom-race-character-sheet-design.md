# Custom Race Option for Character Sheet Design

## Overview
Allow players and Game Masters to specify a custom race when creating or editing a character on the character sheet. The custom race name is stored directly in the `race` field of the character, allowing it to propagate naturally throughout the application (character lists, sheets, and tactical VTT tokens) while preserving standard baseline stats and movement rates.

---

## 1. User Interface (`CharacterSheetsView.vue`)

### 1.1 Create Character Modal
- Add a `"Custom"` option to the Race dropdown:
  ```html
  <option value="Custom">Custom</option>
  ```
- When `newCharForm.race === 'Custom'`, show an input field:
  ```html
  <div v-if="newCharForm.race === 'Custom'" class="form-group custom-race-input-group">
    <label>Custom Race Name</label>
    <input type="text" v-model="newCharForm.customRaceName" placeholder="Enter species name..." />
  </div>
  ```
- In `submitCreateCharacter()`:
  - If `newCharForm.race === 'Custom'`, set the payload's `race` to `newCharForm.customRaceName.trim() || 'Custom'`.

### 1.2 Character Sheet Header (Active Character)
- Add helper method/computed property to identify standard races:
  ```javascript
  const STANDARD_RACES = ['Human', 'Dralasite', 'Vrusk', 'Yazirian'];
  function isCustomRace(race) {
    return !STANDARD_RACES.includes(race);
  }
  ```
- In the Race dropdown, bind with a computed property `selectedRaceCategory`:
  - **Getter:** If `isCustomRace(selectedChar.race)`, returns `'Custom'`; otherwise returns `selectedChar.race`.
  - **Setter:**
    - If new value is `'Custom'`, set `selectedChar.race = 'Custom'` (if it was previously a standard race) and call `updateCharacter()`.
    - If new value is a standard race, set `selectedChar.race = newValue` and call `updateCharacter()`.
- When `isCustomRace(selectedChar.race)` or `selectedRaceCategory === 'Custom'`, display an inline text input next to the select:
  ```html
  <input
    type="text"
    v-model="selectedChar.race"
    @change="updateCharacter"
    class="input-custom-race"
    placeholder="Custom Race Name"
  />
  ```

### 1.3 Rules and Stat Calculations Fallback
- `movementRates`: Fall back gracefully to `{ walk: 2, run: 6, glide: 0 }` if `selectedChar.race` is not in `RACES_DATA`.
- `abilitiesDescription`: Fall back to `'Custom species without default racial abilities.'` in `race-ability-banner`.
- `racial-panel` (Racial Traits & Abilities):
  - When `isCustomRace(selectedChar.race)`, render:
    ```html
    <div v-else class="racial-details">
      <p><strong>Custom Species:</strong> Custom race without standard Star Frontiers racial traits.</p>
    </div>
    ```

---

## 2. Backend & Database

### 2.1 Schema Definition & Migration (`server/src/db.js`)
- Update `CREATE TABLE IF NOT EXISTS character_sheets` to:
  ```sql
  race TEXT NOT NULL CHECK(length(trim(race)) > 0),
  ```
- In `migrate(db)`:
  - Check the existing table schema via `sqlite_master` for `character_sheets`.
  - If it contains `CHECK(race IN ('Human', 'Dralasite', 'Vrusk', 'Yazirian'))`:
    1. Turn off foreign keys (`PRAGMA foreign_keys = OFF;`).
    2. Create temporary table with relaxed constraint.
    3. Copy all data across from `character_sheets`.
    4. Drop `character_sheets`.
    5. Rename temporary table to `character_sheets`.
    6. Re-enable foreign keys (`PRAGMA foreign_keys = ON;`).

### 2.2 Sheets Route Validation (`server/src/sheets.js`)
- Update `POST /` and `PUT /:id` validation:
  - Replace the strict `validRaces.includes(race)` check with:
    ```javascript
    if (!race || typeof race !== 'string' || !race.trim()) {
      return res.status(400).json({ error: 'Valid race is required' });
    }
    ```

---

## 3. Testing Strategy

1. **Server Unit Tests (`server/test/sheets.test.js`)**:
   - Verify creating a character sheet with a custom race (e.g. `'Saurian'`) succeeds with status 201 and stores `'Saurian'`.
   - Verify updating a character to a custom race works.
   - Verify validation fails if `race` is empty or whitespace.
2. **Client Unit Tests (`client/test/CharacterSheetsCustomRace.test.js`)**:
   - Verify the Create Character modal renders the Custom option and displays the custom race input when chosen.
   - Verify creating with custom race sets the race appropriately.
   - Verify selecting Custom on an existing sheet allows entering custom race name and falls back to standard movement / baseline stats without errors.

# Character & Ship Sheets "Notes" Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multiline `"Notes"` textbox section (`<textarea>`) to both Character Sheets and Ship Sheets that persists to the existing backend `notes` field and synchronizes across users.

**Architecture:** Both `character_sheets` and `ship_sheets` SQLite tables and REST/Socket endpoints in `server/src/sheets.js` already support `notes`. On the client, we normalize `notes` to `''` in `CharacterSheetsView.vue` and `ShipSheetsView.vue`, include `notes` in `PUT` updates, and render a full-width `.card.notes-section` with header `"Notes"` and a styled `<textarea class="notes-textarea">` at the bottom of `.sheet-detail`.

**Tech Stack:** Vue 3 (Options API), Vitest (`@vue/server-renderer`)

---

### Task 1: Add "Notes" Section to Character Sheets & Unit Tests

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue`
- Modify: `client/test/CharacterSheetsView.test.js`

- [ ] **Step 1: Write the failing tests in `client/test/CharacterSheetsView.test.js`**

Append a new `describe('Character Notes Section', ...)` block to `client/test/CharacterSheetsView.test.js`:

```javascript
  describe('Character Notes Section', () => {
    it('normalizes missing notes to empty string and preserves existing notes', () => {
      const normalize = CharacterSheetsView.methods.normalizeCharacterData;
      const charWithoutNotes = normalize({ name: 'Ace' });
      expect(charWithoutNotes.notes).toBe('');

      const charWithNotes = normalize({ name: 'Ace', notes: 'Carries backup power clip' });
      expect(charWithNotes.notes).toBe('Carries backup power clip');
    });

    it('sends notes in updateCharacter PUT payload', async () => {
      let sentBody = null;
      const origFetch = global.fetch;
      global.fetch = async (url, opts) => {
        sentBody = JSON.parse(opts.body);
        return { ok: true, json: async () => sentBody };
      };

      try {
        const vm = {
          selectedChar: {
            id: 42,
            name: 'Ace',
            str: 50,
            sta: 50,
            dex: 50,
            rs: 50,
            int: 50,
            log: 50,
            per: 50,
            ldr: 50,
            current_stamina: 50,
            notes: 'Met contact on Volturnus',
          },
          characters: [{ id: 42, name: 'Ace', notes: '' }],
          normalizeCharacterData: CharacterSheetsView.methods.normalizeCharacterData,
        };

        await CharacterSheetsView.methods.updateCharacter.call(vm);
        expect(sentBody).not.toBeNull();
        expect(sentBody.notes).toBe('Met contact on Volturnus');
      } finally {
        global.fetch = origFetch;
      }
    });
  });
```

- [ ] **Step 2: Run test in container to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/CharacterSheetsView.test.js"`
Expected: FAIL (`expected undefined to be ''`).

- [ ] **Step 3: Implement "Notes" section and normalization in `client/src/views/CharacterSheetsView.vue`**

1. In `client/src/views/CharacterSheetsView.vue` template, immediately after the closing `</div>` of `<div class="two-column-lists">` (around line 417, before closing `</div>` of `.sheet-detail`), add:
```html
        <!-- Notes Section -->
        <section class="card notes-section">
          <div class="section-header">
            <h4>Notes</h4>
          </div>
          <textarea
            v-model="selectedChar.notes"
            @change="updateCharacter"
            class="notes-textarea"
            rows="4"
            placeholder="Add notes..."
          ></textarea>
        </section>
```
2. In `normalizeCharacterData(char)` (around line 794), add:
```javascript
      c.notes = c.notes || '';
```
3. In `<style scoped>` of `client/src/views/CharacterSheetsView.vue`, add styles for `.notes-section` and `.notes-textarea`:
```css
.notes-section {
  margin-top: 1.5rem;
}

.notes-textarea {
  width: 100%;
  box-sizing: border-box;
  background-color: #121212;
  border: 1px solid #333;
  border-radius: 4px;
  color: #e0e0e0;
  padding: 0.75rem;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
  min-height: 90px;
}

.notes-textarea:focus {
  outline: none;
  border-color: #4fc3f7;
}
```

- [ ] **Step 4: Run test in container to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/CharacterSheetsView.test.js"`
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add client/src/views/CharacterSheetsView.vue client/test/CharacterSheetsView.test.js
git commit -m "feat(character-sheets): add Notes textbox section to character sheets"
```

---

### Task 2: Add "Notes" Section to Ship Sheets & Unit Tests

**Files:**
- Modify: `client/src/views/ShipSheetsView.vue`
- Modify: `client/test/ShipSheetsView.test.js`

- [ ] **Step 1: Write the failing tests in `client/test/ShipSheetsView.test.js`**

Append a new `describe('ShipSheetsView - Ship Notes Section', ...)` block to `client/test/ShipSheetsView.test.js`:

```javascript
describe('ShipSheetsView - Ship Notes Section', () => {
  it('normalizes missing notes to empty string and preserves existing notes', () => {
    const vm = {
      normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
      normalizeWeapons: ShipSheetsView.methods.normalizeWeapons,
    };
    const shipWithoutNotes = ShipSheetsView.methods.normalizeShip.call(vm, { name: 'UPF Gullwind' });
    expect(shipWithoutNotes.notes).toBe('');

    const shipWithNotes = ShipSheetsView.methods.normalizeShip.call(vm, {
      name: 'UPF Gullwind',
      notes: 'Hyperdrive needs recalibration',
    });
    expect(shipWithNotes.notes).toBe('Hyperdrive needs recalibration');
  });

  it('sends notes in updateShip PUT payload', async () => {
    let sentBody = null;
    const origFetch = global.fetch;
    global.fetch = async (url, opts) => {
      sentBody = JSON.parse(opts.body);
      return { ok: true, json: async () => sentBody };
    };

    try {
      const vm = {
        selectedShip: {
          id: 7,
          name: 'UPF Gullwind',
          type: 'Assault Scout',
          max_hull_points: 15,
          current_hull_points: 15,
          notes: 'Docked at Cassidine',
        },
        ships: [{ id: 7, name: 'UPF Gullwind', notes: '' }],
        normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
        normalizeWeapons: ShipSheetsView.methods.normalizeWeapons,
        normalizeShip: ShipSheetsView.methods.normalizeShip,
      };

      await ShipSheetsView.methods.updateShip.call(vm);
      expect(sentBody).not.toBeNull();
      expect(sentBody.notes).toBe('Docked at Cassidine');
    } finally {
      global.fetch = origFetch;
    }
  });
});
```

- [ ] **Step 2: Run test in container to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/ShipSheetsView.test.js"`
Expected: FAIL (`expected undefined to be ''`).

- [ ] **Step 3: Implement "Notes" section and normalization in `client/src/views/ShipSheetsView.vue`**

1. In `client/src/views/ShipSheetsView.vue` template, immediately after the closing `</div>` of `<div class="two-column-lists">` (around line 318, before closing `</div>` of `.sheet-detail`), add:
```html
        <!-- Notes Section -->
        <section class="card notes-section">
          <div class="section-header">
            <h4>Notes</h4>
          </div>
          <textarea
            v-model="selectedShip.notes"
            @change="updateShip"
            class="notes-textarea"
            rows="4"
            placeholder="Add notes..."
          ></textarea>
        </section>
```
2. In `normalizeShip(ship)` (around line 551), add:
```javascript
      copy.notes = copy.notes || '';
```
3. In `updateShip()` (around line 693), include `notes: this.selectedShip.notes || ''` in `payload`.
4. In `<style scoped>` of `client/src/views/ShipSheetsView.vue`, add styles for `.notes-section` and `.notes-textarea`:
```css
.notes-section {
  margin-top: 1.5rem;
}

.notes-textarea {
  width: 100%;
  box-sizing: border-box;
  background-color: #121212;
  border: 1px solid #333;
  border-radius: 4px;
  color: #e0e0e0;
  padding: 0.75rem;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
  min-height: 90px;
}

.notes-textarea:focus {
  outline: none;
  border-color: #4fc3f7;
}
```

- [ ] **Step 4: Run test and full build in container to verify everything passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add client/src/views/ShipSheetsView.vue client/test/ShipSheetsView.test.js
git commit -m "feat(ship-sheets): add Notes textbox section to ship sheets"
```

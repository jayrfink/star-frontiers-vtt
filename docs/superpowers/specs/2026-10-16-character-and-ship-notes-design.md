# Character & Ship Sheets "Notes" Section Design

## Overview
Add a user input textbox (`<textarea>`) titled **"Notes"** to both Character Sheets (`CharacterSheetsView.vue`) and Ship Sheets (`ShipSheetsView.vue`), allowing users to record free-form text notes that persist to the database and synchronize across connected clients.

## Context & Existing Backend Support
- **Database Schema (`server/src/db.js`)**:
  - `character_sheets` already defines `notes TEXT DEFAULT ''`.
  - `ship_sheets` already defines `notes TEXT DEFAULT ''`.
- **REST & Socket API (`server/src/sheets.js`)**:
  - `GET`, `POST`, and `PUT` on `/api/characters` and `/api/ships` already read, persist, and broadcast `notes` via `character:updated` and `ship:updated` Socket.io events.
- **No backend or database schema modifications are required.**

## Frontend Changes

### 1. Character Sheets (`client/src/views/CharacterSheetsView.vue`)
- **Template**:
  - Inside `.sheet-detail` (immediately below `.two-column-lists`), add a full-width card section:
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
- **Data Normalization**:
  - In `normalizeCharacterData(char)`, ensure `c.notes = c.notes || ''`.
  - In `newCharForm`, initialize `notes: ''`.
- **Persistence**:
  - `updateCharacter()` spreads `...this.selectedChar` into the `PUT /api/characters/:id` body, persisting `notes` on `@change`.

### 2. Ship Sheets (`client/src/views/ShipSheetsView.vue`)
- **Template**:
  - Inside `.sheet-detail` (immediately below `.two-column-lists`), add a full-width card section:
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
- **Data Normalization**:
  - In `normalizeShip(ship)`, ensure `copy.notes = copy.notes || ''`.
  - In `newShipForm`, initialize `notes: ''`.
- **Persistence**:
  - `updateShip()` spreads `...this.selectedShip` and explicitly includes `notes: this.selectedShip.notes || ''` in the `PUT /api/ships/:id` payload.

### 3. Styling
- Add `.notes-section` and `.notes-textarea` styles to both `CharacterSheetsView.vue` and `ShipSheetsView.vue`:
  - Full-width (`width: 100%`, `box-sizing: border-box`), dark background (`#121212`), subtle border (`1px solid #333`), rounded corners (`4px`), light text (`#e0e0e0`), `resize: vertical`, and cyan focus border (`#4fc3f7`).

## Testing
- Add unit tests in `client/test/CharacterSheetsView.test.js` and `client/test/ShipSheetsView.test.js` verifying:
  - `normalizeCharacterData` and `normalizeShip` default `notes` to `''` and preserve existing `notes`.
  - `updateCharacter` and `updateShip` include `notes` in the `PUT` request payload.
  - Template contains the `Notes` section and `<textarea class="notes-textarea">`.

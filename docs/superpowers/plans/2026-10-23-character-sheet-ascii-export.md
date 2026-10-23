# Character Sheet ASCII Export Implementation Plan

This implementation plan delivers a plain-text ASCII character sheet download feature for players to archive and reference their characters without equipment.

---

## Proposed File Changes

| File | Subsystem | Responsibility |
| --- | --- | --- |
| `client/src/utils/characterExport.js` | Client Utility | Pure ASCII formatting function `formatCharacterAscii(char)` and browser Blob download helper `downloadCharacterAscii(char)`. |
| `client/test/characterExport.test.js` | Client Tests | Unit test suite covering formatting, stats, skills, species traits, missing fields, and strict equipment exclusion. |
| `client/src/views/CharacterSheetsView.vue` | Client View | Add `📥 Download Sheet (.txt)` button in sheet header and wire to download method. |
| `client/test/CharacterSheetsView.test.js` | Client Tests | Verify `downloadAsciiSheet` method and button integration. |

---

## Tasks

### Task 1: ASCII Formatting Utility & Unit Tests

**Files:**
- `client/src/utils/characterExport.js`
- `client/test/characterExport.test.js`

**Step 1.1: Write failing tests in `client/test/characterExport.test.js`**
- Test formatting complete character into ASCII with all sections (Identity, Ability Scores, Combat Stats, Species Abilities, Skills, Notes).
- Assert that inventory items (`char.inventory`) are **never** rendered in the ASCII output.
- Test handling characters with missing/empty fields without outputting "undefined" or "null".

**Step 1.2: Run test to confirm failure**
```bash
docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/characterExport.test.js"
```

**Step 1.3: Implement `client/src/utils/characterExport.js`**
- Implement `formatCharacterAscii(char)` using clean tabular layout with monospace ASCII dividing lines.
- Implement `downloadCharacterAscii(char)` creating a `Blob` of type `text/plain;charset=utf-8` and downloading as `[SafeName]_sheet.txt`.

**Step 1.4: Run test to confirm passing**
```bash
docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/characterExport.test.js"
```

**Step 1.5: Commit Task 1**
```bash
git add client/src/utils/characterExport.js client/test/characterExport.test.js
git commit -m "feat(characters): add character ASCII export utility and tests"
```

---

### Task 2: Character Sheet Header Integration & UI Styling

**Files:**
- `client/src/views/CharacterSheetsView.vue`
- `client/test/CharacterSheetsView.test.js`

**Step 2.1: Write test in `client/test/CharacterSheetsView.test.js`**
- Verify `downloadAsciiSheet` method calls `downloadCharacterAscii`.
- Verify the download button markup is present in `sheet-header`.

**Step 2.2: Implement button and method in `client/src/views/CharacterSheetsView.vue`**
- Import `downloadCharacterAscii` from `../utils/characterExport.js`.
- Add `<button class="btn-action-download" @click="downloadAsciiSheet" title="Download ASCII Character Record (.txt)">📥 Download Sheet (.txt)</button>` in `.header-main` / `.sheet-header`.
- Add method `downloadAsciiSheet()` in `methods`.
- Add CSS styling for `.btn-action-download`.

**Step 2.3: Run tests to confirm passing**
```bash
docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/CharacterSheetsView.test.js"
```

**Step 2.4: Commit Task 2**
```bash
git add client/src/views/CharacterSheetsView.vue client/test/CharacterSheetsView.test.js
git commit -m "feat(characters): add download button to character sheet header"
```

---

### Task 3: Full Suite Verification & Build

**Step 3.1: Run all client Vitest tests**
```bash
docker exec sf-vtt-dev sh -c "cd client && npx vitest run"
```

**Step 3.2: Run client production build**
```bash
docker exec sf-vtt-dev sh -c "cd client && npm run build"
```

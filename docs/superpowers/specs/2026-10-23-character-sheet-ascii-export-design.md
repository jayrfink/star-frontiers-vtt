# Character Sheet ASCII Export Design

## 1. Overview
This specification details the design for allowing players to export and download their Star Frontiers character sheet as a plain ASCII text file (`.txt`) for archival purposes. The export provides a complete record of the character's biological attributes, primary and derived statistics, energy pools, species traits, skills, and background notes so players can easily reconstruct or reference the character later, while strictly excluding equipment and inventory.

---

## 2. File Format & Content

### 2.1 Character Record Sections
The exported ASCII text file includes the following sections formatted with clean monospace borders:
1. **Header:** Title banner and timestamp of archival.
2. **Identity & Demographics:**
   - Name
   - Species / Race
   - Primary Skill Area (PSA): Military, Technological, or Biosocial
   - Gender, Height, Weight
3. **Primary Ability Scores & Tactical Stats:**
   - STR / STA (including current and max Stamina)
   - DEX / RS (including Initiative Modifier `+IM`)
   - INT / LOG
   - PER / LDR
   - Energy Pool (Current / Max SEU)
   - Derived Melee / Punch score and Max Carry Weight
4. **Species Abilities:**
   - Listed racial abilities (e.g., Yazirian Battle Rage, Dralasite Lie Detection, Vrusk Comprehension)
5. **Skills & Training:**
   - List of all skills and their acquired levels (e.g. `Beam Weapons (Level 2)`)
6. **Notes & Background:**
   - Freeform character background notes.
7. **Equipment Exclusion:**
   - Equipment and inventory items are **strictly omitted** per requirements.

### 2.2 Formatting Helper (`client/src/utils/characterExport.js`)
- Exposes:
  - `formatCharacterAscii(char)`: Pure function converting character object to ASCII string.
  - `downloadCharacterAscii(char)`: Generates a browser Blob (`text/plain;charset=utf-8`) and triggers direct file download named `[Name]_sheet.txt`.

---

## 3. User Interface Integration

### 3.1 Character Sheet Header (`client/src/views/CharacterSheetsView.vue`)
- Positioned in the character sheet header:
  ```html
  <button
    class="btn-action-download"
    @click="downloadAsciiSheet"
    title="Download plain-text character record (.txt)"
  >
    📥 Download Sheet (.txt)
  </button>
  ```
- Styled with the futuristic terminal sci-fi aesthetic matching existing header action buttons.

---

## 4. Verification Plan
1. **Unit Tests (`client/test/characterExport.test.js`):**
   - Correctly renders character headers, identity, stats, and notes.
   - Strictly asserts that `inventory` or equipment items do NOT appear anywhere in the output.
   - Handles missing or undefined fields gracefully without `undefined` or `null` text.
2. **Component Integration Test (`client/test/CharacterSheetsView.test.js`):**
   - Asserts the download button exists in the header.
   - Asserts `downloadAsciiSheet` method is defined.
3. **Full Suite Verification:**
   - Run Vitest for client.
   - Production Vite build (`npm run build`).

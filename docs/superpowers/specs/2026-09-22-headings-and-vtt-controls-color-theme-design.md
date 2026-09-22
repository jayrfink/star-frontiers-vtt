# Headings and VTT Controls Color Theme Design

## 1. Context & Goals
The user requested visual polish and palette alignment across the Star Frontiers VTT:
1. Anywhere the font color matches the headings "Ship Sheets" and "Hull Points (HP)" (originally `#58a6ff`), change the font color to `#3a859c`.
2. Change the highlight color of the active VTT control menu buttons to `#3a859c`, leaving unhighlighted buttons in their existing neutral dark styling.
3. Change the background color of the Map Manager buttons (`.btn-gm`) to `#3a9c83`.

---

## 2. Architecture & Design Specifications

### 2.1 CSS Variables (`client/src/main.css`)
- Update the primary accent variable:
  ```css
  --accent: #3a859c;
  ```
- This propagates the new muted sci-fi cyan hue across common UI elements, focus outlines, and quick-reference elements that derive from `var(--accent)`.

### 2.2 Sheet Headings & Explicit Color Replacements

#### `client/src/views/ShipSheetsView.vue`
Update all instances of `#58a6ff` to `#3a859c`:
- `.sidebar-header h3`: font color for "Ship Sheets".
- `.hull-header h4`: font color for "Hull Points (HP)".
- `.list-header h4`: sub-headings in lists.
- `.stats-section h4`: section headings (Defenses, Weapons, Cargo, etc.).
- `.stat-input`, `.drive-type`, `.weapon-summary`: primary data values and summary text.
- `.ship-item.active`: left accent border (`4px solid #3a859c`).

#### `client/src/views/CharacterSheetsView.vue`
Update all instances of `#58a6ff` to `#3a859c`:
- `.sidebar-header h3`: font color for "Characters".
- `.stamina-header h4`: font color for stamina/health sections.
- `.list-header h4`: inventory and skills list headers.
- `.racial-panel h4`: racial abilities and modifiers headers.
- `.modal-card h3`: modal headings.
- `.tactical-value`: tactical stats values (e.g., IM, Movement, RS).
- `.stat-input`, `.skill-level`, `.eq-name`, `.eq-tag`: data values and badge text.
- `.char-item.active`: left accent border (`4px solid #3a859c`).
- `.primary-stat`: stat accent border (`3px solid #3a859c`).

### 2.3 VTT Control Menu & Map Manager Buttons

#### `client/src/views/RpgVttView.vue` & `client/src/views/SpaceVttView.vue`
1. **Active Tool / Control Toolbar Highlight**:
   - In `.vtt-toolbar button.active`:
     ```css
     .vtt-toolbar button.active {
       background: #3a859c;
       border-color: #3a859c;
       color: #ffffff;
       font-weight: 600;
       box-shadow: 0 0 8px rgba(58, 133, 156, 0.4);
     }
     ```
   - Inactive buttons (`.vtt-toolbar button`) remain unaffected with their current neutral dark theme styling.
2. **Map Manager Buttons**:
   - In `.btn-gm`:
     ```css
     .btn-gm {
       background: #3a9c83;
       border-color: #3a9c83;
       color: #ffffff;
     }

     .btn-gm:hover {
       background: #45b497;
       border-color: #45b497;
     }
     ```

---

## 3. Verification & Testing
1. **Container Tests**:
   - Run `docker exec sf-vtt-dev bash -c "cd client && npx vitest run"` to verify existing test suites pass.
2. **Build Verification**:
   - Run `docker exec sf-vtt-dev bash -c "cd client && npm run build"` to verify Vue template and CSS compilation.
3. **Visual Inspection**:
   - Check Character Sheets and Ship Sheets views to verify all headers render in `#3a859c`.
   - Check RPG VTT and Space VTT to confirm the active toolbar tool highlights in `#3a859c` while unhighlighted buttons retain their neutral dark appearance.
   - Confirm "GM Map Manager" buttons render with `#3a9c83` background.

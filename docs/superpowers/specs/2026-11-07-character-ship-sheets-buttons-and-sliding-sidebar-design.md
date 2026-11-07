# Design Spec: Character & Ship Sheet Action Button Recoloring and Collapsible Sliding Navigation Panel

**Date:** 2026-11-07  
**Status:** Approved by user

---

## 1. Overview
This specification details two improvements to the Star Frontiers VTT Character and Ship Sheet interfaces:
1. Recoloring key action buttons (`+ Skill`, `+ Equipment`, `+ Custom Item`, `+ Add Note Panel`, `+ Defense`, and `+ Weapon`) to match the color scheme, glow, and borders of the active/selected sheet card on the navigation side panel (`.character-list li.active`).
2. Adding a collapsible sliding navigation panel to both `CharacterSheetsView.vue` and `ShipSheetsView.vue` that smoothly slides left off-screen via a floating edge chevron toggle tab, allowing maximum screen real estate for the character and spaceship sheet contents.

---

## 2. Button Styling Specifications

### 2.1 Target Buttons
- In `CharacterSheetsView.vue`:
  - `+ Skill` (`.btn-secondary` in skills card header)
  - `+ Equipment` (`.btn-secondary` in equipment catalog header)
  - `+ Custom Item` (`.btn-secondary` in inventory header)
  - `+ Add Note Panel` (`.btn-add-note-panel`)
- In `ShipSheetsView.vue`:
  - `+ Defense` (`.btn-secondary` in defenses card header)
  - `+ Weapon` (`.btn-secondary` in armament card header)
  - `+ Add Note Panel` (`.btn-add-note-panel`)

### 2.2 Color & Aesthetic Palette
The active character item style (`.character-list li.active`) uses:
- Background: `#05282e` (hover: `#083841`)
- Border: `1px solid aquamarine` (`#7fffd4`)
- Text Color: `#a8ffea`
- Text Shadow: `0 0 8px rgba(6, 182, 212, 0.4)`
- Box Shadow: `inset 0 0 10px rgba(6, 182, 212, 0.25), 0 0 8px rgba(6, 182, 212, 0.2)`
- Hover Box Shadow: `inset 0 0 12px rgba(6, 182, 212, 0.4), 0 0 12px rgba(127, 255, 212, 0.4)`
- Typography: `font-size: 0.8rem; font-weight: 700; border-radius: 4px; padding: 4px 10px;`
- Active State: `transform: translateY(1px);`

---

## 3. Collapsible Sliding Navigation Panel Specifications

### 3.1 Views Affected
- `client/src/views/CharacterSheetsView.vue`
- `client/src/views/ShipSheetsView.vue`

### 3.2 State Management
- Add reactive state `isSidebarCollapsed` (boolean, defaults to `false`).
- Optionally persist to `localStorage` key (`sf_chars_sidebar_collapsed` and `sf_ships_sidebar_collapsed`) with error handling.
- Method `toggleSidebar()` toggles `isSidebarCollapsed`.

### 3.3 DOM Structure
In `.sheets-layout`:
```html
<div class="sheets-layout" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
  <aside class="sidebar">
    <button
      type="button"
      class="sidebar-toggle-btn"
      :title="isSidebarCollapsed ? 'Show Navigation Panel' : 'Hide Navigation Panel'"
      :aria-label="isSidebarCollapsed ? 'Show Navigation Panel' : 'Hide Navigation Panel'"
      @click="toggleSidebar"
    >
      <span class="toggle-icon">{{ isSidebarCollapsed ? '▶' : '◀' }}</span>
    </button>
    <!-- existing sidebar header, list, etc. -->
  </aside>
  <!-- sheet-detail area -->
</div>
```

### 3.4 CSS & Transitions
- `.sidebar`:
  - `position: relative;`
  - `flex-shrink: 0;`
  - `width: 280px;`
  - `transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);`
- `.sheets-layout.sidebar-collapsed .sidebar`:
  - `margin-left: -280px;`
- `.sidebar-toggle-btn`:
  - `position: absolute;`
  - `top: 14px;`
  - `right: -24px;`
  - `width: 24px;`
  - `height: 38px;`
  - `background: #161b22;`
  - `border: 1px solid #30363d;`
  - `border-left: none;`
  - `border-radius: 0 6px 6px 0;`
  - `color: #00ffff;`
  - `cursor: pointer;`
  - `z-index: 20;`
  - `box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);`
  - `display: flex; align-items: center; justify-content: center;`
  - Hover: `background: #05282e; color: #a8ffea; box-shadow: 2px 0 10px rgba(6, 182, 212, 0.4);`
- When collapsed, the 280px sidebar slides off-screen, and the toggle tab (at `right: -24px`) remains cleanly docked at x = 0 at the left screen edge.

---

## 4. Verification & Testing
1. Unit tests in `client/test/CharacterSheetsView.test.js` and `client/test/ShipSheetsView.test.js`:
   - Verify presence of `.sidebar-toggle-btn`.
   - Verify clicking `.sidebar-toggle-btn` toggles `isSidebarCollapsed` and updates CSS class / icon.
   - Verify CSS rules for active-character button styling and `.sidebar-collapsed .sidebar`.
2. Full suite test run (`npx vitest run`) verifying 895+ tests passing.

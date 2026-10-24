# VTT Dark Theme & Contextual Scrollbars Design

## 1. Overview
This specification details the styling changes required to eliminate default operating system scrollbars across the Star Frontiers Virtual Tabletop application. All scrollbars are unified into a dark sci-fi aesthetic, with customized contextual accent treatments matching specific widgets (the Tactical Roll Log, GM Campaign Notes, and PDF Rulebooks / Quick Reference catalog).

---

## 2. Global Base Theme (`client/src/main.css`)

### 2.1 Standard CSS Properties
Applied globally across the application (`*`):
- `scrollbar-width: thin;`
- `scrollbar-color: rgba(0, 255, 255, 0.3) #0d1117;`

### 2.2 WebKit Scrollbar Styling (`::-webkit-scrollbar`)
Applied to all scrollable elements across WebKit/Blink browsers:
- **Dimensions:** Width `8px`, Height `8px`.
- **Track (`::-webkit-scrollbar-track`):** Deep background `#0d1117` with `border-radius: 4px`.
- **Thumb (`::-webkit-scrollbar-thumb`):**
  - Background: `rgba(0, 255, 255, 0.25)`
  - Border: `1px solid rgba(0, 255, 255, 0.35)`
  - Border-radius: `4px`
- **Thumb Hover (`::-webkit-scrollbar-thumb:hover`):**
  - Background: `rgba(0, 255, 255, 0.5)`
  - Border-color: `#00ffff`
  - Box-shadow: `0 0 6px rgba(0, 255, 255, 0.4)`
- **Corner (`::-webkit-scrollbar-corner`):** Background `#0d1117`.

---

## 3. Contextual Widget Theming

### 3.1 Tactical Roll Log (`RpgVttView.vue` & `SpaceVttView.vue`)
- **Element Selector:** `.roll-log-body`
- **Standard CSS:** `scrollbar-color: rgba(0, 255, 255, 0.45) rgba(5, 15, 20, 0.8);`
- **WebKit Overrides:**
  - Track: `background: rgba(5, 15, 20, 0.8);`
  - Thumb: `background: rgba(0, 255, 255, 0.4); border: 1px solid rgba(0, 255, 255, 0.6);`
  - Thumb Hover: `background: #00ffff; box-shadow: 0 0 8px rgba(0, 255, 255, 0.6);`

### 3.2 GM Campaign Notes (`GmNotesView.vue`)
- **Element Selectors:** `.session-list`, `.notes-workspace`, `.panel-content-textarea`
- **Standard CSS:** `scrollbar-color: #30363d #161b22;`
- **WebKit Overrides:**
  - Track: `background: #161b22;`
  - Thumb: `background: #30363d; border: 1px solid #3b434b;`
  - Thumb Hover: `background: #484f58; border-color: #586069;`

### 3.3 PDF Rulebooks & Quick Reference (`RulebooksView.vue`)
- **Element Selectors:** `.pdf-sidebar`, `.search-results-list`, `.toc-tree-list`, `.quickref-layout`
- **Standard CSS:** `scrollbar-color: rgba(58, 133, 156, 0.5) #161b22;`
- **WebKit Overrides:**
  - Track: `background: #161b22;`
  - Thumb: `background: rgba(58, 133, 156, 0.5); border: 1px solid rgba(58, 133, 156, 0.7);`
  - Thumb Hover: `background: rgba(78, 162, 187, 0.8); border-color: #4ea2bb;`

---

## 4. Verification Plan

1. **Automated Unit & Snapshot Tests:**
   - Verify presence of global scrollbar rules in `client/src/main.css`.
   - Verify widget-specific scrollbar rules in `RulebooksView.vue`, `GmNotesView.vue`, `RpgVttView.vue`, and `SpaceVttView.vue`.
2. **Client Test Suite:**
   - Run Vitest suite (`npx vitest run`).
3. **Production Build:**
   - Run `npm run build` to ensure all CSS compiles cleanly without warnings or errors.

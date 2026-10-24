# Dark Theme & Contextual Scrollbars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace default operating system scrollbars across the entire Star Frontiers VTT application with dark sci-fi themed scrollbars, including tailored contextual styling for the Roll Log, GM Campaign Notes, and PDF Rulebooks / Quick Reference catalog.

**Architecture:**
- Global base scrollbar styling in `client/src/main.css` targeting all scrollable elements (`*` and `::-webkit-scrollbar`) with an 8px dark track and cyan/teal thumb.
- Widget-specific contextual overrides in `client/src/views/RpgVttView.vue`, `client/src/views/SpaceVttView.vue`, `client/src/views/GmNotesView.vue`, and `client/src/views/RulebooksView.vue`.
- Verification with automated CSS structure tests and Vite production bundle build.

**Tech Stack:** CSS3, Vue 3, Vitest, Vite.

## Global Constraints
- Cross-browser support: Must define both standard CSS (`scrollbar-width`, `scrollbar-color`) and WebKit pseudo-elements (`::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb`).
- Track background: Deep dark `#0d1117` (or `#161b22` in contextual widgets).
- Dimensions: Width 8px and height 8px with 4px border-radius.
- Roll Log theme: Cyber cyan (`#00ffff` / `rgba(0, 255, 255, 0.45)`).
- GM Notes theme: Subtle dark slate (`#30363d` / `#161b22`).
- Rulebooks theme: Deep accent cyan/slate (`rgba(58, 133, 156, 0.5)`).

---

### Task 1: Global Base Scrollbar Theme in `main.css`

**Files:**
- Modify: `client/src/main.css`
- Test: `client/test/scrollbars.test.js`

**Interfaces:**
- Produces: Global CSS rules applied to `*` and `::-webkit-scrollbar*`.

- [ ] **Step 1.1: Write failing test in `client/test/scrollbars.test.js`**
  - Read `client/src/main.css` and assert standard `scrollbar-width` and `scrollbar-color` exist on `*`.
  - Assert `::-webkit-scrollbar` width/height is defined.
  - Assert `::-webkit-scrollbar-track` and `::-webkit-scrollbar-thumb` are styled.

- [ ] **Step 1.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/scrollbars.test.js"
  ```

- [ ] **Step 1.3: Add global scrollbar rules to `client/src/main.css`**
  - Add standard `scrollbar-width: thin;` and `scrollbar-color: rgba(0, 255, 255, 0.3) #0d1117;` to `*`.
  - Add WebKit rules with 8px width, `#0d1117` track, `rgba(0, 255, 255, 0.25)` thumb, and hover effects.

- [ ] **Step 1.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/scrollbars.test.js"
  ```

- [ ] **Step 1.5: Commit Task 1**
  ```bash
  git add client/src/main.css client/test/scrollbars.test.js
  git commit -m "feat(styles): add global dark sci-fi scrollbar theme"
  ```

---

### Task 2: Contextual Widget Scrollbars (Roll Log, GM Notes, Rulebooks)

**Files:**
- Modify: `client/src/views/RpgVttView.vue`
- Modify: `client/src/views/SpaceVttView.vue`
- Modify: `client/src/views/GmNotesView.vue`
- Modify: `client/src/views/RulebooksView.vue`
- Test: `client/test/scrollbars.test.js`

**Interfaces:**
- Produces: Component-scoped or class-specific scrollbar rules for `.roll-log-body`, `.session-list`, `.notes-workspace`, `.panel-content-textarea`, `.pdf-sidebar`, `.search-results-list`, `.toc-tree-list`, and `.quickref-layout`.

- [ ] **Step 2.1: Add failing tests to `client/test/scrollbars.test.js`**
  - Verify `.roll-log-body` has tactical cyan scrollbar rules in both `RpgVttView.vue` and `SpaceVttView.vue`.
  - Verify `.session-list`, `.notes-workspace`, and `.panel-content-textarea` have slate scrollbar rules in `GmNotesView.vue`.
  - Verify `.pdf-sidebar`, `.search-results-list`, `.toc-tree-list`, and `.quickref-layout` have catalog scrollbar rules in `RulebooksView.vue`.

- [ ] **Step 2.2: Run test to confirm failure**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/scrollbars.test.js"
  ```

- [ ] **Step 2.3: Implement contextual scrollbar CSS in views**
  - Add `.roll-log-body` scrollbar rules in `client/src/views/RpgVttView.vue` and `client/src/views/SpaceVttView.vue`.
  - Add GM Notes scrollbar rules in `client/src/views/GmNotesView.vue`.
  - Add Rulebooks / Quickref scrollbar rules in `client/src/views/RulebooksView.vue`.

- [ ] **Step 2.4: Run test to confirm passing**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run test/scrollbars.test.js"
  ```

- [ ] **Step 2.5: Commit Task 2**
  ```bash
  git add client/src/views/RpgVttView.vue client/src/views/SpaceVttView.vue client/src/views/GmNotesView.vue client/src/views/RulebooksView.vue client/test/scrollbars.test.js
  git commit -m "feat(styles): add contextual scrollbar styling for Roll Log, GM Notes, and Rulebooks"
  ```

---

### Task 3: Full Suite Verification & Build

- [ ] **Step 3.1: Run all client Vitest tests**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npx vitest run"
  ```

- [ ] **Step 3.2: Run client production build**
  ```bash
  docker exec sf-vtt-dev sh -c "cd client && npm run build"
  ```

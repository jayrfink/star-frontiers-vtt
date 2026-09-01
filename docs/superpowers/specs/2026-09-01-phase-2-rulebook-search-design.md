# Star Frontiers VTT — Phase 2 Design Spec: Data Extraction & Rulebook WebUI

## Goal
Extract text content from Star Frontiers Alpha Dawn and Knight Hawks PDF rulebooks into structured JSON data, and build a client-side searchable Rulebooks WebUI in the Vue 3 application using Lunr.js.

## Scope & Components

### 1. Data Extraction Pipeline
- **Script**: `server/scripts/extract-rulebooks.js`
- **Dependency**: `pdf-parse`
- **Source PDFs**:
  - `SF7007-AlphaDawn-Basic_Game_Rules.pdf`
  - `SF7007-AlphaDawn-Crash_on_Volturnus.pdf`
  - `SF7007-AlphaDawn-Expanded_Game_Rules.pdf`
  - `Star_Frontiers-7011-Knight_Hawks-Basic_Rules.pdf`
  - `Star_Frontiers-7011-Knight_Hawks-Expansion_Rules.pdf`
  - `Star_Frontiers-7011-Knight_Hawks-Mission_Brief.pdf`
- **Output Artifact**: `data/rulebooks.json`
- **Data Structure**:
  ```json
  [
    {
      "id": "alpha-dawn-basic-p12",
      "bookId": "alpha-dawn-basic",
      "bookTitle": "Alpha Dawn Basic Game Rules",
      "system": "Alpha Dawn",
      "page": 12,
      "section": "Page 12",
      "content": "Full extracted text..."
    }
  ]
  ```

### 2. Backend Server API
- **Endpoint**: `GET /api/rulebooks`
- **Access**: Protected by `requireAuth` middleware.
- **Behavior**: Returns parsed `rulebooks.json`. Automatically triggers initial extraction if `data/rulebooks.json` is missing.

### 3. Frontend WebUI (`RulebooksView.vue`)
- **Dependencies**: `lunr`
- **Layout**:
  - **Filter Bar**: Select by System (`All`, `Alpha Dawn`, `Knight Hawks`) or specific Book.
  - **Left Pane (Search & Results)**:
    - Debounced search input.
    - Result list with title, page number, section, and snippet preview.
    - Default browsing tree when search query is empty.
  - **Right Pane (Document Reader)**:
    - Displays full content of selected section/page.
    - Search terms highlighted in yellow.
    - Next / Previous page navigation buttons.

## Verification & Testing
1. Execute `extract-rulebooks.js` and verify `data/rulebooks.json` is generated with valid entries for all 6 PDFs.
2. Server API unit tests checking `GET /api/rulebooks`.
3. Frontend manual verification in browser testing queries (e.g., "vrusk", "gyrojet", "adf", "stamina").

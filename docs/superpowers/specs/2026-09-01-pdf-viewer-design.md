# Star Frontiers VTT — PDF Rulebook Viewer Design Spec

## Goal
Allow users to view original PDF rulebooks directly inside the browser using an embedded PDF viewer and served PDF endpoint.

## Architecture & Data Flow

### 1. Server API
- **Endpoint**: `GET /api/rulebooks/pdf/:bookId`
- **Auth**: Protected by `requireAuth`.
- **Mapping**:
  - `ad-basic` → `SF7007-AlphaDawn-Basic_Game_Rules.pdf`
  - `ad-expanded` → `SF7007-AlphaDawn-Expanded_Game_Rules.pdf`
  - `ad-volturnus` → `SF7007-AlphaDawn-Crash_on_Volturnus.pdf`
  - `kh-basic` → `Star_Frontiers-7011-Knight_Hawks-Basic_Rules.pdf`
  - `kh-expansion` → `Star_Frontiers-7011-Knight_Hawks-Expansion_Rules.pdf`
  - `kh-mission` → `Star_Frontiers-7011-Knight_Hawks-Mission_Brief.pdf`
- **Response**: Streams PDF file with `Content-Type: application/pdf` and `Content-Disposition: inline`.

### 2. Frontend UI (`RulebooksView.vue`)
- **View Mode Toggle**: **Text Reader** vs **PDF Viewer**.
- **PDF Viewer View**:
  - Embedded `<iframe>` pointing to `/api/rulebooks/pdf/:bookId#page=:page`.
  - Dropdown selector to pick rulebook.
  - "Open in New Tab" link (`window.open`).
- **Text Reader Integration**:
  - Button "View PDF at Page X" on the text reader pane that switches mode to PDF Viewer at that exact page.

## Verification
- Unit test for `GET /api/rulebooks/pdf/:bookId` returning `application/pdf`.
- Manual verification opening PDFs inside browser iframe and external tab.

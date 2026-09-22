# Design Specification: Compact Unified Navigation Bar

**Date:** 2026-09-22  
**Status:** Approved  

---

## 1. Overview & Purpose
Currently, the top of the VTT features two separate stacked rows:
1. `NavBar.vue` showing `⭐ Star Frontiers VTT` on the left, and the role badge, username, and logout button on the right.
2. `tab-bar` in `DashboardView.vue` showing navigation links (`RPG VTT`, `Space VTT`, `Character Sheets`, `Ship Sheets`, `Rulebooks`, `Admin`).

This design unifies both into a single row to maximize vertical workspace and reclaim screen real estate for maps, character sheets, and tactical canvases.

---

## 2. Layout & Styling Architecture
- **Single Consolidated Header**:
  - **Left**: `SFVTT` (bold, sci-fi cyan/white typography, no star icon).
  - **Middle**: Navigation tabs (`RPG VTT`, `Space VTT`, `Character Sheets`, `Ship Sheets`, `Rulebooks`, and GM-only `Admin`).
  - **Right**: User section (Role badge `[GM] / [Player]`, Username, and `[Logout]` button).
- **Component Architecture**:
  - Consolidate navigation tabs and user controls inside `NavBar.vue`.
  - `DashboardView.vue` renders `<NavBar />` and the `<router-view />` filling the remainder of the viewport.
  - Overall header height: ~48px (saving ~50px of vertical space).
  - Maintains responsive flex layout: branding and user profile stay anchored on outer edges while tabs remain centered/flexible.

---

## 3. Verification & Testing
- Component testing & build verification via Vite (`npm run build`).
- Vitest suite pass.
- Visual inspection to verify spacing, alignment, and responsive overflow behavior.

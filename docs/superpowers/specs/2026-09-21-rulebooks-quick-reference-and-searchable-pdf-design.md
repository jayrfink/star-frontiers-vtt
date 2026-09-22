# Design Specification: Rulebooks Quick Reference Tables & Searchable PDF Viewer

**Date:** 2026-09-21  
**Status:** Approved  

---

## 1. Overview & Purpose
The previous Rulebooks Text Reader rendered continuous extracted OCR strings without proper formatting, making it hard to read and use during gameplay. This feature:
1. Replaces the raw text reader with clean, comprehensive **Quick Reference Tables** for:
   - **Ship-to-Ship Combat** (Knight Hawks)
   - **Ranged Weapon Combat** (Alpha Dawn)
   - **Melee Combat** (Alpha Dawn)
2. Retains the **PDF Viewer**, enhancing it with an **integrated search panel** using the existing indexed page database (`lunr.js` + `/api/rulebooks`), allowing players and GMs to search across all 6 core Star Frontiers books and jump straight to that page in the PDF.

---

## 2. Architecture & Component Layout

### Navigation
The top filter bar replaces the mode toggle with two primary views:
- `[Quick Reference Tables]` (Default)
- `[PDF Rulebooks]`

### Quick Reference Layout
A secondary sub-navigation allows switching between combat domains:
1. **Ship-to-Ship Combat**:
   - Sequence of Play summary (Initiative, Movement, Defensive Fire, Offensive Fire, Damage).
   - Space Weapons table (Laser Cannon, Laser Battery, Disruptor Cannon, Torpedoes, Assault Rockets, Rocket Battery) with range in hexes, damage, ammo/SEU.
   - Defenses & Countermeasures (Reflective Hull, Masking Screen, Inertia Screen, ICMs).
   - Critical Hit & Damage Resolution tables.
2. **Ranged Weapon Combat**:
   - Turn sequence & Rate of Fire rules.
   - Small arms & Heavy weapons table (Beam, Projectile, Gyrojet, Needler, Grenades) with short/medium/long ranges, damage, and ammo.
   - To-Hit Modifiers table (Range, Cover, Darkness, Movement, Aiming, Prone).
   - Armor & Defense screens table (Skeinsuit, Albedo Suit, Albedo Screen, Inertia Screen).
3. **Melee Combat**:
   - Melee hit calculation ($\max(\lceil\text{STR}/2\rceil, \lceil\text{DEX}/2\rceil)$ + Melee Weapons level).
   - Unarmed combat table (Punching damage by STR bracket, Kicking).
   - Melee weapons table (Knife, Vibroknife, Stun Baton, Club, Sword).
   - Modifiers & Maneuvers (Grappling, Charging, Yazirian Battle Rage, Prone target).

### Searchable PDF Layout
- **Left Sidebar**:
  - Global search bar with live Lunr-powered search across all indexed books.
  - Search results display: Book Title tag, Page number, and snippet with highlighted search terms.
  - Clicking any result updates `pdfBookId` and `pdfPage` to jump the PDF iframe to that page.
  - Filter dropdowns by System (All, Alpha Dawn, Knight Hawks) and Rulebook.
- **Right Main Panel**:
  - Embedded PDF iframe pointing to `/api/rulebooks/pdf/:bookId#page=:page`.
  - Header toolbar with Book selector, Page step buttons (`Prev`, `Next`, direct number input), and "Open in New Tab" link.

---

## 3. Data Flow & Sources
- **Quick Reference Data**: Stored in a modular client constants file `client/src/constants/combatReference.js` containing structured arrays/objects for easy maintenance and rendering.
- **Search Index**: Uses the existing `/api/rulebooks` endpoint returning the 237 indexed pages and searches client-side using `lunr.js`.
- **PDF Serving**: Served directly by the backend endpoint `/api/rulebooks/pdf/:bookId`.

---

## 4. Error Handling & Verification
- When no search query is active in the PDF mode, the sidebar displays an organized table of contents / page index by book.
- Empty search results display a clean "No matching rulebook sections found" state.
- Invalid page numbers in the PDF page input are bounded between 1 and the book's total pages.
- Client tests and build verification to ensure clean ESM compilation.

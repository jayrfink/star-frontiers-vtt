# Phase 5: Space VTT Design Spec

## Overview
A dedicated Space Virtual Tabletop (VTT) designed specifically for Knight Hawks tactical space combat. It utilizes a pointy-top hex grid over a procedural starfield. All entities (ships, stations, planets, asteroids) are represented as tokens that snap to hex centers.

## 1. Asset Slicer Script
- **Purpose**: Automate extraction of individual ship/planet/asteroid tokens from the original full-page TSR counter scans.
- **Implementation**: A Node.js utility (`scripts/slice-knight-hawks-counters.js`) using the `sharp` image processing library.
- **Input**: `/Users/jrf/star-frontiers-vtt/assets/space/Knight Hawks printables/Star Frontiers-7011-Knight Hawks-counters.jpg`
- **Output**: Transparent PNGs (e.g., `upf_assault_scout.png`, `sathar_destroyer.png`, `planet_volturnus.png`) saved to `client/public/tokens/space/` so they can be served as static assets by Vite.

## 2. Hex Grid Canvas Engine
- **Component**: `client/src/components/SpaceVttCanvas.vue`
- **Coordinate System**: Pointy-top hex math (Axial/Cube or Offset coordinates).
- **Background**: Procedural starfield (no custom background images, as maps are purely deep space and celestial bodies are tokens).
- **Interactions**: Middle-click/Spacebar pan, scroll wheel zoom (mirroring the RPG VTT engine).
- **Measurement**: Hex-based distance measurement (1 hex = 10,000 km) using hex grid distance algorithms instead of Euclidean distance.

## 3. Space Tokens
- **Placement**: Snap strictly to hex centers. Max token size respects the hex boundaries. Large planets/stations can span multiple hexes (size > 1).
- **Rotation**: Locked to 60-degree increments corresponding to the 6 hex faces (0, 60, 120, 180, 240, 300).
- **Controls**: Rotation handle on the selected token, Q/E keyboard shortcuts, and toolbar buttons.
- **Visuals**:
  - Hull Points (HP) bar rendered beneath the token.
  - Current Speed badge rendered as a numeric overlay.
- **Linking**: Tokens link to Ship Sheets (from Phase 3) for stats integration.

## 4. Database & Socket Data Model
- Add new columns to `tokens` table in SQLite:
  - `rotation` (INTEGER DEFAULT 0)
  - `current_speed` (INTEGER DEFAULT 0)
- Emit existing Socket.io events (`token:moved`, `token:updated`) including the new properties to sync state in real-time.

## 5. UI Integration
- **View**: `client/src/views/SpaceVttView.vue`
- Reuse GM Map Manager (to create blank hex maps with specific dimensions) and Token Inspector (modified to link Ship Sheets and adjust current speed).

# Star Frontiers VTT - Release v0.12.3 Summary

**Release Tag:** `v0.12.3`  
**Date:** October 29, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.12.3` introduces GameMaster-exclusive access to combat initiative rolling across both the RPG and Space VTTs, while maintaining full multiplayer visibility of initiative outcomes for players. Players retain full autonomy to roll their own percentile (d%) and damage dice.

All automated test suites (700 client tests across 52 files, and 256 server tests across 19 suites) pass with 100% compliance, and the client production build compiles cleanly.

---

## 2. Key Enhancements in v0.12.3

### GM-Only Combat Initiative Roller
- **Toolbar Scoping (RPG & Space VTTs):**
  - Added `v-if="isGm"` guards to the `⚡ Initiative` toolbar button in both `RpgVttView.vue` and `SpaceVttView.vue`.
  - Non-GM players no longer see the Initiative button, preventing accidental or conflicting initiative rolls during combat turns.
  - Added execution-level guards in `rollInitiative()` methods to ensure client-side safety.

### Backend Initiative Access Control
- **Server Role Verification:**
  - Added role check in `server/src/rolls.js` on `POST /api/rolls`: when `type === 'initiative'`, the server verifies `isGameMaster(db, req.session?.userId)`.
  - Attempts by non-GM players to post initiative rolls are rejected with `403 Forbidden` (`"Only GameMasters can roll initiative"`).

### Real-Time Initiative Results Broadcast
- **Multicast Outcome Visibility:**
  - When the GM triggers initiative, the WebSocket `roll:created` event broadcasts the results (`Players` roll vs `Opposition` roll) to all connected clients in the active VTT mode.
  - The floating dual-die Initiative HUD banner (`initiative-hud-banner`) and shared Roll Log continue to render for all players, providing instant shared situational awareness.
- **Player Dice Autonomy:**
  - Players continue to have full access to personal dice rolling tools: `Roll d%` (percentile skill checks) and `DMG Die` (weapon damage configuration and rolls).

---

## 3. Verification & Test Metrics

- **Client Test Suite**: 52 test files passed, 700 total tests passed (100% passing).
- **Server Test Suite**: 19 test files passed, 256 total tests passed (100% passing), including security/authorization verification for initiative creation.
- **Client Build**: Clean Vite production bundle compilation (`sf-vtt-client@0.12.3`).
- **Services**: Dev server container `sf-vtt-dev` verified running with backend (port 3000) and frontend (port 3001) operational.

---

## 4. Git Artifacts & History

- Tag: `v0.12.3`
- Previous Tag: `v0.12.2`

# Star Frontiers VTT - Release v0.12.1 Summary

**Release Tag:** `v0.12.1`  
**Date:** October 29, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.12.1` is a patch release addressing real-time multiplayer synchronization and connectivity across the internet, enabling open token movement permissions for players, rendering visual condition markers on tokens, and integrating the OpenSpec specification framework into the repository.

All automated test suites (256 server tests across 19 suites) pass with 100% compliance, and client production build compiles cleanly.

---

## 2. Key Fixes & Enhancements in v0.12.1

### Remote Internet Connectivity & WebSocket CORS Fixes
- **Direct IP Address Origin Acceptance:**
  - Expanded `isOriginAllowed` in `server/src/index.js` to allow WebSocket and HTTP CORS connections from any valid IPv4 or IPv6 address (including public server IP addresses).
  - Eliminates `400 Bad Request (Origin not allowed by CORS)` errors that previously severed real-time WebSocket connections for players connecting over the public internet.

### Token Movement & Player Authorization
- **Universal Movement of Visible Tokens:**
  - Modified `canManageToken` in `server/src/maps.js` to allow any logged-in player to move and update tokens on visible layers (`character`, `object`, `background`).
  - Non-GM players can freely move NPCs, adversary tokens, vehicles, or characters during tactical combat.
  - Deletion of other players' tokens or GM tokens remains restricted to GameMasters and token owners (`canDeleteToken`).
  - Full GM layer isolation remains enforced: tokens on `layer === 'gm'` remain completely invisible and immutable to non-GMs.

### Real-Time Canvas Redraw & State Reactivity
- **Instant Canvas Rendering:**
  - Updated `token:moved`, `token:updated`, and `token:created` socket listeners in both `RpgVttView.vue` and `SpaceVttView.vue` to ensure shallow-clone reactivity (`tokens.value = [...tokens.value]`).
  - Added string/numeric map ID normalization across token and ping socket events.
  - Remote moves and tactical pings immediately update without requiring manual browser refreshes.

### Token Condition Markers & Tactical Badges
- **Visual Status Badges on Canvas:**
  - Updated canvas render loops in `VttCanvas.vue` and `SpaceVttCanvas.vue` to parse both `token.status_effects` and `token.conditions`.
  - Condition markers (⚡ Stunned, 💀 Unconscious, 🩸 Wounded, 🎯 Pinned, 🛡️ In Cover, 👣 Prone, 🧪 Poisoned, 🔥 Burning, 💥 Damaged, 🛰️ Adrift) now render directly as badges on token art.

### OpenSpec Framework Integration
- **Spec-Driven Development Tools:**
  - Initialized OpenSpec in the workspace with `.agents/`, `.gemini/`, and `openspec/` configurations.
  - Added automatic CLI installation checks to `startup.sh` and `Dockerfile`.

---

## 3. Verification & Test Metrics

- **Server Test Suite**: 19 test files passed, 256 total tests passed (100% passing).
- **Client Build**: Clean Vite production build with zero errors.
- **Socket Handshake Verification**: Verified HTTP and WebSocket handshake acceptance across public IP, private LAN, and loopback origins.

---

## 4. Git Artifacts & History

- Tag: `v0.12.1`
- Previous Tag: `v0.12.0`

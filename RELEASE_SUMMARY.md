# Star Frontiers VTT - Release v0.9.0 Summary

**Release Tag:** `v0.9.0`  
**Date:** October 23, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.9.0` is a major stability, security hardening, performance, and bugfix release. It delivers full resolution of the **38-item comprehensive codebase audit**, restored high-contrast **3D Percentile Dice Textures**, **LAN Network & WebSocket Optimization** (private IP subnet CORS allowlist, direct WebSocket transport priority, Express gzip compression, 1-day static asset caching, code-split 3D engine), and **Direct Production Static SPA Serving** on port 3000.

---

## 2. Included Features & Capabilities in v0.9.0

### LAN Performance & Network Infrastructure
- **Private Subnet CORS & Socket.io Handshake (`server/src/index.js`):**
  - Implemented `isPrivateNetworkOrigin` allowing all RFC 1918 private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`), IPv6 loopback (`[::1]`), and `.local` mDNS hostnames across any port.
  - Resolves CORS rejection and socket disconnection loops when accessing the VTT from local network IPs (e.g., `http://192.168.1.x:3001` or `http://10.0.0.x:3001`).
- **Direct WebSocket Transport Priority (`client/src/services/socket.js`):**
  - Configured `transports: ['websocket', 'polling']` to connect directly over WebSockets, eliminating multi-round-trip HTTP long-polling handshake overhead.
- **Express HTTP Response Compression (`compression`):**
  - Installed and enabled Gzip/Brotli compression middleware on Express. Payloads such as `rulebooks.json` (1.1 MB down to ~370 KB) and `inventory_items.json` are compressed on the fly (~70–85% bandwidth reduction).
- **Static Asset Caching:**
  - Added `Cache-Control: public, max-age=86400` (1 day), `ETag`, and `Last-Modified` headers to all `/uploads` files (maps, token art, vehicle images).
- **Code-Split 3D Dice Engine:**
  - Switched `@3d-dice/dice-box` to dynamic asynchronous import in both `RpgVttView.vue` and `SpaceVttView.vue`.
  - Decreased the critical initial bundle size by ~200 KB (from 731 KB down to 533 KB / 158 KB gzipped) for faster initial view mounting.
- **Direct Production SPA Serving:**
  - `server/src/index.js` serves pre-built `client/dist` production assets directly with client-side SPA routing fallback on port 3000, allowing players to connect directly without Vite dev server waterfall overhead.

### 3D Percentile Dice Visual Polish
- **Number Contrast Restoration:**
  - Fixed low-contrast number rendering on custom percentile dice (`custom-ones` and `custom-tens`).
  - Restored clear, crisp numeric coloring and contrast across dark and light dice themes.

### Comprehensive 38-Bug Fixes & Security Hardening
- **Backend & Authorization:**
  - Enforced strict GameMaster authorization across adversary mutations, vehicle deployment/deletions, file uploads, and map management.
  - Replaced unparameterized database queries with bound SQLite statements.
  - Purged active sessions from `sessions.db` on user deletion to prevent orphaned session reuse.
  - Decoupled token foreign key references on template and sheet deletions to avoid SQLite constraint errors.
- **Canvas Rendering & Token Interaction:**
  - Fixed HiDPI canvas rendering resolution blur on retina displays.
  - Constrained token dragging and rotation within map boundaries.
  - Prevented token collision stacking during center placement of combatants and celestial objects.
  - Refined bottom-up damage and wounded visual overlays on RPG tokens.
- **Tactical HUDs & Game Rules:**
  - Vehicle and adversary tactical HUD action bar synchronization.
  - Hardened Star Frontiers Alpha Dawn rules calculations and Knight Hawks weapon firing limitations (`FF`, `T`, `MPO`, `RD`, `LTD`).
  - Clamped negative values on ship defense and ammo counters.

---

## 3. Verification & Test Evidence

All tests and production builds were verified inside the `sf-vtt-dev` development container:

- **Server test suite:** 225 / 225 tests across 17 test files passed.
- **Client test suite:** 437 / 437 tests across 41 test files passed.
- **Combined total:** 662 / 662 automated tests passing cleanly (100% pass rate).
- **Client production build:** Succeeded cleanly with Vite (`npm run build`).

---

## 4. Release History

- **v0.9.0 (October 23, 2026):** Major stability, security hardening, performance, and bugfix release: 38 codebase audit bug fixes, restored 3D percentile dice contrast, LAN private network CORS autodiscovery, direct WebSocket transport, Express HTTP gzip compression, 1-day asset caching, code-split 3D dice engine, and direct production static serving on port 3000.
- **v0.8.0 (October 22, 2026):** Minor feature release: GameMaster-only GM Notes tab (`/dashboard/gm-notes`) with session groups and editable note panels, Space Combat Flip & Burn maneuver (`MR >= 3`) with STA check & blackout rollers, and Star Frontiers Knight Hawks space weapon firing limitations/arcs (`FF`, `T`, `MPO`, `RD`, `LTD`) across rulebooks, custom weapon designer, ship sheets, and Space VTT.
- **v0.7.0 (October 22, 2026):** Minor feature and bugfix release: Adversary template deletion and live token artwork replacement (`PATCH /api/adversaries/:id/token`), missing/moved token image fallback resilience, RPG VTT bottom-up red damage and wounded token overlays, and project `README.md` screenshot gallery.
- **v0.6.0 (October 18, 2026):** Minor feature and polish release: Knight Hawks Ship Weapons Selection Modal & canonical 10-weapon catalog, prominent weapon titles with category limitation badges and inline renaming, ship sheet typography/layout refinements, and synchronized VTT dice & roll banner clearing.
- **v0.5.0 (October 17, 2026):** Major minor-feature release: RPG VTT Alpha Dawn vehicle support & tactical Vehicle HUD, Space VTT celestial tokens (asteroids, moons, planets), canonical Alpha Dawn equipment catalog expansion (117 items) with category filter tabs, player self-service password changes, and tabletop dice rolling sound effects.
- **v0.4.0 (October 16, 2026):** Minor feature release: Dynamic Adversary Stocking engine, Adversary Token HUD, AI token art generator & circular ring masking pipeline, and Admin Uploads & Assets File Manager with directory CRUD, file move, atomic database cascades, and real-time canvas asset sync.
- **v0.3.0 (October 16, 2026):** Minor feature release: shared dice rolls & roll log, per-user tab/view state persistence, Knight Hawks spaceship skills, sheet Notes, "Species" terminology, and Map Manager grid controls (dimensions, line thickness, visibility).
- **v0.2.0 (October 4, 2026):** Major feature release: Image Browser & Uploads Explorer, Decoupled Die Roll Log HUDs, Center Token Placement with Collision Avoidance, Map Background Browsing, Dynamic Tab Titles, and Modal Form Simplification.
- **v0.1.1 (September 27, 2026):** Sub-release snapshot: Damage dice totals HUD, single source of truth HP refactor, fog removal, token ring color persistence, character portrait layout, ship token linking, and UI theme alignment.
- **v0.1.0 (September 22, 2026):** Initial stable release: RPG and Space VTTs, 3D physics dice box, character and starship sheets, searchable rulebooks, role-based user management, and sci-fi terminal design.

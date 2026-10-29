# Star Frontiers VTT - Release v0.12.0 Summary

**Release Tag:** `v0.12.0`  
**Date:** October 29, 2026  
**Status:** Stable / Production Ready

---

## 1. Overview

Release `v0.12.0` introduces the **`sf-vtt-ctl.sh` Service Control & Diagnostic CLI Tool**, fixes 3D dice physics settling timing to eliminate roll mismatch bugs, and incorporates two exhaustive security hardening sweeps resolving all critical and high severity vulnerabilities across WebSocket communication, GM secret layer isolation, SVG sandboxing, session lifecycle management, token stat bounds enforcement, and memory caps.

All automated test suites (700 client tests, 255 server tests) pass with 100% compliance, and performance load testing demonstrates sustained high throughput (1,779 req/sec) with no regression.

---

## 2. Key Features & Enhancements in v0.12.0

### Service Management & Diagnostic CLI (`sf-vtt-ctl.sh`)
- **Full Container Lifecycle Management:**
  - `start`, `stop`, `restart` commands with granular service-specific controls (`sf-vtt-ctl.sh start server`, `sf-vtt-ctl.sh restart client`).
  - Automated environment checks ensuring Docker daemon readiness and container health.
- **Rich Status & Real-time Diagnostics:**
  - Reports container runtime status, healthcheck metrics, CPU and memory utilization.
  - Inspects active TCP client connections on both Client (3000) and Server (3001) ports.
  - Queries active SQLite sessions and outputs currently authenticated users and roles (`GameMaster` / `Player`).
  - Reports active battle map instances loaded into server memory.
- **Log Streaming & Inspection:**
  - Integrated `logs` command (`all`, `server`, `client`) with tailing options.

### 3D Physical Dice Synchronization Fix
- **Safe Settling Timeout Extension:**
  - Extended 3D dice settle timeout from 4s to 10s in `safeDiceRoller.js`.
  - Prevents premature roll resolution timeouts from generating synthetic rolls that overwrite in-flight physical 3D dice rolls before they settle on the virtual tabletop.

### Comprehensive Security Hardening & Audit Fixes

#### GM-Layer Secrecy & Information Disclosure Prevention
- **WebSocket GM Layer Token Isolation (`SEC-AUDIT-01`):**
  - Hardened `map:activated` WebSocket event to emit distinct payloads: players receive maps with GM-layer tokens stripped, while Game Masters receive full state via `io.to('role:GameMaster')`.
- **GM Token Mutation Protection (`SEC-AUDIT-02`):**
  - Enforced strict authorization preventing non-GM players from moving, updating, or deleting tokens on the GM layer, even if the token is linked to a sheet they own.

#### File Upload & Stored XSS Hardening
- **SVG Sanitization Hardening (`SEC-01`):**
  - Expanded regex and DOM parsing sanitization to detect and block namespaced scripting tags (`<svg:script>`, `<foreignObject>`, inline event handlers).
- **Upload Endpoint Sandboxing:**
  - Configured strict `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox` and `X-Content-Type-Options: nosniff` headers on all served `/uploads` static assets.

#### Session & Authentication Lifecycle
- **Session Fixation Mitigation (`SEC-02`):**
  - Added mandatory `req.session.regenerate()` upon successful authentication to issue new session IDs and mitigate fixation attacks.
- **Cookie Security Enforcement (`SEC-03`):**
  - Dynamically configured `secure` cookie flag based on connection context (`process.env.NODE_ENV === 'production'` or `req.secure`).
  - Validates session secrets in production environments to reject default fallbacks.
- **Session Invalidation on Password Update (`SEC-04`):**
  - Invalidates all existing concurrent sessions across all devices when a user's password is changed or reset.

#### Token Validation & Stat Manipulation Prevention
- **Stat Clamping Against Sheet Maxima (`SEC-05`):**
  - Enforces server-side validation ensuring token current/max stamina, HP, and SEU cannot be manipulated beyond their sheet maximums.
- **Dead Token Action Prevention (`SEC-06`):**
  - Disallows combat actions, movement, or state adjustments from destroyed or deceased tokens unless revived by a Game Master.

#### DoS & Memory Protection
- **VTT Ping Map Validation (`SEC-AUDIT-05`):**
  - Validates ping coordinates and target map IDs against active server maps.
- **Map Instance Memory Caps (`SEC-AUDIT-03`):**
  - Imposed a strict cap (50 maps maximum) on active in-memory battle map states with LRU eviction to prevent heap exhaustion.
- **Roll Payload Sanitization (`SEC-AUDIT-06`):**
  - Strict array and boundary validation on `rollSummary.dice` and string length limits on labels/breakdowns preventing client Vue render crashes.

#### Sidebar Sheet Reordering Hardening
- **GM Permission Enforcement on Reorder (`SEC-AUDIT-04`):**
  - Restricted global sheet reorder endpoints (`/reorder`) to GameMaster only, preventing unauthorized client reordering and sorting collisions.

---

## 3. Verification & Test Metrics

- **Client Test Suite**: 52 test files passed, 700 total tests passed (100% passing).
- **Server Test Suite**: 18 test files passed, 255 total tests passed (100% passing).
- **Total Test Suite**: 955 automated tests passing cleanly across client and server.
- **Performance Benchmark**: Autocannon benchmark sustained **1,779 req/sec** at sub-6ms median latency with zero dropped connections or HTTP errors.

---

## 4. Git Artifacts & History

- Tag: `v0.12.0`
- Previous Tag: `v0.11.0`

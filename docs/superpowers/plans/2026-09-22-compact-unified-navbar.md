# Compact Unified Navigation Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the two stacked top header bars into a single unified 48px navigation bar with "SFVTT" branding, tab links, and user controls.

**Architecture:**
1. Update `client/src/components/NavBar.vue` to contain:
   - Brand: "SFVTT" on the left without the star icon.
   - Tabs: Router links for RPG VTT, Space VTT, Character Sheets, Ship Sheets, Rulebooks, and Admin (if GM).
   - User profile & Logout on the far right.
2. Update `client/src/views/DashboardView.vue` to remove the redundant `.tab-bar` markup and styles.
3. Test and verify build.

**Tech Stack:** Vue 3 (Composition API), Vue Router, CSS flexbox.

## Global Constraints
- Run all test and build commands in container: `docker exec sf-vtt-dev bash -c "<command>"`
- Match existing sci-fi theme (`--bg-secondary`, `--border`, `--accent`, `--sci-glow-cyan`).

---

### Task 1: Unify Header Navigation in NavBar.vue and DashboardView.vue

**Files:**
- Modify: `client/src/components/NavBar.vue`
- Modify: `client/src/views/DashboardView.vue`

- [ ] **Step 1: Update NavBar.vue**
  - Add router links and tab list computed property into `NavBar.vue`.
  - Brand set to `SFVTT` (remove star).
  - Use flexbox layout: `.navbar-brand`, `.navbar-tabs` (with `flex: 1`), `.navbar-user`.
  - Apply active tab styling with bottom border or glowing pill.

- [ ] **Step 2: Update DashboardView.vue**
  - Remove duplicate `tab-bar` template and styles.
  - Retain `<NavBar />` and `<router-view />`.

- [ ] **Step 3: Verify build and tests**
  - Run `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
  - Verify 0 errors.

- [ ] **Step 4: Commit**
  - Commit message: `feat: consolidate top header and navigation tabs into compact unified bar`

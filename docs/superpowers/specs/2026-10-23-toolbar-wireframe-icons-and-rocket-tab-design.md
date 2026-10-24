# VTT Toolbar Wireframe Icons & Dark Blue Rocket Tab Design

## 1. Overview
This specification details the visual redesign of the VTT floating toolbars and the Space VTT navigation tab:
1. Replace all emojis on the top-left floating toolbars (`RpgVttView.vue` and `SpaceVttView.vue`) with textual lined wireframe icons whose line color and glow dynamically match the box state of their parent buttons (inactive vs. active vs. contextual warning).
2. Replace the `🚀` emoji on the top navigation bar's "Space VTT" tab (`NavBar.vue`) with a custom, detailed dark blue rocket vector icon.

---

## 2. VTT Floating Toolbar Lined Shapes (`RpgVttView.vue` & `SpaceVttView.vue`)

### 2.1 Wireframe Vector Icons
All toolbar buttons replace their preceding emojis with inline vector line icons (`stroke="currentColor"` / `fill="none"` / `stroke-width="1.8"` / `14px` x `14px`):
- **Move:** 4-way direction cross with arrow points.
- **Pan:** Open hand / navigation compass wireframe.
- **Ruler:** Measuring line with dual end tick marks.
- **Ping:** Target radar beacon with concentric rings and center dot.
- **Clear Ping:** Diagonal `⨉` badge icon.
- **Clear All Pings:** Sweeping radar arc / broom wireframe.
- **Initiative:** Dual-segment lightning bolt contour.
- **Roll d%:** Angular d10 polyhedral die outline with `%` center.
- **DMG Die:** Starburst / explosion polygon outline.
- **Clear Dice:** Boxed diagonal cancel slash / `⨉`.

### 2.2 Color and Glow Inheritance
- Because the icons use `stroke="currentColor"`, their stroke dynamically and automatically matches the button state without brittle manual color overrides:
  - **Inactive Button:** Cyan stroke (`#00ffff` / `rgba(0, 128, 128, 0.6)`) with subtle glow `filter: drop-shadow(0 0 3px rgba(0, 255, 255, 0.4))`.
  - **Active Button:** Highlighted aqua stroke (`#a8ffea` / `#00ffff`) with enhanced glow `filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.7))`.
  - **Clear Ping Button:** Crimson stroke (`#ef4444`) with red glow.
  - **Clear All Pings Button:** Amber stroke (`#f59e0b`) with amber glow.

---

## 3. Dark Blue Rocket Tab Icon (`NavBar.vue`)

### 3.1 Space VTT Tab Presentation
- Replace the emoji `🚀` in `NavBar.vue` for the `{ path: '/dashboard/space-vtt', label: 'Space VTT' }` item.
- **Icon Specifications:**
  - Compact `16px` x `16px` SVG icon.
  - Hull & fins shaded in dark blue (`#1e3a8a` / `#1d4ed8` / `#2563eb`), with cockpit window highlight (`#60a5fa`) and flame/thruster accent (`#38bdf8`).
  - Active tab styling adds a soft blue thrust glow (`drop-shadow(0 0 5px rgba(37, 99, 235, 0.6))`).

---

## 4. Verification Plan

1. **Automated Unit & Component Tests:**
   - Verify `NavBar.vue` renders the dark blue rocket SVG for the Space VTT tab.
   - Verify `RpgVttView.vue` and `SpaceVttView.vue` render the lined SVG icons and no longer contain the emojis (`👆`, `✋`, `📏`, `📍`, `⚡`, `🎲`, `💥`, `✖`, `🧹`).
2. **Client Test Suite:**
   - Run Vitest suite (`npx vitest run`).
3. **Production Build:**
   - Run `npm run build` to ensure clean bundle compilation.

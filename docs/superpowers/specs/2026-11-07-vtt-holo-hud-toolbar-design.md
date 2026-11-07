# VTT Holo-HUD Translucent Toolbar Design

**Date:** 2026-11-07
**Status:** Approved

## 1. Overview
Enhance the floating toolbars on both the RPG Tactical VTT (`RpgVttView.vue`) and Space Tactical VTT (`SpaceVttView.vue`) with a sci-fi "Holo-HUD Glass" aesthetic. The current design uses a flat dark gray background (`rgba(22, 27, 34, 0.92)`) with standard web buttons. The new design introduces translucent frosted glass, glowing cyan/teal perimeter accents, holographic hairline dividers, and illuminated button states.

## 2. Visual Design Specifications

### 2.1 Toolbar Container (`.vtt-toolbar`)
* **Position & Sizing:** Preserved (`top: 16px; left: 16px; z-index: 10; display: flex; flex-direction: column; gap: 6px; padding: 8px;`).
* **Background & Translucency:**
  * `background: rgba(5, 18, 24, 0.68);`
  * `backdrop-filter: blur(12px);`
  * `-webkit-backdrop-filter: blur(12px);`
* **Border & Depth:**
  * `border: 1px solid rgba(45, 212, 191, 0.35);`
  * `border-radius: var(--radius);`
  * `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7), 0 0 15px rgba(20, 184, 166, 0.2);`

### 2.2 Tool Buttons (`.vtt-toolbar button`)
* **Resting State:**
  * `background: rgba(13, 59, 68, 0.25);`
  * `border: 1px solid rgba(45, 212, 191, 0.15);`
  * `color: #99f6e4;`
  * `font-weight: 500;`
  * `letter-spacing: 0.3px;`
  * `padding: 8px 12px;`
  * `border-radius: 4px;`
  * `transition: all 0.15s ease-in-out;`
* **Hover State (`button:hover`):**
  * `background: rgba(13, 59, 68, 0.55);`
  * `border-color: rgba(45, 212, 191, 0.5);`
  * `color: #ccfbf1;`
  * `box-shadow: 0 0 10px rgba(45, 212, 191, 0.3);`
* **Active Tool (`button.active`):**
  * `background: rgba(8, 45, 51, 0.85);`
  * `color: #2dd4bf;`
  * `font-weight: 600;`
  * `border: 1px solid #14b8a6;`
  * `box-shadow: 0 0 12px rgba(20, 184, 166, 0.5);`
* **Active Tool on Hover (`button.active:hover`):**
  * `background: rgba(13, 59, 68, 0.95);`
  * `color: #5eead4;`
  * `border-color: #2dd4bf;`
  * `box-shadow: 0 0 16px rgba(45, 212, 191, 0.7);`

### 2.3 Holographic Dividers (`.toolbar-divider`)
* Replace solid border divider with an illuminated holographic line:
  * `height: 1px;`
  * `margin: 4px 0;`
  * `background: linear-gradient(90deg, transparent, rgba(45, 212, 191, 0.45), transparent);`

### 2.4 Icons and Action Buttons
* **`.tool-icon`:** Retain wireframe icon sizing and drop-shadows with drop-shadow glow escalation on hover and active.
* **`.btn-clear-ping`:** Semi-translucent red warning accent:
  * `color: #f87171;`
  * `background: rgba(239, 68, 68, 0.1);`
  * `border: 1px solid rgba(239, 68, 68, 0.35);`

## 3. Scope & Target Files
* `client/src/views/RpgVttView.vue`: Update `.vtt-toolbar`, `.vtt-toolbar button`, `.toolbar-divider`, and `.btn-clear-ping` styles.
* `client/src/views/SpaceVttView.vue`: Update `.vtt-toolbar`, `.vtt-toolbar button`, `.toolbar-divider`, and `.btn-clear-ping` styles.
* `client/test/VttToolbarIcons.test.js`: Add CSS assertion tests verifying translucent styling and holographic accents.

## 4. Verification & Testing
* Run `client/test/VttDiceLayering.test.js` to ensure toolbar `z-index` layering remains valid.
* Run `client/test/VttToolbarIcons.test.js` to verify icon rendering and new toolbar CSS rules.
* Run full Vitest suite (`npm run test:unit`) to confirm 0 regressions across all 61 test files.

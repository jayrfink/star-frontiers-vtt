# Design

## Context

In `client/src/views/CharacterSheetsView.vue`, the SEU Energy Pool Tracker currently renders a `.stepper-group` containing four buttons (`-1`, `-2`, `-5`, `+5`). These call `adjustSeu(amount)` which updates `selectedChar.current_seu`, clamps it to `[0, max_seu]`, and immediately triggers `this.updateCharacter()` to persist changes via `PUT /api/characters/:id`.

While there is a "Full Rest" button for stamina and energy combined in the sheet header, players in combat need to reload their weapon power pack without triggering a full rest.

## Goals / Non-Goals

**Goals:**
- Update the stepper button sequence to `-5`, `-1`, `+1`, `+5`.
- Add a distinct "Reload" button in the SEU controls that resets `current_seu` directly to `max_seu`.
- Maintain clean button styling matching the cyberpunk/retro Star Frontiers UI aesthetic.
- Preserve existing freeform delta input and keyboard shortcuts.

**Non-Goals:**
- Modifying backend database schema or API endpoints (existing character endpoints already accept `current_seu`).
- Modifying vehicle or starship energy systems.

## Decisions

1. **Button Ordering and Color Coding:**
   - Buttons will be ordered left-to-right as `[-5] [-1] [+1] [+5] [⚡ Reload]`.
   - Subtraction buttons (`-5`, `-1`) maintain `.btn-sub` (subtle red/amber hover).
   - Addition buttons (`+1`, `+5`) maintain `.btn-add` (subtle green hover).
   - Reload button will have class `.btn-reload` styled in cyan/electric blue matching SEU theme.
2. **Reload Method:**
   - Add a `reloadSeu()` method on `CharacterSheetsView.vue` that sets `current_seu = max_seu` and calls `this.updateCharacter()`.
   - Reuses existing boundary clamping to prevent null/NaN edge cases.

## Risks / Trade-offs

- [Risk: Accidental click on Reload during combat] → Mitigation: Place Reload with distinct styling and margin or visual separation so it isn't misclicked when tapping `-1`.

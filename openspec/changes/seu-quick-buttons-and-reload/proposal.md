# Proposal

## Why

During tactical combat in the Star Frontiers VTT, players frequently adjust their Standard Energy Unit (SEU) pools when firing energy weapons (such as laser pistols costing 1 SEU, laser rifles costing 2 or 5 SEU, or heavy energy bursts). The current fixed adjustment buttons (`-1, -2, -5, +5`) lack a quick single-point increment (`+1`) and do not provide an immediate way to reload a drained weapon or power pack back to maximum SEU without using the full character rest (which also resets stamina). Updating the quick adjustment buttons to `-5, -1, +1, +5` and adding a dedicated "Reload" button significantly improves combat tracking speed and matches the tabletop game's weapon reload mechanics.

## What Changes

- Update the quick adjustment button group in the Character Sheet's SEU Energy Pool Tracker from `-1, -2, -5, +5` to `-5, -1, +1, +5`.
- Add a dedicated "Reload" button (`⚡ Reload` or `🔋 Reload`) that immediately restores `current_seu` to `max_seu`.
- Ensure standard clamping prevents `current_seu` from exceeding `max_seu` or falling below 0.
- Persist the updated SEU value to the database and sync state via the existing character update endpoint.

## Capabilities

### New Capabilities
- `character-sheets/energy-pool`: Manages character SEU (Standard Energy Unit) tracking, quick-step consumption and charging increments, and one-click power pack reload functionality.

### Modified Capabilities
<!-- None: No existing specs exist yet in openspec/specs/ -->

## Impact

- Affected frontend components: `client/src/views/CharacterSheetsView.vue` (SEU stepper button group and reload handler).
- Backend APIs: Existing `PUT /api/characters/:id` handles SEU updates cleanly without modification.
- Existing tests: Automated tests in `client/` and `server/` continue to pass.

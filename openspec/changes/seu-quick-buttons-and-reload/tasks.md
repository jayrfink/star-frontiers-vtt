# Tasks

## 1. Character Sheet SEU Controls Update

- [x] 1.1 Update fixed stepper buttons in `client/src/views/CharacterSheetsView.vue` from `-1, -2, -5, +5` to `-5, -1, +1, +5` with descriptive tooltip titles and verify element markup
- [x] 1.2 Add `⚡ Reload` button to `.seu-header-right` in `client/src/views/CharacterSheetsView.vue` with tooltip "Reload: Restore SEU to maximum" mirroring Full Rest on STA
- [x] 1.3 Implement `reloadSeu()` method in `client/src/views/CharacterSheetsView.vue` that sets `current_seu = max_seu` and persists the sheet, verifying clamping against `[0, max_seu]`
- [x] 1.4 Add `.btn-action-reload` styling in `client/src/views/CharacterSheetsView.vue` sharing `.btn-action-reset` styling for visual parity with Full Rest

## 2. Verification & Build

- [x] 2.1 Compile client production bundle via `npm run build --prefix client` and verify zero build warnings or syntax errors
- [x] 2.2 Run full test suite via `docker exec sf-vtt-dev npm test --prefix server` to confirm no regressions in backend character persistence

# Design Specification: VTT Die Roll Log (RPG VTT & Space VTT)

## 1. Overview
Currently, both RPG VTT and Space VTT display floating temporary HUD banners when dice are rolled, but do not provide a persistent log of recent rolls.

This specification defines a dedicated, bottom-corner collapsible Die Roll Log that independently tracks and displays the last 20 dice rolls for RPG VTT and Space VTT.

## 2. Requirements & Constraints
- **Strict Decoupling**: Keep RPG VTT (`RpgVttView.vue`) and Space VTT (`SpaceVttView.vue`) completely independent with no shared state or coupled helpers.
- **Roll Limit**: Capped at the last 20 rolls only. Adding a 21st roll drops the oldest roll.
- **Independent Persistence**: Persist the last 20 rolls in `localStorage` under distinct keys:
  - RPG VTT: `sf_vtt_rpg_roll_log`
  - Space VTT: `sf_vtt_space_roll_log`
- **Roll Types Recorded**:
  - Percentile (`d%`): records timestamp, label `d%`, total, and breakdown `[Tens: XX, Ones: X]`.
  - Damage (`Nd10`): records timestamp, label `Nd10`, total, and breakdown `[die1, die2, ...]`.
- **UI Location**: Collapsible HUD panel docked in the bottom-left corner (`bottom: 16px; left: 16px;`) of `.vtt-canvas-wrapper` (`z-index: 105`).
- **Interactive Controls**:
  - Collapse / Expand toggle button.
  - "Clear" button to wipe the 20-roll log for the active VTT.

## 3. Data Structure
Each roll log entry is structured as:
```javascript
{
  id: string,          // e.g. `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
  timestamp: string,   // Formatted local time e.g. "18:45:12"
  type: 'percentile' | 'damage',
  label: string,       // e.g. "d%" or "3d10"
  total: number,       // Rolled total value
  breakdown: string    // e.g. "[Tens: 40, Ones: 2]" or "[7, 4, 9]"
}
```

## 4. Implementation Details

### 4.1 State & Helper Functions (in each view)
```javascript
const rollLog = ref([]);
const isRollLogOpen = ref(false);

function loadRollLog(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) rollLog.value = parsed.slice(0, 20);
    }
  } catch (err) {
    console.error('Failed to load roll log:', err);
  }
}

function saveRollLog(storageKey) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(rollLog.value.slice(0, 20)));
  } catch (err) {
    console.error('Failed to save roll log:', err);
  }
}

function addRollToLog(entry, storageKey) {
  rollLog.value.unshift(entry);
  if (rollLog.value.length > 20) {
    rollLog.value = rollLog.value.slice(0, 20);
  }
  saveRollLog(storageKey);
}

function clearRollLog(storageKey) {
  rollLog.value = [];
  try {
    localStorage.removeItem(storageKey);
  } catch (err) {
    console.error('Failed to clear roll log:', err);
  }
}
```

### 4.2 Roll Event Capture
- Inside `rollPercentile()`:
  ```javascript
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  addRollToLog({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: timeStr,
    type: 'percentile',
    label: 'd%',
    total: rollSummary.total,
    breakdown: `[Tens: ${rollSummary.tens * 10}, Ones: ${rollSummary.ones}]`
  }, STORAGE_KEY);
  ```
- Inside `rollDamage()`:
  ```javascript
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  addRollToLog({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: timeStr,
    type: 'damage',
    label: `${rollSummary.count}d10`,
    total: rollSummary.total,
    breakdown: `[${rollSummary.dice.join(', ')}]`
  }, STORAGE_KEY);
  ```

### 4.3 UI Template & Styling
- Position: `.vtt-canvas-wrapper > .roll-log-hud` (`position: absolute; bottom: 16px; left: 16px; z-index: 105;`)
- Collapsed: Compact pill button `.btn-roll-log-pill` displaying `🎲 Log (${rollLog.length}) ▲`.
- Expanded: `.roll-log-card` (`width: 280px; max-height: 280px; background: #000000; border: 1px solid rgba(0, 128, 128, 0.6); border-radius: 6px;`)
  - Header: title, `Clear` button, `▼` collapse button.
  - List: `.roll-log-list` with scroll overflow.
  - Item: `.roll-log-item` displaying timestamp, badge (`d%` cyan / `dmg` amber), total, and breakdown.

## 5. Testing & Verification
- Unit test suite for RPG VTT roll log state and persistence.
- Unit test suite for Space VTT roll log state and persistence.
- Verify cap at 20 items (21st roll pushes out the oldest).
- Verify separation between RPG VTT and Space VTT storage keys.
- Client tests and build verification.

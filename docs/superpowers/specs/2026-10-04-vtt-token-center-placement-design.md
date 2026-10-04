# Design Specification: Pseudo-Random Center Token Placement

## 1. Overview
When adding a new token to either the RPG VTT or Space VTT, default coordinates currently initialize to `(0, 0)` in the upper-left corner of the map. This frequently places new tokens underneath top/left navigation toolbars and menus.

This specification defines a placement algorithm that pseudo-randomly places new tokens in an unoccupied spot near the center of the active map.

## 2. Requirements & Constraints
1. **Center Proximity**: Initial token coordinates must be located within a 5×5 cell/hex bounding box (radius ±2) centered around the map's midpoint.
2. **Empty Spot Selection**: The selected coordinate must not collide with any existing token currently present on the active map.
3. **Decoupled Implementations**: RPG VTT and Space VTT must implement this logic independently in their respective views (`RpgVttView.vue` and `SpaceVttView.vue`), maintaining code separation.
4. **Boundary Safety**: Selected coordinates must remain strictly within map dimensions `[0, width - 1]` and `[0, height - 1]`.
5. **Collision Fallback**: If all cells in the 5×5 central area are occupied, the search expands outward ring-by-ring to find the closest available unoccupied spot.
6. **Backward Compatibility**: Token schema, persistence, socket sync, and manual drag-and-drop movement remain unaffected.

## 3. Algorithm Specification

### Helper: `getEmptyCenterCoords()`
Defined independently in both `RpgVttView.vue` and `SpaceVttView.vue`.

```javascript
function getEmptyCenterCoords() {
  const mapW = activeMap.value?.width || 20;
  const mapH = activeMap.value?.height || 20;
  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);

  // Set of occupied coordinates on the current map
  const occupied = new Set(tokens.value.map(t => `${t.x},${t.y}`));

  // Check central zone (radius 2 = 5x5 box)
  const initialRadius = 2;
  const initialCandidates = [];
  for (let dx = -initialRadius; dx <= initialRadius; dx++) {
    for (let dy = -initialRadius; dy <= initialRadius; dy++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
        if (!occupied.has(`${x},${y}`)) {
          initialCandidates.push({ x, y });
        }
      }
    }
  }

  if (initialCandidates.length > 0) {
    const idx = Math.floor(Math.random() * initialCandidates.length);
    return initialCandidates[idx];
  }

  // Fallback: expand ring by ring if center 5x5 is fully occupied
  const maxRadius = Math.max(mapW, mapH);
  for (let r = initialRadius + 1; r <= maxRadius; r++) {
    const ringCandidates = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        // Only inspect the perimeter of the current radius ring
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
          if (!occupied.has(`${x},${y}`)) {
            ringCandidates.push({ x, y });
          }
        }
      }
    }
    if (ringCandidates.length > 0) {
      const idx = Math.floor(Math.random() * ringCandidates.length);
      return ringCandidates[idx];
    }
  }

  // Ultimate fallback if entire map is saturated
  return { x: cx, y: cy };
}
```

## 4. Integration

### `RpgVttView.vue`
In `openAddTokenModal()`:
```javascript
function openAddTokenModal() {
  selectedCharacterId.value = null;
  newTokenForm.name = '';
  newTokenForm.color = '#666666';
  newTokenForm.avatar_url = '';
  const spawn = getEmptyCenterCoords();
  newTokenForm.x = spawn.x;
  newTokenForm.y = spawn.y;
  newTokenForm.size = 1;
  if (tokenFileInput.value) tokenFileInput.value.value = '';
  showAddTokenModal.value = true;
}
```

### `SpaceVttView.vue`
In `openAddTokenModal()`:
```javascript
function openAddTokenModal() {
  selectedShipId.value = null;
  newTokenForm.name = '';
  newTokenForm.color = '#666666';
  newTokenForm.avatar_url = '';
  const spawn = getEmptyCenterCoords();
  newTokenForm.x = spawn.x;
  newTokenForm.y = spawn.y;
  newTokenForm.size = 1;
  newTokenForm.current_speed = 0;
  newTokenForm.rotation = 0;
  if (tokenFileInput.value) tokenFileInput.value.value = '';
  showAddTokenModal.value = true;
}
```

## 5. Testing & Verification
1. **Unit/Integration Tests**:
   - Verify `openAddTokenModal()` initializes `newTokenForm.x` and `newTokenForm.y` within `[cx - 2, cx + 2]` and `[cy - 2, cy + 2]`.
   - Verify when existing tokens occupy cells in the central region, the chosen coordinate does not overlap with any occupied cell.
   - Verify fallback expansion when the central 5×5 area is completely filled with tokens.
2. **Regression Testing**:
   - Existing client and server test suites must continue passing.
   - Vite production build must succeed.

# Phase 5: Space VTT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hex-based Space VTT for Knight Hawks tactical combat, including an automatic token slicer script, pointy-top hex grid canvas, and rotatable ship tokens with speed badges.

**Architecture:** Node.js/SQLite backend for state, Vue 3 HTML5 Canvas for rendering, Socket.io for live sync. A standalone Node script using `sharp` extracts token art from TSR counter scans.

**Tech Stack:** Node.js, Express, SQLite, Socket.io, Vue 3, Vite, HTML5 Canvas, `sharp`.

## Global Constraints

- Run all terminal commands inside the Docker container: `docker exec sf-vtt-dev bash -c "<command>"`
- Ensure all Vue imports use `.js` or `.vue` extensions explicitly if not relying on Vite's default resolver.
- Write ESM modules everywhere.

---

### Task 1: Asset Slicer Script

**Files:**
- Modify: `package.json`
- Create: `scripts/slice-knight-hawks-counters.js`

**Interfaces:**
- Produces: Transparent PNG tokens in `client/public/tokens/space/`

- [ ] **Step 1: Install `sharp` in the root project**

```bash
docker exec sf-vtt-dev bash -c "cd /Users/jrf/star-frontiers-vtt && npm install sharp --save-dev"
```

- [ ] **Step 2: Create the slicing script**

Create `scripts/slice-knight-hawks-counters.js`:
```javascript
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputFile = path.join(process.cwd(), 'assets/space/Knight Hawks printables/Star Frontiers-7011-Knight Hawks-counters.jpg');
const outputDir = path.join(process.cwd(), 'client/public/tokens/space');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Just extract a few key counters for testing (UPF Assault Scout, Sathar Destroyer, Volturnus)
// Assumes rough crop coordinates for testing the VTT engine
const regions = [
  { name: 'upf_assault_scout.png', left: 45, top: 57, width: 90, height: 90 },
  { name: 'sathar_destroyer.png', left: 500, top: 500, width: 90, height: 90 },
  { name: 'planet_volturnus.png', left: 800, top: 800, width: 150, height: 150 }
];

async function slice() {
  for (const region of regions) {
    await sharp(inputFile)
      .extract({ left: region.left, top: region.top, width: region.width, height: region.height })
      .png()
      .toFile(path.join(outputDir, region.name));
    console.log(`Extracted ${region.name}`);
  }
}

slice().catch(console.error);
```

- [ ] **Step 3: Run the script to generate placeholder tokens**

```bash
docker exec sf-vtt-dev bash -c "node scripts/slice-knight-hawks-counters.js"
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json scripts/slice-knight-hawks-counters.js
git commit -m "feat(assets): add sharp script to slice knight hawks counter tokens"
```

### Task 2: Database & Backend Updates for Tokens

**Files:**
- Modify: `server/src/db.js`
- Modify: `server/src/maps.js`
- Modify: `server/test/maps.test.js`

**Interfaces:**
- Consumes: Existing SQLite `tokens` table schema.
- Produces: `rotation` and `current_speed` fields on tokens sent via API and Socket.io.

- [ ] **Step 1: Write the failing test**

Modify `server/test/maps.test.js` Token API suite to check for `rotation` and `current_speed`:
```javascript
  it('updates token rotation and speed', async () => {
    // Assuming token is already created in previous test
    const res = await agent.put(`/api/tokens/${tokenId}`).send({
      rotation: 60,
      current_speed: 10
    });
    expect(res.status).toBe(200);
    expect(res.body.rotation).toBe(60);
    expect(res.body.current_speed).toBe(10);
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/maps.test.js"
```
Expected: FAIL (missing columns in DB).

- [ ] **Step 3: Update Database Schema**

Modify `server/src/db.js`. In the `CREATE TABLE IF NOT EXISTS tokens` statement, add:
```sql
      rotation INTEGER DEFAULT 0,
      current_speed INTEGER DEFAULT 0,
```

- [ ] **Step 4: Update Token PUT Route**

Modify `server/src/maps.js` in `router.put('/tokens/:id')`:
Extract `rotation` and `current_speed` from `req.body` and include them in the SQL `UPDATE` statement and `params` array.

- [ ] **Step 5: Run test to verify it passes**

```bash
docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/maps.test.js"
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/db.js server/src/maps.js server/test/maps.test.js
git commit -m "feat(server): add rotation and speed to tokens for Space VTT"
```

### Task 3: Space VTT Canvas Engine

**Files:**
- Create: `client/src/components/SpaceVttCanvas.vue`

**Interfaces:**
- Produces: `<SpaceVttCanvas>` component taking `map`, `tokens`, `zoomLevel`, `activeTool` props and emitting events.

- [ ] **Step 1: Create SpaceVttCanvas.vue boilerplate**

Create `client/src/components/SpaceVttCanvas.vue` with `requestAnimationFrame` loop, similar to `VttCanvas.vue`.

- [ ] **Step 2: Draw Procedural Starfield**

In the `drawBackground` function, fill the canvas with `#030712` and draw random white stars.

- [ ] **Step 3: Draw Pointy-Top Hex Grid**

Implement a flat-top to pointy-top hex grid math rendering function in `drawGrid`:
```javascript
function drawGrid(ctx, mapW, mapH) {
  if (!props.map) return;
  const hexSize = props.map.grid_size || 40;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  // draw hexes using math (width = sqrt(3) * size, height = 2 * size)
}
```

- [ ] **Step 4: Draw Tokens with Rotation and Badges**

In `drawTokens`, use `ctx.save()`, `ctx.translate(cx, cy)`, `ctx.rotate((token.rotation * Math.PI) / 180)`, then `ctx.drawImage` for the token.
Draw HP bar and Speed badge after restoring the context so they stay upright.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/SpaceVttCanvas.vue
git commit -m "feat(client): implement space vtt hex canvas engine"
```

### Task 4: Space VTT View & UI Controls

**Files:**
- Modify: `client/src/views/SpaceVttView.vue`

**Interfaces:**
- Consumes: `<SpaceVttCanvas>`

- [ ] **Step 1: Setup View Layout**

Modify `client/src/views/SpaceVttView.vue` to import and mount `<SpaceVttCanvas>`.

- [ ] **Step 2: Token Rotation Keyboard Shortcuts**

Listen for `Q` (rotate -60) and `E` (rotate +60) keys on `window.addEventListener('keydown')` when a token is selected.
Send API `PUT /api/tokens/:id` with new `rotation`.

- [ ] **Step 3: Token Inspector Extensions**

Add input fields for `current_speed` and `rotation` in the Token Inspector sidebar.

- [ ] **Step 4: Build Client**

```bash
docker exec sf-vtt-dev bash -c "cd client && npm run build"
```

- [ ] **Step 5: Commit**

```bash
git add client/src/views/SpaceVttView.vue
git commit -m "feat(client): integrate space vtt canvas and rotation controls"
```

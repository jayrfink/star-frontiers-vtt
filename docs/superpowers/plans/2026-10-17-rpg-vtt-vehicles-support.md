# RPG VTT Vehicle Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete Star Frontiers Alpha Dawn Expanded Rules vehicle support to the RPG VTT, including a canonical 10-vehicle catalog, custom vehicle builder with database persistence, a deployment modal, and an interactive tactical Vehicle HUD with speed, battery, and Vehicle Damage Table tracking.

**Architecture:** Canonical vehicles are stored in `data/vehicles.json` and served alongside GM-created custom vehicles from SQLite `vehicle_templates` via `GET /api/vehicles`. Placed tokens store live mutable state in `tokens.vehicle_data` (speed, battery SEU, damage conditions, crew/cargo notes) and synchronize across clients via existing `token:created` and `token:updated` Socket.io events. On the client, `DeployVehicleModal.vue` handles vehicle stocking/customization, `VehicleTokenHud.vue` handles tactical in-encounter control, and `VttCanvas.vue` displays vehicle dimensions and status indicators.

**Tech Stack:** Node.js, Express, SQLite (better-sqlite3), Socket.io, Vitest, Vue 3, HTML/CSS Canvas.

## Global Constraints

- Run all test and build commands inside the container: `docker exec sf-vtt-dev bash -c "<command>"`
- Server unit tests: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/vehicles.test.js"`
- Full server test suite: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
- Client unit tests: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/DeployVehicleModal.test.js test/VehicleTokenHud.test.js"`
- Full client test suite & production build: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
- All statistics (speeds, accel, decel, turn speed, battery types, capacities) must match the *Alpha Dawn Expanded Game Rules* (pp. 33, 37).
- Preserve existing token, adversary, and character sheet functionality without regressions.

---

## File Structure

- Create: `data/vehicles.json` — 10 canonical Alpha Dawn vehicles.
- Modify: `.gitignore` — Allowlist `!data/vehicles.json`.
- Modify: `server/src/db.js` — Migration for `vehicle_templates` table and `tokens.vehicle_data` column.
- Create: `server/src/vehicles.js` — Express router for `/api/vehicles`.
- Modify: `server/src/index.js` — Mount `/api/vehicles`.
- Modify: `server/src/maps.js` — Handle `vehicle_data` in token formatting, creation, and updates.
- Create: `server/test/vehicles.test.js` — Comprehensive backend tests for vehicles API and tokens.
- Create: `client/src/components/DeployVehicleModal.vue` — Vehicle deployment and custom vehicle creation dialog.
- Create: `client/test/DeployVehicleModal.test.js` — Unit tests for DeployVehicleModal.
- Create: `client/src/components/VehicleTokenHud.vue` — Tactical in-game HUD for speed, battery, and damage conditions.
- Create: `client/test/VehicleTokenHud.test.js` — Unit tests for VehicleTokenHud.
- Modify: `client/src/components/VttCanvas.vue` — Draw vehicle speed badge and status overlay on vehicle tokens.
- Modify: `client/src/views/RpgVttView.vue` — Add "🚗 Deploy Vehicle" launcher button, mount `DeployVehicleModal` and `VehicleTokenHud`.

---

### Task 1: Canonical Catalog, Database Schema Migration, & Backend Vehicles API with Tests

**Files:**
- Create: `data/vehicles.json`
- Modify: `.gitignore`
- Modify: `server/src/db.js`
- Create: `server/src/vehicles.js`
- Modify: `server/src/index.js`
- Modify: `server/src/maps.js`
- Create: `server/test/vehicles.test.js`

**Interfaces:**
- Produces: `GET /api/vehicles`, `POST /api/vehicles`, `DELETE /api/vehicles/:id`
- Produces: `tokens.vehicle_data` support in `GET /api/maps/active`, `POST /api/tokens`, `PUT /api/tokens/:id`

- [ ] **Step 1: Write the failing test in `server/test/vehicles.test.js`**

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { createDb } from '../src/db.js';

describe('Vehicles API & Token Vehicle Support', () => {
  let app;
  let server;
  let db;
  let gmAgent;
  let playerAgent;
  let mapId;

  beforeAll(async () => {
    db = createDb(':memory:');
    const result = createApp(db, ':memory:');
    app = result.app;
    server = result.server;

    gmAgent = request.agent(app);
    playerAgent = request.agent(app);

    // Register GM and Player
    await gmAgent.post('/api/auth/register').send({ username: 'vehiclegm', password: 'password123', role: 'GameMaster' });
    await gmAgent.post('/api/auth/register').send({ username: 'vehicleplayer', password: 'password123', role: 'Player' });

    // Login GM
    await gmAgent.post('/api/auth/login').send({ username: 'vehiclegm', password: 'password123' });
    // Login Player
    await playerAgent.post('/api/auth/login').send({ username: 'vehicleplayer', password: 'password123' });

    // Create a map for token tests
    const mapRes = await gmAgent.post('/api/maps').send({ name: 'Vehicle Map', width: 20, height: 20 });
    mapId = mapRes.body.id;
  });

  afterAll(() => {
    if (db) db.close();
    if (server && server.close) server.close();
  });

  describe('GET /api/vehicles', () => {
    it('returns HTTP 200 with list of canonical vehicles including all 10 Alpha Dawn vehicles', async () => {
      const res = await gmAgent.get('/api/vehicles');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(10);

      const names = res.body.map(v => v.name);
      expect(names).toContain('Ground Car');
      expect(names).toContain('Ground Transport');
      expect(names).toContain('Ground Cycle');
      expect(names).toContain('Hover Car');
      expect(names).toContain('Hover Transport');
      expect(names).toContain('Hover Cycle');
      expect(names).toContain('Explorer');
      expect(names).toContain('Glijet');
      expect(names).toContain('Jetcopter');
      expect(names).toContain('Aircar');

      // Verify Ground Car attributes
      const car = res.body.find(v => v.name === 'Ground Car');
      expect(car.type).toBe('Ground');
      expect(car.cost).toBe(5000);
      expect(car.top_speed_kph).toBe(100);
      expect(car.top_speed_m_turn).toBe(175);
      expect(car.cruise_speed_kph).toBe(60);
      expect(car.accel).toBe(60);
      expect(car.decel).toBe(40);
      expect(car.turn_speed).toBe(80);
      expect(car.passengers).toBe(6);
      expect(car.cargo_kg).toBe(150);
      expect(car.max_seu).toBe(100);
      expect(car.token_size).toBe(2);
      expect(car.is_canonical).toBe(true);
    });
  });

  describe('POST /api/vehicles and DELETE /api/vehicles/:id', () => {
    it('rejects custom vehicle creation from Player with 403', async () => {
      const res = await playerAgent.post('/api/vehicles').send({
        name: 'Player Buggy',
        type: 'Ground',
        top_speed_m_turn: 150,
      });
      expect(res.status).toBe(403);
    });

    it('rejects custom vehicle creation with missing required name', async () => {
      const res = await gmAgent.post('/api/vehicles').send({
        type: 'Ground',
      });
      expect(res.status).toBe(400);
    });

    it('allows GM to create a custom vehicle template and persists it', async () => {
      const payload = {
        name: 'Armored Patrol Scout',
        type: 'Ground',
        cost: 12000,
        top_speed_kph: 110,
        top_speed_m_turn: 180,
        cruise_speed_kph: 70,
        accel: 70,
        decel: 50,
        turn_speed: 90,
        passengers: 4,
        cargo_kg: 500,
        cargo_m3: 2.5,
        battery_type: 'Type 2 (100 SEU)',
        max_seu: 100,
        token_size: 2,
        avatar_url: '/uploads/patrol_scout.png',
        description: 'Reinforced frontier patrol vehicle',
      };

      const res = await gmAgent.post('/api/vehicles').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^veh_/);
      expect(res.body.name).toBe('Armored Patrol Scout');
      expect(res.body.is_canonical).toBe(false);

      // Verify it appears in GET /api/vehicles
      const listRes = await gmAgent.get('/api/vehicles');
      const found = listRes.body.find(v => v.id === res.body.id);
      expect(found).toBeDefined();
      expect(found.name).toBe('Armored Patrol Scout');
      expect(found.is_canonical).toBe(false);
    });

    it('rejects deleting canonical vehicles with 400', async () => {
      const res = await gmAgent.delete('/api/vehicles/ground_car');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('canonical');
    });

    it('allows GM to delete custom vehicle template', async () => {
      const createRes = await gmAgent.post('/api/vehicles').send({
        name: 'Temporary Buggy',
        type: 'Ground',
      });
      const id = createRes.body.id;

      const delRes = await gmAgent.delete(`/api/vehicles/${id}`);
      expect(delRes.status).toBe(200);

      const listRes = await gmAgent.get('/api/vehicles');
      expect(listRes.body.find(v => v.id === id)).toBeUndefined();
    });
  });

  describe('Tokens with vehicle_data integration', () => {
    let tokenId;

    it('spawns a vehicle token with vehicle_data', async () => {
      const vehicleData = {
        template_id: 'ground_car',
        name: 'Ground Car',
        type: 'Ground',
        current_speed: 0,
        top_speed: 175,
        accel: 60,
        decel: 40,
        turn_speed: 80,
        current_seu: 100,
        max_seu: 100,
        damage_conditions: [],
        passengers: 'Driver: Ace',
        cargo_notes: 'Survival kit',
      };

      const res = await gmAgent.post('/api/tokens').send({
        map_id: mapId,
        name: 'Ground Car',
        color: '#ff9800',
        size: 2,
        x: 5,
        y: 5,
        vehicle_data: vehicleData,
      });

      expect(res.status).toBe(201);
      expect(res.body.vehicle_data).toBeDefined();
      expect(res.body.vehicle_data.template_id).toBe('ground_car');
      expect(res.body.vehicle_data.current_speed).toBe(0);
      expect(res.body.vehicle_data.current_seu).toBe(100);
      tokenId = res.body.id;
    });

    it('updates vehicle_data (speed, SEU, damage conditions) via PUT /api/tokens/:id', async () => {
      const updatedVehicleData = {
        template_id: 'ground_car',
        name: 'Ground Car',
        type: 'Ground',
        current_speed: 60,
        top_speed: 175,
        accel: 60,
        decel: 40,
        turn_speed: 80,
        current_seu: 90,
        max_seu: 100,
        damage_conditions: ['Turn Speed -15'],
        passengers: 'Driver: Ace',
        cargo_notes: 'Survival kit',
      };

      const res = await gmAgent.put(`/api/tokens/${tokenId}`).send({
        x: 8,
        y: 5,
        vehicle_data: updatedVehicleData,
      });

      expect(res.status).toBe(200);
      expect(res.body.vehicle_data.current_speed).toBe(60);
      expect(res.body.vehicle_data.current_seu).toBe(90);
      expect(res.body.vehicle_data.damage_conditions).toEqual(['Turn Speed -15']);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/vehicles.test.js"`
Expected: FAIL (`404` for `/api/vehicles` and missing schema/endpoints).

- [ ] **Step 3: Create `data/vehicles.json`**

Create `data/vehicles.json` containing the 10 canonical vehicles:
```json
[
  {
    "id": "ground_car",
    "name": "Ground Car",
    "type": "Ground",
    "cost": 5000,
    "rental": "50 Cr + 50 Cr/day",
    "top_speed_kph": 100,
    "top_speed_m_turn": 175,
    "cruise_speed_kph": 60,
    "accel": 60,
    "decel": 40,
    "turn_speed": 80,
    "passengers": 6,
    "cargo_kg": 150,
    "cargo_m3": 1.0,
    "battery_type": "Type 2 (100 SEU)",
    "max_seu": 100,
    "token_size": 2,
    "description": "Standard wheeled passenger car running on a Type 2 parabattery. Highly maneuverable on surface roads and clear terrain."
  },
  {
    "id": "ground_transport",
    "name": "Ground Transport",
    "type": "Ground",
    "cost": 15000,
    "rental": "75 Cr + 100 Cr/day",
    "top_speed_kph": 75,
    "top_speed_m_turn": 125,
    "cruise_speed_kph": 60,
    "accel": 40,
    "decel": 30,
    "turn_speed": 50,
    "passengers": 3,
    "cargo_kg": 10000,
    "cargo_m3": 30.0,
    "battery_type": "Type 3 (200 SEU)",
    "max_seu": 200,
    "token_size": 2,
    "description": "Heavy multi-wheeled cargo truck with open or enclosed cargo bays for commercial freight and expedition gear."
  },
  {
    "id": "ground_cycle",
    "name": "Ground Cycle",
    "type": "Ground",
    "cost": 2000,
    "rental": "25 Cr + 25 Cr/day",
    "top_speed_kph": 120,
    "top_speed_m_turn": 200,
    "cruise_speed_kph": 60,
    "accel": 100,
    "decel": 40,
    "turn_speed": 100,
    "passengers": 2,
    "cargo_kg": 20,
    "cargo_m3": 0.5,
    "battery_type": "Type 1 (50 SEU)",
    "max_seu": 50,
    "token_size": 1,
    "description": "Fast, lightweight two-wheeled motorcycle. Extremely responsive and maneuverable in congested terrain."
  },
  {
    "id": "hover_car",
    "name": "Hover Car",
    "type": "Hover",
    "cost": 8000,
    "rental": "50 Cr + 75 Cr/day",
    "top_speed_kph": 160,
    "top_speed_m_turn": 250,
    "cruise_speed_kph": 60,
    "accel": 80,
    "decel": 40,
    "turn_speed": 70,
    "passengers": 6,
    "cargo_kg": 100,
    "cargo_m3": 1.0,
    "battery_type": "Type 2 (100 SEU)",
    "max_seu": 100,
    "token_size": 2,
    "description": "Skimmer car floating on a 30cm air cushion propelled by dual turbofans. Fast across flat plains and calm water."
  },
  {
    "id": "hover_transport",
    "name": "Hover Transport",
    "type": "Hover",
    "cost": 20000,
    "rental": "75 Cr + 150 Cr/day",
    "top_speed_kph": 150,
    "top_speed_m_turn": 250,
    "cruise_speed_kph": 90,
    "accel": 60,
    "decel": 30,
    "turn_speed": 40,
    "passengers": 3,
    "cargo_kg": 10000,
    "cargo_m3": 35.0,
    "battery_type": "Type 3 (200 SEU)",
    "max_seu": 200,
    "token_size": 2,
    "description": "Heavy industrial hover freighter designed for planetary supply runs across plains, deserts, and bodies of water."
  },
  {
    "id": "hover_cycle",
    "name": "Hover Cycle",
    "type": "Hover",
    "cost": 2000,
    "rental": "25 Cr + 25 Cr/day",
    "top_speed_kph": 100,
    "top_speed_m_turn": 175,
    "cruise_speed_kph": 80,
    "accel": 100,
    "decel": 40,
    "turn_speed": 90,
    "passengers": 2,
    "cargo_kg": 20,
    "cargo_m3": 0.5,
    "battery_type": "Type 1 (50 SEU)",
    "max_seu": 50,
    "token_size": 1,
    "description": "Two-person hover bike. Easier to control than a ground cycle over water and marsh, with great acceleration."
  },
  {
    "id": "explorer",
    "name": "Explorer",
    "type": "Ground",
    "cost": 20000,
    "rental": "75 Cr + 200 Cr/day",
    "top_speed_kph": 90,
    "top_speed_m_turn": 150,
    "cruise_speed_kph": 50,
    "accel": 60,
    "decel": 40,
    "turn_speed": 100,
    "passengers": 6,
    "cargo_kg": 2000,
    "cargo_m3": 6.0,
    "battery_type": "Type 3 (200 SEU)",
    "max_seu": 200,
    "token_size": 2,
    "description": "Rugged, air-tight 4-wheel survey van. Individual motor on each extra-wide tire; amphibious with retractable water rudder."
  },
  {
    "id": "glijet",
    "name": "Glijet",
    "type": "Flying",
    "cost": 3000,
    "rental": "75 Cr + 50 Cr/day",
    "top_speed_kph": 100,
    "top_speed_m_turn": 175,
    "cruise_speed_kph": 30,
    "accel": 100,
    "decel": 100,
    "turn_speed": 100,
    "passengers": 1,
    "cargo_kg": 16,
    "cargo_m3": 0.1,
    "battery_type": "Chemical Rocketpack (2 kg)",
    "max_seu": 20,
    "token_size": 1,
    "description": "Personal combination rocketpack and collapsible hang glider. Flies to high altitudes or glides silently over terrain."
  },
  {
    "id": "jetcopter",
    "name": "Jetcopter",
    "type": "Flying",
    "cost": 40000,
    "rental": "100 Cr + 80 Cr/day",
    "top_speed_kph": 350,
    "top_speed_m_turn": 600,
    "cruise_speed_kph": 50,
    "accel": 100,
    "decel": 100,
    "turn_speed": 100,
    "passengers": 4,
    "cargo_kg": 500,
    "cargo_m3": 5.0,
    "battery_type": "Type 4 (500 SEU)",
    "max_seu": 500,
    "token_size": 2,
    "description": "Helicopter augmented with twin jet engines. Hovers like a standard chopper or engages jets for rapid planetary flight."
  },
  {
    "id": "aircar",
    "name": "Aircar",
    "type": "Flying",
    "cost": 50000,
    "rental": "100 Cr + 100 Cr/day",
    "top_speed_kph": 900,
    "top_speed_m_turn": 1500,
    "cruise_speed_kph": 400,
    "accel": 100,
    "decel": 100,
    "turn_speed": 100,
    "passengers": 4,
    "cargo_kg": 1000,
    "cargo_m3": 2.0,
    "battery_type": "Type 4 (500 SEU)",
    "max_seu": 500,
    "token_size": 2,
    "description": "Vertical take-off and landing (VerTOL) luxury craft. Takes off and lands vertically, flying at supersonic speeds."
  }
]
```

- [ ] **Step 4: Update `.gitignore` to allowlist `data/vehicles.json`**

Ensure `!data/vehicles.json` is added in `.gitignore`.

- [ ] **Step 5: Database migrations in `server/src/db.js`**

1. Add table `vehicle_templates`:
```sql
CREATE TABLE IF NOT EXISTS vehicle_templates (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Ground',
  cost INTEGER NOT NULL DEFAULT 5000,
  top_speed_kph INTEGER NOT NULL DEFAULT 100,
  top_speed_m_turn INTEGER NOT NULL DEFAULT 175,
  cruise_speed_kph INTEGER NOT NULL DEFAULT 60,
  accel INTEGER NOT NULL DEFAULT 60,
  decel INTEGER NOT NULL DEFAULT 40,
  turn_speed INTEGER NOT NULL DEFAULT 80,
  passengers INTEGER NOT NULL DEFAULT 4,
  cargo_kg INTEGER NOT NULL DEFAULT 150,
  cargo_m3 REAL NOT NULL DEFAULT 1.0,
  battery_type TEXT NOT NULL DEFAULT 'Type 2 (100 SEU)',
  max_seu INTEGER NOT NULL DEFAULT 100,
  token_size INTEGER NOT NULL DEFAULT 2,
  avatar_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

2. Add column migration for `tokens`:
```javascript
const tokenCols = db.prepare("PRAGMA table_info(tokens)").all().map(c => c.name);
if (!tokenCols.includes('vehicle_data')) {
  db.exec('ALTER TABLE tokens ADD COLUMN vehicle_data TEXT DEFAULT NULL');
}
```

- [ ] **Step 6: Implement `server/src/vehicles.js` and mount in `server/src/index.js`**

1. Create `server/src/vehicles.js`:
- Loads `data/vehicles.json` with fallback.
- `GET /api/vehicles`: Merges canonical with rows from `vehicle_templates`.
- `POST /api/vehicles`: Guarded by `requireGM`. Validates name and inputs. Inserts into `vehicle_templates`.
- `DELETE /api/vehicles/:id`: Guarded by `requireGM`. Deletes from `vehicle_templates`. Rejects canonical with 400.

2. In `server/src/index.js`:
```javascript
import { createVehiclesRouter } from './vehicles.js';
// ...
app.use('/api/vehicles', createVehiclesRouter(db, io));
```

- [ ] **Step 7: Update `server/src/maps.js` for `vehicle_data`**

In `formatToken`:
```javascript
vehicle_data: safeJsonParse(row.vehicle_data, null),
```

In `POST /api/tokens`:
- Insert `vehicle_data` (serialized to JSON string if object).

In `PUT /api/tokens/:id`:
- Update `vehicle_data`.

- [ ] **Step 8: Run tests to verify they pass**

Run: `docker exec sf-vtt-dev bash -c "cd server && npx vitest run test/vehicles.test.js"`
Expected: PASS.

- [ ] **Step 9: Run full server test suite**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: PASS (all server tests pass).

- [ ] **Step 10: Commit changes**

```bash
git add data/vehicles.json .gitignore server/src/db.js server/src/vehicles.js server/src/index.js server/src/maps.js server/test/vehicles.test.js
git commit -m "feat(vehicles): add canonical vehicles catalog, vehicle_templates table, and vehicles API"
```

---

### Task 2: Vehicle Deployment Modal (`DeployVehicleModal.vue`) & Tests

**Files:**
- Create: `client/src/components/DeployVehicleModal.vue`
- Create: `client/test/DeployVehicleModal.test.js`

**Interfaces:**
- Consumes: `GET /api/vehicles`, `POST /api/vehicles`, `DELETE /api/vehicles/:id`
- Produces: Emits `deploy` event with `{ vehicle_data, name, color, size, x, y, avatar_url }`

- [ ] **Step 1: Write failing tests in `client/test/DeployVehicleModal.test.js`**

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DeployVehicleModal from '../src/components/DeployVehicleModal.vue';

describe('DeployVehicleModal.vue', () => {
  const mockVehicles = [
    {
      id: 'ground_car',
      name: 'Ground Car',
      type: 'Ground',
      cost: 5000,
      top_speed_kph: 100,
      top_speed_m_turn: 175,
      accel: 60,
      decel: 40,
      turn_speed: 80,
      passengers: 6,
      cargo_kg: 150,
      max_seu: 100,
      battery_type: 'Type 2 (100 SEU)',
      token_size: 2,
      is_canonical: true,
      description: 'Standard wheeled car',
    },
    {
      id: 'hover_car',
      name: 'Hover Car',
      type: 'Hover',
      cost: 8000,
      top_speed_kph: 160,
      top_speed_m_turn: 250,
      accel: 80,
      decel: 40,
      turn_speed: 70,
      passengers: 6,
      cargo_kg: 100,
      max_seu: 100,
      battery_type: 'Type 2 (100 SEU)',
      token_size: 2,
      is_canonical: true,
      description: 'Skimmer vehicle',
    },
    {
      id: 'custom_buggy',
      name: 'Custom Buggy',
      type: 'Ground',
      cost: 4000,
      top_speed_kph: 80,
      top_speed_m_turn: 130,
      accel: 50,
      decel: 30,
      turn_speed: 60,
      passengers: 2,
      cargo_kg: 80,
      max_seu: 50,
      battery_type: 'Type 1 (50 SEU)',
      token_size: 1,
      is_canonical: false,
      description: 'Custom scout buggy',
    },
  ];

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockVehicles,
    });
  });

  it('renders modal with Standard Vehicles and Custom Vehicles tabs', async () => {
    const wrapper = mount(DeployVehicleModal, {
      props: {
        modelValue: true,
        isGm: true,
        defaultX: 10,
        defaultY: 10,
      },
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Deploy Vehicle');
    expect(wrapper.text()).toContain('Standard Vehicles');
    expect(wrapper.text()).toContain('Custom Vehicles');
  });

  it('displays canonical vehicles in standard tab and shows selected specs', async () => {
    const wrapper = mount(DeployVehicleModal, {
      props: {
        modelValue: true,
        isGm: true,
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(r => setTimeout(r, 10));

    expect(wrapper.text()).toContain('Ground Car');
    expect(wrapper.text()).toContain('Hover Car');

    // Select Ground Car
    await wrapper.find('select.vehicle-select').setValue('ground_car');
    expect(wrapper.text()).toContain('Top Speed: 100 kph (175 m/t)');
    expect(wrapper.text()).toContain('Passengers: 6');
    expect(wrapper.text()).toContain('Type 2 (100 SEU)');
  });

  it('emits deploy event with vehicle_data when form submitted', async () => {
    const wrapper = mount(DeployVehicleModal, {
      props: {
        modelValue: true,
        isGm: true,
        defaultX: 5,
        defaultY: 7,
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(r => setTimeout(r, 10));

    await wrapper.find('select.vehicle-select').setValue('ground_car');
    await wrapper.find('input.driver-input').setValue('Captain UPEX');

    await wrapper.find('form.deploy-form').trigger('submit.prevent');

    expect(wrapper.emitted('deploy')).toBeTruthy();
    const payload = wrapper.emitted('deploy')[0][0];
    expect(payload.name).toBe('Ground Car');
    expect(payload.size).toBe(2);
    expect(payload.x).toBe(5);
    expect(payload.y).toBe(7);
    expect(payload.vehicle_data).toBeDefined();
    expect(payload.vehicle_data.template_id).toBe('ground_car');
    expect(payload.vehicle_data.current_speed).toBe(0);
    expect(payload.vehicle_data.passengers).toBe('Captain UPEX');
  });

  it('allows creating and saving a custom vehicle in custom tab', async () => {
    const wrapper = mount(DeployVehicleModal, {
      props: {
        modelValue: true,
        isGm: true,
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.find('button.tab-custom').trigger('click');

    expect(wrapper.find('input.custom-name-input').exists()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/DeployVehicleModal.test.js"`
Expected: FAIL (file does not exist).

- [ ] **Step 3: Implement `client/src/components/DeployVehicleModal.vue`**

Create `client/src/components/DeployVehicleModal.vue`:
- Load vehicles on mount from `/api/vehicles`.
- Tabs: `Standard Vehicles` vs `Custom Vehicles`.
- In Standard tab: select canonical vehicle, view spec cards.
- In Custom tab: list existing custom templates with delete button, form to create new custom vehicle template.
- Common deployment options: Start X, Start Y, Ring Color, Driver/Crew notes, Cargo notes.
- Emit `deploy` with `{ name, color, size, x, y, avatar_url, vehicle_data }`.
- Style matching Star Frontiers dark sci-fi theme (`#00e5ff`, dark slate backgrounds).

- [ ] **Step 4: Run test to verify it passes**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/DeployVehicleModal.test.js"`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add client/src/components/DeployVehicleModal.vue client/test/DeployVehicleModal.test.js
git commit -m "feat(vehicles): add DeployVehicleModal with canonical vehicle picker and custom builder"
```

---

### Task 3: Tactical Vehicle HUD (`VehicleTokenHud.vue`), VTT Integration, & Tests

**Files:**
- Create: `client/src/components/VehicleTokenHud.vue`
- Create: `client/test/VehicleTokenHud.test.js`
- Modify: `client/src/components/VttCanvas.vue`
- Modify: `client/src/views/RpgVttView.vue`

**Interfaces:**
- Consumes: `selectedToken.vehicle_data`
- Produces: Emits `update:token` with updated `vehicle_data`, emits `roll-control`, emits `roll-damage`

- [ ] **Step 1: Write failing tests in `client/test/VehicleTokenHud.test.js`**

```javascript
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import VehicleTokenHud from '../src/components/VehicleTokenHud.vue';

describe('VehicleTokenHud.vue', () => {
  const sampleToken = {
    id: 101,
    name: 'Ground Car',
    color: '#ff9800',
    size: 2,
    x: 5,
    y: 5,
    vehicle_data: {
      template_id: 'ground_car',
      name: 'Ground Car',
      type: 'Ground',
      current_speed: 60,
      top_speed: 175,
      accel: 60,
      decel: 40,
      turn_speed: 80,
      current_seu: 90,
      max_seu: 100,
      battery_type: 'Type 2 (100 SEU)',
      damage_conditions: [],
      passengers: 'Driver: Ace',
      cargo_notes: 'Survey supplies',
      description: 'Standard wheeled car',
    },
  };

  it('renders vehicle tactical status, speedometer, and battery gauge', () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    expect(wrapper.text()).toContain('Ground Car');
    expect(wrapper.text()).toContain('60 m/t');
    expect(wrapper.text()).toContain('90 / 100 SEU');
  });

  it('accelerates speed when clicking + Accel button', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const accelBtn = wrapper.find('button.btn-accel');
    expect(accelBtn.exists()).toBe(true);
    await accelBtn.trigger('click');

    expect(wrapper.emitted('update:token')).toBeTruthy();
    const updated = wrapper.emitted('update:token')[0][0];
    // 60 + 60 = 120
    expect(updated.vehicle_data.current_speed).toBe(120);
  });

  it('decelerates speed when clicking - Decel button', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const decelBtn = wrapper.find('button.btn-decel');
    await decelBtn.trigger('click');

    expect(wrapper.emitted('update:token')).toBeTruthy();
    const updated = wrapper.emitted('update:token')[0][0];
    // 60 - 40 = 20
    expect(updated.vehicle_data.current_speed).toBe(20);
  });

  it('stops immediately when clicking Emergency Stop', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const stopBtn = wrapper.find('button.btn-stop');
    await stopBtn.trigger('click');

    expect(wrapper.emitted('update:token')).toBeTruthy();
    const updated = wrapper.emitted('update:token')[0][0];
    expect(updated.vehicle_data.current_speed).toBe(0);
  });

  it('deducts SEU when clicking quick battery chips', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const chip5 = wrapper.find('button.chip-seu-5');
    await chip5.trigger('click');

    expect(wrapper.emitted('update:token')).toBeTruthy();
    const updated = wrapper.emitted('update:token')[0][0];
    // 90 - 5 = 85
    expect(updated.vehicle_data.current_seu).toBe(85);
  });

  it('toggles damage conditions from Vehicle Damage Table', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const conditionBtn = wrapper.find('button.condition-turn-speed');
    await conditionBtn.trigger('click');

    expect(wrapper.emitted('update:token')).toBeTruthy();
    const updated = wrapper.emitted('update:token')[0][0];
    expect(updated.vehicle_data.damage_conditions).toContain('Turn Speed -15');
  });

  it('triggers control and damage dice action events', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const controlRollBtn = wrapper.find('button.btn-roll-control');
    await controlRollBtn.trigger('click');
    expect(wrapper.emitted('roll-control')).toBeTruthy();

    const damageRollBtn = wrapper.find('button.btn-roll-damage');
    await damageRollBtn.trigger('click');
    expect(wrapper.emitted('roll-damage')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/VehicleTokenHud.test.js"`
Expected: FAIL (file does not exist).

- [ ] **Step 3: Implement `client/src/components/VehicleTokenHud.vue`**

Create `client/src/components/VehicleTokenHud.vue`:
- Header with vehicle name, avatar circle, category badge, and close button.
- Tactical status bar:
  - Speedometer: `current_speed`, `top_speed`, `turn_speed`. Buttons `+ Accel`, `- Decel`, `Emergency Stop`.
  - Parabattery gauge: current/max SEU, chips `-1`, `-5`, `-10`, `Recharge`.
  - Vehicle Damage Table condition toggles: `Turn Speed -15`, `Accel -20`, `Top Speed -30`, `Steering Jammed`, `Decel -20/turn`, `Spin`, `🔥 Burning`, `Roll & Burn`.
  - Quick Roll buttons: Control Table check (`d100`), Vehicle Damage Table (`2d10 + damage`).
  - Driver / Passenger notes and Cargo notes.
- Read-only reference card displaying Alpha Dawn rulebook stats (top speed, cruise speed, accel, decel, pax, cargo, range, battery type).

- [ ] **Step 4: Update `VttCanvas.vue` to render speed badge on vehicle tokens**

In `client/src/components/VttCanvas.vue`:
- When drawing a token with `token.vehicle_data`:
  - If `token.vehicle_data.current_speed > 0`: Draw small pill badge with `${token.vehicle_data.current_speed} m/t`.
  - If `token.vehicle_data.damage_conditions.length > 0`: Draw indicator icon (`🔥` if burning, `⚠️` if damaged).

- [ ] **Step 5: Integrate into `RpgVttView.vue`**

In `client/src/views/RpgVttView.vue`:
1. Import `DeployVehicleModal.vue` and `VehicleTokenHud.vue`.
2. Add state `showDeployVehicleModal = ref(false)`.
3. Add button `🚗 Deploy Vehicle` in toolbar (next to Stock Adversaries) and in the token sidebar.
4. Mount `<DeployVehicleModal v-model="showDeployVehicleModal" @deploy="onDeployVehicle" ... />`.
5. In `onDeployVehicle`: Call `POST /api/tokens` with `vehicle_data` and add token to map.
6. Mount `<VehicleTokenHud v-if="selectedToken && selectedToken.vehicle_data" :token="selectedToken" @close="selectedTokenId = null" @update:token="onVehicleTokenUpdate" @roll-control="onVehicleRollControl" @roll-damage="onVehicleRollDamage" />`.
7. Handle dice roll integration to send rolls to shared roll log (`POST /api/rolls`).

- [ ] **Step 6: Run tests to verify they pass**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/VehicleTokenHud.test.js test/DeployVehicleModal.test.js"`
Expected: PASS.

- [ ] **Step 7: Run full client test suite and production build**

Run: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`
Expected: PASS.

- [ ] **Step 8: Run full server test suite**

Run: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
Expected: PASS.

- [ ] **Step 9: Commit changes**

```bash
git add client/src/components/VehicleTokenHud.vue client/test/VehicleTokenHud.test.js client/src/components/VttCanvas.vue client/src/views/RpgVttView.vue
git commit -m "feat(vehicles): integrate VehicleTokenHud and VttCanvas vehicle overlays into RPG VTT"
```

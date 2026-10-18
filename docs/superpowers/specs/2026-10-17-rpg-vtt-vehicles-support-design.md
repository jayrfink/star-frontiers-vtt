# Design Spec: RPG VTT Vehicle Support (Alpha Dawn Expanded Rules)

- **Date**: 2026-10-17
- **Feature**: Tactical Vehicle Tokens, Alpha Dawn Vehicle Roster, Custom Vehicles, and Vehicle HUD
- **Status**: Draft

---

## 1. Overview & Objectives

In *Star Frontiers: Alpha Dawn Expanded Game Rules* (pp. 33–41, 55), vehicles play a crucial role in planetary exploration, surface transport, and tactical combat. While characters and adversaries currently have rich token support and dedicated HUDs in the RPG VTT, vehicles have been absent.

### Goals
1. **Canonical Alpha Dawn Roster**: Preload all 10 standard ground, hover, and flying vehicles from the rulebook with accurate statistics (top speed in kph and m/turn, cruise speed, acceleration, deceleration, turn speed, passenger and cargo capacities, parabattery type, and token dimensions).
2. **Custom Vehicles**: Enable GMs to create, customize, and save custom vehicle templates to SQLite (`vehicle_templates`) with avatar images, custom dimensions, and speed profiles.
3. **Vehicle Deployment Modal (`DeployVehicleModal.vue`)**: Dedicated modal in the RPG VTT allowing players and GMs to select standard or custom vehicles, configure spawn location, ring color, and crew notes, and place the vehicle token on the map.
4. **Tactical Vehicle HUD (`VehicleTokenHud.vue`)**: An interactive HUD drawer that opens when clicking a vehicle token on the tactical map, offering live speed adjustment (`+ Accel`, `- Decel`, `Emergency Stop`), parabattery SEU depletion, Vehicle Damage Table condition toggles, passenger/cargo notes, and quick dice action rollers.
5. **Real-time Map Integration**: Vehicle tokens rendered with proper grid sizes (1x1, 2x2, 2x3), speed badge overlays, and synchronized across all clients via Socket.io.
6. **Automated Test Coverage**: Complete server and client unit test suites verifying canonical catalog integrity, custom template persistence, token deployment, and interactive HUD controls.

---

## 2. Canonical Vehicle Roster & Data Models

### 2.1 Canonical Vehicles (`data/vehicles.json`)
Ten vehicles described in the *Alpha Dawn Expanded Game Rules* (pp. 33, 37):

1. **Ground Car**: Cost 5,000 Cr, Rental 50 Cr + 50 Cr/day, Type: Ground, Top Speed: 100 kph (175 m/t), Cruise: 60 kph (100 m/t), Accel: 60 m/t, Decel: 40 m/t, Turn Speed: 80 m/t, Passengers: 6, Cargo: 150 kg (1 m³), Battery: Type 2 (100 SEU), Size: 2x2.
2. **Ground Transport**: Cost 15,000 Cr, Rental 75 Cr + 100 Cr/day, Type: Ground, Top Speed: 75 kph (125 m/t), Cruise: 60 kph (100 m/t), Accel: 40 m/t, Decel: 30 m/t, Turn Speed: 50 m/t, Passengers: 3, Cargo: 10,000 kg (30 m³), Battery: Type 3 (200 SEU), Size: 2x3.
3. **Ground Cycle**: Cost 2,000 Cr, Rental 25 Cr + 25 Cr/day, Type: Ground, Top Speed: 120 kph (200 m/t), Cruise: 60 kph (100 m/t), Accel: 100 m/t, Decel: 40 m/t, Turn Speed: 100 m/t, Passengers: 2, Cargo: 20 kg (0.5 m³), Battery: Type 1 (50 SEU), Size: 1x1.
4. **Hover Car (Skimmer)**: Cost 8,000 Cr, Rental 50 Cr + 75 Cr/day, Type: Hover, Top Speed: 160 kph (250 m/t), Cruise: 60 kph (100 m/t), Accel: 80 m/t, Decel: 40 m/t, Turn Speed: 70 m/t, Passengers: 6, Cargo: 100 kg (1 m³), Battery: Type 2 (100 SEU), Size: 2x2.
5. **Hover Transport**: Cost 20,000 Cr, Rental 75 Cr + 150 Cr/day, Type: Hover, Top Speed: 150 kph (250 m/t), Cruise: 90 kph (150 m/t), Accel: 60 m/t, Decel: 30 m/t, Turn Speed: 40 m/t, Passengers: 3, Cargo: 10,000 kg (35 m³), Battery: Type 3 (200 SEU), Size: 2x3.
6. **Hover Cycle**: Cost 2,000 Cr, Rental 25 Cr + 25 Cr/day, Type: Hover, Top Speed: 100 kph (175 m/t), Cruise: 80 kph (125 m/t), Accel: 100 m/t, Decel: 40 m/t, Turn Speed: 90 m/t, Passengers: 2, Cargo: 20 kg (0.5 m³), Battery: Type 1 (50 SEU), Size: 1x1.
7. **Explorer**: Cost 20,000 Cr, Rental 75 Cr + 200 Cr/day, Type: Ground / Amphibious, Top Speed: 90 kph (150 m/t), Cruise: 50 kph (80 m/t), Accel: 60 m/t, Decel: 40 m/t, Turn Speed: 100 m/t, Passengers: 6, Cargo: 2,000 kg (6 m³), Battery: Type 3 (200 SEU), Size: 2x2. Air-tight, retractable water rudder.
8. **Glijet**: Cost 3,000 Cr, Rental 75 Cr + 50 Cr/day, Type: Flying, Top Speed: 100 kph (175 m/t), Cruise: 30 kph (50 m/t), Accel: 100 m/t, Decel: 100 m/t, Turn Speed: N/A, Passengers: 1, Cargo: 16 kg (0.1 m³), Power: Chemical Rocket Pack (2 kg), Size: 1x1.
9. **Jetcopter**: Cost 40,000 Cr, Rental 100 Cr + 80 Cr/day, Type: Flying, Top Speed: 350 kph (600 m/t), Cruise: 50 kph (80 m/t), Accel: 100 m/t, Decel: 100 m/t, Turn Speed: N/A, Passengers: 4, Cargo: 500 kg (5 m³), Battery: Type 4 (500 SEU), Altitude Rate: 20 m/t, Size: 2x2.
10. **Aircar (VerTOL)**: Cost 50,000 Cr, Rental 100 Cr + 100 Cr/day, Type: Flying, Top Speed: 900 kph (1500 m/t), Cruise: 400 kph (650 m/t), NOE Speed: 100 kph (175 m/t), Accel: 100 m/t, Decel: 100 m/t, Turn Speed: N/A, Passengers: 4, Cargo: 1,000 kg (2 m³), Battery: Type 4 (500 SEU), Size: 2x2.

### 2.2 Database Schema (`vehicle_templates`)
```sql
CREATE TABLE IF NOT EXISTS vehicle_templates (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Ground' CHECK(type IN ('Ground', 'Hover', 'Flying')),
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

### 2.3 Token Live Tactical State (`tokens.vehicle_data`)
Tokens deployed as vehicles store their tactical stats inside `tokens.vehicle_data` (JSON text in SQLite):
```json
{
  "template_id": "ground_car",
  "is_custom": false,
  "name": "Ground Car",
  "type": "Ground",
  "current_speed": 60,
  "top_speed": 175,
  "cruise_speed": 100,
  "turn_speed": 80,
  "accel": 60,
  "decel": 40,
  "current_seu": 95,
  "max_seu": 100,
  "battery_type": "Type 2 (100 SEU)",
  "damage_conditions": [
    "Turn Speed -15"
  ],
  "passengers": "Driver: Captain UPEX, Passenger: Wilf",
  "cargo_notes": "100kg survey equipment",
  "description": "Wheeled ground transport"
}
```

---

## 3. Backend Architecture & Endpoints

### 3.1 Route Registration (`server/src/vehicles.js`)
- `GET /api/vehicles`: Returns list of all vehicles (canonical from `data/vehicles.json` with `is_canonical: true` + custom templates from `vehicle_templates` with `is_canonical: false`).
- `POST /api/vehicles`: Requires GM authentication (`requireGM`). Creates custom vehicle template in `vehicle_templates`.
- `DELETE /api/vehicles/:id`: Requires GM authentication. Deletes custom template from `vehicle_templates`. Returns 400 if attempting to delete canonical vehicle.

### 3.2 Token Extension (`server/src/maps.js`)
- In `server/src/db.js`, add column `vehicle_data TEXT DEFAULT NULL` to `tokens` table via schema migration if not exists.
- In `formatToken(row, db)`: Parses `vehicle_data` as JSON object if non-empty, exposed on token as `token.vehicle_data`.
- `POST /api/tokens` & `PUT /api/tokens/:id`: Support `vehicle_data` payload and emit `token:created` / `token:updated` via Socket.io.

---

## 4. Frontend UI Architecture

### 4.1 Deployment Modal (`client/src/components/DeployVehicleModal.vue`)
- Opened from `RpgVttView.vue` toolbar via button: `🚗 Deploy Vehicle` (visible to GM and players).
- **Tab 1: Standard Vehicles (Alpha Dawn)**:
  - Card list of canonical vehicles with icons, stats summary, and details preview.
- **Tab 2: Custom Vehicles**:
  - List of saved custom vehicle templates with option to delete.
  - Builder form: Name, Type (`Ground`, `Hover`, `Flying`), Speeds, Passenger capacity, Cargo limits, Battery Type, Token Size (`1x1`, `2x2`, `2x3`), Token Avatar Image (via `ImageBrowserModal`), and Description.
  - "Save as Reusable Template" checkbox.
- **Spawn Controls**:
  - Ring Color picker.
  - Coordinates: Start X, Start Y (or center of current map viewport).
  - Driver / Crew / Cargo notes.
  - Submit button: `Deploy Vehicle to Map`. Calls `POST /api/tokens` with populated `vehicle_data`.

### 4.2 Tactical Vehicle HUD (`client/src/components/VehicleTokenHud.vue`)
Mounted in `RpgVttView.vue` whenever `selectedToken && selectedToken.vehicle_data`:
- **Header**: Vehicle Name, Type Badge (`Ground` / `Hover` / `Flying`), Token Ring Avatar, Close button (`✕`).
- **Tactical Speedometer**:
  - Displays `Current Speed` in meters/turn and kph conversion (`m/turn * 0.6 = kph`).
  - Buttons:
    - `+ Accel (+${accel} m/t)`: Adds vehicle's acceleration rate up to `top_speed`.
    - `- Decel (-${decel} m/t)`: Reduces speed by deceleration rate down to 0.
    - `Emergency Stop`: Halts vehicle immediately (sets speed to 0).
    - Direct numeric input for custom tactical speeds.
- **Parabattery Energy Gauge**:
  - Displays `current_seu / max_seu` with colored meter bar.
  - Quick delta chips: `-1 SEU`, `-5 SEU`, `-10 SEU`, `Full Recharge`.
- **Vehicle Damage Table Flags (Alpha Dawn Expanded p. 37)**:
  - Interactive condition pills:
    - `Turn Speed -15`
    - `Accel -20`
    - `Top Speed -30`
    - `Steering Jammed (Straight)`
    - `Steering Jammed (Left)`
    - `Steering Jammed (Right)`
    - `Decel -20/turn`
    - `Spin`
    - `🔥 Vehicle Burning`
    - `💥 Roll / Crash`
- **Quick Action Dice Rolls**:
  - `🎲 Control Table Check`: Rolls percentile dice (d100) and displays result against driver Reaction Speed in the shared dice log.
  - `💥 Vehicle Damage Roll`: Rolls 2d10 + attack damage dice and evaluates against the Vehicle Damage Table.
- **Crew & Cargo Notes**:
  - In-place editable driver, passenger, and cargo text fields.
- **Read-Only Alpha Dawn Reference Card**:
  - Displays canonical specs: Top Speed, Cruise Speed, Accel, Decel, Turn Speed, Passenger count, Cargo capacity, Battery Type, and Range.

### 4.3 Tactical Map Canvas (`client/src/components/VttCanvas.vue`)
- Renders vehicle tokens at their specified size (`1x1`, `2x2`, `2x3`).
- Overlays a compact status badge showing current speed (e.g. `60 m/t`) and status icon (`🔥` burning, `⚠️` control penalty) directly on the token ring.

---

## 5. Testing & Verification

1. **`server/test/vehicles.test.js`**:
   - `GET /api/vehicles` returns 200 and all 10 canonical Alpha Dawn vehicles.
   - Schema validation for all attributes (speeds, passenger, cargo, battery, size).
   - `POST /api/vehicles` creates custom vehicle template; rejects non-GM with 403; validates numerical bounds.
   - `DELETE /api/vehicles/:id` deletes custom template; rejects canonical vehicle deletion with 400; rejects non-GM with 403.
   - `POST /api/tokens` with `vehicle_data` spawns vehicle token and emits `token:created`.
   - `PUT /api/tokens/:id` updates `vehicle_data` and emits `token:updated`.
2. **`client/test/DeployVehicleModal.test.js`**:
   - Renders 10 standard Alpha Dawn vehicles.
   - Tab switching between standard vehicles and custom vehicle builder.
   - Custom vehicle creation and deployment event emission.
3. **`client/test/VehicleTokenHud.test.js`**:
   - Mounts for vehicle token.
   - Speed controls (`+ Accel`, `- Decel`, `Emergency Stop`).
   - Battery gauge and SEU chips.
   - Condition toggles (*Turn Speed -15*, *Steering Jammed*, *Burning*).
   - Action roll dispatch for Control Table and Damage Table.
4. **Containerized Suite Verification**:
   - Server: `docker exec sf-vtt-dev bash -c "cd server && npm test"`
   - Client: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/VehicleTokenHud.test.js test/DeployVehicleModal.test.js"`
   - Full suite & build: `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`

# Star Frontiers VTT — Knight Hawks Ship Classes & Armament/Defense Expansion Design Spec

## Goal
Expand `ShipSheetsView.vue` with official Knight Hawks vessel class presets (Fighter, Assault Scout, Corvette, Frigate, Destroyer, Light Cruiser, Heavy Cruiser, Assault Carrier, Battleship, Small Freighter, Medium Freighter, Heavy Freighter, Space Station), auto-populating default stats, weapons, and defenses while supporting full customization.

## Scope & Components

### 1. Ship Class Presets Catalog (`client/src/constants/shipPresets.js`)
Create a catalog module defining all 13 standard vessel classes with official stats:
- **Fighter** (Hull 8, ADF 5, MR 5, DCR 30)
- **Assault Scout** (Hull 15, ADF 5, MR 4, DCR 35)
- **Corvette** (Hull 20, ADF 4, MR 3, DCR 42)
- **Frigate** (Hull 40, ADF 3, MR 3, DCR 50)
- **Destroyer** (Hull 50, ADF 3, MR 2, DCR 60)
- **Light Cruiser** (Hull 70, ADF 2, MR 2, DCR 70)
- **Heavy Cruiser** (Hull 80, ADF 1, MR 1, DCR 75)
- **Assault Carrier** (Hull 75, ADF 2, MR 1, DCR 75)
- **Battleship** (Hull 120, ADF 2, MR 2, DCR 100)
- **Small Freighter** (Hull 25, ADF 2, MR 2, DCR 35)
- **Medium Freighter** (Hull 50, ADF 1, MR 1, DCR 50)
- **Heavy Freighter** (Hull 75, ADF 1, MR 1, DCR 65)
- **Space Station** (Hull 50, ADF 0, MR 0, DCR 80)
- **Custom Ship** (Blank editable template)

Each preset automatically fills:
- `hull_points`, `current_hp`
- `adf`, `mr`, `dcr`
- `weapons`: array of `{ id, type, damage, range, ammo_max, ammo_current, status }`
- `defenses`: object containing `{ reflective_hull: boolean, masking_screens_max: number, masking_screens_current: number, icm_max: number, icm_current: number, stasis_screen: boolean, stealth_screen: boolean }`

### 2. Frontend UI Enhancements (`ShipSheetsView.vue`)
- **Class Selector**: Dropdown when creating or editing a ship to pick a preset class.
- **Weapon System Manager**: Add/remove/edit weapons, toggle weapon status (`Online` / `Damaged` / `Offline`), and quick **Fire Weapon** button for limited supply weapons (Torpedoes, Assault Rockets, Rocket Batteries) that decrements ammo count and updates in real time via Socket.io.
- **Defensive Systems Manager**: Toggles for Reflective Hull, Stasis Screen, Stealth Screen, and quick **Deploy Masking Screen** / **Launch ICM** buttons that decrement remaining screen/missile charges and update live over Socket.io.

## Verification
- Verify preset loading in UI populates correct stats for all 13 vessel types.
- Verify real-time socket events sync weapon ammo, status, and defensive screen charges live between connected browsers.
- Verify client build succeeds with zero errors.

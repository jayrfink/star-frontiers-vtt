# Freeform Damage/Heal Delta, Full Reset Buttons & Character SEU Tracker Design

## 1. Overview
This specification details the design for three interconnected player usability enhancements:
1. **Freeform Damage & Healing Input:** A `+/-` numerical delta input beside the existing `[-5] [-1] [+1] [+5]` stepper buttons on both Character Sheets (Stamina) and Ship Sheets (Hull Points).
2. **Full Reset Buttons:** One-click recovery buttons:
   - **Character Sheet:** Full Rest restoring Stamina (STA) to Max STA and Standard Energy Units (SEU) to Max SEU.
   - **Ship Sheet:** Full Repair & Resupply restoring Hull Points (HP) to Max HP, Damage Control Rating (DCR) to maximum, and all limited-ammo weapons to their maximum ammunition capacity.
3. **Character SEU Energy Pool Tracker (Approach A):** A dedicated energy tracker card on the Character Sheet for managing Standard Energy Units (SEU) used by energy weapons, defensive screens, and electronic gear, synchronized in real-time with map tokens.

---

## 2. Freeform Damage & Healing Delta

### 2.1 Character Sheet Stamina Tracker (`CharacterSheetsView.vue`)
- Located in `.stamina-controls` alongside the existing stepper buttons:
  ```html
  <div class="stamina-controls">
    <div class="stepper-group">
      <button class="btn-sta btn-sub" @click="adjustStamina(-5)">-5</button>
      <button class="btn-sta btn-sub" @click="adjustStamina(-1)">-1</button>
      <button class="btn-sta btn-add" @click="adjustStamina(+1)">+1</button>
      <button class="btn-sta btn-add" @click="adjustStamina(+5)">+5</button>
    </div>
    <div class="freeform-delta-group">
      <input
        type="number"
        v-model.number="staminaDelta"
        placeholder="Amt"
        min="1"
        class="input-delta"
        @keydown.enter.prevent="applyStaminaDamage"
      />
      <button class="btn-delta btn-sub" @click="applyStaminaDamage" title="Subtract damage from Stamina">
        - Dmg
      </button>
      <button class="btn-delta btn-add" @click="applyStaminaHeal" title="Add healing to Stamina">
        + Heal
      </button>
    </div>
  </div>
  ```
- **Behavior:**
  - `applyStaminaDamage()`: Validates `staminaDelta > 0`. Calculates `Math.max(0, current_stamina - staminaDelta)`.
  - `applyStaminaHeal()`: Validates `staminaDelta > 0`. Calculates `Math.min(max_stamina, current_stamina + staminaDelta)`.
  - Automatically persists change via `updateCharacter()` and resets input field to empty.

### 2.2 Ship Sheet Hull Points Tracker (`ShipSheetsView.vue`)
- Located in `.hull-controls` alongside the existing stepper buttons:
  ```html
  <div class="hull-controls">
    <div class="stepper-group">
      <button class="btn-hp btn-sub" @click="adjustHullPoints(-5)">-5</button>
      <button class="btn-hp btn-sub" @click="adjustHullPoints(-1)">-1</button>
      <button class="btn-hp btn-add" @click="adjustHullPoints(+1)">+1</button>
      <button class="btn-hp btn-add" @click="adjustHullPoints(+5)">+5</button>
    </div>
    <div class="freeform-delta-group">
      <input
        type="number"
        v-model.number="hullDelta"
        placeholder="Amt"
        min="1"
        class="input-delta"
        @keydown.enter.prevent="applyHullDamage"
      />
      <button class="btn-delta btn-sub" @click="applyHullDamage" title="Subtract damage from Hull Points">
        - Dmg
      </button>
      <button class="btn-delta btn-add" @click="applyHullHeal" title="Repair Hull Points">
        + Heal
      </button>
    </div>
  </div>
  ```
- **Behavior:**
  - `applyHullDamage()`: Validates `hullDelta > 0`. Calculates `Math.max(0, current_hull_points - hullDelta)`.
  - `applyHullHeal()`: Validates `hullDelta > 0`. Calculates `Math.min(max_hull_points, current_hull_points + hullDelta)`.
  - Automatically persists change via `updateShip()` and resets input field to empty.

---

## 3. Full Reset Buttons

### 3.1 Character Sheet: Full Rest (`CharacterSheetsView.vue`)
- **Placement:** In the Stamina Tracker header next to the values, styled with a distinct rest/refresh icon:
  ```html
  <button class="btn-action-reset" @click="confirmResetCharacter" title="Full Rest: Restore STA and SEU to maximum">
    🔄 Full Rest
  </button>
  ```
- **Actions:**
  1. `selectedChar.current_stamina = selectedChar.max_stamina`
  2. `selectedChar.current_seu = selectedChar.max_seu`
  3. Triggers `updateCharacter()`.
- **Feedback:** Toast or temporary status text confirming `"Stamina & SEU restored to maximum"`.

### 3.2 Ship Sheet: Full Resupply & Repair (`ShipSheetsView.vue`)
- **Placement:** In the Hull Points header or Flight & Tactical Stats header:
  ```html
  <button class="btn-action-reset" @click="confirmResetShip" title="Full Repair: Restore HP, DCR, and Ordnance Ammo to maximum">
    🔄 Full Repair &amp; Resupply
  </button>
  ```
- **Actions:**
  1. **Hull Points:** `current_hull_points = max_hull_points` (or `current_hp = hull_points`).
  2. **DCR:** If ship type corresponds to a standard preset in `shipPresets.js`, resets `dcr` to `preset.dcr`. If custom ship with no preset match, retains or resets to base.
  3. **Weapons & Ammo:** For every weapon in `selectedShip.weapons`, if `isLimitedAmmoWeapon(w)` or `w.ammo_max > 0`, sets `w.ammo_current = w.ammo_max`.
  4. Triggers `updateShip()`.
- **Confirmation:** Shows a modal or confirmation check to prevent accidental clicks during space combat.

---

## 4. SEU Energy Pool Tracker (Approach A)

### 4.1 Data Model & Persistence
- **Database Schema (`server/src/db.js`):**
  - Add columns to `character_sheets`:
    - `max_seu INTEGER NOT NULL DEFAULT 50`
    - `current_seu INTEGER NOT NULL DEFAULT 50`
  - Automated migration in `migrate(db)`: checks `PRAGMA table_info(character_sheets)` and executes `ALTER TABLE character_sheets ADD COLUMN ...` if not present.
- **REST Endpoints (`server/src/sheets.js`):**
  - `POST /api/characters`: Accepts and persists `max_seu` and `current_seu` (sanitized integers, defaults to 50).
  - `PUT /api/characters/:id`: Accepts and updates `max_seu` and `current_seu`. Clamps `current_seu` between 0 and `max_seu`.
  - **Cascade to Tokens:** When character sheet is updated with a new `current_seu`, updates `tokens.seu_current` for any token where `character_id = character.id`, and emits socket event `token:updated`.

### 4.2 Character Sheet UI (`CharacterSheetsView.vue`)
- Placed directly beneath the **Stamina Tracker** section:
  ```html
  <section class="seu-section card">
    <div class="seu-header">
      <h4>⚡ SEU Energy Pool</h4>
      <div class="seu-values">
        <span class="current">{{ selectedChar.current_seu ?? 50 }}</span> /
        <input
          type="number"
          v-model.number="selectedChar.max_seu"
          @change="onMaxSeuChange"
          class="input-max-seu"
          min="0"
        /> Max SEU
      </div>
    </div>
    <div class="seu-bar-bg">
      <div
        class="seu-bar-fill"
        :style="{ width: seuPercentage + '%', backgroundColor: seuColor }"
      ></div>
    </div>
    <div class="seu-controls">
      <div class="stepper-group">
        <button class="btn-seu btn-sub" @click="adjustSeu(-1)" title="Fire Laser Pistol / Stunner (-1 SEU)">-1</button>
        <button class="btn-seu btn-sub" @click="adjustSeu(-2)" title="Fire Laser Rifle (-2 SEU)">-2</button>
        <button class="btn-seu btn-sub" @click="adjustSeu(-5)" title="Heavy Laser / Screen Turn (-5 SEU)">-5</button>
        <button class="btn-seu btn-add" @click="adjustSeu(+5)" title="Recharge / Swap Power (+5 SEU)">+5</button>
      </div>
      <div class="freeform-delta-group">
        <input
          type="number"
          v-model.number="seuDelta"
          placeholder="Amt"
          min="1"
          class="input-delta"
          @keydown.enter.prevent="applySeuBurn"
        />
        <button class="btn-delta btn-sub" @click="applySeuBurn" title="Burn / Spend SEU">
          - Spend
        </button>
        <button class="btn-delta btn-add" @click="applySeuRecharge" title="Recharge / Add SEU">
          + Charge
        </button>
      </div>
    </div>
  </section>
  ```
- **Styling:**
  - Color palette: Electric Cyan (`#00e5ff`) graduating to Amber (`#ffb700`) and Red (`#ff5252`) when below 25% charge.
  - Matches the layout, border-radius, and typography of the Stamina and Hull Points tracking cards.

---

## 5. Verification Plan

1. **Unit Tests (`client/test/CharacterSheetsView.test.js` & `client/test/ShipSheetsView.test.js`):**
   - Freeform delta inputs validate numbers and correctly calculate damage/healing bounds.
   - Character Sheet Full Rest restores `current_stamina` and `current_seu` to maximums.
   - Ship Sheet Full Repair restores `current_hull_points`, `dcr`, and resets all weapon `ammo_current` to `ammo_max`.
   - Character SEU tracker renders, burns, and recharges properly.
2. **Server Tests (`server/test/sheets.test.js`):**
   - `character_sheets` table stores and updates `max_seu` and `current_seu`.
   - Updating character SEU cascades to associated `tokens.seu_current`.
3. **End-to-End Suite:**
   - Full Vitest client suite (467+ tests).
   - Full Vitest server suite (225+ tests).
   - Clean production asset build via `npm run build`.

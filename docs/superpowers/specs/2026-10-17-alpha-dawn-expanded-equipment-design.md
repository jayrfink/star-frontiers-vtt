# Design Spec: Alpha Dawn Expanded Equipment & Weapons Inventory Expansion

- **Date**: 2026-10-17
- **Feature**: Full Alpha Dawn Expanded Rules Equipment & Weapons Catalog with Category Filtering
- **Status**: Draft

---

## 1. Overview & Objectives

In Star Frontiers, equipment and weaponry are central to character capability, survival, and tactical combat. The current `data/inventory_items.json` catalog contains only 42 basic items, omitting dozens of canonical weapons, ammunition types, defense screens, specialist toolkits, medical drugs/supplies, survival gear, and portable power/computer units described in the *Star Frontiers: Alpha Dawn Expanded Game Rules* (pp. 31, 38, 48–56).

### Goals
1. **Complete Rulebook Coverage**: Expand `data/inventory_items.json` from 42 to 100+ items, transcribing exact rulebook statistics (Cost in Cr, Weight in kg, damage dice, ammunition usage, ranges, defense ratings, and operational notes).
2. **Category Classification**: Standardize all items into 7 canonical categories:
   - `Weapon`
   - `Ammunition`
   - `Defense` (standardizing existing `Armor` items to `Defense`, while maintaining backwards compatibility)
   - `Toolkit`
   - `Medical`
   - `Gear` (standardizing miscellaneous `Equipment` items to `Gear`)
   - `Power`
3. **Frontend Filtering in Character Sheet Modal**: In [CharacterSheetsView.vue](file:///Users/jrf/star-frontiers-vtt/client/src/views/CharacterSheetsView.vue), provide intuitive category filter tabs (`All`, `Weapon`, `Ammunition`, `Defense`, `Toolkit`, `Medical`, `Gear`, `Power`) with live item count badges directly above the search bar in the Equipment Catalog modal.
4. **Preserve Compatibility & Consistency**: Ensure existing character sheets with inventory entries continue to render seamlessly. Ensure search query filtering works across name, category, and capabilities within whatever category tab is selected.
5. **Rigorous Automated Testing**: Provide dedicated server-side schema and item tests (`server/test/equipment.test.js`) and client-side modal filtering tests (`client/test/CharacterSheetsView.test.js`).

---

## 2. Canonical Data Model (`data/inventory_items.json`)

### Schema
Each item in `data/inventory_items.json` strictly adheres to:
```json
{
  "name": "Heavy Laser",
  "category": "Weapon",
  "cost": 1000,
  "weight": 15,
  "capabilities": "Damage: 1d10 to 30d10 (dial: 1-30 SEU), Range: 300m, Ammo: 100 SEU Power Backpack or Generator"
}
```

- `name` (string, required): Canonical item name matching Alpha Dawn Expanded Rules.
- `category` (string, required): One of `"Weapon"`, `"Ammunition"`, `"Defense"`, `"Toolkit"`, `"Medical"`, `"Gear"`, `"Power"`.
- `cost` (number, required): Purchase price in Credits (Cr) as specified in the rulebook table.
- `weight` (number, required): Weight in kilograms (kg) as specified in the rulebook table (0 or fractional for negligible/small items).
- `capabilities` (string, required): Compact rule-accurate details (Damage, Range, Rate of Fire, SEU/Ammo per shot, Defense rating, charges, duration, or skill prerequisite).

---

## 3. Catalog Inventory Roster

### 3.1 Weapons (`Weapon`)
1. **Laser Pistol**: Cost: 500 Cr, Weight: 1 kg, Capabilities: "Damage: 1d10 to 10d10 (dial: 1-10 SEU), Range: 50m, Ammo: 20 SEU clip"
2. **Laser Rifle**: Cost: 800 Cr, Weight: 3 kg, Capabilities: "Damage: 1d10 to 20d10 (dial: 1-20 SEU), Range: 150m, Ammo: 20 SEU clip or Backpack"
3. **Heavy Laser**: Cost: 1000 Cr, Weight: 15 kg, Capabilities: "Damage: 1d10 to 30d10 (dial: 1-30 SEU), Range: 300m, Ammo: Power Backpack or Generator, Tripod mounted"
4. **Electrostunner**: Cost: 400 Cr, Weight: 1 kg, Capabilities: "Damage: Stun (d100 vs STA), Range: 30m, Ammo: 20 SEU clip (2 SEU/shot)"
5. **Sonic Stunner**: Cost: 300 Cr, Weight: 1 kg, Capabilities: "Damage: Stun cone (d100 vs STA), Range: 10m, Ammo: 20 SEU clip (2 SEU/shot)"
6. **Sonic Disruptor**: Cost: 600 Cr, Weight: 2 kg, Capabilities: "Damage: 3d10 disrupts molecular bonds, Range: 30m, Ammo: 20 SEU clip (3 SEU/shot)"
7. **Sonic Devastator**: Cost: 1200 Cr, Weight: 10 kg, Capabilities: "Damage: 5d10 wide-beam disruption, Range: 50m, Ammo: Power Backpack (5 SEU/shot)"
8. **Automatic Pistol**: Cost: 50 Cr, Weight: 1 kg, Capabilities: "Damage: 1d10, Range: 50m, Ammo: 20-bullet clip, Rate: 1 or burst"
9. **Automatic Rifle**: Cost: 120 Cr, Weight: 3 kg, Capabilities: "Damage: 1d10, Range: 150m, Ammo: 20-bullet clip, Rate: 1 or burst"
10. **Machine Gun**: Cost: 250 Cr, Weight: 10 kg, Capabilities: "Damage: 2d10 (burst/suppressive), Range: 200m, Ammo: 100-bullet belt, Tripod mounted"
11. **Needler Pistol**: Cost: 150 Cr, Weight: 1 kg, Capabilities: "Damage: 1d10 plus poison/sleep/anesthetic, Range: 30m, Ammo: 10-needle clip"
12. **Needler Rifle**: Cost: 250 Cr, Weight: 3 kg, Capabilities: "Damage: 1d10 plus poison/sleep/anesthetic, Range: 100m, Ammo: 20-needle clip"
13. **Gyrojet Pistol**: Cost: 200 Cr, Weight: 1 kg, Capabilities: "Damage: 1d10, Range: 50m, Ammo: 10-rocket jetclip"
14. **Gyrojet Rifle**: Cost: 300 Cr, Weight: 3 kg, Capabilities: "Damage: 1d10, Range: 150m, Ammo: 10-rocket jetclip"
15. **Grenade Rifle**: Cost: 400 Cr, Weight: 4 kg, Capabilities: "Fires launched grenades, Range: 150m, Ammo: 6-grenade internal magazine"
16. **Grenade Mortar**: Cost: 600 Cr, Weight: 12 kg, Capabilities: "Fires launched grenades indirectly, Range: 500m, Ammo: 1 grenade per round, Crew: 2"
17. **Rocket Launcher**: Cost: 500 Cr, Weight: 8 kg, Capabilities: "Fires anti-vehicle/personnel rockets, Range: 300m, Ammo: 1 rocket"
18. **Recoilless Rifle**: Cost: 750 Cr, Weight: 15 kg, Capabilities: "Damage: 6d10, Range: 400m, Ammo: 1 recoilless shell per shot, Crew: 2"
19. **Frag Grenade**: Cost: 30 Cr, Weight: 0.5 kg, Capabilities: "Damage: 5d10 shrapnel, Blast Radius: 5m, Throw: 30m"
20. **Doze Grenade**: Cost: 40 Cr, Weight: 0.5 kg, Capabilities: "Damage: Sleep gas (d100 vs STA), Blast Radius: 5m, Duration: 5 turns"
21. **Smoke Grenade**: Cost: 10 Cr, Weight: 0.5 kg, Capabilities: "Thick obscuring smoke, Radius: 10m, Duration: 10 turns"
22. **Tangler Grenade**: Cost: 50 Cr, Weight: 0.5 kg, Capabilities: "Traps victims in sticky synthetic fibers (DEX/STR check to escape), Radius: 3m"
23. **Incendiary Grenade**: Cost: 45 Cr, Weight: 0.5 kg, Capabilities: "Damage: 3d10 burn + fire damage, Radius: 3m"
24. **Poison Grenade**: Cost: 60 Cr, Weight: 0.5 kg, Capabilities: "Damage: Toxic gas (d100 vs STA or lethal poison), Radius: 5m"
25. **Vibroknife**: Cost: 30 Cr, Weight: 1 kg, Capabilities: "Damage: 1d10, Melee, Powered: 1 SEU per 10 minutes of use"
26. **Stun Baton**: Cost: 40 Cr, Weight: 1 kg, Capabilities: "Damage: 1d10 Stun, Melee, Powered: 1 SEU per hit"
27. **Electric Sword**: Cost: 100 Cr, Weight: 2 kg, Capabilities: "Damage: 2d10 (1d10 physical + 1d10 shock), Melee, Powered: 2 SEU per hit"
28. **Sonic Knife**: Cost: 50 Cr, Weight: 1 kg, Capabilities: "Damage: 1d10+2, Melee, High-frequency vibrating blade, 1 SEU per 5 min"
29. **Sonic Sword**: Cost: 150 Cr, Weight: 2 kg, Capabilities: "Damage: 2d10+2, Melee, High-frequency disruption blade, 2 SEU per 5 min"
30. **Shock Gloves**: Cost: 75 Cr, Weight: 1 kg, Capabilities: "Damage: 1d10 Stun/Shock on unarmed hit, Melee, 1 SEU per hit"
31. **Brass Knuckles**: Cost: 5 Cr, Weight: 0.2 kg, Capabilities: "Damage: Punch + 2, Melee, Archaic"
32. **Club / Nightstick**: Cost: 5 Cr, Weight: 1 kg, Capabilities: "Damage: 1d10, Melee, Archaic blunt weapon"
33. **Polearm / Spear**: Cost: 15 Cr, Weight: 2 kg, Capabilities: "Damage: 2d10, Melee reach weapon, Archaic"
34. **Knife / Dagger**: Cost: 10 Cr, Weight: 0.5 kg, Capabilities: "Damage: 1d10-2, Melee/Thrown (10m), Archaic"
35. **Axe**: Cost: 20 Cr, Weight: 2 kg, Capabilities: "Damage: 2d10, Melee, Archaic"
36. **Sword**: Cost: 50 Cr, Weight: 2 kg, Capabilities: "Damage: 2d10, Melee, Archaic blade"
37. **Whip**: Cost: 15 Cr, Weight: 1 kg, Capabilities: "Damage: 1d5 + entangle, Melee reach (3m), Archaic"
38. **Bow & Arrows**: Cost: 30 Cr, Weight: 1.5 kg, Capabilities: "Damage: 1d10, Range: 50m, Ammo: Quiver of arrows, Archaic"
39. **Musket**: Cost: 40 Cr, Weight: 4 kg, Capabilities: "Damage: 2d10, Range: 50m, Ammo: Powder & shot, Archaic black powder"

### 3.2 Ammunition (`Ammunition`)
1. **SEU Clip (20 SEU)**: Cost: 10 Cr, Weight: 0.1 kg, Capabilities: "Standard 20 Energy Unit power clip for beam/stun/vibro weapons"
2. **Bulletclip (Pistol, 20 rds)**: Cost: 5 Cr, Weight: 0.2 kg, Capabilities: "20 solid slug bullets for Automatic Pistol"
3. **Bulletclip (Rifle, 20 rds)**: Cost: 10 Cr, Weight: 0.3 kg, Capabilities: "20 solid slug bullets for Automatic Rifle"
4. **Machine Gun Belt (100 rds)**: Cost: 40 Cr, Weight: 2 kg, Capabilities: "100-round linked ammo belt for Machine Gun"
5. **Jetclip (Pistol, 10 rds)**: Cost: 20 Cr, Weight: 0.3 kg, Capabilities: "10 gyrojet micro-rockets for Gyrojet Pistol"
6. **Jetclip (Rifle, 10 rds)**: Cost: 30 Cr, Weight: 0.5 kg, Capabilities: "10 gyrojet micro-rockets for Gyrojet Rifle"
7. **Needleclip (Barbed, 20 rds)**: Cost: 15 Cr, Weight: 0.1 kg, Capabilities: "20 barbed needles for Needler Pistol/Rifle"
8. **Needleclip (Anesthetic, 20 rds)**: Cost: 30 Cr, Weight: 0.1 kg, Capabilities: "20 fast-acting anesthetic needles for Needler Pistol/Rifle"
9. **Grenade Shells (Launcher, 6 rds)**: Cost: 150 Cr, Weight: 1.5 kg, Capabilities: "Magazine of 6 propelled frag grenade shells for Grenade Rifle/Mortar"
10. **Anti-Armor Rocket**: Cost: 100 Cr, Weight: 2 kg, Capabilities: "Damage: 8d10, Range: 300m, Single HEAT rocket for Rocket Launcher"
11. **Recoilless Shell**: Cost: 80 Cr, Weight: 3 kg, Capabilities: "Damage: 6d10, Single heavy shell for Recoilless Rifle"
12. **Arrows (Quiver of 20)**: Cost: 10 Cr, Weight: 1 kg, Capabilities: "20 feathered arrows for hunting and archaic bows"
13. **Powder & Shot (20 shots)**: Cost: 10 Cr, Weight: 1 kg, Capabilities: "Lead balls and black powder charges for musket"

### 3.3 Defenses & Screens (`Defense`)
1. **Skeinsuit**: Cost: 200 Cr, Weight: 2 kg, Capabilities: "Defends vs kinetic weapons (projectiles/melee), reduces damage by half"
2. **Civilian Skeinsuit**: Cost: 150 Cr, Weight: 1.5 kg, Capabilities: "Light concealable ballistic weave, absorbs 1d10 kinetic damage"
3. **Albedo Suit**: Cost: 100 Cr, Weight: 2 kg, Capabilities: "Ablative reflective suit, absorbs up to 50 HP of laser/energy fire before degrading"
4. **Albedo Screen**: Cost: 500 Cr, Weight: 1 kg, Capabilities: "Force screen absorbing laser and beam fire, drains 1 SEU per 2 pts damage, belt-worn"
5. **Inertia Screen**: Cost: 600 Cr, Weight: 1 kg, Capabilities: "Kinetic dampening field absorbing projectile and impact damage, drains 1 SEU per 2 pts damage"
6. **Gauss Screen**: Cost: 700 Cr, Weight: 1.5 kg, Capabilities: "Electromagnetic defense field deflecting charged particle and ion attacks, 1 SEU/round active"
7. **Holo Screen**: Cost: 800 Cr, Weight: 1 kg, Capabilities: "Projects deceptive displacement holographic image, imposes -20% hit penalty on attackers, 1 SEU/min"
8. **Sonic Screen**: Cost: 650 Cr, Weight: 1.5 kg, Capabilities: "Dampening sonic vibration field negating sonic attacks and stunners, 2 SEU/min"

### 3.4 Toolkits & Technical Gear (`Toolkit`)
1. **Techkit**: Cost: 500 Cr, Weight: 5 kg, Capabilities: "Full diagnostic and repair toolkit for mechanics and technological systems"
2. **Robcomkit**: Cost: 800 Cr, Weight: 6 kg, Capabilities: "Specialized tools and interface cables for robot and mainframe computer maintenance/override"
3. **Envirokit**: Cost: 400 Cr, Weight: 4 kg, Capabilities: "Atmospheric and ecological analysis sensor kit, monitors toxins and habitability"
4. **Lockpick Set (Electronic & Mechanical)**: Cost: 150 Cr, Weight: 0.5 kg, Capabilities: "Standard tension bars, bypass chips, and pick needles for security bypass"
5. **Standard Equipment Pack**: Cost: 100 Cr, Weight: 10 kg, Capabilities: "All-in-one survival pack: backpack, blanket, rations, rope, canteen, compass, matches"
6. **Demolitions Kit**: Cost: 600 Cr, Weight: 4 kg, Capabilities: "Wire strippers, detonator crimpers, blasting caps, and remote triggers for explosives"
7. **Geological Survey Kit**: Cost: 350 Cr, Weight: 5 kg, Capabilities: "Core sampler, mineral spectrometer, and seismic sensor pack"

### 3.5 Medical Supplies & Pharmaceuticals (`Medical`)
1. **Medkit**: Cost: 500 Cr, Weight: 5 kg, Capabilities: "Advanced surgical scanner and medical instruments required for surgery and deep field treatment"
2. **First Aid Pack**: Cost: 50 Cr, Weight: 1 kg, Capabilities: "Basic trauma dressings and coagulants; restores 10 STA"
3. **Stimdose**: Cost: 20 Cr, Weight: 0.1 kg, Capabilities: "Emergency stimulant hypo; restores 10 STA immediately"
4. **Staydose**: Cost: 20 Cr, Weight: 0.1 kg, Capabilities: "Suspends vital functions, stabilizing dying character for 24 hours"
5. **Antidose**: Cost: 20 Cr, Weight: 0.1 kg, Capabilities: "Broad-spectrum poison neutralizer in the bloodstream"
6. **Biocort**: Cost: 20 Cr, Weight: 0.1 kg, Capabilities: "Cellular regenerator; doubles natural healing rate for 24 hours"
7. **Antibody Plus**: Cost: 50 Cr, Weight: 0.1 kg, Capabilities: "Immune system booster; grants +20% to Stamina checks against infection and diseases"
8. **Antitox**: Cost: 40 Cr, Weight: 0.1 kg, Capabilities: "Neutralizes ingested or contact chemical poisons"
9. **Omnimycin**: Cost: 75 Cr, Weight: 0.1 kg, Capabilities: "Universal antibiotic curative treating exotic planetary microbial infections"
10. **Telol**: Cost: 100 Cr, Weight: 0.1 kg, Capabilities: "Truth serum / disinhibitor; target must answer questions truthfully on failed STA check"
11. **Plastiflesh (Canister)**: Cost: 45 Cr, Weight: 0.5 kg, Capabilities: "Synthetic spray-on skin and antiseptic sealant; stops bleeding immediately"
12. **Local Anesthetic**: Cost: 15 Cr, Weight: 0.1 kg, Capabilities: "Topical and injectable nerve blocker; eliminates pain penalty during field treatment"
13. **Freeze Field Unit**: Cost: 1000 Cr, Weight: 8 kg, Capabilities: "Portable cryogenic stasis pod keeping critical patient alive indefinitely (10 SEU/day)"
14. **Vitasalt Pills (Bottle of 50)**: Cost: 10 Cr, Weight: 0.1 kg, Capabilities: "Electrolyte and mineral tablets preventing dehydration and heat exhaustion"

### 3.6 Adventuring & Survival Gear (`Gear`)
1. **Chronocom**: Cost: 50 Cr, Weight: 0.5 kg, Capabilities: "Wrist timepiece, personal communicator, and audio memo recorder"
2. **Polyvox**: Cost: 1500 Cr, Weight: 2 kg, Capabilities: "Linguistic universal translator; translates known alien languages in real time"
3. **Toxy-Rad Gauge**: Cost: 100 Cr, Weight: 0.5 kg, Capabilities: "Handheld sensor detecting radiation, chemical poisons, and atmospheric hazards"
4. **Gas Mask**: Cost: 50 Cr, Weight: 1 kg, Capabilities: "Filters airborne toxins, spores, smoke, and tear gas"
5. **Anti-Shock Implant**: Cost: 1200 Cr, Weight: 0.1 kg, Capabilities: "Surgical subdermal neural buffer preventing unconsciousness from sudden shock or pain"
6. **Everflame**: Cost: 10 Cr, Weight: 0.1 kg, Capabilities: "Miniaturized electronic plasma lighter; works underwater and in extreme weather"
7. **Exoskeleton (Power Frame)**: Cost: 2500 Cr, Weight: 25 kg, Capabilities: "Motorized harness granting +30 carry capacity and +20 STR for lifting/bracing (2 SEU/hr)"
8. **Flashlight**: Cost: 10 Cr, Weight: 0.5 kg, Capabilities: "High-intensity beam lantern, illuminates 100m, 1 SEU per 10 hours"
9. **Holoflares (Pack of 5)**: Cost: 25 Cr, Weight: 0.5 kg, Capabilities: "High-altitude signal flares emitting distinct holographic patterns for 1 hour"
10. **IR Goggles**: Cost: 150 Cr, Weight: 0.5 kg, Capabilities: "Infrared thermal vision goggles detecting heat signatures in pitch darkness"
11. **IR Jammer**: Cost: 300 Cr, Weight: 1 kg, Capabilities: "Scrambles thermal scanners and IR tracking sights in a 10m radius (1 SEU/min)"
12. **Life Jacket**: Cost: 25 Cr, Weight: 1 kg, Capabilities: "Self-inflating flotation vest with distress beacon"
13. **Machete / Brush Knife**: Cost: 15 Cr, Weight: 1 kg, Capabilities: "Heavy-bladed brush cutter for clearing dense jungle or flora; Damage: 1d10"
14. **Parawing**: Cost: 250 Cr, Weight: 5 kg, Capabilities: "Collapsible personal gliding wing for safe high-altitude drops and controlled descent"
15. **Radiophone**: Cost: 150 Cr, Weight: 2 kg, Capabilities: "Long-range tactical 2-way radio transceiver; range 100km planetary"
16. **Subspace Radio**: Cost: 3000 Cr, Weight: 15 kg, Capabilities: "Interstellar communications relay capable of broadcasting into orbital/subspace networks"
17. **Rope (25m synthetic)**: Cost: 10 Cr, Weight: 2 kg, Capabilities: "Ultra-tensile synthetic cord, holds up to 1000 kg"
18. **Solvaway (Canister)**: Cost: 30 Cr, Weight: 0.5 kg, Capabilities: "Neutralizing solvent that instantly dissolves Tangler threads and synthetic glues"
19. **Solvent (1 liter)**: Cost: 20 Cr, Weight: 1 kg, Capabilities: "Corrosive solvent dissolving plastics, resins, and organic membranes"
20. **Variable Timer / Detonator**: Cost: 50 Cr, Weight: 0.2 kg, Capabilities: "Multi-function digital fuse timer with delay, radio trip, and proximity triggers"
21. **Compass**: Cost: 10 Cr, Weight: 0.5 kg, Capabilities: "Magnetic navigational orientation compass"
22. **Flares (Pack of 5)**: Cost: 10 Cr, Weight: 0.5 kg, Capabilities: "Phosphorus handheld illumination torches; 1 hour burn each"
23. **Survival Rations (5 days)**: Cost: 10 Cr, Weight: 1 kg, Capabilities: "Concentrated nutrient cubes; 5 full days of balanced sustenance"
24. **Water Pack (2 liters)**: Cost: 5 Cr, Weight: 2 kg, Capabilities: "Durable hydration pack with integrated micro-filter tube"
25. **All-weather Blanket**: Cost: 10 Cr, Weight: 0.5 kg, Capabilities: "Reflective thermal insulation blanket protecting against extreme temperatures"
26. **Magnigoggles**: Cost: 200 Cr, Weight: 0.5 kg, Capabilities: "Binocular magnifying lenses with light intensification and infrared overlay"
27. **Sungoggles**: Cost: 10 Cr, Weight: 0.1 kg, Capabilities: "Polarized UV lenses preventing glare and protecting against flash blindness"

### 3.7 Portable Power & Computers (`Power`)
1. **Power Beltpack**: Cost: 100 Cr, Weight: 2 kg, Capabilities: "Wearable power source holding up to 50 SEU; connects via heavy cable"
2. **Power Backpack**: Cost: 200 Cr, Weight: 5 kg, Capabilities: "Heavy-duty wearable power bank holding up to 100 SEU"
3. **Parabattery Level 1 (50 SEU)**: Cost: 125 Cr, Weight: 2.5 kg, Capabilities: "Stationary rechargeable storage battery with 50 SEU capacity"
4. **Parabattery Level 2 (100 SEU)**: Cost: 250 Cr, Weight: 5 kg, Capabilities: "Medium rechargeable storage battery with 100 SEU capacity"
5. **Parabattery Level 3 (200 SEU)**: Cost: 500 Cr, Weight: 10 kg, Capabilities: "Heavy industrial storage battery with 200 SEU capacity"
6. **Parabattery Level 4 (500 SEU)**: Cost: 1200 Cr, Weight: 25 kg, Capabilities: "Base-station power cell storing 500 SEU capacity"
7. **Portable Generator (Chemical)**: Cost: 1000 Cr, Weight: 30 kg, Capabilities: "Combustion power generator; recharges 10 SEU per hour of operation (uses liquid fuel)"
8. **Portable Computer Level 1**: Cost: 1500 Cr, Weight: 3 kg, Capabilities: "Handheld micro-mainframe with 10 Function Points, running basic security/scientific programs"
9. **Portable Computer Level 2**: Cost: 3000 Cr, Weight: 6 kg, Capabilities: "Rugged terminal with 20 Function Points, satellite uplink, and sensor analysis software"

---

## 4. Frontend User Experience (`CharacterSheetsView.vue`)

### 4.1 Category Filter Navigation
In the **Equipment Catalog Modal** (`.equipment-modal`), render a row of category pill buttons above the search input:
```html
<div class="equipment-category-tabs">
  <button 
    v-for="cat in equipmentCategories" 
    :key="cat"
    type="button"
    class="cat-tab"
    :class="{ active: activeEquipmentCategory === cat }"
    @click="activeEquipmentCategory = cat"
  >
    {{ cat }} <span class="cat-count">({{ getCategoryCount(cat) }})</span>
  </button>
</div>
```

The category list is:
`['All', 'Weapon', 'Ammunition', 'Defense', 'Toolkit', 'Medical', 'Gear', 'Power']`

### 4.2 Filtering Computation
```javascript
filteredEquipmentList() {
  if (!this.equipmentList || !this.equipmentList.length) return [];
  let list = this.equipmentList;
  if (this.activeEquipmentCategory && this.activeEquipmentCategory !== 'All') {
    list = list.filter(item => item.category === this.activeEquipmentCategory);
  }
  if (!this.equipmentSearchQuery) return list;
  const q = this.equipmentSearchQuery.toLowerCase().trim();
  return list.filter(item => 
    (item.name && item.name.toLowerCase().includes(q)) || 
    (item.category && item.category.toLowerCase().includes(q)) || 
    (item.capabilities && item.capabilities.toLowerCase().includes(q))
  );
}
```

### 4.3 Adding Items to Inventory
When the player or GM clicks **+ Add**:
```javascript
addEquipment(item) {
  if (!this.selectedChar) return;
  if (!this.selectedChar.inventory) {
    this.selectedChar.inventory = [];
  }
  this.selectedChar.inventory.push({
    name: item.name,
    quantity: 1,
    weight: Number(item.weight) || 0,
    notes: item.capabilities || '',
  });
  this.recentlyAddedMap[item.name] = true;
  this.updateCharacter();
}
```

---

## 5. Testing & Verification

1. **`server/test/equipment.test.js`**:
   - `GET /api/equipment` returns HTTP 200 with an array exceeding 90 items.
   - Every single item possesses valid `name`, `category` (one of the 7 valid categories), `cost >= 0`, `weight >= 0`, and non-empty `capabilities`.
   - Confirms presence of key canonical weapons and items (Heavy Laser, Sonic Disruptor, Recoilless Rifle, Civilian Skeinsuit, Antibody Plus, Robcomkit, Subspace Radio, Parabattery 1).
2. **`client/test/CharacterSheetsView.test.js`**:
   - Renders category filter tabs with dynamic counts.
   - Filters equipment catalog when selecting a category tab.
   - Searches within the active category tab.
   - Adds item to active sheet inventory with proper name, weight, quantity 1, and capabilities in notes.
3. **Containerized Suite Execution**:
   - `docker exec sf-vtt-dev bash -c "cd server && npm test"`
   - `docker exec sf-vtt-dev bash -c "cd client && npx vitest run test/CharacterSheetsView.test.js"`
   - `docker exec sf-vtt-dev bash -c "cd client && npx vitest run && npm run build"`

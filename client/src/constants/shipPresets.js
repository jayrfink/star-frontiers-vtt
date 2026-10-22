export const SHIP_PRESETS = [
  {
    type: 'Fighter',
    hull_points: 8, adf: 5, mr: 5, dcr: 30,
    weapons: [
      { id: 'w1', name: 'Assault Rockets', type: 'Assault Rockets', damage: '2d10+4', range: 4, ammo_max: 3, ammo_current: 3, restrictions: ['FF', 'MPO', 'LTD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 0, masking_screens_current: 0, icm_max: 0, icm_current: 0 }
  },
  {
    type: 'Assault Scout',
    hull_points: 15, adf: 5, mr: 4, dcr: 35,
    weapons: [
      { id: 'w1', name: 'Laser Battery', type: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, restrictions: ['T', 'RD'], status: 'Online' },
      { id: 'w2', name: 'Assault Rockets', type: 'Assault Rockets', damage: '2d10+4', range: 4, ammo_max: 4, ammo_current: 4, restrictions: ['FF', 'MPO', 'LTD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 0, masking_screens_current: 0, icm_max: 0, icm_current: 0 }
  },
  {
    type: 'Corvette',
    hull_points: 20, adf: 4, mr: 3, dcr: 42,
    weapons: [
      { id: 'w1', name: 'Laser Cannon', type: 'Laser Cannon', damage: '2d10', range: 10, ammo_max: 0, ammo_current: 0, restrictions: ['FF', 'RD'], status: 'Online' },
      { id: 'w2', name: 'Laser Battery', type: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, restrictions: ['T', 'RD'], status: 'Online' },
      { id: 'w3', name: 'Rocket Battery', type: 'Rocket Battery', damage: '2d10', range: 3, ammo_max: 2, ammo_current: 2, restrictions: ['LTD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 1, masking_screens_current: 1, icm_max: 2, icm_current: 2 }
  },
  {
    type: 'Frigate',
    hull_points: 40, adf: 3, mr: 3, dcr: 50,
    weapons: [
      { id: 'w1', name: 'Laser Cannon', type: 'Laser Cannon', damage: '2d10', range: 10, ammo_max: 0, ammo_current: 0, restrictions: ['FF', 'RD'], status: 'Online' },
      { id: 'w2', name: 'Laser Battery', type: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, restrictions: ['T', 'RD'], status: 'Online' },
      { id: 'w3', name: 'Torpedoes', type: 'Torpedoes', damage: '4d10', range: 4, ammo_max: 2, ammo_current: 2, restrictions: ['MPO', 'LTD'], status: 'Online' },
      { id: 'w4', name: 'Rocket Batteries', type: 'Rocket Batteries', damage: '2d10', range: 3, ammo_max: 4, ammo_current: 4, restrictions: ['LTD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 1, masking_screens_current: 1, icm_max: 4, icm_current: 4 }
  },
  {
    type: 'Destroyer',
    hull_points: 50, adf: 3, mr: 2, dcr: 60,
    weapons: [
      { id: 'w1', name: 'Laser Cannon', type: 'Laser Cannon', damage: '2d10', range: 10, ammo_max: 0, ammo_current: 0, restrictions: ['FF', 'RD'], status: 'Online' },
      { id: 'w2', name: 'Laser Battery', type: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, restrictions: ['T', 'RD'], status: 'Online' },
      { id: 'w3', name: 'Torpedoes', type: 'Torpedoes', damage: '4d10', range: 4, ammo_max: 2, ammo_current: 2, restrictions: ['MPO', 'LTD'], status: 'Online' },
      { id: 'w4', name: 'Rocket Batteries', type: 'Rocket Batteries', damage: '2d10', range: 3, ammo_max: 6, ammo_current: 6, restrictions: ['LTD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 2, masking_screens_current: 2, icm_max: 6, icm_current: 6 }
  },
  {
    type: 'Light Cruiser',
    hull_points: 70, adf: 2, mr: 2, dcr: 70,
    weapons: [
      { id: 'w1', name: 'Laser Cannon', type: 'Laser Cannon', damage: '2d10', range: 10, ammo_max: 0, ammo_current: 0, restrictions: ['FF', 'RD'], status: 'Online' },
      { id: 'w2', name: 'Laser Batteries (x2)', type: 'Laser Batteries (x2)', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, restrictions: ['T', 'RD'], status: 'Online' },
      { id: 'w3', name: 'Torpedoes (x4)', type: 'Torpedoes (x4)', damage: '4d10', range: 4, ammo_max: 4, ammo_current: 4, restrictions: ['MPO', 'LTD'], status: 'Online' },
      { id: 'w4', name: 'Rocket Batteries (x6)', type: 'Rocket Batteries (x6)', damage: '2d10', range: 3, ammo_max: 6, ammo_current: 6, restrictions: ['LTD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 2, masking_screens_current: 2, icm_max: 6, icm_current: 6 }
  },
  {
    type: 'Heavy Cruiser',
    hull_points: 80, adf: 1, mr: 1, dcr: 75,
    weapons: [
      { id: 'w1', name: 'Laser Cannon', type: 'Laser Cannon', damage: '2d10', range: 10, ammo_max: 0, ammo_current: 0, restrictions: ['FF', 'RD'], status: 'Online' },
      { id: 'w2', name: 'Laser Batteries (x3)', type: 'Laser Batteries (x3)', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, restrictions: ['T', 'RD'], status: 'Online' },
      { id: 'w3', name: 'Torpedoes (x4)', type: 'Torpedoes (x4)', damage: '4d10', range: 4, ammo_max: 4, ammo_current: 4, restrictions: ['MPO', 'LTD'], status: 'Online' },
      { id: 'w4', name: 'Rocket Batteries (x8)', type: 'Rocket Batteries (x8)', damage: '2d10', range: 3, ammo_max: 8, ammo_current: 8, restrictions: ['LTD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 2, masking_screens_current: 2, icm_max: 8, icm_current: 8 }
  },
  {
    type: 'Assault Carrier',
    hull_points: 75, adf: 2, mr: 1, dcr: 75,
    weapons: [
      { id: 'w1', name: 'Laser Batteries (x2)', type: 'Laser Batteries (x2)', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, restrictions: ['T', 'RD'], status: 'Online' },
      { id: 'w2', name: 'Rocket Batteries (x6)', type: 'Rocket Batteries (x6)', damage: '2d10', range: 3, ammo_max: 6, ammo_current: 6, restrictions: ['LTD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 2, masking_screens_current: 2, icm_max: 8, icm_current: 8 }
  },
  {
    type: 'Battleship',
    hull_points: 120, adf: 2, mr: 2, dcr: 100,
    weapons: [
      { id: 'w1', name: 'Laser Cannons (x2)', type: 'Laser Cannons (x2)', damage: '2d10', range: 10, ammo_max: 0, ammo_current: 0, restrictions: ['FF', 'RD'], status: 'Online' },
      { id: 'w2', name: 'Laser Batteries (x4)', type: 'Laser Batteries (x4)', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, restrictions: ['T', 'RD'], status: 'Online' },
      { id: 'w3', name: 'Torpedoes (x8)', type: 'Torpedoes (x8)', damage: '4d10', range: 4, ammo_max: 8, ammo_current: 8, restrictions: ['MPO', 'LTD'], status: 'Online' },
      { id: 'w4', name: 'Rocket Batteries (x10)', type: 'Rocket Batteries (x10)', damage: '2d10', range: 3, ammo_max: 10, ammo_current: 10, restrictions: ['LTD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 4, masking_screens_current: 4, icm_max: 10, icm_current: 10 }
  },
  {
    type: 'Small Freighter',
    hull_points: 25, adf: 2, mr: 2, dcr: 35,
    weapons: [
      { id: 'w1', name: 'Laser Battery', type: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, restrictions: ['T', 'RD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 0, masking_screens_current: 0, icm_max: 2, icm_current: 2 }
  },
  {
    type: 'Medium Freighter',
    hull_points: 50, adf: 1, mr: 1, dcr: 50,
    weapons: [
      { id: 'w1', name: 'Laser Battery', type: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, restrictions: ['T', 'RD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 0, masking_screens_current: 0, icm_max: 4, icm_current: 4 }
  },
  {
    type: 'Heavy Freighter',
    hull_points: 75, adf: 1, mr: 1, dcr: 65,
    weapons: [
      { id: 'w1', name: 'Laser Batteries (x2)', type: 'Laser Batteries (x2)', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, restrictions: ['T', 'RD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 1, masking_screens_current: 1, icm_max: 6, icm_current: 6 }
  },
  {
    type: 'Space Station',
    hull_points: 50, adf: 0, mr: 0, dcr: 80,
    weapons: [
      { id: 'w1', name: 'Laser Batteries (x2)', type: 'Laser Batteries (x2)', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0, restrictions: ['T', 'RD'], status: 'Online' },
      { id: 'w2', name: 'Rocket Batteries (x4)', type: 'Rocket Batteries (x4)', damage: '2d10', range: 3, ammo_max: 4, ammo_current: 4, restrictions: ['LTD'], status: 'Online' }
    ],
    defenses: { reflective_hull: true, masking_screens_max: 1, masking_screens_current: 1, icm_max: 6, icm_current: 6 }
  },
  {
    type: 'Custom Vessel',
    hull_points: 30, adf: 2, mr: 2, dcr: 40,
    weapons: [],
    defenses: { reflective_hull: true, masking_screens_max: 0, masking_screens_current: 0, icm_max: 0, icm_current: 0 }
  }
];

import { describe, it, expect } from 'vitest';
import ShipSheetsView from '../src/views/ShipSheetsView.vue';
import ImageBrowserModal from '../src/components/ImageBrowserModal.vue';
import { SHIP_WEAPONS_CATALOG } from '../src/constants/shipWeapons.js';

describe('ShipSheetsView - ImageBrowserModal Integration', () => {
  it('registers ImageBrowserModal component', () => {
    expect(ShipSheetsView.components.ImageBrowserModal).toBe(ImageBrowserModal);
  });

  it('opens image browser modal with target', () => {
    const vm = {
      showImageBrowser: false,
      imageBrowserTarget: 'sheet',
    };

    ShipSheetsView.methods.openImageBrowser.call(vm, 'sheet');
    expect(vm.showImageBrowser).toBe(true);
    expect(vm.imageBrowserTarget).toBe('sheet');

    ShipSheetsView.methods.openImageBrowser.call(vm, 'create');
    expect(vm.showImageBrowser).toBe(true);
    expect(vm.imageBrowserTarget).toBe('create');
  });

  it('handles image selection for ship sheet and triggers updateShip', () => {
    let updated = false;
    const vm = {
      imageBrowserTarget: 'sheet',
      selectedShip: {
        id: 's1',
        name: 'Assault Scout',
        avatar_url: '',
      },
      updateShip() {
        updated = true;
      },
    };

    ShipSheetsView.methods.onImageSelected.call(vm, '/uploads/ships/scout.png');
    expect(vm.selectedShip.avatar_url).toBe('/uploads/ships/scout.png');
    expect(updated).toBe(true);
  });

  it('handles image selection for create ship form', () => {
    const vm = {
      imageBrowserTarget: 'create',
      newShipForm: {
        name: '',
        avatar_url: '',
      },
    };

    ShipSheetsView.methods.onImageSelected.call(vm, '/uploads/ships/fighter.png');
    expect(vm.newShipForm.avatar_url).toBe('/uploads/ships/fighter.png');
  });

  it('computes currentBrowserImage and imageBrowserTitle correctly', () => {
    const vmSheet = {
      imageBrowserTarget: 'sheet',
      selectedShip: { avatar_url: '/uploads/ship1.png' },
      newShipForm: { avatar_url: '/uploads/ship2.png' },
    };
    expect(ShipSheetsView.computed.currentBrowserImage.call(vmSheet)).toBe('/uploads/ship1.png');
    expect(ShipSheetsView.computed.imageBrowserTitle.call(vmSheet)).toBe('Select Ship Token Image');

    const vmCreate = {
      imageBrowserTarget: 'create',
      selectedShip: { avatar_url: '/uploads/ship1.png' },
      newShipForm: { avatar_url: '/uploads/ship2.png' },
    };
    expect(ShipSheetsView.computed.currentBrowserImage.call(vmCreate)).toBe('/uploads/ship2.png');
    expect(ShipSheetsView.computed.imageBrowserTitle.call(vmCreate)).toBe('Select Ship Avatar');
  });
});

describe('ShipSheetsView - Ship Notes Section', () => {
  it('normalizes missing notes to empty string and preserves existing notes', () => {
    const vm = {
      normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
      normalizeWeapons: ShipSheetsView.methods.normalizeWeapons,
    };
    const shipWithoutNotes = ShipSheetsView.methods.normalizeShip.call(vm, { name: 'UPF Gullwind' });
    expect(shipWithoutNotes.notes).toBe('');

    const shipWithNotes = ShipSheetsView.methods.normalizeShip.call(vm, {
      name: 'UPF Gullwind',
      notes: 'Hyperdrive needs recalibration',
    });
    expect(shipWithNotes.notes).toBe('Hyperdrive needs recalibration');
  });

  it('sends notes in updateShip PUT payload', async () => {
    let sentBody = null;
    const origFetch = global.fetch;
    global.fetch = async (url, opts) => {
      sentBody = JSON.parse(opts.body);
      return { ok: true, json: async () => sentBody };
    };

    try {
      const vm = {
        selectedShip: {
          id: 7,
          name: 'UPF Gullwind',
          type: 'Assault Scout',
          max_hull_points: 15,
          current_hull_points: 15,
          notes: 'Docked at Cassidine',
        },
        ships: [{ id: 7, name: 'UPF Gullwind', notes: '' }],
        normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
        normalizeWeapons: ShipSheetsView.methods.normalizeWeapons,
        normalizeShip: ShipSheetsView.methods.normalizeShip,
      };

      await ShipSheetsView.methods.updateShip.call(vm);
      expect(sentBody).not.toBeNull();
      expect(sentBody.notes).toBe('Docked at Cassidine');
    } finally {
      global.fetch = origFetch;
    }
  });
});

describe('ShipSheetsView - Weapon Selection & Renaming', () => {
  it('opens and closes add weapon modal', () => {
    const vm = {
      showAddWeaponModal: false,
      customWeaponForm: { name: '', damage: '1d10', range: 5, ammo_max: 0 },
      weaponCategoryFilter: 'All',
    };
    ShipSheetsView.methods.openAddWeaponModal.call(vm);
    expect(vm.showAddWeaponModal).toBe(true);
    expect(vm.customWeaponForm.name).toBe('');
    expect(vm.weaponCategoryFilter).toBe('All');
  });

  it('equips a canonical weapon from catalog to selectedShip.weapons', () => {
    let updated = false;
    const vm = {
      showAddWeaponModal: true,
      selectedShip: {
        weapons: [],
      },
      updateShip() {
        updated = true;
      },
    };

    const torpedo = SHIP_WEAPONS_CATALOG.find((w) => w.name === 'Torpedoes');
    ShipSheetsView.methods.equipWeapon.call(vm, torpedo);

    expect(vm.selectedShip.weapons.length).toBe(1);
    expect(vm.selectedShip.weapons[0].name).toBe('Torpedoes');
    expect(vm.selectedShip.weapons[0].damage).toBe('4d10');
    expect(vm.selectedShip.weapons[0].range).toBe(4);
    expect(vm.selectedShip.weapons[0].ammo_max).toBe(2);
    expect(vm.selectedShip.weapons[0].ammo_current).toBe(2);
    expect(vm.selectedShip.weapons[0].status).toBe('Online');
    expect(vm.showAddWeaponModal).toBe(false);
    expect(updated).toBe(true);
  });

  it('equips a custom weapon to selectedShip.weapons', () => {
    let updated = false;
    const vm = {
      showAddWeaponModal: true,
      customWeaponForm: {
        name: 'Heavy Plasma Cannon',
        damage: '3d10',
        range: 7,
        ammo_max: 5,
      },
      selectedShip: {
        weapons: [],
      },
      updateShip() {
        updated = true;
      },
    };

    ShipSheetsView.methods.equipCustomWeapon.call(vm);

    expect(vm.selectedShip.weapons.length).toBe(1);
    expect(vm.selectedShip.weapons[0].name).toBe('Heavy Plasma Cannon');
    expect(vm.selectedShip.weapons[0].damage).toBe('3d10');
    expect(vm.selectedShip.weapons[0].range).toBe(7);
    expect(vm.selectedShip.weapons[0].ammo_max).toBe(5);
    expect(vm.selectedShip.weapons[0].status).toBe('Online');
    expect(vm.showAddWeaponModal).toBe(false);
    expect(updated).toBe(true);
  });

  it('updates weapon name and type and triggers updateShip onWeaponNameChange', () => {
    let updated = false;
    const vm = {
      updateShip() {
        updated = true;
      },
    };
    const wpn = {
      name: 'Port Laser Battery',
      type: 'Laser Battery',
    };

    ShipSheetsView.methods.onWeaponNameChange.call(vm, wpn);
    expect(wpn.name).toBe('Port Laser Battery');
    expect(wpn.type).toBe('Port Laser Battery');
    expect(updated).toBe(true);

    // Empty name falls back to previous type
    wpn.name = '   ';
    ShipSheetsView.methods.onWeaponNameChange.call(vm, wpn);
    expect(wpn.name).toBe('Port Laser Battery');
  });

  it('closes showAddWeaponModal on Escape keydown', () => {
    const vm = {
      showAddWeaponModal: true,
    };
    ShipSheetsView.methods.handleKeydown.call(vm, { key: 'Escape' });
    expect(vm.showAddWeaponModal).toBe(false);

    // Other keys do not dismiss modal
    vm.showAddWeaponModal = true;
    ShipSheetsView.methods.handleKeydown.call(vm, { key: 'Enter' });
    expect(vm.showAddWeaponModal).toBe(true);
  });

  it('determines weapon category and limitation explanation accurately', () => {
    const vm = {
      getWeaponCategory: ShipSheetsView.methods.getWeaponCategory,
      getCategoryExplanation: ShipSheetsView.methods.getCategoryExplanation,
      getWeaponTooltip: ShipSheetsView.methods.getWeaponTooltip,
    };

    // Beams
    expect(vm.getWeaponCategory({ name: 'Laser Cannon', type: 'Laser Cannon' })).toBe('Beam');
    expect(vm.getWeaponCategory({ name: 'Laser Battery', type: 'Laser Battery' })).toBe('Beam');
    expect(vm.getWeaponCategory({ name: 'Laser Batteries (x2)', type: 'Laser Batteries (x2)' })).toBe('Beam');
    expect(vm.getCategoryExplanation({ name: 'Laser Battery' })).toContain('damage halved by Reflective Hull');

    // Ordnance
    expect(vm.getWeaponCategory({ name: 'Assault Rockets', type: 'Assault Rockets' })).toBe('Ordnance');
    expect(vm.getWeaponCategory({ name: 'Torpedoes', type: 'Torpedoes' })).toBe('Ordnance');
    expect(vm.getWeaponCategory({ name: 'Rocket Battery', type: 'Rocket Battery' })).toBe('Ordnance');
    expect(vm.getCategoryExplanation({ name: 'Torpedoes' })).toContain('intercepted by ICMs');

    // Energy
    expect(vm.getWeaponCategory({ name: 'Disruptor Cannon', type: 'Disruptor Cannon' })).toBe('Energy');
    expect(vm.getCategoryExplanation({ name: 'Disruptor Cannon' })).toContain('ignores Reflective Hull');

    // Tooltip formatting
    const tip = vm.getWeaponTooltip({ name: 'Torpedoes', type: 'Torpedoes' });
    expect(tip).toContain('Torpedoes (Ordnance)');
  });

  it('manages weapon rename edit state', () => {
    let focusCalled = false;
    let selectCalled = false;
    const vm = {
      editingWeaponIndex: null,
      $nextTick(cb) {
        cb();
      },
      $refs: {
        weaponRenameInput: {
          focus() {
            focusCalled = true;
          },
          select() {
            selectCalled = true;
          },
        },
      },
      onWeaponNameChangeCalled: false,
      onWeaponNameChange() {
        this.onWeaponNameChangeCalled = true;
      },
    };

    ShipSheetsView.methods.startEditWeapon.call(vm, 2, { name: 'Assault Rockets' });
    expect(vm.editingWeaponIndex).toBe(2);
    expect(focusCalled).toBe(true);
    expect(selectCalled).toBe(true);

    ShipSheetsView.methods.stopEditWeapon.call(vm, { name: 'Assault Rockets' });
    expect(vm.editingWeaponIndex).toBeNull();
    expect(vm.onWeaponNameChangeCalled).toBe(true);
  });

  it('normalizeWeapons guarantees both name and type are defined', () => {
    const rawWeapons = [
      { id: 'w1', type: 'Assault Rockets', damage: '2d10+4', range: 4 },
      { id: 'w2', name: 'Laser Battery', damage: '1d10', range: 9 },
    ];

    const normalized = ShipSheetsView.methods.normalizeWeapons(rawWeapons);
    expect(normalized[0].name).toBe('Assault Rockets');
    expect(normalized[0].type).toBe('Assault Rockets');
    expect(normalized[1].name).toBe('Laser Battery');
    expect(normalized[1].type).toBe('Laser Battery');
  });
});

describe('ShipSheetsView - Flip and Burn Maneuver Capability', () => {
  it('exposes canFlipAndBurn method returning true for MR > 3 and false for MR <= 3', () => {
    expect(typeof ShipSheetsView.methods.canFlipAndBurn).toBe('function');
    expect(ShipSheetsView.methods.canFlipAndBurn(4)).toBe(true);
    expect(ShipSheetsView.methods.canFlipAndBurn(5)).toBe(true);
    expect(ShipSheetsView.methods.canFlipAndBurn(3)).toBe(false);
    expect(ShipSheetsView.methods.canFlipAndBurn(2)).toBe(false);
    expect(ShipSheetsView.methods.canFlipAndBurn(0)).toBe(false);
  });
});




import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
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
  it('exposes canFlipAndBurn method returning true for MR >= 3 and false for MR < 3', () => {
    expect(typeof ShipSheetsView.methods.canFlipAndBurn).toBe('function');
    expect(ShipSheetsView.methods.canFlipAndBurn(3)).toBe(true);
    expect(ShipSheetsView.methods.canFlipAndBurn(4)).toBe(true);
    expect(ShipSheetsView.methods.canFlipAndBurn(5)).toBe(true);
    expect(ShipSheetsView.methods.canFlipAndBurn(2)).toBe(false);
    expect(ShipSheetsView.methods.canFlipAndBurn(1)).toBe(false);
    expect(ShipSheetsView.methods.canFlipAndBurn(0)).toBe(false);
  });
});

describe('ShipSheetsView - Custom Weapon Designer Restrictions', () => {
  it('supports selecting restriction chips and custom restrictions in custom weapon modal', () => {
    expect(ShipSheetsView.data().customWeaponForm.selectedTags).toBeDefined();
    expect(ShipSheetsView.data().customWeaponForm.customRestrictions).toBeDefined();
    expect(Array.isArray(ShipSheetsView.data().STANDARD_RESTRICTION_TAGS)).toBe(true);
  });

  it('toggles restriction tags correctly', () => {
    const vm = {
      customWeaponForm: {
        selectedTags: [],
      },
    };

    ShipSheetsView.methods.toggleRestrictionTag.call(vm, 'FF');
    expect(vm.customWeaponForm.selectedTags).toEqual(['FF']);

    ShipSheetsView.methods.toggleRestrictionTag.call(vm, 'MPO');
    expect(vm.customWeaponForm.selectedTags).toEqual(['FF', 'MPO']);

    ShipSheetsView.methods.toggleRestrictionTag.call(vm, 'FF');
    expect(vm.customWeaponForm.selectedTags).toEqual(['MPO']);
  });

  it('resets custom weapon form tags and custom restrictions on openAddWeaponModal', () => {
    const vm = {
      showAddWeaponModal: false,
      customWeaponForm: {
        name: 'Old Weapon',
        damage: '2d10',
        range: 8,
        ammo_max: 3,
        selectedTags: ['FF', 'RD'],
        customRestrictions: 'Port Arc',
      },
      weaponCategoryFilter: 'Custom',
    };

    ShipSheetsView.methods.openAddWeaponModal.call(vm);
    expect(vm.showAddWeaponModal).toBe(true);
    expect(vm.customWeaponForm.name).toBe('');
    expect(vm.customWeaponForm.selectedTags).toEqual([]);
    expect(vm.customWeaponForm.customRestrictions).toBe('');
    expect(vm.weaponCategoryFilter).toBe('All');
  });

  it('equips custom weapon with combined selectedTags and customRestrictions', () => {
    let updated = false;
    const vm = {
      showAddWeaponModal: true,
      customWeaponForm: {
        name: 'Twin Heavy Ion Cannon',
        damage: '3d10',
        range: 6,
        ammo_max: 0,
        selectedTags: ['FF', 'RD'],
        customRestrictions: 'Starboard, Limited Traverse',
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
    const equipped = vm.selectedShip.weapons[0];
    expect(equipped.name).toBe('Twin Heavy Ion Cannon');
    expect(equipped.restrictions).toEqual(['FF', 'RD', 'Starboard', 'Limited Traverse']);
    expect(vm.showAddWeaponModal).toBe(false);
    expect(updated).toBe(true);
  });

  it('normalizes weapon restrictions when array or comma-separated string', () => {
    const rawWeapons = [
      { id: 'w1', name: 'Laser Cannon', restrictions: ['FF', 'RD'] },
      { id: 'w2', name: 'Custom Beam', restrictions: 'FF,  MPO ' },
      { id: 'w3', name: 'Old Weapon' },
    ];

    const normalized = ShipSheetsView.methods.normalizeWeapons(rawWeapons);
    expect(normalized[0].restrictions).toEqual(['FF', 'RD']);
    expect(normalized[1].restrictions).toEqual(['FF', 'MPO']);
    expect(normalized[2].restrictions).toEqual([]);
  });

  it('template contains restriction chips, inputs, and pills', () => {
    const shipSheetsContent = fs.readFileSync(path.resolve(__dirname, '../src/views/ShipSheetsView.vue'), 'utf8');
    expect(shipSheetsContent).toContain('STANDARD_RESTRICTION_TAGS');
    expect(shipSheetsContent).toContain('btn-tag-chip');
    expect(shipSheetsContent).toContain('custom-restrictions-input');
    expect(shipSheetsContent).toContain('wpn-restriction-pill');

    const spaceVttContent = fs.readFileSync(path.resolve(__dirname, '../src/views/SpaceVttView.vue'), 'utf8');
    expect(spaceVttContent).toContain('token-wpn-tag');
    expect(spaceVttContent).toContain('token-weapons-section');
  });

  it('guards stopEditWeapon against duplicate updates when editingWeaponIndex is null', () => {
    let updateCount = 0;
    const vm = {
      editingWeaponIndex: null,
      onWeaponNameChange: () => { updateCount++; },
    };

    ShipSheetsView.methods.stopEditWeapon.call(vm, { name: 'Laser Battery' });
    expect(updateCount).toBe(0);

    vm.editingWeaponIndex = 0;
    ShipSheetsView.methods.stopEditWeapon.call(vm, { name: 'Laser Battery' });
    expect(updateCount).toBe(1);
    expect(vm.editingWeaponIndex).toBe(null);
  });

  it('normalizes defenses on preset selection in onEditPresetChange', () => {
    let updateCalled = false;
    const vm = {
      presets: [
        {
          type: 'Frigate',
          adf: 3,
          mr: 3,
          dcr: 50,
          hull_points: 40,
          weapons: [],
          defenses: { reflect: true, masking: true, icm_count: 4 },
        },
      ],
      selectedShip: {
        type: 'Fighter',
        weapons: [],
        defenses: {},
      },
      normalizeWeapons: (w) => w,
      normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
      updateShip: () => { updateCalled = true; },
    };

    // Mock confirm dialog
    global.confirm = () => true;

    ShipSheetsView.methods.onEditPresetChange.call(vm, 'Frigate');
    expect(vm.selectedShip.type).toBe('Frigate');
    expect(vm.selectedShip.defenses.reflective_hull).toBe(true);
    expect(vm.selectedShip.defenses.masking_screens_max).toBe(1);
    expect(vm.selectedShip.defenses.icm_max).toBe(4);
    expect(updateCalled).toBe(true);
  });
});

describe('ShipSheetsView - 0 Ammo Display & 0 Hull Point Calculations', () => {
  it('isLimitedAmmoWeapon returns true for ordnance with 0 ammo remaining and false for beam weapons', () => {
    const vm = {
      getWeaponCategory: ShipSheetsView.methods.getWeaponCategory,
      isLimitedAmmoWeapon: ShipSheetsView.methods.isLimitedAmmoWeapon,
    };

    // Ordnance weapon with 0 ammo remaining out of 4
    const emptyTorpedoes = {
      name: 'Torpedoes',
      category: 'Ordnance',
      ammo_current: 0,
      ammo_max: 4,
      restrictions: ['MPO', 'LTD'],
    };
    expect(vm.isLimitedAmmoWeapon(emptyTorpedoes)).toBe(true);

    // Ordnance weapon with 0 current and 0 max (depleted / custom)
    const depletedMines = {
      name: 'Mines',
      category: 'Ordnance',
      ammo_current: 0,
      ammo_max: 0,
      restrictions: ['LTD'],
    };
    expect(vm.isLimitedAmmoWeapon(depletedMines)).toBe(true);

    // Unlimited Beam weapon with 0 ammo
    const laserBattery = {
      name: 'Laser Battery',
      category: 'Beam',
      ammo_current: 0,
      ammo_max: 0,
      restrictions: ['T', 'RD'],
    };
    expect(vm.isLimitedAmmoWeapon(laserBattery)).toBe(false);
  });

  it('hullPercentage returns 0% when current_hull_points is 0', () => {
    const vm = {
      selectedShip: {
        max_hull_points: 60,
        current_hull_points: 0,
      },
    };
    expect(ShipSheetsView.computed.hullPercentage.call(vm)).toBe(0);

    // When max is 0
    vm.selectedShip.max_hull_points = 0;
    expect(ShipSheetsView.computed.hullPercentage.call(vm)).toBe(0);
  });

  it('adjustHullPoints calculates correctly from 0 hull points using nullish coalescing', () => {
    let updated = false;
    const vm = {
      selectedShip: {
        id: 1,
        max_hull_points: 50,
        current_hull_points: 0,
        current_hp: 0,
      },
      updateShip() {
        updated = true;
      },
    };

    // Healing from 0 HP
    ShipSheetsView.methods.adjustHullPoints.call(vm, 5);
    expect(vm.selectedShip.current_hull_points).toBe(5);
    expect(vm.selectedShip.current_hp).toBe(5);
    expect(updated).toBe(true);

    // Damage below 0 clamps at 0
    ShipSheetsView.methods.adjustHullPoints.call(vm, -10);
    expect(vm.selectedShip.current_hull_points).toBe(0);
    expect(vm.selectedShip.current_hp).toBe(0);
  });

  it('normalizeShip preserves 0 hull points without reverting to 50', () => {
    const vm = {
      normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
      normalizeWeapons: ShipSheetsView.methods.normalizeWeapons,
    };

    const shipWithZero = {
      name: 'Derelict Scout',
      hull_points: 0,
      current_hp: 0,
    };

    const normalized = ShipSheetsView.methods.normalizeShip.call(vm, shipWithZero);
    expect(normalized.hull_points).toBe(0);
    expect(normalized.max_hull_points).toBe(0);
    expect(normalized.current_hp).toBe(0);
    expect(normalized.current_hull_points).toBe(0);
  });

  it('updateShip preserves 0 hull points in PUT payload', async () => {
    let sentBody = null;
    const origFetch = global.fetch;
    global.fetch = async (url, opts) => {
      sentBody = JSON.parse(opts.body);
      return { ok: true, json: async () => sentBody };
    };

    try {
      const vm = {
        selectedShip: {
          id: 42,
          name: 'Destroyed Fighter',
          type: 'Fighter',
          max_hull_points: 0,
          current_hull_points: 0,
        },
        ships: [],
        normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
        normalizeWeapons: ShipSheetsView.methods.normalizeWeapons,
        normalizeShip: ShipSheetsView.methods.normalizeShip,
      };

      await ShipSheetsView.methods.updateShip.call(vm);
      expect(sentBody).not.toBeNull();
      expect(sentBody.hull_points).toBe(0);
      expect(sentBody.current_hp).toBe(0);
    } finally {
      global.fetch = origFetch;
    }
  });

  it('Bug 29 & Bug 36: displays errorMessage on create/update failure and replaces window.alert', async () => {
    const origFetch = global.fetch;
    const alertSpy = vi.fn();
    global.alert = alertSpy;

    try {
      const vm = {
        newShipForm: { name: 'Faulty Ship', type: 'Fighter' },
        creating: false,
        errorMessage: '',
        normalizeShip: (s) => s,
        normalizeWeapons: (w) => w,
        normalizeDefenses: (d) => d,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Ship name already in use' }),
      });

      await ShipSheetsView.methods.createShip.call(vm);
      expect(vm.errorMessage).toBe('Ship name already in use');
      expect(alertSpy).not.toHaveBeenCalled();

      // Test updateShip failure
      const vmUpdate = {
        selectedShip: { id: 1, name: 'Ship' },
        errorMessage: '',
        normalizeShip: (s) => s,
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server database error' }),
      });

      await ShipSheetsView.methods.updateShip.call(vmUpdate);
      expect(vmUpdate.errorMessage).toBe('Server database error');
    } finally {
      global.fetch = origFetch;
    }
  });

  it('Bug 36: opens reactive confirmation modal on delete and executes confirmed action', async () => {
    const origFetch = global.fetch;
    let deleteCalled = false;
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (url.includes('/api/ships/10')) {
        deleteCalled = true;
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    try {
      const vm = {
        ships: [{ id: 10, name: 'Target Ship' }],
        selectedShip: { id: 10, name: 'Target Ship' },
        confirmModal: { show: false, message: '', onConfirm: null },
        errorMessage: '',
        openConfirmModal: ShipSheetsView.methods.openConfirmModal,
        cancelConfirmModal: ShipSheetsView.methods.cancelConfirmModal,
        executeConfirmModal: ShipSheetsView.methods.executeConfirmModal,
      };

      // Call deleteShip
      ShipSheetsView.methods.deleteShip.call(vm, 10);
      expect(vm.confirmModal.show).toBe(true);
      expect(vm.confirmModal.message).toBe('Are you sure you want to delete this ship?');
      expect(deleteCalled).toBe(false);

      // Execute confirmation
      vm.executeConfirmModal();
      // Wait for async doDelete
      await new Promise((r) => setTimeout(r, 10));

      expect(deleteCalled).toBe(true);
      expect(vm.ships.length).toBe(0);
      expect(vm.confirmModal.show).toBe(false);
    } finally {
      global.fetch = origFetch;
    }
  });
});





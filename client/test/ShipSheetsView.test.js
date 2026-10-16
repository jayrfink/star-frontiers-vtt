import { describe, it, expect } from 'vitest';
import ShipSheetsView from '../src/views/ShipSheetsView.vue';
import ImageBrowserModal from '../src/components/ImageBrowserModal.vue';

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


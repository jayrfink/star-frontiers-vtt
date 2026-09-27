import { describe, it, expect } from 'vitest';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';

describe('CharacterSheetsView - Equipment Catalog & Inventory Logic', () => {
  it('filters equipment list by name, category, or capability', () => {
    const vm = {
      equipmentList: [
        { name: 'Vibroknife', category: 'Weapon', cost: 30, weight: 1, capabilities: 'Damage: 1d10, Melee' },
        { name: 'Laser Pistol', category: 'Weapon', cost: 500, weight: 1, capabilities: 'Damage: 1d10 to 10d10' },
        { name: 'Albedo Screen', category: 'Armor', cost: 500, weight: 1, capabilities: 'Defends vs lasers' },
        { name: 'Chronocom', category: 'Equipment', cost: 50, weight: 0.5, capabilities: 'Timepiece and communicator' },
      ],
      equipmentSearchQuery: '',
    };

    // All items when query is empty
    let filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
    expect(filtered.length).toBe(4);

    // Search by name
    vm.equipmentSearchQuery = 'Pistol';
    filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Laser Pistol');

    // Search by category
    vm.equipmentSearchQuery = 'Armor';
    filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Albedo Screen');

    // Search by capability
    vm.equipmentSearchQuery = 'communicator';
    filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Chronocom');
  });

  it('adds an equipment item from catalog to character inventory with notes', () => {
    const vm = {
      selectedChar: {
        inventory: [
          { name: 'Rations', quantity: 2, weight: 0.5, notes: 'Food' },
        ],
      },
      recentlyAddedMap: {},
      updateCharacter: () => {},
    };

    const item = {
      name: 'Laser Pistol',
      category: 'Weapon',
      cost: 500,
      weight: 1,
      capabilities: 'Damage: 1d10 to 10d10, Range: 50m',
    };

    CharacterSheetsView.methods.addEquipment.call(vm, item);

    expect(vm.selectedChar.inventory.length).toBe(2);
    const added = vm.selectedChar.inventory[1];
    expect(added.name).toBe('Laser Pistol');
    expect(added.weight).toBe(1);
    expect(added.quantity).toBe(1);
    expect(added.notes).toBe('Damage: 1d10 to 10d10, Range: 50m');
    expect(vm.recentlyAddedMap['Laser Pistol']).toBe(true);
  });

  it('filters character inventory items by name or notes', () => {
    const vm = {
      selectedChar: {
        inventory: [
          { name: 'Rations', quantity: 2, weight: 0.5, notes: 'Food cubes' },
          { name: 'Laser Pistol', quantity: 1, weight: 1, notes: 'SEU weapon' },
        ],
      },
      searchInventoryQuery: '',
    };

    let filtered = CharacterSheetsView.computed.filteredInventory.call(vm);
    expect(filtered.length).toBe(2);

    vm.searchInventoryQuery = 'Laser';
    filtered = CharacterSheetsView.computed.filteredInventory.call(vm);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Laser Pistol');

    vm.searchInventoryQuery = 'cubes';
    filtered = CharacterSheetsView.computed.filteredInventory.call(vm);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Rations');
  });

  it('removes inventory item by object reference or index', () => {
    const item1 = { name: 'Rations', quantity: 2, weight: 0.5 };
    const item2 = { name: 'Vibroknife', quantity: 1, weight: 1 };
    const vm = {
      selectedChar: {
        inventory: [item1, item2],
      },
      updateCharacter: () => {},
    };

    // Remove by item reference
    CharacterSheetsView.methods.removeInventoryItem.call(vm, item1);
    expect(vm.selectedChar.inventory.length).toBe(1);
    expect(vm.selectedChar.inventory[0].name).toBe('Vibroknife');

    // Remove by index
    CharacterSheetsView.methods.removeInventoryItem.call(vm, 0);
    expect(vm.selectedChar.inventory.length).toBe(0);
  });

  describe('PSA Selection & Normalization', () => {
    it('preserves non-Military PSA during normalization and defaults missing PSA to Military', () => {
      const normalize = CharacterSheetsView.methods.normalizeCharacterData;

      const techChar = normalize({ name: 'Techie', psa: 'Technological' });
      expect(techChar.psa).toBe('Technological');

      const bioChar = normalize({ name: 'Medic', psa: 'Biosocial' });
      expect(bioChar.psa).toBe('Biosocial');

      const militaryChar = normalize({ name: 'Soldier', psa: 'Military' });
      expect(militaryChar.psa).toBe('Military');

      const defaultChar = normalize({ name: 'Recruit' });
      expect(defaultChar.psa).toBe('Military');
    });

    it('calculates XP cost based on active PSA', () => {
      const vmTech = {
        selectedChar: { psa: 'Technological' },
      };
      const vmMil = {
        selectedChar: { psa: 'Military' },
      };

      // Computer is Technological PSA (base cost 4)
      const costInPSA = CharacterSheetsView.methods.getXPCost.call(vmTech, 'Computer', 2);
      expect(costInPSA).toBe(8); // 2 * 4

      const costOutOfPSA = CharacterSheetsView.methods.getXPCost.call(vmMil, 'Computer', 2);
      expect(costOutOfPSA).toBe(16); // 2 * (4 * 2)
    });
  });

  describe('ImageBrowserModal Integration', () => {
    it('opens image browser modal with given target', () => {
      const vm = {
        showImageBrowser: false,
        imageBrowserTarget: 'char',
      };

      CharacterSheetsView.methods.openImageBrowser.call(vm, 'char');
      expect(vm.showImageBrowser).toBe(true);
      expect(vm.imageBrowserTarget).toBe('char');

      CharacterSheetsView.methods.openImageBrowser.call(vm, 'create');
      expect(vm.showImageBrowser).toBe(true);
      expect(vm.imageBrowserTarget).toBe('create');
    });

    it('handles image selection for sheet portrait and triggers update', () => {
      let updated = false;
      const vm = {
        imageBrowserTarget: 'char',
        selectedChar: {
          id: 'c1',
          name: 'Wilf',
          avatar_url: '',
        },
        updateCharacter() {
          updated = true;
        },
      };

      CharacterSheetsView.methods.onImageSelected.call(vm, '/uploads/portraits/wilf.png');
      expect(vm.selectedChar.avatar_url).toBe('/uploads/portraits/wilf.png');
      expect(updated).toBe(true);
    });

    it('handles image selection for create character form', () => {
      const vm = {
        imageBrowserTarget: 'create',
        newCharForm: {
          name: '',
          avatar_url: '',
        },
      };

      CharacterSheetsView.methods.onImageSelected.call(vm, '/uploads/portraits/new_hero.png');
      expect(vm.newCharForm.avatar_url).toBe('/uploads/portraits/new_hero.png');
    });

    it('computes currentBrowserImage and imageBrowserTitle correctly', () => {
      const vmChar = {
        imageBrowserTarget: 'char',
        selectedChar: { avatar_url: '/uploads/char1.png' },
        newCharForm: { avatar_url: '/uploads/char2.png' },
      };
      expect(CharacterSheetsView.computed.currentBrowserImage.call(vmChar)).toBe('/uploads/char1.png');
      expect(CharacterSheetsView.computed.imageBrowserTitle.call(vmChar)).toBe('Select Character Portrait');

      const vmCreate = {
        imageBrowserTarget: 'create',
        selectedChar: { avatar_url: '/uploads/char1.png' },
        newCharForm: { avatar_url: '/uploads/char2.png' },
      };
      expect(CharacterSheetsView.computed.currentBrowserImage.call(vmCreate)).toBe('/uploads/char2.png');
      expect(CharacterSheetsView.computed.imageBrowserTitle.call(vmCreate)).toBe('Select Character Avatar');
    });
  });
});

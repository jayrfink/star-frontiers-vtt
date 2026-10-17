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

  describe('Character Notes Section', () => {
    it('normalizes missing notes to empty string and preserves existing notes', () => {
      const normalize = CharacterSheetsView.methods.normalizeCharacterData;
      const charWithoutNotes = normalize({ name: 'Ace' });
      expect(charWithoutNotes.notes).toBe('');

      const charWithNotes = normalize({ name: 'Ace', notes: 'Carries backup power clip' });
      expect(charWithNotes.notes).toBe('Carries backup power clip');
    });

    it('sends notes in updateCharacter PUT payload', async () => {
      let sentBody = null;
      const origFetch = global.fetch;
      global.fetch = async (url, opts) => {
        sentBody = JSON.parse(opts.body);
        return { ok: true, json: async () => sentBody };
      };

      try {
        const vm = {
          selectedChar: {
            id: 42,
            name: 'Ace',
            str: 50,
            sta: 50,
            dex: 50,
            rs: 50,
            int: 50,
            log: 50,
            per: 50,
            ldr: 50,
            current_stamina: 50,
            notes: 'Met contact on Volturnus',
          },
          characters: [{ id: 42, name: 'Ace', notes: '' }],
          normalizeCharacterData: CharacterSheetsView.methods.normalizeCharacterData,
        };

        await CharacterSheetsView.methods.updateCharacter.call(vm);
        expect(sentBody).not.toBeNull();
        expect(sentBody.notes).toBe('Met contact on Volturnus');
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  describe('Equipment Catalog Category Filtering & Tabs', () => {
    const mockEquipmentList = [
      { name: 'Laser Pistol', category: 'Weapon', cost: 500, weight: 1, capabilities: 'Damage: 1d10' },
      { name: 'Heavy Laser', category: 'Weapon', cost: 1000, weight: 15, capabilities: 'Damage: 1d10 to 30d10' },
      { name: 'SEU Clip (20 SEU)', category: 'Ammunition', cost: 10, weight: 0.1, capabilities: '20 SEU' },
      { name: 'Skeinsuit', category: 'Defense', cost: 200, weight: 2, capabilities: 'Defends vs kinetic' },
      { name: 'Techkit', category: 'Toolkit', cost: 500, weight: 5, capabilities: 'Diagnostic toolkit' },
      { name: 'Stimdose', category: 'Medical', cost: 20, weight: 0.1, capabilities: 'Restores 10 STA' },
      { name: 'Chronocom', category: 'Gear', cost: 50, weight: 0.5, capabilities: 'Personal communicator' },
      { name: 'Power Backpack', category: 'Power', cost: 200, weight: 5, capabilities: '100 SEU' },
    ];

    it('calculates category count accurately including All', () => {
      const vm = {
        equipmentList: mockEquipmentList,
      };

      const getCount = CharacterSheetsView.methods.getCategoryCount;
      expect(getCount.call(vm, 'All')).toBe(8);
      expect(getCount.call(vm, 'Weapon')).toBe(2);
      expect(getCount.call(vm, 'Ammunition')).toBe(1);
      expect(getCount.call(vm, 'Defense')).toBe(1);
      expect(getCount.call(vm, 'Toolkit')).toBe(1);
      expect(getCount.call(vm, 'Medical')).toBe(1);
      expect(getCount.call(vm, 'Gear')).toBe(1);
      expect(getCount.call(vm, 'Power')).toBe(1);
      expect(getCount.call(vm, 'NonExistent')).toBe(0);
    });

    it('filters equipment list by activeEquipmentCategory when category is not All', () => {
      const vm = {
        equipmentList: mockEquipmentList,
        activeEquipmentCategory: 'Weapon',
        equipmentSearchQuery: '',
      };

      let filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(2);
      expect(filtered.map(i => i.name)).toEqual(['Laser Pistol', 'Heavy Laser']);

      vm.activeEquipmentCategory = 'Defense';
      filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Skeinsuit');

      vm.activeEquipmentCategory = 'All';
      filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(8);
    });

    it('filters by both category and search query simultaneously', () => {
      const vm = {
        equipmentList: mockEquipmentList,
        activeEquipmentCategory: 'Weapon',
        equipmentSearchQuery: 'Heavy',
      };

      let filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Heavy Laser');

      // Search term does not match anything in active category
      vm.equipmentSearchQuery = 'Skeinsuit';
      filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(0);

      // Switching category back to All matches search term
      vm.activeEquipmentCategory = 'All';
      filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Skeinsuit');
    });

    it('defaults activeEquipmentCategory gracefully if unset on vm', () => {
      const vm = {
        equipmentList: mockEquipmentList,
        equipmentSearchQuery: '',
      };

      const filtered = CharacterSheetsView.computed.filteredEquipmentList.call(vm);
      expect(filtered.length).toBe(8);
    });
  });
});



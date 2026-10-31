/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';
import { useAuthStore } from '../src/stores/auth.js';
import * as characterExport from '../src/utils/characterExport.js';

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

  describe('Stamina Tracker & Max Stamina Editing', () => {
    it('updates character sta and max_stamina when onMaxStaminaChange is invoked without being overwritten by old sta', async () => {
      let sentPayload = null;
      const mockFetch = vi.fn().mockImplementation((url, options) => {
        sentPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ...sentPayload,
            id: 1,
          }),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const vm = {
        selectedChar: {
          id: 1,
          name: 'Hero',
          race: 'Human',
          sta: 50,
          max_stamina: 50,
          current_stamina: 50,
        },
        characters: [
          { id: 1, name: 'Hero', race: 'Human', sta: 50, max_stamina: 50, current_stamina: 50 }
        ],
        normalizeCharacterData: CharacterSheetsView.methods.normalizeCharacterData,
      };
      vm.updateCharacter = CharacterSheetsView.methods.updateCharacter.bind(vm);
      vm.onMaxStaminaChange = CharacterSheetsView.methods.onMaxStaminaChange.bind(vm);

      // Simulate user editing the Max STA input from 50 to 65
      vm.selectedChar.max_stamina = 65;
      await vm.onMaxStaminaChange();

      expect(vm.selectedChar.max_stamina).toBe(65);
      expect(vm.selectedChar.sta).toBe(65);
      expect(sentPayload.sta).toBe(65);
      expect(sentPayload.max_stamina).toBe(65);
    });

    it('caps current_stamina to max_stamina if max_stamina is lowered below current_stamina', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const vm = {
        selectedChar: {
          id: 1,
          name: 'Hero',
          race: 'Human',
          sta: 50,
          max_stamina: 50,
          current_stamina: 45,
        },
        characters: [],
        normalizeCharacterData: CharacterSheetsView.methods.normalizeCharacterData,
      };
      vm.updateCharacter = CharacterSheetsView.methods.updateCharacter.bind(vm);
      vm.onMaxStaminaChange = CharacterSheetsView.methods.onMaxStaminaChange.bind(vm);

      // Lower max_stamina to 30
      vm.selectedChar.max_stamina = 30;
      await vm.onMaxStaminaChange();

      expect(vm.selectedChar.max_stamina).toBe(30);
      expect(vm.selectedChar.sta).toBe(30);
      expect(vm.selectedChar.current_stamina).toBe(30);
    });

    it('updateCharacter directly preserves edited max_stamina and synchronizes sta in payload', async () => {
      let sentPayload = null;
      const mockFetch = vi.fn().mockImplementation((url, options) => {
        sentPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...sentPayload, id: 2 }),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const vm = {
        selectedChar: {
          id: 2,
          name: 'Vrusk Scout',
          race: 'Vrusk',
          sta: 40,
          max_stamina: 55, // User edited max_stamina
          current_stamina: 40,
        },
        characters: [],
        normalizeCharacterData: CharacterSheetsView.methods.normalizeCharacterData,
      };
      vm.updateCharacter = CharacterSheetsView.methods.updateCharacter.bind(vm);

      await vm.updateCharacter();

      expect(vm.selectedChar.max_stamina).toBe(55);
      expect(sentPayload.sta).toBe(55);
    });

    it('clamps current_stamina to max_stamina when sta is reduced via shiftStat', () => {
      const vm = {
        selectedChar: {
          str: 40,
          sta: 50,
          max_stamina: 50,
          current_stamina: 50,
        },
        updateCharacter: vi.fn(),
      };
      vm.shiftStat = CharacterSheetsView.methods.shiftStat.bind(vm);

      // Shift 5 points from STA to STR (amount = 5 for str, -5 for sta)
      vm.shiftStat('str', 'sta', 5);

      expect(vm.selectedChar.str).toBe(45);
      expect(vm.selectedChar.sta).toBe(45);
      expect(vm.selectedChar.max_stamina).toBe(45);
      expect(vm.selectedChar.current_stamina).toBe(45);
      expect(vm.updateCharacter).toHaveBeenCalled();
    });

    it('Bug 10: has correct point-shift arrow directions and tooltips in template', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const vueFile = fs.readFileSync(path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'), 'utf8');

      // Left button ◄ should shift point to left stat (+1)
      expect(vueFile).toContain('<button class="btn-shift" title="Shift point to STR" @click="shiftStat(\'str\', \'sta\', 1)">◄</button>');
      expect(vueFile).toContain('<button class="btn-shift" title="Shift point to DEX" @click="shiftStat(\'dex\', \'rs\', 1)">◄</button>');
      expect(vueFile).toContain('<button class="btn-shift" title="Shift point to INT" @click="shiftStat(\'int\', \'log\', 1)">◄</button>');

      // Right button ► should shift point to right stat (-1)
      expect(vueFile).toContain('<button class="btn-shift" title="Shift point to STA" @click="shiftStat(\'str\', \'sta\', -1)">►</button>');
      expect(vueFile).toContain('<button class="btn-shift" title="Shift point to RS" @click="shiftStat(\'dex\', \'rs\', -1)">►</button>');
      expect(vueFile).toContain('<button class="btn-shift" title="Shift point to LOG" @click="shiftStat(\'int\', \'log\', -1)">►</button>');
    });

    it('Bug 29: displays reactive errorMessage when character update, create, or delete fails', async () => {
      const vm = {
        selectedChar: { id: 10, name: 'Hero', str: 50, sta: 50 },
        errorMessage: '',
        normalizeCharacterData: (c) => c,
        characters: [{ id: 10, name: 'Hero' }],
      };

      // Test updateCharacter failure
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden to edit character' }),
      });

      await CharacterSheetsView.methods.updateCharacter.call(vm);
      expect(vm.errorMessage).toBe('Forbidden to edit character');

      // Test deleteCharacter failure
      global.confirm = () => true;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Database error' }),
      });

      await CharacterSheetsView.methods.deleteCharacter.call(vm, 10);
      expect(vm.errorMessage).toBe('Database error');
    });

    it('manages freeform stamina damage & healing with bounds clamping', () => {
      const vm = {
        selectedChar: { current_stamina: 40, max_stamina: 50 },
        staminaDelta: 15,
        updateCharacter: vi.fn(),
      };

      // Apply damage: 40 - 15 = 25
      CharacterSheetsView.methods.applyStaminaDamage.call(vm);
      expect(vm.selectedChar.current_stamina).toBe(25);
      expect(vm.staminaDelta).toBeNull();
      expect(vm.updateCharacter).toHaveBeenCalled();

      // Apply damage that exceeds current stamina: clamped to 0
      vm.staminaDelta = 50;
      CharacterSheetsView.methods.applyStaminaDamage.call(vm);
      expect(vm.selectedChar.current_stamina).toBe(0);

      // Apply heal: 0 + 20 = 20
      vm.staminaDelta = 20;
      CharacterSheetsView.methods.applyStaminaHeal.call(vm);
      expect(vm.selectedChar.current_stamina).toBe(20);

      // Apply heal that exceeds max: clamped to max_stamina (50)
      vm.staminaDelta = 100;
      CharacterSheetsView.methods.applyStaminaHeal.call(vm);
      expect(vm.selectedChar.current_stamina).toBe(50);
    });

    it('resets character stamina and SEU to maximum on Full Rest', () => {
      const vm = {
        selectedChar: { current_stamina: 10, max_stamina: 55, current_seu: 5, max_seu: 50 },
        updateCharacter: vi.fn(),
      };

      CharacterSheetsView.methods.resetCharacterStats.call(vm);
      expect(vm.selectedChar.current_stamina).toBe(55);
      expect(vm.selectedChar.current_seu).toBe(50);
      expect(vm.updateCharacter).toHaveBeenCalled();
    });

    it('tracks SEU energy pool adjustments and computes percentage & color', () => {
      const vm = {
        selectedChar: { current_seu: 40, max_seu: 50 },
        seuDelta: 10,
        updateCharacter: vi.fn(),
      };

      // Compute percentage: 40/50 = 80%
      expect(CharacterSheetsView.computed.seuPercentage.call(vm)).toBe(80);
      expect(CharacterSheetsView.computed.seuColor.call(vm)).toBe('#4caf50');

      // Adjust SEU: -5
      CharacterSheetsView.methods.adjustSeu.call(vm, -5);
      expect(vm.selectedChar.current_seu).toBe(35);
      expect(vm.updateCharacter).toHaveBeenCalled();

      // Freeform burn: 35 - 10 = 25 (50% -> orange)
      CharacterSheetsView.methods.applySeuBurn.call(vm);
      expect(vm.selectedChar.current_seu).toBe(25);
      expect(CharacterSheetsView.computed.seuPercentage.call(vm)).toBe(50);
      expect(CharacterSheetsView.computed.seuColor.call(vm)).toBe('#ff9800');

      // Critical low (< 25% -> red)
      vm.selectedChar.current_seu = 5;
      expect(CharacterSheetsView.computed.seuPercentage.call(vm)).toBe(10);
      expect(CharacterSheetsView.computed.seuColor.call(vm)).toBe('#f44336');

      // Freeform recharge: 5 + 20 = 25
      vm.seuDelta = 20;
      CharacterSheetsView.methods.applySeuRecharge.call(vm);
      expect(vm.selectedChar.current_seu).toBe(25);
    });
  });

  describe('Character ASCII Download Action', () => {
    it('provides downloadAsciiSheet method calling export utility', () => {
      expect(typeof CharacterSheetsView.methods.downloadAsciiSheet).toBe('function');
      const spy = vi.spyOn(characterExport, 'downloadCharacterAscii');
      const testChar = { name: 'Test Scout', race: 'Human', str: 50 };
      const vm = { selectedChar: testChar };

      CharacterSheetsView.methods.downloadAsciiSheet.call(vm);
      expect(spy).toHaveBeenCalledWith(testChar);
      spy.mockRestore();
    });

    it('handles downloadAsciiSheet gracefully when no character is selected', () => {
      const spy = vi.spyOn(characterExport, 'downloadCharacterAscii');
      const vm = { selectedChar: null };
      CharacterSheetsView.methods.downloadAsciiSheet.call(vm);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('Character Sheets Left Navigation Reordering', () => {
    it('determines reordering permission based on GameMaster role', () => {
      const vmGM = {
        isGm: true,
        canReorder: CharacterSheetsView.methods.canReorder,
      };
      const vmPlayer = {
        isGm: false,
        canReorder: CharacterSheetsView.methods.canReorder,
      };

      // When character is null
      expect(vmGM.canReorder(null)).toBe(false);
      // When user is GameMaster
      expect(vmGM.canReorder({ id: 1, user_id: 2 })).toBe(true);
      // When user is not GameMaster (Player)
      expect(vmPlayer.canReorder({ id: 1, user_id: 1 })).toBe(false);
    });

    it('moves character up and down, updates local array optimistically, and dispatches PUT /api/characters/reorder', async () => {
      const origFetch = global.fetch;
      let requestedUrl = null;
      let requestedBody = null;

      global.fetch = vi.fn().mockImplementation((url, opts) => {
        requestedUrl = url;
        requestedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, order: requestedBody.order }),
        });
      });

      try {
        const vm = {
          characters: [
            { id: 101, name: 'Char A' },
            { id: 102, name: 'Char B' },
            { id: 103, name: 'Char C' },
          ],
          errorMessage: '',
          moveCharacter: CharacterSheetsView.methods.moveCharacter,
          saveCharacterOrder: CharacterSheetsView.methods.saveCharacterOrder,
        };

        // Move Char B up (index 1 + -1 -> index 0)
        await vm.moveCharacter(1, -1);
        expect(vm.characters.map(c => c.id)).toEqual([102, 101, 103]);
        expect(requestedUrl).toBe('/api/characters/reorder');
        expect(requestedBody).toEqual({ order: [102, 101, 103] });

        // Move Char B down (index 0 + 1 -> index 1)
        await vm.moveCharacter(0, 1);
        expect(vm.characters.map(c => c.id)).toEqual([101, 102, 103]);
        expect(requestedBody).toEqual({ order: [101, 102, 103] });

        // Boundary checks (move top item up, or bottom item down does nothing)
        requestedUrl = null;
        await vm.moveCharacter(0, -1);
        expect(requestedUrl).toBeNull();

        await vm.moveCharacter(2, 1);
        expect(requestedUrl).toBeNull();
      } finally {
        global.fetch = origFetch;
      }
    });

    it('rolls back optimistic character order and sets errorMessage on API failure', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Cannot reorder sheets you do not own' }),
      });

      try {
        const initial = [
          { id: 101, name: 'Char A' },
          { id: 102, name: 'Char B' },
        ];
        const vm = {
          characters: [...initial],
          errorMessage: '',
          moveCharacter: CharacterSheetsView.methods.moveCharacter,
          saveCharacterOrder: CharacterSheetsView.methods.saveCharacterOrder,
        };

        await vm.moveCharacter(0, 1);
        // On error, should rollback to original order
        expect(vm.characters.map(c => c.id)).toEqual([101, 102]);
        expect(vm.errorMessage).toBe('Cannot reorder sheets you do not own');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('reorders character list on socket event sheets:reordered while preserving selectedChar', () => {
      const char1 = { id: 101, name: 'Char 1' };
      const char2 = { id: 102, name: 'Char 2' };
      const char3 = { id: 103, name: 'Char 3' };

      const vm = {
        characters: [char1, char2, char3],
        selectedChar: char2,
        handleSheetsReordered: CharacterSheetsView.methods.handleSheetsReordered,
      };

      // Reorder payload
      vm.handleSheetsReordered({
        type: 'character',
        order: [103, 101, 102],
      });

      expect(vm.characters.map(c => c.id)).toEqual([103, 101, 102]);
      expect(vm.selectedChar).toBe(char2);

      // Ignores events for ship type
      vm.handleSheetsReordered({
        type: 'ship',
        order: [102, 101, 103],
      });
      expect(vm.characters.map(c => c.id)).toEqual([103, 101, 102]);
    });

    it('handles drag and drop reordering', async () => {
      const origFetch = global.fetch;
      let sentOrder = null;
      global.fetch = vi.fn().mockImplementation((url, opts) => {
        sentOrder = JSON.parse(opts.body).order;
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, order: sentOrder }),
        });
      });

      try {
        const vm = {
          characters: [
            { id: 1, name: 'First' },
            { id: 2, name: 'Second' },
            { id: 3, name: 'Third' },
          ],
          draggedCharIndex: 0,
          dragOverCharIndex: 2,
          errorMessage: '',
          onDrop: CharacterSheetsView.methods.onDrop,
          saveCharacterOrder: CharacterSheetsView.methods.saveCharacterOrder,
        };

        const mockEvent = {
          preventDefault: vi.fn(),
        };

        await vm.onDrop(mockEvent, 2);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(vm.characters.map(c => c.id)).toEqual([2, 3, 1]);
        expect(sentOrder).toEqual([2, 3, 1]);
        expect(vm.draggedCharIndex).toBeNull();
        expect(vm.dragOverCharIndex).toBeNull();
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  describe('Tier Badge Calculation & Display', () => {
    it('computes character tier based on skills, explicit tier, or defaults to 1', () => {
      const getCharTier = CharacterSheetsView.methods.getCharTier;

      // Null or empty character
      expect(getCharTier(null)).toBe(1);
      expect(getCharTier({})).toBe(1);

      // Explicit tier or threat_tier
      expect(getCharTier({ tier: 3 })).toBe(3);
      expect(getCharTier({ threat_tier: 4 })).toBe(4);

      // Tier 1: No skills or max level 1
      expect(getCharTier({ skills: [{ name: 'Beam Weapons', level: 1 }] })).toBe(1);

      // Tier 2: Max level 2 or total >= 3
      expect(getCharTier({ skills: [{ name: 'Beam Weapons', level: 2 }] })).toBe(2);
      expect(getCharTier({
        skills: [
          { name: 'Beam Weapons', level: 1 },
          { name: 'Melee Weapons', level: 1 },
          { name: 'Technician', level: 1 },
        ],
      })).toBe(2);

      // Tier 3: Max level 3 or 4
      expect(getCharTier({ skills: [{ name: 'Beam Weapons', level: 3 }] })).toBe(3);
      expect(getCharTier({ skills: [{ name: 'Beam Weapons', level: 4 }] })).toBe(3);

      // Tier 4: Max level 5
      expect(getCharTier({ skills: [{ name: 'Beam Weapons', level: 5 }] })).toBe(4);

      // Tier 5: Max level 6
      expect(getCharTier({ skills: [{ name: 'Beam Weapons', level: 6 }] })).toBe(5);
    });

    it('computes characterTier from selectedChar', () => {
      const vm = {
        selectedChar: {
          skills: [{ name: 'Beam Weapons', level: 4 }],
        },
        getCharTier: CharacterSheetsView.methods.getCharTier,
      };

      const tier = CharacterSheetsView.computed.characterTier.call(vm);
      expect(tier).toBe(3);
    });

    it('renders the Tier badge in the header when a character is selected', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/api/equipment')) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ([{
            id: 1,
            name: 'Wulfen',
            race: 'Yazirian',
            current_stamina: 50,
            max_stamina: 50,
            skills: [{ name: 'Beam Weapons', level: 3 }],
          }]),
        });
      });
      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();
        const badge = wrapper.find('.badge-tier');
        expect(badge.exists()).toBe(true);
        expect(badge.text()).toBe('Tier 3');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('displays "Characters" in sidebar header and no mini icon in SEU Energy Pool header', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(path.resolve(__dirname, '../src/views/CharacterSheetsView.vue'), 'utf-8');
      expect(content).toMatch(/<div class="sidebar-header">\s*<h3>Characters<\/h3>/);
      expect(content).toMatch(/<div class="seu-header">\s*<h4>SEU Energy Pool<\/h4>/);
      expect(content).not.toMatch(/<h4>⚡ SEU Energy Pool<\/h4>/);
    });
  });

  describe('Character Sheets - Player Assignment (GM only)', () => {
    it('fetches registered users on mount when user is GameMaster and renders player assignment dropdown', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 1, username: 'gmUser', role: 'GameMaster' };

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 10,
              user_id: 2,
              owner_username: 'playerAlice',
              name: 'Alice Hero',
              race: 'Human',
              psa: 'Military',
              current_stamina: 50,
              max_stamina: 50,
            }]),
          });
        }
        if (url === '/api/auth/users') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { id: 1, username: 'gmUser', role: 'GameMaster' },
              { id: 2, username: 'playerAlice', role: 'Player' },
            ]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        expect(global.fetch).toHaveBeenCalledWith('/api/auth/users', expect.any(Object));
        const playerSelect = wrapper.find('.select-player');
        expect(playerSelect.exists()).toBe(true);
        expect(wrapper.find('.player-select-wrap').exists()).toBe(true);

        // Selecting a new player updates user_id
        await playerSelect.setValue('1');
        expect(Number(wrapper.vm.selectedChar.user_id)).toBe(1);
      } finally {
        global.fetch = origFetch;
      }
    });

    it('renders read-only badge-player for non-GM players', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 2, username: 'playerAlice', role: 'Player' };

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 10,
              user_id: 2,
              owner_username: 'playerAlice',
              name: 'Alice Hero',
              race: 'Human',
              psa: 'Military',
              current_stamina: 50,
              max_stamina: 50,
            }]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        expect(wrapper.find('.select-player').exists()).toBe(false);
        const badge = wrapper.find('.badge-player');
        expect(badge.exists()).toBe(true);
        expect(badge.text()).toContain('playerAlice');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('includes Assigned Player select in Create Character modal when isGm is true', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 1, username: 'gmUser', role: 'GameMaster' };

      const vm = {
        isGm: true,
        registeredUsers: [
          { id: 1, username: 'gmUser', role: 'GameMaster' },
          { id: 2, username: 'playerAlice', role: 'Player' },
        ],
        newCharForm: {},
        showCreateModal: false,
      };

      CharacterSheetsView.methods.openCreateModal.call(vm);
      expect(vm.showCreateModal).toBe(true);
      expect(vm.newCharForm.user_id).toBe(1);
    });
  });

  describe('Experience Points (XP) Tracker & Skill Spend', () => {
    it('normalizes character data with current_xp default 0', () => {
      const c1 = CharacterSheetsView.methods.normalizeCharacterData({});
      expect(c1.current_xp).toBe(0);

      const c2 = CharacterSheetsView.methods.normalizeCharacterData({ current_xp: 15 });
      expect(c2.current_xp).toBe(15);

      const c3 = CharacterSheetsView.methods.normalizeCharacterData({ current_xp: '20' });
      expect(c3.current_xp).toBe(20);
    });

    it('adjusts XP with adjustXP and clamps to minimum 0', () => {
      const vm = {
        selectedChar: { current_xp: 10 },
        updateCharacter: vi.fn(),
      };

      CharacterSheetsView.methods.adjustXP.call(vm, 5);
      expect(vm.selectedChar.current_xp).toBe(15);
      expect(vm.updateCharacter).toHaveBeenCalledTimes(1);

      CharacterSheetsView.methods.adjustXP.call(vm, -20);
      expect(vm.selectedChar.current_xp).toBe(0);
      expect(vm.updateCharacter).toHaveBeenCalledTimes(2);
    });

    it('upgrades skill level and deducts XP when current_xp is sufficient', () => {
      const vm = {
        selectedChar: {
          psa: 'Military',
          current_xp: 10,
          skills: [
            { name: 'Beam Weapons', level: 1, psa: 'Military' },
          ],
        },
        getXPCost: CharacterSheetsView.methods.getXPCost,
        updateCharacter: vi.fn(),
      };

      // Cost for Beam Weapons level 2 (Military in PSA) = 2 * 3 = 6 XP
      CharacterSheetsView.methods.upgradeSkillLevel.call(vm, 0);

      expect(vm.selectedChar.skills[0].level).toBe(2);
      expect(vm.selectedChar.current_xp).toBe(4);
      expect(vm.updateCharacter).toHaveBeenCalled();
    });

    it('does not upgrade skill level or deduct XP when current_xp is insufficient', () => {
      const vm = {
        selectedChar: {
          psa: 'Military',
          current_xp: 3,
          skills: [
            { name: 'Beam Weapons', level: 1, psa: 'Military' },
          ],
        },
        errorMessage: '',
        getXPCost: CharacterSheetsView.methods.getXPCost,
        updateCharacter: vi.fn(),
      };

      // Cost is 6 XP, have 3 XP
      CharacterSheetsView.methods.upgradeSkillLevel.call(vm, 0);

      expect(vm.selectedChar.skills[0].level).toBe(1);
      expect(vm.selectedChar.current_xp).toBe(3);
      expect(vm.updateCharacter).not.toHaveBeenCalled();
      expect(vm.errorMessage).toMatch(/insufficient xp/i);
    });

    it('renders XP tracker card with steppers, input, and updates current_xp', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 1, username: 'testuser', role: 'Player' };

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 1,
              name: 'Wilks',
              race: 'Vrusk',
              psa: 'Military',
              current_stamina: 50,
              max_stamina: 50,
              current_seu: 50,
              max_seu: 50,
              current_xp: 12,
              skills: [],
            }]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        // Check XP tracker section exists
        const xpSection = wrapper.find('.xp-section');
        expect(xpSection.exists()).toBe(true);
        expect(xpSection.text()).toContain('Experience Points (XP)');
        expect(xpSection.text()).toContain('12');

        // Check steppers exist: -5, -1, +1, +5
        const steppers = xpSection.findAll('.btn-xp');
        expect(steppers.length).toBe(4);

        // Click +1 stepper
        await steppers[2].trigger('click');
        expect(wrapper.vm.selectedChar.current_xp).toBe(13);

        // Check input field exists and update it manually
        const xpInput = xpSection.find('.input-xp');
        expect(xpInput.exists()).toBe(true);
        await xpInput.setValue(25);
        await xpInput.trigger('change');
        expect(wrapper.vm.selectedChar.current_xp).toBe(25);
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  describe('Character Sheet Header Layout & Organization', () => {
    it('renders clean header with top row and sub row, without Species Info banner, and without download icon', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 1, username: 'gmUser', role: 'GameMaster' };

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/characters') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 1,
              user_id: 1,
              owner_username: 'gmUser',
              name: 'Commander John',
              race: 'Human',
              psa: 'Military',
              current_stamina: 50,
              max_stamina: 50,
              current_xp: 10,
            }]),
          });
        }
        if (url === '/api/auth/users') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1, username: 'gmUser', role: 'GameMaster' }]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(CharacterSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        // 1. Verify Species Info banner is completely removed
        expect(wrapper.find('.race-ability-banner').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('Species Info:');

        // 2. Verify top row contains input-name, player attribution, tier badge, and download button
        const topRow = wrapper.find('.header-top-row');
        expect(topRow.exists()).toBe(true);
        expect(topRow.find('.input-name').exists()).toBe(true);
        expect(topRow.find('.player-select-wrap').exists()).toBe(true);
        expect(topRow.find('.badge-tier').exists()).toBe(true);
        const downloadBtn = topRow.find('.btn-action-download');
        expect(downloadBtn.exists()).toBe(true);

        // 3. Verify download button does not contain the mini-icon 📥
        expect(downloadBtn.text()).not.toContain('📥');
        expect(downloadBtn.text()).toContain('Download Sheet (.txt)');

        // 4. Verify sub row contains Species and PSA selectors underneath
        const subRow = wrapper.find('.header-sub-row');
        expect(subRow.exists()).toBe(true);
        expect(subRow.find('.race-select-wrap').exists()).toBe(true);
        expect(subRow.find('.psa-select-wrap').exists()).toBe(true);
      } finally {
        global.fetch = origFetch;
      }
    });
  });
});




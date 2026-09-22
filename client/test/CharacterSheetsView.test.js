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
});

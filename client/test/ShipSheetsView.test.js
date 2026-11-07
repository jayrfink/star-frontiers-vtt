/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import fs from 'fs';
import path from 'path';
import ShipSheetsView from '../src/views/ShipSheetsView.vue';
import { useAuthStore } from '../src/stores/auth.js';
import ImageBrowserModal from '../src/components/ImageBrowserModal.vue';
import { SHIP_WEAPONS_CATALOG } from '../src/constants/shipWeapons.js';
import * as shipExport from '../src/utils/shipExport.js';

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

  it('defaults ship note panels to empty array when no notes exist', () => {
    const vm = {
      normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
      normalizeWeapons: ShipSheetsView.methods.normalizeWeapons,
    };
    const ship = ShipSheetsView.methods.normalizeShip.call(vm, { name: 'UPF Strike' });
    expect(ship.note_panels).toBeDefined();
    expect(ship.note_panels.length).toBe(0);
  });

  it('loads legacy plain text notes into a single Notes panel', () => {
    const vm = {
      normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
      normalizeWeapons: ShipSheetsView.methods.normalizeWeapons,
    };
    const ship = ShipSheetsView.methods.normalizeShip.call(vm, {
      name: 'UPF Strike',
      notes: 'Commissioned in Year 58 of Second Sathar War.',
    });
    expect(ship.note_panels.length).toBe(1);
    expect(ship.note_panels[0].title).toBe('Notes');
    expect(ship.note_panels[0].content).toBe('Commissioned in Year 58 of Second Sathar War.');
  });

  it('adds, deletes, and reorders note panels updating serialized notes', () => {
    let updatedShipCalled = 0;
    const vm = {
      selectedShip: {
        id: 1,
        name: 'UPF Strike',
        notes: '',
        note_panels: [
          { id: 'p1', title: 'History', content: 'Built at Clarion' },
          { id: 'p2', title: 'Notes', content: 'Needs sub-light calibration' },
        ],
      },
      updateShip() {
        updatedShipCalled++;
      },
      parseNotePanels: ShipSheetsView.methods.parseNotePanels,
      updateNotePanels: ShipSheetsView.methods.updateNotePanels,
      addNotePanel: ShipSheetsView.methods.addNotePanel,
      deleteNotePanel: ShipSheetsView.methods.deleteNotePanel,
      moveNotePanel: ShipSheetsView.methods.moveNotePanel,
    };

    // 1. Add Note Panel
    vm.addNotePanel('Damage Report');
    expect(vm.selectedShip.note_panels.length).toBe(3);
    expect(vm.selectedShip.note_panels[2].title).toBe('Damage Report');
    expect(updatedShipCalled).toBe(1);
    const parsedNotes = JSON.parse(vm.selectedShip.notes);
    expect(parsedNotes.length).toBe(3);

    // 2. Reorder (move 3rd panel up)
    vm.moveNotePanel(2, -1);
    expect(vm.selectedShip.note_panels[1].title).toBe('Damage Report');
    expect(vm.selectedShip.note_panels[2].title).toBe('Notes');
    expect(updatedShipCalled).toBe(2);

    // 3. Delete panel
    const origConfirm = global.confirm;
    global.confirm = () => true;
    try {
      vm.deleteNotePanel(0);
      expect(vm.selectedShip.note_panels.length).toBe(2);
      expect(vm.selectedShip.note_panels[0].title).toBe('Damage Report');
      expect(updatedShipCalled).toBe(3);
    } finally {
      global.confirm = origConfirm;
    }
  });

  it('reorders ship note panels via drag-and-drop onNotePanelDrop', () => {
    let updatedShipCalled = false;
    const vm = {
      draggedNotePanelIndex: 0,
      dragOverNotePanelIndex: 1,
      selectedShip: {
        id: 1,
        name: 'UPF Strike',
        notes: '',
        note_panels: [
          { id: 'p1', title: 'History', content: 'Built at Clarion' },
          { id: 'p2', title: 'Notes', content: 'Needs sub-light calibration' },
        ],
      },
      updateShip() {
        updatedShipCalled = true;
      },
      updateNotePanels: ShipSheetsView.methods.updateNotePanels,
      onNotePanelDrop: ShipSheetsView.methods.onNotePanelDrop,
    };

    const mockEvent = { preventDefault: () => {} };
    vm.onNotePanelDrop(mockEvent, 1);

    expect(vm.selectedShip.note_panels[0].title).toBe('Notes');
    expect(vm.selectedShip.note_panels[1].title).toBe('History');
    expect(vm.draggedNotePanelIndex).toBeNull();
    expect(vm.dragOverNotePanelIndex).toBeNull();
    expect(updatedShipCalled).toBe(true);
  });

  it('limits ship note panels to a maximum of 4 panels', () => {
    const vm = {
      selectedShip: {
        id: 1,
        name: 'UPF Strike',
        notes: '',
        note_panels: [
          { id: 'p1', title: 'History', content: '' },
          { id: 'p2', title: 'Notes', content: '' },
        ],
      },
      updateShip: vi.fn(),
      parseNotePanels: ShipSheetsView.methods.parseNotePanels,
      updateNotePanels: ShipSheetsView.methods.updateNotePanels,
      addNotePanel: ShipSheetsView.methods.addNotePanel,
    };

    vm.addNotePanel('Panel 3');
    expect(vm.selectedShip.note_panels.length).toBe(3);

    vm.addNotePanel('Panel 4');
    expect(vm.selectedShip.note_panels.length).toBe(4);

    // Attempting to add a 5th panel must be rejected
    vm.addNotePanel('Panel 5');
    expect(vm.selectedShip.note_panels.length).toBe(4);

    // Verify parseNotePanels clamps arrays with > 4 panels to exactly 4
    const overflownPanels = [
      { id: '1', title: 'P1' },
      { id: '2', title: 'P2' },
      { id: '3', title: 'P3' },
      { id: '4', title: 'P4' },
      { id: '5', title: 'P5' },
      { id: '6', title: 'P6' },
    ];
    const parsed = vm.parseNotePanels(overflownPanels);
    expect(parsed.length).toBe(4);
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

  it('renders pencil edit mini icon with aqua eraser and cyan pencil body', () => {
    const fs = require('fs');
    const path = require('path');
    const vueFile = fs.readFileSync(path.resolve(__dirname, '../src/views/ShipSheetsView.vue'), 'utf-8');

    // Verify SVG icon markup within btn-rename-weapon
    expect(vueFile).toMatch(/<button[^>]*class="[^"]*btn-rename-weapon[^"]*"[^>]*>[\s\S]*?<svg[^>]*class="[^"]*pencil-icon[^"]*"[\s\S]*?<\/button>/);
    expect(vueFile).toMatch(/<path[^>]*class="[^"]*pencil-eraser[^"]*"[^>]*fill="aqua"/);
    expect(vueFile).toMatch(/<path[^>]*class="[^"]*pencil-body[^"]*"[^>]*fill="cyan"/);

    // Verify CSS styles
    expect(vueFile).toMatch(/\.pencil-eraser\s*\{[^}]*fill:\s*aqua;?[^}]*\}/);
    expect(vueFile).toMatch(/\.pencil-body\s*\{[^}]*fill:\s*cyan;?[^}]*\}/);
  });

  it('matches weapon-card background color to defenses records background color (#0d1117)', () => {
    const fs = require('fs');
    const path = require('path');
    const vueFile = fs.readFileSync(path.resolve(__dirname, '../src/views/ShipSheetsView.vue'), 'utf-8');

    // Verify weapon-card background matches defense records (#0d1117)
    expect(vueFile).toMatch(/\.weapon-card\s*\{[^}]*background:\s*#0d1117;?[^}]*\}/);
    expect(vueFile).toMatch(/\.defense-toggle-row\s*\{[^}]*background:\s*#0d1117;?[^}]*\}/);
    expect(vueFile).toMatch(/\.defense-counter-box\s*\{[^}]*background:\s*#0d1117;?[^}]*\}/);
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

  it('exposes canStandardFlip, canLumberingFlip, and canSnapFlip methods and SAFE_COMPENSATOR_DELTA_V', () => {
    expect(typeof ShipSheetsView.methods.canStandardFlip).toBe('function');
    expect(typeof ShipSheetsView.methods.canLumberingFlip).toBe('function');
    expect(typeof ShipSheetsView.methods.canSnapFlip).toBe('function');
    expect(ShipSheetsView.data().SAFE_COMPENSATOR_DELTA_V).toBe(3);

    expect(ShipSheetsView.methods.canStandardFlip(4)).toBe(true);
    expect(ShipSheetsView.methods.canStandardFlip(3)).toBe(true);
    expect(ShipSheetsView.methods.canStandardFlip(2)).toBe(false);

    expect(ShipSheetsView.methods.canLumberingFlip(2)).toBe(true);
    expect(ShipSheetsView.methods.canLumberingFlip(1)).toBe(true);
    expect(ShipSheetsView.methods.canLumberingFlip(3)).toBe(false);
    expect(ShipSheetsView.methods.canLumberingFlip(0)).toBe(false);

    expect(ShipSheetsView.methods.canSnapFlip(2)).toBe(true);
    expect(ShipSheetsView.methods.canSnapFlip(1)).toBe(true);
    expect(ShipSheetsView.methods.canSnapFlip(3)).toBe(false);
    expect(ShipSheetsView.methods.canSnapFlip(0)).toBe(false);
  });

  it('renders the Standard Flip Capable banner and High-G braking rule when selected ship has MR >= 3', async () => {
    const origFetch = global.fetch;
    let wrapper;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'ship-1', name: 'Assault Scout', mr: 4, adf: 5, dcr: 35, hull_points: 15, current_hp: 15, weapons: [], defenses: {} },
      ],
    });

    try {
      wrapper = mount(ShipSheetsView, {
        global: {
          stubs: {
            ImageBrowserModal: true,
          },
        },
      });
      await flushPromises();

      const banner = wrapper.find('.flip-burn-ship-banner');
      expect(banner.exists()).toBe(true);
      expect(banner.classes()).toContain('capable');
      expect(banner.text()).toContain('Standard Flip Capable');
      expect(banner.text()).toContain('MR 4 ≥ 3');
      expect(banner.text()).toContain('1-Turn (6s) 180° in-hex pivot (spends 3 MR)');
      expect(banner.text()).toContain('Inertial compensators safely absorb up to 3 points of total ΔV (3 ADF braking) with no STA check required');
      expect(banner.text()).toContain('High-G braking (4+ ADF spent in a single turn) requires crew STA checks (-10% per point of ADF spent above 3)');
    } finally {
      if (wrapper) wrapper.unmount();
      global.fetch = origFetch;
    }
  });

  it('renders the Lumbering & Snap Flip Capable banner when selected ship has MR 1-2', async () => {
    const origFetch = global.fetch;
    let wrapper;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'ship-2', name: 'Heavy Cruiser', mr: 2, adf: 2, dcr: 70, hull_points: 80, current_hp: 80, weapons: [], defenses: {} },
      ],
    });

    try {
      wrapper = mount(ShipSheetsView, {
        global: {
          stubs: {
            ImageBrowserModal: true,
          },
        },
      });
      await flushPromises();

      const banner = wrapper.find('.flip-burn-ship-banner');
      expect(banner.exists()).toBe(true);
      expect(banner.classes()).toContain('multi-turn');
      expect(banner.text()).toContain('Lumbering & Snap Flip Capable');
      expect(banner.text()).toContain('MR 2 < 3');
      expect(banner.text()).toContain('2-Turn Lumbering Flip (drifts at speed rotating native MR 60°–120° on Turn 1, completing 180° on Turn 2)');
      expect(banner.text()).toContain('1-Turn Emergency Snap Flip (Pilot check; crew centrifugal whip STA check: -10% Bow/Stern, 0% Midships)');
      expect(banner.text()).toContain('Safe braking up to 3 ADF; High-G braking (4+ ADF) requires crew STA checks (-10% per point above 3)');
    } finally {
      if (wrapper) wrapper.unmount();
      global.fetch = origFetch;
    }
  });

  it('renders the Flip & Burn Unavailable banner when selected ship has MR 0', async () => {
    const origFetch = global.fetch;
    let wrapper;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'ship-0', name: 'Fortress Station', mr: 0, adf: 0, dcr: 100, hull_points: 120, current_hp: 120, weapons: [], defenses: {} },
      ],
    });

    try {
      wrapper = mount(ShipSheetsView, {
        global: {
          stubs: {
            ImageBrowserModal: true,
          },
        },
      });
      await flushPromises();

      const banner = wrapper.find('.flip-burn-ship-banner');
      expect(banner.exists()).toBe(true);
      expect(banner.classes()).not.toContain('capable');
      expect(banner.classes()).not.toContain('multi-turn');
      expect(banner.text()).toContain('Flip & Burn Unavailable (MR 0)');
      expect(banner.text()).toContain('Vessel lacks maneuvering thrusters. Cannot pivot or rotate.');
    } finally {
      if (wrapper) wrapper.unmount();
      global.fetch = origFetch;
    }
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

  it('renders Current and Max labels for weapons with ammo and excludes the word Ammo', () => {
    const fs = require('fs');
    const path = require('path');
    const vueFile = fs.readFileSync(path.resolve(__dirname, '../src/views/ShipSheetsView.vue'), 'utf-8');

    // Verify template contains Current: and Max: in ammo-field without the word Ammo
    expect(vueFile).toMatch(/<div[^>]*class="[^"]*ammo-field[^"]*"[^>]*>[\s\S]*?<label>Current:<\/label>[\s\S]*?<label>Max:<\/label>/);
    expect(vueFile).not.toMatch(/<div[^>]*class="[^"]*ammo-field[^"]*"[^>]*>[\s\S]*?<label>Ammo:<\/label>/);

    // Verify small matching font size is applied
    expect(vueFile).toMatch(/\.ammo-field\s+label\s*\{[^}]*font-size:\s*0\.8rem;?[^}]*\}/);
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

  it('manages freeform hull damage and healing with bounds clamping', () => {
    const vm = {
      selectedShip: { current_hull_points: 35, current_hp: 35, max_hull_points: 50, hull_points: 50 },
      hullDelta: 10,
      updateShip: vi.fn(),
    };

    // Apply 10 damage: 35 - 10 = 25
    ShipSheetsView.methods.applyHullDamage.call(vm);
    expect(vm.selectedShip.current_hull_points).toBe(25);
    expect(vm.selectedShip.current_hp).toBe(25);
    expect(vm.hullDelta).toBeNull();
    expect(vm.updateShip).toHaveBeenCalled();

    // Apply excessive damage: clamped at 0
    vm.hullDelta = 100;
    ShipSheetsView.methods.applyHullDamage.call(vm);
    expect(vm.selectedShip.current_hull_points).toBe(0);
    expect(vm.selectedShip.current_hp).toBe(0);

    // Apply 20 heal: 0 + 20 = 20
    vm.hullDelta = 20;
    ShipSheetsView.methods.applyHullHeal.call(vm);
    expect(vm.selectedShip.current_hull_points).toBe(20);

    // Apply excessive heal: clamped at max_hull_points (50)
    vm.hullDelta = 100;
    ShipSheetsView.methods.applyHullHeal.call(vm);
    expect(vm.selectedShip.current_hull_points).toBe(50);
  });

  it('resets ship HP, DCR, and all weapon ammo to maximum on Full Repair & Resupply', () => {
    const vm = {
      selectedShip: {
        ship_type: 'Assault Scout',
        current_hull_points: 5,
        current_hp: 5,
        max_hull_points: 15,
        hull_points: 15,
        dcr: 10, // degraded from preset 35
        weapons: [
          { name: 'Laser Battery', ammo_max: 0, ammo_current: 0 },
          { name: 'Proton Torpedo', ammo_max: 4, ammo_current: 1 },
          { name: 'Rocket Battery', ammo_max: 2, ammo_current: 0 },
        ],
      },
      openConfirmModal: (msg, onConfirm) => onConfirm(),
      isLimitedAmmoWeapon: ShipSheetsView.methods.isLimitedAmmoWeapon,
      getWeaponCategory: ShipSheetsView.methods.getWeaponCategory,
      updateShip: vi.fn(),
    };

    ShipSheetsView.methods.resetShipStats.call(vm);

    // HP restored to max
    expect(vm.selectedShip.current_hull_points).toBe(15);
    expect(vm.selectedShip.current_hp).toBe(15);

    // DCR restored to Assault Scout preset rating (35)
    expect(vm.selectedShip.dcr).toBe(35);

    // Ammo restored for limited-ammo weapons
    expect(vm.selectedShip.weapons[1].ammo_current).toBe(4);
    expect(vm.selectedShip.weapons[2].ammo_current).toBe(2);

    expect(vm.updateShip).toHaveBeenCalled();
  });
});

describe('ShipSheetsView - Ship Sheets Left Navigation Reordering', () => {
  it('determines reordering permission based on GameMaster role', () => {
    const vmGM = {
      isGm: true,
      canReorder: ShipSheetsView.methods.canReorder,
    };
    const vmPlayer = {
      isGm: false,
      canReorder: ShipSheetsView.methods.canReorder,
    };
    expect(vmGM.canReorder(null)).toBe(false);
    expect(vmGM.canReorder({ id: 1, user_id: 2 })).toBe(true);
    expect(vmPlayer.canReorder({ id: 1, user_id: 1 })).toBe(false);
  });

  it('moves ship up and down, updates local array optimistically, and dispatches PUT /api/ships/reorder', async () => {
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
        ships: [
          { id: 201, name: 'Ship A' },
          { id: 202, name: 'Ship B' },
          { id: 203, name: 'Ship C' },
        ],
        errorMessage: '',
        moveShip: ShipSheetsView.methods.moveShip,
        saveShipOrder: ShipSheetsView.methods.saveShipOrder,
      };

      // Move Ship B up (index 1 + -1 -> index 0)
      await vm.moveShip(1, -1);
      expect(vm.ships.map(s => s.id)).toEqual([202, 201, 203]);
      expect(requestedUrl).toBe('/api/ships/reorder');
      expect(requestedBody).toEqual({ order: [202, 201, 203] });

      // Move Ship B down (index 0 + 1 -> index 1)
      await vm.moveShip(0, 1);
      expect(vm.ships.map(s => s.id)).toEqual([201, 202, 203]);
      expect(requestedBody).toEqual({ order: [201, 202, 203] });

      // Boundary checks (move top item up, or bottom item down does nothing)
      requestedUrl = null;
      await vm.moveShip(0, -1);
      expect(requestedUrl).toBeNull();

      await vm.moveShip(2, 1);
      expect(requestedUrl).toBeNull();
    } finally {
      global.fetch = origFetch;
    }
  });

  it('rolls back optimistic ship order and sets errorMessage on API failure', async () => {
    const origFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Cannot reorder sheets you do not own' }),
    });

    try {
      const initial = [
        { id: 201, name: 'Ship A' },
        { id: 202, name: 'Ship B' },
      ];
      const vm = {
        ships: [...initial],
        errorMessage: '',
        moveShip: ShipSheetsView.methods.moveShip,
        saveShipOrder: ShipSheetsView.methods.saveShipOrder,
      };

      await vm.moveShip(0, 1);
      // On error, should rollback to original order
      expect(vm.ships.map(s => s.id)).toEqual([201, 202]);
      expect(vm.errorMessage).toBe('Cannot reorder sheets you do not own');
    } finally {
      global.fetch = origFetch;
    }
  });

  it('reorders ship list on socket event sheets:reordered while preserving selectedShip', () => {
    const ship1 = { id: 201, name: 'Ship 1' };
    const ship2 = { id: 202, name: 'Ship 2' };
    const ship3 = { id: 203, name: 'Ship 3' };

    const vm = {
      ships: [ship1, ship2, ship3],
      selectedShip: ship2,
      handleSheetsReordered: ShipSheetsView.methods.handleSheetsReordered,
    };

    // Reorder payload for ship
    vm.handleSheetsReordered({
      type: 'ship',
      order: [203, 201, 202],
    });

    expect(vm.ships.map(s => s.id)).toEqual([203, 201, 202]);
    expect(vm.selectedShip).toBe(ship2);

    // Ignores events for character type
    vm.handleSheetsReordered({
      type: 'character',
      order: [202, 201, 203],
    });
    expect(vm.ships.map(s => s.id)).toEqual([203, 201, 202]);
  });

  it('handles drag and drop reordering for ships', async () => {
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
        ships: [
          { id: 11, name: 'First Ship' },
          { id: 12, name: 'Second Ship' },
          { id: 13, name: 'Third Ship' },
        ],
        draggedShipIndex: 0,
        dragOverShipIndex: 2,
        errorMessage: '',
        onDrop: ShipSheetsView.methods.onDrop,
        saveShipOrder: ShipSheetsView.methods.saveShipOrder,
      };

      const mockEvent = {
        preventDefault: vi.fn(),
      };

      await vm.onDrop(mockEvent, 2);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(vm.ships.map(s => s.id)).toEqual([12, 13, 11]);
      expect(sentOrder).toEqual([12, 13, 11]);
      expect(vm.draggedShipIndex).toBeNull();
      expect(vm.dragOverShipIndex).toBeNull();
    } finally {
      global.fetch = origFetch;
    }
  });

  describe('Ship Hull Size Calculation & Badge Display', () => {
    it('calculates ship hull size based on official rules, explicit hull_size, or hull points', () => {
      const getShipHullSize = ShipSheetsView.methods.getShipHullSize;

      // Null or empty ship
      expect(getShipHullSize(null)).toBe(1);
      expect(getShipHullSize({})).toBe(1);

      // Explicit hull_size or size
      expect(getShipHullSize({ hull_size: 8 })).toBe(8);
      expect(getShipHullSize({ size: 12 })).toBe(12);

      // Official warship and civilian ship presets
      expect(getShipHullSize({ ship_type: 'Fighter' })).toBe(1);
      expect(getShipHullSize({ type: 'Assault Scout' })).toBe(3);
      expect(getShipHullSize({ ship_type: 'Corvette' })).toBe(4);
      expect(getShipHullSize({ ship_type: 'Frigate' })).toBe(5);
      expect(getShipHullSize({ ship_type: 'Destroyer' })).toBe(6);
      expect(getShipHullSize({ ship_type: 'Minelayer' })).toBe(7);
      expect(getShipHullSize({ ship_type: 'Light Cruiser' })).toBe(14);
      expect(getShipHullSize({ ship_type: 'Heavy Cruiser' })).toBe(16);
      expect(getShipHullSize({ ship_type: 'Assault Carrier' })).toBe(15);
      expect(getShipHullSize({ ship_type: 'Battleship' })).toBe(20);
      expect(getShipHullSize({ ship_type: 'Small Freighter' })).toBe(5);
      expect(getShipHullSize({ ship_type: 'Medium Freighter' })).toBe(10);
      expect(getShipHullSize({ ship_type: 'Heavy Freighter' })).toBe(15);
      expect(getShipHullSize({ ship_type: 'Space Station' })).toBe(1);

      // Unknown or custom ship calculated from hull points (e.g. 30 HP / 5 = 6)
      expect(getShipHullSize({ ship_type: 'Custom Vessel', max_hull_points: 30 })).toBe(6);
      expect(getShipHullSize({ ship_type: 'Unknown Saucer', hull_points: 45 })).toBe(9);
    });

    it('computes shipHullSize from selectedShip', () => {
      const vm = {
        selectedShip: {
          ship_type: 'Frigate',
        },
        getShipHullSize: ShipSheetsView.methods.getShipHullSize,
      };

      const size = ShipSheetsView.computed.shipHullSize.call(vm);
      expect(size).toBe(5);
    });

    it('renders the Hull Size badge in the header when a ship is selected', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([{ id: 1, name: 'Scimitar', ship_type: 'Assault Scout', hull_points: 15, current_hp: 15 }]),
      });
      try {
        const wrapper = mount(ShipSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();
        const badge = wrapper.find('.badge-hull-size');
        expect(badge.exists()).toBe(true);
        expect(badge.text()).toBe('Hull Size 3');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('displays "Ships" in sidebar header', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(path.resolve(__dirname, '../src/views/ShipSheetsView.vue'), 'utf-8');
      expect(content).toMatch(/<div class="sidebar-header">\s*<h3>Ships<\/h3>/);
    });
  });

  describe('Ship Sheets - Player Assignment (GM only)', () => {
    it('fetches registered users on mount when user is GameMaster and renders player assignment dropdown', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 1, username: 'gmUser', role: 'GameMaster' };

      const origFetch = global.fetch;
      let putBody = null;
      global.fetch = vi.fn().mockImplementation((url, opts) => {
        if (url === '/api/ships' && (!opts || opts.method === undefined || opts.method === 'GET')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 10,
              user_id: 2,
              owner_username: 'playerAlice',
              name: 'Alice Fighter',
              ship_type: 'Fighter',
              hull_points: 50,
              current_hp: 50,
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
        if (url === '/api/ships/10' && opts?.method === 'PUT') {
          putBody = JSON.parse(opts.body);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: 10,
              user_id: putBody.user_id,
              owner_username: 'gmUser',
              name: 'Alice Fighter',
              ship_type: 'Fighter',
              hull_points: 50,
              current_hp: 50,
            }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(ShipSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        expect(global.fetch).toHaveBeenCalledWith('/api/auth/users', expect.any(Object));
        const playerSelect = wrapper.find('.player-select-wrap select');
        expect(playerSelect.exists()).toBe(true);

        // Selecting a new player invokes updateShip with the selected user_id
        await playerSelect.setValue('1');
        await flushPromises();
        expect(putBody).not.toBeNull();
        expect(Number(putBody.user_id)).toBe(1);
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
        if (url === '/api/ships') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 10,
              user_id: 2,
              owner_username: 'playerAlice',
              name: 'Alice Fighter',
              ship_type: 'Fighter',
              hull_points: 50,
              current_hp: 50,
            }]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      try {
        const wrapper = mount(ShipSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        expect(wrapper.find('.player-select-wrap select').exists()).toBe(false);
        const badge = wrapper.find('.badge-player');
        expect(badge.exists()).toBe(true);
        expect(badge.text()).toContain('playerAlice');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('includes Assigned Player select in Create Ship modal when isGm is true', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 1, username: 'gmUser', role: 'GameMaster' };

      const vm = {
        isGm: true,
        registeredUsers: [
          { id: 1, username: 'gmUser', role: 'GameMaster' },
          { id: 2, username: 'playerAlice', role: 'Player' },
        ],
        newShipForm: {},
        showCreateModal: false,
        selectedPresetType: 'Assault Scout',
        presets: [{ type: 'Assault Scout', adf: 5, mr: 4, dcr: 35, hull_points: 15, weapons: [], defenses: {} }],
        applyPresetToCreateForm: ShipSheetsView.methods.applyPresetToCreateForm,
        normalizeWeapons: ShipSheetsView.methods.normalizeWeapons,
      };

      ShipSheetsView.methods.openCreateModal.call(vm);
      expect(vm.showCreateModal).toBe(true);
      expect(vm.newShipForm.user_id).toBe(1);
    });
  });

  describe('ShipSheetsView - Ship Defenses Panel Upgrade', () => {
    it('renames defensive screens header to "Defenses" and includes "+ Add Defense" button', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(path.resolve(__dirname, '../src/views/ShipSheetsView.vue'), 'utf-8');
      expect(content).toMatch(/<h4>Defenses<\/h4>/);
      expect(content).not.toMatch(/<h4>Defensive Screens<\/h4>/);
      expect(content).toMatch(/<button[^>]*class="btn-secondary"[^>]*@click="openAddDefenseModal"[^>]*>\+ Add Defense<\/button>/);
    });

    it('opens and closes add defense modal via openAddDefenseModal and Escape key', () => {
      const vm = {
        showAddDefenseModal: false,
        customDefenseForm: null,
        defenseFilterTab: 'All',
      };
      ShipSheetsView.methods.openAddDefenseModal.call(vm);
      expect(vm.showAddDefenseModal).toBe(true);
      expect(vm.customDefenseForm).toEqual({
        name: '',
        type: 'toggle',
        current: 1,
        max: 1,
        description: '',
      });
      expect(vm.defenseFilterTab).toBe('All');

      ShipSheetsView.methods.handleKeydown.call(vm, { key: 'Escape' });
      expect(vm.showAddDefenseModal).toBe(false);
    });

    it('equips a canonical defense from catalog to selectedShip.defenses and calls updateShip', () => {
      let updated = false;
      const vm = {
        showAddDefenseModal: true,
        selectedShip: {
          defenses: {
            items: [],
          },
        },
        normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
        updateShip() {
          updated = true;
        },
      };

      const protonScreen = {
        id: 'proton_screen',
        name: 'Proton Screen',
        type: 'toggle',
        category: 'Energy Screen',
        description: 'Absorbs proton and energy attacks',
      };

      ShipSheetsView.methods.equipDefense.call(vm, protonScreen);

      expect(vm.showAddDefenseModal).toBe(false);
      expect(updated).toBe(true);
      expect(vm.selectedShip.defenses.items.length).toBe(1);
      expect(vm.selectedShip.defenses.items[0].name).toBe('Proton Screen');
      expect(vm.selectedShip.defenses.items[0].type).toBe('toggle');
      expect(vm.selectedShip.defenses.items[0].online).toBe(true);
    });

    it('equips a custom defense (counter type) to selectedShip.defenses and calls updateShip', () => {
      let updated = false;
      const vm = {
        showAddDefenseModal: true,
        customDefenseForm: {
          name: 'ECM Jammer Pod',
          type: 'counter',
          current: 3,
          max: 3,
          description: 'Deployable jamming pods',
        },
        selectedShip: {
          defenses: {
            items: [],
          },
        },
        normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
        updateShip() {
          updated = true;
        },
      };

      ShipSheetsView.methods.equipCustomDefense.call(vm);

      expect(vm.showAddDefenseModal).toBe(false);
      expect(updated).toBe(true);
      expect(vm.selectedShip.defenses.items.length).toBe(1);
      expect(vm.selectedShip.defenses.items[0].name).toBe('ECM Jammer Pod');
      expect(vm.selectedShip.defenses.items[0].type).toBe('counter');
      expect(vm.selectedShip.defenses.items[0].current).toBe(3);
      expect(vm.selectedShip.defenses.items[0].max).toBe(3);
    });

    it('removes an equipped defense using removeDefense and calls updateShip', () => {
      let updated = false;
      const vm = {
        selectedShip: {
          defenses: {
            reflective_hull: true,
            items: [
              { id: 'd1', name: 'Reflective Hull', type: 'toggle', online: true },
              { id: 'd2', name: 'Masking Screens', type: 'counter', current: 2, max: 2 },
            ],
          },
        },
        normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
        updateShip() {
          updated = true;
        },
      };

      ShipSheetsView.methods.removeDefense.call(vm, 0);

      expect(updated).toBe(true);
      expect(vm.selectedShip.defenses.items.length).toBe(1);
      expect(vm.selectedShip.defenses.items[0].name).toBe('Masking Screens');
      expect(vm.selectedShip.defenses.reflective_hull).toBe(false);
    });

    it('toggles defense online/offline status using toggleDefense and decrements counter using useDefenseCounter', () => {
      let updatedCount = 0;
      const toggleItem = { id: 'd1', name: 'Proton Screen', type: 'toggle', online: false };
      const counterItem = { id: 'd2', name: 'Masking Screens', type: 'counter', current: 2, max: 2 };

      const vm = {
        selectedShip: {
          defenses: {
            items: [toggleItem, counterItem],
          },
        },
        normalizeDefenses: ShipSheetsView.methods.normalizeDefenses,
        updateShip() {
          updatedCount++;
        },
      };

      ShipSheetsView.methods.toggleDefense.call(vm, toggleItem);
      expect(toggleItem.online).toBe(true);
      expect(updatedCount).toBe(1);

      ShipSheetsView.methods.useDefenseCounter.call(vm, counterItem);
      expect(counterItem.current).toBe(1);
      expect(updatedCount).toBe(2);

      // Does not decrement below zero
      counterItem.current = 0;
      ShipSheetsView.methods.useDefenseCounter.call(vm, counterItem);
      expect(counterItem.current).toBe(0);
      expect(updatedCount).toBe(2);
    });

    it('maintains backwards compatibility for normalizeDefenses with presets and syncs legacy keys', () => {
      const legacyDefenses = {
        reflective_hull: true,
        masking_screens_max: 2,
        masking_screens_current: 2,
        icm_max: 6,
        icm_current: 5,
      };

      const normalized = ShipSheetsView.methods.normalizeDefenses(legacyDefenses);
      expect(normalized.reflective_hull).toBe(true);
      expect(normalized.masking_screens_max).toBe(2);
      expect(normalized.masking_screens_current).toBe(2);
      expect(normalized.icm_max).toBe(6);
      expect(normalized.icm_current).toBe(5);
      expect(Array.isArray(normalized.items)).toBe(true);
      expect(normalized.items.length).toBe(3);

      const rhItem = normalized.items.find((i) => i.name === 'Reflective Hull');
      expect(rhItem).toBeDefined();
      expect(rhItem.type).toBe('toggle');
      expect(rhItem.online).toBe(true);

      const msItem = normalized.items.find((i) => i.name === 'Masking Screens');
      expect(msItem).toBeDefined();
      expect(msItem.type).toBe('counter');
      expect(msItem.max).toBe(2);
      expect(msItem.current).toBe(2);

      const icmItem = normalized.items.find((i) => i.name === 'ICMs');
      expect(icmItem).toBeDefined();
      expect(icmItem.type).toBe('counter');
      expect(icmItem.max).toBe(6);
      expect(icmItem.current).toBe(5);
    });

    it('renders Online/Damaged/Offline status select for both toggle and counter defenses and syncs status changes', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([{
          id: 1,
          name: 'UPF Defender',
          hull_size: 8,
          defenses: {
            reflective_hull: true,
            masking_screens_max: 2,
            masking_screens_current: 2,
            icm_max: 6,
            icm_current: 5,
          },
          weapons: [],
        }]),
      });

      try {
        const wrapper = mount(ShipSheetsView);
        await wrapper.vm.$nextTick();
        await new Promise((r) => setTimeout(r, 20));
        await wrapper.vm.$nextTick();

        const defenseSelects = wrapper.findAll('.defense-status-select');
        expect(defenseSelects.length).toBe(3);

        // Verify each select has Online, Damaged, and Offline options
        for (const select of defenseSelects) {
          const optionValues = select.findAll('option').map((o) => o.element.value);
          expect(optionValues).toEqual(['Online', 'Damaged', 'Offline']);
          expect(select.classes()).toContain('status-select');
          expect(select.classes()).toContain('online');
        }

        // Changing toggle defense (Reflective Hull) status to Damaged updates status, online flag, and legacy key
        await defenseSelects[0].setValue('Damaged');
        expect(wrapper.vm.selectedShip.defenses.items[0].status).toBe('Damaged');
        expect(wrapper.vm.selectedShip.defenses.items[0].online).toBe(false);
        expect(wrapper.vm.selectedShip.defenses.reflective_hull).toBe(false);
        expect(defenseSelects[0].classes()).toContain('damaged');

        // Changing counter defense (Masking Screens) status to Offline disables its action button
        const actionBtns = wrapper.findAll('.defense-counter-box .btn-action');
        expect(actionBtns[0].text()).toBe('Deploy');
        expect(actionBtns[0].attributes('disabled')).toBeUndefined();
        await defenseSelects[1].setValue('Offline');
        expect(wrapper.vm.selectedShip.defenses.items[1].status).toBe('Offline');
        expect(defenseSelects[1].classes()).toContain('offline');
        expect(actionBtns[0].attributes('disabled')).toBeDefined();
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  describe('ShipSheetsView - Header Reorganization, Download Button, and DCR Meter Tracker', () => {
    it('renders the header top row with ship name, hull size badge, and download button', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([{
          id: 1,
          name: 'Starblade',
          ship_type: 'Assault Scout',
          hull_points: 15,
          current_hp: 15,
          adf: 5,
          mr: 4,
          dcr: 35,
          current_dcr: 35,
        }]),
      });

      try {
        const wrapper = mount(ShipSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const topRow = wrapper.find('.header-top-row');
        expect(topRow.exists()).toBe(true);

        const nameInput = topRow.find('.input-name');
        expect(nameInput.exists()).toBe(true);
        expect(nameInput.element.value).toBe('Starblade');

        const hullBadge = topRow.find('.badge-hull-size');
        expect(hullBadge.exists()).toBe(true);
        expect(hullBadge.text()).toBe('Hull Size 3');

        const downloadBtn = topRow.find('.btn-action-download');
        expect(downloadBtn.exists()).toBe(true);
        expect(downloadBtn.text()).toContain('Download Sheet (.txt)');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('triggers downloadShipAscii when the download button is clicked', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([{
          id: 1,
          name: 'Starblade',
          ship_type: 'Assault Scout',
          hull_points: 15,
          current_hp: 15,
          adf: 5,
          mr: 4,
          dcr: 35,
          current_dcr: 35,
        }]),
      });

      const spy = vi.spyOn(shipExport, 'downloadShipAscii').mockImplementation(() => {});

      try {
        const wrapper = mount(ShipSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const downloadBtn = wrapper.find('.header-top-row .btn-action-download');
        expect(downloadBtn.exists()).toBe(true);
        await downloadBtn.trigger('click');

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].name).toBe('Starblade');
      } finally {
        spy.mockRestore();
        global.fetch = origFetch;
      }
    });

    it('renders Class Preset and Player underneath in the header sub-row', async () => {
      setActivePinia(createPinia());
      const auth = useAuthStore();
      auth.user = { id: 2, username: 'playerAce', role: 'Player' };

      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([{
          id: 1,
          name: 'Starblade',
          ship_type: 'Assault Scout',
          hull_points: 15,
          current_hp: 15,
          owner_username: 'AcePilot',
        }]),
      });

      try {
        const wrapper = mount(ShipSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const subRow = wrapper.find('.header-sub-row');
        expect(subRow.exists()).toBe(true);

        const typeSelect = subRow.find('.type-wrap select.input-type-select');
        expect(typeSelect.exists()).toBe(true);
        expect(typeSelect.element.value).toBe('Assault Scout');

        const playerBadge = subRow.find('.player-badge-wrap .badge-player');
        expect(playerBadge.exists()).toBe(true);
        expect(playerBadge.text()).toContain('AcePilot');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('stacks ADF and MR vertically on the left half below the header', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([{
          id: 1,
          name: 'Starblade',
          ship_type: 'Assault Scout',
          hull_points: 15,
          current_hp: 15,
          adf: 5,
          mr: 4,
          dcr: 35,
        }]),
      });

      try {
        const wrapper = mount(ShipSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const middleGrid = wrapper.find('.middle-section-grid');
        expect(middleGrid.exists()).toBe(true);

        const statsSection = middleGrid.find('.stats-section');
        expect(statsSection.exists()).toBe(true);

        const flightLabel = statsSection.find('.panel-header-simple .tracker-label');
        expect(flightLabel.exists()).toBe(true);
        expect(flightLabel.text()).toBe('FLIGHT STATS');

        const stack = statsSection.find('.flight-stats-stack');
        expect(stack.exists()).toBe(true);

        const statBoxes = stack.findAll('.stat-box');
        expect(statBoxes.length).toBe(2);

        expect(statBoxes[0].find('.stat-label').text()).toBe('ADF');
        expect(statBoxes[0].find('.stat-input').element.value).toBe('5');

        expect(statBoxes[1].find('.stat-label').text()).toBe('MR');
        expect(statBoxes[1].find('.stat-input').element.value).toBe('4');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('configures middle-section-grid to 15% width for Flight Stats, 35% for System Status, and the rest for Trackers', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/views/ShipSheetsView.vue'), 'utf-8');
      expect(content).toMatch(/\.middle-section-grid\s*\{[^}]*grid-template-columns:\s*15%\s+35%\s+1fr;/);
    });

    it('renders Flight Stats with just ADF and MR without written-out explanations', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([{
          id: 1,
          name: 'Starblade',
          ship_type: 'Assault Scout',
          adf: 5,
          mr: 4,
          hull_points: 20,
          current_hp: 20,
          dcr: 40,
          current_dcr: 40,
        }]),
      });

      try {
        const wrapper = mount(ShipSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const statsSection = wrapper.find('.stats-section');
        expect(statsSection.exists()).toBe(true);
        expect(statsSection.text()).toContain('ADF');
        expect(statsSection.text()).toContain('MR');
        expect(statsSection.text()).not.toContain('Acceleration Decision Factor');
        expect(statsSection.text()).not.toContain('Maneuver Rating');
        expect(statsSection.find('.stat-sublabel').exists()).toBe(false);
      } finally {
        global.fetch = origFetch;
      }
    });

    it('renders ship systems damage tracker box with 8 toggleable system buttons in two columns of 4', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([{
          id: 1,
          name: 'Starblade',
          ship_type: 'Assault Scout',
          adf: 5,
          mr: 4,
          hull_points: 20,
          current_hp: 20,
          dcr: 40,
          current_dcr: 40,
          damaged_systems: ['Bridge'],
        }]),
      });

      try {
        const wrapper = mount(ShipSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const systemsSection = wrapper.find('.systems-status-section');
        expect(systemsSection.exists()).toBe(true);

        const expectedLeftSystems = [
          'Drives (ADF)',
          'Steering (MR)',
          'Navigation',
          'Combat Control',
        ];
        const expectedRightSystems = [
          'Bridge',
          'Life Support',
          'Damage Control',
          'Power Grid',
        ];

        const cols = systemsSection.findAll('.systems-status-col');
        expect(cols.length).toBe(2);

        const leftButtons = cols[0].findAll('.system-btn');
        expect(leftButtons.length).toBe(4);
        expectedLeftSystems.forEach((sys, idx) => {
          expect(leftButtons[idx].text()).toBe(sys);
        });

        const rightButtons = cols[1].findAll('.system-btn');
        expect(rightButtons.length).toBe(4);
        expectedRightSystems.forEach((sys, idx) => {
          expect(rightButtons[idx].text()).toBe(sys);
        });

        // Bridge in right col is damaged initially
        expect(rightButtons[0].classes()).toContain('is-damaged');
        expect(rightButtons[0].classes()).toContain('btn-sub');

        // Drives (ADF) in left col is okay initially
        expect(leftButtons[0].classes()).toContain('is-ok');
        expect(leftButtons[0].classes()).toContain('btn-add');

        // Toggle Drives (ADF) to damaged
        await leftButtons[0].trigger('click');
        expect(leftButtons[0].classes()).toContain('is-damaged');

        // Toggle Bridge back to okay
        await rightButtons[0].trigger('click');
        expect(rightButtons[0].classes()).toContain('is-ok');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('styles system buttons with #04bacf text/border, lightened hover glow, uppercase non-bold tracker-label font style, and weapons offline red palette', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/views/ShipSheetsView.vue'), 'utf-8');
      expect(content).toMatch(/\.system-btn\s*\{[^}]*font-weight:\s*500/);
      expect(content).toMatch(/\.system-btn\s*\{[^}]*text-transform:\s*uppercase;/);
      expect(content).toMatch(/\.system-btn\s*\{[^}]*letter-spacing:\s*0\.75px;/);
      expect(content).toMatch(/\.system-btn\.is-ok\s*\{[^}]*color:\s*#04bacf;/);
      expect(content).toMatch(/\.system-btn\.is-ok\s*\{[^}]*border:\s*1px\s+solid\s+#04bacf;/);
      expect(content).toMatch(/\.system-btn\.is-ok\s*\{[^}]*background:\s*#071417;/);
      expect(content).toMatch(/\.system-btn\.is-ok:hover\s*\{[^}]*box-shadow:\s*0\s+0\s+10px\s+rgba\(60,\s*228,\s*247,\s*0\.55\);/);
      expect(content).toMatch(/\.system-btn\.is-damaged\s*\{[^}]*color:\s*#f85149;/);
      expect(content).toMatch(/\.system-btn\.is-damaged\s*\{[^}]*border:\s*1px\s+solid\s+#f8514988;/);
      expect(content).toMatch(/\.system-btn\.is-damaged\s*\{[^}]*background:\s*#000000;/);
    });

    it('renders the compact Hull Points and DCR meter applets in the right column', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([{
          id: 1,
          name: 'Starblade',
          ship_type: 'Assault Scout',
          hull_points: 20,
          current_hp: 15,
          dcr: 40,
          current_dcr: 30,
        }]),
      });

      try {
        const wrapper = mount(ShipSheetsView, {
          global: {
            stubs: {
              ImageBrowserModal: true,
            },
          },
        });
        await flushPromises();

        const trackersCard = wrapper.find('.middle-section-grid .compact-trackers-card');
        expect(trackersCard.exists()).toBe(true);

        // Hull Points Section
        const hpSection = trackersCard.find('.hull-tracker-section');
        expect(hpSection.exists()).toBe(true);
        expect(hpSection.find('.tracker-label').text()).toBe('HULL POINTS (HP)');
        expect(hpSection.find('.btn-action-repair').text()).toBe('Full Repair');
        expect(hpSection.find('.current').text()).toBe('15');
        expect(hpSection.find('.input-max-hp').element.value).toBe('20');
        expect(hpSection.find('.hull-bar-fill').exists()).toBe(true);

        // DCR Section
        const dcrSection = trackersCard.find('.dcr-tracker-section');
        expect(dcrSection.exists()).toBe(true);
        expect(dcrSection.find('.tracker-label').text()).toBe('DAMAGE CONTROL RATING (DCR)');
        expect(dcrSection.find('.btn-action-restore-dcr').text()).toBe('Restore');
        expect(dcrSection.find('.current').text()).toBe('30');
        expect(dcrSection.find('.input-max-dcr').element.value).toBe('40');
        expect(dcrSection.find('.dcr-bar-fill').exists()).toBe(true);

        // Stacked Max HP and Max DCR labels
        const hpMaxLabel = hpSection.find('.max-stat-label');
        const dcrMaxLabel = dcrSection.find('.max-stat-label');
        expect(hpMaxLabel.exists()).toBe(true);
        expect(dcrMaxLabel.exists()).toBe(true);
        expect(hpMaxLabel.html()).toMatch(/Max<br[^>]*>HP/);
        expect(dcrMaxLabel.html()).toMatch(/Max<br[^>]*>DCR/);
      } finally {
        global.fetch = origFetch;
      }
    });

    it('styles Full Repair and Restore buttons with identical width', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/views/ShipSheetsView.vue'), 'utf-8');
      expect(content).toMatch(/\.btn-action-restore-dcr,\s*\.btn-action-repair,\s*\.btn-action-reset\s*\{[^}]*width:\s*96px;[^}]*min-width:\s*96px;[^}]*box-sizing:\s*border-box;[^}]*text-align:\s*center;[^}]*\}/);
    });

    it('computes DCR percentage and matches the exact color scheme of Hull Points', () => {
      const vm = {
        selectedShip: {
          current_dcr: 80,
          max_dcr: 100,
          dcr: 100,
        },
        get dcrPercentage() {
          return ShipSheetsView.computed.dcrPercentage.call(this);
        },
      };

      // > 50% => Green (#4caf50)
      expect(ShipSheetsView.computed.dcrPercentage.call(vm)).toBe(80);
      expect(ShipSheetsView.computed.dcrColor.call(vm)).toBe('#4caf50');

      // 50% >= pct > 25% => Orange (#ff9800)
      vm.selectedShip.current_dcr = 40;
      expect(ShipSheetsView.computed.dcrPercentage.call(vm)).toBe(40);
      expect(ShipSheetsView.computed.dcrColor.call(vm)).toBe('#ff9800');

      // <= 25% => Red (#f44336)
      vm.selectedShip.current_dcr = 20;
      expect(ShipSheetsView.computed.dcrPercentage.call(vm)).toBe(20);
      expect(ShipSheetsView.computed.dcrColor.call(vm)).toBe('#f44336');
    });

    it('supports DCR stepper buttons and delta adjustments with proper clamping', () => {
      let updated = false;
      const vm = {
        selectedShip: {
          current_dcr: 30,
          max_dcr: 50,
          dcr: 50,
        },
        dcrDelta: 10,
        updateShip() {
          updated = true;
        },
      };

      // Adjust DCR +5
      ShipSheetsView.methods.adjustDcr.call(vm, 5);
      expect(vm.selectedShip.current_dcr).toBe(35);
      expect(updated).toBe(true);

      // Adjust DCR -5
      ShipSheetsView.methods.adjustDcr.call(vm, -5);
      expect(vm.selectedShip.current_dcr).toBe(30);

      // Apply DCR damage (-10)
      ShipSheetsView.methods.applyDcrDamage.call(vm);
      expect(vm.selectedShip.current_dcr).toBe(20);
      expect(vm.dcrDelta).toBe(null);

      // Apply DCR repair (+15)
      vm.dcrDelta = 15;
      ShipSheetsView.methods.applyDcrRepair.call(vm);
      expect(vm.selectedShip.current_dcr).toBe(35);
      expect(vm.dcrDelta).toBe(null);

      // Clamping to max_dcr
      ShipSheetsView.methods.adjustDcr.call(vm, 100);
      expect(vm.selectedShip.current_dcr).toBe(50);

      // Clamping to 0
      ShipSheetsView.methods.adjustDcr.call(vm, -200);
      expect(vm.selectedShip.current_dcr).toBe(0);

      // Restore DCR
      ShipSheetsView.methods.restoreDcr.call(vm);
      expect(vm.selectedShip.current_dcr).toBe(50);
    });

    it('resets Hull Points, DCR, and ammo during resetShipStats', () => {
      let updated = false;
      const vm = {
        presets: [{ type: 'Assault Scout', dcr: 35 }],
        selectedShip: {
          ship_type: 'Assault Scout',
          hull_points: 15,
          max_hull_points: 15,
          current_hull_points: 4,
          current_hp: 4,
          dcr: 20,
          max_dcr: 35,
          current_dcr: 20,
          weapons: [
            { name: 'Rocket Battery', ammo_max: 4, ammo_current: 1 },
          ],
        },
        openConfirmModal(msg, onConfirm) {
          onConfirm();
        },
        updateShip() {
          updated = true;
        },
      };

      ShipSheetsView.methods.resetShipStats.call(vm);

      expect(updated).toBe(true);
      expect(vm.selectedShip.current_hull_points).toBe(15);
      expect(vm.selectedShip.current_hp).toBe(15);
      expect(vm.selectedShip.current_dcr).toBe(35);
      expect(vm.selectedShip.weapons[0].ammo_current).toBe(4);
    });

    it('renders "+ New" on the create ship sidebar button', () => {
      const vueFile = fs.readFileSync(path.resolve(__dirname, '../src/views/ShipSheetsView.vue'), 'utf-8');
      expect(vueFile).toMatch(/<button[^>]*class="[^"]*btn-new-ship[^"]*"[^>]*>\s*\+\s*New\s*<\/button>/);
    });

    it('standardizes vertical spacing between cards, flip-burn banner, and notes section', () => {
      const vueFile = fs.readFileSync(path.resolve(__dirname, '../src/views/ShipSheetsView.vue'), 'utf-8');
      expect(vueFile).not.toMatch(/\.flip-burn-ship-banner\s*\{[^}]*margin-top:\s*14px;/);
      expect(vueFile).toMatch(/\.notes-section\s*\{[^}]*margin-top:\s*0;/);
    });
  });
});







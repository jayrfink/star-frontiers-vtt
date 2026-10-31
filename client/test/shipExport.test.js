/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { formatShipAscii, downloadShipAscii } from '../src/utils/shipExport.js';

describe('formatShipAscii Utility', () => {
  const sampleShip = {
    id: 1,
    name: 'UPF Strike Carrier Intrepid',
    ship_type: 'Assault Scout',
    size: 2,
    hull_size: 2,
    adf: 5,
    mr: 4,
    hull_points: 15,
    max_hull_points: 15,
    current_hp: 12,
    current_hull_points: 12,
    dcr: 35,
    max_dcr: 35,
    current_dcr: 30,
    owner_username: 'Commander Scott',
    weapons: [
      { name: 'Laser Battery', damage: '1d10', range: 9, ammo_max: 0, ammo_current: 0 },
      { name: 'Rocket Battery', damage: '2d10', range: 3, ammo_max: 4, ammo_current: 2 },
    ],
    defenses: [
      { name: 'Reflective Hull', active: true },
      { name: 'Masking Screen', active: false },
    ],
    notes: 'Flagship of 3rd Frontier Flotilla. Patrolling Zebulon border.',
  };

  it('formats full ship details into clean ASCII text', () => {
    const text = formatShipAscii(sampleShip);

    expect(text).toContain('STAR FRONTIERS (KNIGHT HAWKS) STARSHIP SPECIFICATION RECORD');
    expect(text).toContain('Vessel Name:  UPF Strike Carrier Intrepid');
    expect(text).toContain('Class Preset: Assault Scout');
    expect(text).toContain('Hull Size:    2');
    expect(text).toContain('Assigned to:  Commander Scott');

    // Stats & Trackers
    expect(text).toContain('Acceleration Decision Factor (ADF): 5');
    expect(text).toContain('Maneuver Rating (MR):                4');
    expect(text).toContain('Hull Points (HP):                    12 / 15');
    expect(text).toContain('Damage Control Rating (DCR):         30 / 35');

    // Defenses & Weapons
    expect(text).toContain('Reflective Hull [ACTIVE]');
    expect(text).toContain('Masking Screen [OFFLINE]');
    expect(text).toContain('Laser Battery: Damage 1d10, Range 9');
    expect(text).toContain('Rocket Battery: Damage 2d10, Range 3 (Ammo: 2/4)');

    // Notes
    expect(text).toContain('Flagship of 3rd Frontier Flotilla. Patrolling Zebulon border.');
  });

  it('handles empty or missing optional fields gracefully', () => {
    const minimalShip = {
      name: 'Drifter',
      type: 'Fighter',
    };

    const text = formatShipAscii(minimalShip);
    expect(text).toContain('Vessel Name:  Drifter');
    expect(text).toContain('Class Preset: Fighter');
    expect(text).toContain('(No defensive systems installed)');
    expect(text).toContain('(No weapons installed)');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('null');
  });

  it('formats multiple populated note panels cleanly in ASCII output', () => {
    const shipWithPanels = {
      name: 'UPF Star Hawk',
      type: 'Corvette',
      note_panels: [
        { id: 'p1', title: 'History', content: 'Constructed at the Cassidine orbital shipyard.' },
        { id: 'p2', title: 'Notes', content: 'Armed with experimental electron battery.' },
        { id: 'p3', title: 'Mission Log', content: 'Patrolled Prenglar star system.' },
      ],
    };

    const text = formatShipAscii(shipWithPanels);
    expect(text).toContain('[ SHIP LOG & MISSION NOTES ]');
    expect(text).toContain('--- History ---');
    expect(text).toContain('Constructed at the Cassidine orbital shipyard.');
    expect(text).toContain('--- Notes ---');
    expect(text).toContain('Armed with experimental electron battery.');
    expect(text).toContain('--- Mission Log ---');
    expect(text).toContain('Patrolled Prenglar star system.');
  });

  it('handles JSON serialized note panels in ship notes string', () => {
    const shipWithJsonNotes = {
      name: 'UPF Star Hawk',
      type: 'Corvette',
      notes: JSON.stringify([
        { id: 'p1', title: 'History', content: 'Participated in Battle of Volturnus.' },
        { id: 'p2', title: 'Notes', content: 'Hull repaired to full integrity.' },
      ]),
    };

    const text = formatShipAscii(shipWithJsonNotes);
    expect(text).toContain('--- History ---');
    expect(text).toContain('Participated in Battle of Volturnus.');
    expect(text).toContain('--- Notes ---');
    expect(text).toContain('Hull repaired to full integrity.');
  });

  it('downloadShipAscii returns export details and creates download link', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();

    const res = downloadShipAscii(sampleShip);

    expect(res).toBeDefined();
    expect(res.filename).toBe('UPF_Strike_Carrier_Intrepid_sheet.txt');
    expect(res.text).toContain('UPF Strike Carrier Intrepid');
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});

/**
 * Star Frontiers (Knight Hawks) Ship Sheet ASCII Export Utility
 * Generates human-readable, plain-text starship sheets for archival and offline reference.
 */

/**
 * Format a ship object into a clean ASCII text document.
 * @param {Object} ship - Star Frontiers ship record
 * @returns {string} Plain ASCII formatted text
 */
export function formatShipAscii(ship = {}) {
  const name = ship.name || 'Unnamed Starship';
  const type = ship.ship_type || ship.type || 'Unknown Type';
  const hullSize = ship.hull_size != null ? ship.hull_size : (ship.size != null ? ship.size : 'N/A');
  const adf = ship.adf != null ? ship.adf : 0;
  const mr = ship.mr != null ? ship.mr : 0;
  const currentHp = ship.current_hull_points ?? ship.current_hp ?? 0;
  const maxHp = ship.max_hull_points ?? ship.hull_points ?? 0;
  const currentDcr = ship.current_dcr ?? ship.dcr ?? 0;
  const maxDcr = ship.max_dcr ?? ship.dcr ?? 0;

  const divider = '='.repeat(80);
  const subDivider = '-'.repeat(80);

  const lines = [
    divider,
    'STAR FRONTIERS (KNIGHT HAWKS) STARSHIP SPECIFICATION RECORD',
    divider,
    `Archived: ${new Date().toISOString()}`,
    '',
    '[ VESSEL IDENTITY & CLASSIFICATION ]',
    subDivider,
    `Vessel Name:  ${name}`,
    `Class Preset: ${type}`,
    `Hull Size:    ${hullSize}`,
  ];

  if (ship.owner_username) {
    lines.push(`Assigned to:  ${ship.owner_username}`);
  }

  lines.push('');
  lines.push('[ TACTICAL PERFORMANCE & HULL STATUS ]');
  lines.push(subDivider);
  lines.push(`Acceleration Decision Factor (ADF): ${adf}`);
  lines.push(`Maneuver Rating (MR):                ${mr}`);
  lines.push(`Hull Points (HP):                    ${currentHp} / ${maxHp}`);
  lines.push(`Damage Control Rating (DCR):         ${currentDcr} / ${maxDcr}`);
  lines.push('');
  lines.push('[ DEFENSIVE SYSTEMS ]');
  lines.push(subDivider);

  // Defenses
  let hasDefenses = false;
  if (Array.isArray(ship.defenses) && ship.defenses.length > 0) {
    ship.defenses.forEach((def) => {
      if (typeof def === 'string') {
        lines.push(`- ${def}`);
        hasDefenses = true;
      } else if (def && typeof def === 'object') {
        const defName = def.name || 'Unknown Defense';
        const status = def.active ? 'ACTIVE' : 'OFFLINE';
        lines.push(`- ${defName} [${status}]`);
        hasDefenses = true;
      }
    });
  } else if (ship.defenses && typeof ship.defenses === 'object') {
    Object.entries(ship.defenses).forEach(([k, v]) => {
      if (v) {
        lines.push(`- ${k}: ${v}`);
        hasDefenses = true;
      }
    });
  }

  if (!hasDefenses) {
    lines.push('(No defensive systems installed)');
  }

  lines.push('');
  lines.push('[ WEAPON SYSTEMS & ORDNANCE ]');
  lines.push(subDivider);

  // Weapons
  let hasWeapons = false;
  if (Array.isArray(ship.weapons) && ship.weapons.length > 0) {
    ship.weapons.forEach((w) => {
      if (typeof w === 'string') {
        lines.push(`- ${w}`);
        hasWeapons = true;
      } else if (w && typeof w === 'object') {
        const wName = w.name || 'Unknown Weapon';
        const dmg = w.damage || w.dmg || 'N/A';
        const range = w.range || 'N/A';
        const ammo = (w.ammo_max !== undefined && w.ammo_max > 0)
          ? ` (Ammo: ${w.ammo_current ?? w.ammo_max}/${w.ammo_max})`
          : '';
        lines.push(`- ${wName}: Damage ${dmg}, Range ${range}${ammo}`);
        hasWeapons = true;
      }
    });
  }

  if (!hasWeapons) {
    lines.push('(No weapons installed)');
  }

  lines.push('');
  lines.push('[ SHIP LOG & MISSION NOTES ]');
  lines.push(subDivider);

  let panels = [];
  if (Array.isArray(ship.note_panels) && ship.note_panels.length > 0) {
    panels = ship.note_panels;
  } else if (typeof ship.notes === 'string' && ship.notes.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(ship.notes);
      if (Array.isArray(parsed)) panels = parsed;
    } catch {}
  }

  if (panels.length > 0) {
    const populated = panels.filter((p) => p && ((p.title && p.title.trim()) || (p.content && p.content.trim())));
    if (populated.length > 0) {
      populated.forEach((p, idx) => {
        const title = (p.title || `Note ${idx + 1}`).trim();
        lines.push(`--- ${title} ---`);
        lines.push((p.content || '').trim() || '(Empty)');
        lines.push('');
      });
      if (lines[lines.length - 1] === '') lines.pop();
    } else {
      lines.push('(No ship notes recorded)');
    }
  } else if (ship.notes && ship.notes.trim()) {
    lines.push(ship.notes.trim());
  } else {
    lines.push('(No ship notes recorded)');
  }
  lines.push('');
  lines.push(divider);

  return lines.join('\n');
}

/**
 * Trigger a browser file download of the ship sheet in ASCII format.
 * @param {Object} ship - Star Frontiers ship record
 * @returns {Object|null} Export details { filename, blob, text } or null if invalid
 */
export function downloadShipAscii(ship) {
  if (!ship) return null;

  const text = formatShipAscii(ship);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const rawName = (ship.name || 'ship').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${rawName || 'ship'}_sheet.txt`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return { filename, blob, text };
}

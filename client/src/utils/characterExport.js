/**
 * Star Frontiers Character Sheet ASCII Export Utility
 * Generates human-readable, plain-text character sheets for archival purposes.
 * Strictly excludes equipment and inventory per player export requirements.
 */

/**
 * Format a character object into a clean ASCII text document.
 * @param {Object} char - Star Frontiers character record
 * @returns {string} Plain ASCII formatted text
 */
export function formatCharacterAscii(char = {}) {
  const name = char.name || 'Unnamed Character';
  const race = char.race || 'Unknown Species';
  const psa = char.psa || 'Military';
  const gender = char.gender || 'N/A';
  const height = char.height || 'N/A';
  const weight = char.weight || 'N/A';

  const str = Number(char.str) || 0;
  const sta = Number(char.sta) || 0;
  const currentSta = char.current_stamina ?? char.current_sta ?? sta;
  const maxSta = char.max_stamina ?? sta;

  const dex = Number(char.dex) || 0;
  const rs = Number(char.rs) || 0;
  const im = Math.floor(rs / 10);
  const imStr = im >= 0 ? `+${im}` : `${im}`;

  const int = Number(char.int) || 0;
  const log = Number(char.log) || 0;
  const per = Number(char.per) || 0;
  const ldr = Number(char.ldr) || 0;

  const currentSeu = char.current_seu ?? char.max_seu ?? 50;
  const maxSeu = char.max_seu ?? 50;

  const punchScore = Math.floor(str / 10) + Math.floor(dex / 10);
  const maxCarry = Math.floor(str / 2);

  const divider = '='.repeat(80);
  const subDivider = '-'.repeat(80);

  const lines = [
    divider,
    'STAR FRONTIERS (ALPHA DAWN) CHARACTER SHEET',
    divider,
    `Archived: ${new Date().toISOString()}`,
    '',
    '[ IDENTITY & DEMOGRAPHICS ]',
    subDivider,
    `Name:        ${name}`,
    `Species:     ${race}`,
    `Primary PSA: ${psa}`,
    `Gender:      ${gender}`,
    `Height:      ${height}`,
    `Weight:      ${weight}`,
    '',
    '[ ABILITY SCORES & COMBAT STATISTICS ]',
    subDivider,
    `STR / STA:   ${str} / ${sta}       (Stamina: ${currentSta} / ${maxSta})`,
    `DEX / RS:    ${dex} / ${rs}       (Initiative Modifier: ${imStr})`,
    `INT / LOG:   ${int} / ${log}`,
    `PER / LDR:   ${per} / ${ldr}`,
    `Energy Pool: ${currentSeu} / ${maxSeu} SEU`,
    `Base Punching Score:   +${punchScore}%`,
    `Max Carry Weight:      ${maxCarry} kg`,
    '',
    '[ SPECIES ABILITIES ]',
    subDivider,
  ];

  // Species Abilities
  let hasAbilities = false;
  if (char.racial_abilities && typeof char.racial_abilities === 'object') {
    if (Array.isArray(char.racial_abilities)) {
      char.racial_abilities.forEach((item) => {
        if (item) {
          lines.push(`- ${item}`);
          hasAbilities = true;
        }
      });
    } else {
      Object.entries(char.racial_abilities).forEach(([key, val]) => {
        lines.push(`- ${key}: ${val}`);
        hasAbilities = true;
      });
    }
  } else if (typeof char.racial_abilities === 'string' && char.racial_abilities.trim()) {
    lines.push(char.racial_abilities.trim());
    hasAbilities = true;
  }

  if (!hasAbilities) {
    lines.push('(None recorded)');
  }

  lines.push('');
  lines.push('[ SKILLS & TRAINING ]');
  lines.push(subDivider);

  // Skills
  let hasSkills = false;
  if (Array.isArray(char.skills) && char.skills.length > 0) {
    char.skills.forEach((skill) => {
      if (typeof skill === 'string') {
        lines.push(`- ${skill}`);
        hasSkills = true;
      } else if (skill && typeof skill === 'object') {
        const skillName = skill.name || 'Unknown Skill';
        const skillLevel = skill.level ?? skill.rank ?? 1;
        lines.push(`- ${skillName} (Level ${skillLevel})`);
        hasSkills = true;
      }
    });
  }

  if (!hasSkills) {
    lines.push('(No skills recorded)');
  }

  lines.push('');
  lines.push('[ BACKGROUND & NOTES ]');
  lines.push(subDivider);

  let panels = [];
  if (Array.isArray(char.note_panels) && char.note_panels.length > 0) {
    panels = char.note_panels;
  } else if (typeof char.notes === 'string' && char.notes.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(char.notes);
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
      lines.push('(No background notes recorded)');
    }
  } else if (char.notes && char.notes.trim()) {
    lines.push(char.notes.trim());
  } else {
    lines.push('(No background notes recorded)');
  }
  lines.push('');
  lines.push(divider);

  return lines.join('\n');
}

/**
 * Trigger a browser file download of the character sheet in ASCII format.
 * @param {Object} char - Star Frontiers character record
 * @returns {Object|null} Export details { filename, blob, text } or null if invalid
 */
export function downloadCharacterAscii(char) {
  if (!char) return null;

  const text = formatCharacterAscii(char);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const rawName = (char.name || 'character').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${rawName || 'character'}_sheet.txt`;

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

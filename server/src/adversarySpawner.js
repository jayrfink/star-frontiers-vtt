import { getTierRingColor } from './tokenImagePipeline.js';
import { formatToken } from './maps.js';
import { formatAdversary } from './adversaries.js';

/**
 * Finds non-overlapping coordinates in a spiral search around the center of the map
 * Supports multi-cell token footprints (size >= 1).
 */
export function findOpenCoordinates(mapWidth, mapHeight, occupiedSet, count, tokenSize = 1) {
  const result = [];
  const size = Math.max(1, tokenSize);
  const centerX = Math.max(0, Math.floor((mapWidth - size) / 2));
  const centerY = Math.max(0, Math.floor((mapHeight - size) / 2));

  const canPlaceToken = (x, y) => {
    if (x < 0 || x + size > mapWidth || y < 0 || y + size > mapHeight) return false;
    for (let dx = 0; dx < size; dx++) {
      for (let dy = 0; dy < size; dy++) {
        if (occupiedSet.has(`${x + dx},${y + dy}`)) return false;
      }
    }
    return true;
  };

  const occupyToken = (x, y) => {
    for (let dx = 0; dx < size; dx++) {
      for (let dy = 0; dy < size; dy++) {
        occupiedSet.add(`${x + dx},${y + dy}`);
      }
    }
  };

  let x = centerX;
  let y = centerY;

  if (canPlaceToken(x, y)) {
    result.push({ x, y });
    occupyToken(x, y);
  }

  // Spiral search: alternate directions expanding outward (Right, Down, Left, Up)
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 },
  ];

  let dir = 0;
  let legLength = 1;
  const maxLeg = Math.max(mapWidth, mapHeight) * 2;

  while (result.length < count && legLength <= maxLeg) {
    for (let k = 0; k < 2 && result.length < count; k++) {
      const { dx, dy } = directions[dir];
      for (let s = 0; s < legLength && result.length < count; s++) {
        x += dx;
        y += dy;
        if (canPlaceToken(x, y)) {
          result.push({ x, y });
          occupyToken(x, y);
        }
      }
      dir = (dir + 1) % 4;
    }
    legLength++;
  }

  // Fallback if map center is congested: scan from top-left
  if (result.length < count) {
    for (let r = 0; r <= mapHeight - size && result.length < count; r++) {
      for (let c = 0; c <= mapWidth - size && result.length < count; c++) {
        if (canPlaceToken(c, r)) {
          result.push({ x: c, y: r });
          occupyToken(c, r);
        }
      }
    }
  }

  return result;
}

/**
 * Registers an adversary template and spawns N numbered token instances on a map
 */
export async function spawnAdversaries({ db, io, mapId, template, count = 1, options = {} }) {
  if (!mapId) throw new Error('mapId is required');
  if (!template) throw new Error('template is required');

  const safeCount = Math.min(50, Math.max(1, parseInt(count, 10) || 1));

  const map = db.prepare('SELECT * FROM maps WHERE id = ?').get(mapId);
  if (!map) throw new Error(`Map with id ${mapId} not found`);

  // 1. Upsert template into adversary_templates table
  const actionsStr = JSON.stringify(template.actions || []);
  const traitsStr = JSON.stringify(template.traits || []);
  const systemDataStr = JSON.stringify(template.system_data || {});

  db.prepare(`
    INSERT INTO adversary_templates (
      id, name, category, threat_tier, token_image_path, token_size,
      hp_max, defense_summary, movement, initiative_mod,
      actions, traits, system_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      threat_tier = excluded.threat_tier,
      token_image_path = excluded.token_image_path,
      token_size = excluded.token_size,
      hp_max = excluded.hp_max,
      defense_summary = excluded.defense_summary,
      movement = excluded.movement,
      initiative_mod = excluded.initiative_mod,
      actions = excluded.actions,
      traits = excluded.traits,
      system_data = excluded.system_data,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    template.template_id,
    template.name,
    template.category || 'npc',
    template.threat_tier || 1,
    template.token_image_path || '',
    template.token_size || 1,
    template.hp_max,
    template.defense_summary || '',
    template.movement || '12 m/s',
    template.initiative_mod || 0,
    actionsStr,
    traitsStr,
    systemDataStr
  );

  const savedTemplateRow = db.prepare('SELECT * FROM adversary_templates WHERE id = ?').get(template.template_id);
  const formattedTemplate = formatAdversary(savedTemplateRow);

  // 2. Fetch existing tokens on map to build occupied coordinate set
  const existingTokens = db.prepare('SELECT x, y, size FROM tokens WHERE map_id = ?').all(mapId);
  const occupiedSet = new Set();
  existingTokens.forEach((t) => {
    const size = t.size || 1;
    for (let dx = 0; dx < size; dx++) {
      for (let dy = 0; dy < size; dy++) {
        occupiedSet.add(`${t.x + dx},${t.y + dy}`);
      }
    }
  });

  // 3. Find open placement coordinates around center
  const tokenSize = template.token_size || 1;
  const targetCoords = findOpenCoordinates(map.width, map.height, occupiedSet, safeCount, tokenSize);

  // 4. Insert N numbered tokens
  const spawnedTokens = [];
  const ringColor = getTierRingColor(template.threat_tier);
  const initialSeu = template.system_data?.seu_max !== undefined ? template.system_data.seu_max : null;
  const tokenLayer = options.layer || 'character';

  const insertStmt = db.prepare(`
    INSERT INTO tokens (
      map_id, template_id, name, color, avatar_url,
      x, y, size, current_hp, max_hp, seu_current, conditions,
      status_effects, layer
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      '[]', ?
    )
  `);

  const runInsertTransaction = db.transaction(() => {
    const tokens = [];
    for (let i = 0; i < safeCount; i++) {
      const coord = targetCoords[i] || { x: 0, y: 0 };
      const label = safeCount === 1 ? template.name : `${template.name} #${i + 1}`;

      const res = insertStmt.run(
        mapId,
        template.template_id,
        label,
        ringColor,
        template.token_image_path || '',
        coord.x,
        coord.y,
        tokenSize,
        template.hp_max,
        template.hp_max,
        initialSeu,
        JSON.stringify([]),
        tokenLayer
      );

      const tokenRow = db.prepare('SELECT * FROM tokens WHERE id = ?').get(res.lastInsertRowid);
      const token = formatToken(tokenRow);
      token.template = formattedTemplate;
      tokens.push(token);
    }
    return tokens;
  });

  const insertedTokens = runInsertTransaction();

  for (const token of insertedTokens) {
    if (io) {
      if (token.layer === 'gm') {
        io.to('role:GameMaster').emit('token:created', { token });
      } else {
        io.emit('token:created', { token });
      }
    }
    spawnedTokens.push(token);
  }

  return {
    template: formattedTemplate,
    tokens: spawnedTokens,
  };
}

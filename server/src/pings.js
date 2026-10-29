import { isGameMaster } from './middleware.js';

const MAX_PINGS_PER_MAP = 50;

// Ephemeral in-memory store: mapId (string) -> Map(userId -> ping)
const activePingsByMap = new Map();

/**
 * Validate that mapId is a positive integer and that the map exists in the database.
 * @param {import('better-sqlite3').Database} db
 * @param {*} mapId
 * @returns {number|null} Valid numeric map ID if valid and exists, else null.
 */
function parseAndValidateMapId(db, mapId) {
  if (mapId === undefined || mapId === null || mapId === '') return null;
  const num = Number(mapId);
  if (!Number.isInteger(num) || num <= 0) return null;
  try {
    const map = db.prepare('SELECT id FROM maps WHERE id = ?').get(num);
    return map ? num : null;
  } catch {
    return null;
  }
}

/**
 * Clear all active pings across all maps (useful for tests and resets).
 */
export function clearAllActivePings() {
  activePingsByMap.clear();
}

/**
 * Get active pings for a specific map.
 * @param {string|number} mapId
 * @returns {Array<Object>}
 */
export function getActivePings(mapId) {
  const mapPings = activePingsByMap.get(String(mapId));
  return mapPings ? Array.from(mapPings.values()) : [];
}

/**
 * Register socket.io event handlers for real-time map pings.
 * @param {import('socket.io').Server} io
 * @param {import('better-sqlite3').Database} db
 */
export function registerPingHandlers(io, db) {
  io.on('connection', (socket) => {
    const session = socket.request?.session;
    const userId = session?.userId;
    if (!userId) {
      return;
    }

    const getUser = db.prepare('SELECT username FROM users WHERE id = ?');

    socket.on('ping:update', (payload) => {
      if (!payload || typeof payload !== 'object') return;
      const { mapId, x, y, isDragging } = payload;

      const validatedMapId = parseAndValidateMapId(db, mapId);
      if (validatedMapId === null) return;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const cleanMapId = String(validatedMapId);
      const userRow = getUser.get(userId);
      const username = userRow?.username || 'Unknown';
      const updatedAt = Date.now();

      const ping = {
        userId,
        username,
        x: Number(x),
        y: Number(y),
        isDragging: Boolean(isDragging),
        updatedAt,
      };

      if (!activePingsByMap.has(cleanMapId)) {
        activePingsByMap.set(cleanMapId, new Map());
      }
      const mapPings = activePingsByMap.get(cleanMapId);

      // Limit the number of tracked pings per map to MAX_PINGS_PER_MAP
      if (!mapPings.has(userId) && mapPings.size >= MAX_PINGS_PER_MAP) {
        // Evict oldest ping by updatedAt
        let oldestUserId = null;
        let oldestTime = Infinity;
        for (const [uid, p] of mapPings.entries()) {
          if (p.updatedAt < oldestTime) {
            oldestTime = p.updatedAt;
            oldestUserId = uid;
          }
        }
        if (oldestUserId !== null) {
          mapPings.delete(oldestUserId);
          io.emit('ping:cleared', { mapId: validatedMapId, userId: oldestUserId });
        }
      }

      mapPings.set(userId, ping);

      io.emit('ping:updated', { mapId: validatedMapId, ping });
    });

    socket.on('ping:clear', (payload) => {
      if (!payload || typeof payload !== 'object') return;
      const { mapId, targetUserId, all } = payload;

      const validatedMapId = parseAndValidateMapId(db, mapId);
      if (validatedMapId === null) return;
      const cleanMapId = String(validatedMapId);

      const isGM = isGameMaster(db, userId);

      if (all === true) {
        if (!isGM) return;
        activePingsByMap.delete(cleanMapId);
        io.emit('ping:cleared', { mapId: validatedMapId, all: true });
        return;
      }

      if (targetUserId !== undefined && targetUserId !== null) {
        const targetId = Number(targetUserId);
        if (!Number.isFinite(targetId)) return;
        if (targetId !== userId && !isGM) {
          return;
        }
        const mapPings = activePingsByMap.get(cleanMapId);
        if (mapPings) {
          mapPings.delete(targetId);
          if (mapPings.size === 0) {
            activePingsByMap.delete(cleanMapId);
          }
        }
        io.emit('ping:cleared', { mapId: validatedMapId, userId: targetId });
        return;
      }

      // Default: clear own ping
      const mapPings = activePingsByMap.get(cleanMapId);
      if (mapPings) {
        mapPings.delete(userId);
        if (mapPings.size === 0) {
          activePingsByMap.delete(cleanMapId);
        }
      }
      io.emit('ping:cleared', { mapId: validatedMapId, userId });
    });

    socket.on('ping:request_sync', (payload) => {
      if (!payload || typeof payload !== 'object') return;
      const { mapId } = payload;
      const validatedMapId = parseAndValidateMapId(db, mapId);
      if (validatedMapId === null) return;
      const cleanMapId = String(validatedMapId);

      const mapPings = activePingsByMap.get(cleanMapId);
      const pings = mapPings ? Array.from(mapPings.values()) : [];
      socket.emit('pings:sync', { mapId: validatedMapId, pings });
    });

    socket.on('disconnect', () => {
      for (const [cleanMapId, mapPings] of activePingsByMap.entries()) {
        if (mapPings.has(userId)) {
          mapPings.delete(userId);
          const mapIdNum = Number(cleanMapId);
          const mapId = Number.isInteger(mapIdNum) ? mapIdNum : cleanMapId;
          if (mapPings.size === 0) {
            activePingsByMap.delete(cleanMapId);
          }
          io.emit('ping:cleared', { mapId, userId });
        }
      }
    });
  });
}

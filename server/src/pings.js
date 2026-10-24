import { isGameMaster } from './middleware.js';

// Ephemeral in-memory store: mapId -> Map(userId -> ping)
const activePingsByMap = new Map();

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
  const mapPings = activePingsByMap.get(mapId);
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

      if (mapId === undefined || mapId === null || mapId === '') return;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

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

      if (!activePingsByMap.has(mapId)) {
        activePingsByMap.set(mapId, new Map());
      }
      activePingsByMap.get(mapId).set(userId, ping);

      io.emit('ping:updated', { mapId, ping });
    });

    socket.on('ping:clear', (payload) => {
      if (!payload || typeof payload !== 'object') return;
      const { mapId, targetUserId, all } = payload;

      if (mapId === undefined || mapId === null || mapId === '') return;

      const isGM = isGameMaster(db, userId);

      if (all === true) {
        if (!isGM) return;
        activePingsByMap.delete(mapId);
        io.emit('ping:cleared', { mapId, all: true });
        return;
      }

      if (targetUserId !== undefined && targetUserId !== null) {
        const targetId = Number(targetUserId);
        if (targetId !== userId && !isGM) {
          return;
        }
        const mapPings = activePingsByMap.get(mapId);
        if (mapPings) {
          mapPings.delete(targetId);
          if (mapPings.size === 0) {
            activePingsByMap.delete(mapId);
          }
        }
        io.emit('ping:cleared', { mapId, userId: targetId });
        return;
      }

      // Default: clear own ping
      const mapPings = activePingsByMap.get(mapId);
      if (mapPings) {
        mapPings.delete(userId);
        if (mapPings.size === 0) {
          activePingsByMap.delete(mapId);
        }
      }
      io.emit('ping:cleared', { mapId, userId });
    });

    socket.on('ping:request_sync', (payload) => {
      if (!payload || typeof payload !== 'object') return;
      const { mapId } = payload;
      if (mapId === undefined || mapId === null || mapId === '') return;

      const mapPings = activePingsByMap.get(mapId);
      const pings = mapPings ? Array.from(mapPings.values()) : [];
      socket.emit('pings:sync', { mapId, pings });
    });

    socket.on('disconnect', () => {
      for (const [mapId, mapPings] of activePingsByMap.entries()) {
        if (mapPings.has(userId)) {
          mapPings.delete(userId);
          if (mapPings.size === 0) {
            activePingsByMap.delete(mapId);
          }
          io.emit('ping:cleared', { mapId, userId });
        }
      }
    });
  });
}

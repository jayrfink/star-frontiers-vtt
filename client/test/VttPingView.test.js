import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ref, computed } from 'vue';

describe('VttPingView Static Template & Socket Verification', () => {
  const rpgPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const spacePath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const rpgContent = fs.readFileSync(rpgPath, 'utf8');
  const spaceContent = fs.readFileSync(spacePath, 'utf8');

  describe('RpgVttView.vue', () => {
    it('declares activePings, activePingsList, and hasMyActivePing reactive properties', () => {
      expect(rpgContent).toMatch(/const activePings\s*=\s*ref\(\{.*\}\)/);
      expect(rpgContent).toMatch(/const activePingsList\s*=\s*computed\(/);
      expect(rpgContent).toMatch(/const hasMyActivePing\s*=\s*computed\(/);
    });

    it('renders the Ping toolbar button with active class binding', () => {
      expect(rpgContent).toMatch(/:class="\{\s*active:\s*activeTool\s*===\s*'ping'\s*\}"/);
      expect(rpgContent).toMatch(/@click="activeTool\s*=\s*'ping'"/);
      expect(rpgContent).toContain('Ping');
    });

    it('renders Clear Ping button when current user has an active ping', () => {
      expect(rpgContent).toMatch(/v-if="hasMyActivePing"[^>]*@click="clearMyPing"/);
      expect(rpgContent).toContain('btn-clear-ping');
      expect(rpgContent).toContain('Clear Ping');
    });

    it('renders Clear All Pings button for GM when active pings exist', () => {
      expect(rpgContent).toMatch(/v-if="isGm\s*&&\s*activePingsList\.length\s*>\s*0"[^>]*@click="clearAllPings"/);
      expect(rpgContent).toContain('btn-clear-all-pings');
      expect(rpgContent).toContain('Clear All Pings');
    });

    it('binds pings and ping events to VttCanvas component', () => {
      expect(rpgContent).toMatch(/:pings="activePingsList"/);
      expect(rpgContent).toMatch(/@ping-update="onPingUpdate"/);
      expect(rpgContent).toMatch(/@ping-dismiss="onPingDismiss"/);
    });

    it('registers and unregisters socket listeners for ping events', () => {
      expect(rpgContent).toContain("socket.on('ping:updated'");
      expect(rpgContent).toContain("socket.on('ping:cleared'");
      expect(rpgContent).toContain("socket.on('pings:sync'");
      expect(rpgContent).toContain("socket.off('ping:updated'");
      expect(rpgContent).toContain("socket.off('ping:cleared'");
      expect(rpgContent).toContain("socket.off('pings:sync'");
    });

    it('includes CSS rules for .btn-clear-ping and .btn-clear-all-pings', () => {
      expect(rpgContent).toContain('.btn-clear-ping');
      expect(rpgContent).toContain('.btn-clear-all-pings');
    });
  });

  describe('SpaceVttView.vue', () => {
    it('declares activePings, activePingsList, and hasMyActivePing reactive properties', () => {
      expect(spaceContent).toMatch(/const activePings\s*=\s*ref\(\{.*\}\)/);
      expect(spaceContent).toMatch(/const activePingsList\s*=\s*computed\(/);
      expect(spaceContent).toMatch(/const hasMyActivePing\s*=\s*computed\(/);
    });

    it('renders the Ping toolbar button with active class binding', () => {
      expect(spaceContent).toMatch(/:class="\{\s*active:\s*activeTool\s*===\s*'ping'\s*\}"/);
      expect(spaceContent).toMatch(/@click="activeTool\s*=\s*'ping'"/);
      expect(spaceContent).toContain('Ping');
    });

    it('renders Clear Ping button when current user has an active ping', () => {
      expect(spaceContent).toMatch(/v-if="hasMyActivePing"[^>]*@click="clearMyPing"/);
      expect(spaceContent).toContain('btn-clear-ping');
      expect(spaceContent).toContain('Clear Ping');
    });

    it('renders Clear All Pings button for GM when active pings exist', () => {
      expect(spaceContent).toMatch(/v-if="isGm\s*&&\s*activePingsList\.length\s*>\s*0"[^>]*@click="clearAllPings"/);
      expect(spaceContent).toContain('btn-clear-all-pings');
      expect(spaceContent).toContain('Clear All Pings');
    });

    it('binds pings and ping events to SpaceVttCanvas component', () => {
      expect(spaceContent).toMatch(/:pings="activePingsList"/);
      expect(spaceContent).toMatch(/@ping-update="onPingUpdate"/);
      expect(spaceContent).toMatch(/@ping-dismiss="onPingDismiss"/);
    });

    it('registers and unregisters socket listeners for ping events', () => {
      expect(spaceContent).toContain("socket.on('ping:updated'");
      expect(spaceContent).toContain("socket.on('ping:cleared'");
      expect(spaceContent).toContain("socket.on('pings:sync'");
      expect(spaceContent).toContain("socket.off('ping:updated'");
      expect(spaceContent).toContain("socket.off('ping:cleared'");
      expect(spaceContent).toContain("socket.off('pings:sync'");
    });

    it('includes CSS rules for .btn-clear-ping and .btn-clear-all-pings', () => {
      expect(spaceContent).toContain('.btn-clear-ping');
      expect(spaceContent).toContain('.btn-clear-all-pings');
    });
  });
});

describe('VTT Ping Synchronization & State Management Simulation', () => {
  let activeMap;
  let activePings;
  let activePingsList;
  let hasMyActivePing;
  let mockSocket;
  let currentUser;

  function createPingManager() {
    activeMap = ref({ id: 'map-42', name: 'Tactical Arena' });
    activePings = ref({});
    activePingsList = computed(() => Object.values(activePings.value));
    hasMyActivePing = computed(() => {
      const myId = currentUser?.id;
      return myId ? !!activePings.value[myId] : false;
    });

    mockSocket = {
      emit: vi.fn(),
      handlers: {},
      on(event, handler) {
        this.handlers[event] = handler;
      },
      off(event) {
        delete this.handlers[event];
      },
      trigger(event, data) {
        if (this.handlers[event]) this.handlers[event](data);
      }
    };

    function onPingUpdate({ x, y, isDragging }) {
      if (!activeMap.value?.id) return;
      const currentUserId = currentUser?.id;
      const currentUsername = currentUser?.username || 'Player';
      mockSocket.emit('ping:update', {
        mapId: activeMap.value.id,
        x,
        y,
        isDragging,
      });

      if (currentUserId) {
        activePings.value = {
          ...activePings.value,
          [currentUserId]: {
            userId: currentUserId,
            username: currentUsername,
            x,
            y,
            isDragging,
            updatedAt: Date.now(),
          },
        };
      }
    }

    function onPingDismiss({ userId }) {
      if (!activeMap.value?.id) return;
      mockSocket.emit('ping:clear', {
        mapId: activeMap.value.id,
        targetUserId: userId,
      });
      if (userId && activePings.value[userId]) {
        const next = { ...activePings.value };
        delete next[userId];
        activePings.value = next;
      }
    }

    function clearMyPing() {
      if (!activeMap.value?.id) return;
      const currentUserId = currentUser?.id;
      mockSocket.emit('ping:clear', {
        mapId: activeMap.value.id,
        targetUserId: currentUserId,
      });
      if (currentUserId && activePings.value[currentUserId]) {
        const next = { ...activePings.value };
        delete next[currentUserId];
        activePings.value = next;
      }
    }

    function clearAllPings() {
      if (!activeMap.value?.id) return;
      mockSocket.emit('ping:clear', {
        mapId: activeMap.value.id,
        all: true,
      });
      activePings.value = {};
    }

    // Socket handlers
    mockSocket.on('ping:updated', ({ mapId, ping }) => {
      if (activeMap.value && mapId === activeMap.value.id && ping?.userId) {
        activePings.value = {
          ...activePings.value,
          [ping.userId]: ping,
        };
      }
    });

    mockSocket.on('ping:cleared', ({ mapId, userId, all }) => {
      if (activeMap.value && mapId === activeMap.value.id) {
        if (all) {
          activePings.value = {};
        } else if (userId) {
          const next = { ...activePings.value };
          delete next[userId];
          activePings.value = next;
        }
      }
    });

    mockSocket.on('pings:sync', ({ mapId, pings }) => {
      if (activeMap.value && mapId === activeMap.value.id) {
        const next = {};
        if (Array.isArray(pings)) {
          for (const p of pings) {
            if (p?.userId) next[p.userId] = p;
          }
        }
        activePings.value = next;
      }
    });

    return {
      onPingUpdate,
      onPingDismiss,
      clearMyPing,
      clearAllPings,
    };
  }

  beforeEach(() => {
    currentUser = { id: 'u1', username: 'TestPilot' };
  });

  it('computes activePingsList and hasMyActivePing accurately', () => {
    const mgr = createPingManager();
    expect(activePingsList.value).toEqual([]);
    expect(hasMyActivePing.value).toBe(false);

    mgr.onPingUpdate({ x: 100, y: 150, isDragging: false });
    expect(activePingsList.value.length).toBe(1);
    expect(activePingsList.value[0].userId).toBe('u1');
    expect(hasMyActivePing.value).toBe(true);
  });

  it('emits ping:update and performs optimistic update on onPingUpdate', () => {
    const mgr = createPingManager();
    mgr.onPingUpdate({ x: 300, y: 400, isDragging: true });

    expect(mockSocket.emit).toHaveBeenCalledWith('ping:update', {
      mapId: 'map-42',
      x: 300,
      y: 400,
      isDragging: true,
    });
    expect(activePings.value['u1']).toBeDefined();
    expect(activePings.value['u1'].x).toBe(300);
    expect(activePings.value['u1'].y).toBe(400);
    expect(activePings.value['u1'].isDragging).toBe(true);
  });

  it('emits ping:clear and removes target on onPingDismiss', () => {
    const mgr = createPingManager();
    mgr.onPingUpdate({ x: 100, y: 200, isDragging: false });
    expect(activePings.value['u1']).toBeDefined();

    mgr.onPingDismiss({ userId: 'u1' });
    expect(mockSocket.emit).toHaveBeenCalledWith('ping:clear', {
      mapId: 'map-42',
      targetUserId: 'u1',
    });
    expect(activePings.value['u1']).toBeUndefined();
    expect(hasMyActivePing.value).toBe(false);
  });

  it('emits ping:clear and resets my ping on clearMyPing', () => {
    const mgr = createPingManager();
    mgr.onPingUpdate({ x: 50, y: 50, isDragging: false });
    expect(hasMyActivePing.value).toBe(true);

    mgr.clearMyPing();
    expect(mockSocket.emit).toHaveBeenCalledWith('ping:clear', {
      mapId: 'map-42',
      targetUserId: 'u1',
    });
    expect(activePings.value['u1']).toBeUndefined();
    expect(hasMyActivePing.value).toBe(false);
  });

  it('emits ping:clear with all=true and empties all active pings on clearAllPings', () => {
    const mgr = createPingManager();
    activePings.value = {
      u1: { userId: 'u1', x: 10, y: 20 },
      u2: { userId: 'u2', x: 30, y: 40 }
    };
    expect(activePingsList.value.length).toBe(2);

    mgr.clearAllPings();
    expect(mockSocket.emit).toHaveBeenCalledWith('ping:clear', {
      mapId: 'map-42',
      all: true,
    });
    expect(activePingsList.value.length).toBe(0);
    expect(hasMyActivePing.value).toBe(false);
  });

  it('handles remote ping:updated socket event only for matching mapId', () => {
    createPingManager();
    // Non-matching mapId
    mockSocket.trigger('ping:updated', {
      mapId: 'other-map',
      ping: { userId: 'u2', username: 'Peer', x: 500, y: 600 }
    });
    expect(activePings.value['u2']).toBeUndefined();

    // Matching mapId
    mockSocket.trigger('ping:updated', {
      mapId: 'map-42',
      ping: { userId: 'u2', username: 'Peer', x: 500, y: 600 }
    });
    expect(activePings.value['u2']).toEqual({
      userId: 'u2',
      username: 'Peer',
      x: 500,
      y: 600
    });
  });

  it('handles remote ping:cleared socket event for single user and all pings', () => {
    createPingManager();
    activePings.value = {
      u1: { userId: 'u1', x: 10, y: 20 },
      u2: { userId: 'u2', x: 30, y: 40 }
    };

    // Remove single user
    mockSocket.trigger('ping:cleared', {
      mapId: 'map-42',
      userId: 'u2'
    });
    expect(activePings.value['u2']).toBeUndefined();
    expect(activePings.value['u1']).toBeDefined();

    // Remove all
    mockSocket.trigger('ping:cleared', {
      mapId: 'map-42',
      all: true
    });
    expect(Object.keys(activePings.value).length).toBe(0);
  });

  it('handles remote pings:sync socket event', () => {
    createPingManager();
    mockSocket.trigger('pings:sync', {
      mapId: 'map-42',
      pings: [
        { userId: 'u2', username: 'Peer2', x: 111, y: 222 },
        { userId: 'u3', username: 'Peer3', x: 333, y: 444 },
      ]
    });
    expect(activePingsList.value.length).toBe(2);
    expect(activePings.value['u2'].x).toBe(111);
    expect(activePings.value['u3'].x).toBe(333);
  });
});

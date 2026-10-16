import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Shared Rolls & Roll Log Integration', () => {
  const rpgViewPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const spaceViewPath = path.resolve(__dirname, '../src/views/SpaceVttView.vue');
  const rpgContent = fs.readFileSync(rpgViewPath, 'utf8');
  const spaceContent = fs.readFileSync(spaceViewPath, 'utf8');

  it('RPG VTT registers socket listeners for roll:created and roll:cleared', () => {
    expect(rpgContent).toContain("socket.on('roll:created'");
    expect(rpgContent).toContain("socket.on('roll:cleared'");
    expect(rpgContent).toContain("socket.off('roll:created')");
    expect(rpgContent).toContain("socket.off('roll:cleared')");
  });

  it('Space VTT registers socket listeners for roll:created and roll:cleared', () => {
    expect(spaceContent).toContain("socket.on('roll:created'");
    expect(spaceContent).toContain("socket.on('roll:cleared'");
    expect(spaceContent).toContain("socket.off('roll:created')");
    expect(spaceContent).toContain("socket.off('roll:cleared')");
  });

  it('fetches roll history from /api/rolls on mount instead of relying solely on localStorage', () => {
    expect(rpgContent).toContain('/api/rolls?mode=rpg');
    expect(spaceContent).toContain('/api/rolls?mode=space');
  });

  it('posts rolls to /api/rolls when rolling percentile or damage', () => {
    expect(rpgContent).toContain("method: 'POST'");
    expect(rpgContent).toContain("body: JSON.stringify");
    expect(rpgContent).toContain("mode: 'rpg'");

    expect(spaceContent).toContain("method: 'POST'");
    expect(spaceContent).toContain("body: JSON.stringify");
    expect(spaceContent).toContain("mode: 'space'");
  });

  it('restricts the Clear button to Game Masters', () => {
    expect(rpgContent).toMatch(/v-if="isGm"[^>]*class="btn-roll-log-clear"/);
    expect(spaceContent).toMatch(/v-if="isGm"[^>]*class="btn-roll-log-clear"/);
  });

  it('renders roller username and role badge in Roll Log HUD', () => {
    expect(rpgContent).toContain('roll-user-badge');
    expect(rpgContent).toContain('item.username');
    expect(spaceContent).toContain('roll-user-badge');
    expect(spaceContent).toContain('item.username');
  });

  it('renders roller username and role badge in floating HUD banners', () => {
    expect(rpgContent).toContain('lastPercentileRoll.username');
    expect(rpgContent).toContain('lastDamageRoll.username');
    expect(spaceContent).toContain('lastPercentileRoll.username');
    expect(spaceContent).toContain('lastDamageRoll.username');
  });

  it('uses formatRollTime helper in Roll Log template for both views', () => {
    expect(rpgContent).toContain('formatRollTime(item)');
    expect(spaceContent).toContain('formatRollTime(item)');
  });

  it('uses lastDamageRoll.dice?.length for breakdown fallback in both views', () => {
    expect(rpgContent).toContain("lastDamageRoll.dice?.length ? lastDamageRoll.dice.join(' + ') : lastDamageRoll.breakdown");
    expect(spaceContent).toContain("lastDamageRoll.dice?.length ? lastDamageRoll.dice.join(' + ') : lastDamageRoll.breakdown");
  });

  it('uses consistent &times; HTML entity for HUD banner close buttons', () => {
    const rpgMatches = rpgContent.match(/class="hud-close"[^>]*>&times;<\/button>/g);
    expect(rpgMatches?.length).toBe(2);
    const spaceMatches = spaceContent.match(/class="hud-close"[^>]*>&times;<\/button>/g);
    expect(spaceMatches?.length).toBe(2);
  });
});

describe('formatRollTime helper behavior', () => {
  function formatRollTime(item) {
    if (!item) return '';
    const raw = item.createdAt || item.timestamp;
    if (!raw) return '';
    const dateStr = typeof raw === 'string' && raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') + 'Z' : raw;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  it('formats ISO 8601 UTC timestamp', () => {
    const res = formatRollTime({ createdAt: '2026-10-16T14:30:15.000Z' });
    expect(res).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('formats SQLite UTC space-delimited timestamp', () => {
    const res = formatRollTime({ createdAt: '2026-10-16 14:30:15' });
    expect(res).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('returns empty string for missing or null items', () => {
    expect(formatRollTime(null)).toBe('');
    expect(formatRollTime({})).toBe('');
  });
});

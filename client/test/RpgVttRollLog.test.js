import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('RpgVttView Roll Log', () => {
  const filePath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const content = fs.readFileSync(filePath, 'utf8');

  it('declares rollLog and isRollLogOpen state', () => {
    expect(content).toMatch(/const rollLog\s*=\s*ref\(\[\]\)/);
    expect(content).toMatch(/const isRollLogOpen\s*=\s*ref\(false\)/);
  });

  it('uses sf_vtt_rpg_roll_log storage key', () => {
    expect(content).toMatch(/sf_vtt_rpg_roll_log/);
  });

  it('caps roll log at 20 items', () => {
    expect(content).toMatch(/rollLog\.value\.length\s*>\s*20/);
  });

  it('includes roll log markup in template with collapsed and expanded states', () => {
    expect(content).toMatch(/class="roll-log-hud"/);
    expect(content).toMatch(/class="btn-roll-log-pill"/);
    expect(content).toMatch(/class="roll-log-card"/);
  });

  it('hooks into rollPercentile and rollDamage', () => {
    const rollPercentileFn = content.slice(content.indexOf('async function rollPercentile'), content.indexOf('async function rollDamage'));
    expect(rollPercentileFn).toMatch(/addRollToLog\(/);

    const rollDamageFn = content.slice(content.indexOf('async function rollDamage'), content.indexOf('function clearDice'));
    expect(rollDamageFn).toMatch(/addRollToLog\(/);
  });
});

describe('Roll Log helper simulation logic', () => {
  function createRollLogManager(maxItems = 20) {
    let log = [];
    return {
      get: () => log,
      add: (entry) => {
        log.unshift(entry);
        if (log.length > maxItems) {
          log = log.slice(0, maxItems);
        }
      },
      clear: () => {
        log = [];
      }
    };
  }

  it('caps entries strictly at 20', () => {
    const mgr = createRollLogManager(20);
    for (let i = 1; i <= 25; i++) {
      mgr.add({ id: String(i), total: i });
    }
    expect(mgr.get().length).toBe(20);
    expect(mgr.get()[0].total).toBe(25);
    expect(mgr.get()[19].total).toBe(6);
  });

  it('clears log completely', () => {
    const mgr = createRollLogManager(20);
    mgr.add({ id: '1', total: 50 });
    expect(mgr.get().length).toBe(1);
    mgr.clear();
    expect(mgr.get().length).toBe(0);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { DiceRollQueue } from '../src/utils/diceRollQueue.js';

describe('DiceRollQueue', () => {
  it('executes single task immediately', async () => {
    const queue = new DiceRollQueue();
    let executed = false;
    await queue.enqueue(async () => {
      executed = true;
      return 42;
    });
    expect(executed).toBe(true);
    expect(queue.isBusy).toBe(false);
  });

  it('serializes rapid successive calls without losing any roll', async () => {
    const queue = new DiceRollQueue();
    const order = [];

    const p1 = queue.enqueue(async () => {
      await new Promise(r => setTimeout(r, 20));
      order.push(1);
      return 'roll 1';
    });

    const p2 = queue.enqueue(async () => {
      await new Promise(r => setTimeout(r, 10));
      order.push(2);
      return 'roll 2';
    });

    const p3 = queue.enqueue(async () => {
      order.push(3);
      return 'roll 3';
    });

    expect(queue.isBusy).toBe(true);
    const results = await Promise.all([p1, p2, p3]);

    expect(results).toEqual(['roll 1', 'roll 2', 'roll 3']);
    expect(order).toEqual([1, 2, 3]);
    expect(queue.isBusy).toBe(false);
  });

  it('safely handles and continues queue if an individual roll throws', async () => {
    const queue = new DiceRollQueue();
    const order = [];

    const p1 = queue.enqueue(async () => {
      throw new Error('Physics collision timeout');
    }).catch(err => err.message);

    const p2 = queue.enqueue(async () => {
      order.push('roll 2');
      return 'success';
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('Physics collision timeout');
    expect(r2).toBe('success');
    expect(order).toEqual(['roll 2']);
    expect(queue.isBusy).toBe(false);
  });

  it('clears pending items and resets busy state on clear()', async () => {
    const queue = new DiceRollQueue();
    let ran1 = false;
    let ran2 = false;

    queue.enqueue(async () => {
      await new Promise(r => setTimeout(r, 50));
      ran1 = true;
    });

    const p2 = queue.enqueue(async () => {
      ran2 = true;
    });

    expect(queue.queueLength).toBe(1);
    queue.clear();
    expect(queue.queueLength).toBe(0);

    await p2;
    expect(ran2).toBe(false);
  });
});

/**
 * Dedicated FIFO execution queue for 3D dice rolls in VTT.
 *
 * Problem:
 * In DiceBox (@3d-dice/dice-box), calling `diceBox.roll()` while a previous roll
 * is animating immediately executes `this.clear()`, wiping out internal active
 * collection state and leaving the previous roll's Promise permanently unfulfilled
 * (orphaned), losing the first roll.
 *
 * Solution:
 * When users click roll buttons in quick succession:
 * 1. An action function is enqueued into `enqueueDiceRoll`.
 * 2. If the 3D canvas is already busy with an active roll, subsequent calls wait in order.
 * 3. A configurable visual timeout (e.g., 2000ms) or maximum animation duration ensures
 *    that rapid subsequent rolls can either gracefully let the previous roll complete/settle,
 *    or if rolled in ultra-fast succession without awaiting settled physics, the roll
 *    captures its result and logs it immediately to the server roll log and local roll log.
 */

class DiceRollQueue {
  constructor() {
    this._queue = [];
    this._isProcessing = false;
  }

  /**
   * Enqueue a roll execution task.
   * @param {() => Promise<any>} task - Async function executing the roll
   * @returns {Promise<any>}
   */
  async enqueue(task) {
    return new Promise((resolve, reject) => {
      this._queue.push({ task, resolve, reject });
      this._processNext();
    });
  }

  /**
   * Whether a roll is currently being processed or animating.
   * @returns {boolean}
   */
  get isBusy() {
    return this._isProcessing;
  }

  /**
   * Number of rolls currently waiting in queue.
   * @returns {number}
   */
  get queueLength() {
    return this._queue.length;
  }

  async _processNext() {
    if (this._isProcessing || this._queue.length === 0) {
      return;
    }

    this._isProcessing = true;
    const { task, resolve, reject } = this._queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this._isProcessing = false;
      if (this._queue.length > 0) {
        // Execute next roll in sequence
        this._processNext();
      }
    }
  }

  /**
   * Clear any pending tasks (e.g. on view unmount or canvas reset).
   */
  clear() {
    while (this._queue.length > 0) {
      const { resolve } = this._queue.shift();
      resolve(null);
    }
    this._isProcessing = false;
  }
}

export const diceRollQueue = new DiceRollQueue();
export { DiceRollQueue };

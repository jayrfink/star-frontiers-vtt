/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import fs from 'node:fs';
import path from 'node:path';
import VttCanvas from '../src/components/VttCanvas.vue';
import SpaceVttCanvas from '../src/components/SpaceVttCanvas.vue';
import { getPingBadgeBounds } from '../src/utils/pingRenderer.js';

describe('VTT Canvas Ping Integration (VttCanvas & SpaceVttCanvas)', () => {
  const vttSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/VttCanvas.vue'), 'utf-8');
  const spaceSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/SpaceVttCanvas.vue'), 'utf-8');

  describe('Static Contract & Declarations', () => {
    it('declares pings prop with Array/Object support in VttCanvas.vue', () => {
      expect(vttSrc).toContain('pings:');
      expect(vttSrc).toMatch(/pings:\s*\{[\s\S]*type:\s*\[\s*Array,\s*Object\s*\]/);
    });

    it('declares ping-update and ping-dismiss emits in VttCanvas.vue', () => {
      expect(vttSrc).toContain("'ping-update'");
      expect(vttSrc).toContain("'ping-dismiss'");
    });

    it('imports drawAllPings and isPingDismissHit in VttCanvas.vue', () => {
      expect(vttSrc).toContain('drawAllPings');
      expect(vttSrc).toContain('isPingDismissHit');
      expect(vttSrc).toMatch(/from\s+['"]\.\.\/utils\/pingRenderer\.js['"]/);
    });

    it('declares pings prop with Array/Object support in SpaceVttCanvas.vue', () => {
      expect(spaceSrc).toContain('pings:');
      expect(spaceSrc).toMatch(/pings:\s*\{[\s\S]*type:\s*\[\s*Array,\s*Object\s*\]/);
    });

    it('declares ping-update and ping-dismiss emits in SpaceVttCanvas.vue', () => {
      expect(spaceSrc).toContain("'ping-update'");
      expect(spaceSrc).toContain("'ping-dismiss'");
    });

    it('imports drawAllPings and isPingDismissHit in SpaceVttCanvas.vue', () => {
      expect(spaceSrc).toContain('drawAllPings');
      expect(spaceSrc).toContain('isPingDismissHit');
      expect(spaceSrc).toMatch(/from\s+['"]\.\.\/utils\/pingRenderer\.js['"]/);
    });

    it('invokes drawAllPings during canvas rendering in both canvases', () => {
      expect(vttSrc).toContain('drawAllPings(ctx, props.pings');
      expect(spaceSrc).toContain('drawAllPings(ctx, props.pings');
    });

    it('includes cursor-ping class styling in both canvases', () => {
      expect(vttSrc).toContain('cursor-ping');
      expect(spaceSrc).toContain('cursor-ping');
    });
  });

  describe('VttCanvas.vue Interactions', () => {
    let mockCtx;

    beforeEach(() => {
      mockCtx = {
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        roundRect: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        setLineDash: vi.fn(),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
      };
      HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx);
      HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      }));
    });

    it('emits ping-update on mousedown when activeTool is "ping"', async () => {
      const wrapper = mount(VttCanvas, {
        props: {
          map: { id: 1, width: 20, height: 20, grid_size: 40 },
          activeTool: 'ping',
          panX: 0,
          panY: 0,
          zoomLevel: 1.0,
        },
      });

      const container = wrapper.find('.vtt-canvas-container');
      await container.trigger('mousedown', { button: 0, clientX: 200, clientY: 150 });

      expect(wrapper.emitted('ping-update')).toBeTruthy();
      const emitted = wrapper.emitted('ping-update');
      expect(emitted[0][0]).toEqual({
        x: 200,
        y: 150,
        isDragging: true,
      });
      wrapper.unmount();
    });

    it('emits throttled ping-update while dragging ping on mousemove and ends drag on mouseup', async () => {
      const wrapper = mount(VttCanvas, {
        props: {
          map: { id: 1, width: 20, height: 20, grid_size: 40 },
          activeTool: 'ping',
          panX: 0,
          panY: 0,
          zoomLevel: 1.0,
        },
      });

      const container = wrapper.find('.vtt-canvas-container');
      await container.trigger('mousedown', { button: 0, clientX: 100, clientY: 100 });
      expect(wrapper.emitted('ping-update')?.length).toBe(1);

      // Advance time for throttle and trigger mousemove
      vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 50);
      await container.trigger('mousemove', { clientX: 120, clientY: 130 });

      const updates = wrapper.emitted('ping-update');
      expect(updates.length).toBe(2);
      expect(updates[1][0]).toEqual({
        x: 120,
        y: 130,
        isDragging: true,
      });

      // Mouseup ends drag
      await container.trigger('mouseup', { clientX: 125, clientY: 135 });
      const finalUpdates = wrapper.emitted('ping-update');
      expect(finalUpdates.length).toBe(3);
      expect(finalUpdates[2][0]).toEqual({
        x: 125,
        y: 135,
        isDragging: false,
      });
      wrapper.unmount();
    });

    it('emits ping-dismiss when clicking on a ping close badge', async () => {
      const samplePing = {
        userId: 'user-42',
        username: 'Serena',
        x: 200,
        y: 200,
      };
      const bounds = getPingBadgeBounds(samplePing);

      const wrapper = mount(VttCanvas, {
        props: {
          map: { id: 1, width: 20, height: 20, grid_size: 40 },
          activeTool: 'select',
          panX: 0,
          panY: 0,
          zoomLevel: 1.0,
          pings: [samplePing],
        },
      });

      const container = wrapper.find('.vtt-canvas-container');
      // Click precisely inside close button radius
      await container.trigger('mousedown', {
        button: 0,
        clientX: bounds.closeX,
        clientY: bounds.closeY,
      });

      expect(wrapper.emitted('ping-dismiss')).toBeTruthy();
      expect(wrapper.emitted('ping-dismiss')[0][0]).toEqual({
        userId: 'user-42',
      });
      // Should not select token or start ping drag
      expect(wrapper.emitted('ping-update')).toBeFalsy();
      wrapper.unmount();
    });

    it('manages continuous animation frame requests when active pings exist and stops when cleared', async () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      const cafSpy = vi.spyOn(window, 'cancelAnimationFrame');

      const wrapper = mount(VttCanvas, {
        props: {
          map: { id: 1, width: 20, height: 20, grid_size: 40 },
          activeTool: 'select',
          pings: [],
        },
      });

      const initialRafCount = rafSpy.mock.calls.length;

      // Add a ping
      await wrapper.setProps({
        pings: [{ userId: 'u1', username: 'Doc', x: 100, y: 100 }],
      });

      expect(rafSpy.mock.calls.length).toBeGreaterThan(initialRafCount);

      // Clear pings
      await wrapper.setProps({
        pings: [],
      });

      expect(cafSpy).toHaveBeenCalled();
      wrapper.unmount();
    });
  });

  describe('SpaceVttCanvas.vue Interactions', () => {
    let mockCtx;

    beforeEach(() => {
      mockCtx = {
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        roundRect: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        setLineDash: vi.fn(),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
      };
      HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx);
      HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      }));
    });

    it('emits ping-update on mousedown when activeTool is "ping" in SpaceVttCanvas', async () => {
      const wrapper = mount(SpaceVttCanvas, {
        props: {
          map: { id: 2, width: 20, height: 20, grid_size: 40 },
          activeTool: 'ping',
          panX: 0,
          panY: 0,
          zoomLevel: 1.0,
        },
      });

      const container = wrapper.find('.space-vtt-canvas-container');
      await container.trigger('mousedown', { button: 0, clientX: 300, clientY: 250 });

      expect(wrapper.emitted('ping-update')).toBeTruthy();
      expect(wrapper.emitted('ping-update')[0][0]).toEqual({
        x: 300,
        y: 250,
        isDragging: true,
      });
      wrapper.unmount();
    });

    it('emits ping-dismiss when clicking on a ping close badge in SpaceVttCanvas', async () => {
      const samplePing = {
        userId: 'pilot-9',
        username: 'Hawk',
        x: 150,
        y: 150,
      };
      const bounds = getPingBadgeBounds(samplePing);

      const wrapper = mount(SpaceVttCanvas, {
        props: {
          map: { id: 2, width: 20, height: 20, grid_size: 40 },
          activeTool: 'select',
          panX: 0,
          panY: 0,
          zoomLevel: 1.0,
          pings: [samplePing],
        },
      });

      const container = wrapper.find('.space-vtt-canvas-container');
      await container.trigger('mousedown', {
        button: 0,
        clientX: bounds.closeX,
        clientY: bounds.closeY,
      });

      expect(wrapper.emitted('ping-dismiss')).toBeTruthy();
      expect(wrapper.emitted('ping-dismiss')[0][0]).toEqual({
        userId: 'pilot-9',
      });
      wrapper.unmount();
    });

    it('manages continuous animation frame requests when active pings exist in SpaceVttCanvas and stops when cleared', async () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      const cafSpy = vi.spyOn(window, 'cancelAnimationFrame');

      const wrapper = mount(SpaceVttCanvas, {
        props: {
          map: { id: 2, width: 20, height: 20, grid_size: 40 },
          activeTool: 'select',
          pings: [],
        },
      });

      const initialRafCount = rafSpy.mock.calls.length;

      // Add a ping
      await wrapper.setProps({
        pings: [{ userId: 'u2', username: 'Nova', x: 80, y: 80 }],
      });

      expect(rafSpy.mock.calls.length).toBeGreaterThan(initialRafCount);

      // Clear pings
      await wrapper.setProps({
        pings: [],
      });

      expect(cafSpy).toHaveBeenCalled();
      wrapper.unmount();
    });
  });
});

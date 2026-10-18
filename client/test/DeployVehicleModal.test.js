/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DeployVehicleModal from '../src/components/DeployVehicleModal.vue';

describe('DeployVehicleModal.vue', () => {
  const mockVehicles = [
    {
      id: 'ground_car',
      name: 'Ground Car',
      type: 'Ground',
      cost: 5000,
      top_speed_kph: 100,
      top_speed_m_turn: 175,
      accel: 60,
      decel: 40,
      turn_speed: 80,
      passengers: 6,
      cargo_kg: 150,
      max_seu: 100,
      battery_type: 'Type 2 (100 SEU)',
      token_size: 2,
      is_canonical: true,
      description: 'Standard wheeled car',
    },
    {
      id: 'hover_car',
      name: 'Hover Car',
      type: 'Hover',
      cost: 8000,
      top_speed_kph: 160,
      top_speed_m_turn: 250,
      accel: 80,
      decel: 40,
      turn_speed: 70,
      passengers: 6,
      cargo_kg: 100,
      max_seu: 100,
      battery_type: 'Type 2 (100 SEU)',
      token_size: 2,
      is_canonical: true,
      description: 'Skimmer vehicle',
    },
    {
      id: 'custom_buggy',
      name: 'Custom Buggy',
      type: 'Ground',
      cost: 4000,
      top_speed_kph: 80,
      top_speed_m_turn: 130,
      accel: 50,
      decel: 30,
      turn_speed: 60,
      passengers: 2,
      cargo_kg: 80,
      max_seu: 50,
      battery_type: 'Type 1 (50 SEU)',
      token_size: 1,
      is_canonical: false,
      description: 'Custom scout buggy',
    },
  ];

  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === 'POST') {
        const body = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'veh_custom_new',
            ...body,
            is_canonical: false,
          }),
        });
      }
      if (options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockVehicles,
      });
    });
  });

  it('renders modal with Standard Vehicles and Custom Vehicles tabs', async () => {
    const wrapper = mount(DeployVehicleModal, {
      props: {
        modelValue: true,
        isGm: true,
        defaultX: 10,
        defaultY: 10,
      },
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Deploy Vehicle');
    expect(wrapper.text()).toContain('Standard Vehicles');
    expect(wrapper.text()).toContain('Custom Vehicles');
  });

  it('displays canonical vehicles in standard tab and shows selected specs', async () => {
    const wrapper = mount(DeployVehicleModal, {
      props: {
        modelValue: true,
        isGm: true,
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 10));

    expect(wrapper.text()).toContain('Ground Car');
    expect(wrapper.text()).toContain('Hover Car');

    // Select Ground Car
    await wrapper.find('select.vehicle-select').setValue('ground_car');
    expect(wrapper.text()).toContain('Top Speed: 100 kph (175 m/t)');
    expect(wrapper.text()).toContain('Passengers: 6');
    expect(wrapper.text()).toContain('Type 2 (100 SEU)');
  });

  it('emits deploy event with vehicle_data when form submitted', async () => {
    const wrapper = mount(DeployVehicleModal, {
      props: {
        modelValue: true,
        isGm: true,
        defaultX: 5,
        defaultY: 7,
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 10));

    await wrapper.find('select.vehicle-select').setValue('ground_car');
    await wrapper.find('input.driver-input').setValue('Captain UPEX');

    await wrapper.find('form.deploy-form').trigger('submit.prevent');

    expect(wrapper.emitted('deploy')).toBeTruthy();
    const payload = wrapper.emitted('deploy')[0][0];
    expect(payload.name).toBe('Ground Car');
    expect(payload.size).toBe(2);
    expect(payload.x).toBe(5);
    expect(payload.y).toBe(7);
    expect(payload.vehicle_data).toBeDefined();
    expect(payload.vehicle_data.template_id).toBe('ground_car');
    expect(payload.vehicle_data.current_speed).toBe(0);
    expect(payload.vehicle_data.passengers).toBe('Captain UPEX');
  });

  it('allows creating and saving a custom vehicle in custom tab', async () => {
    const wrapper = mount(DeployVehicleModal, {
      props: {
        modelValue: true,
        isGm: true,
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.find('button.tab-custom').trigger('click');

    expect(wrapper.find('input.custom-name-input').exists()).toBe(true);
  });

  it('creates a custom vehicle via API and selects it', async () => {
    const wrapper = mount(DeployVehicleModal, {
      props: {
        modelValue: true,
        isGm: true,
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 10));

    await wrapper.find('button.tab-custom').trigger('click');
    await wrapper.find('input.custom-name-input').setValue('Frontier Scout Buggy');
    await wrapper.find('form.create-custom-form').trigger('submit.prevent');

    await new Promise((r) => setTimeout(r, 10));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/vehicles',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('deletes a custom vehicle via API', async () => {
    const wrapper = mount(DeployVehicleModal, {
      props: {
        modelValue: true,
        isGm: true,
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 10));

    await wrapper.find('button.tab-custom').trigger('click');
    const deleteBtn = wrapper.find('button.delete-custom-btn');
    expect(deleteBtn.exists()).toBe(true);
    await deleteBtn.trigger('click');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/vehicles/custom_buggy',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  it('emits update:modelValue false on close or cancel', async () => {
    const wrapper = mount(DeployVehicleModal, {
      props: {
        modelValue: true,
      },
    });

    await wrapper.find('button.btn-close').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false]);
  });
});

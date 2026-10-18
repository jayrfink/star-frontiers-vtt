/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import VehicleTokenHud from '../src/components/VehicleTokenHud.vue';

describe('VehicleTokenHud.vue', () => {
  const sampleToken = {
    id: 101,
    name: 'Ground Car',
    color: '#ff9800',
    size: 2,
    x: 5,
    y: 5,
    vehicle_data: {
      template_id: 'ground_car',
      name: 'Ground Car',
      type: 'Ground',
      current_speed: 60,
      top_speed: 175,
      accel: 60,
      decel: 40,
      turn_speed: 80,
      current_seu: 90,
      max_seu: 100,
      battery_type: 'Type 2 (100 SEU)',
      damage_conditions: [],
      passengers: 'Driver: Ace',
      cargo_notes: 'Survey supplies',
      description: 'Standard wheeled car',
    },
  };

  it('renders vehicle tactical status, speedometer, and battery gauge', () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    expect(wrapper.text()).toContain('Ground Car');
    expect(wrapper.text()).toContain('60 m/t');
    expect(wrapper.text()).toContain('90 / 100 SEU');
  });

  it('accelerates speed when clicking + Accel button', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const accelBtn = wrapper.find('button.btn-accel');
    expect(accelBtn.exists()).toBe(true);
    await accelBtn.trigger('click');

    expect(wrapper.emitted('update:token')).toBeTruthy();
    const updated = wrapper.emitted('update:token')[0][0];
    // 60 + 60 = 120
    expect(updated.vehicle_data.current_speed).toBe(120);
  });

  it('decelerates speed when clicking - Decel button', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const decelBtn = wrapper.find('button.btn-decel');
    await decelBtn.trigger('click');

    expect(wrapper.emitted('update:token')).toBeTruthy();
    const updated = wrapper.emitted('update:token')[0][0];
    // 60 - 40 = 20
    expect(updated.vehicle_data.current_speed).toBe(20);
  });

  it('stops immediately when clicking Emergency Stop', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const stopBtn = wrapper.find('button.btn-stop');
    await stopBtn.trigger('click');

    expect(wrapper.emitted('update:token')).toBeTruthy();
    const updated = wrapper.emitted('update:token')[0][0];
    expect(updated.vehicle_data.current_speed).toBe(0);
  });

  it('deducts SEU when clicking quick battery chips', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const chip5 = wrapper.find('button.chip-seu-5');
    await chip5.trigger('click');

    expect(wrapper.emitted('update:token')).toBeTruthy();
    const updated = wrapper.emitted('update:token')[0][0];
    // 90 - 5 = 85
    expect(updated.vehicle_data.current_seu).toBe(85);
  });

  it('recharges battery when clicking Recharge button', async () => {
    const drainedToken = {
      ...sampleToken,
      vehicle_data: {
        ...sampleToken.vehicle_data,
        current_seu: 15,
      },
    };
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: drainedToken,
      },
    });

    const rechargeBtn = wrapper.find('button.chip-seu-recharge');
    await rechargeBtn.trigger('click');

    expect(wrapper.emitted('update:token')).toBeTruthy();
    const updated = wrapper.emitted('update:token')[0][0];
    expect(updated.vehicle_data.current_seu).toBe(100);
  });

  it('toggles damage conditions from Vehicle Damage Table', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const conditionBtn = wrapper.find('button.condition-turn-speed');
    await conditionBtn.trigger('click');

    expect(wrapper.emitted('update:token')).toBeTruthy();
    const updated = wrapper.emitted('update:token')[0][0];
    expect(updated.vehicle_data.damage_conditions).toContain('Turn Speed -15');
  });

  it('triggers control and damage dice action events', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const controlRollBtn = wrapper.find('button.btn-roll-control');
    await controlRollBtn.trigger('click');
    expect(wrapper.emitted('roll-control')).toBeTruthy();

    const damageRollBtn = wrapper.find('button.btn-roll-damage');
    await damageRollBtn.trigger('click');
    expect(wrapper.emitted('roll-damage')).toBeTruthy();
  });

  it('emits close event when clicking close button', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const closeBtn = wrapper.find('button.hud-close-btn');
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('updates driver and cargo notes', async () => {
    const wrapper = mount(VehicleTokenHud, {
      props: {
        token: sampleToken,
      },
    });

    const driverInput = wrapper.find('input.driver-notes-input');
    await driverInput.setValue('Driver: Star Knight');
    await driverInput.trigger('change');

    expect(wrapper.emitted('update:token')).toBeTruthy();
    const updated = wrapper.emitted('update:token')[0][0];
    expect(updated.vehicle_data.passengers).toBe('Driver: Star Knight');
  });
});

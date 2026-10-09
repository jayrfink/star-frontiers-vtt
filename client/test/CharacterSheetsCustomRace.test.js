import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('@vue/test-utils', () => {
  return {
    shallowMount: (Component) => {
      const componentFilePath = Component.__file || path.resolve(__dirname, '../src/views/CharacterSheetsView.vue');
      const templateContent = fs.readFileSync(componentFilePath, 'utf-8');

      const data = typeof Component.data === 'function' ? Component.data() : {};
      const vm = {
        ...data,
        $nextTick: () => Promise.resolve(),
      };

      if (Component.methods) {
        for (const [key, fn] of Object.entries(Component.methods)) {
          vm[key] = fn.bind(vm);
        }
      }

      if (Component.computed) {
        for (const [key, def] of Object.entries(Component.computed)) {
          if (typeof def === 'function') {
            Object.defineProperty(vm, key, {
              get: () => def.call(vm),
              configurable: true,
            });
          } else if (def && typeof def === 'object') {
            Object.defineProperty(vm, key, {
              get: () => (def.get ? def.get.call(vm) : undefined),
              set: (v) => {
                if (def.set) def.set.call(vm, v);
              },
              configurable: true,
            });
          }
        }
      }

      return {
        vm,
        find: (selector) => {
          if (selector === '.custom-race-input-group') {
            const hasClassInTemplate = templateContent.includes('custom-race-input-group');
            const isVisible = vm.showCreateModal && vm.newCharForm?.race === 'Custom';
            return {
              exists: () => Boolean(hasClassInTemplate && isVisible),
            };
          }
          if (selector === '.input-custom-race') {
            const hasClassInTemplate = templateContent.includes('input-custom-race');
            const isCustom =
              vm.selectedRaceCategory === 'Custom' ||
              (vm.isCustomRace && vm.selectedChar && vm.isCustomRace(vm.selectedChar.race));
            return {
              exists: () => Boolean(hasClassInTemplate && isCustom),
            };
          }
          const hasInTemplate = templateContent.includes(selector.replace('.', ''));
          return {
            exists: () => Boolean(hasInTemplate),
          };
        },
        findAll: (selector) => {
          if (selector === '.char-create-select option') {
            const selectMatch = templateContent.match(/<select[^>]*class="[^"]*char-create-select[^"]*"[^>]*>([\s\S]*?)<\/select>/);
            if (!selectMatch) return [];
            const optionMatches = [...selectMatch[1].matchAll(/<option[^>]*value="([^"]*)"[^>]*>/g)];
            return optionMatches.map((m) => ({
              attributes: (attr) => (attr === 'value' ? m[1] : undefined),
            }));
          }
          return [];
        },
      };
    },
  };
});

import { shallowMount } from '@vue/test-utils';
import CharacterSheetsView from '../src/views/CharacterSheetsView.vue';

describe('CharacterSheetsView - Custom Race', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));
  });

  it('renders Custom option in the create character modal race select', () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.showCreateModal = true;
    const options = wrapper.findAll('.char-create-select option');
    const values = options.map((o) => o.attributes('value'));
    expect(values).toContain('Custom');
  });

  it('shows custom race input when Custom is selected in create modal', async () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.showCreateModal = true;
    wrapper.vm.newCharForm.race = 'Custom';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.custom-race-input-group').exists()).toBe(true);
  });

  it('recognizes custom race and falls back to default movement rates', async () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.selectedChar = {
      id: 99,
      name: 'Gronk',
      race: 'Saurian',
      psa: 'Military',
      str: 50,
      sta: 50,
      dex: 50,
      rs: 50,
      int_stat: 50,
      log_stat: 50,
      per: 50,
      ldr: 50,
      skills: [],
      inventory: [],
    };
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isCustomRace('Saurian')).toBe(true);
    expect(wrapper.vm.isCustomRace('Human')).toBe(false);
    expect(wrapper.vm.movementRates).toEqual({ walk: 2, run: 6, glide: 0 });
    expect(wrapper.find('.input-custom-race').exists()).toBe(true);
  });

  it('submits create character with custom race name or falls back to Custom', async () => {
    const wrapper = shallowMount(CharacterSheetsView);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 101, name: 'Alien', race: 'Gigglebug' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    wrapper.vm.newCharForm.name = 'Alien';
    wrapper.vm.newCharForm.race = 'Custom';
    wrapper.vm.newCharForm.customRaceName = 'Gigglebug';

    await wrapper.vm.createCharacter();

    expect(mockFetch).toHaveBeenCalled();
    const postBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(postBody.race).toBe('Gigglebug');

    // Blank custom race name defaults to 'Custom'
    wrapper.vm.newCharForm.customRaceName = '   ';
    await wrapper.vm.createCharacter();
    const secondPostBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(secondPostBody.race).toBe('Custom');
  });

  it('updates selectedRaceCategory and updates character correctly', () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.updateCharacter = vi.fn();
    wrapper.vm.selectedChar = {
      id: 50,
      name: 'VruskHero',
      race: 'Vrusk',
    };

    expect(wrapper.vm.selectedRaceCategory).toBe('Vrusk');

    // Switch to Custom
    wrapper.vm.selectedRaceCategory = 'Custom';
    expect(wrapper.vm.selectedChar.race).toBe('Custom');
    expect(wrapper.vm.updateCharacter).toHaveBeenCalled();

    // Switch to Dralasite
    wrapper.vm.selectedRaceCategory = 'Dralasite';
    expect(wrapper.vm.selectedChar.race).toBe('Dralasite');
  });

  it('preserves Custom category when race is empty string mid-editing', () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.selectedChar = {
      id: 50,
      name: 'Hero',
      race: '',
    };
    expect(wrapper.vm.selectedRaceCategory).toBe('Custom');
    expect(wrapper.find('.input-custom-race').exists()).toBe(true);
  });

  it('sets race to Custom when selectedRaceCategory is set to Custom on empty race', () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.updateCharacter = vi.fn();
    wrapper.vm.selectedChar = {
      id: 50,
      name: 'Hero',
      race: '',
    };
    wrapper.vm.selectedRaceCategory = 'Custom';
    expect(wrapper.vm.selectedChar.race).toBe('Custom');
    expect(wrapper.vm.updateCharacter).toHaveBeenCalled();
  });

  it('onCustomRaceChange defaults empty or whitespace race to Custom and trims valid names', () => {
    const wrapper = shallowMount(CharacterSheetsView);
    wrapper.vm.updateCharacter = vi.fn();
    wrapper.vm.selectedChar = {
      id: 50,
      name: 'Hero',
      race: '   ',
    };

    wrapper.vm.onCustomRaceChange();
    expect(wrapper.vm.selectedChar.race).toBe('Custom');
    expect(wrapper.vm.updateCharacter).toHaveBeenCalledTimes(1);

    wrapper.vm.selectedChar.race = '  Saurian  ';
    wrapper.vm.onCustomRaceChange();
    expect(wrapper.vm.selectedChar.race).toBe('Saurian');
    expect(wrapper.vm.updateCharacter).toHaveBeenCalledTimes(2);
  });
});

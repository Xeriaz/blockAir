import { describe, expect, it } from 'vitest';
import {
  assignBlocksInDay,
  clearBlocksInDay,
  createEmptyStore,
  fillNightSleepBlocks,
  loadStore,
  saveStore,
  setDayReflection,
  STORAGE_KEY,
} from '../utils/storage';

describe('storage persistence utilities', () => {
  it('saves and reloads day records and view preferences from localStorage', () => {
    let store = createEmptyStore();
    store = assignBlocksInDay(store, '2026-11-17', [48, 49, 50], {
      categoryId: 'deep-work',
      label: 'Build BlockAir PWA',
    });
    store = setDayReflection(store, '2026-11-17', 'Great morning focus session.');

    expect(saveStore(store)).toBe(true);

    const hydrated = loadStore();
    expect(hydrated.days['2026-11-17']).toBeDefined();
    expect(Object.keys(hydrated.days['2026-11-17'].blocks)).toHaveLength(3);
    expect(hydrated.days['2026-11-17'].blocks[48].categoryId).toBe('deep-work');
    expect(hydrated.days['2026-11-17'].blocks[48].label).toBe('Build BlockAir PWA');
    expect(hydrated.days['2026-11-17'].reflection).toBe('Great morning focus session.');
  });

  it('clears individual blocks cleanly without affecting remaining blocks', () => {
    let store = createEmptyStore();
    store = assignBlocksInDay(store, '2026-11-17', [10, 11, 12], {
      categoryId: 'learning',
      label: 'TypeScript study',
    });
    store = clearBlocksInDay(store, '2026-11-17', [11]);

    expect(store.days['2026-11-17'].blocks[10]).toBeDefined();
    expect(store.days['2026-11-17'].blocks[11]).toBeUndefined();
    expect(store.days['2026-11-17'].blocks[12]).toBeDefined();
  });

  it('fills 44 night sleep blocks without overwriting existing blocks', () => {
    let store = createEmptyStore();
    store = assignBlocksInDay(store, '2026-11-17', [0], {
      categoryId: 'deep-work',
      label: 'Late night deploy',
    });
    store = fillNightSleepBlocks(store, '2026-11-17', false);

    const blocks = store.days['2026-11-17'].blocks;
    expect(Object.keys(blocks)).toHaveLength(44);
    expect(blocks[0].categoryId).toBe('deep-work');
    expect(blocks[1].categoryId).toBe('sleep');
    expect(blocks[35].categoryId).toBe('sleep');
    expect(blocks[36]).toBeUndefined(); // 06:00 waking start
    expect(blocks[136].categoryId).toBe('sleep'); // 22:40 sleep start
  });

  it('recovers gracefully when localStorage contains malformed JSON or out-of-range block keys', () => {
    localStorage.setItem(STORAGE_KEY, '{not-valid-json');
    const fallback = loadStore();
    expect(fallback.days).toEqual({});
    expect(fallback.preferredViewMode).toBe('full24');

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        preferredViewMode: 'waking100',
        days: {
          '2026-11-17': {
            blocks: {
              '999': { categoryId: 'deep-work' },
              '-3': { categoryId: 'deep-work' },
              '42': { categoryId: 'vitality', label: 'Morning walk' },
            },
          },
          'bad-date-key': {
            blocks: { '1': { categoryId: 'sleep' } },
          },
        },
      })
    );

    const sanitized = loadStore();
    expect(sanitized.preferredViewMode).toBe('waking100');
    expect(sanitized.days['bad-date-key']).toBeUndefined();
    expect(Object.keys(sanitized.days['2026-11-17'].blocks)).toEqual(['42']);
  });
});

import { describe, expect, it } from 'vitest';
import {
  assignBlocksInDay,
  clearBlocksInDay,
  createEmptyStore,
  fillCustomSleepBlocks,
  fillNightSleepBlocks,
  loadStore,
  saveStore,
  setDayReflection,
  STORAGE_KEY,
} from '../utils/storage';

describe('storage persistence utilities', () => {
  it('saves and reloads day records from localStorage', () => {
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

  it('fills custom sleep blocks with specified start and end times and supports overwrite', () => {
    let store = createEmptyStore();
    // Pre-assign block 140 (23:20) with deep work
    store = assignBlocksInDay(store, '2026-11-17', [140], {
      categoryId: 'deep-work',
      label: 'Midnight coding',
    });

    // Fill sleep 23:00 to 07:00 (48 blocks), keeping existing
    const res1 = fillCustomSleepBlocks(store, '2026-11-17', '23:00', '07:00', false, 'Night rest');
    expect(res1.filledCount).toBe(47); // 48 - 1 already assigned
    expect(res1.totalCount).toBe(48);
    store = res1.updatedStore;

    let dayBlocks = store.days['2026-11-17'].blocks;
    expect(Object.keys(dayBlocks)).toHaveLength(48);
    // Block 140 retained its deep-work activity
    expect(dayBlocks[140].categoryId).toBe('deep-work');
    expect(dayBlocks[138].categoryId).toBe('sleep');
    expect(dayBlocks[138].label).toBe('Night rest');

    // Now fill with overwrite = true
    const res2 = fillCustomSleepBlocks(store, '2026-11-17', '23:00', '07:00', true, 'Full sleep');
    expect(res2.filledCount).toBe(48);
    store = res2.updatedStore;

    dayBlocks = store.days['2026-11-17'].blocks;
    expect(dayBlocks[140].categoryId).toBe('sleep');
    expect(dayBlocks[140].label).toBe('Full sleep');
  });

  it('recovers gracefully when localStorage contains malformed JSON or out-of-range block keys', () => {
    localStorage.setItem(STORAGE_KEY, '{not-valid-json');
    const fallback = loadStore();
    expect(fallback.days).toEqual({});

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
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
    expect(sanitized.days['bad-date-key']).toBeUndefined();
    expect(Object.keys(sanitized.days['2026-11-17'].blocks)).toEqual(['42']);
  });
});

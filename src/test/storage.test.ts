import { describe, expect, it } from 'vitest';
import {
  assignBlocksInDay,
  clearBlocksInDay,
  createEmptyStore,
  fillCustomSleepBlocks,
  fillCustomWorkBlocks,
  fillNightSleepBlocks,
  loadStore,
  migrateCategoryId,
  saveStore,
  setDayReflection,
  STORAGE_KEY,
} from '../utils/storage';

describe('storage persistence utilities and migration', () => {
  it('correctly migrates legacy category IDs to the 4 Core States', () => {
    // deep-work and learning -> focus
    expect(migrateCategoryId('deep-work')).toBe('focus');
    expect(migrateCategoryId('learning')).toBe('focus');
    expect(migrateCategoryId('focus')).toBe('focus');

    // essentials -> ops
    expect(migrateCategoryId('essentials')).toBe('ops');
    expect(migrateCategoryId('ops')).toBe('ops');

    // vitality, connection, recharge -> vitality
    expect(migrateCategoryId('vitality')).toBe('vitality');
    expect(migrateCategoryId('connection')).toBe('vitality');
    expect(migrateCategoryId('recharge')).toBe('vitality');

    // sleep -> sleep
    expect(migrateCategoryId('sleep')).toBe('sleep');
  });

  it('automatically migrates legacy category IDs when loading from localStorage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        days: {
          '2026-11-15': {
            blocks: {
              0: { categoryId: 'sleep', label: 'Night nap' },
              54: { categoryId: 'deep-work', label: 'Code feature' },
              60: { categoryId: 'learning', label: 'Read docs' },
              72: { categoryId: 'essentials', label: 'Status sync' },
              90: { categoryId: 'connection', label: 'Coffee with team' },
              100: { categoryId: 'recharge', label: 'Meditation' },
              110: { categoryId: 'vitality', label: 'Evening jog' },
            },
          },
        },
        settings: {
          work: {
            categoryId: 'deep-work',
            label: 'Deep work sprint',
          },
        },
      })
    );

    const store = loadStore();
    const blocks = store.days['2026-11-15'].blocks;

    // Zero historical blocks lost, all mapped to 4 core states
    expect(blocks[0].categoryId).toBe('sleep');
    expect(blocks[54].categoryId).toBe('focus');
    expect(blocks[54].label).toBe('Code feature');
    expect(blocks[60].categoryId).toBe('focus');
    expect(blocks[72].categoryId).toBe('ops');
    expect(blocks[72].label).toBe('Status sync');
    expect(blocks[90].categoryId).toBe('vitality');
    expect(blocks[100].categoryId).toBe('vitality');
    expect(blocks[110].categoryId).toBe('vitality');

    // Settings category migrated too
    expect(store.settings?.work.categoryId).toBe('focus');
  });

  it('saves and reloads day records from localStorage', () => {
    let store = createEmptyStore();
    store = assignBlocksInDay(store, '2026-11-17', [48, 49, 50], {
      categoryId: 'focus',
      label: 'Build BlockAir PWA',
    });
    store = setDayReflection(store, '2026-11-17', 'Great morning focus session.');

    expect(saveStore(store)).toBe(true);

    const hydrated = loadStore();
    expect(hydrated.days['2026-11-17']).toBeDefined();
    expect(Object.keys(hydrated.days['2026-11-17'].blocks)).toHaveLength(3);
    expect(hydrated.days['2026-11-17'].blocks[48].categoryId).toBe('focus');
    expect(hydrated.days['2026-11-17'].blocks[48].label).toBe('Build BlockAir PWA');
    expect(hydrated.days['2026-11-17'].reflection).toBe('Great morning focus session.');
  });

  it('clears individual blocks cleanly without affecting remaining blocks', () => {
    let store = createEmptyStore();
    store = assignBlocksInDay(store, '2026-11-17', [10, 11, 12], {
      categoryId: 'focus',
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
      categoryId: 'focus',
      label: 'Late night deploy',
    });
    store = fillNightSleepBlocks(store, '2026-11-17', false);

    const blocks = store.days['2026-11-17'].blocks;
    expect(Object.keys(blocks)).toHaveLength(44);
    expect(blocks[0].categoryId).toBe('focus');
    expect(blocks[1].categoryId).toBe('sleep');
    expect(blocks[35].categoryId).toBe('sleep');
    expect(blocks[36]).toBeUndefined(); // 06:00 waking start
    expect(blocks[136].categoryId).toBe('sleep'); // 22:40 sleep start
  });

  it('fills custom sleep blocks with specified start and end times and supports overwrite', () => {
    let store = createEmptyStore();
    // Pre-assign block 140 (23:20) with focus
    store = assignBlocksInDay(store, '2026-11-17', [140], {
      categoryId: 'focus',
      label: 'Midnight coding',
    });

    // Fill sleep 23:00 to 07:00 (48 blocks), keeping existing
    const res1 = fillCustomSleepBlocks(store, '2026-11-17', '23:00', '07:00', false, 'Night rest');
    expect(res1.filledCount).toBe(47); // 48 - 1 already assigned
    expect(res1.totalCount).toBe(48);
    store = res1.updatedStore;

    let dayBlocks = store.days['2026-11-17'].blocks;
    expect(Object.keys(dayBlocks)).toHaveLength(48);
    // Block 140 retained its focus activity
    expect(dayBlocks[140].categoryId).toBe('focus');
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

  it('fills custom work blocks during daytime hours with chosen category', () => {
    let store = createEmptyStore();
    // 09:00 to 17:00 = 8 hours = 48 blocks (blocks 54 to 101)
    const res = fillCustomWorkBlocks(
      store,
      '2026-11-17',
      '09:00',
      '17:00',
      'focus',
      false,
      'Core focus'
    );
    expect(res.filledCount).toBe(48);
    expect(res.totalCount).toBe(48);
    store = res.updatedStore;

    const dayBlocks = store.days['2026-11-17'].blocks;
    expect(Object.keys(dayBlocks)).toHaveLength(48);
    expect(dayBlocks[54].categoryId).toBe('focus');
    expect(dayBlocks[54].label).toBe('Core focus');
    expect(dayBlocks[101].categoryId).toBe('focus');
    expect(dayBlocks[102]).toBeUndefined(); // 17:00..17:10 is not in 09:00..17:00
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
              '999': { categoryId: 'focus' },
              '-3': { categoryId: 'focus' },
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

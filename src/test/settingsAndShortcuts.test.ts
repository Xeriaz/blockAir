import { describe, expect, it } from 'vitest';
import {
  autoPrefillDay,
  batchPrefillDays,
  createEmptyStore,
  DEFAULT_SETTINGS,
  sanitizeUserSettings,
  updateUserSettings,
} from '../utils/storage';
import {
  buildShortcutUrl,
  parseAndExecuteUrlAction,
  resolveCategory,
} from '../utils/urlActions';

describe('Settings & Auto-Prefill Storage Logic', () => {
  it('sanitizes user settings with defaults and handles malformed input gracefully', () => {
    expect(sanitizeUserSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeUserSettings({})).toEqual(DEFAULT_SETTINGS);

    const custom = sanitizeUserSettings({
      autoPrefillEnabled: true,
      sleep: {
        enabled: true,
        startTime: '22:30',
        endTime: '06:30',
        label: 'My Sleep',
      },
      work: {
        enabled: true,
        startTime: '08:00',
        endTime: '16:00',
        categoryId: 'vitality',
        label: 'Movement Coaching',
        daysOfWeek: [1, 2, 3],
      },
    });

    expect(custom.autoPrefillEnabled).toBe(true);
    expect(custom.sleep.startTime).toBe('22:30');
    expect(custom.sleep.endTime).toBe('06:30');
    expect(custom.sleep.label).toBe('My Sleep');
    expect(custom.work.startTime).toBe('08:00');
    expect(custom.work.endTime).toBe('16:00');
    expect(custom.work.categoryId).toBe('vitality');
    expect(custom.work.daysOfWeek).toEqual([1, 2, 3]);
  });

  it('updates user settings in the store immutably', () => {
    const store = createEmptyStore();
    const updated = updateUserSettings(store, {
      autoPrefillEnabled: true,
    });

    expect(updated.settings?.autoPrefillEnabled).toBe(true);
    expect(store.settings?.autoPrefillEnabled).toBe(false);
  });

  it('does not auto-prefill if autoPrefillEnabled is false and force is false', () => {
    const store = createEmptyStore();
    const dateKey = '2026-11-18'; // Wednesday
    const res = autoPrefillDay(store, dateKey, false);

    expect(res.applied).toBe(false);
    expect(res.filledCount).toBe(0);
    expect(res.updatedStore.days[dateKey]).toBeUndefined();
  });

  it('auto-prefills sleep and work blocks when autoPrefillEnabled is true on a weekday', () => {
    let store = createEmptyStore();
    store = updateUserSettings(store, {
      autoPrefillEnabled: true,
      sleep: {
        enabled: true,
        startTime: '23:00',
        endTime: '07:00',
        label: 'Night sleep',
        overwriteExisting: false,
      },
      work: {
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        categoryId: 'focus',
        label: 'Focus',
        overwriteExisting: false,
        daysOfWeek: [1, 2, 3, 4, 5],
      },
    });

    const dateKey = '2026-11-18'; // Wednesday (day 3)
    const res = autoPrefillDay(store, dateKey, false);

    expect(res.applied).toBe(true);
    expect(res.filledCount).toBe(96); // 48 sleep + 48 work = 96 blocks (16 hours)
    expect(res.sleepCount).toBe(48);
    expect(res.workCount).toBe(48);

    const day = res.updatedStore.days[dateKey];
    expect(day.autoPrefilled).toBe(true);
    // Block 0 (00:00) should be sleep
    expect(day.blocks[0].categoryId).toBe('sleep');
    // Block 54 (09:00) should be focus
    expect(day.blocks[54].categoryId).toBe('focus');
  });

  it('skips work routine on weekends if daysOfWeek is set to weekdays only', () => {
    let store = createEmptyStore();
    store = updateUserSettings(store, {
      autoPrefillEnabled: true,
      sleep: {
        enabled: true,
        startTime: '23:00',
        endTime: '07:00',
        label: 'Night sleep',
        overwriteExisting: false,
      },
      work: {
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        categoryId: 'focus',
        label: 'Focus',
        overwriteExisting: false,
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      },
    });

    const saturdayDateKey = '2026-11-21'; // Saturday (day 6)
    const res = autoPrefillDay(store, saturdayDateKey, false);

    expect(res.applied).toBe(true);
    expect(res.sleepCount).toBe(48);
    expect(res.workCount).toBe(0); // Work skipped on Saturday
    expect(res.filledCount).toBe(48);
  });

  it('supports batch prefilling across multiple dates', () => {
    let store = createEmptyStore();
    store = updateUserSettings(store, {
      autoPrefillEnabled: true,
    });

    const dates = ['2026-11-18', '2026-11-19', '2026-11-20'];
    const res = batchPrefillDays(store, dates, false);

    expect(res.totalFilled).toBe(96 * 3);
    for (const d of dates) {
      expect(res.updatedStore.days[d]?.autoPrefilled).toBe(true);
    }
  });
});

describe('iOS Shortcuts & Deep Link URL Action Handler', () => {
  it('resolves categories by id or partial name case-insensitively and supports legacy aliases', () => {
    expect(resolveCategory('focus').id).toBe('focus');
    expect(resolveCategory('FOCUS').id).toBe('focus');
    expect(resolveCategory('deep-work').id).toBe('focus');
    expect(resolveCategory('learning').id).toBe('focus');
    expect(resolveCategory('ops').id).toBe('ops');
    expect(resolveCategory('essentials').id).toBe('ops');
    expect(resolveCategory('vitality').id).toBe('vitality');
    expect(resolveCategory('connection').id).toBe('vitality');
    expect(resolveCategory('sleep').id).toBe('sleep');
    expect(resolveCategory('unknown-xyz').id).toBe('focus');
  });

  it('builds valid iOS Shortcut URLs with custom query parameters', () => {
    const url = buildShortcutUrl('https://blockair.app/', {
      action: 'log',
      category: 'vitality',
      label: 'Morning Run',
      duration: 30,
    });

    expect(url).toBe(
      'https://blockair.app/?action=log&category=vitality&label=Morning+Run&duration=30'
    );
  });

  it('handles action=log with duration to log consecutive blocks', () => {
    const store = createEmptyStore();
    const activeDateKey = '2026-11-18';
    const query = '?action=log&category=vitality&label=Morning+Run&block=42&duration=30';

    const result = parseAndExecuteUrlAction(query, store, activeDateKey);

    expect(result.handled).toBe(true);
    expect(result.message).toContain('Morning Run');
    expect(result.message).toContain('Vitality & Life');

    const day = result.updatedStore.days[activeDateKey];
    expect(day.blocks[42]?.categoryId).toBe('vitality');
    expect(day.blocks[42]?.label).toBe('Morning Run');
    expect(day.blocks[43]?.categoryId).toBe('vitality');
    expect(day.blocks[44]?.categoryId).toBe('vitality');
    // Block 45 should not be assigned (only 3 blocks = 30m)
    expect(day.blocks[45]).toBeUndefined();
  });

  it('handles action=log with time=HH:MM format', () => {
    const store = createEmptyStore();
    const activeDateKey = '2026-11-18';
    // 09:30 is block 57 (9 * 6 + 3 = 57)
    const query = '?action=log&category=focus&label=Architecture+Design&time=09:30&duration=20';

    const result = parseAndExecuteUrlAction(query, store, activeDateKey);

    expect(result.handled).toBe(true);
    const day = result.updatedStore.days[activeDateKey];
    expect(day.blocks[57]?.categoryId).toBe('focus');
    expect(day.blocks[57]?.label).toBe('Architecture Design');
    expect(day.blocks[58]?.categoryId).toBe('focus');
    expect(day.blocks[59]).toBeUndefined();
  });

  it('handles action=prefill_sleep and action=prefill_work via shortcut', () => {
    const store = createEmptyStore();
    const activeDateKey = '2026-11-18';

    const sleepRes = parseAndExecuteUrlAction('?action=prefill_sleep', store, activeDateKey);
    expect(sleepRes.handled).toBe(true);
    expect(sleepRes.message).toContain('Pre-filled sleep');

    const workRes = parseAndExecuteUrlAction('?action=prefill_work', store, activeDateKey);
    expect(workRes.handled).toBe(true);
    expect(workRes.message).toContain('Pre-filled work schedule');
  });

  it('handles action=settings to open settings modal', () => {
    const store = createEmptyStore();
    const activeDateKey = '2026-11-18';

    const res = parseAndExecuteUrlAction('?action=settings', store, activeDateKey);
    expect(res.handled).toBe(true);
    expect(res.openSettings).toBe(true);
  });
});

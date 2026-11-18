import { describe, expect, it } from 'vitest';
import {
  computeMultiDayAnalytics,
  getMultiDayDateKeys,
  getRecentLabelsByState,
} from '../utils/analytics';
import { assignBlocksInDay, createEmptyStore } from '../utils/storage';
import { DEFAULT_CATEGORIES } from '../utils/timeBlocks';

describe('multi-day analytics and statistics calculations', () => {
  it('generates chronological date keys for 7-day and 30-day windows ending on selected date', () => {
    const keys7 = getMultiDayDateKeys('2026-11-18', 7);
    expect(keys7).toHaveLength(7);
    expect(keys7[0]).toBe('2026-11-12');
    expect(keys7[6]).toBe('2026-11-18');

    const keys30 = getMultiDayDateKeys('2026-11-18', 30);
    expect(keys30).toHaveLength(30);
    expect(keys30[0]).toBe('2026-10-20');
    expect(keys30[29]).toBe('2026-11-18');
  });

  it('computes accurate Core KPI cards: Avg Focus, Focus-to-Ops Ratio, Avg Sleep, and Intentionality Score', () => {
    let store = createEmptyStore();
    const endDate = '2026-11-18';

    // Day 1: 2026-11-17 (6h focus = 36 blocks, 2h ops = 12 blocks, 8h sleep = 48 blocks)
    // 36 focus + 12 ops + 48 sleep = 96 blocks mapped out of 144 (66.7%)
    store = assignBlocksInDay(
      store,
      '2026-11-17',
      Array.from({ length: 36 }, (_, i) => i + 54),
      { categoryId: 'focus', label: 'Deep Coding' }
    );
    store = assignBlocksInDay(
      store,
      '2026-11-17',
      Array.from({ length: 12 }, (_, i) => i + 90),
      { categoryId: 'ops', label: 'Team Standup' }
    );
    store = assignBlocksInDay(
      store,
      '2026-11-17',
      Array.from({ length: 48 }, (_, i) => i),
      { categoryId: 'sleep', label: 'Night Sleep' }
    );

    // Day 2: 2026-11-18 (4h focus = 24 blocks, 0h ops, 8h sleep = 48 blocks)
    // 24 focus + 48 sleep = 72 blocks mapped (50%)
    store = assignBlocksInDay(
      store,
      '2026-11-18',
      Array.from({ length: 24 }, (_, i) => i + 54),
      { categoryId: 'focus', label: 'Architecture' }
    );
    store = assignBlocksInDay(
      store,
      '2026-11-18',
      Array.from({ length: 48 }, (_, i) => i),
      { categoryId: 'sleep', label: 'Night Sleep' }
    );

    const analytics = computeMultiDayAnalytics(store, endDate, 7, DEFAULT_CATEGORIES);

    // Window validation
    expect(analytics.windowDays).toBe(7);
    expect(analytics.activeDaysCount).toBe(2);

    // Total focus = 36 + 24 = 60 blocks = 600m = 10.0h
    expect(analytics.totalFocusHours).toBe(10);
    // Avg daily focus across 7 days = 10.0 / 7 ≈ 1.4h / day
    expect(analytics.avgDailyFocusHours).toBe(1.4);

    // Focus-to-Ops Ratio:
    // Focus blocks = 60, Ops blocks = 12. Total = 72.
    // Maker ratio = 60 / 72 = 83.33% -> 83% Maker
    // Ratio = 60 / 12 = 5.0 : 1
    expect(analytics.focusToOpsRatioPercent).toBe(83);
    expect(analytics.focusToOpsRatioFormatted).toContain('83% Maker (5.0:1)');

    // Total sleep = 48 + 48 = 96 blocks = 960m = 16.0h
    expect(analytics.totalSleepHours).toBe(16);
    expect(analytics.avgDailySleepHours).toBe(2.3);

    // Intentionality Score across active days (2 active days):
    // Day 1: 96 blocks, Day 2: 72 blocks -> 168 blocks mapped out of 2 * 144 = 288 blocks
    // 168 / 288 = 58.33% -> 58%
    expect(analytics.intentionalityScore).toBe(58);
    expect(analytics.driftPercent).toBe(42);
  });

  it('computes 24-hour circadian rhythm heatmap and multi-day stacked balance data', () => {
    let store = createEmptyStore();
    const endDate = '2026-11-18';

    // Assign a vitality block at 07:00 (block 42) on 2026-11-18
    store = assignBlocksInDay(store, '2026-11-18', [42], {
      categoryId: 'vitality',
      label: 'Morning Stretch',
    });

    const analytics = computeMultiDayAnalytics(store, endDate, 7, DEFAULT_CATEGORIES);

    // Circadian heatmap contains 7 days
    expect(analytics.circadianDays).toHaveLength(7);
    const lastDay = analytics.circadianDays[6];
    expect(lastDay.dateKey).toBe('2026-11-18');
    expect(lastDay.blockCategoryIds).toHaveLength(144);
    expect(lastDay.blockCategoryIds[42]).toBe('vitality');
    expect(lastDay.blockCategoryIds[0]).toBeNull(); // unassigned

    // Daily allocations list
    expect(analytics.dailyAllocations).toHaveLength(7);
    const dayAlloc = analytics.dailyAllocations[6];
    expect(dayAlloc.vitalityBlocks).toBe(1);
    expect(dayAlloc.unassignedBlocks).toBe(143);
  });

  it('computes weekday vs weekend split correctly', () => {
    let store = createEmptyStore();
    // 2026-11-18 is Wednesday.
    // 7-day window: 2026-11-12 (Thu) to 2026-11-18 (Wed).
    // Weekdays: Thu 12, Fri 13, Mon 16, Tue 17, Wed 18 (5 weekdays)
    // Weekends: Sat 14, Sun 15 (2 weekends)

    // Put 6 hours of focus on a weekday (2026-11-16) = 36 blocks = 6h
    store = assignBlocksInDay(
      store,
      '2026-11-16',
      Array.from({ length: 36 }, (_, i) => i + 54),
      { categoryId: 'focus', label: 'Sprint' }
    );

    // Put 4 hours of vitality on a weekend (2026-11-15, Sun) = 24 blocks = 4h
    store = assignBlocksInDay(
      store,
      '2026-11-15',
      Array.from({ length: 24 }, (_, i) => i + 60),
      { categoryId: 'vitality', label: 'Trail Run' }
    );

    const analytics = computeMultiDayAnalytics(store, '2026-11-18', 7, DEFAULT_CATEGORIES);

    expect(analytics.weekdaysAvg.daysCount).toBe(5);
    expect(analytics.weekendsAvg.daysCount).toBe(2);

    // Weekday focus average: 6h / 5 days = 1.2h / day
    expect(analytics.weekdaysAvg.focusHoursPerDay).toBe(1.2);
    expect(analytics.weekdaysAvg.vitalityHoursPerDay).toBe(0);

    // Weekend vitality average: 4h / 2 days = 2.0h / day
    expect(analytics.weekendsAvg.vitalityHoursPerDay).toBe(2.0);
    expect(analytics.weekendsAvg.focusHoursPerDay).toBe(0);
  });

  it('ranks top activities in the leaderboard by total hours and block count', () => {
    let store = createEmptyStore();

    // 12 blocks of "Coding" (Focus)
    store = assignBlocksInDay(
      store,
      '2026-11-18',
      Array.from({ length: 12 }, (_, i) => i + 54),
      { categoryId: 'focus', label: 'Coding' }
    );

    // 6 blocks of "Client Sync" (Ops)
    store = assignBlocksInDay(
      store,
      '2026-11-18',
      Array.from({ length: 6 }, (_, i) => i + 72),
      { categoryId: 'ops', label: 'Client Sync' }
    );

    // 3 blocks of "Yoga" (Vitality)
    store = assignBlocksInDay(
      store,
      '2026-11-18',
      Array.from({ length: 3 }, (_, i) => i + 80),
      { categoryId: 'vitality', label: 'Yoga' }
    );

    const analytics = computeMultiDayAnalytics(store, '2026-11-18', 7, DEFAULT_CATEGORIES);

    expect(analytics.topActivities).toHaveLength(3);
    expect(analytics.topActivities[0].label).toBe('Coding');
    expect(analytics.topActivities[0].categoryId).toBe('focus');
    expect(analytics.topActivities[0].blockCount).toBe(12);
    expect(analytics.topActivities[0].hours).toBe(2);

    expect(analytics.topActivities[1].label).toBe('Client Sync');
    expect(analytics.topActivities[1].categoryId).toBe('ops');
    expect(analytics.topActivities[1].blockCount).toBe(6);
    expect(analytics.topActivities[1].hours).toBe(1);

    expect(analytics.topActivities[2].label).toBe('Yoga');
    expect(analytics.topActivities[2].categoryId).toBe('vitality');
    expect(analytics.topActivities[2].blockCount).toBe(3);
  });

  it('extracts recent activity labels grouped by 4 Core States for BlockComposer chips', () => {
    let store = createEmptyStore();

    store = assignBlocksInDay(store, '2026-11-18', [54], {
      categoryId: 'focus',
      label: 'Deep Work Sprint',
    });
    store = assignBlocksInDay(store, '2026-11-18', [60], {
      categoryId: 'ops',
      label: 'Vendor Call',
    });
    store = assignBlocksInDay(store, '2026-11-18', [72], {
      categoryId: 'vitality',
      label: 'Pilates',
    });

    const recent = getRecentLabelsByState(store);
    expect(recent.focus).toContain('Deep Work Sprint');
    expect(recent.ops).toContain('Vendor Call');
    expect(recent.vitality).toContain('Pilates');
  });
});

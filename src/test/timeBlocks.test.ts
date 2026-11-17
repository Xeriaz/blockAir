import { describe, expect, it } from 'vitest';
import {
  BLOCKS_PER_DAY,
  computeDayOverview,
  DEFAULT_CATEGORIES,
  formatBlockRange,
  formatClock24h,
  formatDateKey,
  formatDurationMinutes,
  formatHumanDate,
  getBlockTimeRange,
  getCurrentBlockIndex,
  getVisibleBlockIndices,
  groupBlocksByHour,
  parseDateKey,
  shiftDateKey,
  WAKING_BLOCK_COUNT,
  WAKING_END_BLOCK,
  WAKING_START_BLOCK,
} from '../utils/timeBlocks';

describe('timeBlocks utilities', () => {
  it('formats 24-hour clock times strictly without AM/PM', () => {
    expect(formatClock24h(new Date(2026, 10, 17, 0, 5, 9))).toBe('00:05');
    expect(formatClock24h(new Date(2026, 10, 17, 20, 32, 8))).toBe('20:32');
    expect(formatClock24h(new Date(2026, 10, 17, 20, 32, 8), true)).toBe('20:32:08');
  });

  it('computes accurate 10-minute time ranges across 144 blocks', () => {
    const first = getBlockTimeRange(0);
    expect(first.start).toBe('00:00');
    expect(first.end).toBe('00:10');
    expect(first.hour).toBe(0);
    expect(first.slotInHour).toBe(0);

    const morningNine = getBlockTimeRange(54); // 9 * 6 = 54
    expect(morningNine.start).toBe('09:00');
    expect(morningNine.end).toBe('09:10');
    expect(morningNine.hour).toBe(9);
    expect(morningNine.slotInHour).toBe(0);

    const finalBlock = getBlockTimeRange(143);
    expect(finalBlock.start).toBe('23:50');
    expect(finalBlock.end).toBe('24:00');
    expect(finalBlock.hour).toBe(23);
    expect(finalBlock.slotInHour).toBe(5);
  });

  it('formats multi-block ranges and durations cleanly', () => {
    expect(formatDurationMinutes(0)).toBe('0m');
    expect(formatDurationMinutes(30)).toBe('30m');
    expect(formatDurationMinutes(60)).toBe('1h');
    expect(formatDurationMinutes(90)).toBe('1h 30m');

    expect(formatBlockRange(54, 59)).toBe('09:00 – 10:00 (1h · 6 blocks)');
    expect(formatBlockRange(54, 54)).toBe('09:00 – 09:10 (10m · 1 block)');
  });

  it('returns 144 indices for full24 mode and 100 indices for waking100 mode', () => {
    const full = getVisibleBlockIndices('full24');
    expect(full).toHaveLength(BLOCKS_PER_DAY);
    expect(full[0]).toBe(0);
    expect(full[full.length - 1]).toBe(143);

    const waking = getVisibleBlockIndices('waking100');
    expect(waking).toHaveLength(WAKING_BLOCK_COUNT);
    expect(waking[0]).toBe(WAKING_START_BLOCK); // 06:00
    expect(waking[waking.length - 1]).toBe(WAKING_END_BLOCK); // 22:30-22:40

    const wakingGroups = groupBlocksByHour(waking);
    expect(wakingGroups[0].hourLabel).toBe('06:00');
    expect(wakingGroups[wakingGroups.length - 1].hourLabel).toBe('22:00');
    expect(wakingGroups[wakingGroups.length - 1].blockIndices).toHaveLength(4);
  });

  it('handles local calendar dates without UTC drift', () => {
    const localDate = new Date(2026, 10, 17, 23, 55, 0); // Nov 17, 2026 23:55 local
    const key = formatDateKey(localDate);
    expect(key).toBe('2026-11-17');

    expect(shiftDateKey('2026-11-17', 1)).toBe('2026-11-18');
    expect(shiftDateKey('2026-11-17', -1)).toBe('2026-11-16');
    expect(shiftDateKey('2026-03-01', -1)).toBe('2026-02-28');

    const parsed = parseDateKey('2026-11-17');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(10);
    expect(parsed.getDate()).toBe(17);

    const humanToday = formatHumanDate('2026-11-17', '2026-11-17');
    expect(humanToday.isToday).toBe(true);
    expect(humanToday.relativeBadge).toBe('Today');

    const humanYesterday = formatHumanDate('2026-11-16', '2026-11-17');
    expect(humanYesterday.isToday).toBe(false);
    expect(humanYesterday.relativeBadge).toBe('Yesterday');
  });

  it('calculates current block index from local hours and minutes', () => {
    expect(getCurrentBlockIndex(new Date(2026, 10, 17, 0, 0))).toBe(0);
    expect(getCurrentBlockIndex(new Date(2026, 10, 17, 9, 25))).toBe(56);
    expect(getCurrentBlockIndex(new Date(2026, 10, 17, 23, 59))).toBe(143);
  });

  it('computes day overview statistics per category and unassigned time', () => {
    const dayRecord = {
      dateKey: '2026-11-17',
      blocks: {
        54: { categoryId: 'deep-work', label: 'Architecture design', updatedAt: 1 },
        55: { categoryId: 'deep-work', label: 'Architecture design', updatedAt: 1 },
        56: { categoryId: 'deep-work', label: 'Architecture design', updatedAt: 1 },
        60: { categoryId: 'vitality', label: 'Outdoor run', updatedAt: 1 },
      },
    };

    const stats = computeDayOverview(dayRecord, DEFAULT_CATEGORIES, 'waking100');
    expect(stats.totalVisibleBlocks).toBe(100);
    expect(stats.allocatedBlocks).toBe(4);
    expect(stats.unassignedBlocks).toBe(96);
    expect(stats.allocatedMinutes).toBe(40);
    expect(stats.unassignedMinutes).toBe(960);
    expect(stats.completionPercent).toBe(4);

    expect(stats.categorySummaries).toHaveLength(2);
    expect(stats.categorySummaries[0].category.id).toBe('deep-work');
    expect(stats.categorySummaries[0].blockCount).toBe(3);
    expect(stats.categorySummaries[0].minutes).toBe(30);

    expect(stats.topActivities[0]).toEqual({
      label: 'Architecture design',
      categoryId: 'deep-work',
      blockCount: 3,
      minutes: 30,
    });
  });
});

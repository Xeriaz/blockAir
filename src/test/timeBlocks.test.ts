import { describe, expect, it } from 'vitest';
import {
  BLOCKS_PER_DAY,
  computeBlocksForTimeRange,
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
  HOURS_PER_DAY,
  parseDateKey,
  parseTimeToMinutes,
  shiftDateKey,
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

  it('returns all 144 indices grouped into 24 hourly rows', () => {
    const full = getVisibleBlockIndices();
    expect(full).toHaveLength(BLOCKS_PER_DAY);
    expect(full[0]).toBe(0);
    expect(full[full.length - 1]).toBe(143);

    const groups = groupBlocksByHour();
    expect(groups).toHaveLength(HOURS_PER_DAY);
    expect(groups[0].hourLabel).toBe('00:00');
    expect(groups[23].hourLabel).toBe('23:00');
    expect(groups[0].blockIndices).toHaveLength(6);
    expect(groups[23].blockIndices).toHaveLength(6);
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

  it('computes day overview statistics across all 144 blocks', () => {
    const dayRecord = {
      dateKey: '2026-11-17',
      blocks: {
        54: { categoryId: 'deep-work', label: 'Architecture design', updatedAt: 1 },
        55: { categoryId: 'deep-work', label: 'Architecture design', updatedAt: 1 },
        56: { categoryId: 'deep-work', label: 'Architecture design', updatedAt: 1 },
        60: { categoryId: 'vitality', label: 'Outdoor run', updatedAt: 1 },
      },
    };

    const stats = computeDayOverview(dayRecord, DEFAULT_CATEGORIES);
    expect(stats.totalVisibleBlocks).toBe(144);
    expect(stats.allocatedBlocks).toBe(4);
    expect(stats.unassignedBlocks).toBe(140);
    expect(stats.allocatedMinutes).toBe(40);
    expect(stats.unassignedMinutes).toBe(1400);
    expect(stats.completionPercent).toBe(3);

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

  it('parses time strings to minutes from midnight', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('01:30')).toBe(90);
    expect(parseTimeToMinutes('12:15')).toBe(735);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
    expect(parseTimeToMinutes('invalid')).toBe(0);
  });

  it('computes block indices for within-day time ranges', () => {
    // 09:00 (540m -> block 54) to 11:00 (660m -> block 65 inclusive, 12 blocks total)
    const morningWork = computeBlocksForTimeRange('09:00', '11:00');
    expect(morningWork).toHaveLength(12);
    expect(morningWork[0]).toBe(54);
    expect(morningWork[morningWork.length - 1]).toBe(65);

    // Single 10m block
    const single = computeBlocksForTimeRange('14:00', '14:10');
    expect(single).toEqual([84]);

    // Same start and end -> 0 blocks
    expect(computeBlocksForTimeRange('10:00', '10:00')).toEqual([]);
  });

  it('computes block indices seamlessly crossing midnight', () => {
    // 23:00 to 07:00
    // Evening: 23:00..24:00 -> blocks 138..143 (6 blocks)
    // Morning: 00:00..07:00 -> blocks 0..41 (42 blocks)
    // Total = 48 blocks (8 hours)
    const sleepBlocks = computeBlocksForTimeRange('23:00', '07:00');
    expect(sleepBlocks).toHaveLength(48);
    expect(sleepBlocks[0]).toBe(0);
    expect(sleepBlocks[41]).toBe(41);
    expect(sleepBlocks[42]).toBe(138);
    expect(sleepBlocks[47]).toBe(143);

    // 22:30 to 06:30 -> 8 hours = 48 blocks
    const sleepBlocks2 = computeBlocksForTimeRange('22:30', '06:30');
    expect(sleepBlocks2).toHaveLength(48);
    expect(sleepBlocks2.includes(135)).toBe(true); // 22:30 is block 135
    expect(sleepBlocks2.includes(38)).toBe(true);  // 06:20..06:30 is block 38
    expect(sleepBlocks2.includes(39)).toBe(false); // 06:30 wake time
  });
});

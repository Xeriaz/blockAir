import type {
  ActivityHighlight,
  Category,
  CategorySummary,
  DayOverviewStats,
  DayRecord,
  HourRowGroup,
} from '../types/blockair';

export const BLOCKS_PER_DAY = 144;
export const MINUTES_PER_BLOCK = 10;
export const BLOCKS_PER_HOUR = 6;
export const HOURS_PER_DAY = 24;

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'deep-work',
    name: 'Deep Work',
    color: '#38bdf8',
    bgTint: 'linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(2, 132, 199, 0.14))',
    borderTint: 'rgba(56, 189, 248, 0.65)',
    glowTint: 'rgba(56, 189, 248, 0.35)',
    shortcut: '1',
    description: 'Focused creation, coding, writing, and high-leverage problem solving',
  },
  {
    id: 'essentials',
    name: 'Operations & Admin',
    color: '#fbbf24',
    bgTint: 'linear-gradient(135deg, rgba(251, 191, 36, 0.28), rgba(217, 119, 6, 0.14))',
    borderTint: 'rgba(251, 191, 36, 0.62)',
    glowTint: 'rgba(251, 191, 36, 0.35)',
    shortcut: '2',
    description: 'Meetings, messages, errands, commuting, and daily logistics',
  },
  {
    id: 'vitality',
    name: 'Movement & Vitality',
    color: '#10b981',
    bgTint: 'linear-gradient(135deg, rgba(16, 185, 129, 0.28), rgba(52, 211, 153, 0.14))',
    borderTint: 'rgba(52, 211, 153, 0.65)',
    glowTint: 'rgba(16, 185, 129, 0.35)',
    shortcut: '3',
    description: 'Exercise, walks, cooking, nourishing meals, and mindfulness',
  },
  {
    id: 'learning',
    name: 'Learning & Craft',
    color: '#a855f7',
    bgTint: 'linear-gradient(135deg, rgba(168, 85, 247, 0.28), rgba(126, 34, 206, 0.14))',
    borderTint: 'rgba(168, 85, 247, 0.65)',
    glowTint: 'rgba(168, 85, 247, 0.35)',
    shortcut: '4',
    description: 'Reading, studying, deliberate practice, and skill building',
  },
  {
    id: 'connection',
    name: 'Connection & Joy',
    color: '#f43f5e',
    bgTint: 'linear-gradient(135deg, rgba(244, 63, 94, 0.28), rgba(225, 29, 72, 0.14))',
    borderTint: 'rgba(244, 63, 94, 0.65)',
    glowTint: 'rgba(244, 63, 94, 0.35)',
    shortcut: '5',
    description: 'Family, friends, meaningful conversation, and shared play',
  },
  {
    id: 'recharge',
    name: 'Rest & Leisure',
    color: '#14b8a6',
    bgTint: 'linear-gradient(135deg, rgba(20, 184, 166, 0.28), rgba(13, 148, 136, 0.14))',
    borderTint: 'rgba(20, 184, 166, 0.62)',
    glowTint: 'rgba(20, 184, 166, 0.35)',
    shortcut: '6',
    description: 'Downtime, hobbies, decompression, and intentional rest',
  },
  {
    id: 'sleep',
    name: 'Sleep',
    color: '#6366f1',
    bgTint: 'linear-gradient(135deg, rgba(99, 102, 241, 0.28), rgba(67, 56, 202, 0.14))',
    borderTint: 'rgba(99, 102, 241, 0.62)',
    glowTint: 'rgba(99, 102, 241, 0.35)',
    shortcut: '7',
    description: 'Nighttime sleep and restorative naps',
  },
];

export function getCategoryMap(categories: Category[] = DEFAULT_CATEGORIES): Record<string, Category> {
  return Object.fromEntries(categories.map((cat) => [cat.id, cat]));
}

/**
 * Formats a Date object as a local YYYY-MM-DD key without UTC timezone drift.
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a local YYYY-MM-DD string into a local Date anchored at 12:00 noon
 * to avoid daylight-saving boundary shifts when adding or subtracting days.
 */
export function parseDateKey(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, monthIndex, day, 12, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  }
  return parsed;
}

/**
 * Shifts a YYYY-MM-DD key by deltaDays in local calendar time.
 */
export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + deltaDays);
  return formatDateKey(d);
}

/**
 * Produces human-friendly labels for the selected date key.
 */
export function formatHumanDate(
  dateKey: string,
  todayKey: string = formatDateKey(new Date())
): {
  primary: string;
  secondary: string;
  relativeBadge: string | null;
  isToday: boolean;
} {
  const date = parseDateKey(dateKey);
  const today = parseDateKey(todayKey);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const primary = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const secondary = date.toLocaleDateString('en-US', {
    year: 'numeric',
  });

  let relativeBadge: string | null = null;
  if (diffDays === 0) relativeBadge = 'Today';
  else if (diffDays === -1) relativeBadge = 'Yesterday';
  else if (diffDays === 1) relativeBadge = 'Tomorrow';
  else if (diffDays < -1) relativeBadge = `${Math.abs(diffDays)}d ago`;
  else if (diffDays > 1) relativeBadge = `In ${diffDays}d`;

  return {
    primary,
    secondary,
    relativeBadge,
    isToday: diffDays === 0,
  };
}

export function pad2(num: number): string {
  return String(num).padStart(2, '0');
}

/**
 * Formats a Date object as a strict 24-hour clock string (HH:MM or HH:MM:SS), never 12h AM/PM.
 */
export function formatClock24h(date: Date, includeSeconds = false): string {
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  if (!includeSeconds) {
    return `${hours}:${minutes}`;
  }
  const seconds = pad2(date.getSeconds());
  return `${hours}:${minutes}:${seconds}`;
}

export function minutesToTimeLabel(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1440, totalMinutes));
  if (clamped === 1440) return '24:00';
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${pad2(hours)}:${pad2(mins)}`;
}

/**
 * Returns start/end time metadata for a 10-minute block index (0..143).
 */
export function getBlockTimeRange(blockIndex: number): {
  index: number;
  start: string;
  end: string;
  hour: number;
  slotInHour: number;
  startMinutes: number;
  endMinutes: number;
} {
  const safeIndex = Math.max(0, Math.min(BLOCKS_PER_DAY - 1, Math.floor(blockIndex)));
  const startMinutes = safeIndex * MINUTES_PER_BLOCK;
  const endMinutes = startMinutes + MINUTES_PER_BLOCK;
  const hour = Math.floor(safeIndex / BLOCKS_PER_HOUR);
  const slotInHour = safeIndex % BLOCKS_PER_HOUR;

  return {
    index: safeIndex,
    start: minutesToTimeLabel(startMinutes),
    end: minutesToTimeLabel(endMinutes),
    hour,
    slotInHour,
    startMinutes,
    endMinutes,
  };
}

/**
 * Formats an inclusive block range (e.g., blocks 54..59 -> "09:00 – 10:00 (1h · 6 blocks)").
 */
export function formatBlockRange(startBlock: number, endBlock: number): string {
  const low = Math.min(startBlock, endBlock);
  const high = Math.max(startBlock, endBlock);
  const first = getBlockTimeRange(low);
  const last = getBlockTimeRange(high);
  const count = high - low + 1;
  const duration = formatDurationMinutes(count * MINUTES_PER_BLOCK);
  return `${first.start} – ${last.end} (${duration} · ${count} ${count === 1 ? 'block' : 'blocks'})`;
}

/**
 * Formats a minute total into compact human-readable duration (e.g., "2h 20m", "40m", "3h").
 */
export function formatDurationMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins === 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Parses an HH:MM 24-hour time string into total minutes since midnight (0..1440).
 */
export function parseTimeToMinutes(timeStr: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return Math.max(0, Math.min(1440, hours * 60 + minutes));
}

/**
 * Returns block indices (0..143) covered by a time interval (startTime to endTime).
 * - If startTime < endTime (e.g. 01:00 to 08:00), returns blocks in [startTime, endTime).
 * - If startTime > endTime (e.g. 23:00 to 07:00, crossing midnight),
 *   returns evening blocks [startTime, 24:00) PLUS morning blocks [00:00, endTime).
 */
export function computeBlocksForTimeRange(startTime: string, endTime: string): number[] {
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  const indices: number[] = [];

  if (startMins === endMins) {
    if (startMins === 0 || startMins === 1440) {
      return Array.from({ length: BLOCKS_PER_DAY }, (_, i) => i);
    }
    return [];
  }

  if (startMins < endMins) {
    const startBlock = Math.floor(startMins / MINUTES_PER_BLOCK);
    const endBlock = Math.ceil(endMins / MINUTES_PER_BLOCK);
    for (let i = startBlock; i < endBlock && i < BLOCKS_PER_DAY; i++) {
      indices.push(i);
    }
  } else {
    // Crosses midnight (e.g. 23:00 to 07:00)
    const eveningStartBlock = Math.floor(startMins / MINUTES_PER_BLOCK);
    for (let i = eveningStartBlock; i < BLOCKS_PER_DAY; i++) {
      indices.push(i);
    }
    const morningEndBlock = Math.ceil(endMins / MINUTES_PER_BLOCK);
    for (let i = 0; i < morningEndBlock && i < BLOCKS_PER_DAY; i++) {
      indices.push(i);
    }
  }

  return Array.from(new Set(indices)).sort((a, b) => a - b);
}

/**
 * Computes the active 10-minute block index (0..143) for a given Date.
 */
export function getCurrentBlockIndex(now: Date = new Date()): number {
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  return Math.max(
    0,
    Math.min(BLOCKS_PER_DAY - 1, Math.floor(minutesSinceMidnight / MINUTES_PER_BLOCK))
  );
}

/**
 * Returns the ordered array of 144 block indices across the full 24-hour day (0..143).
 */
export function getVisibleBlockIndices(): number[] {
  return Array.from({ length: BLOCKS_PER_DAY }, (_, i) => i);
}

export function getPeriodLabelForHour(hour: number): string {
  if (hour < 6) return 'Night';
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  if (hour < 21) return 'Evening';
  return 'Night';
}

/**
 * Groups all 144 block indices into 24 hourly rows (6 blocks per hour).
 */
export function groupBlocksByHour(indices: number[] = getVisibleBlockIndices()): HourRowGroup[] {
  const map = new Map<number, number[]>();
  for (const idx of indices) {
    const hour = Math.floor(idx / BLOCKS_PER_HOUR);
    const list = map.get(hour);
    if (list) {
      list.push(idx);
    } else {
      map.set(hour, [idx]);
    }
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, blockIndices]) => ({
      hour,
      hourLabel: `${pad2(hour)}:00`,
      periodLabel: getPeriodLabelForHour(hour),
      blockIndices,
    }));
}

/**
 * Computes comprehensive overview statistics for the day across all 144 blocks (24 hours).
 */
export function computeDayOverview(
  dayRecord: DayRecord | undefined,
  categories: Category[] = DEFAULT_CATEGORIES
): DayOverviewStats {
  const totalVisibleBlocks = BLOCKS_PER_DAY;
  const blocks = dayRecord?.blocks ?? {};
  const categoryCounts = new Map<string, number>();
  const activityMap = new Map<string, { label: string; categoryId: string; count: number }>();

  let allocatedBlocks = 0;

  for (let idx = 0; idx < BLOCKS_PER_DAY; idx++) {
    const entry = blocks[idx];
    if (!entry || !entry.categoryId) continue;
    allocatedBlocks += 1;
    categoryCounts.set(entry.categoryId, (categoryCounts.get(entry.categoryId) ?? 0) + 1);

    const trimmedLabel = entry.label?.trim();
    if (trimmedLabel) {
      const key = `${entry.categoryId}::${trimmedLabel.toLowerCase()}`;
      const existing = activityMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        activityMap.set(key, {
          label: trimmedLabel,
          categoryId: entry.categoryId,
          count: 1,
        });
      }
    }
  }

  const unassignedBlocks = Math.max(0, totalVisibleBlocks - allocatedBlocks);
  const allocatedMinutes = allocatedBlocks * MINUTES_PER_BLOCK;
  const unassignedMinutes = unassignedBlocks * MINUTES_PER_BLOCK;
  const completionPercent =
    totalVisibleBlocks > 0 ? Math.round((allocatedBlocks / totalVisibleBlocks) * 100) : 0;

  const categorySummaries: CategorySummary[] = categories
    .map((category) => {
      const blockCount = categoryCounts.get(category.id) ?? 0;
      const minutes = blockCount * MINUTES_PER_BLOCK;
      const percentageOfView =
        totalVisibleBlocks > 0 ? Math.round((blockCount / totalVisibleBlocks) * 100) : 0;
      const percentageOfAllocated =
        allocatedBlocks > 0 ? Math.round((blockCount / allocatedBlocks) * 100) : 0;
      return {
        category,
        blockCount,
        minutes,
        percentageOfView,
        percentageOfAllocated,
      };
    })
    .filter((summary) => summary.blockCount > 0)
    .sort((a, b) => b.blockCount - a.blockCount);

  const topActivities: ActivityHighlight[] = Array.from(activityMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((item) => ({
      label: item.label,
      categoryId: item.categoryId,
      blockCount: item.count,
      minutes: item.count * MINUTES_PER_BLOCK,
    }));

  return {
    totalVisibleBlocks,
    allocatedBlocks,
    unassignedBlocks,
    allocatedMinutes,
    unassignedMinutes,
    completionPercent,
    categorySummaries,
    topActivities,
  };
}

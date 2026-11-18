import type { AppDataStore, Category } from '../types/blockair';
import { migrateCategoryId } from './storage';
import {
  BLOCKS_PER_DAY,
  DEFAULT_CATEGORIES,
  getCategoryMap,
  MINUTES_PER_BLOCK,
  parseDateKey,
  shiftDateKey,
} from './timeBlocks';

export interface DailyAllocation {
  dateKey: string;
  dayLabel: string; // e.g. "Wed 18"
  fullDateLabel: string; // e.g. "Wed, Nov 18, 2026"
  dayOfWeek: number; // 0..6 (0=Sun, 6=Sat)
  isWeekend: boolean;
  isToday: boolean;
  isActive: boolean; // has at least 1 block mapped
  focusBlocks: number;
  opsBlocks: number;
  vitalityBlocks: number;
  sleepBlocks: number;
  unassignedBlocks: number;
  focusMinutes: number;
  opsMinutes: number;
  vitalityMinutes: number;
  sleepMinutes: number;
  unassignedMinutes: number;
  focusHours: number;
  opsHours: number;
  vitalityHours: number;
  sleepHours: number;
  unassignedHours: number;
  // 144 block category IDs (or null if unassigned)
  blockCategoryIds: (string | null)[];
}

export interface DayTypeAverage {
  daysCount: number;
  focusHoursPerDay: number;
  opsHoursPerDay: number;
  vitalityHoursPerDay: number;
  sleepHoursPerDay: number;
  unassignedHoursPerDay: number;
  totalMappedHoursPerDay: number;
}

export interface RankedActivity {
  rank: number;
  label: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  blockCount: number;
  minutes: number;
  hours: number;
  percentageOfAllocated: number;
}

export interface SleepConsistencyInfo {
  hasSufficientData: boolean;
  activeSleepDays: number;
  avgBedtimeLabel: string; // e.g. "23:15"
  avgWakeTimeLabel: string; // e.g. "07:00"
  varianceMinutes: number; // average deviation in minutes
  consistencyScore: number; // 0..100%
  description: string; // e.g. "±15m variance"
}

export interface MultiDayAnalyticsResult {
  windowDays: number; // 7 or 30
  startDateKey: string;
  endDateKey: string;
  dailyAllocations: DailyAllocation[];
  activeDaysCount: number;

  // KPI 1: Focus & Focus-to-Ops Ratio
  totalFocusHours: number;
  avgDailyFocusHours: number;
  focusToOpsRatioPercent: number; // Maker ratio % (focus / (focus + ops) * 100)
  focusToOpsRatioFormatted: string; // e.g. "75% Maker (3.0:1)"

  // KPI 2: Sleep & Consistency
  totalSleepHours: number;
  avgDailySleepHours: number;
  sleepConsistency: SleepConsistencyInfo;

  // KPI 3: Intentionality Score
  intentionalityScore: number; // % of blocks mapped across active days
  driftPercent: number; // 100 - intentionalityScore
  avgDailyDriftHours: number;

  // Breakdown & Comparisons
  weekdaysAvg: DayTypeAverage;
  weekendsAvg: DayTypeAverage;
  topActivities: RankedActivity[];
  circadianDays: DailyAllocation[]; // 7 days for the 24h heatmap
}

/**
 * Generates an array of date keys of length `windowDays` ending on `endDateKey` (inclusive).
 */
export function getMultiDayDateKeys(endDateKey: string, windowDays: number): string[] {
  const result: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    result.push(shiftDateKey(endDateKey, -i));
  }
  return result;
}

/**
 * Computes multi-day analytics across a 7-day or 30-day window ending on `endDateKey`.
 */
export function computeMultiDayAnalytics(
  store: AppDataStore,
  endDateKey: string,
  windowDays: number = 7,
  categories: Category[] = DEFAULT_CATEGORIES
): MultiDayAnalyticsResult {
  const categoryMap = getCategoryMap(categories);
  const dateKeys = getMultiDayDateKeys(endDateKey, windowDays);
  const todayKey = new Date().toISOString().slice(0, 10);

  const dailyAllocations: DailyAllocation[] = [];
  const activityAggregator = new Map<
    string,
    { label: string; categoryId: string; blockCount: number }
  >();

  let totalFocusBlocks = 0;
  let totalOpsBlocks = 0;
  let totalVitalityBlocks = 0;
  let totalSleepBlocks = 0;
  let totalAllocatedBlocksAll = 0;
  let activeDaysCount = 0;

  // Sleep consistency calculation accumulators
  const bedtimeList: number[] = []; // minutes from midnight (normalized: negative = before midnight)
  const wakeTimeList: number[] = []; // minutes from midnight

  for (const dateKey of dateKeys) {
    const dateObj = parseDateKey(dateKey);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isToday = dateKey === todayKey;

    const dayRecord = store.days[dateKey];
    const rawBlocks = dayRecord?.blocks ?? {};

    let focusBlocks = 0;
    let opsBlocks = 0;
    let vitalityBlocks = 0;
    let sleepBlocks = 0;

    const blockCategoryIds: (string | null)[] = new Array(BLOCKS_PER_DAY).fill(null);
    const sleepIndicesInDay: number[] = [];

    for (let i = 0; i < BLOCKS_PER_DAY; i++) {
      const entry = rawBlocks[i];
      if (!entry || !entry.categoryId) continue;

      const catId = migrateCategoryId(entry.categoryId);
      blockCategoryIds[i] = catId;

      if (catId === 'focus') focusBlocks++;
      else if (catId === 'ops') opsBlocks++;
      else if (catId === 'vitality') vitalityBlocks++;
      else if (catId === 'sleep') {
        sleepBlocks++;
        sleepIndicesInDay.push(i);
      }

      // Aggregate activities
      const trimmedLabel = entry.label?.trim();
      if (trimmedLabel) {
        const key = `${catId}::${trimmedLabel.toLowerCase()}`;
        const existing = activityAggregator.get(key);
        if (existing) {
          existing.blockCount++;
        } else {
          activityAggregator.set(key, {
            label: trimmedLabel,
            categoryId: catId,
            blockCount: 1,
          });
        }
      }
    }

    const dayAllocatedBlocks = focusBlocks + opsBlocks + vitalityBlocks + sleepBlocks;
    const unassignedBlocks = BLOCKS_PER_DAY - dayAllocatedBlocks;
    const isActive = dayAllocatedBlocks > 0;

    if (isActive) {
      activeDaysCount++;
    }

    totalFocusBlocks += focusBlocks;
    totalOpsBlocks += opsBlocks;
    totalVitalityBlocks += vitalityBlocks;
    totalSleepBlocks += sleepBlocks;
    totalAllocatedBlocksAll += dayAllocatedBlocks;

    // Detect sleep onset and wake time if sleep was recorded
    if (sleepIndicesInDay.length > 0) {
      // Evening blocks (20:00 to 24:00, index >= 120)
      const eveningBlocks = sleepIndicesInDay.filter((idx) => idx >= 120);
      // Morning blocks (00:00 to 12:00, index < 72)
      const morningBlocks = sleepIndicesInDay.filter((idx) => idx < 72);

      let bedtimeMinutes: number | null = null;
      if (eveningBlocks.length > 0) {
        // Bedtime before midnight: e.g. 23:00 -> 1380m -> 1380 - 1440 = -60m
        bedtimeMinutes = Math.min(...eveningBlocks) * MINUTES_PER_BLOCK - 1440;
      } else if (morningBlocks.length > 0) {
        // Bedtime after midnight: e.g. 01:00 -> 60m
        bedtimeMinutes = Math.min(...morningBlocks) * MINUTES_PER_BLOCK;
      }

      let wakeMinutes: number | null = null;
      if (morningBlocks.length > 0) {
        wakeMinutes = (Math.max(...morningBlocks) + 1) * MINUTES_PER_BLOCK;
      }

      if (bedtimeMinutes !== null) bedtimeList.push(bedtimeMinutes);
      if (wakeMinutes !== null) wakeTimeList.push(wakeMinutes);
    }

    const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    const fullDateLabel = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    dailyAllocations.push({
      dateKey,
      dayLabel,
      fullDateLabel,
      dayOfWeek,
      isWeekend,
      isToday,
      isActive,
      focusBlocks,
      opsBlocks,
      vitalityBlocks,
      sleepBlocks,
      unassignedBlocks,
      focusMinutes: focusBlocks * MINUTES_PER_BLOCK,
      opsMinutes: opsBlocks * MINUTES_PER_BLOCK,
      vitalityMinutes: vitalityBlocks * MINUTES_PER_BLOCK,
      sleepMinutes: sleepBlocks * MINUTES_PER_BLOCK,
      unassignedMinutes: unassignedBlocks * MINUTES_PER_BLOCK,
      focusHours: Number(((focusBlocks * MINUTES_PER_BLOCK) / 60).toFixed(1)),
      opsHours: Number(((opsBlocks * MINUTES_PER_BLOCK) / 60).toFixed(1)),
      vitalityHours: Number(((vitalityBlocks * MINUTES_PER_BLOCK) / 60).toFixed(1)),
      sleepHours: Number(((sleepBlocks * MINUTES_PER_BLOCK) / 60).toFixed(1)),
      unassignedHours: Number(((unassignedBlocks * MINUTES_PER_BLOCK) / 60).toFixed(1)),
      blockCategoryIds,
    });
  }

  // KPI 1: Focus & Focus-to-Ops Ratio
  const totalFocusHours = Number(((totalFocusBlocks * MINUTES_PER_BLOCK) / 60).toFixed(1));
  const avgDailyFocusHours = Number((totalFocusHours / windowDays).toFixed(1));
  const focusAndOpsTotal = totalFocusBlocks + totalOpsBlocks;
  const focusToOpsRatioPercent =
    focusAndOpsTotal > 0 ? Math.round((totalFocusBlocks / focusAndOpsTotal) * 100) : 0;

  let focusToOpsRatioFormatted = '0% Maker';
  if (focusAndOpsTotal > 0) {
    if (totalOpsBlocks > 0) {
      const ratio = (totalFocusBlocks / totalOpsBlocks).toFixed(1);
      focusToOpsRatioFormatted = `${focusToOpsRatioPercent}% Maker (${ratio}:1)`;
    } else {
      focusToOpsRatioFormatted = `${focusToOpsRatioPercent}% Maker (All Focus)`;
    }
  }

  // KPI 2: Sleep & Consistency
  const totalSleepHours = Number(((totalSleepBlocks * MINUTES_PER_BLOCK) / 60).toFixed(1));
  const avgDailySleepHours = Number((totalSleepHours / windowDays).toFixed(1));

  let sleepConsistency: SleepConsistencyInfo;
  if (bedtimeList.length >= 2 || wakeTimeList.length >= 2) {
    const avgBedMinutes =
      bedtimeList.length > 0
        ? bedtimeList.reduce((sum, v) => sum + v, 0) / bedtimeList.length
        : 0;
    const avgWakeMinutes =
      wakeTimeList.length > 0
        ? wakeTimeList.reduce((sum, v) => sum + v, 0) / wakeTimeList.length
        : 420; // 07:00

    // Standard deviations
    const stdDevBed =
      bedtimeList.length >= 2
        ? Math.sqrt(
            bedtimeList.reduce((acc, v) => acc + Math.pow(v - avgBedMinutes, 2), 0) /
              bedtimeList.length
          )
        : 15;
    const stdDevWake =
      wakeTimeList.length >= 2
        ? Math.sqrt(
            wakeTimeList.reduce((acc, v) => acc + Math.pow(v - avgWakeMinutes, 2), 0) /
              wakeTimeList.length
          )
        : 15;

    const avgVariance = Math.round((stdDevBed + stdDevWake) / 2);
    // Score: 0 variance = 100%, 120m variance = 50%
    const score = Math.max(0, Math.min(100, Math.round(100 - avgVariance * 0.4)));

    // Format normalized bedtime into HH:MM
    const normBed = avgBedMinutes < 0 ? avgBedMinutes + 1440 : avgBedMinutes;
    const bedH = String(Math.floor(normBed / 60) % 24).padStart(2, '0');
    const bedM = String(Math.round(normBed % 60)).padStart(2, '0');
    const avgBedtimeLabel = `${bedH}:${bedM}`;

    const wakeH = String(Math.floor(avgWakeMinutes / 60) % 24).padStart(2, '0');
    const wakeM = String(Math.round(avgWakeMinutes % 60)).padStart(2, '0');
    const avgWakeTimeLabel = `${wakeH}:${wakeM}`;

    sleepConsistency = {
      hasSufficientData: true,
      activeSleepDays: Math.max(bedtimeList.length, wakeTimeList.length),
      avgBedtimeLabel,
      avgWakeTimeLabel,
      varianceMinutes: avgVariance,
      consistencyScore: score,
      description: avgVariance <= 20 ? 'High consistency' : `±${avgVariance}m variance`,
    };
  } else if (bedtimeList.length === 1 || wakeTimeList.length === 1) {
    sleepConsistency = {
      hasSufficientData: true,
      activeSleepDays: 1,
      avgBedtimeLabel: '23:00',
      avgWakeTimeLabel: '07:00',
      varianceMinutes: 0,
      consistencyScore: 100,
      description: 'Single day logged',
    };
  } else {
    sleepConsistency = {
      hasSufficientData: false,
      activeSleepDays: 0,
      avgBedtimeLabel: '--:--',
      avgWakeTimeLabel: '--:--',
      varianceMinutes: 0,
      consistencyScore: 0,
      description: 'No sleep logged',
    };
  }

  // KPI 3: Intentionality Score
  let intentionalityScore = 0;
  let driftPercent = 100;
  let avgDailyDriftHours = 24;

  if (activeDaysCount > 0) {
    const totalPossibleActiveBlocks = activeDaysCount * BLOCKS_PER_DAY;
    intentionalityScore = Math.round((totalAllocatedBlocksAll / totalPossibleActiveBlocks) * 100);
    driftPercent = Math.max(0, 100 - intentionalityScore);
    const totalDriftMinutes = (totalPossibleActiveBlocks - totalAllocatedBlocksAll) * MINUTES_PER_BLOCK;
    avgDailyDriftHours = Number(((totalDriftMinutes / activeDaysCount) / 60).toFixed(1));
  }

  // Weekdays vs Weekends Split
  const weekdayDays = dailyAllocations.filter((d) => !d.isWeekend);
  const weekendDays = dailyAllocations.filter((d) => d.isWeekend);

  const calcAverage = (days: DailyAllocation[]): DayTypeAverage => {
    const count = days.length;
    if (count === 0) {
      return {
        daysCount: 0,
        focusHoursPerDay: 0,
        opsHoursPerDay: 0,
        vitalityHoursPerDay: 0,
        sleepHoursPerDay: 0,
        unassignedHoursPerDay: 0,
        totalMappedHoursPerDay: 0,
      };
    }
    const sumFocus = days.reduce((acc, d) => acc + d.focusHours, 0);
    const sumOps = days.reduce((acc, d) => acc + d.opsHours, 0);
    const sumVitality = days.reduce((acc, d) => acc + d.vitalityHours, 0);
    const sumSleep = days.reduce((acc, d) => acc + d.sleepHours, 0);
    const sumUnassigned = days.reduce((acc, d) => acc + d.unassignedHours, 0);

    return {
      daysCount: count,
      focusHoursPerDay: Number((sumFocus / count).toFixed(1)),
      opsHoursPerDay: Number((sumOps / count).toFixed(1)),
      vitalityHoursPerDay: Number((sumVitality / count).toFixed(1)),
      sleepHoursPerDay: Number((sumSleep / count).toFixed(1)),
      unassignedHoursPerDay: Number((sumUnassigned / count).toFixed(1)),
      totalMappedHoursPerDay: Number(
        ((sumFocus + sumOps + sumVitality + sumSleep) / count).toFixed(1)
      ),
    };
  };

  const weekdaysAvg = calcAverage(weekdayDays);
  const weekendsAvg = calcAverage(weekendDays);

  // Top Activities Leaderboard
  const rankedList = Array.from(activityAggregator.values()).sort(
    (a, b) => b.blockCount - a.blockCount
  );
  const topActivities: RankedActivity[] = rankedList.slice(0, 8).map((act, idx) => {
    const category = categoryMap[act.categoryId];
    const minutes = act.blockCount * MINUTES_PER_BLOCK;
    const hours = Number((minutes / 60).toFixed(1));
    const percentageOfAllocated =
      totalAllocatedBlocksAll > 0
        ? Math.round((act.blockCount / totalAllocatedBlocksAll) * 100)
        : 0;

    return {
      rank: idx + 1,
      label: act.label,
      categoryId: act.categoryId,
      categoryName: category?.name ?? act.categoryId,
      categoryColor: category?.color ?? '#94a3b8',
      blockCount: act.blockCount,
      minutes,
      hours,
      percentageOfAllocated,
    };
  });

  // Circadian rhythm heatmap: take the last 7 days of the window
  const circadianDays = dailyAllocations.slice(-7);

  return {
    windowDays,
    startDateKey: dateKeys[0],
    endDateKey,
    dailyAllocations,
    activeDaysCount,
    totalFocusHours,
    avgDailyFocusHours,
    focusToOpsRatioPercent,
    focusToOpsRatioFormatted,
    totalSleepHours,
    avgDailySleepHours,
    sleepConsistency,
    intentionalityScore,
    driftPercent,
    avgDailyDriftHours,
    weekdaysAvg,
    weekendsAvg,
    topActivities,
    circadianDays,
  };
}

/**
 * Extracts recently used activity labels grouped by core category ID.
 */
export function getRecentLabelsByState(
  store: AppDataStore,
  maxPerState = 4
): Record<string, string[]> {
  const result: Record<string, string[]> = {
    focus: [],
    ops: [],
    vitality: [],
    sleep: [],
  };

  const seenMap: Record<string, Set<string>> = {
    focus: new Set(),
    ops: new Set(),
    vitality: new Set(),
    sleep: new Set(),
  };

  const sortedDates = Object.keys(store.days).sort().reverse();

  for (const dateKey of sortedDates) {
    const day = store.days[dateKey];
    if (!day || !day.blocks) continue;

    for (let i = 0; i < BLOCKS_PER_DAY; i++) {
      const entry = day.blocks[i];
      if (!entry || !entry.label || !entry.label.trim()) continue;

      const catId = migrateCategoryId(entry.categoryId);
      if (!result[catId]) {
        result[catId] = [];
        seenMap[catId] = new Set();
      }

      if (result[catId].length >= maxPerState) continue;

      const trimmed = entry.label.trim();
      const lower = trimmed.toLowerCase();
      if (!seenMap[catId].has(lower)) {
        seenMap[catId].add(lower);
        result[catId].push(trimmed);
      }
    }
  }

  return result;
}

import type {
  AppDataStore,
  BlockEntry,
  DayRecord,
  SleepScheduleSettings,
  UserSettings,
  WorkScheduleSettings,
} from '../types/blockair';
import { BLOCKS_PER_DAY, computeBlocksForTimeRange, parseDateKey } from './timeBlocks';

export const STORAGE_KEY = 'blockair:v1:store';
export const STORE_VERSION = 1;

export const DEFAULT_SETTINGS: UserSettings = {
  autoPrefillEnabled: false,
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
    categoryId: 'deep-work',
    label: 'Deep work',
    overwriteExisting: false,
    daysOfWeek: [1, 2, 3, 4, 5], // Monday through Friday
  },
};

export function sanitizeUserSettings(raw: unknown): UserSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  const autoPrefillEnabled =
    typeof obj.autoPrefillEnabled === 'boolean'
      ? obj.autoPrefillEnabled
      : DEFAULT_SETTINGS.autoPrefillEnabled;

  const rawSleep = (
    obj.sleep && typeof obj.sleep === 'object' ? obj.sleep : {}
  ) as Record<string, unknown>;
  const sleep: SleepScheduleSettings = {
    enabled:
      typeof rawSleep.enabled === 'boolean' ? rawSleep.enabled : DEFAULT_SETTINGS.sleep.enabled,
    startTime:
      typeof rawSleep.startTime === 'string' && /^\d{1,2}:\d{2}$/.test(rawSleep.startTime)
        ? rawSleep.startTime
        : DEFAULT_SETTINGS.sleep.startTime,
    endTime:
      typeof rawSleep.endTime === 'string' && /^\d{1,2}:\d{2}$/.test(rawSleep.endTime)
        ? rawSleep.endTime
        : DEFAULT_SETTINGS.sleep.endTime,
    label:
      typeof rawSleep.label === 'string'
        ? rawSleep.label.slice(0, 60)
        : DEFAULT_SETTINGS.sleep.label,
    overwriteExisting:
      typeof rawSleep.overwriteExisting === 'boolean'
        ? rawSleep.overwriteExisting
        : DEFAULT_SETTINGS.sleep.overwriteExisting,
  };

  const rawWork = (
    obj.work && typeof obj.work === 'object' ? obj.work : {}
  ) as Record<string, unknown>;
  const daysOfWeek = Array.isArray(rawWork.daysOfWeek)
    ? rawWork.daysOfWeek.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6)
    : DEFAULT_SETTINGS.work.daysOfWeek;

  const work: WorkScheduleSettings = {
    enabled:
      typeof rawWork.enabled === 'boolean' ? rawWork.enabled : DEFAULT_SETTINGS.work.enabled,
    startTime:
      typeof rawWork.startTime === 'string' && /^\d{1,2}:\d{2}$/.test(rawWork.startTime)
        ? rawWork.startTime
        : DEFAULT_SETTINGS.work.startTime,
    endTime:
      typeof rawWork.endTime === 'string' && /^\d{1,2}:\d{2}$/.test(rawWork.endTime)
        ? rawWork.endTime
        : DEFAULT_SETTINGS.work.endTime,
    categoryId:
      typeof rawWork.categoryId === 'string' && rawWork.categoryId.trim()
        ? rawWork.categoryId.trim()
        : DEFAULT_SETTINGS.work.categoryId,
    label:
      typeof rawWork.label === 'string' ? rawWork.label.slice(0, 60) : DEFAULT_SETTINGS.work.label,
    overwriteExisting:
      typeof rawWork.overwriteExisting === 'boolean'
        ? rawWork.overwriteExisting
        : DEFAULT_SETTINGS.work.overwriteExisting,
    daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : [1, 2, 3, 4, 5],
  };

  return {
    autoPrefillEnabled,
    sleep,
    work,
  };
}

export function createEmptyStore(): AppDataStore {
  return {
    version: STORE_VERSION,
    days: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

function isValidBlockIndex(key: string): boolean {
  const num = Number(key);
  return Number.isInteger(num) && num >= 0 && num < BLOCKS_PER_DAY;
}

function sanitizeDayRecord(dateKey: string, raw: unknown): DayRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  const rawBlocks =
    candidate.blocks && typeof candidate.blocks === 'object'
      ? (candidate.blocks as Record<string, unknown>)
      : {};

  const blocks: Record<number, BlockEntry> = {};
  for (const [k, v] of Object.entries(rawBlocks)) {
    if (!isValidBlockIndex(k) || !v || typeof v !== 'object') continue;
    const entryObj = v as Record<string, unknown>;
    if (typeof entryObj.categoryId !== 'string' || !entryObj.categoryId.trim()) continue;
    const label =
      typeof entryObj.label === 'string' && entryObj.label.trim().length > 0
        ? entryObj.label.trim().slice(0, 120)
        : undefined;
    const updatedAt =
      typeof entryObj.updatedAt === 'number' && Number.isFinite(entryObj.updatedAt)
        ? entryObj.updatedAt
        : Date.now();
    blocks[Number(k)] = {
      categoryId: entryObj.categoryId.trim(),
      ...(label ? { label } : {}),
      updatedAt,
    };
  }

  const reflection =
    typeof candidate.reflection === 'string' && candidate.reflection.trim().length > 0
      ? candidate.reflection.slice(0, 500)
      : undefined;

  const autoPrefilled = candidate.autoPrefilled === true ? true : undefined;

  return {
    dateKey,
    blocks,
    ...(reflection ? { reflection } : {}),
    ...(autoPrefilled ? { autoPrefilled: true } : {}),
  };
}

/**
 * Safely loads the persisted AppDataStore from localStorage.
 * Recovers gracefully if localStorage is unavailable or contains malformed JSON.
 */
export function loadStore(storage: Storage | undefined = globalThis.localStorage): AppDataStore {
  if (!storage) return createEmptyStore();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyStore();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return createEmptyStore();

    const record = parsed as Record<string, unknown>;
    const days: Record<string, DayRecord> = {};
    if (record.days && typeof record.days === 'object') {
      for (const [dateKey, dayVal] of Object.entries(record.days as Record<string, unknown>)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
        const sanitized = sanitizeDayRecord(dateKey, dayVal);
        if (sanitized) {
          days[dateKey] = sanitized;
        }
      }
    }

    const settings = sanitizeUserSettings(record.settings);

    return {
      version: STORE_VERSION,
      days,
      settings,
    };
  } catch {
    return createEmptyStore();
  }
}

/**
 * Persists the AppDataStore to localStorage safely.
 */
export function saveStore(
  store: AppDataStore,
  storage: Storage | undefined = globalThis.localStorage
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

/**
 * Assigns a category and optional activity label to one or more block indices for a given day.
 */
export function assignBlocksInDay(
  store: AppDataStore,
  dateKey: string,
  blockIndices: number[],
  payload: { categoryId: string; label?: string }
): AppDataStore {
  const trimmedCategory = payload.categoryId.trim();
  if (!trimmedCategory || blockIndices.length === 0) return store;

  const existingDay = store.days[dateKey] ?? { dateKey, blocks: {} };
  const nextBlocks: Record<number, BlockEntry> = { ...existingDay.blocks };
  const cleanedLabel = payload.label?.trim() ? payload.label.trim().slice(0, 120) : undefined;
  const now = Date.now();

  for (const idx of blockIndices) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= BLOCKS_PER_DAY) continue;
    nextBlocks[idx] = {
      categoryId: trimmedCategory,
      ...(cleanedLabel ? { label: cleanedLabel } : {}),
      updatedAt: now,
    };
  }

  return {
    ...store,
    days: {
      ...store.days,
      [dateKey]: {
        ...existingDay,
        dateKey,
        blocks: nextBlocks,
      },
    },
  };
}

/**
 * Updates only the activity label on existing assigned blocks, or assigns a default category if unassigned.
 */
export function updateBlocksLabelInDay(
  store: AppDataStore,
  dateKey: string,
  blockIndices: number[],
  label: string,
  fallbackCategoryId: string
): AppDataStore {
  if (blockIndices.length === 0) return store;
  const existingDay = store.days[dateKey] ?? { dateKey, blocks: {} };
  const nextBlocks: Record<number, BlockEntry> = { ...existingDay.blocks };
  const cleanedLabel = label.trim() ? label.trim().slice(0, 120) : undefined;
  const now = Date.now();

  for (const idx of blockIndices) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= BLOCKS_PER_DAY) continue;
    const current = nextBlocks[idx];
    const categoryId = current?.categoryId ?? fallbackCategoryId;
    nextBlocks[idx] = {
      categoryId,
      ...(cleanedLabel ? { label: cleanedLabel } : {}),
      updatedAt: now,
    };
  }

  return {
    ...store,
    days: {
      ...store.days,
      [dateKey]: {
        ...existingDay,
        dateKey,
        blocks: nextBlocks,
      },
    },
  };
}

/**
 * Deletes/clears specific block indices in a given day.
 */
export function clearBlocksInDay(
  store: AppDataStore,
  dateKey: string,
  blockIndices: number[]
): AppDataStore {
  const existingDay = store.days[dateKey];
  if (!existingDay || blockIndices.length === 0) return store;

  const nextBlocks: Record<number, BlockEntry> = { ...existingDay.blocks };
  for (const idx of blockIndices) {
    delete nextBlocks[idx];
  }

  return {
    ...store,
    days: {
      ...store.days,
      [dateKey]: {
        ...existingDay,
        blocks: nextBlocks,
      },
    },
  };
}

/**
 * Updates the daily reflection note for a given day.
 */
export function setDayReflection(
  store: AppDataStore,
  dateKey: string,
  reflection: string
): AppDataStore {
  const existingDay = store.days[dateKey] ?? { dateKey, blocks: {} };
  const trimmed = reflection.slice(0, 500);

  return {
    ...store,
    days: {
      ...store.days,
      [dateKey]: {
        ...existingDay,
        dateKey,
        reflection: trimmed,
      },
    },
  };
}

/**
 * Fills blocks between selectable start and end times for any category.
 */
export function fillCustomRangeBlocks(
  store: AppDataStore,
  dateKey: string,
  startTime: string,
  endTime: string,
  categoryId: string,
  overwriteExisting = false,
  label?: string
): { updatedStore: AppDataStore; filledCount: number; totalCount: number } {
  const targetIndices = computeBlocksForTimeRange(startTime, endTime);
  const existingDay = store.days[dateKey] ?? { dateKey, blocks: {} };
  const nextBlocks: Record<number, BlockEntry> = { ...existingDay.blocks };
  const now = Date.now();
  let filledCount = 0;
  const cleanedLabel = label?.trim() ? label.trim().slice(0, 120) : undefined;

  for (const idx of targetIndices) {
    if (!overwriteExisting && nextBlocks[idx]) continue;
    nextBlocks[idx] = {
      categoryId,
      ...(cleanedLabel ? { label: cleanedLabel } : {}),
      updatedAt: now,
    };
    filledCount += 1;
  }

  return {
    updatedStore: {
      ...store,
      days: {
        ...store.days,
        [dateKey]: {
          ...existingDay,
          dateKey,
          blocks: nextBlocks,
        },
      },
    },
    filledCount,
    totalCount: targetIndices.length,
  };
}

/**
 * Fills sleep blocks between selectable start and end times (e.g. 23:00 to 07:00).
 */
export function fillCustomSleepBlocks(
  store: AppDataStore,
  dateKey: string,
  startTime: string,
  endTime: string,
  overwriteExisting = false,
  label = 'Night sleep'
): { updatedStore: AppDataStore; filledCount: number; totalCount: number } {
  return fillCustomRangeBlocks(
    store,
    dateKey,
    startTime,
    endTime,
    'sleep',
    overwriteExisting,
    label || 'Night sleep'
  );
}

/**
 * Fills work hours blocks between selectable start and end times (e.g. 09:00 to 17:00).
 */
export function fillCustomWorkBlocks(
  store: AppDataStore,
  dateKey: string,
  startTime: string,
  endTime: string,
  categoryId = 'deep-work',
  overwriteExisting = false,
  label = 'Deep work'
): { updatedStore: AppDataStore; filledCount: number; totalCount: number } {
  return fillCustomRangeBlocks(
    store,
    dateKey,
    startTime,
    endTime,
    categoryId,
    overwriteExisting,
    label || 'Deep work'
  );
}

/**
 * Fills common sleep blocks (00:00–06:00 and 22:40–24:00 = 44 blocks) without overwriting already logged blocks.
 */
export function fillNightSleepBlocks(
  store: AppDataStore,
  dateKey: string,
  overwriteExisting = false
): AppDataStore {
  return fillCustomSleepBlocks(store, dateKey, '22:40', '06:00', overwriteExisting, 'Night sleep')
    .updatedStore;
}

/**
 * Updates the user's settings in AppDataStore.
 */
export function updateUserSettings(
  store: AppDataStore,
  settingsUpdate: Partial<UserSettings> | ((prev: UserSettings) => UserSettings)
): AppDataStore {
  const currentSettings = store.settings ?? DEFAULT_SETTINGS;
  const nextSettings =
    typeof settingsUpdate === 'function'
      ? settingsUpdate(currentSettings)
      : { ...currentSettings, ...settingsUpdate };

  return {
    ...store,
    settings: sanitizeUserSettings(nextSettings),
  };
}

/**
 * Automatically prefills sleep and work blocks for a given day based on the user's settings.
 * - By default (force = false), will NOT modify days that were already prefilled or already have logged blocks.
 * - When force = true, applies the configured routines immediately (useful for manual 'Apply to Day').
 */
export function autoPrefillDay(
  store: AppDataStore,
  dateKey: string,
  force = false
): {
  updatedStore: AppDataStore;
  applied: boolean;
  filledCount: number;
  sleepCount: number;
  workCount: number;
} {
  const settings = store.settings ?? DEFAULT_SETTINGS;

  if (!force && !settings.autoPrefillEnabled) {
    return { updatedStore: store, applied: false, filledCount: 0, sleepCount: 0, workCount: 0 };
  }

  const existingDay = store.days[dateKey];
  if (!force) {
    // Already prefilled or already has blocks logged
    if (existingDay?.autoPrefilled) {
      return { updatedStore: store, applied: false, filledCount: 0, sleepCount: 0, workCount: 0 };
    }
    if (existingDay && Object.keys(existingDay.blocks).length > 0) {
      return { updatedStore: store, applied: false, filledCount: 0, sleepCount: 0, workCount: 0 };
    }
  }

  let workingStore = store;
  let sleepCount = 0;
  let workCount = 0;

  // 1. Fill Sleep schedule
  if (settings.sleep.enabled) {
    const sleepRes = fillCustomSleepBlocks(
      workingStore,
      dateKey,
      settings.sleep.startTime,
      settings.sleep.endTime,
      force ? (settings.sleep.overwriteExisting ?? true) : settings.sleep.overwriteExisting,
      settings.sleep.label
    );
    workingStore = sleepRes.updatedStore;
    sleepCount = sleepRes.filledCount;
  }

  // 2. Fill Work schedule (if day of week matches)
  const dateObj = parseDateKey(dateKey);
  const dayOfWeek = dateObj.getDay(); // 0 is Sun, 1 is Mon...
  if (settings.work.enabled && settings.work.daysOfWeek.includes(dayOfWeek)) {
    const workRes = fillCustomWorkBlocks(
      workingStore,
      dateKey,
      settings.work.startTime,
      settings.work.endTime,
      settings.work.categoryId,
      force ? (settings.work.overwriteExisting ?? true) : settings.work.overwriteExisting,
      settings.work.label
    );
    workingStore = workRes.updatedStore;
    workCount = workRes.filledCount;
  }

  const dayRec = workingStore.days[dateKey] ?? { dateKey, blocks: {} };
  const updatedStore: AppDataStore = {
    ...workingStore,
    days: {
      ...workingStore.days,
      [dateKey]: {
        ...dayRec,
        autoPrefilled: true,
      },
    },
  };

  return {
    updatedStore,
    applied: true,
    filledCount: sleepCount + workCount,
    sleepCount,
    workCount,
  };
}

/**
 * Batch applies auto-prefill across multiple date keys.
 */
export function batchPrefillDays(
  store: AppDataStore,
  dateKeys: string[],
  force = false
): { updatedStore: AppDataStore; totalFilled: number } {
  let currentStore = store;
  let totalFilled = 0;
  for (const dateKey of dateKeys) {
    const res = autoPrefillDay(currentStore, dateKey, force);
    currentStore = res.updatedStore;
    totalFilled += res.filledCount;
  }
  return { updatedStore: currentStore, totalFilled };
}

import type { AppDataStore, BlockEntry, DayRecord, GridViewMode } from '../types/blockair';
import { BLOCKS_PER_DAY } from './timeBlocks';

export const STORAGE_KEY = 'blockair:v1:store';
export const STORE_VERSION = 1;

export function createEmptyStore(): AppDataStore {
  return {
    version: STORE_VERSION,
    days: {},
    preferredViewMode: 'full24',
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

  return {
    dateKey,
    blocks,
    ...(reflection ? { reflection } : {}),
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
    const preferredViewMode: GridViewMode =
      record.preferredViewMode === 'waking100' ? 'waking100' : 'full24';

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

    return {
      version: STORE_VERSION,
      days,
      preferredViewMode,
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
 * Sets the preferred grid view mode ('full24' vs 'waking100').
 */
export function setPreferredViewMode(store: AppDataStore, mode: GridViewMode): AppDataStore {
  return {
    ...store,
    preferredViewMode: mode,
  };
}

/**
 * Fills common sleep blocks (00:00–06:00 and 22:40–24:00 = 44 blocks) without overwriting already logged waking blocks.
 */
export function fillNightSleepBlocks(
  store: AppDataStore,
  dateKey: string,
  overwriteExisting = false
): AppDataStore {
  const existingDay = store.days[dateKey] ?? { dateKey, blocks: {} };
  const nextBlocks: Record<number, BlockEntry> = { ...existingDay.blocks };
  const now = Date.now();

  // 00:00-06:00 (0..35) and 22:40-24:00 (136..143) => 44 sleep blocks, leaving 100 waking blocks
  const sleepIndices = [
    ...Array.from({ length: 36 }, (_, i) => i),
    ...Array.from({ length: 8 }, (_, i) => 136 + i),
  ];

  for (const idx of sleepIndices) {
    if (!overwriteExisting && nextBlocks[idx]) continue;
    nextBlocks[idx] = {
      categoryId: 'sleep',
      label: 'Night sleep',
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

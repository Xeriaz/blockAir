import type { AppDataStore, Category } from '../types/blockair';
import {
  assignBlocksInDay,
  autoPrefillDay,
  DEFAULT_SETTINGS,
  fillCustomSleepBlocks,
  fillCustomWorkBlocks,
  migrateCategoryId,
} from './storage';
import {
  BLOCKS_PER_DAY,
  DEFAULT_CATEGORIES,
  formatDurationMinutes,
  getCurrentBlockIndex,
  MINUTES_PER_BLOCK,
  parseTimeToMinutes,
} from './timeBlocks';

export interface UrlActionResult {
  updatedStore: AppDataStore;
  handled: boolean;
  openSettings?: boolean;
  targetDateKey?: string;
  message?: string;
}

/**
 * Resolves a category ID from a user query parameter (either ID or friendly name).
 */
export function resolveCategory(
  queryVal: string | null | undefined,
  categories: Category[] = DEFAULT_CATEGORIES
): Category {
  if (!queryVal) return categories[0];
  const normalized = queryVal.trim().toLowerCase();
  const migrated = migrateCategoryId(normalized);

  const byMigratedId = categories.find((c) => c.id.toLowerCase() === migrated);
  if (byMigratedId) return byMigratedId;

  const byId = categories.find((c) => c.id.toLowerCase() === normalized);
  if (byId) return byId;

  const byName = categories.find(
    (c) => c.name.toLowerCase() === normalized || c.name.toLowerCase().includes(normalized)
  );
  if (byName) return byName;

  return categories[0];
}

/**
 * Builds an iOS Shortcut / PWA deep link URL.
 */
export function buildShortcutUrl(
  baseUrl: string,
  params: {
    action: string;
    category?: string;
    label?: string;
    duration?: number;
    time?: string;
    block?: string | number;
  }
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('action', params.action);
  if (params.category) url.searchParams.set('category', params.category);
  if (params.label) url.searchParams.set('label', params.label);
  if (params.duration && params.duration > 10) {
    url.searchParams.set('duration', String(params.duration));
  }
  if (params.time) url.searchParams.set('time', params.time);
  if (params.block !== undefined && params.block !== 'current' && params.block !== 'now') {
    url.searchParams.set('block', String(params.block));
  }
  return url.toString();
}

/**
 * Parses query params and executes deep-link actions from iOS Shortcuts or external triggers.
 */
export function parseAndExecuteUrlAction(
  search: string,
  store: AppDataStore,
  activeDateKey: string,
  categories: Category[] = DEFAULT_CATEGORIES
): UrlActionResult {
  if (!search) return { updatedStore: store, handled: false };

  // Support both search (?action=...) and hash (#action=...)
  const cleanSearch = search.startsWith('#') ? search.slice(1) : search.startsWith('?') ? search.slice(1) : search;
  const searchParams = new URLSearchParams(cleanSearch);

  const action = searchParams.get('action') || (searchParams.get('open') === 'settings' ? 'settings' : null);
  if (!action) return { updatedStore: store, handled: false };

  const rawDate = searchParams.get('date');
  const targetDateKey = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : activeDateKey;

  // 1. Settings Action
  if (action === 'settings') {
    return {
      updatedStore: store,
      handled: true,
      openSettings: true,
      targetDateKey,
      message: '⚡ Opened Settings',
    };
  }

  // 2. Prefill Sleep Action
  if (action === 'prefill_sleep') {
    const settings = store.settings ?? DEFAULT_SETTINGS;
    const res = fillCustomSleepBlocks(
      store,
      targetDateKey,
      settings.sleep.startTime,
      settings.sleep.endTime,
      true,
      settings.sleep.label
    );
    return {
      updatedStore: res.updatedStore,
      handled: true,
      targetDateKey,
      message: `⚡ iOS Shortcut: Pre-filled sleep (${settings.sleep.startTime}–${settings.sleep.endTime})`,
    };
  }

  // 3. Prefill Work Action
  if (action === 'prefill_work') {
    const settings = store.settings ?? DEFAULT_SETTINGS;
    const res = fillCustomWorkBlocks(
      store,
      targetDateKey,
      settings.work.startTime,
      settings.work.endTime,
      settings.work.categoryId,
      true,
      settings.work.label
    );
    return {
      updatedStore: res.updatedStore,
      handled: true,
      targetDateKey,
      message: `⚡ iOS Shortcut: Pre-filled work schedule (${settings.work.startTime}–${settings.work.endTime})`,
    };
  }

  // 4. Auto-Prefill Day Action
  if (action === 'auto_prefill') {
    const res = autoPrefillDay(store, targetDateKey, true);
    return {
      updatedStore: res.updatedStore,
      handled: true,
      targetDateKey,
      message: `⚡ iOS Shortcut: Applied routines (${res.filledCount} blocks mapped)`,
    };
  }

  // 5. Log Block(s) Action
  if (action === 'log' || action === 'log_block' || action === 'quick_log') {
    const rawCategory = searchParams.get('category');
    const matchedCategory = resolveCategory(rawCategory, categories);
    const label = (searchParams.get('label') || searchParams.get('note') || '').trim();

    // Determine start block
    let startBlock: number;
    const blockParam = searchParams.get('block');
    const timeParam = searchParams.get('time');

    if (blockParam && blockParam !== 'current' && blockParam !== 'now') {
      const parsed = parseInt(blockParam, 10);
      startBlock = Number.isInteger(parsed) ? Math.max(0, Math.min(BLOCKS_PER_DAY - 1, parsed)) : getCurrentBlockIndex();
    } else if (timeParam && /^\d{1,2}:\d{2}$/.test(timeParam)) {
      const minutes = parseTimeToMinutes(timeParam);
      startBlock = Math.max(0, Math.min(BLOCKS_PER_DAY - 1, Math.floor(minutes / MINUTES_PER_BLOCK)));
    } else {
      startBlock = getCurrentBlockIndex();
    }

    // Determine block count / duration
    const durationParam = searchParams.get('duration');
    const durationMinutes = durationParam ? parseInt(durationParam, 10) : MINUTES_PER_BLOCK;
    const validMinutes = Number.isInteger(durationMinutes) && durationMinutes > 0 ? durationMinutes : MINUTES_PER_BLOCK;
    const blockCount = Math.max(1, Math.min(BLOCKS_PER_DAY, Math.ceil(validMinutes / MINUTES_PER_BLOCK)));

    const targetBlocks: number[] = [];
    for (let i = 0; i < blockCount; i++) {
      const blockIdx = startBlock + i;
      if (blockIdx < BLOCKS_PER_DAY) {
        targetBlocks.push(blockIdx);
      }
    }

    const updatedStore = assignBlocksInDay(store, targetDateKey, targetBlocks, {
      categoryId: matchedCategory.id,
      label: label || undefined,
    });

    const totalDurStr = formatDurationMinutes(targetBlocks.length * MINUTES_PER_BLOCK);
    const labelNotice = label ? `: "${label}"` : '';

    return {
      updatedStore,
      handled: true,
      targetDateKey,
      message: `⚡ iOS Shortcut: Logged ${targetBlocks.length} block (${totalDurStr}) as ${matchedCategory.name}${labelNotice}`,
    };
  }

  return { updatedStore: store, handled: false };
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BlockComposer, type InteractionTool } from './components/BlockComposer';
import { BlockGrid } from './components/BlockGrid';
import { DateNavigator } from './components/DateNavigator';
import { DayOverview } from './components/DayOverview';
import { SettingsModal } from './components/SettingsModal';
import type { AppDataStore, UserSettings } from './types/blockair';
import {
  assignBlocksInDay,
  autoPrefillDay,
  batchPrefillDays,
  clearBlocksInDay,
  DEFAULT_SETTINGS,
  fillCustomSleepBlocks,
  fillCustomWorkBlocks,
  loadStore,
  saveStore,
  setDayReflection,
  updateUserSettings,
} from './utils/storage';
import {
  BLOCKS_PER_DAY,
  computeDayOverview,
  DEFAULT_CATEGORIES,
  formatClock24h,
  formatDateKey,
  formatDurationMinutes,
  getBlockTimeRange,
  getCategoryMap,
  getCurrentBlockIndex,
  MINUTES_PER_BLOCK,
  shiftDateKey,
} from './utils/timeBlocks';
import { parseAndExecuteUrlAction } from './utils/urlActions';

function buildInclusiveRange(a: number, b: number): number[] {
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export const App: React.FC = () => {
  const [store, setStore] = useState<AppDataStore>(() => loadStore());
  const [todayDateKey, setTodayDateKey] = useState<string>(() => formatDateKey(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatDateKey(new Date()));
  const [clock24h, setClock24h] = useState<string>(() => formatClock24h(new Date()));
  const [currentBlockIndex, setCurrentBlockIndex] = useState<number>(() =>
    getCurrentBlockIndex(new Date())
  );

  const [activeCategoryId, setActiveCategoryId] = useState<string>(DEFAULT_CATEGORIES[0].id);
  const [activityDraft, setActivityDraft] = useState<string>('');
  const [interactionTool, setInteractionTool] = useState<InteractionTool>('select');
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);
  const [highlightedCategoryId, setHighlightedCategoryId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  const feedbackTimerRef = useRef<number | null>(null);

  const announceFeedback = (message: string) => {
    setFeedbackMessage(message);
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackMessage(null);
    }, 3200);
  };

  useEffect(() => {
    saveStore(store);
  }, [store]);

  // Handle iOS Shortcuts / Deep Link actions from URL search or hash
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = window.location.search || window.location.hash;
    if (!search) return;

    const res = parseAndExecuteUrlAction(search, store, selectedDateKey, DEFAULT_CATEGORIES);
    if (res.handled) {
      if (res.updatedStore !== store) {
        setStore(res.updatedStore);
      }
      if (res.targetDateKey && res.targetDateKey !== selectedDateKey) {
        setSelectedDateKey(res.targetDateKey);
      }
      if (res.openSettings) {
        setIsSettingsModalOpen(true);
      }
      if (res.message) {
        announceFeedback(res.message);
      }
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {
        // Safe in test environments
      }
    }
  }, []);

  // Automatically prefill sleep & work schedules if day is unvisited / eligible
  useEffect(() => {
    setStore((prevStore) => {
      const res = autoPrefillDay(prevStore, selectedDateKey, false);
      if (res.applied && res.filledCount > 0) {
        const parts: string[] = [];
        if (res.sleepCount > 0) parts.push('Sleep');
        if (res.workCount > 0) parts.push('Work');
        announceFeedback(
          `✨ Auto-prefilled ${res.filledCount} blocks for daily routines (${parts.join(' & ')})`
        );
        return res.updatedStore;
      }
      return prevStore;
    });
  }, [selectedDateKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date();
      setTodayDateKey(formatDateKey(now));
      setClock24h(formatClock24h(now));
      setCurrentBlockIndex(getCurrentBlockIndex(now));
    }, 10_000);
    return () => window.clearInterval(interval);
  }, []);

  const currentDayRecord = store.days[selectedDateKey];
  const dayBlocks = currentDayRecord?.blocks ?? {};
  const dayReflection = currentDayRecord?.reflection ?? '';
  const categoryMap = useMemo(() => getCategoryMap(DEFAULT_CATEGORIES), []);

  const overviewStats = useMemo(
    () => computeDayOverview(currentDayRecord, DEFAULT_CATEGORIES),
    [currentDayRecord]
  );

  const handleSelectDate = (nextDateKey: string) => {
    setSelectedDateKey(nextDateKey);
    setSelectedBlocks([]);
    setSelectionAnchor(null);
    setRangeAnchor(null);
  };

  const handleShiftDate = (deltaDays: number) => {
    const nextDateKey = shiftDateKey(selectedDateKey, deltaDays);
    handleSelectDate(nextDateKey);
  };

  const handleChangeTool = (tool: InteractionTool) => {
    setInteractionTool(tool);
    if (tool === 'range') {
      if (selectedBlocks.length === 1) {
        setRangeAnchor(selectedBlocks[0]);
        announceFeedback(
          `Start set to ${getBlockTimeRange(selectedBlocks[0]).start}. Tap any block to complete range.`
        );
      } else {
        setRangeAnchor(null);
      }
    } else {
      setRangeAnchor(null);
    }
  };

  const applyCategoryAndNoteToBlocks = (targetBlocks: number[], overrideCategoryId?: string) => {
    if (targetBlocks.length === 0) return;
    const categoryIdToUse = overrideCategoryId ?? activeCategoryId;
    const categoryName = categoryMap[categoryIdToUse]?.name ?? categoryIdToUse;
    const trimmedNote = activityDraft.trim();

    setStore((prev) =>
      assignBlocksInDay(prev, selectedDateKey, targetBlocks, {
        categoryId: categoryIdToUse,
        label: trimmedNote || undefined,
      })
    );

    const durationStr = formatDurationMinutes(targetBlocks.length * MINUTES_PER_BLOCK);
    announceFeedback(
      `Saved ${targetBlocks.length} ${targetBlocks.length === 1 ? 'block' : 'blocks'} (${durationStr}) as ${categoryName}${trimmedNote ? `: "${trimmedNote}"` : ''}`
    );
  };

  const deleteBlocks = (targetBlocks: number[]) => {
    if (targetBlocks.length === 0) return;
    setStore((prev) => clearBlocksInDay(prev, selectedDateKey, targetBlocks));
    announceFeedback(
      `Cleared ${targetBlocks.length} ${targetBlocks.length === 1 ? 'block' : 'blocks'}`
    );
  };

  const handleBlockInteract = (blockIndex: number, isShiftKey: boolean) => {
    if (interactionTool === 'paint') {
      applyCategoryAndNoteToBlocks([blockIndex]);
      return;
    }

    if (interactionTool === 'erase') {
      deleteBlocks([blockIndex]);
      return;
    }

    // Two-Tap Range mode (specifically optimized for mobile touch)
    if (interactionTool === 'range') {
      if (rangeAnchor === null) {
        setRangeAnchor(blockIndex);
        setSelectedBlocks([blockIndex]);
        setSelectionAnchor(blockIndex);
        announceFeedback(
          `Start set to ${getBlockTimeRange(blockIndex).start}. Now tap end block.`
        );
      } else {
        const range = buildInclusiveRange(rangeAnchor, blockIndex);
        setSelectedBlocks(range);
        setSelectionAnchor(blockIndex);
        setRangeAnchor(null);
        const durationStr = formatDurationMinutes(range.length * MINUTES_PER_BLOCK);
        announceFeedback(`Selected ${range.length} blocks (${durationStr})`);
      }
      return;
    }

    // 'select' tool mode: support single tap, Shift+click, and tap-toggle
    if (isShiftKey && selectionAnchor !== null) {
      const range = buildInclusiveRange(selectionAnchor, blockIndex);
      setSelectedBlocks(range);
      return;
    }

    // If clicking the sole already-selected block, toggle selection off
    if (selectedBlocks.length === 1 && selectedBlocks[0] === blockIndex) {
      setSelectedBlocks([]);
      setSelectionAnchor(null);
      setRangeAnchor(null);
      return;
    }

    setSelectedBlocks([blockIndex]);
    setSelectionAnchor(blockIndex);
    setRangeAnchor(null);

    // Sync composer fields with the clicked block if it already has an entry
    const existing = dayBlocks[blockIndex];
    if (existing) {
      setActiveCategoryId(existing.categoryId);
      setActivityDraft(existing.label ?? '');
    }
  };

  const handleBlockDragOver = (blockIndex: number) => {
    if (interactionTool === 'paint') {
      applyCategoryAndNoteToBlocks([blockIndex]);
      return;
    }
    if (interactionTool === 'erase') {
      deleteBlocks([blockIndex]);
      return;
    }

    // In select or range mode: dragging expands the selection range
    const anchor = rangeAnchor !== null ? rangeAnchor : selectionAnchor;
    if (anchor !== null) {
      setSelectedBlocks(buildInclusiveRange(anchor, blockIndex));
    } else {
      setSelectionAnchor(blockIndex);
      setSelectedBlocks([blockIndex]);
    }
  };

  const handleStartRangeFromSelection = () => {
    if (selectedBlocks.length === 1) {
      const block = selectedBlocks[0];
      setInteractionTool('range');
      setRangeAnchor(block);
      announceFeedback(
        `Start set to ${getBlockTimeRange(block).start}. Tap any block to complete the range.`
      );
    }
  };

  const handleSelectHourRow = (hourBlockIndices: number[]) => {
    const allSelected = hourBlockIndices.every((idx) => selectedBlocks.includes(idx));
    if (allSelected) {
      setSelectedBlocks((prev) => prev.filter((idx) => !hourBlockIndices.includes(idx)));
      setSelectionAnchor(null);
      setRangeAnchor(null);
    } else {
      setSelectedBlocks(hourBlockIndices);
      setSelectionAnchor(hourBlockIndices[0] ?? null);
      setRangeAnchor(null);
    }
  };

  const handleFillCustomSleep = (options: {
    startTime: string;
    endTime: string;
    overwriteExisting: boolean;
    label: string;
  }) => {
    const result = fillCustomSleepBlocks(
      store,
      selectedDateKey,
      options.startTime,
      options.endTime,
      options.overwriteExisting,
      options.label
    );
    setStore(result.updatedStore);
    const dur = formatDurationMinutes(result.filledCount * MINUTES_PER_BLOCK);
    announceFeedback(
      `Pre-filled ${result.filledCount} sleep blocks (${dur}) for ${options.startTime}–${options.endTime}`
    );
  };

  const handleFillCustomWork = (options: {
    startTime: string;
    endTime: string;
    categoryId: string;
    overwriteExisting: boolean;
    label: string;
  }) => {
    const result = fillCustomWorkBlocks(
      store,
      selectedDateKey,
      options.startTime,
      options.endTime,
      options.categoryId,
      options.overwriteExisting,
      options.label
    );
    setStore(result.updatedStore);
    const dur = formatDurationMinutes(result.filledCount * MINUTES_PER_BLOCK);
    announceFeedback(
      `Pre-filled ${result.filledCount} work blocks (${dur}) for ${options.startTime}–${options.endTime}`
    );
  };

  const handleClearEntireDay = () => {
    const allIndices = Array.from({ length: BLOCKS_PER_DAY }, (_, i) => i);
    setStore((prev) => clearBlocksInDay(prev, selectedDateKey, allIndices));
    setSelectedBlocks([]);
    setSelectionAnchor(null);
    setRangeAnchor(null);
    announceFeedback('Reset all blocks for this day');
  };

  const handleSaveSettings = (nextSettings: UserSettings) => {
    setStore((prev) => updateUserSettings(prev, nextSettings));
    announceFeedback('Saved schedule and routine settings');
  };

  const handleApplySettingsToSelectedDay = () => {
    const res = autoPrefillDay(store, selectedDateKey, true);
    setStore(res.updatedStore);
    announceFeedback(`Applied routine: filled ${res.filledCount} blocks for this day`);
  };

  const handleApplySettingsToNext7Days = () => {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(shiftDateKey(selectedDateKey, i));
    }
    const res = batchPrefillDays(store, days, true);
    setStore(res.updatedStore);
    announceFeedback(`Applied routine across the next 7 days (${res.totalFilled} blocks mapped)`);
  };

  const handleRunTestShortcutAction = (url: string) => {
    try {
      const parsed = new URL(url);
      const res = parseAndExecuteUrlAction(
        parsed.search,
        store,
        selectedDateKey,
        DEFAULT_CATEGORIES
      );
      if (res.handled) {
        setStore(res.updatedStore);
        if (res.targetDateKey) setSelectedDateKey(res.targetDateKey);
        if (res.message) announceFeedback(res.message);
      }
    } catch {
      announceFeedback('Error running test shortcut action');
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isFormElement =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isFormElement) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        setSelectedBlocks([]);
        setSelectionAnchor(null);
        setRangeAnchor(null);
        setHighlightedCategoryId(null);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlocks.length > 0) {
        e.preventDefault();
        deleteBlocks(selectedBlocks);
        setSelectedBlocks([]);
        setSelectionAnchor(null);
        setRangeAnchor(null);
        return;
      }

      const matchedCat = DEFAULT_CATEGORIES.find((cat) => cat.shortcut === e.key);
      if (matchedCat && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setActiveCategoryId(matchedCat.id);
        if (selectedBlocks.length > 0 && (interactionTool === 'select' || interactionTool === 'range')) {
          applyCategoryAndNoteToBlocks(selectedBlocks, matchedCat.id);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const isViewingToday = selectedDateKey === todayDateKey;

  return (
    <div className="app-shell">
      <DateNavigator
        selectedDateKey={selectedDateKey}
        todayDateKey={todayDateKey}
        clock24h={clock24h}
        currentBlockIndex={currentBlockIndex}
        onSelectDate={handleSelectDate}
        onShiftDate={handleShiftDate}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <main className="main-workspace">
        <div className="primary-column">
          <BlockComposer
            categories={DEFAULT_CATEGORIES}
            activeCategoryId={activeCategoryId}
            activityDraft={activityDraft}
            interactionTool={interactionTool}
            selectedBlocks={selectedBlocks}
            rangeAnchor={rangeAnchor}
            onSelectCategory={setActiveCategoryId}
            onChangeActivityDraft={setActivityDraft}
            onChangeTool={handleChangeTool}
            onApplyToSelection={(overrideCatId) =>
              applyCategoryAndNoteToBlocks(selectedBlocks, overrideCatId)
            }
            onDeleteSelection={() => {
              deleteBlocks(selectedBlocks);
              setSelectedBlocks([]);
              setSelectionAnchor(null);
              setRangeAnchor(null);
            }}
            onClearSelection={() => {
              setSelectedBlocks([]);
              setSelectionAnchor(null);
              setRangeAnchor(null);
            }}
            onStartRangeFromSelection={handleStartRangeFromSelection}
          />

          <BlockGrid
            blocks={dayBlocks}
            categories={DEFAULT_CATEGORIES}
            selectedBlocks={selectedBlocks}
            rangeAnchor={rangeAnchor}
            currentBlockIndex={isViewingToday ? currentBlockIndex : null}
            interactionTool={interactionTool}
            highlightedCategoryId={highlightedCategoryId}
            onBlockInteract={handleBlockInteract}
            onBlockDragOver={handleBlockDragOver}
            onSelectHourRow={handleSelectHourRow}
          />
        </div>

        <DayOverview
          stats={overviewStats}
          categories={DEFAULT_CATEGORIES}
          reflection={dayReflection}
          currentBlockIndex={isViewingToday ? currentBlockIndex : null}
          highlightedCategoryId={highlightedCategoryId}
          onHighlightCategory={setHighlightedCategoryId}
          onReflectionChange={(val) =>
            setStore((prev) => setDayReflection(prev, selectedDateKey, val))
          }
          onFillCustomSleep={handleFillCustomSleep}
          onFillCustomWork={handleFillCustomWork}
          onClearEntireDay={handleClearEntireDay}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        categories={DEFAULT_CATEGORIES}
        settings={store.settings ?? DEFAULT_SETTINGS}
        onSaveSettings={handleSaveSettings}
        onApplyToSelectedDay={handleApplySettingsToSelectedDay}
        onApplyToNext7Days={handleApplySettingsToNext7Days}
        onRunTestShortcutAction={handleRunTestShortcutAction}
      />

      {feedbackMessage && (
        <div className="toast-banner" role="status" aria-live="polite">
          <span className="toast-dot" aria-hidden="true" />
          <span>{feedbackMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;

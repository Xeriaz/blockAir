import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BlockComposer, type InteractionTool } from './components/BlockComposer';
import { BlockGrid } from './components/BlockGrid';
import { DateNavigator } from './components/DateNavigator';
import { DayOverview } from './components/DayOverview';
import type { AppDataStore, GridViewMode } from './types/blockair';
import {
  assignBlocksInDay,
  clearBlocksInDay,
  fillNightSleepBlocks,
  loadStore,
  saveStore,
  setDayReflection,
  setPreferredViewMode,
} from './utils/storage';
import {
  BLOCKS_PER_DAY,
  computeDayOverview,
  DEFAULT_CATEGORIES,
  formatClock24h,
  formatDateKey,
  formatDurationMinutes,
  getCategoryMap,
  getCurrentBlockIndex,
  MINUTES_PER_BLOCK,
  shiftDateKey,
} from './utils/timeBlocks';

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
  const [highlightedCategoryId, setHighlightedCategoryId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

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
  const viewMode = store.preferredViewMode;
  const categoryMap = useMemo(() => getCategoryMap(DEFAULT_CATEGORIES), []);

  const overviewStats = useMemo(
    () => computeDayOverview(currentDayRecord, DEFAULT_CATEGORIES, viewMode),
    [currentDayRecord, viewMode]
  );

  const handleSelectDate = (nextDateKey: string) => {
    setSelectedDateKey(nextDateKey);
    setSelectedBlocks([]);
    setSelectionAnchor(null);
  };

  const handleShiftDate = (deltaDays: number) => {
    const nextDateKey = shiftDateKey(selectedDateKey, deltaDays);
    handleSelectDate(nextDateKey);
  };

  const handleViewModeChange = (mode: GridViewMode) => {
    setStore((prev) => setPreferredViewMode(prev, mode));
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

    // 'select' tool mode: support single click and Shift+click range selection
    if (isShiftKey && selectionAnchor !== null) {
      const range = buildInclusiveRange(selectionAnchor, blockIndex);
      setSelectedBlocks(range);
      return;
    }

    // If clicking the sole already-selected block, toggle selection off
    if (selectedBlocks.length === 1 && selectedBlocks[0] === blockIndex) {
      setSelectedBlocks([]);
      setSelectionAnchor(null);
      return;
    }

    setSelectedBlocks([blockIndex]);
    setSelectionAnchor(blockIndex);

    // Sync composer fields with the clicked block if it already has an entry
    const existing = dayBlocks[blockIndex];
    if (existing) {
      setActiveCategoryId(existing.categoryId);
      setActivityDraft(existing.label ?? '');
    }
  };

  const handleBlockDragEnter = (blockIndex: number) => {
    if (interactionTool === 'paint') {
      applyCategoryAndNoteToBlocks([blockIndex]);
      return;
    }
    if (interactionTool === 'erase') {
      deleteBlocks([blockIndex]);
      return;
    }
    if (selectionAnchor !== null) {
      setSelectedBlocks(buildInclusiveRange(selectionAnchor, blockIndex));
    } else {
      setSelectionAnchor(blockIndex);
      setSelectedBlocks([blockIndex]);
    }
  };

  const handleSelectHourRow = (hourBlockIndices: number[]) => {
    const allSelected = hourBlockIndices.every((idx) => selectedBlocks.includes(idx));
    if (allSelected) {
      setSelectedBlocks((prev) => prev.filter((idx) => !hourBlockIndices.includes(idx)));
      setSelectionAnchor(null);
    } else {
      setSelectedBlocks(hourBlockIndices);
      setSelectionAnchor(hourBlockIndices[0] ?? null);
    }
  };

  const handleFillNightSleep = () => {
    setStore((prev) => fillNightSleepBlocks(prev, selectedDateKey, false));
    announceFeedback('Filled unassigned night sleep blocks (00:00–06:00 & 22:40–24:00)');
  };

  const handleClearEntireDay = () => {
    const allIndices = Array.from({ length: BLOCKS_PER_DAY }, (_, i) => i);
    setStore((prev) => clearBlocksInDay(prev, selectedDateKey, allIndices));
    setSelectedBlocks([]);
    setSelectionAnchor(null);
    announceFeedback('Reset all blocks for this day');
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
        setHighlightedCategoryId(null);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlocks.length > 0) {
        e.preventDefault();
        deleteBlocks(selectedBlocks);
        setSelectedBlocks([]);
        setSelectionAnchor(null);
        return;
      }

      const matchedCat = DEFAULT_CATEGORIES.find((cat) => cat.shortcut === e.key);
      if (matchedCat && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setActiveCategoryId(matchedCat.id);
        if (selectedBlocks.length > 0 && interactionTool === 'select') {
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
        viewMode={viewMode}
        onSelectDate={handleSelectDate}
        onShiftDate={handleShiftDate}
        onViewModeChange={handleViewModeChange}
      />

      <main className="main-workspace">
        <div className="primary-column">
          <BlockComposer
            categories={DEFAULT_CATEGORIES}
            activeCategoryId={activeCategoryId}
            activityDraft={activityDraft}
            interactionTool={interactionTool}
            selectedBlocks={selectedBlocks}
            onSelectCategory={setActiveCategoryId}
            onChangeActivityDraft={setActivityDraft}
            onChangeTool={setInteractionTool}
            onApplyToSelection={(overrideCatId) => applyCategoryAndNoteToBlocks(selectedBlocks, overrideCatId)}
            onDeleteSelection={() => {
              deleteBlocks(selectedBlocks);
              setSelectedBlocks([]);
              setSelectionAnchor(null);
            }}
            onClearSelection={() => {
              setSelectedBlocks([]);
              setSelectionAnchor(null);
            }}
          />

          <BlockGrid
            blocks={dayBlocks}
            categories={DEFAULT_CATEGORIES}
            viewMode={viewMode}
            selectedBlocks={selectedBlocks}
            currentBlockIndex={isViewingToday ? currentBlockIndex : null}
            interactionTool={interactionTool}
            highlightedCategoryId={highlightedCategoryId}
            onBlockInteract={handleBlockInteract}
            onBlockDragEnter={handleBlockDragEnter}
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
          onFillNightSleep={handleFillNightSleep}
          onClearEntireDay={handleClearEntireDay}
        />
      </main>

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

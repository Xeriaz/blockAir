import React, { useEffect, useRef } from 'react';
import type { BlockEntry, Category } from '../types/blockair';
import {
  BLOCKS_PER_DAY,
  BLOCKS_PER_HOUR,
  getBlockTimeRange,
  getCategoryMap,
  groupBlocksByHour,
} from '../utils/timeBlocks';
import type { InteractionTool } from './BlockComposer';

interface BlockGridProps {
  blocks: Record<number, BlockEntry>;
  categories: Category[];
  selectedBlocks: number[];
  rangeAnchor: number | null;
  currentBlockIndex: number | null;
  interactionTool: InteractionTool;
  highlightedCategoryId: string | null;
  onBlockInteract: (blockIndex: number, isShiftKey: boolean) => void;
  onBlockDragOver: (blockIndex: number) => void;
  onSelectHourRow: (blockIndices: number[]) => void;
}

export const BlockGrid: React.FC<BlockGridProps> = ({
  blocks,
  categories,
  selectedBlocks,
  rangeAnchor,
  currentBlockIndex,
  interactionTool,
  highlightedCategoryId,
  onBlockInteract,
  onBlockDragOver,
  onSelectHourRow,
}) => {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const lastHoveredBlockRef = useRef<number | null>(null);

  const categoryMap = getCategoryMap(categories);
  const hourGroups = groupBlocksByHour();
  const selectedSet = new Set(selectedBlocks);

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      // Use document.elementFromPoint so touch drag works across elements on mobile
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-block-index]');
      if (el) {
        const rawIdx = el.getAttribute('data-block-index');
        if (rawIdx !== null) {
          const idx = Number(rawIdx);
          if (
            !Number.isNaN(idx) &&
            idx >= 0 &&
            idx < BLOCKS_PER_DAY &&
            idx !== lastHoveredBlockRef.current
          ) {
            lastHoveredBlockRef.current = idx;
            onBlockDragOver(idx);
          }
        }
      }
    };

    const handleGlobalPointerUp = () => {
      isDraggingRef.current = false;
      lastHoveredBlockRef.current = null;
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [onBlockDragOver]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, blockIndex: number) => {
    let targetIndex: number | null = null;
    if (e.key === 'ArrowRight') targetIndex = blockIndex + 1;
    else if (e.key === 'ArrowLeft') targetIndex = blockIndex - 1;
    else if (e.key === 'ArrowDown') targetIndex = blockIndex + BLOCKS_PER_HOUR;
    else if (e.key === 'ArrowUp') targetIndex = blockIndex - BLOCKS_PER_HOUR;

    if (targetIndex !== null) {
      e.preventDefault();
      const targetButton = gridRef.current?.querySelector<HTMLButtonElement>(
        `button[data-block-index="${targetIndex}"]`
      );
      targetButton?.focus();
    }
  };

  return (
    <section className="grid-panel" aria-label="Daily time block grid">
      <div className="grid-panel-header">
        <div className="grid-title-group">
          <h2 className="panel-title">24-Hour Grid · 144 Blocks</h2>
          <span className="grid-subtitle">
            10 min / block · 6 blocks / row · 24 hours (00:00–24:00)
          </span>
        </div>
        <div className="minute-markers" aria-hidden="true">
          <span>:00</span>
          <span>:10</span>
          <span>:20</span>
          <span>:30</span>
          <span>:40</span>
          <span>:50</span>
        </div>
      </div>

      <div className={`hour-rows mode-${interactionTool}`} ref={gridRef}>
        {hourGroups.map((group) => {
          const isHourSelected = group.blockIndices.every((idx) => selectedSet.has(idx));
          return (
            <div key={group.hour} className="hour-row">
              <button
                type="button"
                className={`hour-label-btn ${isHourSelected ? 'is-selected' : ''}`}
                onClick={() => onSelectHourRow(group.blockIndices)}
                title={`Select full hour ${group.hourLabel}`}
                aria-label={`Select hour ${group.hourLabel}`}
              >
                <span className="hour-time">{group.hourLabel}</span>
                <span className="hour-period">{group.periodLabel}</span>
              </button>

              <div className={`hour-blocks-track track-${interactionTool}`}>
                {group.blockIndices.map((blockIndex) => {
                  const range = getBlockTimeRange(blockIndex);
                  const entry = blocks[blockIndex];
                  const category = entry ? categoryMap[entry.categoryId] : undefined;
                  const isSelected = selectedSet.has(blockIndex);
                  const isRangeAnchor = rangeAnchor === blockIndex;
                  const isCurrentNow = currentBlockIndex === blockIndex;
                  const isDimmed =
                    highlightedCategoryId !== null &&
                    (!entry || entry.categoryId !== highlightedCategoryId);

                  const prevEntry = blocks[blockIndex - 1];
                  const isStartOfActivitySpan =
                    Boolean(entry?.label) &&
                    (range.slotInHour === 0 ||
                      !prevEntry ||
                      prevEntry.categoryId !== entry?.categoryId ||
                      prevEntry.label !== entry?.label);

                  const ariaParts = [`Block ${range.start} to ${range.end}`];
                  if (category) {
                    ariaParts.push(category.name);
                  } else {
                    ariaParts.push('Unassigned');
                  }
                  if (entry?.label) {
                    ariaParts.push(entry.label);
                  }
                  if (isCurrentNow) {
                    ariaParts.push('Current time block');
                  }
                  if (isRangeAnchor) {
                    ariaParts.push('Range start');
                  }

                  return (
                    <button
                      key={blockIndex}
                      type="button"
                      data-block-index={blockIndex}
                      aria-label={ariaParts.join(', ')}
                      aria-pressed={isSelected}
                      className={[
                        'time-block',
                        category ? 'is-assigned' : 'is-empty',
                        isSelected ? 'is-selected' : '',
                        isRangeAnchor ? 'is-range-anchor' : '',
                        isCurrentNow ? 'is-now' : '',
                        isDimmed ? 'is-dimmed' : '',
                        `tool-cursor-${interactionTool}`,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={
                        category
                          ? ({
                              '--block-color': category.color,
                              '--block-bg': category.bgTint,
                              '--block-border': category.borderTint,
                            } as React.CSSProperties)
                          : undefined
                      }
                      onClick={(e) => {
                        onBlockInteract(blockIndex, e.shiftKey);
                      }}
                      onPointerDown={(e) => {
                        if (e.button === 0) {
                          isDraggingRef.current = true;
                          lastHoveredBlockRef.current = blockIndex;
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, blockIndex)}
                    >
                      <span className="block-top-meta">
                        <span className="block-time-tiny">{range.start}</span>
                        {isCurrentNow && (
                          <span className="now-dot" title="Current 10m block">
                            NOW
                          </span>
                        )}
                        {isRangeAnchor && (
                          <span className="anchor-dot" title="Range start">
                            START
                          </span>
                        )}
                      </span>

                      {category ? (
                        <span className="block-content">
                          <span className="block-cat-bar" aria-hidden="true" />
                          <span className="block-label-text">
                            {isStartOfActivitySpan && entry?.label
                              ? entry.label
                              : entry?.label || category.name}
                          </span>
                        </span>
                      ) : (
                        <span className="block-empty-slot" aria-hidden="true">
                          #{blockIndex + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

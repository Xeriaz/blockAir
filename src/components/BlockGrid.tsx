import React, { useRef, useState } from 'react';
import type { BlockEntry, Category, GridViewMode } from '../types/blockair';
import {
  BLOCKS_PER_HOUR,
  getBlockTimeRange,
  getCategoryMap,
  getVisibleBlockIndices,
  groupBlocksByHour,
} from '../utils/timeBlocks';
import type { InteractionTool } from './BlockComposer';

interface BlockGridProps {
  blocks: Record<number, BlockEntry>;
  categories: Category[];
  viewMode: GridViewMode;
  selectedBlocks: number[];
  currentBlockIndex: number | null;
  interactionTool: InteractionTool;
  highlightedCategoryId: string | null;
  onBlockInteract: (blockIndex: number, isShiftKey: boolean) => void;
  onBlockDragEnter: (blockIndex: number) => void;
  onSelectHourRow: (blockIndices: number[]) => void;
}

export const BlockGrid: React.FC<BlockGridProps> = ({
  blocks,
  categories,
  viewMode,
  selectedBlocks,
  currentBlockIndex,
  interactionTool,
  highlightedCategoryId,
  onBlockInteract,
  onBlockDragEnter,
  onSelectHourRow,
}) => {
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const categoryMap = getCategoryMap(categories);
  const visibleIndices = getVisibleBlockIndices(viewMode);
  const hourGroups = groupBlocksByHour(visibleIndices);
  const selectedSet = new Set(selectedBlocks);

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
    <section
      className="grid-panel"
      aria-label="Daily time block grid"
      onPointerUp={() => setIsPointerDragging(false)}
      onPointerCancel={() => setIsPointerDragging(false)}
      onMouseLeave={() => setIsPointerDragging(false)}
    >
      <div className="grid-panel-header">
        <div className="grid-title-group">
          <h2 className="panel-title">
            {viewMode === 'full24' ? '24-Hour Grid · 144 Blocks' : 'Waking Grid · 100 Blocks'}
          </h2>
          <span className="grid-subtitle">
            Each block = 10 minutes · 6 blocks per row = 1 hour
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

      <div className="hour-rows" ref={gridRef}>
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

              <div className="hour-blocks-track">
                {group.blockIndices.map((blockIndex) => {
                  const range = getBlockTimeRange(blockIndex);
                  const entry = blocks[blockIndex];
                  const category = entry ? categoryMap[entry.categoryId] : undefined;
                  const isSelected = selectedSet.has(blockIndex);
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
                          setIsPointerDragging(true);
                        }
                      }}
                      onPointerEnter={() => {
                        if (isPointerDragging) {
                          onBlockDragEnter(blockIndex);
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, blockIndex)}
                    >
                      <span className="block-top-meta">
                        <span className="block-time-tiny">{range.start}</span>
                        {isCurrentNow && <span className="now-dot" title="Current 10m block">NOW</span>}
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

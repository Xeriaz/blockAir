import React from 'react';
import type { Category } from '../types/blockair';
import { formatBlockRange } from '../utils/timeBlocks';

export type InteractionTool = 'select' | 'range' | 'paint' | 'erase';

interface BlockComposerProps {
  categories: Category[];
  activeCategoryId: string;
  activityDraft: string;
  interactionTool: InteractionTool;
  selectedBlocks: number[];
  rangeAnchor: number | null;
  onSelectCategory: (categoryId: string) => void;
  onChangeActivityDraft: (value: string) => void;
  onChangeTool: (tool: InteractionTool) => void;
  onApplyToSelection: (categoryId?: string) => void;
  onDeleteSelection: () => void;
  onClearSelection: () => void;
  onStartRangeFromSelection?: () => void;
}

export const BlockComposer: React.FC<BlockComposerProps> = ({
  categories,
  activeCategoryId,
  activityDraft,
  interactionTool,
  selectedBlocks,
  rangeAnchor,
  onSelectCategory,
  onChangeActivityDraft,
  onChangeTool,
  onApplyToSelection,
  onDeleteSelection,
  onClearSelection,
  onStartRangeFromSelection,
}) => {
  const sortedSelection = [...selectedBlocks].sort((a, b) => a - b);
  const hasSelection = sortedSelection.length > 0;
  const selectionRangeLabel = hasSelection
    ? formatBlockRange(sortedSelection[0], sortedSelection[sortedSelection.length - 1])
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSelection) {
      onApplyToSelection();
    }
  };

  let toolHint = 'Tap a block to edit. Tap "Range" or drag across blocks to select multiple.';
  if (interactionTool === 'range') {
    toolHint =
      rangeAnchor !== null
        ? 'Start block chosen. Now tap any block to complete the range.'
        : 'Tap the start block, then tap the end block to select a time span.';
  } else if (interactionTool === 'paint') {
    toolHint = 'Tap or drag across blocks to paint immediately with selected category.';
  } else if (interactionTool === 'erase') {
    toolHint = 'Tap or drag across blocks to clear them immediately.';
  }

  return (
    <section className="composer-card" aria-label="Activity and category controls">
      <div className="composer-top-row">
        <div className="tool-switcher" role="group" aria-label="Interaction mode">
          <button
            type="button"
            className={`tool-btn ${interactionTool === 'select' ? 'active' : ''}`}
            aria-pressed={interactionTool === 'select'}
            onClick={() => onChangeTool('select')}
            title="Select and edit a single block"
          >
            Select
          </button>
          <button
            type="button"
            className={`tool-btn ${interactionTool === 'range' ? 'active' : ''}`}
            aria-pressed={interactionTool === 'range'}
            onClick={() => onChangeTool('range')}
            title="Tap start block, then tap end block to select range"
          >
            Range (2-Tap)
          </button>
          <button
            type="button"
            className={`tool-btn ${interactionTool === 'paint' ? 'active' : ''}`}
            aria-pressed={interactionTool === 'paint'}
            onClick={() => onChangeTool('paint')}
            title="Tap or drag to paint blocks immediately"
          >
            Paint Brush
          </button>
          <button
            type="button"
            className={`tool-btn tool-erase ${interactionTool === 'erase' ? 'active' : ''}`}
            aria-pressed={interactionTool === 'erase'}
            onClick={() => onChangeTool('erase')}
            title="Tap or drag to clear blocks"
          >
            Eraser
          </button>
        </div>

        <div className="selection-status" aria-live="polite">
          {hasSelection ? (
            <div className="selection-pill-group">
              <span className="selection-badge">Selected: {selectionRangeLabel}</span>
              {sortedSelection.length === 1 && interactionTool === 'select' && onStartRangeFromSelection && (
                <button
                  type="button"
                  className="extend-range-btn"
                  onClick={onStartRangeFromSelection}
                  title="Tap another block to extend range"
                >
                  + Extend to next tap
                </button>
              )}
              <button
                type="button"
                className="text-link-btn"
                onClick={onClearSelection}
                aria-label="Deselect blocks"
              >
                Deselect
              </button>
            </div>
          ) : (
            <span className="composer-hint">{toolHint}</span>
          )}
        </div>
      </div>

      <div className="category-strip" role="radiogroup" aria-label="Activity categories">
        {categories.map((cat) => {
          const isSelected = cat.id === activeCategoryId;
          return (
            <button
              key={cat.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`category-chip ${isSelected ? 'selected' : ''}`}
              style={
                {
                  '--cat-color': cat.color,
                  '--cat-bg': cat.bgTint,
                  '--cat-border': cat.borderTint,
                  '--cat-glow': cat.glowTint ?? 'rgba(56, 189, 248, 0.35)',
                } as React.CSSProperties
              }
              onClick={() => {
                onSelectCategory(cat.id);
                if (hasSelection && (interactionTool === 'select' || interactionTool === 'range')) {
                  onApplyToSelection(cat.id);
                }
              }}
              title={`${cat.name} — ${cat.description} (Shortcut ${cat.shortcut})`}
            >
              <span className="cat-dot" aria-hidden="true" />
              <span className="cat-name">{cat.name}</span>
              <kbd className="cat-kbd" aria-hidden="true">
                {cat.shortcut}
              </kbd>
            </button>
          );
        })}
      </div>

      <form className="activity-form" onSubmit={handleSubmit}>
        <div className="activity-input-wrap">
          <label htmlFor="activity-label-input" className="sr-only">
            Activity description
          </label>
          <input
            id="activity-label-input"
            type="text"
            className="activity-input"
            placeholder="Activity note (e.g., Ship PWA service worker, Trail run, Reading)..."
            maxLength={120}
            value={activityDraft}
            onChange={(e) => onChangeActivityDraft(e.target.value)}
          />
          {activityDraft && (
            <button
              type="button"
              className="clear-input-btn"
              onClick={() => onChangeActivityDraft('')}
              aria-label="Clear activity note input"
            >
              ×
            </button>
          )}
        </div>

        <div className="activity-actions">
          <button
            type="submit"
            className="primary-btn"
            disabled={!hasSelection}
            title={
              hasSelection
                ? 'Save activity and category to selected blocks'
                : 'Select one or more blocks in the grid first'
            }
          >
            {hasSelection
              ? `Save to ${sortedSelection.length} ${sortedSelection.length === 1 ? 'Block' : 'Blocks'}`
              : 'Select Blocks to Save'}
          </button>

          {hasSelection && (
            <button
              type="button"
              className="danger-btn"
              onClick={onDeleteSelection}
              aria-label="Delete activity from selected blocks"
            >
              Delete Activity
            </button>
          )}
        </div>
      </form>
    </section>
  );
};

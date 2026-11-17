import React from 'react';
import type { Category } from '../types/blockair';
import { formatBlockRange } from '../utils/timeBlocks';

export type InteractionTool = 'select' | 'paint' | 'erase';

interface BlockComposerProps {
  categories: Category[];
  activeCategoryId: string;
  activityDraft: string;
  interactionTool: InteractionTool;
  selectedBlocks: number[];
  onSelectCategory: (categoryId: string) => void;
  onChangeActivityDraft: (value: string) => void;
  onChangeTool: (tool: InteractionTool) => void;
  onApplyToSelection: (categoryId?: string) => void;
  onDeleteSelection: () => void;
  onClearSelection: () => void;
}

export const BlockComposer: React.FC<BlockComposerProps> = ({
  categories,
  activeCategoryId,
  activityDraft,
  interactionTool,
  selectedBlocks,
  onSelectCategory,
  onChangeActivityDraft,
  onChangeTool,
  onApplyToSelection,
  onDeleteSelection,
  onClearSelection,
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

  return (
    <section className="composer-card" aria-label="Activity and category controls">
      <div className="composer-top-row">
        <div className="tool-switcher" role="group" aria-label="Interaction mode">
          <button
            type="button"
            className={`tool-btn ${interactionTool === 'select' ? 'active' : ''}`}
            aria-pressed={interactionTool === 'select'}
            onClick={() => onChangeTool('select')}
          >
            Select &amp; Edit
          </button>
          <button
            type="button"
            className={`tool-btn ${interactionTool === 'paint' ? 'active' : ''}`}
            aria-pressed={interactionTool === 'paint'}
            onClick={() => onChangeTool('paint')}
          >
            Quick Paint Brush
          </button>
          <button
            type="button"
            className={`tool-btn tool-erase ${interactionTool === 'erase' ? 'active' : ''}`}
            aria-pressed={interactionTool === 'erase'}
            onClick={() => onChangeTool('erase')}
          >
            Eraser
          </button>
        </div>

        <div className="selection-status" aria-live="polite">
          {hasSelection ? (
            <div className="selection-pill-group">
              <span className="selection-badge">Selected: {selectionRangeLabel}</span>
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
            <span className="composer-hint">
              {interactionTool === 'paint'
                ? 'Tap or drag across blocks to paint immediately with the selected category & activity.'
                : interactionTool === 'erase'
                  ? 'Tap or drag across blocks to clear them.'
                  : 'Tap a block (or Shift+tap a second block) to select a time range and log an activity.'}
            </span>
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
                } as React.CSSProperties
              }
              onClick={() => {
                onSelectCategory(cat.id);
                if (hasSelection && interactionTool === 'select') {
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

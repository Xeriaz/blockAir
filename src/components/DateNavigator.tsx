import React from 'react';
import type { GridViewMode } from '../types/blockair';
import { formatHumanDate, getBlockTimeRange } from '../utils/timeBlocks';

interface DateNavigatorProps {
  selectedDateKey: string;
  todayDateKey: string;
  clock24h: string;
  currentBlockIndex: number;
  viewMode: GridViewMode;
  onSelectDate: (dateKey: string) => void;
  onShiftDate: (deltaDays: number) => void;
  onViewModeChange: (mode: GridViewMode) => void;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  selectedDateKey,
  todayDateKey,
  clock24h,
  currentBlockIndex,
  viewMode,
  onSelectDate,
  onShiftDate,
  onViewModeChange,
}) => {
  const { primary, secondary, relativeBadge, isToday } = formatHumanDate(
    selectedDateKey,
    todayDateKey
  );
  const activeRange = getBlockTimeRange(currentBlockIndex);

  return (
    <header className="top-bar">
      <div className="brand-row-top">
        <div className="brand-group">
          <div className="brand-logo" aria-hidden="true">
            <span className="logo-cell c1" />
            <span className="logo-cell c2" />
            <span className="logo-cell c3" />
            <span className="logo-cell c2" />
            <span className="logo-cell c4" />
            <span className="logo-cell c5" />
            <span className="logo-cell c5" />
            <span className="logo-cell c6" />
            <span className="logo-cell c7" />
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">BlockAir</h1>
              <span className="brand-pill">24H · 144</span>
            </div>
            <p className="brand-subtitle">
              10-minute blocks across a 24-hour clock.
            </p>
          </div>
        </div>

        <div className="live-clock-pill" aria-label={`Current 24-hour time ${clock24h}`}>
          <span className="clock-dot" aria-hidden="true" />
          <time className="clock-digits" dateTime={clock24h}>
            {clock24h}
          </time>
          <span className="clock-slot-tag">
            {activeRange.start}–{activeRange.end}
          </span>
        </div>
      </div>

      <div className="nav-controls-row">
        <div className="date-switcher" role="group" aria-label="Day navigation">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onShiftDate(-1)}
            aria-label="Previous day"
            title="Previous day"
          >
            ←
          </button>

          <div className="date-display">
            <div className="date-headline">
              <span className="date-primary">{primary}</span>
              <span className="date-year">{secondary}</span>
              {relativeBadge && (
                <span className={`date-badge ${isToday ? 'is-today' : ''}`}>{relativeBadge}</span>
              )}
            </div>
            <label className="date-picker-label">
              <span className="sr-only">Jump to date</span>
              <input
                type="date"
                className="date-input"
                aria-label="Jump to date"
                value={selectedDateKey}
                onChange={(e) => {
                  if (e.target.value) {
                    onSelectDate(e.target.value);
                  }
                }}
              />
            </label>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={() => onShiftDate(1)}
            aria-label="Next day"
            title="Next day"
          >
            →
          </button>

          {!isToday && (
            <button
              type="button"
              className="today-btn"
              onClick={() => onSelectDate(todayDateKey)}
            >
              Today
            </button>
          )}
        </div>

        <div className="view-mode-toggle" role="group" aria-label="Grid view mode">
          <button
            type="button"
            className={`mode-btn ${viewMode === 'full24' ? 'active' : ''}`}
            aria-pressed={viewMode === 'full24'}
            onClick={() => onViewModeChange('full24')}
          >
            <span>144 Blocks</span>
            <small>00:00–24:00</small>
          </button>
          <button
            type="button"
            className={`mode-btn ${viewMode === 'waking100' ? 'active' : ''}`}
            aria-pressed={viewMode === 'waking100'}
            onClick={() => onViewModeChange('waking100')}
          >
            <span>100 Blocks</span>
            <small>06:00–22:40</small>
          </button>
        </div>
      </div>
    </header>
  );
};

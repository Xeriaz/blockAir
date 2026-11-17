import React, { useState } from 'react';
import type { Category, DayOverviewStats } from '../types/blockair';
import {
  BLOCKS_PER_DAY,
  formatDurationMinutes,
  getCategoryMap,
  MINUTES_PER_BLOCK,
} from '../utils/timeBlocks';

interface DayOverviewProps {
  stats: DayOverviewStats;
  categories: Category[];
  reflection: string;
  currentBlockIndex: number | null;
  highlightedCategoryId: string | null;
  onHighlightCategory: (categoryId: string | null) => void;
  onReflectionChange: (value: string) => void;
  onFillNightSleep: () => void;
  onClearEntireDay: () => void;
}

export const DayOverview: React.FC<DayOverviewProps> = ({
  stats,
  categories,
  reflection,
  currentBlockIndex,
  highlightedCategoryId,
  onHighlightCategory,
  onReflectionChange,
  onFillNightSleep,
  onClearEntireDay,
}) => {
  const [confirmClearDay, setConfirmClearDay] = useState(false);
  const categoryMap = getCategoryMap(categories);

  const remainingTodayBlocks =
    currentBlockIndex !== null ? Math.max(0, BLOCKS_PER_DAY - 1 - currentBlockIndex) : null;

  return (
    <aside className="overview-panel" aria-label="Day overview and reflection">
      <div className="overview-card">
        <div className="overview-header">
          <h2 className="panel-title">Day Balance</h2>
          <span className="completion-pill">{stats.completionPercent}% mapped</span>
        </div>

        <div className="metric-grid">
          <div className="metric-box">
            <span className="metric-label">Allocated</span>
            <strong className="metric-value">
              {formatDurationMinutes(stats.allocatedMinutes)}
            </strong>
            <span className="metric-sub">
              {stats.allocatedBlocks} / {stats.totalVisibleBlocks} blocks
            </span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Unassigned</span>
            <strong className="metric-value">
              {formatDurationMinutes(stats.unassignedMinutes)}
            </strong>
            <span className="metric-sub">{stats.unassignedBlocks} open blocks</span>
          </div>

          {currentBlockIndex !== null && remainingTodayBlocks !== null && (
            <div className="metric-box metric-live">
              <span className="metric-label">Live Day Pulse</span>
              <strong className="metric-value">Block #{currentBlockIndex + 1}</strong>
              <span className="metric-sub">
                {remainingTodayBlocks} blocks ({formatDurationMinutes(remainingTodayBlocks * MINUTES_PER_BLOCK)}) left today
              </span>
            </div>
          )}
        </div>

        {/* Stacked proportional distribution bar */}
        <div
          className="distribution-bar"
          role="img"
          aria-label={`Time allocation bar: ${stats.allocatedBlocks} allocated blocks and ${stats.unassignedBlocks} unassigned blocks`}
        >
          {stats.categorySummaries.map((item) => {
            const widthPercent = (item.blockCount / stats.totalVisibleBlocks) * 100;
            return (
              <div
                key={item.category.id}
                className="distribution-segment"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: item.category.color,
                }}
                title={`${item.category.name}: ${formatDurationMinutes(item.minutes)} (${item.blockCount} blocks)`}
              />
            );
          })}
        </div>

        {stats.allocatedBlocks === 0 ? (
          <div className="empty-overview-state">
            <p className="empty-title">No blocks logged for this day yet.</p>
            <p className="empty-copy">
              Select blocks in the grid to record how your time was spent, or pre-fill night sleep
              to focus on your 100 waking blocks.
            </p>
            <button type="button" className="secondary-btn" onClick={onFillNightSleep}>
              Pre-fill Night Sleep (44 blocks)
            </button>
          </div>
        ) : (
          <>
            <div className="category-breakdown">
              <div className="section-label-row">
                <h3 className="sub-heading">By Category</h3>
                {highlightedCategoryId && (
                  <button
                    type="button"
                    className="text-link-btn"
                    onClick={() => onHighlightCategory(null)}
                  >
                    Show all
                  </button>
                )}
              </div>

              <ul className="breakdown-list">
                {stats.categorySummaries.map((item) => {
                  const isHighlighted = highlightedCategoryId === item.category.id;
                  return (
                    <li key={item.category.id}>
                      <button
                        type="button"
                        className={`breakdown-row ${isHighlighted ? 'is-highlighted' : ''}`}
                        onClick={() =>
                          onHighlightCategory(isHighlighted ? null : item.category.id)
                        }
                        aria-pressed={isHighlighted}
                      >
                        <span className="breakdown-left">
                          <span
                            className="cat-swatch"
                            style={{ backgroundColor: item.category.color }}
                          />
                          <span className="breakdown-name">{item.category.name}</span>
                        </span>
                        <span className="breakdown-right">
                          <strong className="breakdown-duration">
                            {formatDurationMinutes(item.minutes)}
                          </strong>
                          <span className="breakdown-blocks">
                            {item.blockCount}b · {item.percentageOfView}%
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {stats.topActivities.length > 0 && (
              <div className="top-activities-section">
                <h3 className="sub-heading">Logged Activities</h3>
                <ul className="activity-pill-list">
                  {stats.topActivities.map((act) => {
                    const cat = categoryMap[act.categoryId];
                    return (
                      <li key={`${act.categoryId}-${act.label}`} className="activity-summary-item">
                        <span
                          className="cat-swatch"
                          style={{ backgroundColor: cat?.color ?? '#94a3b8' }}
                        />
                        <span className="activity-summary-label">{act.label}</span>
                        <span className="activity-summary-time">
                          {formatDurationMinutes(act.minutes)} ({act.blockCount}b)
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="day-quick-actions">
              <button type="button" className="secondary-btn" onClick={onFillNightSleep}>
                Fill Unassigned Night Sleep
              </button>

              {!confirmClearDay ? (
                <button
                  type="button"
                  className="ghost-danger-btn"
                  onClick={() => setConfirmClearDay(true)}
                >
                  Reset Day
                </button>
              ) : (
                <div className="confirm-reset-row" role="group" aria-label="Confirm reset day">
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => {
                      onClearEntireDay();
                      setConfirmClearDay(false);
                    }}
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setConfirmClearDay(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="overview-card reflection-card">
        <label htmlFor="daily-reflection" className="panel-title">
          Daily Reflection
        </label>
        <p className="reflection-hint">
          Capture one highlight, lesson, or intention for where your blocks went.
        </p>
        <textarea
          id="daily-reflection"
          className="reflection-textarea"
          rows={3}
          maxLength={500}
          placeholder="What gave you energy today? Which blocks felt best spent?"
          value={reflection}
          onChange={(e) => onReflectionChange(e.target.value)}
        />
      </div>
    </aside>
  );
};

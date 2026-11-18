import React, { useMemo, useState } from 'react';
import type { AppDataStore, Category } from '../types/blockair';
import {
  computeMultiDayAnalytics,
  type DailyAllocation,
  type MultiDayAnalyticsResult,
} from '../utils/analytics';
import {
  DEFAULT_CATEGORIES,
  getBlockTimeRange,
  getCategoryMap,
} from '../utils/timeBlocks';

interface TrendsViewProps {
  store: AppDataStore;
  selectedDateKey: string;
  categories?: Category[];
  onSelectDateKey?: (dateKey: string) => void;
  onBackToGrid?: () => void;
}

export const TrendsView: React.FC<TrendsViewProps> = ({
  store,
  selectedDateKey,
  categories = DEFAULT_CATEGORIES,
  onSelectDateKey,
  onBackToGrid,
}) => {
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const [hoveredDay, setHoveredDay] = useState<DailyAllocation | null>(null);

  const categoryMap = useMemo(() => getCategoryMap(categories), [categories]);

  const analytics: MultiDayAnalyticsResult = useMemo(
    () => computeMultiDayAnalytics(store, selectedDateKey, windowDays, categories),
    [store, selectedDateKey, windowDays, categories]
  );

  return (
    <div className="trends-view-container" aria-label="Trends and Statistics View">
      {/* Trends View Header */}
      <div className="trends-header">
        <div className="trends-header-left">
          <div className="trends-title-row">
            <h2 className="trends-title">Trends & Multi-Day Statistics</h2>
            <span className="trends-window-badge">
              {windowDays} Days Ending {selectedDateKey}
            </span>
          </div>
          <p className="trends-subtitle">
            Maker vs. Manager balance, circadian rhythm, and habit consistency across {windowDays} days.
          </p>
        </div>

        <div className="trends-header-actions">
          <div className="window-switcher" role="group" aria-label="Time window selection">
            <button
              type="button"
              className={`window-toggle-btn ${windowDays === 7 ? 'active' : ''}`}
              aria-pressed={windowDays === 7}
              onClick={() => setWindowDays(7)}
            >
              7-Day View
            </button>
            <button
              type="button"
              className={`window-toggle-btn ${windowDays === 30 ? 'active' : ''}`}
              aria-pressed={windowDays === 30}
              onClick={() => setWindowDays(30)}
            >
              30-Day View
            </button>
          </div>

          {onBackToGrid && (
            <button
              type="button"
              className="today-btn back-to-grid-btn"
              onClick={onBackToGrid}
              title="Return to Day Grid"
            >
              ← Back to Grid
            </button>
          )}
        </div>
      </div>

      {/* 1. Core KPI Cards */}
      <section className="trends-kpi-grid" aria-label="Core Performance Indicators">
        {/* KPI 1: Focus & Focus-to-Ops Ratio */}
        <div className="trends-kpi-card kpi-focus">
          <div className="kpi-card-header">
            <span className="kpi-label">Avg Daily Focus & Craft</span>
            <span className="kpi-cat-pill cat-focus">Shortcut 1</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-val">{analytics.avgDailyFocusHours}h</span>
            <span className="kpi-unit">/ day</span>
          </div>
          <div className="kpi-ratio-section">
            <div className="kpi-ratio-label-row">
              <span className="kpi-ratio-title">Focus-to-Ops (Maker Ratio)</span>
              <span className="kpi-ratio-metric">{analytics.focusToOpsRatioFormatted}</span>
            </div>
            <div className="kpi-progress-track">
              <div
                className="kpi-progress-bar bar-focus"
                style={{ width: `${analytics.focusToOpsRatioPercent}%` }}
                title={`${analytics.focusToOpsRatioPercent}% Focus`}
              />
              <div
                className="kpi-progress-bar bar-ops"
                style={{ width: `${100 - analytics.focusToOpsRatioPercent}%` }}
                title={`${100 - analytics.focusToOpsRatioPercent}% Operations & Admin`}
              />
            </div>
          </div>
          <div className="kpi-footer-note">
            <span>Total Focus: {analytics.totalFocusHours}h</span>
            <span>Period: {analytics.windowDays}d</span>
          </div>
        </div>

        {/* KPI 2: Sleep & Bedtime Consistency */}
        <div className="trends-kpi-card kpi-sleep">
          <div className="kpi-card-header">
            <span className="kpi-label">Avg Daily Sleep & Recovery</span>
            <span className="kpi-cat-pill cat-sleep">Shortcut 4</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-val">{analytics.avgDailySleepHours}h</span>
            <span className="kpi-unit">/ day</span>
          </div>
          <div className="kpi-ratio-section">
            <div className="kpi-ratio-label-row">
              <span className="kpi-ratio-title">Circadian Consistency</span>
              <span className="kpi-consistency-badge">
                {analytics.sleepConsistency.description} ({analytics.sleepConsistency.consistencyScore}%)
              </span>
            </div>
            <div className="kpi-progress-track">
              <div
                className="kpi-progress-bar bar-sleep"
                style={{ width: `${analytics.sleepConsistency.consistencyScore}%` }}
                title={`${analytics.sleepConsistency.consistencyScore}% Sleep Consistency`}
              />
            </div>
          </div>
          <div className="kpi-footer-note">
            <span>Avg Sleep: {analytics.sleepConsistency.avgBedtimeLabel}</span>
            <span>Avg Wake: {analytics.sleepConsistency.avgWakeTimeLabel}</span>
          </div>
        </div>

        {/* KPI 3: Intentionality Score */}
        <div className="trends-kpi-card kpi-intentionality">
          <div className="kpi-card-header">
            <span className="kpi-label">Intentionality Score</span>
            <span className="kpi-cat-pill cat-intentionality">Active Days</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-val">{analytics.intentionalityScore}%</span>
            <span className="kpi-unit">mapped</span>
          </div>
          <div className="kpi-ratio-section">
            <div className="kpi-ratio-label-row">
              <span className="kpi-ratio-title">Unassigned Drift</span>
              <span className="kpi-ratio-metric">{analytics.avgDailyDriftHours}h / day ({analytics.driftPercent}%)</span>
            </div>
            <div className="kpi-progress-track">
              <div
                className="kpi-progress-bar bar-intentional"
                style={{ width: `${analytics.intentionalityScore}%` }}
                title={`${analytics.intentionalityScore}% Intentional blocks`}
              />
              <div
                className="kpi-progress-bar bar-drift"
                style={{ width: `${analytics.driftPercent}%` }}
                title={`${analytics.driftPercent}% Unassigned drift`}
              />
            </div>
          </div>
          <div className="kpi-footer-note">
            <span>{analytics.activeDaysCount} of {analytics.windowDays} active days</span>
            <span>144 blocks / day</span>
          </div>
        </div>
      </section>

      {/* 2. Multi-Day Stacked Balance Chart */}
      <section className="trends-card stacked-balance-card" aria-label="Multi-Day Stacked Balance Chart">
        <div className="card-section-header">
          <div>
            <h3 className="card-section-title">Daily State Balance ({windowDays} Days)</h3>
            <p className="card-section-desc">
              Proportion of 144 blocks (24 hours) allocated to the 4 Core States vs. Unassigned drift.
            </p>
          </div>

          <div className="chart-legend" role="list" aria-label="Category legend">
            <div className="legend-item" role="listitem">
              <span className="legend-dot dot-focus" />
              <span>Focus</span>
            </div>
            <div className="legend-item" role="listitem">
              <span className="legend-dot dot-ops" />
              <span>Ops</span>
            </div>
            <div className="legend-item" role="listitem">
              <span className="legend-dot dot-vitality" />
              <span>Vitality</span>
            </div>
            <div className="legend-item" role="listitem">
              <span className="legend-dot dot-sleep" />
              <span>Sleep</span>
            </div>
            <div className="legend-item" role="listitem">
              <span className="legend-dot dot-unassigned" />
              <span>Unassigned</span>
            </div>
          </div>
        </div>

        {/* Stacked Chart Bars */}
        <div className="stacked-chart-container">
          <div className="stacked-bars-list">
            {analytics.dailyAllocations.map((day) => {
              const totalBlocks = 144;
              const focusPct = (day.focusBlocks / totalBlocks) * 100;
              const opsPct = (day.opsBlocks / totalBlocks) * 100;
              const vitPct = (day.vitalityBlocks / totalBlocks) * 100;
              const sleepPct = (day.sleepBlocks / totalBlocks) * 100;
              const unassignedPct = (day.unassignedBlocks / totalBlocks) * 100;

              const isSelected = day.dateKey === selectedDateKey;

              return (
                <div
                  key={day.dateKey}
                  className={`stacked-day-row ${isSelected ? 'is-selected' : ''}`}
                  onMouseEnter={() => setHoveredDay(day)}
                  onClick={() => onSelectDateKey?.(day.dateKey)}
                  title={`${day.fullDateLabel}: ${day.focusHours}h Focus, ${day.opsHours}h Ops, ${day.vitalityHours}h Vitality, ${day.sleepHours}h Sleep, ${day.unassignedHours}h Drift`}
                >
                  <div className="day-row-label">
                    <span className="day-name">{day.dayLabel}</span>
                    {day.isToday && <span className="today-chip">Today</span>}
                  </div>

                  <div className="stacked-bar-track">
                    {focusPct > 0 && (
                      <div
                        className="bar-slice slice-focus"
                        style={{ width: `${focusPct}%` }}
                      />
                    )}
                    {opsPct > 0 && (
                      <div
                        className="bar-slice slice-ops"
                        style={{ width: `${opsPct}%` }}
                      />
                    )}
                    {vitPct > 0 && (
                      <div
                        className="bar-slice slice-vitality"
                        style={{ width: `${vitPct}%` }}
                      />
                    )}
                    {sleepPct > 0 && (
                      <div
                        className="bar-slice slice-sleep"
                        style={{ width: `${sleepPct}%` }}
                      />
                    )}
                    {unassignedPct > 0 && (
                      <div
                        className="bar-slice slice-unassigned"
                        style={{ width: `${unassignedPct}%` }}
                      />
                    )}
                  </div>

                  <div className="day-row-summary">
                    <span className="day-mapped-hours">
                      {(24 - day.unassignedHours).toFixed(1)}h mapped
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {hoveredDay && (
            <div className="stacked-day-detail-banner" aria-live="polite">
              <span className="detail-date">{hoveredDay.fullDateLabel}:</span>
              <span className="detail-tag tag-focus">Focus: {hoveredDay.focusHours}h ({hoveredDay.focusBlocks}b)</span>
              <span className="detail-tag tag-ops">Ops: {hoveredDay.opsHours}h ({hoveredDay.opsBlocks}b)</span>
              <span className="detail-tag tag-vitality">Vitality: {hoveredDay.vitalityHours}h ({hoveredDay.vitalityBlocks}b)</span>
              <span className="detail-tag tag-sleep">Sleep: {hoveredDay.sleepHours}h ({hoveredDay.sleepBlocks}b)</span>
              <span className="detail-tag tag-drift">Drift: {hoveredDay.unassignedHours}h</span>
            </div>
          )}
        </div>
      </section>

      {/* 3. 24-Hour Circadian Rhythm Strip / Heatmap */}
      <section className="trends-card circadian-heatmap-card" aria-label="24-Hour Circadian Rhythm Heatmap">
        <div className="card-section-header">
          <div>
            <h3 className="card-section-title">24-Hour Circadian Rhythm Heatmap</h3>
            <p className="card-section-desc">
              Visual 7-day chronotype grid (144 blocks / 24h per row) to spot sleep shifts and peak focus windows.
            </p>
          </div>
        </div>

        <div className="circadian-grid-wrapper">
          {/* Time markers axis */}
          <div className="circadian-timeline-header">
            <div className="circadian-day-gutter-label" />
            <div className="circadian-timeline-ticks">
              <span>00:00</span>
              <span>03:00</span>
              <span>06:00</span>
              <span>09:00</span>
              <span>12:00</span>
              <span>15:00</span>
              <span>18:00</span>
              <span>21:00</span>
              <span>24:00</span>
            </div>
          </div>

          {/* 7 Days rows */}
          <div className="circadian-rows-container">
            {analytics.circadianDays.map((day) => (
              <div key={`circadian-${day.dateKey}`} className="circadian-day-row">
                <div className="circadian-day-label">
                  <span className="c-day-text">{day.dayLabel}</span>
                </div>

                <div className="circadian-blocks-strip">
                  {day.blockCategoryIds.map((catId, blockIdx) => {
                    const blockRange = getBlockTimeRange(blockIdx);
                    let cellClass = 'c-cell-unassigned';
                    let cellColor = 'rgba(255, 255, 255, 0.04)';

                    if (catId) {
                      cellClass = `c-cell-${catId}`;
                      cellColor = categoryMap[catId]?.color ?? '#38bdf8';
                    }

                    return (
                      <div
                        key={`cell-${blockIdx}`}
                        className={`circadian-cell ${cellClass}`}
                        style={{ backgroundColor: cellColor }}
                        title={`${day.fullDateLabel} · ${blockRange.start}–${blockRange.end} · ${
                          catId ? categoryMap[catId]?.name ?? catId : 'Unassigned drift'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Weekdays vs Weekends & Top Activities */}
      <div className="trends-split-row">
        {/* Weekdays vs Weekends Split */}
        <section className="trends-card split-card" aria-label="Weekdays vs Weekends Split">
          <div className="card-section-header">
            <div>
              <h3 className="card-section-title">Weekdays vs. Weekends Split</h3>
              <p className="card-section-desc">Average daily hours on Mon–Fri vs. Sat–Sun.</p>
            </div>
          </div>

          <div className="split-comparison-container">
            <div className="split-column">
              <div className="split-col-header">
                <span className="split-title">Weekdays (Mon–Fri)</span>
                <span className="split-badge">{analytics.weekdaysAvg.daysCount} days</span>
              </div>
              <div className="split-metrics-list">
                <div className="split-metric-row">
                  <span className="split-metric-name dot-focus">Focus & Craft</span>
                  <span className="split-metric-val">{analytics.weekdaysAvg.focusHoursPerDay}h / day</span>
                </div>
                <div className="split-metric-row">
                  <span className="split-metric-name dot-ops">Operations & Admin</span>
                  <span className="split-metric-val">{analytics.weekdaysAvg.opsHoursPerDay}h / day</span>
                </div>
                <div className="split-metric-row">
                  <span className="split-metric-name dot-vitality">Vitality & Life</span>
                  <span className="split-metric-val">{analytics.weekdaysAvg.vitalityHoursPerDay}h / day</span>
                </div>
                <div className="split-metric-row">
                  <span className="split-metric-name dot-sleep">Sleep & Recovery</span>
                  <span className="split-metric-val">{analytics.weekdaysAvg.sleepHoursPerDay}h / day</span>
                </div>
                <div className="split-metric-row metric-drift">
                  <span className="split-metric-name dot-unassigned">Drift / Unassigned</span>
                  <span className="split-metric-val">{analytics.weekdaysAvg.unassignedHoursPerDay}h / day</span>
                </div>
              </div>
            </div>

            <div className="split-divider" aria-hidden="true" />

            <div className="split-column">
              <div className="split-col-header">
                <span className="split-title">Weekends (Sat–Sun)</span>
                <span className="split-badge">{analytics.weekendsAvg.daysCount} days</span>
              </div>
              <div className="split-metrics-list">
                <div className="split-metric-row">
                  <span className="split-metric-name dot-focus">Focus & Craft</span>
                  <span className="split-metric-val">{analytics.weekendsAvg.focusHoursPerDay}h / day</span>
                </div>
                <div className="split-metric-row">
                  <span className="split-metric-name dot-ops">Operations & Admin</span>
                  <span className="split-metric-val">{analytics.weekendsAvg.opsHoursPerDay}h / day</span>
                </div>
                <div className="split-metric-row">
                  <span className="split-metric-name dot-vitality">Vitality & Life</span>
                  <span className="split-metric-val">{analytics.weekendsAvg.vitalityHoursPerDay}h / day</span>
                </div>
                <div className="split-metric-row">
                  <span className="split-metric-name dot-sleep">Sleep & Recovery</span>
                  <span className="split-metric-val">{analytics.weekendsAvg.sleepHoursPerDay}h / day</span>
                </div>
                <div className="split-metric-row metric-drift">
                  <span className="split-metric-name dot-unassigned">Drift / Unassigned</span>
                  <span className="split-metric-val">{analytics.weekendsAvg.unassignedHoursPerDay}h / day</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Top Activities Leaderboard */}
        <section className="trends-card leaderboard-card" aria-label="Top Activities Leaderboard">
          <div className="card-section-header">
            <div>
              <h3 className="card-section-title">Top Activities Leaderboard</h3>
              <p className="card-section-desc">Highest recurring activity labels across the period.</p>
            </div>
          </div>

          <div className="leaderboard-content">
            {analytics.topActivities.length === 0 ? (
              <div className="leaderboard-empty">
                <span className="empty-icon" aria-hidden="true">🏷️</span>
                <p>No activity notes recorded across this period yet.</p>
                <span className="empty-hint">Add activity notes to your blocks to see rankings here.</span>
              </div>
            ) : (
              <div className="leaderboard-list">
                {analytics.topActivities.map((act) => (
                  <div key={`${act.categoryId}-${act.label}`} className="leaderboard-item">
                    <div className="leaderboard-rank">#{act.rank}</div>
                    <div className="leaderboard-info">
                      <div className="leaderboard-title-row">
                        <span className="leaderboard-label">{act.label}</span>
                        <span
                          className="leaderboard-cat-tag"
                          style={{
                            borderColor: act.categoryColor,
                            color: act.categoryColor,
                          }}
                        >
                          {act.categoryName}
                        </span>
                      </div>
                      <div className="leaderboard-bar-track">
                        <div
                          className="leaderboard-bar-fill"
                          style={{
                            width: `${Math.min(100, act.percentageOfAllocated * 2.5)}%`,
                            backgroundColor: act.categoryColor,
                          }}
                        />
                      </div>
                    </div>
                    <div className="leaderboard-stats">
                      <span className="stat-hours">{act.hours}h</span>
                      <span className="stat-blocks">{act.blockCount} blocks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

import React, { useEffect, useId, useState } from 'react';
import type { Category, UserSettings } from '../types/blockair';
import { DEFAULT_SETTINGS } from '../utils/storage';
import {
  computeBlocksForTimeRange,
  formatDurationMinutes,
  MINUTES_PER_BLOCK,
} from '../utils/timeBlocks';
import { buildShortcutUrl } from '../utils/urlActions';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onApplyToSelectedDay: () => void;
  onApplyToNext7Days: () => void;
  onRunTestShortcutAction?: (url: string) => void;
}

const BEDTIME_PRESETS = ['22:00', '22:30', '23:00', '23:30', '00:00'];
const WAKE_PRESETS = ['06:00', '06:30', '07:00', '07:30', '08:00'];
const WORK_START_PRESETS = ['08:00', '08:30', '09:00', '09:30', '10:00'];
const WORK_END_PRESETS = ['16:00', '16:30', '17:00', '17:30', '18:00'];

const DAYS_OF_WEEK = [
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
  { id: 0, label: 'Sun', full: 'Sunday' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  categories,
  settings,
  onSaveSettings,
  onApplyToSelectedDay,
  onApplyToNext7Days,
  onRunTestShortcutAction,
}) => {
  const [activeTab, setActiveTab] = useState<'routines' | 'shortcuts'>('routines');

  // Form draft state
  const [autoPrefillEnabled, setAutoPrefillEnabled] = useState(settings.autoPrefillEnabled);
  const [sleepEnabled, setSleepEnabled] = useState(settings.sleep.enabled);
  const [sleepStart, setSleepStart] = useState(settings.sleep.startTime);
  const [sleepEnd, setSleepEnd] = useState(settings.sleep.endTime);
  const [sleepLabel, setSleepLabel] = useState(settings.sleep.label);

  const [workEnabled, setWorkEnabled] = useState(settings.work.enabled);
  const [workStart, setWorkStart] = useState(settings.work.startTime);
  const [workEnd, setWorkEnd] = useState(settings.work.endTime);
  const [workCategoryId, setWorkCategoryId] = useState(settings.work.categoryId);
  const [workLabel, setWorkLabel] = useState(settings.work.label);
  const [workDaysOfWeek, setWorkDaysOfWeek] = useState<number[]>(settings.work.daysOfWeek);

  // iOS Shortcut builder state
  const [scAction, setScAction] = useState<'log' | 'prefill_sleep' | 'prefill_work'>('log');
  const [scCategory, setScCategory] = useState<string>('deep-work');
  const [scLabel, setScLabel] = useState<string>('Deep Work Sprint');
  const [scDuration, setScDuration] = useState<number>(30);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      setAutoPrefillEnabled(settings.autoPrefillEnabled);
      setSleepEnabled(settings.sleep.enabled);
      setSleepStart(settings.sleep.startTime);
      setSleepEnd(settings.sleep.endTime);
      setSleepLabel(settings.sleep.label);

      setWorkEnabled(settings.work.enabled);
      setWorkStart(settings.work.startTime);
      setWorkEnd(settings.work.endTime);
      setWorkCategoryId(settings.work.categoryId);
      setWorkLabel(settings.work.label);
      setWorkDaysOfWeek(settings.work.daysOfWeek);
    }
  }, [isOpen, settings]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sleepBlocks = computeBlocksForTimeRange(sleepStart, sleepEnd);
  const sleepDuration = formatDurationMinutes(sleepBlocks.length * MINUTES_PER_BLOCK);

  const workBlocks = computeBlocksForTimeRange(workStart, workEnd);
  const workDuration = formatDurationMinutes(workBlocks.length * MINUTES_PER_BLOCK);

  const handleToggleDay = (dayId: number) => {
    setWorkDaysOfWeek((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort((a, b) => a - b)
    );
  };

  const handleSelectWeekdays = () => {
    setWorkDaysOfWeek([1, 2, 3, 4, 5]);
  };

  const handleSelectEveryday = () => {
    setWorkDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: UserSettings = {
      autoPrefillEnabled,
      sleep: {
        enabled: sleepEnabled,
        startTime: sleepStart,
        endTime: sleepEnd,
        label: sleepLabel.trim() || 'Night sleep',
        overwriteExisting: false,
      },
      work: {
        enabled: workEnabled,
        startTime: workStart,
        endTime: workEnd,
        categoryId: workCategoryId,
        label: workLabel.trim() || 'Deep work',
        overwriteExisting: false,
        daysOfWeek: workDaysOfWeek.length > 0 ? workDaysOfWeek : [1, 2, 3, 4, 5],
      },
    };
    onSaveSettings(updated);
    onClose();
  };

  const handleResetDefaults = () => {
    setAutoPrefillEnabled(DEFAULT_SETTINGS.autoPrefillEnabled);
    setSleepEnabled(DEFAULT_SETTINGS.sleep.enabled);
    setSleepStart(DEFAULT_SETTINGS.sleep.startTime);
    setSleepEnd(DEFAULT_SETTINGS.sleep.endTime);
    setSleepLabel(DEFAULT_SETTINGS.sleep.label);

    setWorkEnabled(DEFAULT_SETTINGS.work.enabled);
    setWorkStart(DEFAULT_SETTINGS.work.startTime);
    setWorkEnd(DEFAULT_SETTINGS.work.endTime);
    setWorkCategoryId(DEFAULT_SETTINGS.work.categoryId);
    setWorkLabel(DEFAULT_SETTINGS.work.label);
    setWorkDaysOfWeek(DEFAULT_SETTINGS.work.daysOfWeek);
  };

  // Build the generated iOS Shortcut URL
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://blockair.app/';
  const generatedShortcutUrl = buildShortcutUrl(baseUrl, {
    action: scAction,
    category: scAction === 'log' ? scCategory : undefined,
    label: scAction === 'log' ? scLabel : undefined,
    duration: scAction === 'log' ? scDuration : undefined,
  });

  const handleCopyShortcutUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(generatedShortcutUrl);
      } else {
        const input = document.createElement('textarea');
        input.value = generatedShortcutUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopyFeedback('Copied URL to clipboard! 📋');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch {
      setCopyFeedback('Failed to copy. Please manually copy the URL above.');
    }
  };

  const handleTestShortcutAction = () => {
    if (onRunTestShortcutAction) {
      onRunTestShortcutAction(generatedShortcutUrl);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card settings-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon settings-icon" aria-hidden="true">
              ⚙️
            </span>
            <h2 id={titleId} className="modal-title">
              Settings & Routines
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="settings-tab-bar" role="tablist" aria-label="Settings categories">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'routines'}
            className={`settings-tab-btn ${activeTab === 'routines' ? 'active' : ''}`}
            onClick={() => setActiveTab('routines')}
          >
            🕒 Daily Routines & Auto-Prefill
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'shortcuts'}
            className={`settings-tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcuts')}
          >
            📱 iPhone iOS Shortcuts
          </button>
        </div>

        {activeTab === 'routines' && (
          <form onSubmit={handleSave} className="modal-form">
            {/* Master Auto-Prefill Toggle */}
            <div className="settings-toggle-card">
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  className="toggle-checkbox"
                  checked={autoPrefillEnabled}
                  onChange={(e) => setAutoPrefillEnabled(e.target.checked)}
                />
                <span className="toggle-slider" aria-hidden="true" />
                <div className="toggle-text-block">
                  <span className="toggle-title">Auto-Prefill Each Day</span>
                  <p className="toggle-desc">
                    When you view or navigate to a new day, BlockAir automatically pre-fills your
                    Sleep and Work schedules so every morning is ready with zero friction.
                  </p>
                </div>
              </label>
            </div>

            {/* Sleep Routine Settings */}
            <div className="settings-section-card">
              <div className="settings-section-header">
                <label className="section-checkbox-label">
                  <input
                    type="checkbox"
                    checked={sleepEnabled}
                    onChange={(e) => setSleepEnabled(e.target.checked)}
                  />
                  <span className="section-title">🌙 Sleep Schedule</span>
                </label>
                {sleepEnabled && (
                  <span className="section-badge">
                    {sleepBlocks.length} blocks ({sleepDuration})
                  </span>
                )}
              </div>

              {sleepEnabled && (
                <div className="settings-fields-body">
                  <div className="time-select-grid">
                    <div className="time-field-box">
                      <label htmlFor="settings-bedtime" className="field-label">
                        Bedtime (Start)
                      </label>
                      <input
                        id="settings-bedtime"
                        type="time"
                        step="600"
                        className="time-picker-input"
                        value={sleepStart}
                        onChange={(e) => setSleepStart(e.target.value)}
                        required
                      />
                      <div className="preset-chip-row" role="group" aria-label="Bedtime presets">
                        {BEDTIME_PRESETS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`preset-chip ${sleepStart === t ? 'active' : ''}`}
                            onClick={() => setSleepStart(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="time-field-box">
                      <label htmlFor="settings-waketime" className="field-label">
                        Wake Time (End)
                      </label>
                      <input
                        id="settings-waketime"
                        type="time"
                        step="600"
                        className="time-picker-input"
                        value={sleepEnd}
                        onChange={(e) => setSleepEnd(e.target.value)}
                        required
                      />
                      <div className="preset-chip-row" role="group" aria-label="Wake time presets">
                        {WAKE_PRESETS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`preset-chip ${sleepEnd === t ? 'active' : ''}`}
                            onClick={() => setSleepEnd(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="modal-field">
                    <label htmlFor="settings-sleep-label" className="field-label">
                      Activity Label
                    </label>
                    <input
                      id="settings-sleep-label"
                      type="text"
                      className="text-input"
                      maxLength={60}
                      value={sleepLabel}
                      onChange={(e) => setSleepLabel(e.target.value)}
                      placeholder="Night sleep, Restful sleep..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Work Routine Settings */}
            <div className="settings-section-card">
              <div className="settings-section-header">
                <label className="section-checkbox-label">
                  <input
                    type="checkbox"
                    checked={workEnabled}
                    onChange={(e) => setWorkEnabled(e.target.checked)}
                  />
                  <span className="section-title">💼 Work Schedule</span>
                </label>
                {workEnabled && (
                  <span className="section-badge">
                    {workBlocks.length} blocks ({workDuration})
                  </span>
                )}
              </div>

              {workEnabled && (
                <div className="settings-fields-body">
                  <div className="time-select-grid">
                    <div className="time-field-box">
                      <label htmlFor="settings-work-start" className="field-label">
                        Work Start
                      </label>
                      <input
                        id="settings-work-start"
                        type="time"
                        step="600"
                        className="time-picker-input"
                        value={workStart}
                        onChange={(e) => setWorkStart(e.target.value)}
                        required
                      />
                      <div className="preset-chip-row" role="group" aria-label="Work start presets">
                        {WORK_START_PRESETS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`preset-chip ${workStart === t ? 'active' : ''}`}
                            onClick={() => setWorkStart(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="time-field-box">
                      <label htmlFor="settings-work-end" className="field-label">
                        Work End
                      </label>
                      <input
                        id="settings-work-end"
                        type="time"
                        step="600"
                        className="time-picker-input"
                        value={workEnd}
                        onChange={(e) => setWorkEnd(e.target.value)}
                        required
                      />
                      <div className="preset-chip-row" role="group" aria-label="Work end presets">
                        {WORK_END_PRESETS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`preset-chip ${workEnd === t ? 'active' : ''}`}
                            onClick={() => setWorkEnd(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="modal-field">
                    <label className="field-label">Work Category</label>
                    <div className="modal-category-selector" role="radiogroup" aria-label="Work Category">
                      {categories.slice(0, 4).map((cat) => {
                        const isSelected = cat.id === workCategoryId;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`modal-cat-chip ${isSelected ? 'active' : ''}`}
                            style={{
                              '--cat-color': cat.color,
                              '--cat-bg': cat.bgTint,
                              '--cat-border': cat.borderTint,
                            } as React.CSSProperties}
                            onClick={() => setWorkCategoryId(cat.id)}
                          >
                            <span className="cat-chip-dot" />
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="modal-field">
                    <label htmlFor="settings-work-label" className="field-label">
                      Activity Note
                    </label>
                    <input
                      id="settings-work-label"
                      type="text"
                      className="text-input"
                      maxLength={120}
                      value={workLabel}
                      onChange={(e) => setWorkLabel(e.target.value)}
                      placeholder="e.g. Deep work, Core sprint, Focus"
                    />
                  </div>

                  {/* Day of Week Selector */}
                  <div className="modal-field">
                    <div className="dow-header-row">
                      <label className="field-label">Apply Work On Days</label>
                      <div className="dow-quick-btn-row">
                        <button
                          type="button"
                          className="link-chip-btn"
                          onClick={handleSelectWeekdays}
                        >
                          Weekdays (Mon–Fri)
                        </button>
                        <button
                          type="button"
                          className="link-chip-btn"
                          onClick={handleSelectEveryday}
                        >
                          Every Day
                        </button>
                      </div>
                    </div>
                    <div className="dow-pill-group" role="group" aria-label="Days of week for work">
                      {DAYS_OF_WEEK.map((day) => {
                        const isChecked = workDaysOfWeek.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            className={`dow-btn ${isChecked ? 'active' : ''}`}
                            onClick={() => handleToggleDay(day.id)}
                            aria-pressed={isChecked}
                            title={day.full}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Instant Apply & Utility Actions */}
            <div className="settings-instant-actions-card">
              <span className="field-label">Manual Batch Prefill</span>
              <p className="instant-actions-desc">
                Want to populate right now? Apply your configured sleep & work routine to the current
                view or batch pre-fill the coming week.
              </p>
              <div className="instant-actions-row">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    handleSave();
                    onApplyToSelectedDay();
                  }}
                >
                  ⚡ Apply to Current Day
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    handleSave();
                    onApplyToNext7Days();
                  }}
                >
                  📅 Apply to Next 7 Days
                </button>
              </div>
            </div>

            <div className="modal-actions-between">
              <button
                type="button"
                className="ghost-danger-btn"
                onClick={handleResetDefaults}
                title="Reset all settings to default values"
              >
                Reset to Defaults
              </button>
              <div className="modal-actions-right">
                <button type="button" className="secondary-btn" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Settings
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === 'shortcuts' && (
          <div className="modal-form shortcuts-tab-body">
            {/* Architecture Explanation Box */}
            <div className="shortcuts-info-banner">
              <span className="info-icon">💡</span>
              <div className="info-content">
                <strong>How iOS Shortcuts & PWA Automation Works:</strong>
                <p>
                  iOS runs PWAs in a sandboxed client without a local background HTTP listener.
                  However, you can trigger actions instantly using <strong>Deep Link URLs</strong> with
                  Apple&apos;s <strong>Shortcuts</strong> app and iOS <strong>Automations</strong> (e.g.
                  when Sleep Focus starts, when your alarm stops, or tapping an NFC tag).
                </p>
              </div>
            </div>

            {/* Interactive Shortcut URL Builder */}
            <div className="settings-section-card">
              <span className="section-title">⚡ Interactive Shortcut URL Builder</span>
              <p className="section-desc">
                Configure your desired action below, then copy the URL into an iOS Shortcut with the
                <strong> &quot;Open URLs&quot;</strong> action.
              </p>

              <div className="modal-field">
                <label className="field-label">Action Type</label>
                <div className="shortcut-action-selector" role="radiogroup">
                  <button
                    type="button"
                    className={`action-type-btn ${scAction === 'log' ? 'active' : ''}`}
                    onClick={() => {
                      setScAction('log');
                      setScCategory('deep-work');
                      setScLabel('Deep Work Sprint');
                      setScDuration(30);
                    }}
                  >
                    🎯 Log Block(s) Now
                  </button>
                  <button
                    type="button"
                    className={`action-type-btn ${scAction === 'prefill_sleep' ? 'active' : ''}`}
                    onClick={() => setScAction('prefill_sleep')}
                  >
                    🌙 Pre-fill Sleep
                  </button>
                  <button
                    type="button"
                    className={`action-type-btn ${scAction === 'prefill_work' ? 'active' : ''}`}
                    onClick={() => setScAction('prefill_work')}
                  >
                    💼 Pre-fill Work Hours
                  </button>
                </div>
              </div>

              {scAction === 'log' && (
                <>
                  <div className="modal-field">
                    <label className="field-label">Category</label>
                    <div className="modal-category-selector" role="radiogroup">
                      {categories.map((cat) => {
                        const isSelected = cat.id === scCategory;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`modal-cat-chip ${isSelected ? 'active' : ''}`}
                            style={{
                              '--cat-color': cat.color,
                              '--cat-bg': cat.bgTint,
                              '--cat-border': cat.borderTint,
                            } as React.CSSProperties}
                            onClick={() => {
                              setScCategory(cat.id);
                              if (cat.id === 'vitality' && scLabel === 'Deep Work Sprint') {
                                setScLabel('Morning Workout');
                              } else if (cat.id === 'learning' && scLabel === 'Deep Work Sprint') {
                                setScLabel('Reading & Practice');
                              }
                            }}
                          >
                            <span className="cat-chip-dot" />
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="modal-field">
                    <label htmlFor="shortcut-label-input" className="field-label">
                      Activity Note
                    </label>
                    <input
                      id="shortcut-label-input"
                      type="text"
                      className="text-input"
                      maxLength={80}
                      value={scLabel}
                      onChange={(e) => setScLabel(e.target.value)}
                      placeholder="e.g., Morning Workout, Deep Focus, Reading"
                    />
                  </div>

                  <div className="modal-field">
                    <label className="field-label">
                      Duration: <strong>{scDuration} minutes</strong> ({Math.ceil(scDuration / 10)} blocks)
                    </label>
                    <div className="preset-chip-row" role="group" aria-label="Duration presets">
                      {[10, 20, 30, 45, 60, 90].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          className={`preset-chip ${scDuration === mins ? 'active' : ''}`}
                          onClick={() => setScDuration(mins)}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* URL Preview & Actions */}
              <div className="shortcut-url-box">
                <label className="field-label">Generated iOS Shortcut URL</label>
                <div className="url-copy-group">
                  <input
                    type="text"
                    readOnly
                    className="url-display-input"
                    value={generatedShortcutUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    className="primary-btn copy-btn"
                    onClick={handleCopyShortcutUrl}
                  >
                    📋 Copy URL
                  </button>
                </div>
                {copyFeedback && <p className="copy-feedback-text">{copyFeedback}</p>}
                <div className="shortcut-test-row">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleTestShortcutAction}
                  >
                    ⚡ Test Action Live in App
                  </button>
                  <span className="test-hint">Executes this shortcut action right now in BlockAir.</span>
                </div>
              </div>
            </div>

            {/* Step-by-Step Setup Guide */}
            <div className="settings-section-card">
              <span className="section-title">📱 3-Step Setup on iPhone</span>
              <ol className="shortcut-steps-list">
                <li>
                  <strong>Create Shortcut:</strong> Open Apple&apos;s <strong>Shortcuts</strong> app on iOS,
                  tap <strong>+</strong>, add the action <strong>&quot;Open URLs&quot;</strong>, and paste the URL copied above.
                </li>
                <li>
                  <strong>Automate It (Optional):</strong> In the Shortcuts app, tap the <strong>Automation</strong> tab &gt; <strong>+</strong>:
                  <ul className="automation-examples-list">
                    <li>🌅 <em>When Wake-Up Alarm is Stopped</em> → Trigger Morning Routine</li>
                    <li>🏢 <em>When Arriving at Work (Location)</em> → Trigger Work Focus</li>
                    <li>🌙 <em>When Sleep Focus turns on</em> → Trigger Sleep Log</li>
                    <li>🏷️ <em>NFC Tag tap</em> → Place a 50¢ NFC tag on your desk or nightstand for instant 1-tap logging!</li>
                  </ul>
                </li>
                <li>
                  <strong>Action Button / Back Tap:</strong> On iPhone 15 Pro / 16, assign this shortcut to your <strong>Action Button</strong> or under <em>Settings &gt; Accessibility &gt; Touch &gt; Back Tap</em>.
                </li>
              </ol>
            </div>

            {/* Headless Background Webhook Alternative */}
            <div className="settings-section-card">
              <span className="section-title">🌐 Headless Background Webhook (Zero-UI Alternative)</span>
              <p className="section-desc">
                If you prefer iOS Shortcuts to run 100% silently in the background without opening the browser,
                you can use Apple Shortcut&apos;s <strong>&quot;Get Contents of URL&quot;</strong> (HTTP POST) to a serverless worker:
              </p>
              <pre className="code-snippet-box">
{`// Example: iOS Shortcut "Get Contents of URL" (POST)
Endpoint: https://your-worker.workers.dev/api/log
Method:   POST
Headers:  Content-Type: application/json
Body:
{
  "category": "deep-work",
  "label": "Focus sprint",
  "blocks": 3
}`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

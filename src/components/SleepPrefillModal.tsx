import React, { useEffect, useId, useState } from 'react';
import {
  computeBlocksForTimeRange,
  formatDurationMinutes,
  MINUTES_PER_BLOCK,
} from '../utils/timeBlocks';

interface SleepPrefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySleep: (options: {
    startTime: string;
    endTime: string;
    overwriteExisting: boolean;
    label: string;
  }) => void;
}

const BEDTIME_PRESETS = ['22:00', '22:30', '23:00', '23:30', '00:00'];
const WAKE_PRESETS = ['06:00', '06:30', '07:00', '07:30', '08:00'];

interface SleepRoutinePreset {
  id: string;
  title: string;
  badge: string;
  startTime: string;
  endTime: string;
  label: string;
}

const SLEEP_ROUTINE_CARDS: SleepRoutinePreset[] = [
  {
    id: 'sleep-8h-standard',
    title: '8h Sleep: 23:00–07:00',
    badge: '48 blocks · 8h',
    startTime: '23:00',
    endTime: '07:00',
    label: 'Night sleep',
  },
  {
    id: 'sleep-75h-midnight',
    title: '7.5h Sleep: 00:00–07:30',
    badge: '45 blocks · 7h 30m',
    startTime: '00:00',
    endTime: '07:30',
    label: 'Night sleep',
  },
  {
    id: 'sleep-8h-early',
    title: 'Early Riser: 22:00–06:00',
    badge: '48 blocks · 8h',
    startTime: '22:00',
    endTime: '06:00',
    label: 'Early night sleep',
  },
  {
    id: 'sleep-8h-late',
    title: 'Late Owl: 01:00–09:00',
    badge: '48 blocks · 8h',
    startTime: '01:00',
    endTime: '09:00',
    label: 'Late night sleep',
  },
];

export const SleepPrefillModal: React.FC<SleepPrefillModalProps> = ({
  isOpen,
  onClose,
  onApplySleep,
}) => {
  const [startTime, setStartTime] = useState('23:00');
  const [endTime, setEndTime] = useState('07:00');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [label, setLabel] = useState('Night sleep');

  const titleId = useId();

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

  const targetIndices = computeBlocksForTimeRange(startTime, endTime);
  const totalMinutes = targetIndices.length * MINUTES_PER_BLOCK;
  const durationStr = formatDurationMinutes(totalMinutes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplySleep({
      startTime,
      endTime,
      overwriteExisting,
      label,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon" aria-hidden="true">
              🌙
            </span>
            <h2 id={titleId} className="modal-title">
              Pre-fill Sleep
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close sleep modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <p className="modal-desc">
            Tap a 1-tap sleep routine or fine-tune bedtime and wake time. Midnight-crossing ranges
            map cleanly across your 144 blocks.
          </p>

          <div className="routine-presets-section">
            <span className="field-label">1-Tap Sleep Routines</span>
            <div className="routine-card-grid" role="group" aria-label="1-Tap Sleep Routines">
              {SLEEP_ROUTINE_CARDS.map((routine) => {
                const isSelected =
                  startTime === routine.startTime && endTime === routine.endTime;
                return (
                  <button
                    key={routine.id}
                    type="button"
                    className={`routine-card ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setStartTime(routine.startTime);
                      setEndTime(routine.endTime);
                      setLabel(routine.label);
                    }}
                  >
                    <span className="routine-card-title">{routine.title}</span>
                    <span className="routine-card-meta">{routine.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="time-select-grid">
            <div className="time-field-box">
              <label htmlFor="bedtime-input" className="field-label">
                Bedtime (Start)
              </label>
              <input
                id="bedtime-input"
                type="time"
                step="600"
                className="time-picker-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <div className="preset-chip-row" role="group" aria-label="Bedtime presets">
                {BEDTIME_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`preset-chip ${startTime === t ? 'active' : ''}`}
                    onClick={() => setStartTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="time-field-box">
              <label htmlFor="waketime-input" className="field-label">
                Wake Time (End)
              </label>
              <input
                id="waketime-input"
                type="time"
                step="600"
                className="time-picker-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
              <div className="preset-chip-row" role="group" aria-label="Wake time presets">
                {WAKE_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`preset-chip ${endTime === t ? 'active' : ''}`}
                    onClick={() => setEndTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="sleep-summary-banner">
            <span className="summary-left">
              <strong>{targetIndices.length} blocks</strong> ({durationStr})
            </span>
            <span className="summary-range">
              {startTime} → {endTime}
            </span>
          </div>

          <div className="modal-field">
            <label htmlFor="sleep-label-input" className="field-label">
              Activity Label
            </label>
            <input
              id="sleep-label-input"
              type="text"
              className="text-input"
              maxLength={60}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Night sleep, Rest, etc."
            />
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={!overwriteExisting}
              onChange={(e) => setOverwriteExisting(!e.target.checked)}
            />
            <span className="checkbox-text">
              Keep already-logged blocks (only fill unassigned slots)
            </span>
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={targetIndices.length === 0}
            >
              Fill Sleep ({targetIndices.length} Blocks)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

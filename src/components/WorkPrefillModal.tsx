import React, { useEffect, useId, useState } from 'react';
import type { Category } from '../types/blockair';
import {
  computeBlocksForTimeRange,
  formatDurationMinutes,
  MINUTES_PER_BLOCK,
} from '../utils/timeBlocks';

interface WorkPrefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onApplyWork: (options: {
    startTime: string;
    endTime: string;
    categoryId: string;
    overwriteExisting: boolean;
    label: string;
  }) => void;
}

const WORK_START_PRESETS = ['08:00', '08:30', '09:00', '09:30', '10:00'];
const WORK_END_PRESETS = ['16:00', '16:30', '17:00', '17:30', '18:00'];

interface WorkRoutinePreset {
  id: string;
  title: string;
  badge: string;
  startTime: string;
  endTime: string;
  categoryId: string;
  label: string;
}

const WORK_ROUTINE_CARDS: WorkRoutinePreset[] = [
  {
    id: 'work-standard-9-to-5',
    title: 'Standard 9-to-5',
    badge: '09:00–17:00 · 8h',
    startTime: '09:00',
    endTime: '17:00',
    categoryId: 'focus',
    label: 'Focus & Craft',
  },
  {
    id: 'work-early-bird',
    title: 'Early Bird 07:00–15:00',
    badge: '48 blocks · 8h',
    startTime: '07:00',
    endTime: '15:00',
    categoryId: 'focus',
    label: 'Early focus sprint',
  },
  {
    id: 'work-night-owl',
    title: 'Night Owl 11:00–19:00',
    badge: '48 blocks · 8h',
    startTime: '11:00',
    endTime: '19:00',
    categoryId: 'focus',
    label: 'Late focus sprint',
  },
  {
    id: 'work-morning-sprint',
    title: 'Morning Sprint 08:30–12:30',
    badge: '24 blocks · 4h',
    startTime: '08:30',
    endTime: '12:30',
    categoryId: 'focus',
    label: 'Morning focus sprint',
  },
];

export const WorkPrefillModal: React.FC<WorkPrefillModalProps> = ({
  isOpen,
  onClose,
  categories,
  onApplyWork,
}) => {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [categoryId, setCategoryId] = useState('focus');
  const [label, setLabel] = useState('Focus & Craft');
  const [overwriteExisting, setOverwriteExisting] = useState(false);

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
    onApplyWork({
      startTime,
      endTime,
      categoryId,
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
            <span className="modal-icon work-icon" aria-hidden="true">
              💼
            </span>
            <h2 id={titleId} className="modal-title">
              Pre-fill Work Hours
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close work modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <p className="modal-desc">
            Tap a 1-tap work schedule or customize start and end hours for batch focus blocks.
          </p>

          <div className="routine-presets-section">
            <span className="field-label">1-Tap Work Schedules</span>
            <div className="routine-card-grid" role="group" aria-label="1-Tap Work Schedules">
              {WORK_ROUTINE_CARDS.map((routine) => {
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
                      setCategoryId(routine.categoryId);
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
              <label htmlFor="work-start-input" className="field-label">
                Work Start
              </label>
              <input
                id="work-start-input"
                type="time"
                step="600"
                className="time-picker-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <div className="preset-chip-row" role="group" aria-label="Work start presets">
                {WORK_START_PRESETS.map((t) => (
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
              <label htmlFor="work-end-input" className="field-label">
                Work End
              </label>
              <input
                id="work-end-input"
                type="time"
                step="600"
                className="time-picker-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
              <div className="preset-chip-row" role="group" aria-label="Work end presets">
                {WORK_END_PRESETS.map((t) => (
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
            <label className="field-label">Category</label>
            <div className="modal-category-selector" role="radiogroup" aria-label="Category">
              {categories.slice(0, 4).map((cat) => {
                const isSelected = cat.id === categoryId;
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
                      setCategoryId(cat.id);
                      if (label === 'Focus & Craft' && cat.id === 'ops') {
                        setLabel('Operations & Admin');
                      } else if (label === 'Operations & Admin' && cat.id === 'focus') {
                        setLabel('Focus & Craft');
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
            <label htmlFor="work-label-input" className="field-label">
              Activity Note (Optional)
            </label>
            <input
              id="work-label-input"
              type="text"
              className="text-input"
              maxLength={120}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Core sprint, Architecture, Client calls"
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
              Fill Work ({targetIndices.length} Blocks)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

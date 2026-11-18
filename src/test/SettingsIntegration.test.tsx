import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { STORAGE_KEY } from '../utils/storage';

describe('SettingsModal and Auto-Prefill App Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens settings modal, edits sleep and work times, enables auto-prefill, and saves', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Click Settings button in top header
    const settingsBtn = screen.getByRole('button', { name: /Open Settings/i });
    await user.click(settingsBtn);

    // Modal should be open with title "Settings & Routines"
    expect(screen.getByRole('heading', { name: /Settings & Routines/i })).toBeInTheDocument();

    // Toggle Auto-Prefill Each Day
    const autoPrefillCheckbox = screen.getByLabelText(/Auto-Prefill Each Day/i);
    expect(autoPrefillCheckbox).not.toBeChecked();
    await user.click(autoPrefillCheckbox);
    expect(autoPrefillCheckbox).toBeChecked();

    // Change bedtime to 22:00 via preset chip
    const bedtime2200 = screen.getByRole('button', { name: '22:00' });
    await user.click(bedtime2200);

    // Change wake time to 06:00 via preset chip
    const wake0600 = screen.getByRole('button', { name: '06:00' });
    await user.click(wake0600);

    // Save Settings
    const saveBtn = screen.getByRole('button', { name: /Save Settings/i });
    await user.click(saveBtn);

    // Modal should close and show feedback
    expect(screen.queryByRole('heading', { name: /Settings & Routines/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Saved schedule and routine settings/i)).toBeInTheDocument();

    // Verify localStorage was updated with the new settings
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.settings?.autoPrefillEnabled).toBe(true);
    expect(stored.settings?.sleep?.startTime).toBe('22:00');
    expect(stored.settings?.sleep?.endTime).toBe('06:00');
  });

  it('applies configured routine to current day via "Apply to Current Day"', async () => {
    const user = userEvent.setup();
    render(<App />);

    const settingsBtn = screen.getByRole('button', { name: /Open Settings/i });
    await user.click(settingsBtn);

    // Click "Apply to Current Day"
    const applyBtn = screen.getByRole('button', { name: /Apply to Current Day/i });
    await user.click(applyBtn);

    // Verify toast announced
    expect(screen.getByText(/Applied routine: filled/i)).toBeInTheDocument();

    // Check that bedtime blocks (e.g. 23:00) are mapped
    expect(
      screen.getByRole('button', {
        name: /Block 23:00 to 23:10, Sleep, Night sleep/i,
      })
    ).toBeInTheDocument();
  });

  it('switches to iOS Shortcuts tab, generates shortcut URL, and can test action live', async () => {
    const user = userEvent.setup();
    render(<App />);

    const settingsBtn = screen.getByRole('button', { name: /Open Settings/i });
    await user.click(settingsBtn);

    // Switch to iPhone iOS Shortcuts tab
    const shortcutsTab = screen.getByRole('tab', { name: /iPhone iOS Shortcuts/i });
    await user.click(shortcutsTab);

    // Verify explanation banner and builder are visible
    expect(
      screen.getByText(/How iOS Shortcuts & PWA Automation Works/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Interactive Shortcut URL Builder/i)).toBeInTheDocument();

    // Test Action Live in App
    const testLiveBtn = screen.getByRole('button', { name: /Test Action Live in App/i });
    await user.click(testLiveBtn);

    // Modal closes and feedback is displayed
    expect(screen.getByText(/iOS Shortcut: Logged/i)).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { loadStore } from '../utils/storage';

describe('BlockAir App integration', () => {
  it('renders 144 blocks by default and toggles to 100 waking blocks', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('24-Hour Grid · 144 Blocks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Block 00:00 to 00:10/i })).toBeInTheDocument();

    const wakingBtn = screen.getByRole('button', { name: /100 Blocks/i });
    await user.click(wakingBtn);

    expect(screen.getByText('Waking Grid · 100 Blocks')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Block 00:00 to 00:10/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Block 06:00 to 06:10/i })).toBeInTheDocument();
  });

  it('allows selecting a range of blocks, assigning an activity & category, and deleting it', async () => {
    const user = userEvent.setup();
    render(<App />);

    const block0900 = screen.getByRole('button', { name: /Block 09:00 to 09:10/i });
    const block0920 = screen.getByRole('button', { name: /Block 09:20 to 09:30/i });

    // Click first block, then Shift+click third block (3 blocks = 30m)
    await user.click(block0900);
    fireEvent.click(block0920, { shiftKey: true });

    expect(screen.getByText(/Selected: 09:00 – 09:30 \(30m · 3 blocks\)/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Activity note/i);
    await user.type(input, 'Deep architecture session');

    const saveBtn = screen.getByRole('button', { name: /Save to 3 Blocks/i });
    await user.click(saveBtn);

    // Overview updates to 30m allocated
    expect(
      screen.getByRole('button', {
        name: /Block 09:00 to 09:10, Deep Work, Deep architecture session/i,
      })
    ).toBeInTheDocument();

    const stored = loadStore();
    const todayEntries = Object.values(stored.days)[0]?.blocks ?? {};
    expect(todayEntries[54]?.label).toBe('Deep architecture session');
    expect(todayEntries[55]?.label).toBe('Deep architecture session');
    expect(todayEntries[56]?.label).toBe('Deep architecture session');

    // Now delete the selected blocks
    const deleteBtn = screen.getByRole('button', {
      name: /Delete activity from selected blocks/i,
    });
    await user.click(deleteBtn);

    expect(
      screen.getByRole('button', {
        name: /Block 09:00 to 09:10, Unassigned/i,
      })
    ).toBeInTheDocument();
  });

  it('navigates between days and preserves activities per day', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Pre-fill night sleep on today
    const prefillBtn = screen.getByRole('button', { name: /Pre-fill Night Sleep/i });
    await user.click(prefillBtn);
    expect(screen.getByText('31% mapped')).toBeInTheDocument();

    // Navigate to previous day -> should be empty (0% mapped)
    const prevDayBtn = screen.getByRole('button', { name: /Previous day/i });
    await user.click(prevDayBtn);
    expect(screen.getByText('0% mapped')).toBeInTheDocument();

    // Return to Today -> 31% mapped is still intact
    const todayBtn = screen.getByRole('button', { name: /^Today$/i });
    await user.click(todayBtn);
    expect(screen.getByText('31% mapped')).toBeInTheDocument();
  });
});

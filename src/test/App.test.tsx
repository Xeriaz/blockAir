import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { loadStore } from '../utils/storage';

describe('BlockAir App integration', () => {
  it('renders all 144 blocks across 24 hours with live 24-hour clock', () => {
    render(<App />);

    expect(screen.getByText('24-Hour Grid · 144 Blocks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Block 00:00 to 00:10/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Block 23:50 to 24:00/i })).toBeInTheDocument();
    expect(screen.getByText('24H · 144')).toBeInTheDocument();
  });

  it('supports Range (2-Tap) selection on mobile without Shift key', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Switch to Range (2-Tap) mode
    const rangeToolBtn = screen.getByRole('button', { name: /Range \(2-Tap\)/i });
    await user.click(rangeToolBtn);

    const block0900 = screen.getByRole('button', { name: /Block 09:00 to 09:10/i });
    const block0930 = screen.getByRole('button', { name: /Block 09:30 to 09:40/i });

    // Tap start block (09:00)
    await user.click(block0900);
    expect(screen.getByText(/Start set to 09:00/i)).toBeInTheDocument();

    // Tap end block (09:30) -> automatically selects 09:00 to 09:40 (4 blocks = 40m)
    await user.click(block0930);
    expect(screen.getByText(/Selected: 09:00 – 09:40 \(40m · 4 blocks\)/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Activity note/i);
    await user.type(input, 'Mobile product strategy');

    const saveBtn = screen.getByRole('button', { name: /Save to 4 Blocks/i });
    await user.click(saveBtn);

    expect(
      screen.getByRole('button', {
        name: /Block 09:00 to 09:10, Focus & Craft, Mobile product strategy/i,
      })
    ).toBeInTheDocument();
  });

  it('allows Shift+click range selection in Select mode, editing, and deleting', async () => {
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
        name: /Block 09:00 to 09:10, Focus & Craft, Deep architecture session/i,
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

    // Open Sleep Prefill dialog and apply default sleep (23:00 to 07:00 = 48 blocks = 33%)
    const openSleepBtn = screen.getByRole('button', { name: /Pre-fill Sleep/i });
    await user.click(openSleepBtn);

    const applySleepBtn = screen.getByRole('button', { name: /Fill Sleep \(48 Blocks\)/i });
    await user.click(applySleepBtn);
    expect(screen.getByText('33% mapped')).toBeInTheDocument();

    // Navigate to previous day -> should be empty (0% mapped)
    const prevDayBtn = screen.getByRole('button', { name: /Previous day/i });
    await user.click(prevDayBtn);
    expect(screen.getByText('0% mapped')).toBeInTheDocument();

    // Return to Today -> 33% mapped is still intact
    const todayBtn = screen.getByRole('button', { name: /^Today$/i });
    await user.click(todayBtn);
    expect(screen.getByText('33% mapped')).toBeInTheDocument();
  });

  it('allows customizing bedtime and wake time in the sleep prefill modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Open Sleep Prefill modal
    const openSleepBtn = screen.getByRole('button', { name: /Pre-fill Sleep/i });
    await user.click(openSleepBtn);

    // Click 22:00 bedtime preset and 06:00 wake time preset
    // 22:00 to 24:00 (12 blocks) + 00:00 to 06:00 (36 blocks) = 48 blocks (8h)
    const bedtime2200 = screen.getByRole('button', { name: '22:00' });
    const wake0600 = screen.getByRole('button', { name: '06:00' });
    await user.click(bedtime2200);
    await user.click(wake0600);

    expect(screen.getByText(/22:00 → 06:00/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fill Sleep \(48 Blocks\)/i })).toBeInTheDocument();

    // Submit the modal
    const submitBtn = screen.getByRole('button', { name: /Fill Sleep \(48 Blocks\)/i });
    await user.click(submitBtn);

    // Verify first hour of sleep (22:00) is marked as sleep
    expect(
      screen.getByRole('button', {
        name: /Block 22:00 to 22:10, Sleep & Recovery, Night sleep/i,
      })
    ).toBeInTheDocument();
    // And waking block (06:00) is unassigned
    expect(
      screen.getByRole('button', {
        name: /Block 06:00 to 06:10, Unassigned/i,
      })
    ).toBeInTheDocument();
  });

  it('allows pre-filling work hours with customizable times and category', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Open Work Prefill modal
    const openWorkBtn = screen.getByRole('button', { name: /Pre-fill Work/i });
    await user.click(openWorkBtn);

    expect(screen.getByText('Pre-fill Work Hours')).toBeInTheDocument();
    expect(screen.getByText(/09:00 → 17:00/i)).toBeInTheDocument();

    // Select start preset 08:30 and end preset 16:30 (8 hours = 48 blocks)
    const start0830 = screen.getByRole('button', { name: '08:30' });
    const end1630 = screen.getByRole('button', { name: '16:30' });
    await user.click(start0830);
    await user.click(end1630);

    expect(screen.getByText(/08:30 → 16:30/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Fill Work \(48 Blocks\)/i });
    await user.click(submitBtn);

    // Verify 08:30 block is Focus & Craft
    expect(
      screen.getByRole('button', {
        name: /Block 08:30 to 08:40, Focus & Craft, Focus & Craft/i,
      })
    ).toBeInTheDocument();
    // Verify 08:20 block is still unassigned
    expect(
      screen.getByRole('button', {
        name: /Block 08:20 to 08:30, Unassigned/i,
      })
    ).toBeInTheDocument();
    // Verify 16:20 block is Focus & Craft
    expect(
      screen.getByRole('button', {
        name: /Block 16:20 to 16:30, Focus & Craft, Focus & Craft/i,
      })
    ).toBeInTheDocument();
  });

  it('supports 1-Tap Routine Cards for Sleep and Work and quick-jump hour shortcuts', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Verify quick-jump hour shortcuts exist in the 24-hour grid header
    const jumpNav = screen.getByRole('navigation', { name: /Quick-jump hour shortcuts/i });
    expect(jumpNav).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Morning/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Afternoon/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Evening/i })).toBeInTheDocument();

    // Test 1-Tap Sleep Routine Card ("7.5h Sleep: 00:00–07:30" -> 45 blocks)
    const openSleepBtn = screen.getByRole('button', { name: /Pre-fill Sleep/i });
    await user.click(openSleepBtn);

    const sleepRoutine75 = screen.getByRole('button', { name: /7\.5h Sleep: 00:00–07:30/i });
    await user.click(sleepRoutine75);
    expect(screen.getByText(/00:00 → 07:30/i)).toBeInTheDocument();

    const fillSleep45 = screen.getByRole('button', { name: /Fill Sleep \(45 Blocks\)/i });
    await user.click(fillSleep45);

    expect(
      screen.getByRole('button', {
        name: /Block 07:20 to 07:30, Sleep & Recovery, Night sleep/i,
      })
    ).toBeInTheDocument();

    // Test 1-Tap Work Routine Card ("Early Bird 07:00–15:00" -> 48 blocks, preserving existing 07:00-07:30 sleep blocks)
    const openWorkBtn = screen.getByRole('button', { name: /Pre-fill Work/i });
    await user.click(openWorkBtn);

    const earlyBirdCard = screen.getByRole('button', { name: /Early Bird 07:00–15:00/i });
    await user.click(earlyBirdCard);
    expect(screen.getByText(/07:00 → 15:00/i)).toBeInTheDocument();

    const fillWork48 = screen.getByRole('button', { name: /Fill Work \(48 Blocks\)/i });
    await user.click(fillWork48);

    // 07:30 block was unassigned so it becomes Early focus sprint
    expect(
      screen.getByRole('button', {
        name: /Block 07:30 to 07:40, Focus & Craft, Early focus sprint/i,
      })
    ).toBeInTheDocument();
  });

  it('supports quick activity suggestion tags in BlockComposer', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Select block 09:00
    const block0900 = screen.getByRole('button', { name: /Block 09:00 to 09:10/i });
    await user.click(block0900);

    // Click quick tag Coding
    const codingTag = screen.getByRole('button', { name: /Coding/i });
    await user.click(codingTag);

    // Block 09:00 should immediately have Focus & Craft: Coding
    expect(
      screen.getByRole('button', {
        name: /Block 09:00 to 09:10, Focus & Craft, Coding/i,
      })
    ).toBeInTheDocument();
  });

  it('switches seamlessly to Trends & Stats view and back to Day Grid', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Switch to Trends & Stats view via switcher in header
    const trendsTab = screen.getByRole('tab', { name: /Trends & Stats/i });
    await user.click(trendsTab);

    // Trends view heading and sections should be visible
    expect(screen.getByText(/Trends & Multi-Day Statistics/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily State Balance/i)).toBeInTheDocument();
    expect(screen.getByText(/24-Hour Circadian Rhythm Heatmap/i)).toBeInTheDocument();
    expect(screen.getByText(/Weekdays vs\. Weekends Split/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Activities Leaderboard/i)).toBeInTheDocument();

    // Switch between 7-Day and 30-Day
    const btn30Days = screen.getByRole('button', { name: /30-Day View/i });
    await user.click(btn30Days);
    expect(btn30Days).toHaveClass('active');

    // Switch back to Day Grid
    const gridTab = screen.getByRole('tab', { name: /Day Grid/i });
    await user.click(gridTab);

    expect(screen.getByText('24-Hour Grid · 144 Blocks')).toBeInTheDocument();
  });
});

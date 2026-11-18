# BlockAir

**BlockAir** is an offline-first Progressive Web App (PWA) for visualizing and sculpting your day as a finite grid of 144 ten-minute blocks across all 24 hours (`00:00`–`24:00`).

## Features

- **Strict 24-Hour Time & 144 Blocks:**
  - **144 Blocks (24 Hours):** Every 10-minute slice of the full 24-hour day (`00:00` – `24:00`), grouped into 24 hourly rows of 6 blocks each.
  - **Live 24-Hour Clock (`HH:MM`):** Continuous 24-hour clock badge and active 10-minute block interval in the header.
  - **No 12h AM/PM:** Strict 24-hour time labels throughout all hour rows, blocks, and activity summaries.
- **Mobile Multi-Block Selection (iPhone 16 Pro & Touchscreens):**
  - **Range (2-Tap) Mode (Recommended for Mobile):** Tap the start block (e.g. `09:00`), then tap the end block (e.g. `11:30`)—the entire range is selected immediately with zero clumsy dragging or page-scroll conflicts.
  - **Touch & Drag via Pointer Tracking:** In **Paint Brush** and **Eraser** modes, `touch-action: none` prevents the page from scrolling while dragging, and `document.elementFromPoint` smoothly paints or clears every block under your finger.
  - **Select & Edit Mode:** Tap any block to view/edit it. When a single block is selected, tap the `+ Extend to next tap` shortcut to easily select a range on mobile, or use `Shift`+click on desktop.
  - **Hour Row Selection:** Tap any hour label (e.g. `09:00`) to select or toggle all 6 blocks of that hour.
- **Day Balance & Reflection:**
  - Live calculation of allocated vs. unassigned hours and blocks.
  - Proportional category distribution bar, top activities list, and a daily reflection journal.
  - Quick-action sleep & work routine prefill modals with customizable times and categories.
- **Routines & Auto-Prefill Settings:**
  - **Custom Sleep Schedule:** Configure bedtime and wake time (with support for midnight-crossing intervals like `23:00` → `07:00`) and custom labels.
  - **Custom Work Schedule:** Configure work start/end times, category, and which days of the week work applies to (e.g. Mon–Fri vs Every Day).
  - **Auto-Prefill Each Day:** When navigating to a new day, BlockAir automatically pre-fills your configured sleep and work routines so your schedule is already structured.
  - **Batch Prefill:** One-click "Apply to Current Day" and "Apply to Next 7 Days" actions.
- **iPhone iOS Shortcuts & Automations:**
  - **Instant Deep-Link Action Handler:** Support for deep links like `?action=log&category=deep-work&label=Focus+Session&duration=30` and `?action=prefill_sleep`.
  - **Built-in Shortcut Builder:** Interactive URL builder inside Settings with 1-tap clipboard copying and live in-app testing.
  - **iOS Automations Integration:** Triggered via Apple Shortcuts by Sleep Focus, Wake-Up Alarm stop, Geofence (arriving at office), Action Button, Back Tap, or NFC desk tags.
- **iPhone 16 Pro & Offline PWA:**
  - Designed for the iPhone 16 Pro viewport (`402 × 874` logical px) with Dynamic Island and Home Indicator safe-area insets (`env(safe-area-inset-*)`).
  - Inputs sized at `16px` to prevent unwanted iOS Safari viewport auto-zoom on focus.
  - `public/manifest.webmanifest`, custom vector & PNG icons (including maskable), and `public/sw.js` for offline operation.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run test suite once
npm run test:run

# Type-check and build production bundle into dist/
npm run build
```

## Deployment

`npm run deploy` runs tests and production build, then executes [`scripts/deploy.sh`](./scripts/deploy.sh), which creates a temporary detached Git worktree, copies `dist/.`, commits the build output, and force-pushes it to the **`prod`** branch on `origin`:

```bash
# Deploy to origin/prod
npm run deploy

# Or deploy to an alternative branch
DEPLOY_BRANCH=my-branch npm run deploy
```

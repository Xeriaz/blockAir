# BlockAir

**BlockAir** is an offline-first Progressive Web App (PWA) for visualizing and sculpting your day as a finite grid of 10-minute blocks—inspired by *144blocks.com* and Wait But Why’s *“100 Blocks a Day”*.

## Features

- **24-Hour Clock & Dual Time-Block Perspectives:**
  - **Live 24-Hour Clock (`00:00` – `24:00`):** Strict 24-hour time formatting across the header clock, hourly row headers (`00:00`–`23:00`), and 10-minute block intervals.
  - **144 Blocks (24 Hours):** Every 10-minute slice of the full 24-hour day (`00:00` – `24:00`), grouped into 24 hourly rows of 6 blocks each.
  - **100 Blocks (Waking Day):** Focuses on the 1,000 waking minutes from `06:00` to `22:40` (100 ten-minute blocks).
- **iPhone 16 Pro & Mobile-First PWA Layout:**
  - Tuned for the iPhone 16 Pro viewport (`402 × 874` logical px) with `viewport-fit=cover`, Dynamic Island & Home Indicator `env(safe-area-inset-*)` padding, 6-blocks-per-hour compact grid rows, horizontal touch-scrolling category chips, and `16px` mobile inputs to prevent unwanted iOS viewport auto-zoom.
- **Fast Activity Logging & Range Editing:**
  - **Select & Edit Mode:** Tap a block, Shift+click a range of blocks, drag across blocks, or tap an hour label to select an entire hour, then assign a category and activity note.
  - **Quick Paint Brush & Eraser:** Paint or clear blocks immediately with a single tap or drag.
  - **Keyboard Shortcuts:** Use arrow keys (`↑` `↓` `←` `→`) to move across blocks, `1`–`7` to assign categories, `Delete`/`Backspace` to clear selected blocks, and `Escape` to deselect.
- **Local Persistence & Offline PWA:**
  - Stores data per local calendar date (`YYYY-MM-DD`) in `localStorage` with schema sanitization.
  - Includes `public/manifest.webmanifest`, custom icons (SVG, 192×192, 512×512, maskable 512×512, and Apple touch icon), and `public/sw.js` with app-shell precaching, `./assets/*` caching, and network-first navigation.

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

### Git Worktree Deployment (`npm run deploy` -> `prod` branch)

`npm run deploy` runs `npm run test:run` and `npm run build`, then executes [`scripts/deploy.sh`](./scripts/deploy.sh). The script creates a temporary detached Git worktree, copies the contents of `dist/.` (plus `.nojekyll`) into it, commits the build output, and force-pushes it to the **`prod`** branch by default while leaving your current branch and working tree untouched. An `EXIT` trap guarantees the temporary worktree is cleaned up on both success and failure.

```bash
# Deploys to origin/prod by default
npm run deploy
```

#### Changing the Target Deployment Branch or Remote

You can override the target branch via the `DEPLOY_BRANCH` environment variable or by passing the branch name as an argument:

```bash
# Deploy to 'gh-pages' instead of 'prod'
DEPLOY_BRANCH=gh-pages npm run deploy

# Or pass the branch name directly to the script
npm run deploy -- gh-pages

# Override both remote and branch
DEPLOY_REMOTE=upstream DEPLOY_BRANCH=prod npm run deploy
```

### Cross-Platform Node Alternative (`gh-pages`)

If you are on an environment without `bash` (such as Windows Command Prompt without Git Bash/WSL), you can deploy `dist/` to the `prod` branch using the `gh-pages` package via `npx` after building:

```bash
npm run test:run && npm run build && npx gh-pages -d dist -b prod
```

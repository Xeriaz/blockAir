#!/usr/bin/env bash
set -euo pipefail

# Configurable deployment target branch and remote.
# Override via environment variables or first CLI argument:
#   DEPLOY_BRANCH=prod npm run deploy
#   npm run deploy -- prod
DEPLOY_BRANCH="${1:-${DEPLOY_BRANCH:-gh-pages}}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-origin}"
DIST_DIR="${DIST_DIR:-dist}"

if [ ! -d "$DIST_DIR" ]; then
  echo "Error: Build directory '$DIST_DIR' does not exist. Run 'npm run build' first." >&2
  exit 1
fi

TMP_WORKTREE="$(mktemp -d "${TMPDIR:-/tmp}/blockair-deploy.XXXXXX")"

cleanup() {
  if git worktree list --porcelain 2>/dev/null | grep -Fq "worktree $TMP_WORKTREE"; then
    git worktree remove --force "$TMP_WORKTREE" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_WORKTREE"
}
trap cleanup EXIT INT TERM

echo "==> Preparing detached worktree at $TMP_WORKTREE for branch '$DEPLOY_BRANCH'..."
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  git worktree add --detach "$TMP_WORKTREE" HEAD
else
  git worktree add --detach --orphan "$TMP_WORKTREE"
fi

# Clear any tracked/untracked files inside the detached worktree (preserving .git reference)
find "$TMP_WORKTREE" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

# Copy built production assets from dist/ into the worktree
cp -R "$DIST_DIR"/. "$TMP_WORKTREE"/

# Add .nojekyll so GitHub Pages serves all files unaltered
touch "$TMP_WORKTREE/.nojekyll"

(
  cd "$TMP_WORKTREE"
  git add -A
  if git diff --cached --quiet; then
    echo "==> No changes to commit in '$DIST_DIR'."
  else
    COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'initial')"
    git commit -m "Deploy BlockAir build (${COMMIT_SHA})"
  fi

  echo "==> Force-pushing build output to ${DEPLOY_REMOTE} ${DEPLOY_BRANCH}..."
  git push --force "$DEPLOY_REMOTE" "HEAD:refs/heads/${DEPLOY_BRANCH}"
)

echo "==> Deployed successfully to ${DEPLOY_REMOTE}/${DEPLOY_BRANCH}!"

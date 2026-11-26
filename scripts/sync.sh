#!/usr/bin/env bash
set -e

# Resolve repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "=========================================="
echo " 📱 Beauty Vault — Mobile Price Sync"
echo "=========================================="

# Determine Python command
if command -v python3 &>/dev/null; then
  PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
  PYTHON_CMD="python"
else
  echo "Error: Python is not installed or not in PATH."
  exit 1
fi

echo "Running price sync using $PYTHON_CMD..."
$PYTHON_CMD scripts/phone_sync.py

# Check if live-prices.json has changes
if git diff --quiet frontend/public/data/live-prices.json; then
  echo ""
  echo "ℹ️  No changes detected in frontend/public/data/live-prices.json. Repository is already up to date."
  exit 0
fi

echo ""
echo "Staging frontend/public/data/live-prices.json..."
git add frontend/public/data/live-prices.json

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "Committing live price snapshot on branch '$CURRENT_BRANCH'..."
git commit -m "chore(prices): update live prices from mobile sync"

echo "Pulling latest changes (rebase) from origin..."
git pull --rebase origin "$CURRENT_BRANCH"

echo "Pushing updated prices to origin/$CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"

echo ""
echo "=========================================="
echo "✓ Sync complete! Live prices pushed to GitHub."
echo "  GitHub Actions will automatically build & deploy to gh-pages."
echo "=========================================="

#!/usr/bin/env bash
# sync-commits-cron.sh — wrapper for backfill-commits.sh, run on a schedule by launchd.
#
# Reads READING_SECRET from .env.local, scans local repos, and uploads recent
# commits to production. Logs to scripts/.sync-commits.log.
#
# Schedule it with: ~/Library/LaunchAgents/com.jaredmoskowitz.sync-commits.plist

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

API_BASE="${1:-https://jaredmoskowitz.com}"
LOG="$PROJECT_DIR/scripts/.sync-commits.log"

# Pull READING_SECRET out of .env.local without sourcing the whole file.
SECRET="$(grep -E '^READING_SECRET=' .env.local | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
if [[ -z "${SECRET:-}" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: READING_SECRET not found in .env.local" >> "$LOG"
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting commit sync to $API_BASE" >> "$LOG"
READING_SECRET="$SECRET" bash "$PROJECT_DIR/scripts/backfill-commits.sh" "$API_BASE" >> "$LOG" 2>&1
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done" >> "$LOG"

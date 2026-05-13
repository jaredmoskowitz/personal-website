#!/usr/bin/env bash
# backfill-commits.sh — scan local git repos and upload commit history.
#
# Usage:
#   READING_SECRET=<your-secret> ./scripts/backfill-commits.sh [API_BASE_URL]
#
# API_BASE_URL defaults to http://localhost:3000 (run `npm run dev` first).
# For production: READING_SECRET=... ./scripts/backfill-commits.sh https://jaredmoskowitz.com
#
# Add more repo paths to REPOS below.

set -euo pipefail

API_BASE="${1:-http://localhost:3000}"
ENDPOINT="${API_BASE}/api/commits/backfill"

if [[ -z "${READING_SECRET:-}" ]]; then
  echo "Error: READING_SECRET env var required" >&2
  exit 1
fi

# ── Repos to scan ──────────────────────────────────────────────────────────
REPOS=(
  # Format: "owner/repo-name:/absolute/path/to/repo"
  "VeryLegit/vault:$HOME/workspace/vault"
  "jaredmoskowitz/nl-native:$HOME/workspace/nl-native"
  "jaredmoskowitz/swipeclean:$HOME/workspace/swipeclean"
  "VeryLegit/predickt:$HOME/workspace/predickt"
  "jaredmoskowitz/imessage-mcp:$HOME/workspace/imessage-mcp"
  "jaredmoskowitz/write-like-you-skill:$HOME/workspace/write-like-you-skill"
  "btj-ventures/BTJ:$HOME/workspace/BTJ"
  "jaredmoskowitz/meta-engine:$HOME/workspace/meta-engine"
  "jaredmoskowitz/overtone:$HOME/workspace/overtone"
  "VeryLegit/expert:$HOME/workspace/expert"
  "jaredmoskowitz/love-text-bot:$HOME/workspace/love-text-bot"
  "jaredmoskowitz/work-with-jared:$HOME/workspace/work-with-jared"
  "jaredmoskowitz/personal-website:$HOME/workspace/personal-website"
)

COMMITS_JSON="["
FIRST=1

for entry in "${REPOS[@]}"; do
  REPO_SLUG="${entry%%:*}"
  REPO_PATH="${entry#*:}"

  if [[ ! -d "$REPO_PATH/.git" ]]; then
    echo "Skipping $REPO_SLUG — not found at $REPO_PATH"
    continue
  fi

  echo "Scanning $REPO_SLUG at $REPO_PATH..."

  while IFS=$'\t' read -r sha date msg; do
    # Escape for JSON
    msg_escaped=$(printf '%s' "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g' | head -c 80)
    entry_json="{\"repo\":\"$REPO_SLUG\",\"sha\":\"$sha\",\"date\":\"$date\",\"msg\":\"$msg_escaped\"}"
    if [[ $FIRST -eq 1 ]]; then
      COMMITS_JSON+="$entry_json"
      FIRST=0
    else
      COMMITS_JSON+=",$entry_json"
    fi
  done < <(
    git -C "$REPO_PATH" log \
      --author="Jared" \
      --format=$'%H\t%aI\t%s' \
      --since="1 year ago" \
      2>/dev/null
  )
done

COMMITS_JSON+="]"

COMMIT_COUNT=$(echo "$COMMITS_JSON" | grep -o '"sha"' | wc -l | tr -d ' ')
echo "Uploading $COMMIT_COUNT commits to $ENDPOINT..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $READING_SECRET" \
  -d "{\"commits\":$COMMITS_JSON}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "Done: $BODY"
else
  echo "Error $HTTP_CODE: $BODY" >&2
  exit 1
fi

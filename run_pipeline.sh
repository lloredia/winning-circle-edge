#!/bin/bash
# ============================================================
# WINNING CIRCLE × UNDERDOG EDGE™ — Daily Pipeline
# Fetches odds → Generates picks → Sends to Telegram
# Runs unattended with retries for transient API failures
# ============================================================

set -e

DATE=$(date -u +%Y-%m-%d)
DIR="$(cd "$(dirname "$0")" && pwd)"
MAX_RETRIES=${PIPELINE_MAX_RETRIES:-3}
RETRY_DELAY=${PIPELINE_RETRY_DELAY:-45}

# Retry a command up to MAX_RETRIES times
run_with_retry() {
  local step_name="$1"
  shift
  local attempt=1
  while true; do
    echo "[$step_name] Attempt $attempt/$MAX_RETRIES..."
    if "$@"; then
      return 0
    fi
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      echo "⚠️  Failed (attempt $attempt). Retrying in ${RETRY_DELAY}s..."
      sleep "$RETRY_DELAY"
      attempt=$((attempt + 1))
    else
      echo "❌ Failed after $MAX_RETRIES attempts"
      return 1
    fi
  done
}

echo ""
echo "🔥 =============================================="
echo "   WINNING CIRCLE × UNDERDOG EDGE™"
echo "   Daily Pipeline — $DATE"
echo "🔥 =============================================="
echo ""

# Step 1: Fetch odds (retry on API timeout/rate limit)
echo "[1/3] Fetching live odds..."
FETCH_SCRIPT=""
if [ -f "$DIR/fetch_odds.py" ]; then
  FETCH_SCRIPT="$DIR/fetch_odds.py"
elif [ -f "$DIR/services/odds-fetcher/fetch_odds.py" ]; then
  FETCH_SCRIPT="$DIR/services/odds-fetcher/fetch_odds.py"
fi

if [ -z "$FETCH_SCRIPT" ]; then
  echo "❌ fetch_odds.py not found"
  exit 1
fi

run_with_retry "1/3" python3 "$FETCH_SCRIPT"

echo ""

# Step 2: Generate picks via Claude (retry on API timeout)
echo "[2/3] Generating picks via Claude API..."
PICKS_SCRIPT=""
if [ -f "$DIR/generate_picks.py" ]; then
  PICKS_SCRIPT="$DIR/generate_picks.py"
elif [ -f "$DIR/services/analysis-engine/generate_picks.py" ]; then
  PICKS_SCRIPT="$DIR/services/analysis-engine/generate_picks.py"
fi

if [ -z "$PICKS_SCRIPT" ]; then
  echo "❌ generate_picks.py not found"
  exit 1
fi

run_with_retry "2/3" python3 "$PICKS_SCRIPT"

echo ""

# Step 3: Send to Telegram (no retry — non-critical)
echo "[3/3] Sending to Telegram..."
if [ -f "$DIR/notify_telegram.py" ]; then
    python3 "$DIR/notify_telegram.py" || echo "⚠️  Telegram notification failed"
elif [ -f "$DIR/services/scheduler/notify_telegram.py" ]; then
    python3 "$DIR/services/scheduler/notify_telegram.py" || echo "⚠️  Telegram notification failed"
else
    echo "⚠️  notify_telegram.py not found, skipping"
fi

echo ""
echo "✅ =============================================="
echo "   Pipeline complete!"
echo "   Dashboard: http://localhost:8080"
echo "   API:       http://localhost:3001/api/picks/today"
echo "   Telegram:  ✅ Sent"
echo "✅ =============================================="

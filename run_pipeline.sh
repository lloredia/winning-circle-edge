#!/bin/bash
# ============================================================
# WINNING CIRCLE × UNDERDOG EDGE™ — Daily Pipeline
# Fetches odds → Generates picks → Ready for dashboard
# ============================================================

set -e

DATE=$(date -u +%Y-%m-%d)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🔥 =============================================="
echo "   WINNING CIRCLE × UNDERDOG EDGE™"
echo "   Daily Pipeline — $DATE"
echo "🔥 =============================================="
echo ""

# Step 1: Fetch odds
echo "[1/2] Fetching live odds..."
python3 "$SCRIPT_DIR/services/odds-fetcher/fetch_odds.py"

# Check if odds file was created
if [ ! -f "$SCRIPT_DIR/data/odds/$DATE.json" ]; then
    # Try local data dir
    if [ ! -f "./data/odds/$DATE.json" ]; then
        echo "❌ No odds file generated. Aborting."
        exit 1
    fi
fi

echo ""

# Step 2: Generate picks via Claude
echo "[2/2] Generating picks via Claude API..."
python3 "$SCRIPT_DIR/services/analysis-engine/generate_picks.py"

echo ""
echo "✅ =============================================="
echo "   Pipeline complete!"
echo "   Dashboard: http://localhost:5173"
echo "   API:       http://localhost:3001/api/picks/today"
echo "✅ =============================================="

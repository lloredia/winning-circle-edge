#!/bin/bash
# Start the Winning Circle stack. Used by launchd/systemd for auto-start on boot.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# Load .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

docker compose up -d
echo "✅ Winning Circle stack started"

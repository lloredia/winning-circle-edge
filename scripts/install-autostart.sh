#!/bin/bash
# Install auto-start so the stack runs without manual intervention.
# macOS: Uses launchd (runs on login)
# Linux: Uses systemd (runs on boot)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Detect Raspberry Pi
IS_RASPBERRY_PI=false
if [ -f /proc/device-tree/model ] && grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
  IS_RASPBERRY_PI=true
fi

case "$(uname -s)" in
  Darwin)
    echo "📱 macOS detected — installing LaunchAgent (runs on login)"
    PLIST_SRC="$SCRIPT_DIR/com.winningcircle.edge.plist"
    PLIST_DEST="$HOME/Library/LaunchAgents/com.winningcircle.edge.plist"

    # Replace placeholder with actual project path
    sed "s|PROJECT_DIR_PLACEHOLDER|$PROJECT_DIR|g" "$PLIST_SRC" > "$PLIST_DEST"

    launchctl unload "$PLIST_DEST" 2>/dev/null || true
    launchctl load "$PLIST_DEST"

    echo "✅ Installed. Stack will start when you log in."
    echo "   To start now: launchctl start com.winningcircle.edge"
    echo "   To disable:   launchctl unload $PLIST_DEST"
    ;;
  Linux)
    echo "🐧 Linux detected — installing systemd service"
    SERVICE_FILE="$SCRIPT_DIR/winning-circle-edge.service"

    # Create service file with correct project path
    sed "s|WorkingDirectory=.*|WorkingDirectory=$PROJECT_DIR|" "$SERVICE_FILE" > /tmp/winning-circle-edge.service

    # Use Pi compose file on Raspberry Pi
    if [ "$IS_RASPBERRY_PI" = true ]; then
      sed -i 's|docker compose up -d|docker compose -f docker-compose.yml -f docker-compose.raspberrypi.yml up -d|' /tmp/winning-circle-edge.service
      echo "   (Using Raspberry Pi compose config)"
    fi

    sudo cp /tmp/winning-circle-edge.service /etc/systemd/system/winning-circle-edge.service
    sudo systemctl daemon-reload
    sudo systemctl enable winning-circle-edge
    sudo systemctl start winning-circle-edge

    echo "✅ Installed. Stack will start on boot."
    echo "   Status: sudo systemctl status winning-circle-edge"
    echo "   Logs:   journalctl -u winning-circle-edge -f"
    ;;
  *)
    echo "❌ Unsupported OS. Run manually: cd $PROJECT_DIR && docker compose up -d"
    exit 1
    ;;
esac

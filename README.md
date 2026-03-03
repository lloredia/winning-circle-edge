# Winning Circle × UNDERDOG EDGE™

Elite sports betting analytics pipeline that fetches live odds, generates AI-powered parlay picks via Claude, and delivers them to a React dashboard and Telegram.

## Architecture

```
Odds API → fetch_odds.py → odds JSON
                              ↓
                    generate_picks.py (Claude)
                              ↓
                    picks JSON → API Server → React Dashboard
                              ↓
                    notify_telegram.py → Telegram
```

## Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your API keys (Odds API, Anthropic, Telegram)
```

### 2. Run with Docker

```bash
docker compose up -d
```

- **Dashboard**: http://localhost:8080
- **API**: http://localhost:3001
- **Pipeline**: Runs daily at 10 AM CT (and once on startup)

### 3. Run Without Intervention (Auto-Start on Boot)

To have the stack start automatically after reboot/login:

```bash
./scripts/install-autostart.sh
```

- **macOS**: Installs a LaunchAgent — stack starts when you log in
- **Linux**: Installs a systemd service — stack starts on boot

The pipeline also retries failed API calls (3 attempts, 45s delay) to handle transient network/rate-limit issues.

### 4. Run Locally (Development)

```bash
# Fetch odds
DATA_DIR=./data python3 services/odds-fetcher/fetch_odds.py

# Generate picks (requires ANTHROPIC_API_KEY)
DATA_DIR=./data python3 services/analysis-engine/generate_picks.py

# Start API
DATA_DIR=./data node services/api-server/server.js

# Start frontend
cd frontend && npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ODDS_API_KEY` | Yes | [The Odds API](https://the-odds-api.com) key |
| `ANTHROPIC_API_KEY` | Yes | [Anthropic](https://console.anthropic.com) API key |
| `SPORTS` | No | Comma-separated sport keys (default: `basketball_nba,basketball_ncaab,soccer_epl`) |
| `TELEGRAM_BOT_TOKEN` | For notifications | Telegram bot token |
| `TELEGRAM_CHAT_ID` | For notifications | Telegram chat/group ID |
| `DASHBOARD_URL` | For Telegram link | Public URL of your dashboard |
| `TZ` | No | Timezone for scheduler (default: `America/Chicago`) |
| `PIPELINE_MAX_RETRIES` | No | Retries for fetch/generate steps (default: 3) |
| `PIPELINE_RETRY_DELAY` | No | Seconds between retries (default: 45) |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/picks/today` | Today's generated picks |
| `GET /api/picks/:date` | Picks for a specific date (YYYY-MM-DD) |
| `GET /api/odds/today` | Today's raw odds data |
| `GET /api/history` | List of available pick dates |
| `GET /api/health` | Health check |

## Frontend Config

To point the dashboard at a custom API URL (e.g. when deploying):

```bash
# Build with custom API URL
VITE_API_URL=https://your-api.com npm run build
```

Or set `VITE_API_URL` in your environment before building.

## Raspberry Pi

See **[RASPBERRY_PI.md](RASPBERRY_PI.md)** for full setup. Quick version:

```bash
# On your Pi
cd winning-circle-edge
cp .env.example .env && nano .env   # Add API keys
docker compose -f docker-compose.yml -f docker-compose.raspberrypi.yml up -d --build
./scripts/install-autostart.sh     # Auto-start on boot
```

Access from any device on your network: `http://YOUR_PI_IP:8080`

## Data Layout

```
data/
├── odds/       # Raw odds by date (YYYY-MM-DD.json)
├── picks/      # Generated picks by date
└── history/    # Historical picks archive
```

## License

Proprietary — Winning Circle / LESLEADS Consulting

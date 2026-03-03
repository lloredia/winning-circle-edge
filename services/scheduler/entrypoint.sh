#!/bin/bash
set -e

echo "🔥 WINNING CIRCLE Scheduler starting..."
echo "   Timezone: $TZ"
echo "   Sports: $SPORTS"

# Write environment variables to a file so cron can access them
printenv | grep -E '^(ODDS_API_KEY|ANTHROPIC_API_KEY|SPORTS|DATA_DIR|TZ|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|DASHBOARD_URL|PIPELINE_MAX_RETRIES|PIPELINE_RETRY_DELAY)=' > /app/.env.cron

# Create the cron job — runs daily at 10:00 AM (in container timezone)
echo "0 10 * * * cd /app && export \$(cat /app/.env.cron | xargs) && /bin/bash /app/run_pipeline.sh >> /var/log/edge.log 2>&1" > /etc/cron.d/edge-cron
echo "" >> /etc/cron.d/edge-cron

chmod 0644 /etc/cron.d/edge-cron
crontab /etc/cron.d/edge-cron

# Create log file
touch /var/log/edge.log

echo "✅ Cron job scheduled: 10:00 AM daily"
echo "   Logs: /var/log/edge.log"
echo ""

# Run pipeline once on startup so we have today's picks
echo "🚀 Running initial pipeline..."
cd /app
export $(cat /app/.env.cron | xargs)
/bin/bash /app/run_pipeline.sh || echo "⚠️  Initial run had issues, check logs"

echo ""
echo "🕐 Scheduler running. Waiting for next cron trigger..."

# Start cron and tail logs
cron
tail -f /var/log/edge.log

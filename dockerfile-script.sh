#!/bin/bash
# Run from ~/winning-circle-edge/
cd ~/winning-circle-edge

# ===== 1. API Server Dockerfile =====
cat > services/api-server/Dockerfile << 'EOF'
FROM node:20-slim
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.js .
EXPOSE 3001
CMD ["node", "server.js"]
EOF

# ===== 2. Frontend Dockerfile =====
cat > frontend/Dockerfile << 'EOF'
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
EOF

# ===== 3. Odds Fetcher Dockerfile =====
cat > services/odds-fetcher/Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY fetch_odds.py .
CMD ["python", "fetch_odds.py"]
EOF

# ===== 4. Analysis Engine — requirements.txt =====
cat > services/analysis-engine/requirements.txt << 'EOF'
anthropic>=0.40.0
EOF

# ===== 5. Analysis Engine Dockerfile =====
cat > services/analysis-engine/Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY generate_picks.py .
CMD ["python", "generate_picks.py"]
EOF

# ===== 6. Scheduler Dockerfile =====
mkdir -p services/scheduler

cat > services/scheduler/Dockerfile << 'EOF'
FROM python:3.11-slim

RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies for both services
RUN pip install --no-cache-dir requests anthropic>=0.40.0

# Copy service scripts
COPY services/odds-fetcher/fetch_odds.py /app/fetch_odds.py
COPY services/analysis-engine/generate_picks.py /app/generate_picks.py
COPY run_pipeline.sh /app/run_pipeline.sh
COPY services/scheduler/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/run_pipeline.sh /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
EOF

# ===== 7. Scheduler entrypoint =====
cat > services/scheduler/entrypoint.sh << 'ENTRYEOF'
#!/bin/bash
set -e

echo "🔥 WINNING CIRCLE Scheduler starting..."
echo "   Timezone: $TZ"
echo "   Sports: $SPORTS"

# Write environment variables to a file so cron can access them
printenv | grep -E '^(ODDS_API_KEY|ANTHROPIC_API_KEY|SPORTS|DATA_DIR|TZ)=' > /app/.env.cron

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
ENTRYEOF

chmod +x services/scheduler/entrypoint.sh
chmod +x run_pipeline.sh

echo ""
echo "✅ All Dockerfiles created!"
echo ""
echo "=== READY TO LAUNCH ==="
echo "Run: docker compose up --build"
echo ""
echo "This will:"
echo "  1. Build all 3 containers"
echo "  2. Run today's pipeline immediately"
echo "  3. Schedule daily runs at 10 AM CT"
echo "  4. Serve dashboard at http://localhost:8080"
echo "  5. Serve API at http://localhost:3001"

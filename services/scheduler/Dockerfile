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

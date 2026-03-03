FROM python:3.11-slim

RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir requests anthropic>=0.40.0

COPY services/odds-fetcher/fetch_odds.py /app/fetch_odds.py
COPY services/analysis-engine/generate_picks.py /app/generate_picks.py
COPY services/scheduler/notify_telegram.py /app/notify_telegram.py
COPY services/scheduler/notify_discord.py /app/notify_discord.py
COPY services/scheduler/alert_pipeline_failure.py /app/alert_pipeline_failure.py
COPY run_pipeline.sh /app/run_pipeline.sh
COPY services/scheduler/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/run_pipeline.sh /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]

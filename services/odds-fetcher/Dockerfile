FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY fetch_odds.py .
CMD ["python", "fetch_odds.py"]

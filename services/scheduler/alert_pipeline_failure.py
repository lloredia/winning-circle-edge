"""Send Telegram alert when pipeline fails."""
import os
import requests
from datetime import datetime, timezone

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")


def main():
    if not BOT_TOKEN or not CHAT_ID:
        return
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    msg = (
        f"🚨 <b>WINNING CIRCLE Pipeline Failed</b>\n\n"
        f"📅 Date: {date}\n"
        f"The daily picks pipeline did not complete. Check logs for details."
    )
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    requests.post(url, json={"chat_id": CHAT_ID, "text": msg, "parse_mode": "HTML"}, timeout=10)


if __name__ == "__main__":
    main()

import os
import json
import sys
import requests
from datetime import datetime, timezone

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
DATA_DIR = os.environ.get("DATA_DIR", "/app/data")
DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "")


def send_telegram(text):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    resp = requests.post(url, json={
        "chat_id": CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    })
    if resp.status_code == 200:
        print("✅ Telegram message sent!")
    else:
        print(f"❌ Telegram error: {resp.status_code} — {resp.text}")
    return resp


def format_picks_message(picks):
    legs = picks.get("legs", [])
    date = picks.get("date", "Today")

    total_decimal = 1
    for l in legs:
        total_decimal *= l.get("decimal", 1)

    american = int((total_decimal - 1) * 100)
    payout = 10 * total_decimal
    implied = (1 / total_decimal) * 100

    risk_emoji = {
        "LOW": "🟢", "LOW-MEDIUM": "🟡", "MEDIUM": "🟠",
        "MEDIUM-HIGH": "🔶", "HIGH": "🔴"
    }

    msg = f"🔥 <b>WINNING CIRCLE × UNDERDOG EDGE™</b>\n"
    msg += f"📅 <b>{date}</b>\n"
    msg += f"━━━━━━━━━━━━━━━━━━━━━\n\n"

    msg += f"📊 <b>{len(legs)}-Leg Parlay</b>\n"
    msg += f"💰 Odds: <b>+{american}</b>\n"
    msg += f"💵 $10 → <b>${payout:,.2f}</b>\n"
    msg += f"📉 Implied: <b>{implied:.4f}%</b>\n\n"
    msg += f"━━━━━━━━━━━━━━━━━━━━━\n\n"

    current_sport = None
    for l in legs:
        sport = l.get("type", "")
        if sport != current_sport:
            current_sport = sport
            sport_labels = {
                "EPL": "⚽ PREMIER LEAGUE",
                "NBA": "🏀 NBA",
                "NCAAB": "🎓 COLLEGE BASKETBALL",
                "NHL": "🏒 NHL"
            }
            msg += f"<b>{sport_labels.get(sport, sport)}</b>\n\n"

        emoji = risk_emoji.get(l.get("risk", ""), "⚪")
        msg += f"{l.get('icon', '🎯')} <b>{l.get('pick', '?')}</b>\n"
        msg += f"    {l.get('game', '?')}\n"
        msg += f"    ⏰ {l.get('time', '?')}\n"
        msg += f"    📈 <b>{l.get('odds', '?')}</b> ({l.get('implied', '?')}) {emoji} {l.get('risk', '?')}\n"
        msg += f"    🎯 {l.get('edge', 'N/A')}\n\n"

    msg += f"━━━━━━━━━━━━━━━━━━━━━\n"
    if DASHBOARD_URL:
        msg += f"📊 <a href='{DASHBOARD_URL}'>View Full Dashboard</a>\n\n"

    msg += f"⚠️ <i>Longshot parlay — for entertainment only.</i>\n"
    msg += f"<i>Verify live lines before wagering. 21+</i>\n"
    msg += f"<i>Problem? Call 1-800-GAMBLER</i>"

    return msg


def main():
    if not BOT_TOKEN or not CHAT_ID:
        print("⚠️  TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set. Skipping notification.")
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if len(sys.argv) > 1:
        today = sys.argv[1]

    picks_path = f"{DATA_DIR}/picks/{today}.json"

    if not os.path.exists(picks_path):
        print(f"❌ No picks file found at {picks_path}")
        return

    with open(picks_path, "r") as f:
        picks = json.load(f)

    print(f"📲 Sending picks to Telegram...")
    msg = format_picks_message(picks)

    # Telegram has a 4096 char limit — split if needed
    if len(msg) <= 4096:
        send_telegram(msg)
    else:
        # Send header + first half
        midpoint = msg.rfind("\n\n", 0, 4000)
        send_telegram(msg[:midpoint])
        send_telegram(msg[midpoint:])


if __name__ == "__main__":
    main()

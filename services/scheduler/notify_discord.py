import os
import json
import sys
import requests
from datetime import datetime, timezone

WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL")
DATA_DIR = os.environ.get("DATA_DIR", "/app/data")


def send_discord(content, embeds=None):
    if not WEBHOOK_URL:
        return None
    payload = {"content": content[:2000]}
    if embeds:
        payload["embeds"] = embeds
    resp = requests.post(WEBHOOK_URL, json=payload, timeout=10)
    if resp.status_code in (200, 204):
        print("✅ Discord message sent!")
    else:
        print(f"❌ Discord error: {resp.status_code} — {resp.text}")
    return resp


def format_picks_embed(picks):
    legs = picks.get("legs", [])
    date = picks.get("date", "Today")
    total_decimal = 1
    for l in legs:
        total_decimal *= l.get("decimal", 1)
    american = int((total_decimal - 1) * 100)
    payout = 10 * total_decimal
    implied = (1 / total_decimal) * 100

    lines = []
    for l in legs[:10]:
        lines.append(f"• **{l.get('pick', '?')}** ({l.get('odds', '?')}) — {l.get('game', '?')}")
    if len(legs) > 10:
        lines.append(f"_...and {len(legs) - 10} more_")

    return [{
        "title": f"🔥 UNDERDOG EDGE™ — {date}",
        "description": f"**{len(legs)}-Leg Parlay** | +{american} | $10 → ${payout:,.2f} | Implied: {implied:.4f}%",
        "color": 0xfbbf24,
        "fields": [{"name": "Picks", "value": "\n".join(lines), "inline": False}],
        "footer": {"text": "For entertainment only. 21+ | 1-800-GAMBLER"},
    }]


def main():
    if not WEBHOOK_URL:
        print("⚠️  DISCORD_WEBHOOK_URL not set. Skipping.")
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if len(sys.argv) > 1:
        today = sys.argv[1]

    picks_path = f"{DATA_DIR}/picks/{today}.json"
    if not os.path.exists(picks_path):
        print(f"❌ No picks at {picks_path}")
        return

    with open(picks_path, "r") as f:
        picks = json.load(f)

    print("📲 Sending to Discord...")
    send_discord(f"**WINNING CIRCLE × UNDERDOG EDGE™** — {today}", format_picks_embed(picks))


if __name__ == "__main__":
    main()

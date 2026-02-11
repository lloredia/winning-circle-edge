import os
import json
import sys
from datetime import datetime, timezone

try:
    import anthropic
except ImportError:
    print("❌ Missing dependency. Run: pip3 install anthropic")
    sys.exit(1)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
DATA_DIR = os.environ.get("DATA_DIR", "/app/data")

SYSTEM_PROMPT = """You are UNDERDOG EDGE™, an elite sports betting analytics engine 
built by the Winning Circle team (LESLEADS Consulting). Your job is to analyze 
today's odds data and generate a 7-10 leg longshot parlay with detailed rationale.

RULES:
1. Every leg must be an UNDERDOG moneyline OR a high-confidence total (over/under).
2. Mix sports: Include legs from ALL provided leagues when available.
3. For each leg provide ALL fields in the schema below — no missing fields.
4. Include 1-2 "banker" legs (LOW risk, high implied probability like totals).
5. Include 2-3 "moonshot" legs (MEDIUM-HIGH risk, +200 or higher underdogs).
6. The remaining legs should be MEDIUM risk value plays.
7. For rationale: Write 3-5 sentences with specific reasoning about WHY this 
   underdog or total has value. Mention home/away splits, recent form, matchup 
   dynamics, injuries if known, and historical trends.
8. For edge: One sentence summarizing the core betting edge.
9. For alt: Provide a safer alternative bet on the same game.
10. Sort legs by sport: EPL first, then NBA, then NCAAB, then NHL.

OUTPUT FORMAT:
Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.

SCHEMA:
{
  "date": "YYYY-MM-DD",
  "generated_at": "ISO timestamp",
  "total_legs": 8,
  "legs": [
    {
      "leg": 1,
      "type": "NBA",
      "icon": "🏀",
      "game": "Away Team @ Home Team",
      "time": "7:00 PM ET",
      "pick": "Team Name ML",
      "odds": "+250",
      "decimal": 3.50,
      "implied": "28.6%",
      "spread": "HOM -5.5",
      "ou": "O/U 220.5",
      "rationale": "Detailed 3-5 sentence analysis...",
      "risk": "MEDIUM",
      "edge": "One sentence edge summary",
      "alt": "Team +5.5 (-110) for safer play"
    }
  ]
}

RISK RATINGS:
- LOW: Banker legs, implied prob > 50% (usually totals)
- LOW-MEDIUM: Slight underdogs, +100 to +150 range
- MEDIUM: Standard underdogs, +150 to +250
- MEDIUM-HIGH: Longshots, +250 to +400
- HIGH: Moonshots, +400 and above

SPORT ICONS:
- NBA: 🏀
- NCAAB: 🎓  
- EPL: ⚽
- NHL: 🏒
- MLS: ⚽
- La Liga: ⚽"""


def load_odds(date_str):
    path = f"{DATA_DIR}/odds/{date_str}.json"
    if not os.path.exists(path):
        print(f"❌ No odds file found at {path}")
        print(f"   Run the odds fetcher first.")
        return None
    with open(path, "r") as f:
        return json.load(f)


def format_odds_for_prompt(odds_data):
    lines = []
    lines.append(f"DATE: {odds_data['date']}")
    lines.append(f"TOTAL GAMES: {odds_data['total_games']}")
    lines.append("")

    for g in odds_data["games"]:
        lines.append(f"--- {g['type']} ({g['icon']}) ---")
        lines.append(f"Game: {g['away_team']} @ {g['home_team']}")
        lines.append(f"Start: {g['commence_time']}")
        lines.append(f"Moneyline: {g['home_team']} {g['h2h'].get('home', 'N/A')} | "
                      f"{g['away_team']} {g['h2h'].get('away', 'N/A')}")
        if g['h2h'].get('draw') is not None:
            lines.append(f"Draw: {g['h2h']['draw']}")
        lines.append(f"Underdog: {g.get('underdog', 'N/A')} at "
                      f"{g.get('underdog_odds', 'N/A')} "
                      f"(implied: {g.get('underdog_implied', 'N/A')}%)")
        if g['spreads'].get('home_point'):
            lines.append(f"Spread: {g['home_team']} {g['spreads']['home_point']} "
                          f"({g['spreads']['home']}) | "
                          f"{g['away_team']} {g['spreads']['away_point']} "
                          f"({g['spreads']['away']})")
        if g['totals'].get('point'):
            lines.append(f"Total: O/U {g['totals']['point']} — "
                          f"Over {g['totals']['over']} | Under {g['totals']['under']}")
        lines.append(f"Bookmakers: {g.get('bookmaker_count', 0)}")
        lines.append("")

    return "\n".join(lines)


def generate_picks(odds_data):
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    odds_text = format_odds_for_prompt(odds_data)

    print(f"📡 Sending {odds_data['total_games']} games to Claude API...")
    print(f"   (This may take 15-30 seconds)")

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"""Analyze today's odds and generate the UNDERDOG EDGE™ 
parlay. Output ONLY valid JSON matching the schema — no markdown, no backticks.

TODAY'S ODDS DATA:
{odds_text}

Generate 7-10 legs across all available sports. Focus on value underdogs and 
high-confidence totals. Every leg needs detailed rationale."""
        }]
    )

    raw_text = message.content[0].text.strip()

    # Clean up any markdown formatting Claude might add
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1]
    if raw_text.endswith("```"):
        raw_text = raw_text.rsplit("```", 1)[0]
    raw_text = raw_text.strip()

    try:
        picks = json.loads(raw_text)
    except json.JSONDecodeError as e:
        print(f"⚠️  JSON parse error: {e}")
        print(f"   Raw response (first 500 chars):")
        print(f"   {raw_text[:500]}")
        # Save raw response for debugging
        debug_path = f"{DATA_DIR}/picks/debug-{odds_data['date']}.txt"
        with open(debug_path, "w") as f:
            f.write(raw_text)
        print(f"   Full response saved to {debug_path}")
        return None

    # Add metadata
    picks["generated_at"] = datetime.now(timezone.utc).isoformat()
    picks["source_games"] = odds_data["total_games"]
    picks["model"] = "claude-sonnet-4-20250514"

    usage = message.usage
    print(f"   Token usage: {usage.input_tokens} in / {usage.output_tokens} out")

    return picks


def save_picks(picks, date_str):
    os.makedirs(f"{DATA_DIR}/picks", exist_ok=True)
    os.makedirs(f"{DATA_DIR}/history", exist_ok=True)

    picks_path = f"{DATA_DIR}/picks/{date_str}.json"
    history_path = f"{DATA_DIR}/history/{date_str}.json"

    with open(picks_path, "w") as f:
        json.dump(picks, f, indent=2)
    with open(history_path, "w") as f:
        json.dump(picks, f, indent=2)

    return picks_path


def print_summary(picks):
    legs = picks.get("legs", [])
    total_decimal = 1
    for l in legs:
        total_decimal *= l.get("decimal", 1)

    american = int((total_decimal - 1) * 100)
    payout = 10 * total_decimal
    implied = (1 / total_decimal) * 100

    print(f"\n{'=' * 55}")
    print(f"🔥 UNDERDOG EDGE™ — {picks.get('date', 'Today')}")
    print(f"{'=' * 55}")
    print(f"📊 {len(legs)}-Leg Parlay | +{american} | ${payout:.2f} on $10")
    print(f"📉 Implied probability: {implied:.4f}%")
    print(f"{'=' * 55}")

    for l in legs:
        risk_emoji = {"LOW": "🟢", "LOW-MEDIUM": "🟡", "MEDIUM": "🟠",
                      "MEDIUM-HIGH": "🔶", "HIGH": "🔴"}.get(l.get("risk"), "⚪")
        print(f"\n{l.get('icon', '🎯')} Leg {l.get('leg', '?')}: "
              f"{l.get('pick', '?')} ({l.get('odds', '?')}) {risk_emoji}")
        print(f"   {l.get('game', '?')} — {l.get('time', '?')}")
        print(f"   Edge: {l.get('edge', 'N/A')}")

    print(f"\n{'=' * 55}")


def main():
    if not ANTHROPIC_API_KEY:
        print("❌ ERROR: ANTHROPIC_API_KEY not set in environment")
        print("   Add it to your .env file")
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Allow passing a specific date as argument
    if len(sys.argv) > 1:
        today = sys.argv[1]

    print(f"🔥 WINNING CIRCLE × UNDERDOG EDGE™ — Analysis Engine")
    print(f"📅 Date: {today}")
    print(f"{'=' * 50}")

    # Load odds
    odds_data = load_odds(today)
    if not odds_data:
        return

    print(f"📂 Loaded {odds_data['total_games']} games from odds file")

    if odds_data["total_games"] == 0:
        print("⚠️  No games found for today. Nothing to analyze.")
        return

    # Generate picks
    picks = generate_picks(odds_data)
    if not picks:
        print("❌ Failed to generate picks. Check debug file.")
        return

    # Save
    path = save_picks(picks, today)
    print(f"\n✅ Picks saved → {path}")

    # Print summary
    print_summary(picks)

    print(f"\n🎯 Done! Your dashboard can now load: {path}")


if __name__ == "__main__":
    main()

import os
import json
import requests
from datetime import datetime, timezone

API_KEY = os.environ.get("ODDS_API_KEY")
SPORTS_ENV = os.environ.get("SPORTS", "basketball_nba,soccer_epl")
DATA_DIR = os.environ.get("DATA_DIR", "/app/data")

SPORT_MAP = {
    "basketball_nba": {"name": "NBA", "icon": "🏀"},
    "basketball_ncaab": {"name": "NCAAB", "icon": "🎓"},
    "soccer_epl": {"name": "EPL", "icon": "⚽"},
    "icehockey_nhl": {"name": "NHL", "icon": "🏒"},
    "soccer_usa_mls": {"name": "MLS", "icon": "⚽"},
    "soccer_spain_la_liga": {"name": "La Liga", "icon": "⚽"},
    "soccer_italy_serie_a": {"name": "Serie A", "icon": "⚽"},
    "soccer_germany_bundesliga": {"name": "Bundesliga", "icon": "⚽"},
}

BASE_URL = "https://api.the-odds-api.com/v4/sports"


def fetch_sport_odds(sport_key):
    url = f"{BASE_URL}/{sport_key}/odds"
    params = {
        "apiKey": API_KEY,
        "regions": "us",
        "markets": "h2h,spreads,totals",
        "oddsFormat": "american",
        "dateFormat": "iso",
    }

    print(f"  Fetching {sport_key}...")
    resp = requests.get(url, params=params, timeout=30)

    if resp.status_code == 422:
        print(f"  ⚠️  {sport_key}: No games today (422). Skipping.")
        return [], resp.headers

    resp.raise_for_status()

    headers = resp.headers
    remaining = headers.get("x-requests-remaining", "?")
    used = headers.get("x-requests-used", "?")
    print(f"  ✅ {sport_key}: {len(resp.json())} games found")
    print(f"     API usage: {used} used / {remaining} remaining")

    return resp.json(), headers


def parse_odds(raw_games, sport_key):
    info = SPORT_MAP.get(sport_key, {"name": sport_key, "icon": "🎯"})
    parsed = []

    for game in raw_games:
        commence = game.get("commence_time", "")
        home = game.get("home_team", "")
        away = game.get("away_team", "")

        h2h = {"home": None, "away": None, "draw": None}
        spreads = {"home": None, "away": None, "home_point": None, "away_point": None}
        totals = {"over": None, "under": None, "point": None}

        for book in game.get("bookmakers", []):
            for market in book.get("markets", []):
                key = market["key"]
                outcomes = market.get("outcomes", [])

                if key == "h2h":
                    for o in outcomes:
                        if o["name"] == home and (h2h["home"] is None or o["price"] > h2h["home"]):
                            h2h["home"] = o["price"]
                        elif o["name"] == away and (h2h["away"] is None or o["price"] > h2h["away"]):
                            h2h["away"] = o["price"]
                        elif o["name"] == "Draw" and (h2h["draw"] is None or o["price"] > h2h["draw"]):
                            h2h["draw"] = o["price"]

                elif key == "spreads":
                    for o in outcomes:
                        if o["name"] == home and spreads["home"] is None:
                            spreads["home"] = o["price"]
                            spreads["home_point"] = o.get("point")
                        elif o["name"] == away and spreads["away"] is None:
                            spreads["away"] = o["price"]
                            spreads["away_point"] = o.get("point")

                elif key == "totals":
                    for o in outcomes:
                        if o["name"] == "Over" and totals["over"] is None:
                            totals["over"] = o["price"]
                            totals["point"] = o.get("point")
                        elif o["name"] == "Under" and totals["under"] is None:
                            totals["under"] = o["price"]

        underdog = None
        underdog_odds = None
        favorite = None
        favorite_odds = None

        # Underdog = longest odds (home, away, or Draw for soccer)
        # Favorite = shortest odds among home/away (for 2-way or 3-way)
        candidates = []
        if h2h["home"] is not None:
            candidates.append((home, h2h["home"]))
        if h2h["away"] is not None:
            candidates.append((away, h2h["away"]))
        if h2h["draw"] is not None:
            candidates.append(("Draw", h2h["draw"]))

        if candidates:
            by_odds = sorted(candidates, key=lambda x: (x[1] or 0), reverse=True)
            underdog, underdog_odds = by_odds[0]
            # Favorite = shortest odds among home/away only (exclude Draw)
            team_odds = [(n, o) for n, o in candidates if n in (home, away) and o is not None]
            if team_odds:
                team_odds.sort(key=lambda x: x[1])
                favorite, favorite_odds = team_odds[0]

        parsed.append({
            "sport_key": sport_key,
            "type": info["name"],
            "icon": info["icon"],
            "game_id": game.get("id"),
            "commence_time": commence,
            "home_team": home,
            "away_team": away,
            "underdog": underdog,
            "underdog_odds": underdog_odds,
            "favorite": favorite,
            "favorite_odds": favorite_odds,
            "h2h": h2h,
            "spreads": spreads,
            "totals": totals,
            "bookmaker_count": len(game.get("bookmakers", [])),
        })

    return parsed


def american_to_decimal(american):
    if american is None:
        return None
    if american > 0:
        return round(1 + (american / 100), 4)
    else:
        return round(1 + (100 / abs(american)), 4)


def american_to_implied(american):
    if american is None:
        return None
    if american > 0:
        return round(100 / (american + 100) * 100, 2)
    else:
        return round(abs(american) / (abs(american) + 100) * 100, 2)


def enrich_games(parsed_games):
    for g in parsed_games:
        g["underdog_decimal"] = american_to_decimal(g["underdog_odds"])
        g["underdog_implied"] = american_to_implied(g["underdog_odds"])
        g["favorite_decimal"] = american_to_decimal(g["favorite_odds"])
        g["favorite_implied"] = american_to_implied(g["favorite_odds"])

        if g["totals"]["point"]:
            g["total_line"] = g["totals"]["point"]
            g["over_odds"] = g["totals"]["over"]
            g["under_odds"] = g["totals"]["under"]
            g["over_decimal"] = american_to_decimal(g["totals"]["over"])
            g["under_decimal"] = american_to_decimal(g["totals"]["under"])
    return parsed_games


def main():
    if not API_KEY:
        print("❌ ERROR: ODDS_API_KEY not set in environment")
        print("   Add it to your .env file")
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sports = [s.strip() for s in SPORTS_ENV.split(",")]

    print(f"🔥 WINNING CIRCLE × UNDERDOG EDGE™")
    print(f"📅 Date: {today}")
    print(f"📡 Fetching odds for: {', '.join(sports)}")
    print(f"{'=' * 50}")

    all_games = []

    for sport in sports:
        try:
            raw, headers = fetch_sport_odds(sport)
            if raw:
                parsed = parse_odds(raw, sport)
                enriched = enrich_games(parsed)
                all_games.extend(enriched)
        except requests.exceptions.HTTPError as e:
            print(f"  ❌ {sport}: HTTP error — {e}")
        except Exception as e:
            print(f"  ❌ {sport}: Error — {e}")

    todays_games = []
    for g in all_games:
        try:
            game_date = g["commence_time"][:10]
            if game_date == today:
                todays_games.append(g)
        except (KeyError, TypeError):
            todays_games.append(g)

    output = {
        "date": today,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "sports": sports,
        "total_games": len(todays_games),
        "games": todays_games,
    }

    os.makedirs(f"{DATA_DIR}/odds", exist_ok=True)
    output_path = f"{DATA_DIR}/odds/{today}.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"{'=' * 50}")
    print(f"✅ Saved {len(todays_games)} games → {output_path}")

    by_sport = {}
    for g in todays_games:
        by_sport.setdefault(g["type"], []).append(g)

    for sport, games in by_sport.items():
        print(f"\n{games[0]['icon']} {sport}: {len(games)} games")
        for g in games[:5]:
            dog = g.get("underdog", "?")
            odds = g.get("underdog_odds", "?")
            impl = g.get("underdog_implied", "?")
            print(f"   {g['away_team']} @ {g['home_team']}")
            print(f"     Underdog: {dog} ({odds}) — {impl}% implied")

    return output


if __name__ == "__main__":
    main()

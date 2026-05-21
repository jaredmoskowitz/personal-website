#!/usr/bin/env python3
"""
Activity sync script — collects git commits, Chrome articles, Spotify, podcasts,
and AI agent stats, then pushes them to the local (and optionally live) Next.js API.

Usage:
    activity                      # after installing via setup-activity.sh
    python3 scripts/sync.py       # from repo root
"""

from __future__ import annotations

import atexit
import datetime
import glob
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.request
from urllib.parse import urlparse

# ── Config ────────────────────────────────────────────────────────────────────

SCRIPT_DIR   = os.path.dirname(os.path.realpath(__file__))
REPO_ROOT    = os.path.dirname(SCRIPT_DIR)
DATA_DIR     = os.path.join(REPO_ROOT, "data")
STATE_FILE   = os.path.join(DATA_DIR, "sync-state.json")
PENDING_FILE = os.path.join(DATA_DIR, "reading-pending.json")
PID_FILE     = "/tmp/jared-sync.pid"

ENV_FILE  = os.path.join(REPO_ROOT, ".env.local")

def load_env():
    """Load .env.local into os.environ (skip already-set vars)."""
    if not os.path.exists(ENV_FILE):
        return
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            # .env.local sometimes has a literal \n before the closing quote
            if v.endswith("\\n"):
                v = v[:-2]
            if k not in os.environ:
                os.environ[k] = v

load_env()

LOCAL_API = os.environ.get("LOCAL_API_URL", "http://localhost:3000").rstrip("/")
LIVE_API  = os.environ.get("LIVE_API_URL", "").rstrip("/")
SECRET    = os.environ.get("READING_SECRET", "")

REPOS = [
    ("VeryLegit/vault",                       os.path.expanduser("~/workspace/vault")),
    ("jaredmoskowitz/nl-native",              os.path.expanduser("~/workspace/nl-native")),
    ("jaredmoskowitz/swipeclean",             os.path.expanduser("~/workspace/swipeclean")),
    ("VeryLegit/predickt",                    os.path.expanduser("~/workspace/predickt")),
    ("jaredmoskowitz/imessage-mcp",           os.path.expanduser("~/workspace/imessage-mcp")),
    ("jaredmoskowitz/write-like-you-skill",   os.path.expanduser("~/workspace/write-like-you-skill")),
    ("btj-ventures/BTJ",                      os.path.expanduser("~/workspace/BTJ")),
    ("jaredmoskowitz/meta-engine",            os.path.expanduser("~/workspace/meta-engine")),
    ("jaredmoskowitz/overtone",               os.path.expanduser("~/workspace/overtone")),
    ("VeryLegit/expert",                      os.path.expanduser("~/workspace/expert")),
    ("jaredmoskowitz/love-text-bot",          os.path.expanduser("~/workspace/love-text-bot")),
    ("jaredmoskowitz/work-with-jared",        os.path.expanduser("~/workspace/work-with-jared")),
    ("jaredmoskowitz/personal-website",       os.path.expanduser("~/workspace/personal-website")),
    ("jaredmoskowitz/mr-meeseeks",            os.path.expanduser("~/workspace/mr-meeseeks")),
]

CHROME_HISTORY = os.path.expanduser(
    "~/Library/Application Support/Google/Chrome/Default/History"
)
CHROME_TMP = "/tmp/jared-sync-chrome.db"
CHROME_EPOCH_OFFSET = 11644473600

PODCASTS_DB = os.path.expanduser(
    "~/Library/Group Containers/243LU875E5.groups.com.apple.podcasts/Documents/MTLibrary.sqlite"
)
PODCASTS_TMP = "/tmp/jared-sync-podcasts.db"

CURSOR_PROJECTS_DIR    = os.path.expanduser("~/.cursor/projects")
CLAUDE_CODE_PROJECTS_DIR = os.path.expanduser("~/.claude/projects")

# ── PID lock ──────────────────────────────────────────────────────────────────

def acquire_lock():
    if os.path.exists(PID_FILE):
        try:
            pid = int(open(PID_FILE).read().strip())
            result = subprocess.run(["kill", "-0", str(pid)], capture_output=True)
            if result.returncode == 0:
                print(f"sync already running (pid {pid}), skipping")
                sys.exit(0)
        except (ValueError, OSError):
            pass
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))
    atexit.register(lambda: os.unlink(PID_FILE) if os.path.exists(PID_FILE) else None)

# ── State ─────────────────────────────────────────────────────────────────────

def load_state() -> dict:
    try:
        return json.loads(open(STATE_FILE).read())
    except Exception:
        return {}

def save_state(state: dict):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

# ── HTTP / local data helpers ─────────────────────────────────────────────────

def _post_to(base: str, path: str, payload: dict) -> dict:
    url  = f"{base.rstrip('/')}{path}"
    body = json.dumps(payload).encode()
    req  = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    if SECRET:
        req.add_header("Authorization", f"Bearer {SECRET}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  HTTP {e.code} from {base}{path}: {err[:200]}")
        return {}
    except Exception as exc:
        print(f"  Error posting to {base}{path}: {exc}")
        return {}


def post_json(path: str, payload: dict) -> dict:
    """POST to local dev API (for the site) and mirror to LIVE_API when configured."""
    result = _post_to(LOCAL_API, path, payload)
    if LIVE_API and LIVE_API != LOCAL_API:
        live_result = _post_to(LIVE_API, path, payload)
        if not result.get("ok") and live_result.get("ok"):
            result = live_result
    return result


def write_local_json(key: str, data) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, f"{key}.json"), "w") as f:
        json.dump(data, f, indent=2)


def write_local_music(tracks: list[dict]) -> int:
    """Merge tracks into data/music.json (same rules as /api/music)."""
    path = os.path.join(DATA_DIR, "music.json")
    existing: list[dict] = []
    if os.path.exists(path):
        try:
            existing = json.loads(open(path).read())
        except Exception:
            pass
    seen = {f"{t.get('artist')}|{t.get('track')}|{t.get('ts')}" for t in existing}
    new_only = [
        t for t in tracks
        if t.get("artist") and t.get("track") and t.get("ts")
        and f"{t['artist']}|{t['track']}|{t['ts']}" not in seen
    ]
    merged = sorted(
        new_only + existing,
        key=lambda t: t.get("ts", ""),
        reverse=True,
    )[:200]
    write_local_json("music", merged)
    return len(new_only)

# ── Git ───────────────────────────────────────────────────────────────────────

def sync_git(since_iso: str | None) -> int | None:
    """Scan all repos for commits since `since_iso`, POST to /api/commits/backfill.
    Returns None if commits were found but posting failed (so caller won't advance the cursor)."""
    since_arg = ["--since", since_iso] if since_iso else ["--since", "1 year ago"]
    commits = []

    for slug, path in REPOS:
        if not os.path.isdir(os.path.join(path, ".git")):
            continue
        try:
            result = subprocess.run(
                ["git", "-C", path, "log",
                 "--author=Jared", "--format=%H\t%aI\t%s", *since_arg],
                capture_output=True, text=True, timeout=10,
            )
            for line in result.stdout.strip().splitlines():
                parts = line.split("\t", 2)
                if len(parts) < 3:
                    continue
                sha, date, msg = parts
                commits.append({
                    "repo": slug,
                    "sha":  sha[:7],
                    "date": date,
                    "msg":  msg[:80],
                })
        except Exception:
            pass

    if not commits:
        return 0

    res = post_json("/api/commits/backfill", {"commits": commits})
    if "added" not in res:
        return None  # post failed — don't advance the cursor
    return res["added"]

# ── Chrome reading ────────────────────────────────────────────────────────────

BLOCKED_DOMAINS = {
    "google.com", "gmail.com", "mail.google.com", "calendar.google.com", "accounts.google.com",
    "docs.google.com", "drive.google.com", "sheets.google.com", "slides.google.com",
    "meet.google.com", "chat.google.com", "maps.google.com", "photos.google.com",
    "translate.google.com", "news.google.com", "play.google.com",
    "twitter.com", "x.com", "instagram.com", "facebook.com", "threads.net",
    "tiktok.com", "snapchat.com", "discord.com", "slack.com", "app.slack.com",
    "teams.microsoft.com", "zoom.us", "us02web.zoom.us", "whatsapp.com",
    "telegram.org", "signal.org",
    "linkedin.com",
    "amazon.com", "ebay.com", "etsy.com", "shopify.com", "walmart.com",
    "target.com", "bestbuy.com", "wayfair.com", "chewy.com", "zappos.com",
    "nordstrom.com", "macys.com", "gap.com", "nike.com", "adidas.com", "globalblue.com",
    "chase.com", "bankofamerica.com", "wellsfargo.com", "schwab.com",
    "fidelity.com", "vanguard.com", "robinhood.com", "coinbase.com",
    "us.etrade.com", "etrade.com", "atwork.morganstanley.com", "morganstanley.com",
    "qp.riviahealth.com",
    "netflix.com", "disneyplus.com", "hulu.com", "hbomax.com", "max.com",
    "primevideo.com", "peacocktv.com", "paramountplus.com", "appletv.com",
    "twitch.tv", "crunchyroll.com",
    "spotify.com", "music.apple.com", "soundcloud.com", "tidal.com",
    "pandora.com", "last.fm", "api.ffm.to",
    "airbnb.com", "vrbo.com", "booking.com", "expedia.com", "hotels.com",
    "tripadvisor.com", "kayak.com", "delta.com", "united.com", "aa.com",
    "southwest.com", "jetblue.com", "montblancnaturalresort.com", "legoland.com",
    "notion.so", "linear.app", "asana.com", "monday.com", "trello.com",
    "airtable.com", "figma.com", "miro.com", "canva.com", "loom.com",
    "calendly.com", "typeform.com", "surveymonkey.com", "mailchimp.com",
    "auth0.com", "okta.com", "onelogin.com", "duo.com",
    "na2.docusign.net", "docusign.com", "hellosign.com",
    "bing.com", "duckduckgo.com", "yahoo.com",
    "variety.com", "tmz.com", "people.com", "eonline.com", "usmagazine.com",
    "consequence.net", "stereogum.com", "pitchfork.com", "rollingstone.com",
    "pgatour.com", "espn.com", "nba.com", "nfl.com", "mlb.com",
    "bleacherreport.com", "theathletic.com", "cbssports.com", "foxsports.com",
    "qrglawfirm.com", "jasonsconnection.org",
    "glassdoor.com", "indeed.com", "monster.com", "ziprecruiter.com",
    "jackmcdermott.com",
    "connectivitycheck.gstatic.com", "tracking.tldrnewsletter.com",
    "truthsocial.com", "truthsocial.app", "monitor-the-situation.com", "purewow.com",
    "yelp.com", "opentable.com", "doordash.com", "ubereats.com", "grubhub.com",
    "seamless.com", "teamblind.com", "help.kalshi.com",
}

BLOCKED_PATH_PREFIXES = (
    "/login", "/logout", "/signin", "/signup", "/sign-in", "/sign-up",
    "/auth", "/oauth", "/sso", "/saml",
    "/checkout", "/cart", "/order", "/payment", "/billing",
    "/account", "/settings", "/preferences", "/profile",
    "/dashboard", "/admin", "/app/", "/console/",
    "/inbox", "/compose", "/messages", "/notifications",
    "/api/", "/_next/", "/static/", "/assets/",
    "/search?", "/search/",
)

APP_UI_TITLE_PATTERNS = re.compile(
    r"^\s*(loading|redirecting|please\s+wait|access\s+denied|page\s+not\s+found"
    r"|404\s|403\s|500\s|error\s*[-–—|]|success\s*[-–—|]|submit\s+form"
    r"|post\s+attendee|email\s+(start|link\s+expired))",
    re.IGNORECASE,
)

APP_UI_TITLE_SUFFIXES = re.compile(
    r"\|\s*(slack|discord|notion|linear|figma|github|vercel|railway|netlify"
    r"|zoom|teams|gmail|outlook|calendar|drive|sheets|docs"
    r"|netflix|disney\+|hulu|spotify|twitch"
    r"|etrade|e\*trade|robinhood|coinbase|fidelity"
    r"|linkedin|instagram|twitter|facebook|tiktok"
    r"|shopify|amazon|ebay|etsy|target|walmart"
    r"|login|sign\s*in|sign\s*up|register"
    r"|dashboard|settings|profile|account|inbox"
    r"|stripe|paypal|square|venmo|cashapp"
    r"|app\s+store|google\s+play|select\s+plan|loading|redirecting)\s*$",
    re.IGNORECASE,
)

def clean_title(title: str) -> str:
    title = title.strip()
    title = re.sub(r"\s+[-–—]\s+[^-–—]{1,40}$", "", title).strip()
    return title

def is_article(url: str, raw_title: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    hostname = parsed.netloc.lower()
    path = parsed.path

    # Skip local dev servers
    host_only = hostname.split(":")[0]
    if host_only in ("localhost", "127.0.0.1", "0.0.0.0", "::1") or host_only.endswith(".local"):
        return False

    bare = hostname.removeprefix("www.")
    if bare in BLOCKED_DOMAINS or hostname in BLOCKED_DOMAINS:
        return False

    if "linkedin.com" in hostname and "/pulse/" not in path:
        return False

    if "github.com" in hostname and not hostname.endswith(".github.io"):
        parts = [p for p in path.split("/") if p]
        if len(parts) < 3:
            return False
        if "/blob/" in path or "/tree/" in path:
            doc_re = re.compile(r"/(README|CHANGELOG|AGENTS|CLAUDE|CONTRIBUTING|SECURITY)(\.\w+)?$", re.IGNORECASE)
            if not doc_re.search(path):
                return False

    if any(path.startswith(p) for p in BLOCKED_PATH_PREFIXES):
        return False

    title_lower = raw_title.lower().strip()
    if len(title_lower) < 10:
        return False
    if APP_UI_TITLE_PATTERNS.search(raw_title):
        return False
    if APP_UI_TITLE_SUFFIXES.search(raw_title):
        return False

    if "wikipedia.org" in hostname and path.startswith("/wiki/"):
        wiki_good = re.compile(
            r"(algorithm|method|theorem|protocol|language|framework|library"
            r"|architecture|system|network|model|database|compiler|runtime"
            r"|machine learning|artificial intelligence|neural|software|hardware"
            r"|computer|cryptograph|encoding|compression|sorting|search"
            r"|startup|company|corporation|venture|founder|engineer"
            r"|monte carlo|markov|fourier|bayes|gradient|heuristic"
            r"|swift|kotlin|python|javascript|rust|go\b|java\b)",
            re.IGNORECASE,
        )
        if not wiki_good.search(raw_title):
            return False

    if "news.ycombinator.com" in hostname:
        if re.search(r"/(vote|reply|hide|flag|submit|user\?|threads\?|news\?|ask|show|jobs)\b", url):
            return False
        if not path.startswith("/item"):
            return False

    if bare in ("reddit.com", "old.reddit.com") and "/comments/" not in path:
        return False

    if bare in (
        "news.ycombinator.com",
        "reddit.com", "old.reddit.com",
        "en.wikipedia.org", "arxiv.org",
    ):
        return True
    if hostname.endswith(".substack.com") and "/p/" in path:
        return True
    article_path_indicators = (
        "/blog/", "/posts/", "/post/", "/articles/", "/article/",
        "/essay/", "/writing/", "/notes/", "/thoughts/",
        "/news/", "/story/", "/stories/",
        "/research/", "/paper/", "/papers/",
        "/tutorial/", "/tutorials/", "/guide/", "/guides/",
    )
    if any(ind in path.lower() for ind in article_path_indicators):
        return True
    if re.search(r"/20(1[5-9]|2[0-9])/", path):
        return True

    return False

def sync_chrome(since_ts: str | None) -> int:
    """Read Chrome history since since_ts, add new articles to reading-pending.json."""
    if not os.path.exists(CHROME_HISTORY):
        print("  Chrome history not found, skipping")
        return 0

    # Always look back at least 6h so rapid activity runs don't miss visits
    lookback_floor = datetime.datetime.utcnow() - datetime.timedelta(hours=6)
    since_chrome = int((lookback_floor.timestamp() + CHROME_EPOCH_OFFSET) * 1_000_000)
    if since_ts:
        dt = datetime.datetime.fromisoformat(since_ts.replace("Z", "+00:00"))
        unix = dt.timestamp()
        since_chrome = max(since_chrome, int((unix + CHROME_EPOCH_OFFSET) * 1_000_000))

    try:
        shutil.copy2(CHROME_HISTORY, CHROME_TMP)
    except Exception as e:
        print(f"  Cannot copy Chrome history: {e}")
        return 0

    try:
        conn = sqlite3.connect(CHROME_TMP)
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT u.url, u.title, v.visit_time
            FROM visits v
            JOIN urls u ON v.url = u.id
            WHERE v.visit_time > ?
            ORDER BY v.visit_time DESC
            """,
            (since_chrome,),
        )
        rows = cursor.fetchall()
        conn.close()
    except Exception as e:
        print(f"  Chrome DB error: {e}")
        return 0

    # Load existing pending to deduplicate
    existing_pending: list[dict] = []
    if os.path.exists(PENDING_FILE):
        try:
            existing_pending = json.loads(open(PENDING_FILE).read())
        except Exception:
            pass
    existing_titles = {a.get("title", "") for a in existing_pending}

    # Load existing approved to avoid duplication
    approved_file = os.path.join(DATA_DIR, "reading.json")
    approved_titles: set[str] = set()
    if os.path.exists(approved_file):
        try:
            approved = json.loads(open(approved_file).read())
            approved_titles = {a.get("title", "") for a in approved}
        except Exception:
            pass

    scanned = len(rows)
    article_like = 0
    skipped_known = 0
    skipped_filter = 0
    new_articles = []
    for url, raw_title, visit_time in rows:
        if not raw_title:
            continue
        title = clean_title(raw_title)
        if len(title) < 10:
            continue
        if title in existing_titles or title in approved_titles:
            skipped_known += 1
            continue
        if not is_article(url, raw_title):
            skipped_filter += 1
            continue
        article_like += 1

        unix_ts = (visit_time / 1_000_000) - CHROME_EPOCH_OFFSET
        visit_dt = datetime.datetime.utcfromtimestamp(unix_ts)
        date_str = visit_dt.strftime("%b %-d")
        iso_ts   = visit_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        parsed   = urlparse(url)
        hostname = parsed.netloc.lower().removeprefix("www.")
        source   = hostname.split(".")[0].capitalize()

        article = {
            "title":  title,
            "source": source,
            "url":    url,
            "date":   date_str,
            "ts":     iso_ts,
        }
        new_articles.append(article)
        existing_titles.add(title)

    if new_articles:
        updated = new_articles + existing_pending
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(PENDING_FILE, "w") as f:
            json.dump(updated, f, indent=2)

    pending_total = len(existing_pending) + len(new_articles)
    print(
        f"  scanned {scanned} visits · {article_like} new article-like · "
        f"{skipped_known} already queued · {skipped_filter} filtered · "
        f"{pending_total} total pending"
    )

    return len(new_articles)

# ── Spotify ───────────────────────────────────────────────────────────────────

def sync_spotify(since_ts: str | None) -> int:
    """Fetch recently played Spotify tracks, POST to /api/music."""
    client_id     = os.environ.get("SPOTIFY_CLIENT_ID", "")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET", "")
    refresh_token = os.environ.get("SPOTIFY_REFRESH_TOKEN", "")

    if not all([client_id, client_secret, refresh_token]):
        print("  Spotify creds not configured (run scripts/spotify-auth.py first), skipping")
        return 0

    # Exchange refresh token for access token
    import base64
    creds    = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    token_body = urllib.parse.urlencode({"grant_type": "refresh_token", "refresh_token": refresh_token}).encode()
    token_req  = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=token_body,
        headers={"Authorization": f"Basic {creds}", "Content-Type": "application/x-www-form-urlencoded"},
    )

    try:
        with urllib.request.urlopen(token_req, timeout=15) as resp:
            token_data  = json.loads(resp.read())
            access_token = token_data.get("access_token", "")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        try:
            err_json = json.loads(err_body)
            err_code = err_json.get("error", "")
            err_desc = err_json.get("error_description", err_body[:200])
        except json.JSONDecodeError:
            err_code, err_desc = "", err_body[:200]
        print(f"  Spotify token refresh failed: HTTP {e.code} — {err_desc}")
        if err_code == "invalid_client":
            print("  Check SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET in .env.local (or re-run scripts/spotify-auth.py)")
        elif err_code == "invalid_grant":
            print("  Refresh token expired — re-run scripts/spotify-auth.py")
        return 0
    except Exception as e:
        print(f"  Spotify token refresh failed: {e}")
        return 0

    if not access_token:
        print("  Spotify: no access token returned")
        return 0

    # Fetch last 24h from Spotify; dedup (local + API) handles repeat runs
    lookback_floor = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    since_ms = f"&after={int(lookback_floor.timestamp() * 1000)}"

    history_url = f"https://api.spotify.com/v1/me/player/recently-played?limit=50{since_ms}"
    history_req = urllib.request.Request(
        history_url,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    try:
        with urllib.request.urlopen(history_req, timeout=15) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"  Spotify history fetch failed: {e}")
        return 0

    tracks = []
    for item in data.get("items", []):
        track = item.get("track", {})
        played_at = item.get("played_at", "")
        if not played_at:
            continue
        tracks.append({
            "artist": ", ".join(a["name"] for a in track.get("artists", [])),
            "track":  track.get("name", ""),
            "album":  track.get("album", {}).get("name", ""),
            "ts":     played_at,
        })

    # Also capture currently-playing track (needs user-read-currently-playing scope)
    try:
        now_req = urllib.request.Request(
            "https://api.spotify.com/v1/me/player/currently-playing",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        with urllib.request.urlopen(now_req, timeout=15) as resp:
            if resp.status == 200:
                now_data = json.loads(resp.read())
                item = now_data.get("item")
                if item and now_data.get("is_playing"):
                    tracks.insert(0, {
                        "artist": ", ".join(a["name"] for a in item.get("artists", [])),
                        "track":  item.get("name", ""),
                        "album":  item.get("album", {}).get("name", ""),
                        "ts":     datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                    })
    except Exception:
        pass  # scope not granted yet or nothing playing

    if not tracks:
        print(f"  fetched {len(data.get('items', []))} from Spotify · 0 new after dedup window")
        return 0

    added_local = write_local_music(tracks)
    res = post_json("/api/music", {"tracks": tracks})
    added_api = res.get("added", added_local)
    print(f"  fetched {len(tracks)} plays · +{added_local} new locally · +{added_api} via API")
    return max(added_local, added_api)

# ── Podcasts ──────────────────────────────────────────────────────────────────

def sync_podcasts(since_ts: str | None) -> int:
    """Read Apple Podcasts history, POST to /api/podcasts."""
    if not os.path.exists(PODCASTS_DB):
        print("  Apple Podcasts DB not found, skipping")
        return 0

    try:
        shutil.copy2(PODCASTS_DB, PODCASTS_TMP)
    except Exception as e:
        print(f"  Cannot copy Podcasts DB: {e}")
        return 0

    # Core Data / Apple epoch: Jan 1, 2001
    APPLE_EPOCH = datetime.datetime(2001, 1, 1, tzinfo=datetime.timezone.utc)

    since_apple = 0.0
    if since_ts:
        dt = datetime.datetime.fromisoformat(since_ts.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        since_apple = (dt - APPLE_EPOCH).total_seconds()

    try:
        conn = sqlite3.connect(PODCASTS_TMP)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        # Try common table/column names; schema varies by macOS version
        cur.execute(
            """
            SELECT e.ZTITLE as episode, p.ZTITLE as show, e.ZLASTDATEPLAYED as played_at
            FROM ZMTEPISODE e
            LEFT JOIN ZMTPODCAST p ON e.ZPODCAST = p.Z_PK
            WHERE e.ZLASTDATEPLAYED > ?
            ORDER BY e.ZLASTDATEPLAYED DESC
            """,
            (since_apple,),
        )
        rows = cur.fetchall()
        conn.close()
    except sqlite3.OperationalError:
        # Schema might differ — try alternate table/column names
        try:
            conn = sqlite3.connect(PODCASTS_TMP)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute(
                """
                SELECT e.ZTITLE as episode, p.ZTITLE as show, e.ZLASTDATEPLAYED as played_at
                FROM ZMTPLAYEDEPISODE e
                LEFT JOIN ZMTPODCAST p ON e.ZPODCAST = p.Z_PK
                WHERE e.ZLASTDATEPLAYED > ?
                ORDER BY e.ZLASTDATEPLAYED DESC
                """,
                (since_apple,),
            )
            rows = cur.fetchall()
            conn.close()
        except Exception as e:
            print(f"  Podcasts DB query failed: {e}")
            return 0
    except Exception as e:
        print(f"  Podcasts DB error: {e}")
        return 0

    episodes = []
    for row in rows:
        if not row["episode"] or not row["show"]:
            continue
        played_dt = APPLE_EPOCH + datetime.timedelta(seconds=float(row["played_at"] or 0))
        episodes.append({
            "show":    row["show"],
            "episode": row["episode"],
            "ts":      played_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        })

    if not episodes:
        return 0

    res = post_json("/api/podcasts", {"episodes": episodes})
    return res.get("added", 0)

# ── Agent stats ───────────────────────────────────────────────────────────────

def _count_user_prompts(path: str, is_claude_code: bool) -> int:
    """Count user prompts in a JSONL transcript file."""
    count = 0
    try:
        with open(path, errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    if not isinstance(obj, dict):
                        continue
                    if is_claude_code:
                        # Claude Code: {"type": "user", ...}
                        if obj.get("type") == "user":
                            count += 1
                    else:
                        # Cursor: {"role": "user"} or {"message": {"role": "user"}}
                        if obj.get("role") == "user":
                            count += 1
                        elif isinstance(obj.get("message"), dict) and obj["message"].get("role") == "user":
                            count += 1
                except (json.JSONDecodeError, KeyError):
                    pass
    except Exception:
        pass
    return count


def _project_name_from_encoded(encoded: str) -> str:
    """Extract short project name from encoded dir like 'Users-jaredmoskowitz-workspace-foo'."""
    prefix = "Users-jaredmoskowitz-workspace-"
    if encoded.startswith(prefix):
        return encoded[len(prefix):]
    return ""


def _scan_agent_transcripts(
    pattern: str,
    base_dir: str,
    is_claude_code: bool,
    start: datetime.datetime,
) -> tuple[int, int, dict[str, int]]:
    sessions = 0
    turns = 0
    project_counts: dict[str, int] = {}

    for path in glob.glob(pattern, recursive=True):
        try:
            mtime = datetime.datetime.utcfromtimestamp(os.path.getmtime(path))
        except OSError:
            continue
        if mtime < start:
            continue

        sessions += 1
        turns += _count_user_prompts(path, is_claude_code)

        parts = path.replace(base_dir, "").lstrip("/").split("/")
        project_name = _project_name_from_encoded(parts[0] if parts else "")
        if not project_name and parts:
            # e.g. Users-jaredmoskowitz-Library-...-workspace-json → workspace-json
            project_name = parts[0].split("-")[-1]
        if project_name:
            project_counts[project_name] = project_counts.get(project_name, 0) + 1

    return sessions, turns, project_counts


def sync_agent_stats() -> dict:
    """
    Scan Cursor (~/.cursor/projects) and Claude Code (~/.claude/projects) transcripts
    for this month's sessions and user prompts.
    """
    now   = datetime.datetime.utcnow()
    start = datetime.datetime(now.year, now.month, 1)

    cursor_pattern = os.path.join(CURSOR_PROJECTS_DIR, "*", "agent-transcripts", "**", "*.jsonl")
    claude_pattern = os.path.join(CLAUDE_CODE_PROJECTS_DIR, "*", "*.jsonl")

    cursor_sessions, cursor_turns, cursor_projects = _scan_agent_transcripts(
        cursor_pattern, CURSOR_PROJECTS_DIR, False, start,
    )
    claude_sessions, claude_turns, claude_projects = _scan_agent_transcripts(
        claude_pattern, CLAUDE_CODE_PROJECTS_DIR, True, start,
    )

    sessions_this_month = cursor_sessions + claude_sessions
    turns_this_month    = cursor_turns + claude_turns

    project_counts = dict(cursor_projects)
    for name, count in claude_projects.items():
        project_counts[name] = project_counts.get(name, 0) + count

    top_project = max(project_counts, key=lambda k: project_counts[k], default="")
    avg_turns   = round(turns_this_month / sessions_this_month, 1) if sessions_this_month else 0

    return {
        "sessions_this_month": sessions_this_month,
        "turns_this_month":    turns_this_month,
        "avg_turns":           avg_turns,
        "top_project":         top_project,
    }

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    acquire_lock()
    print(f"⟳  activity sync — {datetime.datetime.now().strftime('%b %-d %H:%M')}")
    api_note = f"local: {LOCAL_API}"
    if LIVE_API and LIVE_API != LOCAL_API:
        api_note += f" · live: {LIVE_API}"
    print(f"   {api_note}")

    state = load_state()

    # ── Git ──────────────────────────────────────────────────────────────────
    print("\n[1/5] git commits…")
    new_commits = sync_git(state.get("last_run_commits"))
    if new_commits is None:
        print(f"  +0 new commits (post failed — cursor not advanced)")
        new_commits = 0
    else:
        print(f"  +{new_commits} new commits")
        state["last_run_commits"] = datetime.datetime.utcnow().isoformat() + "Z"

    # ── Chrome reading ───────────────────────────────────────────────────────
    print("\n[2/5] chrome reading…")
    new_articles = sync_chrome(state.get("last_run_chrome"))
    print(f"  +{new_articles} articles queued for approval → localhost:3000/admin")
    state["last_run_chrome"] = datetime.datetime.utcnow().isoformat() + "Z"

    # ── Spotify ──────────────────────────────────────────────────────────────
    print("\n[3/5] spotify…")
    new_tracks = sync_spotify(state.get("last_run_spotify"))
    print(f"  +{new_tracks} tracks")
    state["last_run_spotify"] = datetime.datetime.utcnow().isoformat() + "Z"

    # ── Podcasts ─────────────────────────────────────────────────────────────
    print("\n[4/5] podcasts…")
    new_episodes = sync_podcasts(state.get("last_run_podcasts"))
    print(f"  +{new_episodes} episodes")
    state["last_run_podcasts"] = datetime.datetime.utcnow().isoformat() + "Z"

    # ── Agent stats ──────────────────────────────────────────────────────────
    print("\n[5/5] agent stats…")
    agent_stats = sync_agent_stats()
    agent_stats["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    write_local_json("agent-stats", [agent_stats])
    res = post_json("/api/agent-stats", agent_stats)
    ok = "✓" if res.get("ok") else "–"
    print(
        f"  {ok} {agent_stats['sessions_this_month']} sessions, "
        f"{agent_stats['turns_this_month']} prompts this month"
        + (f" (top: {agent_stats['top_project']})" if agent_stats['top_project'] else "")
    )

    # ── Save state ───────────────────────────────────────────────────────────
    save_state(state)

    print(f"\n✓  done — {new_commits} commits, {new_articles} pending, "
          f"{new_tracks} tracks, {new_episodes} episodes")

if __name__ == "__main__":
    # Make urllib.parse available at module level for Spotify
    import urllib.parse

    if "--spotify" in sys.argv:
        # Lightweight spotify-only run (no lock, no full output)
        state = load_state()
        added = sync_spotify(state.get("last_run_spotify"))
        if added:
            print(f"spotify: +{added} tracks")
            state["last_run_spotify"] = datetime.datetime.utcnow().isoformat() + "Z"
            save_state(state)

    elif "--deploy" in sys.argv:
        # Record a manual deploy: activity --deploy <project> [msg]
        # e.g. activity --deploy todaydailyfocus.com "Today v1.3 → production"
        idx = sys.argv.index("--deploy")
        if idx + 1 >= len(sys.argv):
            print("Usage: activity --deploy <project-or-url> [message]")
            sys.exit(1)
        project = sys.argv[idx + 1]
        msg     = sys.argv[idx + 2] if idx + 2 < len(sys.argv) else f"deploy → {project}"

        # Try to get HEAD sha + commit message from the current repo
        import subprocess
        sha = ""
        try:
            sha = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"],
                                          stderr=subprocess.DEVNULL).decode().strip()
        except Exception:
            pass

        payload = {
            "project": project,
            "sha":     sha,
            "msg":     msg,
            "branch":  "main",
            "status":  "ok",
            "url":     project if project.startswith("http") else f"https://{project}",
            "date":    datetime.datetime.utcnow().isoformat() + "Z",
        }
        body    = json.dumps(payload).encode()
        req_obj = urllib.request.Request(
            f"{LIVE_API or LOCAL_API}/api/deploys?manual=1", data=body, method="POST"
        )
        req_obj.add_header("Content-Type", "application/json")
        req_obj.add_header("Authorization", f"Bearer {SECRET}")
        try:
            with urllib.request.urlopen(req_obj, timeout=15) as resp:
                print(f"✓  recorded deploy: {project} ({sha or 'no sha'})")
        except Exception as e:
            print(f"  failed to record deploy: {e}")

    else:
        main()

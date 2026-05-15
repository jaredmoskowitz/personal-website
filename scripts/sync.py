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
            if k not in os.environ:
                os.environ[k] = v

load_env()

API_BASE = os.environ.get("LIVE_API_URL", "http://localhost:3000")
SECRET   = os.environ.get("READING_SECRET", "")

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

CURSOR_PROJECTS_DIR = os.path.expanduser("~/.cursor/projects")

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

# ── HTTP helpers ──────────────────────────────────────────────────────────────

def post_json(path: str, payload: dict) -> dict:
    url  = f"{API_BASE}{path}"
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
        print(f"  HTTP {e.code} from {path}: {err[:200]}")
        return {}
    except Exception as exc:
        print(f"  Error posting to {path}: {exc}")
        return {}

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
    "google.com", "mail.google.com", "calendar.google.com", "accounts.google.com",
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

    return True

def sync_chrome(since_ts: str | None) -> int:
    """Read Chrome history since since_ts, add new articles to reading-pending.json."""
    if not os.path.exists(CHROME_HISTORY):
        print("  Chrome history not found, skipping")
        return 0

    since_chrome = 0
    if since_ts:
        dt = datetime.datetime.fromisoformat(since_ts.replace("Z", "+00:00"))
        unix = dt.timestamp()
        since_chrome = int((unix + CHROME_EPOCH_OFFSET) * 1_000_000)

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

    new_articles = []
    for url, raw_title, visit_time in rows:
        if not raw_title:
            continue
        title = clean_title(raw_title)
        if len(title) < 10:
            continue
        if title in existing_titles or title in approved_titles:
            continue
        if not is_article(url, raw_title):
            continue

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
    except Exception as e:
        print(f"  Spotify token refresh failed: {e}")
        return 0

    if not access_token:
        print("  Spotify: no access token returned")
        return 0

    # Fetch recently played
    since_ms = ""
    if since_ts:
        dt = datetime.datetime.fromisoformat(since_ts.replace("Z", "+00:00"))
        since_ms = f"&after={int(dt.timestamp() * 1000)}"

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
        return 0

    res = post_json("/api/music", {"tracks": tracks})
    return res.get("added", 0)

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

def sync_agent_stats() -> dict:
    """
    Scan ~/.cursor/projects/*/agent-transcripts/*.jsonl for this month's sessions.
    Returns stats dict.
    """
    now   = datetime.datetime.utcnow()
    start = datetime.datetime(now.year, now.month, 1)

    project_counts: dict[str, int] = {}
    sessions_this_month = 0
    turns_this_month    = 0

    pattern = os.path.join(CURSOR_PROJECTS_DIR, "*", "agent-transcripts", "**", "*.jsonl")
    for path in glob.glob(pattern, recursive=True):
        try:
            mtime = datetime.datetime.utcfromtimestamp(os.path.getmtime(path))
        except OSError:
            continue
        if mtime < start:
            continue

        sessions_this_month += 1

        # Extract project name from path — only track real workspace projects
        parts = path.replace(CURSOR_PROJECTS_DIR, "").lstrip("/").split("/")
        project_name = parts[0] if parts else ""
        if project_name.startswith("Users-jaredmoskowitz-workspace-"):
            project_counts[project_name] = project_counts.get(project_name, 0) + 1

        try:
            with open(path, errors="replace") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                        # Count user turns
                        if isinstance(obj, dict) and obj.get("role") == "user":
                            turns_this_month += 1
                        # Some formats nest messages
                        elif isinstance(obj, dict) and isinstance(obj.get("message"), dict):
                            if obj["message"].get("role") == "user":
                                turns_this_month += 1
                    except (json.JSONDecodeError, KeyError):
                        pass
        except Exception:
            pass

    top_project = max(project_counts, key=lambda k: project_counts[k], default="")
    avg_turns   = round(turns_this_month / sessions_this_month, 1) if sessions_this_month else 0

    # Strip the long macOS project dir encoding from top_project
    # Format: "Users-jaredmoskowitz-workspace-projectname" → "projectname"
    # Skip noise dirs like "empty-window" or numeric dirs
    if top_project:
        prefix = "Users-jaredmoskowitz-workspace-"
        if top_project.startswith(prefix):
            top_project = top_project[len(prefix):]
        elif not top_project.startswith("Users-"):
            # Numeric or noise dir — skip
            top_project = ""

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
    print(f"   API: {API_BASE}")

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
    res = post_json("/api/agent-stats", agent_stats)
    ok = "✓" if res.get("ok") else "–"
    print(
        f"  {ok} {agent_stats['sessions_this_month']} sessions, "
        f"{agent_stats['turns_this_month']} turns this month"
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
            f"{API_BASE}/api/deploys?manual=1", data=body, method="POST"
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

#!/usr/bin/env python3
"""
Backfill reading history from Chrome browsing history to the reading API.
Aggressively filters for actual articles — tech, AI, product, engineering content.

Usage:
    READING_SECRET=<secret> python3 scripts/backfill-reading.py [API_BASE_URL] [--days N]
"""

import argparse
import datetime
import json
import os
import re
import shutil
import sqlite3
import sys
import time
import urllib.request
import urllib.error
from urllib.parse import urlparse

CHROME_HISTORY_PATH = os.path.expanduser(
    "~/Library/Application Support/Google/Chrome/Default/History"
)
TMP_DB_PATH = "/tmp/chrome-history-backfill.db"
CHROME_EPOCH_OFFSET = 11644473600  # seconds between Chrome epoch (1601) and Unix epoch (1970)

# ── Hard-blocked domains (apps, services, shopping, entertainment) ────────────
BLOCKED_DOMAINS = {
    # Google services
    "google.com", "mail.google.com", "calendar.google.com", "accounts.google.com",
    "docs.google.com", "drive.google.com", "sheets.google.com", "slides.google.com",
    "meet.google.com", "chat.google.com", "maps.google.com", "photos.google.com",
    "translate.google.com", "news.google.com", "play.google.com",
    # Social / messaging
    "twitter.com", "x.com", "instagram.com", "facebook.com", "threads.net",
    "tiktok.com", "snapchat.com", "discord.com", "slack.com", "app.slack.com",
    "teams.microsoft.com", "zoom.us", "us02web.zoom.us", "whatsapp.com",
    "telegram.org", "signal.org",
    # LinkedIn (feed/app — articles have /pulse/ in path, handled below)
    "linkedin.com",
    # Shopping / commerce
    "amazon.com", "ebay.com", "etsy.com", "shopify.com", "walmart.com",
    "target.com", "bestbuy.com", "wayfair.com", "chewy.com", "zappos.com",
    "nordstrom.com", "macys.com", "gap.com", "nike.com", "adidas.com",
    "globalblue.com",
    # Finance / banking
    "chase.com", "bankofamerica.com", "wellsfargo.com", "schwab.com",
    "fidelity.com", "vanguard.com", "robinhood.com", "coinbase.com",
    "us.etrade.com", "etrade.com", "atwork.morganstanley.com", "morganstanley.com",
    "qp.riviahealth.com",
    # Entertainment / streaming
    "netflix.com", "disneyplus.com", "hulu.com", "hbomax.com", "max.com",
    "primevideo.com", "peacocktv.com", "paramountplus.com", "appletv.com",
    "twitch.tv", "crunchyroll.com",
    # Music / podcasts
    "spotify.com", "music.apple.com", "soundcloud.com", "tidal.com",
    "pandora.com", "last.fm", "api.ffm.to",
    # Travel / hospitality
    "airbnb.com", "vrbo.com", "booking.com", "expedia.com", "hotels.com",
    "tripadvisor.com", "kayak.com", "delta.com", "united.com", "aa.com",
    "southwest.com", "jetblue.com", "montblancnaturalresort.com", "legoland.com",
    # Productivity / work tools (app interactions, not articles)
    "notion.so", "linear.app", "asana.com", "monday.com", "trello.com",
    "airtable.com", "figma.com", "miro.com", "canva.com", "loom.com",
    "calendly.com", "typeform.com", "surveymonkey.com", "mailchimp.com",
    # Auth / identity
    "auth0.com", "okta.com", "onelogin.com", "duo.com",
    "na2.docusign.net", "docusign.com", "hellosign.com",
    # Search
    "bing.com", "duckduckgo.com", "yahoo.com",
    # Entertainment / celebrity / sports news
    "variety.com", "tmz.com", "people.com", "eonline.com", "usmagazine.com",
    "consequence.net", "stereogum.com", "pitchfork.com", "rollingstone.com",
    "pgatour.com", "espn.com", "nba.com", "nfl.com", "mlb.com",
    "bleacherreport.com", "theathletic.com", "cbssports.com", "foxsports.com",
    # Legal / misc noise
    "qrglawfirm.com", "jasonsconnection.org",
    # Job boards (I browse these but they're not articles)
    "glassdoor.com", "indeed.com", "monster.com", "ziprecruiter.com",
    # Personal/non-article sites
    "jackmcdermott.com",
    # Misc noise
    "connectivitycheck.gstatic.com", "tracking.tldrnewsletter.com",
    "truthsocial.com", "truthsocial.app", "monitor-the-situation.com", "purewow.com",
    # Restaurant / local
    "yelp.com", "opentable.com", "doordash.com", "ubereats.com", "grubhub.com",
    "seamless.com",
    # Blind (salary gossip, not real content)
    "teamblind.com",
    # Prediction market help (operational, not learning)
    "help.kalshi.com",
}

# ── Blocked URL path prefixes (app flows) ─────────────────────────────────────
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

# ── Title patterns that indicate app UI, not articles ─────────────────────────
APP_UI_TITLE_PATTERNS = re.compile(
    r"""
    ^\s*(
        loading           |
        redirecting       |
        please\s+wait     |
        access\s+denied   |
        page\s+not\s+found|
        404\s              |
        403\s              |
        500\s              |
        error\s*[-–—|]    |
        success\s*[-–—|]  |
        submit\s+form      |
        post\s+attendee    |
        email\s+(start|link\s+expired)
    )
    """,
    re.VERBOSE | re.IGNORECASE,
)

APP_UI_TITLE_SUFFIXES = re.compile(
    r"""
    \|\s*(
        slack|discord|notion|linear|figma|github|vercel|railway|netlify|
        zoom|teams|gmail|outlook|calendar|drive|sheets|docs|
        netflix|disney\+|hulu|spotify|twitch|
        etrade|e\*trade|robinhood|coinbase|fidelity|
        linkedin|instagram|twitter|facebook|tiktok|
        shopify|amazon|ebay|etsy|target|walmart|
        login|sign\s*in|sign\s*up|register|
        dashboard|settings|profile|account|inbox|
        stripe|paypal|square|venmo|cashapp|
        salesforce|hubspot|zendesk|jira|confluence|asana|
        loom|calendly|typeform|airtable|miro|canva|
        app\s+store|google\s+play|
        select\s+plan|loading|redirecting
    )\s*$
    """,
    re.VERBOSE | re.IGNORECASE,
)

# ── Known article/content domains (always pass if title is reasonable) ─────────
ARTICLE_DOMAINS = {
    # AI / ML / Tech
    "arxiv.org", "openai.com", "anthropic.com", "deepmind.google",
    "research.google", "ai.meta.com", "mistral.ai", "huggingface.co",
    "cohere.com", "stability.ai", "replicate.com",
    # Dev / engineering
    "github.com", "stackoverflow.com", "hackernews.com", "news.ycombinator.com",
    "lobste.rs", "dev.to", "hashnode.com", "codemirror.net",
    "css-tricks.com", "smashingmagazine.com", "web.dev", "developer.apple.com",
    "developer.android.com", "developer.mozilla.org", "docs.swift.org",
    "swift.org", "kotlinlang.org", "rust-lang.org", "go.dev",
    # Tech media
    "techcrunch.com", "theverge.com", "wired.com", "arstechnica.com",
    "thenextweb.com", "venturebeat.com", "zdnet.com", "infoq.com",
    "ieee.org", "acm.org", "technologyreview.com",
    # Product / design / startup
    "paulgraham.com", "stratechery.com", "ben-evans.com", "lethain.com",
    "randsinrepose.com", "svpg.com", "lennysnewsletter.com",
    "firstround.com", "ycombinator.com", "a16z.com", "sequoiacap.com",
    "increment.com", "highscalability.com",
    # Thinking / writing / essays
    "medium.com", "substack.com", "mirror.xyz", "write.as",
    "waitbutwhy.com", "slatestarcodex.com", "astralcodexten.com",
    "gwern.net", "ribbonfarm.com", "lesswrong.com",
    # News (quality)
    "nytimes.com", "wsj.com", "ft.com", "theatlantic.com",
    "newyorker.com", "economist.com", "nature.com", "science.org",
    # iOS / Apple
    "daringfireball.net", "sixcolors.com", "9to5mac.com", "macrumors.com",
    "cultofmac.com",
    # Others I know are good
    "grugbrain.dev", "asmartbear.com", "eclecticlight.co", "ciechanow.ski",
    "jvns.ca", "danluu.com", "macwright.com", "overreacted.io",
    "karpathy.github.io", "colah.github.io",
    "tweag.github.io", "apideck.com", "ai.plainenglish.io",
    "citadelsecurities.com", "perplexity.ai",
}


def chrome_time_to_datetime(chrome_ts: int) -> datetime.datetime:
    unix_ts = (chrome_ts / 1_000_000) - CHROME_EPOCH_OFFSET
    return datetime.datetime.utcfromtimestamp(unix_ts)


def clean_title(title: str) -> str:
    # Strip common suffix separators and trailing service names
    title = title.strip()
    # Remove trailing " - SiteName" if SiteName is short (likely branding)
    title = re.sub(r"\s+[-–—]\s+[^-–—]{1,40}$", "", title).strip()
    return title


def is_article(url: str, raw_title: str, hostname: str, path: str) -> "tuple[bool, str]":
    """Returns (is_article, reason_if_rejected)."""

    # ── Scheme ────────────────────────────────────────────────────────────────
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False, "non-http"

    # ── Local dev servers ─────────────────────────────────────────────────────
    host_only = hostname.split(":")[0]
    if host_only in ("localhost", "127.0.0.1", "0.0.0.0", "::1") or host_only.endswith(".local"):
        return False, "local host"

    # ── Domain blocklist ──────────────────────────────────────────────────────
    bare = hostname.removeprefix("www.")
    if bare in BLOCKED_DOMAINS or hostname in BLOCKED_DOMAINS:
        return False, f"blocked domain: {bare}"

    # ── Special-case: LinkedIn — only allow /pulse/ articles ─────────────────
    if "linkedin.com" in hostname and "/pulse/" not in path:
        return False, "linkedin non-article"

    # ── Special-case: GitHub — only allow substantive content paths ──────────
    if "github.com" in hostname:
        if not hostname.endswith(".github.io"):
            parts = [p for p in path.split("/") if p]
            if len(parts) < 3:
                return False, "github shallow path"
            # Filter admin/nav titles
            github_noise_titles = re.compile(
                r"(sign in|two.factor|initiating saml|invitation to join|"
                r"installed github app|github app installed|"
                r"auth \||general organization|invite your team|"
                r"continue setting up|fork \w|pull requests ·|"
                r"^\s*[\w\s\-]{3,30}\s*$)",  # short bare names = profile/nav pages
                re.IGNORECASE,
            )
            if github_noise_titles.search(raw_title):
                return False, "github admin/nav page"
            # Filter binary/image/data file browsing
            if re.search(r"\.(png|svg|jpg|jpeg|gif|webp|ico|pdf|tsv|csv|zip|tar)\b", path, re.IGNORECASE):
                return False, "github binary file"
            # Filter directory listings that are just code browsing (not docs/wiki)
            # Allow: /wiki/, /issues/\d+, /pull/\d+, /releases, /blob/.../(README|CHANGELOG|AGENTS|CLAUDE)
            # Block: deep file-path browsing in src code
            if "/blob/" in path or "/tree/" in path:
                # Only keep if it's a doc file, not source code
                doc_files = re.compile(r"/(README|CHANGELOG|AGENTS|CLAUDE|CONTRIBUTING|SECURITY)(\.\w+)?$", re.IGNORECASE)
                if not doc_files.search(path):
                    return False, "github source browsing"

    # ── Special-case: Apple Developer — only learning/reference, not admin ───
    if "developer.apple.com" in hostname:
        apple_admin_patterns = re.compile(
            r"(download|upload|screenshot|enrollment|add testers|"
            r"view build status|schedule.*meet|in-app purchase (info|local)|"
            r"submit.*form|meet with apple)",
            re.IGNORECASE,
        )
        if apple_admin_patterns.search(raw_title):
            return False, "apple dev admin page"

    # ── Special-case: Hacker News — skip nav/profile/submit pages ────────────
    if "news.ycombinator.com" in hostname:
        hn_noise = re.compile(
            r"(new links|submit(\s*\||\s*$)|profile:|'s comments|^hacker news$)",
            re.IGNORECASE,
        )
        if hn_noise.search(raw_title):
            return False, "hn nav page"
        # Only allow /item?id=... (discussion threads)
        if not path.startswith("/item"):
            return False, "hn non-thread"

    # ── Special-case: OpenAI / Anthropic — blog/research only, not jobs ──────
    if bare in ("openai.com", "anthropic.com"):
        if any(seg in path for seg in ("/careers/", "/jobs/", "/job/", "/positions/")):
            return False, "job listing"

    # ── Special-case: YC — only articles/blog, not job listings ──────────────
    if "ycombinator.com" in hostname and "/jobs" in path:
        return False, "job listing"

    # ── Special-case: Wikipedia — require technical/business signal ─────────
    if "wikipedia.org" in hostname and path.startswith("/wiki/"):
        wiki_good = re.compile(
            r"(algorithm|method|theorem|protocol|language|framework|library|"
            r"architecture|system|network|model|database|compiler|runtime|"
            r"machine learning|artificial intelligence|neural|software|hardware|"
            r"computer|cryptograph|encoding|compression|sorting|search|"
            r"startup|company|corporation|venture|founder|engineer|"
            r"monte carlo|markov|fourier|bayes|gradient|heuristic|"
            r"swift|kotlin|python|javascript|rust|go\b|java\b)",
            re.IGNORECASE,
        )
        if not wiki_good.search(raw_title):
            return False, "wikipedia non-technical"

    # ── Special-case: substack.com root (account page) ───────────────────────
    if hostname == "substack.com" and not any(
        seg in path for seg in ("/p/", "/blog/", "/posts/", "/archive/")
    ):
        return False, "substack non-article"

    # ── Path blocklist ────────────────────────────────────────────────────────
    path_lower = path.lower()
    if any(path_lower.startswith(p) for p in BLOCKED_PATH_PREFIXES):
        return False, f"blocked path: {path_lower[:30]}"

    # ── Title quality ─────────────────────────────────────────────────────────
    title = raw_title.strip()

    if not title or len(title) < 20:
        return False, "title too short"

    if title.startswith("http"):
        return False, "title is URL"

    if APP_UI_TITLE_PATTERNS.search(title):
        return False, f"app UI title: {title[:40]}"

    if APP_UI_TITLE_SUFFIXES.search(title):
        return False, f"app UI suffix: {title[:40]}"

    # Bare home page
    if path in ("/", "", "//"):
        return False, "root path"

    # ── Positive signals ──────────────────────────────────────────────────────
    if bare in ARTICLE_DOMAINS or hostname in ARTICLE_DOMAINS:
        return True, "known article domain"

    # Substack newsletters (*.substack.com/p/...)
    if hostname.endswith(".substack.com") and "/p/" in path:
        return True, "substack post"

    # Date-based URL paths (strong article signal)
    if re.search(r"/20(1[5-9]|2[0-9])/", path):
        return True, "date in path"

    # Article-indicating path segments
    article_path_indicators = (
        "/blog/", "/posts/", "/post/", "/articles/", "/article/",
        "/essay/", "/writing/", "/notes/", "/thoughts/",
        "/news/", "/story/", "/stories/",
        "/research/", "/paper/", "/papers/",
        "/tutorial/", "/tutorials/", "/guide/", "/guides/",
    )
    if any(ind in path_lower for ind in article_path_indicators):
        return True, "article path"

    # Hacker News / Reddit discussion threads (people link interesting things)
    if bare in ("news.ycombinator.com",) and path.startswith("/item"):
        return True, "HN thread"
    if bare in ("reddit.com", "old.reddit.com") and "/comments/" in path:
        return True, "reddit thread"

    # Wikipedia (people look things up when learning)
    if bare == "en.wikipedia.org" and path.startswith("/wiki/") and len(path) > 12:
        return True, "wikipedia"

    # arxiv papers
    if bare == "arxiv.org" and ("/abs/" in path or "/pdf/" in path):
        return True, "arxiv paper"

    # Docs that are clearly reference/learning content
    if bare in ("docs.swift.org", "developer.apple.com", "developer.mozilla.org",
                "developer.android.com", "kotlinlang.org", "rust-lang.org"):
        return True, "official docs"

    return False, "no article signal"


def fetch_history(days: int) -> list[dict]:
    if not os.path.exists(CHROME_HISTORY_PATH):
        print(f"Error: Chrome History not found at:\n  {CHROME_HISTORY_PATH}", file=sys.stderr)
        sys.exit(1)

    shutil.copy2(CHROME_HISTORY_PATH, TMP_DB_PATH)

    cutoff_dt = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    cutoff_chrome = int((cutoff_dt.timestamp() + CHROME_EPOCH_OFFSET) * 1_000_000)

    conn = sqlite3.connect(TMP_DB_PATH)
    try:
        cursor = conn.execute(
            "SELECT url, title, last_visit_time, visit_count FROM urls "
            "WHERE last_visit_time >= ? ORDER BY last_visit_time DESC LIMIT 15000",
            (cutoff_chrome,),
        )
        rows = cursor.fetchall()
    finally:
        conn.close()

    articles = []
    seen_titles: dict[str, int] = {}
    rejected_counts: dict[str, int] = {}

    for url, raw_title, last_visit_time, visit_count in rows:
        if visit_count < 1:
            continue

        title = (raw_title or "").strip()
        if not title:
            continue

        try:
            parsed = urlparse(url)
            hostname = (parsed.hostname or "").lower()
            path = parsed.path or "/"
        except Exception:
            continue

        ok, reason = is_article(url, title, hostname, path)
        if not ok:
            rejected_counts[reason.split(":")[0]] = rejected_counts.get(reason.split(":")[0], 0) + 1
            continue

        source = hostname.removeprefix("www.")
        visit_dt = chrome_time_to_datetime(last_visit_time)
        date_str = visit_dt.strftime("%b %-d")

        article = {
            "title": clean_title(title),
            "source": source,
            "url": url,
            "date": date_str,
            "ts": visit_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "_visit_time": last_visit_time,
        }

        title_lower = title.lower()
        if title_lower in seen_titles:
            existing = articles[seen_titles[title_lower]]
            if last_visit_time > existing["_visit_time"]:
                articles[seen_titles[title_lower]] = article
        else:
            seen_titles[title_lower] = len(articles)
            articles.append(article)

    articles.sort(key=lambda a: a["_visit_time"], reverse=True)

    print(f"  Kept {len(articles)} articles, rejected {sum(rejected_counts.values())} URLs")
    if "--verbose" in sys.argv:
        for reason, count in sorted(rejected_counts.items(), key=lambda x: -x[1]):
            print(f"    {count:>5}  {reason}")

    return articles


def upload_article(api_base: str, secret: str, article: dict) -> bool:
    url = f"{api_base.rstrip('/')}/api/reading"
    payload = {k: v for k, v in article.items() if not k.startswith("_") and k != "ts"}
    payload["ts"] = article.get("ts", "")
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data,
        headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except urllib.error.HTTPError as e:
        print(f"  ✗ {article['title'][:60]}: HTTP {e.code}")
        return False
    except Exception as e:
        print(f"  ✗ {article['title'][:60]}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Backfill Chrome reading history to the reading API")
    parser.add_argument("api_base", nargs="?", default="http://localhost:3000")
    parser.add_argument("--days", type=int, default=90)
    parser.add_argument("--dry-run", action="store_true", help="Print articles without uploading")
    parser.add_argument("--verbose", action="store_true", help="Show rejection reason breakdown")
    args = parser.parse_args()

    secret = os.environ.get("READING_SECRET")
    if not secret and not args.dry_run:
        print("Error: READING_SECRET environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning last {args.days} days of Chrome history...")
    articles = fetch_history(args.days)
    print(f"Uploading {len(articles)} articles...")

    if args.dry_run:
        for a in articles:
            print(f"  {a['source']:<35} {a['title'][:70]}")
        return

    uploaded = errors = 0
    for i, article in enumerate(articles):
        success = upload_article(args.api_base, secret, article)
        if success:
            print(f"  ✓ {article['title'][:60]} ({article['source']})")
            uploaded += 1
        else:
            errors += 1
        if (i + 1) % 50 == 0:
            time.sleep(0.1)

    print(f"\nDone: {uploaded} uploaded, {errors} errors")


if __name__ == "__main__":
    main()

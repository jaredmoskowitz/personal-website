#!/usr/bin/env python3
"""
One-time Spotify OAuth setup.

Usage:
    python3 scripts/spotify-auth.py

Creates a Spotify app at https://developer.spotify.com/dashboard, then run this script.
Required scopes: user-read-recently-played

The script will:
  1. Open the Spotify authorization URL in your browser
  2. Start a local HTTP server to capture the callback
  3. Exchange the code for tokens
  4. Append SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN to .env.local
"""

import base64
import json
import os
import sys
import urllib.parse
import urllib.request
import webbrowser

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
ENV_FILE  = os.path.join(REPO_ROOT, ".env.local")

REDIRECT_URI  = "https://example.com/callback"
SCOPES        = "user-read-recently-played"
AUTH_URL      = "https://accounts.spotify.com/authorize"
TOKEN_URL     = "https://accounts.spotify.com/api/token"


def set_env(key: str, value: str):
    """Upsert a key=value line in .env.local."""
    lines = []
    found = False
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE) as f:
            lines = f.readlines()
    new_lines = []
    for line in lines:
        if line.startswith(f"{key}="):
            new_lines.append(f"{key}={value}\n")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f"{key}={value}\n")
    with open(ENV_FILE, "w") as f:
        f.writelines(new_lines)


def main():
    print("Spotify OAuth Setup")
    print("=" * 40)
    print()

    # Prompt for app credentials
    client_id = input("Spotify Client ID (from developer.spotify.com/dashboard): ").strip()
    if not client_id:
        sys.exit("Client ID required")

    client_secret = input("Spotify Client Secret: ").strip()
    if not client_secret:
        sys.exit("Client Secret required")

    # Build auth URL
    params = urllib.parse.urlencode({
        "client_id":     client_id,
        "response_type": "code",
        "redirect_uri":  REDIRECT_URI,
        "scope":         SCOPES,
    })
    url = f"{AUTH_URL}?{params}"

    print(f"\nOpening browser for authorization…")
    print(f"URL: {url}\n")
    webbrowser.open(url)

    print("After you click 'Agree' in Spotify, your browser will land on a broken")
    print("example.com page. That's expected. Copy the full URL from the address bar")
    print("and paste it here.\n")
    redirect_url = input("Paste the full redirect URL: ").strip()

    parsed_redirect = urllib.parse.urlparse(redirect_url)
    params = urllib.parse.parse_qs(parsed_redirect.query)
    code = params.get("code", [None])[0]
    error = params.get("error", [None])[0]
    if error or not code:
        sys.exit(f"Authorization failed: {error or 'no code in URL'}")

    # Exchange code for tokens
    creds       = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    token_body  = urllib.parse.urlencode({
        "grant_type":   "authorization_code",
        "code":          code,
        "redirect_uri":  REDIRECT_URI,
    }).encode()
    token_req = urllib.request.Request(
        TOKEN_URL,
        data=token_body,
        headers={
            "Authorization":  f"Basic {creds}",
            "Content-Type":  "application/x-www-form-urlencoded",
        },
    )

    try:
        with urllib.request.urlopen(token_req, timeout=15) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"Token exchange failed: {e.read().decode()}")

    refresh_token = data.get("refresh_token", "")
    if not refresh_token:
        sys.exit(f"No refresh token in response: {data}")

    # Save to .env.local
    set_env("SPOTIFY_CLIENT_ID",     client_id)
    set_env("SPOTIFY_CLIENT_SECRET", client_secret)
    set_env("SPOTIFY_REFRESH_TOKEN", refresh_token)

    print(f"\n✓  Tokens saved to {ENV_FILE}")
    print("   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN")
    print("\nRun `activity` to start syncing your music history.")


if __name__ == "__main__":
    main()

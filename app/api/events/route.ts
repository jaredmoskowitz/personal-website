import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface LiveEvent {
  type:     string;
  sha?:     string;
  text:     string;
  source:   string;
  time:     string;
  status?:  string;
  date:     string; // ISO — for internal sorting
}

function relativeTime(dateStr: string): string {
  const now     = Date.now();
  const then    = new Date(dateStr).getTime();
  const diffMs  = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMs / 3_600_000);
  const diffD   = Math.floor(diffMs / 86_400_000);
  const diffW   = Math.floor(diffD / 7);
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffH   < 24)  return `${diffH}h ago`;
  if (diffD   === 1) return 'yesterday';
  if (diffD   < 7)   return `${diffD}d ago`;
  return `${diffW}w ago`;
}

function readJson<T>(filePath: string): T[] {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T[];
  } catch {
    return [];
  }
}

export async function GET() {
  const dataDir = path.join(process.cwd(), 'data');

  // ── commits ──────────────────────────────────────────────────────────────
  const storedCommits = readJson<{
    repo: string; msg: string; sha: string; date: string;
  }>(path.join(dataDir, 'commits.json'));

  let githubCommits: typeof storedCommits = [];
  try {
    const res = await fetch(
      'https://api.github.com/users/jaredmoskowitz/events/public?per_page=50',
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'jaredmoskowitz.com',
          ...(process.env.GITHUB_TOKEN ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
        next: { revalidate: 300 },
      }
    );
    if (res.ok) {
      const events: Array<{
        type: string;
        repo: { name: string };
        payload: { commits?: Array<{ sha: string; message: string }> };
        created_at: string;
      }> = await res.json();
      githubCommits = events
        .filter(e => e.type === 'PushEvent' && e.payload.commits?.length)
        .flatMap(e =>
          (e.payload.commits || []).map(c => ({
            repo: e.repo.name,
            msg:  c.message.split('\n')[0].slice(0, 80),
            sha:  c.sha.slice(0, 7),
            date: e.created_at,
          }))
        );
    }
  } catch {
    // GitHub unreachable
  }

  const seenShas = new Set<string>();
  const commitEvents: LiveEvent[] = [...githubCommits, ...storedCommits]
    .filter(c => {
      const key = c.sha.slice(0, 7);
      if (seenShas.has(key)) return false;
      seenShas.add(key);
      return true;
    })
    .map(c => ({
      type:   'commit',
      sha:    c.sha.slice(0, 7),
      text:   c.msg,
      source: c.repo.split('/')[1] ?? c.repo,
      time:   relativeTime(c.date),
      date:   c.date,
    }));

  // ── deploys ───────────────────────────────────────────────────────────────
  const deployEvents: LiveEvent[] = readJson<{
    project: string; sha: string; msg: string; status: string; date: string;
  }>(path.join(dataDir, 'deploys.json')).map(d => ({
    type:   'deploy',
    sha:    d.sha,
    text:   `${d.project}@${d.sha} → vercel`,
    source: d.project,
    time:   relativeTime(d.date),
    status: d.status,
    date:   d.date,
  }));

  // ── reading ───────────────────────────────────────────────────────────────
  const readingEvents: LiveEvent[] = readJson<{
    title: string; source: string; date: string;
  }>(path.join(dataDir, 'reading.json')).map(r => ({
    type:   'reading',
    text:   r.title,
    source: r.source,
    time:   r.date, // already human-readable from reading route
    date:   r.date,
  }));

  const all = [...commitEvents, ...deployEvents, ...readingEvents]
    .sort((a, b) => {
      // reading dates are human strings like "May 11"; sort those to bottom
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (isNaN(da) && isNaN(db)) return 0;
      if (isNaN(da)) return 1;
      if (isNaN(db)) return -1;
      return db - da;
    })
    .slice(0, 30)
    .map(({ date: _d, ...rest }) => rest);

  return NextResponse.json({ events: all });
}

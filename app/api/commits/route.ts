import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GITHUB_USER = 'jaredmoskowitz';
const BACKFILL_PATH = path.join(process.cwd(), 'data', 'commits.json');

export interface Commit {
  repo: string;
  msg:  string;
  sha:  string;
  when: string;
  date: string; // ISO — used for sorting; omitted from response
}

function relativeTime(dateStr: string): string {
  const now  = Date.now();
  const then = new Date(dateStr).getTime();
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

function loadBackfill(): Commit[] {
  try {
    return JSON.parse(fs.readFileSync(BACKFILL_PATH, 'utf-8')) as Commit[];
  } catch {
    return [];
  }
}

export async function GET() {
  const backfill = loadBackfill();

  let githubCommits: Commit[] = [];
  try {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/events/public?per_page=50`,
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
            when: relativeTime(e.created_at),
            date: e.created_at,
          }))
        );
    }
  } catch {
    // GitHub unreachable — backfill only
  }

  // Merge: backfill covers private repos; GitHub covers public real-time.
  // Deduplicate by SHA prefix, sort by date descending.
  const seenShas = new Set<string>();
  const merged = [...githubCommits, ...backfill]
    .filter(c => {
      const key = c.sha.slice(0, 7);
      if (seenShas.has(key)) return false;
      seenShas.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)
    .map(({ date, ...rest }) => ({ ...rest, when: rest.when || relativeTime(date) })); // compute when from date for backfill entries

  return NextResponse.json({ commits: merged });
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GITHUB_USER = 'jaredmoskowitz';

export interface StatCard {
  n:     number | string;
  label: string;
}

function commitCountThisMonth(commitsPath: string): number {
  try {
    const commits: Array<{ date: string }> = JSON.parse(
      fs.readFileSync(commitsPath, 'utf-8')
    );
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return commits.filter(c => new Date(c.date).getTime() >= start).length;
  } catch {
    return 0;
  }
}

export async function GET() {
  const dataDir     = path.join(process.cwd(), 'data');
  const commitsPath = path.join(dataDir, 'commits.json');

  const localMonthCount = commitCountThisMonth(commitsPath);

  let publicRepos   = 0;
  let githubMonthly = 0;

  try {
    const userRes = await fetch(
      `https://api.github.com/users/${GITHUB_USER}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'jaredmoskowitz.com',
          ...(process.env.GITHUB_TOKEN ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
        next: { revalidate: 3600 },
      }
    );
    if (userRes.ok) {
      const user = await userRes.json() as { public_repos?: number };
      publicRepos = user.public_repos ?? 0;
    }

    // Count push events in the last 30 days from public activity
    const eventsRes = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/events/public?per_page=100`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'jaredmoskowitz.com',
          ...(process.env.GITHUB_TOKEN ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
        next: { revalidate: 3600 },
      }
    );
    if (eventsRes.ok) {
      const events: Array<{
        type: string;
        payload: { commits?: unknown[] };
        created_at: string;
      }> = await eventsRes.json();
      const cutoff = Date.now() - 30 * 86_400_000;
      githubMonthly = events
        .filter(e =>
          e.type === 'PushEvent' &&
          new Date(e.created_at).getTime() > cutoff
        )
        .reduce((sum, e) => sum + (e.payload.commits?.length ?? 0), 0);
    }
  } catch {
    // GitHub unreachable — use local counts only
  }

  const monthlyCount = Math.max(localMonthCount, githubMonthly);

  const stats: StatCard[] = [
    { n: monthlyCount || '—', label: 'commits this month' },
    { n: publicRepos  || '—', label: 'public repos' },
    { n: 4,                   label: 'apps shipped' },
    { n: 13,                  label: 'years building' },
  ];

  return NextResponse.json({ stats }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
}

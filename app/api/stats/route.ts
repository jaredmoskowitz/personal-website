import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';

const GITHUB_USER = 'jaredmoskowitz';

export interface StatCard {
  n:     number | string;
  label: string;
}

interface StoredCommit { date: string }
interface AgentStats {
  sessions_this_month: number;
  turns_this_month:    number;
  avg_turns:           number;
  top_project:         string;
}

async function commitCountThisMonth(): Promise<number> {
  try {
    const commits = await getData<StoredCommit>('commits');
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    return commits.filter(c => new Date(c.date).getTime() >= start).length;
  } catch {
    return 0;
  }
}

export async function GET() {
  const localMonthCount = await commitCountThisMonth();

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

  // Agent stats (populated by sync script)
  const agentStats = await getData<AgentStats>('agent-stats');
  const agent = agentStats[0];

  const stats: StatCard[] = [
    { n: monthlyCount || '—',               label: 'commits this month' },
    { n: publicRepos  || '—',               label: 'public repos' },
    { n: agent?.sessions_this_month || '—', label: 'AI sessions this month' },
    { n: agent?.turns_this_month    || '—', label: 'AI prompts this month' },
  ];

  return NextResponse.json({ stats }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
}

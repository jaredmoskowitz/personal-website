import { NextRequest, NextResponse } from 'next/server';
import { isLocalAdminContext } from '@/lib/is-local';
import { getData, setData } from '@/lib/storage';

const SECRET = process.env.READING_SECRET;

export interface AgentStats {
  sessions_this_month: number;
  turns_this_month:    number;
  avg_turns:           number;
  top_project:         string;
  updated_at:          string; // ISO
}

export async function GET() {
  const records = await getData<AgentStats>('agent-stats');
  return NextResponse.json({ agent_stats: records[0] ?? null });
}

export async function POST(req: NextRequest) {
  if (!isLocalAdminContext(req)) {
    const auth = req.headers.get('authorization');
    if (!SECRET || auth !== `Bearer ${SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const body = await req.json() as Partial<AgentStats>;

    const stats: AgentStats = {
      sessions_this_month: body.sessions_this_month ?? 0,
      turns_this_month:    body.turns_this_month    ?? 0,
      avg_turns:           body.avg_turns           ?? 0,
      top_project:         body.top_project         ?? '',
      updated_at:          new Date().toISOString(),
    };

    await setData('agent-stats', [stats]);

    return NextResponse.json({ ok: true, stats });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

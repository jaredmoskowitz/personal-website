import { NextRequest, NextResponse } from 'next/server';
import { getData, setData } from '@/lib/storage';

const SECRET = process.env.READING_SECRET;

export interface Episode {
  show:    string;
  episode: string;
  ts:      string; // ISO
}

export async function GET() {
  const episodes = await getData<Episode>('podcasts');
  return NextResponse.json({ podcasts: episodes.slice(0, 20) });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!SECRET || auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as { episodes?: Partial<Episode>[] } | Partial<Episode>;

    const incoming: Partial<Episode>[] = Array.isArray((body as { episodes?: unknown }).episodes)
      ? (body as { episodes: Partial<Episode>[] }).episodes
      : [body as Partial<Episode>];

    const validated: Episode[] = incoming
      .filter(e => e.show && e.episode && e.ts)
      .map(e => ({
        show:    e.show!,
        episode: e.episode!,
        ts:      e.ts!,
      }));

    if (validated.length === 0) {
      return NextResponse.json({ error: 'show, episode, ts required' }, { status: 400 });
    }

    const existing = await getData<Episode>('podcasts');
    const seenKeys = new Set(existing.map(e => `${e.show}|${e.episode}|${e.ts}`));
    const newOnly  = validated.filter(e => !seenKeys.has(`${e.show}|${e.episode}|${e.ts}`));

    const merged = [...newOnly, ...existing]
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 200);

    await setData('podcasts', merged);

    return NextResponse.json({ ok: true, added: newOnly.length, total: merged.length });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

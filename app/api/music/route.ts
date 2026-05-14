import { NextRequest, NextResponse } from 'next/server';
import { getData, setData } from '@/lib/storage';

const SECRET = process.env.READING_SECRET;

export interface Track {
  artist: string;
  track:  string;
  album:  string;
  ts:     string; // ISO
}

export async function GET() {
  const tracks = await getData<Track>('music');
  return NextResponse.json({ music: tracks.slice(0, 20) });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!SECRET || auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as { tracks?: Partial<Track>[] } | Partial<Track>;

    // Accept a single track or a batch array
    const incoming: Partial<Track>[] = Array.isArray((body as { tracks?: unknown }).tracks)
      ? (body as { tracks: Partial<Track>[] }).tracks
      : [body as Partial<Track>];

    const validated: Track[] = incoming
      .filter(t => t.artist && t.track && t.ts)
      .map(t => ({
        artist: t.artist!,
        track:  t.track!,
        album:  t.album ?? '',
        ts:     t.ts!,
      }));

    if (validated.length === 0) {
      return NextResponse.json({ error: 'artist, track, ts required' }, { status: 400 });
    }

    const existing = await getData<Track>('music');
    const seenKeys = new Set(existing.map(t => `${t.artist}|${t.track}|${t.ts}`));
    const newOnly  = validated.filter(t => !seenKeys.has(`${t.artist}|${t.track}|${t.ts}`));

    const merged = [...newOnly, ...existing]
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 200);

    await setData('music', merged);

    return NextResponse.json({ ok: true, added: newOnly.length, total: merged.length });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

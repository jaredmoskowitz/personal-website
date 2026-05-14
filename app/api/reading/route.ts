import { NextRequest, NextResponse } from 'next/server';
import { getData, setData } from '@/lib/storage';

const SECRET = process.env.READING_SECRET;

interface Article {
  title: string;
  source: string;
  date: string;
  url?: string;
  ts?: string; // ISO timestamp for sorting; omitted from API response
}

export async function GET() {
  const articles = await getData<Article>('reading');
  const sorted = [...articles].sort((a, b) => {
    if (a.ts && b.ts) return new Date(b.ts).getTime() - new Date(a.ts).getTime();
    if (a.ts) return -1;
    if (b.ts) return 1;
    return 0;
  });
  const response = sorted.slice(0, 20).map(({ ts: _ts, ...rest }) => rest);
  return NextResponse.json({ reading: response });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!SECRET || authHeader !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as Partial<Article>;
    const { title, source, url } = body;

    if (!title || !source) {
      return NextResponse.json({ error: 'title and source are required' }, { status: 400 });
    }

    const providedDate = typeof body.date === 'string' && body.date.trim() ? body.date.trim() : null;
    const providedTs   = typeof (body as { ts?: string }).ts === 'string' ? (body as { ts?: string }).ts : null;
    const article: Article = {
      title,
      source,
      date: providedDate ?? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ts:   providedTs ?? new Date().toISOString(),
      ...(url ? { url } : {}),
    };

    const articles = await getData<Article>('reading');
    const deduped  = articles.filter(a => a.title !== title);
    await setData('reading', [article, ...deduped].slice(0, 100));

    return NextResponse.json({ ok: true, article });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

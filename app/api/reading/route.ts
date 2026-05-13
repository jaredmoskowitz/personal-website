import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'reading.json');
const SECRET = process.env.READING_SECRET;

interface Article {
  title: string;
  source: string;
  date: string;
  url?: string;
  ts?: string; // ISO timestamp for sorting; omitted from API response
}

function loadArticles(): Article[] {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveArticles(articles: Article[]) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(articles, null, 2));
}

export async function GET() {
  const articles = loadArticles();
  const sorted = [...articles].sort((a, b) => {
    if (a.ts && b.ts) return new Date(b.ts).getTime() - new Date(a.ts).getTime();
    if (a.ts) return -1;
    if (b.ts) return 1;
    return 0; // preserve file order for items without ts (legacy)
  });
  // Strip internal ts field from response
  const response = sorted.slice(0, 20).map(({ ts: _ts, ...rest }) => rest);
  return NextResponse.json({ reading: response });
}

export async function POST(req: NextRequest) {
  // Auth check
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

    const articles = loadArticles();
    // Deduplicate by title
    const deduped = articles.filter(a => a.title !== title);
    saveArticles([article, ...deduped].slice(0, 100));

    return NextResponse.json({ ok: true, article });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

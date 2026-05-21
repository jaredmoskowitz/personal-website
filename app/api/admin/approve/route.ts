import { NextRequest, NextResponse } from 'next/server';
import { isLocalAdminContext } from '@/lib/is-local';
import { getData, setData } from '@/lib/storage';
import type { PendingArticle } from '@/app/api/reading/pending/route';

const SECRET = process.env.READING_SECRET;

function isAuthorized(req: NextRequest): boolean {
  if (isLocalAdminContext(req)) return true;
  const auth = req.headers.get('authorization');
  return !!SECRET && auth === `Bearer ${SECRET}`;
}

interface Article {
  title:  string;
  source: string;
  url?:   string;
  date:   string;
  ts?:    string;
}

// POST /api/admin/approve
// Body: { title: string }
// Moves an article from reading-pending → reading, then forwards to the live site if LIVE_API_URL is set.
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title } = await req.json() as { title?: string };
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    const pending = await getData<PendingArticle>('reading-pending');
    const article = pending.find(a => a.title === title);
    if (!article) return NextResponse.json({ error: 'Article not found in pending' }, { status: 404 });

    // Remove from pending
    await setData('reading-pending', pending.filter(a => a.title !== title));

    // Add to reading (deduplicated)
    const reading = await getData<Article>('reading');
    const deduped = reading.filter(a => a.title !== title);
    const approved: Article = {
      title:  article.title,
      source: article.source,
      date:   article.date,
      ts:     article.ts ?? new Date().toISOString(),
      ...(article.url ? { url: article.url } : {}),
    };
    await setData('reading', [approved, ...deduped].slice(0, 100));

    // Forward to live site if configured
    const liveUrl = process.env.LIVE_API_URL;
    let forwarded = false;
    if (liveUrl && SECRET) {
      try {
        const res = await fetch(`${liveUrl}/api/reading`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${SECRET}`,
          },
          body: JSON.stringify(approved),
        });
        forwarded = res.ok;
      } catch {
        // Live site unreachable — local write succeeded
      }
    }

    return NextResponse.json({ ok: true, article: approved, forwarded });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getData, setData } from '@/lib/storage';

const SECRET = process.env.READING_SECRET;

export interface PendingArticle {
  title:  string;
  source: string;
  url?:   string;
  date:   string;
  ts?:    string; // ISO
}

export async function GET() {
  const pending = await getData<PendingArticle>('reading-pending');
  return NextResponse.json({ pending });
}

export async function DELETE(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!SECRET || auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title } = await req.json() as { title?: string };
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    const pending = await getData<PendingArticle>('reading-pending');
    const filtered = pending.filter(a => a.title !== title);
    await setData('reading-pending', filtered);

    return NextResponse.json({ ok: true, removed: pending.length - filtered.length });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

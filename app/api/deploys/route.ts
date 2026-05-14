import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getData, setData } from '@/lib/storage';

const WEBHOOK_SECRET = process.env.VERCEL_WEBHOOK_SECRET;

export interface Deploy {
  project: string;
  sha:     string;
  msg:     string;
  branch:  string;
  status:  'ok' | 'fail';
  url:     string;
  date:    string; // ISO
}

export async function GET() {
  const deploys = await getData<Deploy>('deploys');
  return NextResponse.json({ deploys: deploys.slice(0, 20) });
}

// POST /api/deploys — Vercel webhook receiver.
// Configure in Vercel project settings → Webhooks → add URL + copy signing secret → VERCEL_WEBHOOK_SECRET env var.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (WEBHOOK_SECRET) {
    const sig      = req.headers.get('x-vercel-signature') ?? '';
    const computed = crypto.createHmac('sha1', WEBHOOK_SECRET).update(rawBody).digest('hex');
    if (sig !== computed) {
      return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
    }
  }

  let payload: {
    type?: string;
    createdAt?: number;
    payload?: {
      deployment?: {
        id?: string;
        name?: string;
        url?: string;
        meta?: {
          githubCommitSha?: string;
          githubCommitMessage?: string;
          githubCommitRef?: string;
        };
      };
      project?: { name?: string };
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type   = payload.type ?? '';
  const status: Deploy['status'] = type.includes('error') || type.includes('fail') ? 'fail' : 'ok';

  const dep     = payload.payload?.deployment ?? {};
  const project = payload.payload?.project?.name ?? dep.name ?? 'unknown';
  const meta    = dep.meta ?? {};

  const deploy: Deploy = {
    project,
    sha:    (meta.githubCommitSha ?? '').slice(0, 7),
    msg:    meta.githubCommitMessage?.split('\n')[0].slice(0, 80) ?? '',
    branch: meta.githubCommitRef ?? 'main',
    status,
    url:    dep.url ?? '',
    date:   payload.createdAt ? new Date(payload.createdAt).toISOString() : new Date().toISOString(),
  };

  const existing = await getData<Deploy>('deploys');
  await setData('deploys', [deploy, ...existing].slice(0, 100));

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'deploys.json');
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

function load(): Deploy[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function save(deploys: Deploy[]) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(deploys, null, 2));
}

export async function GET() {
  return NextResponse.json({ deploys: load().slice(0, 20) });
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

  const existing = load();
  save([deploy, ...existing].slice(0, 100));

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Commit } from '../route';

const DATA_PATH = path.join(process.cwd(), 'data', 'commits.json');
const SECRET    = process.env.READING_SECRET; // reuse same secret

function load(): Commit[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function save(commits: Commit[]) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(commits, null, 2));
}

// POST /api/commits/backfill
// Body: { commits: Array<{ repo, msg, sha, date }> }
// Used by scripts/backfill-commits.sh to upload local git history.
// Write endpoints work in local dev; in production, commit data/commits.json to git.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!SECRET || auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { commits?: Partial<Commit>[] };
  const incoming = body.commits ?? [];

  if (!Array.isArray(incoming) || incoming.length === 0) {
    return NextResponse.json({ error: 'commits array required' }, { status: 400 });
  }

  const validated: Commit[] = incoming
    .filter(c => c.repo && c.msg && c.sha && c.date)
    .map(c => ({
      repo: c.repo!,
      msg:  c.msg!.slice(0, 80),
      sha:  c.sha!.slice(0, 7),
      date: c.date!,
      when: '', // recomputed at read time by commits route
    }));

  const existing = load();
  const seenShas = new Set(existing.map(c => c.sha.slice(0, 7)));
  const newOnly  = validated.filter(c => !seenShas.has(c.sha.slice(0, 7)));

  const merged = [...newOnly, ...existing]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 2000);

  save(merged);

  return NextResponse.json({ ok: true, added: newOnly.length, total: merged.length });
}

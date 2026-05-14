'use client';

import { useEffect, useState, useCallback } from 'react';

interface PendingArticle {
  title:  string;
  source: string;
  url?:   string;
  date:   string;
  ts?:    string;
}

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function AdminPage() {
  const [items, setItems]   = useState<PendingArticle[]>([]);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reading/pending');
      const data = await res.json() as { pending: PendingArticle[] };
      setItems(data.pending ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function approve(title: string) {
    setStatus(s => ({ ...s, [title]: 'loading' }));
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${secret}`,
        },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setStatus(s => ({ ...s, [title]: 'done' }));
        setItems(prev => prev.filter(a => a.title !== title));
      } else {
        setStatus(s => ({ ...s, [title]: 'error' }));
      }
    } catch {
      setStatus(s => ({ ...s, [title]: 'error' }));
    }
  }

  async function reject(title: string) {
    setStatus(s => ({ ...s, [title]: 'loading' }));
    try {
      const res = await fetch('/api/reading/pending', {
        method: 'DELETE',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${secret}`,
        },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setItems(prev => prev.filter(a => a.title !== title));
        setStatus(s => { const n = { ...s }; delete n[title]; return n; });
      } else {
        setStatus(s => ({ ...s, [title]: 'error' }));
      }
    } catch {
      setStatus(s => ({ ...s, [title]: 'error' }));
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-mono">
      <h1 className="text-2xl font-bold mb-2">Reading Approval Queue</h1>
      <p className="text-zinc-400 text-sm mb-6">Local-only. Approve to push to the live site.</p>

      {/* Secret input */}
      <div className="mb-8">
        <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">READING_SECRET</label>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="paste secret from .env.local"
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm w-80 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />
      </div>

      {loading && <p className="text-zinc-500">Loading…</p>}

      {!loading && items.length === 0 && (
        <p className="text-zinc-500">Queue is empty. Run <code className="text-zinc-300">activity</code> to sync new articles.</p>
      )}

      <div className="space-y-3 max-w-3xl">
        {items.map(article => {
          const s = status[article.title];
          return (
            <div
              key={article.title}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                {article.url ? (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-zinc-100 hover:text-white line-clamp-2 leading-snug"
                  >
                    {article.title}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-zinc-100 line-clamp-2 leading-snug">
                    {article.title}
                  </p>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  {article.source} · {article.date}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => void approve(article.title)}
                  disabled={s === 'loading' || s === 'done'}
                  className="px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {s === 'loading' ? '…' : s === 'done' ? '✓' : 'Approve'}
                </button>
                <button
                  onClick={() => void reject(article.title)}
                  disabled={s === 'loading'}
                  className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 0 && (
        <p className="text-xs text-zinc-600 mt-8">{items.length} article{items.length !== 1 ? 's' : ''} pending</p>
      )}
    </main>
  );
}

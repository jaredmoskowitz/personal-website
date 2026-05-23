'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { JARED } from '@/lib/data';

// Cheap ordered fuzzy match. Returns score (lower=better) or -1 for no match.
function fuzzy(q: string, hay: string): number {
  if (!q) return 0;
  q = q.toLowerCase();
  hay = hay.toLowerCase();
  let qi = 0, last = -1, score = 0;
  for (let i = 0; i < hay.length && qi < q.length; i++) {
    if (hay[i] === q[qi]) {
      if (last >= 0) score += i - last - 1;
      last = i;
      qi++;
    }
  }
  if (qi < q.length) return -1;
  return score + (hay.length - last);
}

interface Item {
  id: string;
  kind: string;
  target: string;
  label: string;
  sub?: string;
  search: string;
}

function buildIndex(): Item[] {
  const J = JARED;
  const items: Item[] = [];

  [
    { id: 'tm-now',        label: 'Activity',  sub: 'live commits, reading, activity', kw: 'now activity live feed' },
    { id: 'tm-projects',   label: 'Projects',  sub: 'shipped + in-flight',             kw: 'projects shipped' },
    { id: 'tm-experience', label: 'Work',      sub: 'Hinge · Amazon · Microsoft',      kw: 'work experience job' },
    { id: 'tm-skills',     label: 'Stack',     sub: 'Mobile · Web · AI · Tools',       kw: 'stack skills tech' },
    { id: 'tm-contact',    label: 'Contact',   sub: J.email,                           kw: 'contact ping email' },
    { id: 'tm-intro',      label: 'Top',       sub: 'back to whoami',                  kw: 'top home whoami' },
  ].forEach(s => items.push({
    kind: 'section', id: s.id, target: s.id,
    label: s.label, sub: s.sub,
    search: s.label + ' ' + s.sub + ' ' + s.kw,
  }));

  J.featured.forEach(p => items.push({
    kind: 'project', id: 'proj-' + p.name, target: 'tm-projects',
    label: p.name, sub: p.tag,
    search: p.name + ' ' + p.tag + ' ' + p.desc + ' ' + p.stack.join(' '),
  }));
  J.secondary.forEach(p => items.push({
    kind: 'project', id: 'proj-' + p.name, target: 'tm-projects',
    label: p.name, sub: p.tag,
    search: p.name + ' ' + p.tag + ' ' + p.desc + ' ' + p.stack.join(' '),
  }));

  Object.entries(J.skills).forEach(([cat, skills]) => {
    items.push({
      kind: 'skills', id: 'skills-cat-' + cat, target: 'tm-skills',
      label: cat, sub: skills.length + ' items',
      search: cat + ' ' + skills.join(' '),
    });
    skills.forEach(s => items.push({
      kind: 'skill', id: 'skill-' + s, target: 'tm-skills',
      label: s, sub: cat, search: s + ' ' + cat,
    }));
  });

  J.commits.forEach(cm => items.push({
    kind: 'commit', id: 'cm-' + cm.sha, target: 'tm-now',
    label: cm.msg,
    sub: cm.sha.slice(0, 7) + ' · ' + cm.repo.split('/')[1] + ' · ' + cm.when,
    search: cm.msg + ' ' + cm.repo + ' ' + cm.sha,
  }));

  J.reading.forEach(r => items.push({
    kind: 'read', id: 'rd-' + r.title, target: 'tm-now',
    label: r.title, sub: r.source + ' · ' + r.date,
    search: r.title + ' ' + r.source,
  }));

  return items;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const index = useMemo(buildIndex, []);

  useEffect(() => {
    if (open) {
      setQ(''); setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!q.trim()) {
      return index.filter(it => it.kind === 'section' || it.kind === 'project').slice(0, 12);
    }
    const scored: { it: Item; s: number }[] = [];
    for (const it of index) {
      const s = fuzzy(q.trim(), it.search);
      if (s >= 0) scored.push({ it, s });
    }
    scored.sort((a, b) => a.s - b.s);
    return scored.slice(0, 14).map(x => x.it);
  }, [q, index]);

  useEffect(() => { setIdx(0); }, [q]);

  const activate = (it: Item) => {
    onClose();
    setTimeout(() => {
      document.getElementById(it.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape')    { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter')     { e.preventDefault(); const it = results[idx]; if (it) activate(it); }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-pal-idx="${idx}"]`) as HTMLElement;
    if (el) {
      const parent = listRef.current;
      const er = el.getBoundingClientRect();
      const pr = parent.getBoundingClientRect();
      if (er.top < pr.top) parent.scrollTop -= (pr.top - er.top);
      else if (er.bottom > pr.bottom) parent.scrollTop += (er.bottom - pr.bottom);
    }
  }, [idx, results]);

  if (!open) return null;

  return (
    <div
      className="pal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pal-box">
        {/* Input */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--rule)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span className="tm-acc" style={{ fontSize: 14 }}>⌘K</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="search sections, projects, commits, thoughts, reading…"
            style={{
              flex: 1, background: 'transparent', border: 0, outline: 'none',
              color: 'var(--ink)', fontSize: 15,
              fontFamily: 'inherit',
            }}
          />
          <span className="tm-soft" style={{ fontSize: 11 }}>esc</span>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: '50vh', overflowY: 'auto', padding: 6 }}>
          {results.length === 0 ? (
            <div style={{ padding: '32px 18px', color: 'var(--soft)', fontSize: 13, textAlign: 'center' }}>
              no matches. try:{' '}
              <span className="tm-acc">swiftui</span>,{' '}
              <span className="tm-acc">vault</span>,{' '}
              <span className="tm-acc">haptics</span>
            </div>
          ) : results.map((it, i) => (
            <button
              key={it.id}
              data-pal-idx={i}
              onClick={() => activate(it)}
              onMouseEnter={() => setIdx(i)}
              style={{
                display: 'grid', gridTemplateColumns: '78px 1fr auto', gap: 12,
                alignItems: 'center', width: '100%', textAlign: 'left',
                padding: '10px 12px', border: 0, borderRadius: 6, cursor: 'pointer',
                background: i === idx ? 'rgba(128,128,128,0.1)' : 'transparent',
                color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit',
                transition: 'background .08s',
              }}
            >
              <span style={{
                fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase',
                color: i === idx ? 'var(--accent)' : 'var(--soft)',
                textAlign: 'right',
              }}>{it.kind}</span>
              <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="tm-ink" style={{
                  fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{it.label}</span>
                {it.sub && (
                  <span className="tm-soft" style={{
                    fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{it.sub}</span>
                )}
              </span>
              <span style={{ color: i === idx ? 'var(--accent)' : 'transparent', fontSize: 13 }}>↵</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '9px 16px', borderTop: '1px solid var(--rule)',
          display: 'flex', gap: 14, color: 'var(--soft)', fontSize: 11,
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>
            <span className="tm-dim">↑↓</span> navigate · <span className="tm-dim">↵</span> jump · <span className="tm-dim">esc</span> close
          </span>
          <span>{results.length} of {index.length}</span>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import CmdLine from './CmdLine';
import { JARED } from '@/lib/data';
import type { StatCard } from '@/app/api/stats/route';

interface Commit {
  repo: string;
  msg:  string;
  sha:  string;
  when: string;
}

interface Article {
  title:  string;
  source: string;
  date:   string;
  url?:   string;
}

export default function ActivitySection() {
  const [commits, setCommits] = useState<Commit[]>(JARED.commits as unknown as Commit[]);
  const [reading, setReading] = useState<Article[]>(JARED.reading as unknown as Article[]);
  const [stats,   setStats  ] = useState<StatCard[]>(JARED.stats  as unknown as StatCard[]);

  useEffect(() => {
    fetch('/api/commits')
      .then(r => r.json())
      .then((d: { commits: Commit[] }) => { if (d.commits?.length) setCommits(d.commits); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/reading')
      .then(r => r.json())
      .then((d: { reading: Article[] }) => { if (d.reading?.length) setReading(d.reading); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then((d: { stats: StatCard[] }) => { if (d.stats?.length) setStats(d.stats); })
      .catch(() => {});
  }, []);

  return (
    <section id="tm-now" className="tm-section" style={{ marginBottom: 96 }}>
      <CmdLine>tail -f ~/.activity</CmdLine>
      <p style={{ marginTop: 18, fontSize: 14.5, color: 'var(--body)', maxWidth: 720, lineHeight: 1.7 }}>
        Everything I'm doing right now, pulled live. Commits straight from GitHub, thoughts from a JSON file in this repo, articles auto-logged by a chrome extension I wrote for myself.
      </p>

      {/* Stats */}
      <div style={{
        marginTop: 24, display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
      }} className="stats-grid">
        <style>{`
          @media (max-width: 760px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        `}</style>
        {stats.map(s => (
          <div key={s.label} className="tm-card" style={{ padding: '18px 18px' }}>
            <div className="tm-acc tm-num" style={{
              fontSize: 30, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1,
            }}>{s.n}</div>
            <div className="tm-soft" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Full commit log */}
      <div className="tm-card" style={{ marginTop: 18 }}>
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid var(--rule)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span className="tm-pulse" />
          <span className="tm-h2">git log</span>
          <span className="tm-soft" style={{ fontSize: 13 }}>// --author=jared --since=2w</span>
          <span style={{ flex: 1 }} />
          <span className="tm-soft" style={{ fontSize: 12 }}>{commits.length} commits</span>
        </div>
        {commits.map((cm, i) => (
          <a
            key={cm.sha}
            className="tm-commit tm-row-link commit-row"
            href="#"
            style={{
              display: 'grid',
              gridTemplateColumns: '76px 1fr 220px 90px', gap: 18,
              alignItems: 'baseline', padding: '14px 22px',
              borderTop: i === 0 ? 'none' : '1px solid var(--rule)',
            }}
          >
            <style>{`
              @media (max-width: 760px) {
                .commit-row { grid-template-columns: 60px 1fr auto !important; gap: 10px !important; }
                .commit-repo { display: none !important; }
              }
            `}</style>
            <span className="tm-acc tm-num" style={{ fontSize: 13 }}>{cm.sha.slice(0, 7)}</span>
            <span className="tm-msg tm-ink" style={{ fontSize: 14.5, transition: 'color .15s' }}>{cm.msg}</span>
            <span className="tm-dim commit-repo" style={{ fontSize: 13 }}>{cm.repo.split('/')[1]}</span>
            <span className="tm-soft" style={{ fontSize: 12.5, textAlign: 'right' }}>{cm.when}</span>
          </a>
        ))}
      </div>

      {/* Thoughts + reading */}
      <div style={{
        marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18,
      }} className="thoughts-grid">
        <style>{`@media (max-width: 760px) { .thoughts-grid { grid-template-columns: 1fr !important; } }`}</style>

        {/* Thoughts */}
        <div className="tm-card">
          <div style={{
            padding: '16px 22px', borderBottom: '1px solid var(--rule)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span className="tm-h2">thoughts</span>
            <span className="tm-soft" style={{ fontSize: 13 }}>// thoughts.jsonl</span>
          </div>
          {JARED.thoughts.map((t, i) => (
            <div key={i} style={{
              padding: '18px 22px',
              borderTop: i === 0 ? 'none' : '1px solid var(--rule)',
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 8 }}>
                <span className="tm-soft" style={{ fontSize: 12 }}>{t.date}</span>
                <span className="tm-acc" style={{ fontSize: 12 }}>{t.tags.map(x => '#' + x).join(' ')}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: 'var(--body)' }}>{t.body}</p>
            </div>
          ))}
        </div>

        {/* Reading */}
        <div className="tm-card">
          <div style={{
            padding: '16px 22px', borderBottom: '1px solid var(--rule)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span className="tm-h2">reading</span>
            <span className="tm-soft" style={{ fontSize: 13 }}>// last 30d</span>
            <span style={{ flex: 1 }} />
            <span className="tm-soft" style={{ fontSize: 12 }}>{reading.length}</span>
          </div>
          {reading.map((r, i) => (
            <a
              key={r.title}
              href={r.url ?? '#'}
              target={r.url ? '_blank' : undefined}
              rel={r.url ? 'noopener noreferrer' : undefined}
              className="tm-row-link"
              style={{
                display: 'block', padding: '14px 22px',
                borderTop: i === 0 ? 'none' : '1px solid var(--rule)',
              }}
            >
              <div className="tm-ink" style={{ fontSize: 14.5, lineHeight: 1.5 }}>{r.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span className="tm-dim" style={{ fontSize: 12.5 }}>{r.source}</span>
                <span className="tm-soft" style={{ fontSize: 12 }}>{r.date}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

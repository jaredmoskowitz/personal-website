'use client';

import { useState, useEffect } from 'react';
import CmdLine from './CmdLine';
import { JARED } from '@/lib/data';

interface Commit  { repo: string; msg: string; sha: string; when: string; }
interface Article { title: string; source: string; date: string; url?: string; }
interface ListenEvent { type: string; text: string; source: string; time: string; }

export default function Hero() {
  const J = JARED;
  const [commits,   setCommits  ] = useState<Commit[]>(JARED.commits as unknown as Commit[]);
  const [reading,   setReading  ] = useState<Article[]>(JARED.reading as unknown as Article[]);
  const [lastPlayed, setLastPlayed] = useState<ListenEvent | null>(null);

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
    fetch('/api/events')
      .then(r => r.json())
      .then((d: { events: ListenEvent[] }) => {
        const ev = d.events?.find(e => e.type === 'music' || e.type === 'playing' || e.type === 'podcast');
        if (ev) setLastPlayed(ev);
      })
      .catch(() => {});
  }, []);

  return (
    <section id="tm-intro" className="tm-section" style={{ marginBottom: 96 }}>
      <CmdLine>whoami --full</CmdLine>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'clamp(300px, 52%, 600px) 1fr',
        gap: 40, marginTop: 36, alignItems: 'start',
      }} className="hero-grid">
        <style>{`
          @media (max-width: 760px) { .hero-grid { grid-template-columns: 1fr !important; gap: 24px !important; } }
        `}</style>

        {/* Left: identity */}
        <div>
          <h1 className="tm-h1">
            jared<br />moskowitz<span className="tm-blink tm-acc">_</span>
          </h1>
          <div style={{ marginTop: 22, fontSize: 14.5, lineHeight: 1.85, color: 'var(--body)' }}>
            <div><span className="tm-acc">$</span>{'  '}role: senior ios engineer @ <span className="tm-ink">hinge</span></div>
            <div><span className="tm-acc">$</span>{'  '}building: <span className="tm-ink">sesh · today · moskowitz labs</span></div>
            <div><span className="tm-acc">$</span>{'  '}previously: amazon · microsoft · founder</div>
            <div><span className="tm-acc">$</span>{'  '}based: {J.location.toLowerCase()}, ny</div>
          </div>
          <p style={{ marginTop: 24, fontSize: 15, lineHeight: 1.75, color: 'var(--body)' }}>
            {J.intro.long}
          </p>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <a className="tm-link" href={`https://${J.social.github}`} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
              {J.social.github}
            </a>
            <a className="tm-link" href={`https://${J.social.linkedin}`} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              linkedin
            </a>
          </div>
        </div>

        {/* Right: right-now panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Last 3 commits */}
          <div className="tm-card">
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span className="tm-pulse" />
              <span className="tm-acc" style={{ fontSize: 12 }}>$</span>
              <span className="tm-soft" style={{ fontSize: 12, letterSpacing: '.06em' }}>git log -n 3</span>
              <span style={{ flex: 1 }} />
              <a
                href="#tm-now"
                className="tm-soft"
                style={{ fontSize: 12, textDecoration: 'none' }}
                onClick={e => {
                  e.preventDefault();
                  document.getElementById('tm-now')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >all →</a>
            </div>
            {commits.slice(0, 3).map((cm, i) => (
              <a
                key={cm.sha}
                href="#"
                className="tm-row-link tm-commit"
                style={{
                  display: 'grid', gridTemplateColumns: '60px 1fr 60px', gap: 10,
                  padding: '10px 16px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--rule)',
                  alignItems: 'baseline', textDecoration: 'none',
                }}
              >
                <span className="tm-acc tm-num" style={{ fontSize: 12 }}>{cm.sha.slice(0, 7)}</span>
                <span className="tm-msg tm-ink" style={{
                  fontSize: 13, lineHeight: 1.4, transition: 'color .15s',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{cm.msg}</span>
                <span className="tm-soft" style={{ fontSize: 11, textAlign: 'right' }}>{cm.when}</span>
              </a>
            ))}
          </div>

          {/* Last listened */}
          {lastPlayed && (
            <div className="tm-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className="tm-soft" style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase' }}>
                  {lastPlayed.type === 'podcast' ? 'listening to' : 'last played'}
                </span>
                <span style={{ flex: 1 }} />
                <span className="tm-soft" style={{ fontSize: 11 }}>{lastPlayed.time}</span>
              </div>
              <div className="tm-ink" style={{ fontSize: 14, lineHeight: 1.5 }}>{lastPlayed.text}</div>
              <div className="tm-dim" style={{ fontSize: 12.5, marginTop: 4 }}>{lastPlayed.source}</div>
            </div>
          )}

          {/* Just read */}
          <div className="tm-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="tm-soft" style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase' }}>just read</span>
              <span style={{ flex: 1 }} />
              <span className="tm-soft" style={{ fontSize: 11 }}>{reading[0]?.date}</span>
            </div>
            <div className="tm-ink" style={{ fontSize: 14, lineHeight: 1.45 }}>{reading[0]?.title}</div>
            <div className="tm-dim" style={{ fontSize: 12.5, marginTop: 4 }}>{reading[0]?.source}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

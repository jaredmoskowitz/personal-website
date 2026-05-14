'use client';

import { useState, useEffect } from 'react';
import CmdLine from './CmdLine';
import { JARED } from '@/lib/data';

interface Commit  { repo: string; msg: string; sha: string; when: string; }
interface Article { title: string; source: string; date: string; url?: string; }

export default function Hero() {
  const J = JARED;
  const [commits, setCommits] = useState<Commit[]>(JARED.commits as unknown as Commit[]);
  const [reading, setReading] = useState<Article[]>(JARED.reading as unknown as Article[]);

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
          <div style={{ marginTop: 24, display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 14 }}>
            <a className="tm-link" href={`mailto:${J.email}`}>{J.email}</a>
            <a className="tm-link" href={`https://${J.social.github}`} target="_blank" rel="noopener">{J.social.github}</a>
            <a className="tm-link" href={`https://${J.social.twitter}`} target="_blank" rel="noopener">{J.social.twitter}</a>
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

          {/* Latest deploy */}
          <div className="tm-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="tm-soft" style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase' }}>latest deploy</span>
              <span style={{ flex: 1 }} />
              <span className="tm-soft" style={{ fontSize: 11 }}>{J.events.find(e => e.type === 'deploy')?.time}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--body)' }}>
              {J.events.find(e => e.type === 'deploy')?.text}
            </p>
            <div className="tm-acc" style={{ marginTop: 8, fontSize: 12 }}>
              {J.events.find(e => e.type === 'deploy')?.source}
            </div>
          </div>

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

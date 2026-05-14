import Image from 'next/image';
import CmdLine from './CmdLine';
import { JARED } from '@/lib/data';

const PROJECT_IMAGES: Record<string, string> = {
  Sesh:  '/sesh-hero.png',
  Today: '/today-hero.png',
};

export default function ProjectsSection() {
  const J = JARED;

  return (
    <section id="tm-projects" className="tm-section" style={{ marginBottom: 96 }}>
      <CmdLine>ls -lah ~/shipped</CmdLine>

      {/* Featured projects */}
      <div style={{
        marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
      }} className="featured-grid">
        <style>{`@media (max-width: 760px) { .featured-grid { grid-template-columns: 1fr !important; } }`}</style>
        {J.featured.map(p => (
          <div key={p.name} className="tm-card" style={{ padding: 26 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline',
              justifyContent: 'space-between', marginBottom: 4,
            }}>
              <h3 className="tm-display" style={{ fontSize: 30 }}>{p.name.toLowerCase()}</h3>
              <span className="tm-acc" style={{ fontSize: 12 }}>★ featured · {p.year}</span>
            </div>
            <div className="tm-meta" style={{ marginBottom: 18, color: 'var(--body)', fontSize: 14 }}>{p.tag}</div>
            {PROJECT_IMAGES[p.name] ? (
              <div style={{
                borderRadius: 8, overflow: 'hidden', background: 'var(--surf)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 220,
              }}>
                <Image
                  src={PROJECT_IMAGES[p.name]}
                  alt={`${p.name} screenshot`}
                  width={330}
                  height={220}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </div>
            ) : (
              <div className="tm-placeholder">
                <span className="tm-soft" style={{ fontSize: 12 }}>[ {p.name.toUpperCase()}_HERO.PNG ]</span>
              </div>
            )}
            <p style={{ marginTop: 18, fontSize: 14.5, color: 'var(--body)', lineHeight: 1.65, minHeight: 76 }}>{p.desc}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {p.stack.map(s => <span key={s} className="tm-pill">{s}</span>)}
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 20, fontSize: 14 }}>
              {p.links.map(l => (
                <a key={l.label} className="tm-link" href={l.url}>→ {l.label.toLowerCase()}</a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary projects */}
      <div className="tm-card" style={{ marginTop: 22 }}>
        {J.secondary.map((p, i) => (
          <div key={p.name} style={{
            padding: '20px 26px',
            borderTop: i === 0 ? 'none' : '1px solid var(--rule)',
            display: 'grid', gridTemplateColumns: '1.6fr 1fr 110px', gap: 24, alignItems: 'center',
          }} className="secondary-row">
            <style>{`
              @media (max-width: 760px) {
                .secondary-row { grid-template-columns: 1fr !important; gap: 8px !important; }
                .secondary-row .sec-stack { display: none; }
              }
            `}</style>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span className="tm-acc tm-h2">{p.name.toLowerCase()}</span>
                <span className="tm-meta">— {p.tag.toLowerCase().replace(/\.$/, '')}</span>
              </div>
              <p style={{ margin: '6px 0 0', color: 'var(--body)', fontSize: 14, lineHeight: 1.6 }}>{p.desc}</p>
            </div>
            <div className="tm-soft sec-stack" style={{ fontSize: 12.5, letterSpacing: '.01em' }}>
              {p.stack.join(' · ')}
            </div>
            {p.links[0].url !== '#' ? (
              <a className="tm-link" href={p.links[0].url} target="_blank" rel="noopener" style={{ fontSize: 14, justifySelf: 'end' }}>
                {p.links[0].label.toLowerCase()} →
              </a>
            ) : (
              <span className="tm-soft" style={{ fontSize: 13, justifySelf: 'end' }}>{p.links[0].label.toLowerCase()}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

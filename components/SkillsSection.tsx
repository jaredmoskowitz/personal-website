import CmdLine from './CmdLine';
import { JARED } from '@/lib/data';

export default function SkillsSection() {
  const entries = Object.entries(JARED.skills);

  return (
    <section id="tm-skills" className="tm-section" style={{ marginBottom: 96 }}>
      <CmdLine>stack --tree</CmdLine>
      <div style={{ marginTop: 24 }}>
        {entries.map(([cat, items], i) => (
          <div key={cat} style={{
            display: 'grid', gridTemplateColumns: '200px 1fr', gap: 32,
            padding: '22px 0',
            borderTop: i === 0 ? 'none' : '1px solid var(--rule)',
          }} className="skills-row">
            <style>{`@media (max-width: 760px) { .skills-row { grid-template-columns: 1fr !important; gap: 8px !important; } }`}</style>
            <div>
              <div className="tm-h2">
                <span className="tm-acc">▸ </span>{cat.toLowerCase()}
              </div>
              <div className="tm-soft" style={{ fontSize: 12, marginTop: 4, marginLeft: 20 }}>
                {items.length} items
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {items.map(s => <span key={s} className="tm-pill">{s}</span>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

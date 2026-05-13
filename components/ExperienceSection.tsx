import CmdLine from './CmdLine';
import { JARED } from '@/lib/data';

export default function ExperienceSection() {
  return (
    <section id="tm-experience" className="tm-section" style={{ marginBottom: 96 }}>
      <CmdLine>cat work.log</CmdLine>
      <div style={{ marginTop: 24 }}>
        {JARED.experience.map((job, i) => (
          <article key={i} style={{
            padding: '32px 0',
            borderTop: i === 0 ? 'none' : '1px solid var(--rule)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', flexWrap: 'wrap',
              gap: 16, marginBottom: 6,
            }}>
              <h3 className="tm-display">
                <span className="tm-acc">{job.company.toLowerCase()}</span>
                <span className="tm-soft" style={{ margin: '0 12px', fontWeight: 400 }}>/</span>
                <span className="tm-ink">{job.role.toLowerCase()}</span>
              </h3>
            </div>
            <div className="tm-meta" style={{ marginBottom: 18 }}>
              {job.range}{'  '}·{'  '}{job.city.toLowerCase()}
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {job.bullets.map((b, j) => (
                <li key={j} className="tm-bullet">
                  <span className="mark">→</span>
                  <span className="txt">{b}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

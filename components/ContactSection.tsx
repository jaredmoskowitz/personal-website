import CmdLine from './CmdLine';
import { JARED } from '@/lib/data';

export default function ContactSection() {
  const J = JARED;

  return (
    <section id="tm-contact" className="tm-section" style={{ marginBottom: 32 }}>
      <CmdLine>{`open linkedin && exit`}</CmdLine>
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 36, letterSpacing: '-0.02em', fontWeight: 600 }}>
          <a
            className="tm-link"
            href={`https://${J.social.linkedin}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', borderBottomColor: 'var(--accent)' }}
          >
            linkedin ↗
          </a>
        </div>
        <p style={{ marginTop: 18, color: 'var(--body)', fontSize: 15, maxWidth: 620, lineHeight: 1.7 }}>
          For work, collaborations, or anything you'd ordinarily DM.
        </p>
        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 22, fontSize: 14 }}>
          <a className="tm-link" href={`https://${J.social.github}`} target="_blank" rel="noopener">{J.social.github}</a>
          <a className="tm-link" href={`https://${J.social.linkedin}`} target="_blank" rel="noopener">{J.social.linkedin}</a>
          <a className="tm-link" href={`https://${J.social.twitter}`} target="_blank" rel="noopener">{J.social.twitter}</a>
        </div>
        <div className="tm-soft" style={{ marginTop: 64, fontSize: 13 }}>
          <span style={{ color: 'var(--green)' }}>jared@jaredmoskowitz</span>
          <span className="tm-dim">:</span>
          <span className="tm-acc">~$</span>{' '}exit<span className="tm-blink">_</span>
        </div>
      </div>
    </section>
  );
}

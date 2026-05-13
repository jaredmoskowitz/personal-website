'use client';

import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'tm-now',        label: 'now',     n: '01' },
  { id: 'tm-experience', label: 'work',    n: '02' },
  { id: 'tm-projects',   label: 'shipped', n: '03' },
  { id: 'tm-skills',     label: 'stack',   n: '04' },
  { id: 'tm-contact',    label: 'ping',    n: '05' },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Rail() {
  const [active, setActive] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <aside className="hide-mobile" style={{
      position: 'sticky', top: 92, alignSelf: 'flex-start',
      padding: '48px 0 48px 32px', minWidth: 200, flexShrink: 0,
    }}>
      <div className="tm-soft" style={{
        fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 14,
      }}>jump to</div>
      {SECTIONS.map(s => (
        <button
          key={s.id}
          className={`tm-railitem${active === s.id ? ' active' : ''}`}
          onClick={() => scrollTo(s.id)}
        >
          <span className="num">{s.n}</span>
          <span>~/{s.label}</span>
        </button>
      ))}
    </aside>
  );
}

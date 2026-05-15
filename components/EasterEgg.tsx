'use client';

import { useEffect, useState } from 'react';
import { EE_RESPONSES } from '@/lib/data';

const TRIGGERS = Object.keys(EE_RESPONSES);
const MAX_BUF = Math.max(...TRIGGERS.map(k => k.length));

interface Toast {
  trigger: string;
  at: number;
}

export default function EasterEgg() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    let buf = '';
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-MAX_BUF);
      for (const trig of TRIGGERS) {
        if (buf.endsWith(trig)) {
          setToast({ trigger: trig, at: Date.now() });
          buf = '';
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  const lines = EE_RESPONSES[toast.trigger] || [];

  return (
    <div className="tm-ee" onClick={() => setToast(null)}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
      }}>
        <span className="tm-pulse" style={{ background: 'var(--accent)' }} />
        <span className="tm-soft" style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          caught a command
        </span>
        <span style={{ flex: 1 }} />
        <span className="tm-soft" style={{ fontSize: 11, cursor: 'pointer' }}>esc</span>
      </div>
      {lines.map((ln, i) => (
        <div
          key={i}
          style={{
            fontSize: 12.5, lineHeight: 1.55,
            color: ln.startsWith('$') ? 'var(--accent)' : 'var(--body)',
            fontFamily: 'inherit',
          }}
        >
          {ln}
        </div>
      ))}
    </div>
  );
}

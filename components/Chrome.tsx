'use client';

import { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { JARED, SCHEMES, EVENT_META, type SchemeId } from '@/lib/data';

interface LiveEvent {
  type:    string;
  sha?:    string;
  text:    string;
  source:  string;
  time:    string;
  status?: string;
}

interface Props {
  onOpenPalette: () => void;
}

const STATIC_EVENTS = JARED.events as unknown as LiveEvent[];

export default function Chrome({ onOpenPalette }: Props) {
  const { theme, toggleTheme, scheme, setScheme } = useTheme();
  const [events,  setEvents ] = useState<LiveEvent[]>(STATIC_EVENTS);
  const [tickIdx, setTickIdx] = useState(0);

  useEffect(() => {
    function load() {
      fetch('/api/events')
        .then(r => r.json())
        .then((d: { events: LiveEvent[] }) => {
          if (d.events?.length) setEvents(d.events);
        })
        .catch(() => {});
    }
    load();
    const refresh = setInterval(load, 5 * 60_000);
    return () => clearInterval(refresh);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTickIdx(i => (i + 1) % events.length), 3600);
    return () => clearInterval(t);
  }, [events.length]);

  const tick = events[tickIdx];
  const meta = EVENT_META[tick.type] || { tag: tick.type, glyph: '?' };
  const isDeployTick = tick.type === 'deploy';
  const tickColorStyle: React.CSSProperties = isDeployTick
    ? { color: 'var(--green)' }
    : (tick.type === 'playing' || tick.type === 'reading')
      ? { color: 'var(--body)' }
      : { color: 'var(--accent)' };

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 5,
      background: 'var(--bg)', borderBottom: '1px solid var(--rule)',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 16,
      }} className="tm-chrome-row">
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 7 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', opacity: 0.85 }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', opacity: 0.75 }} />
        </div>
        <span className="tm-dim hide-mobile" style={{ fontSize: 13, marginLeft: 10 }}>
          jared@jaredmoskowitz:~ — long view
        </span>
        <span style={{ flex: 1 }} />

        {/* Scheme swatches */}
        <div className="hide-mobile" style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {SCHEMES.map(s => (
            <button
              key={s.id}
              onClick={() => setScheme(s.id as SchemeId)}
              title={s.name}
              style={{
                width: 16, height: 16, borderRadius: '50%', border: 'none', padding: 0,
                background: theme === 'dark' ? s.darkAccent : s.lightAccent,
                cursor: 'pointer',
                outline: scheme === s.id ? '2px solid var(--ink)' : '2px solid transparent',
                outlineOffset: 1,
                transition: 'transform 0.15s, outline-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            />
          ))}
        </div>

        <button className="tm-kbd" onClick={onOpenPalette} aria-label="Open command palette">
          <span>search</span>
          <kbd>⌘K</kbd>
        </button>
        <button className="tm-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? 'theme --light' : 'theme --dark'}
        </button>
      </div>

      {/* Multi-source ticker */}
      <div style={{
        padding: '8px 28px', display: 'flex', alignItems: 'center', gap: 14,
        borderTop: '1px solid var(--rule)', background: 'var(--surf)',
        fontSize: 13,
      }}>
        <span
          className="tm-pulse"
          style={{ background: isDeployTick ? 'var(--green)' : 'var(--accent)' }}
        />
        <span className="tm-soft hide-mobile" style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase' }}>live</span>
        <span className="tm-soft hide-mobile">·</span>

        <span key={tickIdx} className="tm-tick-enter" style={{
          display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1,
          overflow: 'hidden',
        }}>
          <span className="tm-tk-tag" style={tickColorStyle}>{meta.tag}</span>
          {'sha' in tick && tick.sha && (
            <span className="tm-num" style={{ fontSize: 12, ...tickColorStyle }}>{tick.sha.slice(0, 7)}</span>
          )}
          {tick.type === 'deploy' && <span style={{ color: 'var(--green)', fontSize: 12 }}>✓</span>}
          <span className="tm-ink" style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
          }}>{tick.text}</span>
          <span className="tm-dim hide-mobile" style={{ fontSize: 12, flexShrink: 0 }}>· {tick.source}</span>
          <span className="tm-soft hide-mobile" style={{ fontSize: 12, flexShrink: 0 }}>{tick.time}</span>
        </span>

        <a
          href="#tm-now"
          className="tm-soft hide-mobile"
          style={{ fontSize: 12, textDecoration: 'none', flexShrink: 0 }}
          onClick={e => {
            e.preventDefault();
            document.getElementById('tm-now')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          see all →
        </a>
      </div>
    </div>
  );
}

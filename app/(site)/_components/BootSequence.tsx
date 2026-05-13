'use client';

import { useEffect, useRef, useState } from 'react';

// ── Timing constants (ms) ──────────────────────────────────────────
const CHAR_DELAY   = 45;   // ms per character during typing
const POST_CMD     = 300;  // pause after command finishes before output
const LINE_DELAY   = 190;  // ms between output lines
const PRE_FADE     = 420;  // pause after last line before fade starts
const FADE_DUR     = 480;  // duration of the fade-out transition

// ── Copy ──────────────────────────────────────────────────────────
const BOOT_CMD = './build-site --portfolio --owner=jared';

// null = blank gap line
const BOOT_OUT: (null | { text: string; ok?: boolean; ready?: boolean })[] = [
  { text: '→ fetching commits       ', ok: true },
  { text: '→ fetching thoughts      ', ok: true },
  { text: '→ fetching reading-list  ', ok: true },
  { text: '→ compiling sections     ', ok: true },
  { text: '→ binding ⌘K             ', ok: true },
  null,
  { text: 'ready. opening site.', ready: true },
];

const SESSION_KEY = 'jaredmoskowitz:booted';

type Phase = 'typing' | 'output' | 'fading' | 'done';

export default function BootSequence() {
  const [phase, setPhase]       = useState<Phase>('typing');
  const [typedLen, setTypedLen] = useState(0);
  const [visLines, setVisLines] = useState(0);
  const [fading, setFading]     = useState(false);
  const [show, setShow]         = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const skipped = useRef(false);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function addTimer(fn: () => void, delay: number) {
    const id = setTimeout(fn, delay);
    timers.current.push(id);
  }

  function startFade() {
    setPhase('fading');
    setFading(true);
    addTimer(() => {
      setShow(false);
      setPhase('done');
    }, FADE_DUR);
  }

  function showAllAndFade() {
    // Skip to fully-revealed state, then fade after a brief beat.
    setTypedLen(BOOT_CMD.length);
    setVisLines(BOOT_OUT.length);
    setPhase('output');
    addTimer(startFade, 380);
  }

  function skip() {
    if (skipped.current || phase === 'fading' || phase === 'done') return;
    skipped.current = true;
    clearTimers();
    showAllAndFade();
  }

  useEffect(() => {
    // prefers-reduced-motion: skip entirely
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // ?skipBoot=1 dev escape
    if (new URLSearchParams(window.location.search).get('skipBoot') === '1') return;

    // sessionStorage gate — once per session
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {}

    setShow(true);
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = '';
      clearTimers();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 1: type command char by char
  useEffect(() => {
    if (!show) return;
    if (phase !== 'typing') return;

    if (typedLen < BOOT_CMD.length) {
      addTimer(() => setTypedLen(n => n + 1), CHAR_DELAY);
    } else {
      // Command fully typed — pause then start output
      addTimer(() => setPhase('output'), POST_CMD);
    }
  }, [show, phase, typedLen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2: stream output lines
  useEffect(() => {
    if (!show) return;
    if (phase !== 'output') return;

    if (visLines < BOOT_OUT.length) {
      addTimer(() => setVisLines(n => n + 1), LINE_DELAY);
    } else {
      // All lines visible — pause then fade
      addTimer(startFade, PRE_FADE);
    }
  }, [show, phase, visLines]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore scroll when done
  useEffect(() => {
    if (phase === 'done') {
      document.documentElement.style.overflow = '';
    }
  }, [phase]);

  if (!show && phase !== 'fading') return null;
  if (phase === 'done') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Site loading"
      tabIndex={0}
      onClick={skip}
      onKeyDown={e => {
        if (e.key === 'Tab') return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          skip();
        } else {
          skip();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"JetBrains Mono", "Berkeley Mono", ui-monospace, "SF Mono", monospace',
        cursor: 'default',
        opacity: fading ? 0 : 1,
        transition: fading ? `opacity ${FADE_DUR}ms ease` : undefined,
      }}
    >
      {/* ── Window chrome ── */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--rule)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 7 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--red)',   display: 'inline-block' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', opacity: 0.85 }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', opacity: 0.75 }} />
        </div>
        <span style={{ color: 'var(--dim)', fontSize: 13 }}>
          jared@jaredmoskowitz:~ — booting
        </span>
      </div>

      {/* ── Main content ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 600 }}>

          {/* Prompt + typed command */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            fontSize: 16,
            marginBottom: 28,
          }}>
            <span style={{ color: 'var(--green)', userSelect: 'none' }}>jared@jaredmoskowitz</span>
            <span style={{ color: 'var(--dim)',   userSelect: 'none' }}>:</span>
            <span style={{ color: 'var(--accent)', userSelect: 'none' }}>~$</span>
            <span style={{ color: 'var(--ink)', fontSize: 16 }}>
              {BOOT_CMD.slice(0, typedLen)}
              {/* Blinking caret — only when actively typing */}
              {phase === 'typing' && (
                <span className="boot-caret" aria-hidden>_</span>
              )}
            </span>
          </div>

          {/* Output lines */}
          <div
            aria-label={visLines === BOOT_OUT.length ? BOOT_OUT.filter(Boolean).map(l => (l as { text: string }).text).join('. ') : undefined}
            style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
          >
            {BOOT_OUT.slice(0, visLines).map((line, i) => {
              if (line === null) {
                return <div key={i} style={{ height: 18 }} aria-hidden />;
              }
              return (
                <div key={i} style={{
                  display: 'flex',
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: line.ready ? 'var(--accent)' : 'var(--body)',
                  fontWeight: line.ready ? 500 : 400,
                }}>
                  {!line.ready && (
                    <>
                      <span style={{ flex: 1 }}>{line.text}</span>
                      {line.ok && (
                        <span style={{ color: 'var(--green)', userSelect: 'none' }}>ok</span>
                      )}
                    </>
                  )}
                  {line.ready && (
                    <span>{line.text}</span>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* ── Skip hint ── */}
      <div style={{
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'flex-end',
        flexShrink: 0,
      }}>
        <span style={{
          color: 'var(--soft)',
          fontSize: 11,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}>
          CLICK · PRESS ANY KEY TO SKIP
        </span>
      </div>

      {/* Inline styles for the caret animation */}
      <style>{`
        .boot-caret {
          display: inline-block;
          margin-left: 1px;
          color: var(--accent);
          animation: boot-blink 1.1s steps(2) infinite;
        }
        @keyframes boot-blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

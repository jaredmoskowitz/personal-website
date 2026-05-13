import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Jared Moskowitz — Senior iOS Engineer, builder, founder.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0e0f0e',
          padding: '64px 72px',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          position: 'relative',
        }}
      >
        {/* Window chrome dots */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 56 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#e08577' }} />
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#f0bb5b', opacity: 0.85 }} />
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#86c896', opacity: 0.75 }} />
          <span style={{ marginLeft: 16, color: 'rgba(236,234,216,0.38)', fontSize: 15 }}>
            jared@jaredmoskowitz:~ — long view
          </span>
        </div>

        {/* Prompt line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <span style={{ color: '#86c896', fontSize: 18 }}>jared@jaredmoskowitz</span>
          <span style={{ color: 'rgba(236,234,216,0.38)', fontSize: 18 }}>:</span>
          <span style={{ color: '#f0bb5b', fontSize: 18 }}>~$</span>
          <span style={{ color: '#ecead8', fontSize: 18 }}>whoami --full</span>
        </div>

        {/* Name */}
        <div style={{
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: '-3px',
          lineHeight: 0.95,
          color: '#ecead8',
          marginBottom: 28,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <span>jared</span>
          <span>
            moskowitz
            <span style={{ color: '#f0bb5b' }}>_</span>
          </span>
        </div>

        {/* Role lines */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontSize: 20,
          color: 'rgba(218,214,193,0.85)',
          marginBottom: 48,
        }}>
          <span>
            <span style={{ color: '#f0bb5b' }}>$</span>
            {'  '}role: senior ios engineer @ hinge
          </span>
          <span>
            <span style={{ color: '#f0bb5b' }}>$</span>
            {'  '}building: sesh · today · moskowitz labs
          </span>
          <span>
            <span style={{ color: '#f0bb5b' }}>$</span>
            {'  '}based: new york, ny
          </span>
        </div>

        {/* Bottom rule + site */}
        <div style={{
          position: 'absolute',
          bottom: 64,
          left: 72,
          right: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(236,234,216,0.10)', marginRight: 32 }} />
          <span style={{ color: '#f0bb5b', fontSize: 18, letterSpacing: '0.05em' }}>
            jaredmoskowitz.com
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}

/* global React */

// ── NightCoder: crescent moon + code glyph ──────────────────────────────
function NightCoderMark({ size = 30, accent = '#10b981', style }) {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={style} aria-label="NightCoder">
      <defs>
        <linearGradient id={`nc-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.95"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0.55"/>
        </linearGradient>
        <radialGradient id={`nc-glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#nc-glow-${id})`}/>
      <mask id={`nc-crescent-${id}`}>
        <rect width="32" height="32" fill="black"/>
        <circle cx="16" cy="16" r="12" fill="white"/>
        <circle cx="21" cy="12" r="10" fill="black"/>
      </mask>
      <rect width="32" height="32" fill={`url(#nc-${id})`} mask={`url(#nc-crescent-${id})`}/>
      <g stroke="#04140d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M11 14.5 L8.5 17 L11 19.5"/>
        <path d="M15.5 13 L13 21"/>
      </g>
      <circle cx="23" cy="22" r="1" fill={accent}/>
      <circle cx="25" cy="9" r="0.7" fill={accent} opacity="0.7"/>
    </svg>
  );
}

// ── DayCoder: sun with radiating rays + code glyph ──────────────────────
function DayCoderMark({ size = 30, accent = '#f59e0b', style }) {
  const id = React.useId();
  // ink color for the code glyph — stays legible on the bright sun disc
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={style} aria-label="DayCoder">
      <defs>
        <linearGradient id={`dc-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="1"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0.7"/>
        </linearGradient>
        <radialGradient id={`dc-glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* soft glow */}
      <circle cx="16" cy="16" r="15" fill={`url(#dc-glow-${id})`}/>
      {/* sun rays */}
      <g stroke={accent} strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
        <line x1="16" y1="2.5" x2="16" y2="5.5"/>
        <line x1="16" y1="26.5" x2="16" y2="29.5"/>
        <line x1="2.5" y1="16" x2="5.5" y2="16"/>
        <line x1="26.5" y1="16" x2="29.5" y2="16"/>
        <line x1="6.2" y1="6.2" x2="8.4" y2="8.4"/>
        <line x1="23.6" y1="23.6" x2="25.8" y2="25.8"/>
        <line x1="6.2" y1="25.8" x2="8.4" y2="23.6"/>
        <line x1="23.6" y1="8.4" x2="25.8" y2="6.2"/>
      </g>
      {/* sun disc */}
      <circle cx="16" cy="16" r="9" fill={`url(#dc-${id})`}
        stroke={accent} strokeOpacity="0.4" strokeWidth="0.5"/>
      {/* code glyph: </> centered */}
      <g stroke="#3a1f00" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M13 13 L10.5 16 L13 19"/>
        <path d="M19 13 L21.5 16 L19 19"/>
        <path d="M17 12 L15 20"/>
      </g>
    </svg>
  );
}

// Theme-aware brand mark — flips logo with theme.
function BrandMark({ theme = 'dark', size = 30, accent, style }) {
  if (theme === 'light') {
    return <DayCoderMark size={size} accent={accent || '#f59e0b'} style={style}/>;
  }
  return <NightCoderMark size={size} accent={accent || '#10b981'} style={style}/>;
}

function NightCoderWordmark({ accent = '#10b981', size = 14 }) {
  return (
    <div style={{display:'flex', alignItems:'baseline', gap:1,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: size, fontWeight: 700, letterSpacing:'-.02em',
      lineHeight: 1}}>
      <span style={{color:'var(--text-0)'}}>night</span>
      <span style={{color: accent}}>coder</span>
    </div>
  );
}

window.NightCoderMark = NightCoderMark;
window.DayCoderMark = DayCoderMark;
window.BrandMark = BrandMark;
window.NightCoderWordmark = NightCoderWordmark;

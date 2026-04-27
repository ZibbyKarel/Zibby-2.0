/* global React */
const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM, useCallback: uC } = React;

// ────────────────────────────────────────────────────────────
// Primitives: Icon, Badge, Button, Tooltip
// ────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, stroke = 1.75 }) => {
  const paths = {
    folder: <><path d="M3 6a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/></>,
    git: <><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8.5 6h7a3 3 0 0 1 3 3v0"/></>,
    play: <><path d="M7 5v14l12-7L7 5Z"/></>,
    pause: <><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    x: <><path d="M6 6l12 12M18 6L6 18"/></>,
    check: <><path d="M5 12.5l4.5 4.5L19 7"/></>,
    chevron: <><path d="M9 6l6 6-6 6"/></>,
    chevronDown: <><path d="M6 9l6 6 6-6"/></>,
    chevronRight: <><path d="M9 6l6 6-6 6"/></>,
    file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    bolt: <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z"/></>,
    warn: <><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></>,
    github: <><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.93.83.09-.65.35-1.1.63-1.35-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0C16.54 5.27 17.38 5.54 17.38 5.54c.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></>,
    terminal: <><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M7 9l3 3-3 3M13 15h4"/></>,
    diff: <><path d="M5 3v14a2 2 0 0 0 2 2h2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M19 7v10a2 2 0 0 1-2 2h-2"/><path d="M15 15l-2 2 2 2M9 5l2-2-2-2"/></>,
    more: <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
    command: <><path d="M9 6H6a3 3 0 1 0 3 3V6Zm0 0h6m0 0v3a3 3 0 1 0 3-3h-3Zm0 0v6m0 0H6a3 3 0 1 0 3 3v-3Zm0 0h6m0 0a3 3 0 1 0-3 3v-3Z"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    moon: <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></>,
    bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8Z"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    graph: <><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h8M8 18h8M6 8v8M18 8v8"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></>,
    trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z"/></>,
    archive: <><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    arrowRight: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    filter: <><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/></>,
    sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
};

const Btn = ({ variant = 'ghost', size = 'md', icon, children, style, ...rest }) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: size === 'sm' ? 28 : size === 'lg' ? 38 : 32,
    padding: size === 'sm' ? '0 10px' : '0 12px',
    borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', border: '1px solid transparent',
    transition: 'background .12s, border-color .12s, color .12s',
    whiteSpace: 'nowrap',
  };
  const variants = {
    primary: { background: 'var(--emerald)', color: '#04140d', border: '1px solid var(--emerald)' },
    secondary: { background: 'var(--bg-3)', color: 'var(--text-0)', border: '1px solid var(--border)' },
    ghost: { background: 'transparent', color: 'var(--text-1)', border: '1px solid transparent' },
    outline: { background: 'transparent', color: 'var(--text-0)', border: '1px solid var(--border-2)' },
    danger: { background: 'transparent', color: 'var(--rose)', border: '1px solid var(--border)' },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...rest}
      onMouseEnter={e => { if (variant === 'ghost') e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { if (variant === 'ghost') e.currentTarget.style.background = 'transparent'; }}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
};

const StatusPill = ({ status }) => {
  const map = {
    pending:   { label: 'pending',   color: 'var(--text-2)',  bg: 'var(--bg-3)',          dot: 'var(--text-3)' },
    queued:    { label: 'queued',    color: '#c9a96e',         bg: 'rgba(245,158,11,.10)', dot: '#f59e0b' },
    running:   { label: 'running',   color: 'var(--emerald)',  bg: 'rgba(16,185,129,.12)', dot: 'var(--emerald)', pulse: true },
    pushing:   { label: 'pushing',   color: 'var(--sky)',      bg: 'rgba(56,189,248,.12)', dot: 'var(--sky)', pulse: true },
    done:      { label: 'done',      color: 'var(--emerald)',  bg: 'rgba(16,185,129,.10)', dot: 'var(--emerald)' },
    review:    { label: 'review',    color: 'var(--violet)',   bg: 'rgba(167,139,250,.12)', dot: 'var(--violet)', pulse: true },
    failed:    { label: 'failed',    color: 'var(--rose)',     bg: 'rgba(244,63,94,.10)',  dot: 'var(--rose)' },
    cancelled: { label: 'cancelled', color: 'var(--amber)',    bg: 'rgba(245,158,11,.10)', dot: 'var(--amber)' },
    blocked:   { label: 'blocked',   color: 'var(--text-2)',   bg: 'var(--bg-3)',          dot: 'var(--text-3)' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 8px 3px 7px',
      borderRadius:999, fontSize:11, fontWeight:500, letterSpacing:'.02em',
      background:s.bg, color:s.color, fontFamily:'var(--mono)' }}>
      <span style={{width:6, height:6, borderRadius:'50%', background:s.dot,
        animation: s.pulse ? 'pulse-dot 1.4s ease-in-out infinite' : 'none' }}/>
      {s.label}
    </span>
  );
};

const Chip = ({ icon, children, tone = 'neutral', style }) => {
  const tones = {
    neutral: { c: 'var(--text-1)', bg: 'var(--bg-3)', b: 'var(--border)' },
    accent:  { c: 'var(--emerald)', bg: 'rgba(16,185,129,.08)', b: 'rgba(16,185,129,.25)' },
    violet:  { c: 'var(--violet)', bg: 'rgba(167,139,250,.10)', b: 'rgba(167,139,250,.25)' },
    warn:    { c: 'var(--amber)', bg: 'rgba(245,158,11,.10)', b: 'rgba(245,158,11,.25)' },
  };
  const t = tones[tone];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5,
      height:22, padding:'0 8px', borderRadius:6, fontSize:11, fontWeight:500,
      color:t.c, background:t.bg, border:`1px solid ${t.b}`, fontFamily:'var(--mono)', ...style }}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  );
};

// UsageRing — SVG ring progress
const UsageRing = ({ pct, size = 44, stroke = 4, label }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const color = pct >= 90 ? 'var(--rose)' : pct >= 75 ? 'var(--amber)' : 'var(--emerald)';
  return (
    <div style={{position:'relative', width:size, height:size}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{transition:'stroke-dasharray .4s ease'}}/>
      </svg>
      <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:10, fontWeight:600, fontFamily:'var(--mono)',
        color:'var(--text-0)'}}>
        {pct}%
      </div>
      {label && <div style={{textAlign:'center', fontSize:9, color:'var(--text-2)',
        marginTop:2, letterSpacing:'.1em', textTransform:'uppercase'}}>{label}</div>}
    </div>
  );
};

// Format helpers
const fmtDuration = (ms) => {
  if (!ms || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};
const fmtCountdown = (ms) => {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h >= 24) return `${Math.floor(h/24)}d ${h%24}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};
const fmtNum = (n) => n.toLocaleString();

Object.assign(window, { Icon, Btn, StatusPill, Chip, UsageRing, fmtDuration, fmtCountdown, fmtNum });

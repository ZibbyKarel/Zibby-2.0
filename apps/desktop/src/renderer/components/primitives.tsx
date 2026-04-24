import React from 'react';
import { Icon } from './icons';

// ── Btn ──────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: Parameters<typeof Icon>[0]['name'];
};

const variantStyles: Record<BtnVariant, React.CSSProperties> = {
  primary:   { background: 'var(--emerald)', color: '#04140d', border: '1px solid var(--emerald)' },
  secondary: { background: 'var(--bg-3)',    color: 'var(--text-0)', border: '1px solid var(--border)' },
  ghost:     { background: 'transparent',    color: 'var(--text-1)', border: '1px solid transparent' },
  outline:   { background: 'transparent',    color: 'var(--text-0)', border: '1px solid var(--border-2)' },
  danger:    { background: 'transparent',    color: 'var(--rose)',   border: '1px solid var(--border)' },
};

export function Btn({ variant = 'ghost', size = 'md', icon, children, style, onMouseEnter, onMouseLeave, disabled, ...rest }: BtnProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: size === 'sm' ? 28 : size === 'lg' ? 38 : 32,
    padding: size === 'sm' ? '0 10px' : '0 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
    transition: 'background .12s, border-color .12s, color .12s',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.5 : 1,
  };
  return (
    <button
      disabled={disabled}
      style={{ ...base, ...variantStyles[variant], ...style }}
      onMouseEnter={(e) => {
        if (!disabled && variant === 'ghost') e.currentTarget.style.background = 'var(--bg-hover)';
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!disabled && variant === 'ghost') e.currentTarget.style.background = 'transparent';
        onMouseLeave?.(e);
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
}

// ── StatusPill ───────────────────────────────────────────────
import type { StoryStatus } from '@nightcoder/shared-types/ipc';

type PillCfg = { label: string; color: string; bg: string; dot: string; pulse?: boolean };
const pillMap: Record<StoryStatus, PillCfg> = {
  pending:   { label: 'pending',   color: 'var(--text-2)',  bg: 'var(--bg-3)',          dot: 'var(--text-3)' },
  blocked:   { label: 'blocked',   color: 'var(--text-2)',  bg: 'var(--bg-3)',          dot: 'var(--text-3)' },
  running:   { label: 'running',   color: 'var(--emerald)', bg: 'rgba(16,185,129,.12)', dot: 'var(--emerald)', pulse: true },
  pushing:   { label: 'pushing',   color: 'var(--sky)',     bg: 'rgba(56,189,248,.12)', dot: 'var(--sky)',     pulse: true },
  review:    { label: 'review',    color: 'var(--violet)',  bg: 'rgba(167,139,250,.12)', dot: 'var(--violet)' },
  done:      { label: 'done',      color: 'var(--emerald)', bg: 'rgba(16,185,129,.10)', dot: 'var(--emerald)' },
  failed:    { label: 'failed',    color: 'var(--rose)',    bg: 'rgba(244,63,94,.10)',  dot: 'var(--rose)' },
  cancelled: { label: 'cancelled', color: 'var(--amber)',   bg: 'rgba(245,158,11,.10)', dot: 'var(--amber)' },
};

export function StatusPill({ status }: { status: StoryStatus }) {
  const s = pillMap[status] ?? pillMap.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 8px 3px 7px', borderRadius: 999,
      fontSize: 11, fontWeight: 500, letterSpacing: '.02em',
      background: s.bg, color: s.color, fontFamily: 'var(--mono)',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: s.dot,
        animation: s.pulse ? 'pulse-dot 1.4s ease-in-out infinite' : 'none',
      }} />
      {s.label}
    </span>
  );
}

// ── Chip ─────────────────────────────────────────────────────
type ChipTone = 'neutral' | 'accent' | 'violet' | 'warn';
type ChipProps = {
  icon?: Parameters<typeof Icon>[0]['name'];
  tone?: ChipTone;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

const toneMap: Record<ChipTone, { c: string; bg: string; b: string }> = {
  neutral: { c: 'var(--text-1)', bg: 'var(--bg-3)',               b: 'var(--border)' },
  accent:  { c: 'var(--emerald)', bg: 'rgba(16,185,129,.08)',      b: 'rgba(16,185,129,.25)' },
  violet:  { c: 'var(--violet)', bg: 'rgba(167,139,250,.10)',      b: 'rgba(167,139,250,.25)' },
  warn:    { c: 'var(--amber)',  bg: 'rgba(245,158,11,.10)',        b: 'rgba(245,158,11,.25)' },
};

export function Chip({ icon, children, tone = 'neutral', style }: ChipProps) {
  const t = toneMap[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: 22, padding: '0 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 500,
      color: t.c, background: t.bg, border: `1px solid ${t.b}`,
      fontFamily: 'var(--mono)', ...style,
    }}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  );
}

// ── UsageRing ────────────────────────────────────────────────
type UsageRingProps = { pct: number; size?: number; stroke?: number; label?: string };

export function UsageRing({ pct, size = 44, stroke = 4, label }: UsageRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  const color = pct >= 90 ? 'var(--rose)' : pct >= 75 ? 'var(--amber)' : 'var(--emerald)';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .4s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 10, fontWeight: 600, fontFamily: 'var(--mono)',
        color: 'var(--text-0)',
      }}>
        {pct}%
      </div>
      {label && (
        <div style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-2)', marginTop: 2, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ── Format helpers ───────────────────────────────────────────
export function fmtDuration(ms: number | null): string {
  if (!ms || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function fmtCountdown(ms: number): string {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function fmtNum(n: number): string {
  return n.toLocaleString();
}

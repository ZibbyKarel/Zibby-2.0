import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './icons';

export type Command = {
  id: string;
  icon?: Parameters<typeof Icon>[0]['name'];
  label: string;
  hint?: string;
  kbd?: string;
  run: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  commands: Command[];
};

const kbdStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: 10, padding: '2px 6px',
  background: 'var(--bg-3)', border: '1px solid var(--border)',
  borderRadius: 4, color: 'var(--text-2)',
};

export function CommandPalette({ open, onClose, commands }: Props) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQ(''); setSelected(0); setTimeout(() => inputRef.current?.focus(), 10); }
  }, [open]);

  const matches = useMemo(() => {
    const ql = q.toLowerCase();
    return commands.filter((c) => !ql || c.label.toLowerCase().includes(ql) || c.hint?.toLowerCase().includes(ql));
  }, [q, commands]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((v) => Math.min(v + 1, matches.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((v) => Math.max(v - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); matches[selected]?.run(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, matches, selected, onClose]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 70,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '12vh', animation: 'fade-in .12s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(560px, 94vw)', background: 'var(--bg-1)',
        border: '1px solid var(--border-2)', borderRadius: 12,
        boxShadow: 'var(--shadow-2)', overflow: 'hidden',
        animation: 'slide-up .15s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSelected(0); }}
            placeholder="Type a command or search tasks…"
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-0)', fontSize: 14, outline: 'none' }}
          />
          <kbd style={kbdStyle}>esc</kbd>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
          {matches.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
              No commands match "{q}"
            </div>
          )}
          {matches.map((c, idx) => (
            <button
              key={c.id}
              onMouseEnter={() => setSelected(idx)}
              onClick={() => { c.run(); onClose(); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px',
                background: idx === selected ? 'var(--bg-3)' : 'transparent',
                border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                color: 'var(--text-0)', fontSize: 13,
              }}
            >
              <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
                <Icon name={c.icon ?? 'arrowRight'} size={14} />
              </span>
              <span style={{ flex: 1 }}>{c.label}</span>
              {c.hint && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.hint}</span>}
              {c.kbd && <kbd style={kbdStyle}>{c.kbd}</kbd>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

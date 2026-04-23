import React from 'react';
import { Icon } from './icons';

export type Toast = {
  id: string;
  kind: 'info' | 'done' | 'failed';
  title: string;
  desc?: string;
};

type Props = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

export function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 80,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      {toasts.map((t) => {
        const color = t.kind === 'done' ? 'var(--emerald)' : t.kind === 'failed' ? 'var(--rose)' : 'var(--sky)';
        const iconName = t.kind === 'done' ? 'check' : t.kind === 'failed' ? 'warn' : 'bell';
        return (
          <div key={t.id} style={{
            pointerEvents: 'auto', minWidth: 280,
            background: 'var(--bg-1)', border: '1px solid var(--border-2)',
            borderLeft: `3px solid ${color}`,
            borderRadius: 10, padding: '10px 12px', boxShadow: 'var(--shadow-2)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            animation: 'slide-up .2s ease',
          }}>
            <div style={{ color, marginTop: 1 }}>
              <Icon name={iconName} size={15} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-0)' }}>{t.title}</div>
              {t.desc && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{t.desc}</div>}
            </div>
            <button onClick={() => onDismiss(t.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2, display: 'flex' }}>
              <Icon name="x" size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

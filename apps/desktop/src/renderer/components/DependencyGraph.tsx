import React from 'react';
import { Icon } from './icons';
import type { TaskVM } from '../viewModel';

type Props = {
  tasks: TaskVM[];
  onClickTask: (task: TaskVM) => void;
};

export function DependencyGraph({ tasks, onClickTask }: Props) {
  if (!tasks.length) return null;

  const deps: { from: number; to: number }[] = [];
  tasks.forEach((t) => t.waitsOn.forEach((dep) => deps.push({ from: dep, to: t.index })));
  if (deps.length === 0) return null;

  const cols = [0, 0, 0];
  const place: Record<number, { col: number; row: number }> = {};
  tasks.forEach((t) => {
    const depth = Math.min(2, Math.max(0, t.waitsOn.length));
    place[t.index] = { col: depth, row: cols[depth]++ };
  });

  const W = 520, H = 80, CW = W / 3;

  return (
    <div style={{ padding: 12, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon name="graph" size={12} />
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Dependencies</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
        {deps.map((d, i) => {
          const a = place[d.from], b = place[d.to];
          if (!a || !b) return null;
          const x1 = a.col * CW + 50, y1 = 20 + a.row * 24;
          const x2 = b.col * CW + 50, y2 = 20 + b.row * 24;
          return (
            <path key={i} d={`M${x1} ${y1} C${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
              stroke="var(--border-2)" fill="none" strokeWidth="1" />
          );
        })}
        {tasks.map((t) => {
          const p = place[t.index];
          if (!p) return null;
          const x = p.col * CW + 50, y = 20 + p.row * 24;
          const color = t.status === 'done' ? 'var(--emerald)'
            : t.status === 'running' || t.status === 'pushing' ? 'var(--emerald)'
            : t.status === 'failed' ? 'var(--rose)'
            : 'var(--text-3)';
          return (
            <g key={t.index} style={{ cursor: 'pointer' }} onClick={() => onClickTask(t)}>
              <circle cx={x} cy={y} r="5" fill={color}
                style={{ filter: (t.status === 'running' || t.status === 'pushing') ? 'drop-shadow(0 0 4px var(--emerald))' : 'none' }} />
              <text x={x + 10} y={y + 3} fontSize="10" fill="var(--text-2)" fontFamily="var(--mono)">
                #{t.index} {t.title.slice(0, 22)}{t.title.length > 22 ? '…' : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

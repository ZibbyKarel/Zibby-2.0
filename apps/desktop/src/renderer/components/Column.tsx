import React, { useState } from 'react';
import type { TaskColumn } from '../viewModel';

type Props = {
  id: TaskColumn;
  title: string;
  accent: string;
  count: number;
  children: React.ReactNode;
  isEmpty: boolean;
  onDropTask: (taskId: string) => void;
};

export function Column({ id, title, accent, count, children, isEmpty, onDropTask }: Props) {
  const [hover, setHover] = useState(false);
  return (
    <section
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        setHover(false);
        const taskId = e.dataTransfer.getData('text/task-id');
        if (taskId) onDropTask(taskId);
      }}
      style={{
        flex: 1,
        minWidth: 280,
        background: 'var(--bg-1)',
        border: `1px solid ${hover ? accent : 'var(--border)'}`,
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 420,
        transition: 'background .12s, border-color .12s',
        ...(hover ? { background: 'var(--bg-2)' } : {}),
      }}
      data-col={id}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent }} />
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {title}
        </h2>
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-3)', background: 'var(--bg-3)', padding: '1px 7px', borderRadius: 999 }}>
          {count}
        </span>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {children}
        {isEmpty && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-3)', fontSize: 11, fontStyle: 'italic',
            padding: '20px 10px', border: '1px dashed var(--border)',
            borderRadius: 8, minHeight: 80,
          }}>
            drop tasks here
          </div>
        )}
      </div>
    </section>
  );
}

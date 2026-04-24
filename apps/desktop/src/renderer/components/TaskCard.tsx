import React from 'react';
import { Icon } from './icons';
import { StatusPill, Chip, fmtDuration } from './primitives';
import type { TaskVM } from '../viewModel';

type Props = {
  task: TaskVM;
  runtimeMs: number | null;
  isDragging: boolean;
  dragHandlers: React.HTMLAttributes<HTMLElement>;
  onOpen: () => void;
  onEdit: () => void;
  onRun: () => void;
  onDelete: () => void;
};

export function TaskCard({ task, runtimeMs, isDragging, dragHandlers, onOpen, onEdit, onRun, onDelete }: Props) {
  const waits = task.waitsOn.length > 0;
  const canRun = task.status === 'pending' || task.status === 'failed' || task.status === 'blocked';
  const canResume = task.interrupted && task.status === 'running';

  return (
    <article
      {...dragHandlers}
      onClick={onOpen}
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 12,
        cursor: 'pointer',
        transition: 'border-color .12s, box-shadow .12s',
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
    >
      {task.status === 'running' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: '10px 10px 0 0', overflow: 'hidden' }}>
          <div className="shimmer-bar" style={{ height: '100%', width: '100%' }} />
        </div>
      )}

      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-3)', marginTop: 2 }}>
          #{task.index}
        </span>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-0)', lineHeight: 1.35, flex: 1, letterSpacing: '-.005em' }}>
          {task.title}
        </h3>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-0)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; }}
          title="Details"
        >
          <Icon name="more" size={14} />
        </button>
      </header>

      {task.description && (
        <p style={{
          margin: '0 0 10px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {task.description}
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {task.branch && <Chip icon="git">{task.branch.replace('nightcoder/', '')}</Chip>}
        {task.prUrl && <Chip icon="github" tone="accent">PR #{task.prUrl.split('/').pop()}</Chip>}
        {task.model && <Chip icon="sparkle" tone="violet">{task.model}</Chip>}
        {waits && <Chip icon="clock" tone="warn">waits #{task.waitsOn.join(', #')}</Chip>}
        {canResume && <Chip icon="warn" tone="warn">interrupted</Chip>}
      </div>

      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>
          {task.status === 'running' && runtimeMs != null && (
            <span style={{ color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="dot-running" /> {fmtDuration(runtimeMs)}
            </span>
          )}
          {task.status === 'done' && task.endedAt && task.startedAt && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="check" size={11} /> {fmtDuration(task.endedAt - task.startedAt)}
            </span>
          )}
          {task.status === 'failed' && task.endedAt && task.startedAt && (
            <span style={{ color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="warn" size={11} /> {fmtDuration(task.endedAt - task.startedAt)}
            </span>
          )}
          {task.tokens != null && (
            <span title="tokens in / out">
              ↑{((task.tokens as {in:number;out:number}).in / 1000).toFixed(1)}k ↓{((task.tokens as {in:number;out:number}).out / 1000).toFixed(1)}k
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {canResume && (
            <button
              onClick={(e) => { e.stopPropagation(); onRun(); }}
              style={{
                background: 'var(--accent-soft)', border: '1px solid var(--accent-ring)',
                borderRadius: 6, padding: '2px 8px', color: 'var(--amber)',
                cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
              title="Resume this interrupted task"
            >
              <Icon name="play" size={11} /> resume
            </button>
          )}
          {canRun && !canResume && (
            <button
              onClick={(e) => { e.stopPropagation(); onRun(); }}
              style={{
                background: 'var(--accent-soft)', border: '1px solid var(--accent-ring)',
                borderRadius: 6, padding: '2px 8px', color: 'var(--emerald)',
                cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
              title="Run this task"
            >
              <Icon name="play" size={11} /> run
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--rose)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; }}
            title="Remove"
          >
            <Icon name="trash" size={12} />
          </button>
          <StatusPill status={task.status} />
        </div>
      </footer>
    </article>
  );
}

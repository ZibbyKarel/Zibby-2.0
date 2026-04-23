import React, { useEffect, useRef } from 'react';
import { Icon } from './icons';
import { Btn, StatusPill, Chip, fmtDuration, fmtNum } from './primitives';
import type { TaskVM } from '../viewModel';

export type DrawerTab = 'logs' | 'diff' | 'details';

type Props = {
  task: TaskVM | null;
  open: boolean;
  onClose: () => void;
  onRun: () => void;
  tab: DrawerTab;
  setTab: (t: DrawerTab) => void;
  runtimeMs: number | null;
};

export function TaskDrawer({ task, open, onClose, onRun, tab, setTab, runtimeMs }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '1') setTab('logs');
      if (e.key === '2') setTab('diff');
      if (e.key === '3') setTab('details');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, setTab]);

  if (!task) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 50,
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .18s',
        }}
      />
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(720px, 92vw)',
        background: 'var(--bg-1)', borderLeft: '1px solid var(--border)',
        zIndex: 51, display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .22s cubic-bezier(.2,.7,.3,1)',
        boxShadow: 'var(--shadow-2)',
      }}>
        <header style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>#{task.index}</span>
            <StatusPill status={task.status} />
            {task.status === 'running' && runtimeMs != null && (
              <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--emerald)' }}>
                {fmtDuration(runtimeMs)}
              </span>
            )}
            <div style={{ flex: 1 }} />
            <Btn icon="play" variant="primary" size="sm" onClick={onRun}>Run</Btn>
            <Btn icon="x" variant="ghost" size="sm" onClick={onClose} />
          </div>
          <h2 style={{ margin: '2px 0 6px', fontSize: 18, fontWeight: 600, letterSpacing: '-.01em' }}>
            {task.title}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {task.branch && <Chip icon="git">{task.branch}</Chip>}
            {task.prUrl && <Chip icon="github" tone="accent">PR #{task.prUrl.split('/').pop()}</Chip>}
            {task.model && <Chip icon="sparkle" tone="violet">{task.model}</Chip>}
            {task.tokens != null && (
              <Chip icon="bolt">
                ↑{fmtNum((task.tokens as {in:number;out:number}).in)} ↓{fmtNum((task.tokens as {in:number;out:number}).out)}
              </Chip>
            )}
          </div>
        </header>

        <nav style={{ display: 'flex', gap: 2, padding: '0 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
          {([
            { k: 'logs' as DrawerTab, label: 'Logs', icon: 'terminal' as const, badge: task.logs.length || null },
            { k: 'diff' as DrawerTab, label: 'Diff', icon: 'diff' as const, badge: null },
            { k: 'details' as DrawerTab, label: 'Details', icon: 'edit' as const, badge: null },
          ]).map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 12px', fontSize: 12, fontWeight: 500,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: tab === t.k ? 'var(--text-0)' : 'var(--text-2)',
              borderBottom: tab === t.k ? '2px solid var(--emerald)' : '2px solid transparent',
              marginBottom: -1,
            }}>
              <Icon name={t.icon} size={13} />
              {t.label}
              {t.badge != null && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', background: 'var(--bg-3)', padding: '1px 6px', borderRadius: 999 }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'logs' && <LogsView task={task} />}
          {tab === 'diff' && <DiffView />}
          {tab === 'details' && <DetailsView task={task} />}
        </div>
      </aside>
    </>
  );
}

function LogsView({ task }: { task: TaskVM }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [task.logs.length]);

  if (task.logs.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
        <Icon name="terminal" size={28} />
        <p style={{ marginTop: 8 }}>No logs yet. Run this task to stream output.</p>
      </div>
    );
  }
  return (
    <pre ref={ref} style={{
      margin: 0, padding: '14px 18px', fontSize: 12, lineHeight: 1.55,
      fontFamily: 'var(--mono)', color: 'var(--text-1)',
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      background: 'var(--bg-0)',
    }}>
      {task.logs.map((l, i) => {
        const color = l.s === 'err' ? 'var(--rose)' : l.s === 'info' ? 'var(--sky)' : 'var(--text-1)';
        const prefix = l.s === 'err' ? '✗ ' : '';
        return (
          <div key={i} style={{ color, display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--text-3)', userSelect: 'none', minWidth: 28, textAlign: 'right' }}>
              {String(i + 1).padStart(3, ' ')}
            </span>
            <span style={{ flex: 1 }}>{prefix}{l.l}</span>
          </div>
        );
      })}
      {task.status === 'running' && <div className="caret" style={{ color: 'var(--emerald)' }} />}
    </pre>
  );
}

function DiffView() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
      <Icon name="diff" size={28} />
      <p style={{ marginTop: 8 }}>No diff available. The task hasn't produced changes yet.</p>
    </div>
  );
}

function DetailsView({ task }: { task: TaskVM }) {
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Section label="Description">
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {task.description}
        </p>
      </Section>

      {task.acceptance.length > 0 && (
        <Section label="Acceptance criteria">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {task.acceptance.map((a, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 4, background: 'var(--bg-3)',
                  border: '1px solid var(--border-2)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
                  color: task.status === 'done' ? 'var(--emerald)' : 'var(--text-3)',
                }}>
                  {task.status === 'done' && <Icon name="check" size={10} stroke={2.5} />}
                </span>
                {a}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {task.affectedFiles.length > 0 && (
        <Section label="Affected files">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {task.affectedFiles.map((f, i) => (
              <code key={i} style={{
                fontSize: 12, padding: '3px 8px', background: 'var(--bg-3)',
                color: 'var(--text-1)', borderRadius: 5, fontFamily: 'var(--mono)',
                border: '1px solid var(--border)',
              }}>{f}</code>
            ))}
          </div>
        </Section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <KV k="Model" v={task.model ?? 'sonnet (default)'} />
        <KV k="Branch" v={task.branch ?? '—'} mono />
        <KV k="Status" v={task.status} />
        <KV k="Tokens" v={task.tokens != null ? `↑${fmtNum((task.tokens as {in:number;out:number}).in)}  ↓${fmtNum((task.tokens as {in:number;out:number}).out)}` : '—'} mono />
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{label}</h3>
      {children}
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
      <div style={{ fontSize: 12, color: 'var(--text-0)', fontFamily: mono ? 'var(--mono)' : 'var(--sans)' }}>{v}</div>
    </div>
  );
}

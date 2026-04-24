import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { TaskFile } from '@nightcoder/shared-types/ipc';
import { Icon } from './icons';
import { Btn, StatusPill, Chip, fmtDuration, fmtNum } from './primitives';
import type { TaskVM } from '../viewModel';

export type DrawerTab = 'logs' | 'diff' | 'details';

type SaveData = { title: string; description: string; acceptance: string[]; model?: string };

type Props = {
  task: TaskVM | null;
  open: boolean;
  onClose: () => void;
  onRun: () => void;
  onSave: (data: SaveData) => void;
  tab: DrawerTab;
  setTab: (t: DrawerTab) => void;
  runtimeMs: number | null;
};

export function TaskDrawer({ task, open, onClose, onRun, onSave, tab, setTab, runtimeMs }: Props) {
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
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>#{task.numericId ?? task.index + 1}</span>
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
          {tab === 'logs' && <LogsView key={task.index} task={task} />}
          {tab === 'diff' && <DiffView />}
          {tab === 'details' && <DetailsView task={task} onSave={onSave} />}
        </div>
      </aside>
    </>
  );
}

function LogsView({ task }: { task: TaskVM }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [task.logs.length, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
    setAutoScroll(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    setAutoScroll(true);
  }, []);

  if (task.logs.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
        <Icon name="terminal" size={28} />
        <p style={{ marginTop: 8 }}>No logs yet. Run this task to stream output.</p>
      </div>
    );
  }
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height: '100%', overflowY: 'auto', position: 'relative' }}
    >
      <pre style={{
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
      {!autoScroll && (
        <div style={{
          position: 'sticky', bottom: 16,
          display: 'flex', justifyContent: 'flex-end',
          paddingRight: 16, pointerEvents: 'none',
        }}>
          <button
            onClick={scrollToBottom}
            title="Scroll to bottom"
            style={{
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              color: 'var(--text-1)', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,.25)',
            }}
          >
            <Icon name="chevronDown" size={16} />
          </button>
        </div>
      )}
    </div>
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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: 'var(--bg-2)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text-0)', fontSize: 13,
  outline: 'none', transition: 'border-color .12s', boxSizing: 'border-box',
};

function DetailsView({ task, onSave }: { task: TaskVM; onSave: (data: SaveData) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [acceptance, setAcceptance] = useState(task.acceptance.join('\n'));
  const [model, setModel] = useState(task.model ?? '');

  useEffect(() => {
    setEditing(false);
    setTitle(task.title);
    setDescription(task.description);
    setAcceptance(task.acceptance.join('\n'));
    setModel(task.model ?? '');
  }, [task.index]);

  const handleSave = () => {
    onSave({
      title: title.trim(),
      description: description.trim(),
      acceptance: acceptance.split('\n').map((s) => s.trim()).filter(Boolean),
      model: model || undefined,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(task.title);
    setDescription(task.description);
    setAcceptance(task.acceptance.join('\n'));
    setModel(task.model ?? '');
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <EditField label="Title">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </EditField>
        <EditField label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
        </EditField>
        <EditField label="Acceptance criteria" hint="one per line">
          <textarea value={acceptance} onChange={(e) => setAcceptance(e.target.value)}
            rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
        </EditField>
        <EditField label="Model">
          <select value={model} onChange={(e) => setModel(e.target.value)} style={{ ...inputStyle, height: 34 }}>
            <option value="">Default (sonnet)</option>
            <option value="sonnet">Sonnet</option>
            <option value="opus">Opus</option>
            <option value="haiku">Haiku</option>
          </select>
        </EditField>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Btn variant="ghost" onClick={handleCancel}>Cancel</Btn>
          <Btn variant="primary" icon="check" disabled={!title.trim() || !description.trim()} onClick={handleSave}>
            Save
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn icon="edit" variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Btn>
      </div>

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

      <Section label="Attached files">
        <AttachedFilesPanel taskId={task.taskId} />
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <KV k="Model" v={task.model ?? 'sonnet (default)'} />
        <KV k="Branch" v={task.branch ?? '—'} mono />
        <KV k="Status" v={task.status} />
        <KV k="Tokens" v={task.tokens != null ? `↑${fmtNum((task.tokens as {in:number;out:number}).in)}  ↓${fmtNum((task.tokens as {in:number;out:number}).out)}` : '—'} mono />
      </div>
    </div>
  );
}

function EditField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', letterSpacing: '.04em', display: 'flex', gap: 6, alignItems: 'center' }}>
        {label}
        {hint && <span style={{ color: 'var(--text-3)', fontWeight: 400, fontStyle: 'italic' }}>· {hint}</span>}
      </span>
      {children}
    </label>
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function AttachedFilesPanel({ taskId }: { taskId: string }) {
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    const res = await window.nightcoder.listTaskFiles({ taskId });
    if (res.kind === 'error') {
      setError(res.message);
      setFiles([]);
    } else {
      setFiles(res.files);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const onAdd = async () => {
    setError(null);
    const pick = await window.nightcoder.pickFilesToAttach();
    if (pick.kind === 'cancelled') return;
    setBusy(true);
    try {
      const res = await window.nightcoder.addTaskFiles({ taskId, sourcePaths: pick.paths });
      if (res.kind === 'error') {
        setError(res.message);
      } else {
        setFiles(res.files);
      }
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (name: string) => {
    setError(null);
    setBusy(true);
    try {
      const res = await window.nightcoder.removeTaskFile({ taskId, name });
      if (res.kind === 'error') {
        setError(res.message);
      } else {
        setFiles(res.files);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Loading…</div>
      ) : files.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No files attached yet.</div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {files.map((f) => (
            <li key={f.name} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', background: 'var(--bg-2)',
              border: '1px solid var(--border)', borderRadius: 6,
            }}>
              <Icon name="file" size={13} />
              <span
                title={f.name}
                style={{
                  flex: 1, fontSize: 12, fontFamily: 'var(--mono)',
                  color: 'var(--text-1)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                }}
              >
                {f.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                {formatBytes(f.size)}
              </span>
              <button
                onClick={() => void onRemove(f.name)}
                disabled={busy}
                title="Remove"
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--text-3)', cursor: busy ? 'default' : 'pointer',
                  padding: 2, display: 'flex', opacity: busy ? 0.5 : 1,
                }}
              >
                <Icon name="trash" size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Btn icon="paperclip" variant="secondary" size="sm" onClick={() => void onAdd()} disabled={busy}>
          Attach files
        </Btn>
      </div>
      {error && (
        <div style={{ fontSize: 11, color: 'var(--rose)' }}>{error}</div>
      )}
    </div>
  );
}

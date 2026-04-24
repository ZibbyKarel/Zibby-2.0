import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  FileTreeNode,
  StoryAgents,
  StoryStatus,
  ThinkingLevel,
} from '@nightcoder/shared-types/ipc';
import { Icon } from './icons';
import { Btn } from './primitives';

export type AddTaskPayload = {
  title: string;
  description: string;
  acceptance: string[];
  model?: string;
  agents: StoryAgents;
  attachedFilePaths: string[];
  /** Index of the blocking task (one blocker). When set, the task will use
   *  the blocker's branch as both its worktree base and PR target. */
  blockingIndex: number | null;
};

export type BlockerCandidate = {
  index: number;
  title: string;
  numericId: number | null;
  status: StoryStatus;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (data: AddTaskPayload) => void;
  /** Candidate blocking tasks — callers filter to open/running/review states. */
  blockerCandidates: BlockerCandidate[];
  /** Absolute path of the currently opened folder (null before pick). */
  folderPath: string | null;
};

type Phase = 'plan' | 'code' | 'qa';

const MODEL_CATALOG: { v: string; name: string }[] = [
  { v: 'sonnet', name: 'Sonnet (default)' },
  { v: 'opus', name: 'Opus' },
  { v: 'haiku', name: 'Haiku' },
];

const THINKING_LEVELS: { v: ThinkingLevel; label: string; dots: number; color: string }[] = [
  { v: 'off',    label: 'Off',  dots: 0, color: 'var(--text-3)' },
  { v: 'low',    label: 'Low',  dots: 1, color: 'var(--sky)' },
  { v: 'medium', label: 'Med',  dots: 2, color: 'var(--amber)' },
  { v: 'high',   label: 'High', dots: 3, color: 'var(--emerald)' },
];

const SHOW_TREE_KEY = 'zb.addTask.showTree';
const DND_TYPE = 'application/x-nightcoder-path';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: 'var(--bg-2)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text-0)', fontSize: 13,
  outline: 'none', transition: 'border-color .12s',
};

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function readShowTreePref(): boolean {
  try { return localStorage.getItem(SHOW_TREE_KEY) !== '0'; } catch { return true; }
}

function writeShowTreePref(v: boolean): void {
  try { localStorage.setItem(SHOW_TREE_KEY, v ? '1' : '0'); } catch { /* noop */ }
}

export function AddTaskDialog({ open, onClose, onAdd, blockerCandidates, folderPath }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptance, setAcceptance] = useState('');
  const [attachedFilePaths, setAttachedFilePaths] = useState<string[]>([]);
  const [pickError, setPickError] = useState<string | null>(null);
  const [blockingIndex, setBlockingIndex] = useState<number | null>(null);

  const [planModel, setPlanModel] = useState('opus');
  const [codeModel, setCodeModel] = useState('sonnet');
  const [qaModel, setQaModel] = useState('sonnet');
  const [planThink, setPlanThink] = useState<ThinkingLevel>('high');
  const [codeThink, setCodeThink] = useState<ThinkingLevel>('medium');
  const [qaThink, setQaThink] = useState<ThinkingLevel>('medium');

  const [showTree, setShowTree] = useState<boolean>(readShowTreePref);
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(''); setDescription(''); setAcceptance('');
      setAttachedFilePaths([]); setPickError(null);
      setBlockingIndex(null);
      setPlanModel('opus'); setCodeModel('sonnet'); setQaModel('sonnet');
      setPlanThink('high'); setCodeThink('medium'); setQaThink('medium');
    }
  }, [open]);

  useEffect(() => { writeShowTreePref(showTree); }, [showTree]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !showTree || !folderPath) return;
    let cancelled = false;
    setTreeLoading(true);
    window.nightcoder.readRepoTree({ folderPath }).then((res) => {
      if (cancelled) return;
      if (res.kind === 'ok') setTree(res.tree);
      setTreeLoading(false);
    }).catch(() => { if (!cancelled) setTreeLoading(false); });
    return () => { cancelled = true; };
  }, [open, showTree, folderPath]);

  if (!open) return null;

  const canAdd = description.trim().length > 0;

  const pickFiles = async () => {
    setPickError(null);
    try {
      const result = await window.nightcoder.pickFilesToAttach();
      if (result.kind === 'cancelled') return;
      setAttachedFilePaths((prev) => {
        const seen = new Set(prev);
        const next = [...prev];
        for (const p of result.paths) if (!seen.has(p)) { next.push(p); seen.add(p); }
        return next;
      });
    } catch (err) {
      setPickError(err instanceof Error ? err.message : String(err));
    }
  };
  const removeFile = (path: string) => setAttachedFilePaths((prev) => prev.filter((p) => p !== path));

  const submit = () => {
    if (!canAdd) return;
    const agents: StoryAgents = {
      plan: { model: planModel, thinking: planThink },
      code: { model: codeModel, thinking: codeThink },
      qa:   { model: qaModel,   thinking: qaThink   },
    };
    onAdd({
      title: title.trim() || description.trim().split(' ').slice(0, 6).join(' '),
      description: description.trim(),
      acceptance: acceptance.split('\n').map((s) => s.trim()).filter(Boolean),
      model: codeModel,
      agents,
      attachedFilePaths,
      blockingIndex,
    });
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fade-in .14s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(820px, 96vw)', maxHeight: '92vh',
        background: 'var(--bg-1)', border: '1px solid var(--border-2)',
        borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-2)',
        animation: 'slide-up .2s ease',
        display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald)' }}>
            <Icon name="plus" size={16} />
          </div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>New task</h2>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex' }}>
            <Icon name="x" size={16} />
          </button>
        </header>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 14,
          overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: 4,
        }}>
          <Field label="Title" hint="optional">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="What should the agent do?" style={inputStyle} />
          </Field>

          <Field label="Description / brief" required
            hint={showTree
              ? "drag files from the tree — they'll be inserted as @/path references"
              : 'click the tree icon to show the file tree'}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: showTree ? '1fr 240px' : '1fr auto',
              gap: 10, alignItems: 'stretch',
            }}>
              <DescriptionInput value={description} onChange={setDescription} />
              {showTree ? (
                <FileTreePanel
                  folderName={folderPath ? basename(folderPath) : null}
                  tree={tree}
                  loading={treeLoading}
                  onHide={() => setShowTree(false)}
                />
              ) : (
                <button onClick={() => setShowTree(true)} title="Show file tree"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, background: 'var(--bg-2)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    color: 'var(--text-3)', cursor: 'pointer',
                  }}>
                  <Icon name="folder" size={14} />
                </button>
              )}
            </div>
          </Field>

          <Field label="Acceptance criteria" hint="one per line, optional">
            <textarea value={acceptance} onChange={(e) => setAcceptance(e.target.value)}
              placeholder={"Column drag works\nCounts are correct"}
              rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          <Field label="Blocked by" hint="new task will branch off the blocker's branch and PR back into it">
            <BlockedByPicker
              candidates={blockerCandidates}
              value={blockingIndex}
              onChange={setBlockingIndex}
            />
          </Field>

          <Field label="Agents" hint="pick the model and thinking depth for each phase">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <ModelPhaseCard phase="plan" label="Plan" icon="sparkle"
                model={planModel} onModelChange={setPlanModel}
                thinking={planThink} onThinkingChange={setPlanThink} />
              <ModelPhaseCard phase="code" label="Code" icon="terminal"
                model={codeModel} onModelChange={setCodeModel}
                thinking={codeThink} onThinkingChange={setCodeThink} />
              <ModelPhaseCard phase="qa" label="QA" icon="check"
                model={qaModel} onModelChange={setQaModel}
                thinking={qaThink} onThinkingChange={setQaThink} />
            </div>
          </Field>

          <Field label="Attached files" hint="copied into .nightcoder/ and shared with the agent">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachedFilePaths.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {attachedFilePaths.map((p) => (
                    <li key={p} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px', background: 'var(--bg-2)',
                      border: '1px solid var(--border)', borderRadius: 6,
                    }}>
                      <Icon name="file" size={13} />
                      <span title={p} style={{
                        flex: 1, fontSize: 12, fontFamily: 'var(--mono)',
                        color: 'var(--text-1)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                      }}>{basename(p)}</span>
                      <button onClick={() => removeFile(p)} title="Remove"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2, display: 'flex' }}>
                        <Icon name="x" size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div>
                <Btn icon="paperclip" variant="secondary" size="sm" onClick={() => void pickFiles()}>
                  Attach files
                </Btn>
              </div>
              {pickError && (
                <div style={{ fontSize: 11, color: 'var(--rose)' }}>{pickError}</div>
              )}
            </div>
          </Field>
        </div>

        <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" icon="check" disabled={!canAdd} onClick={submit}>
              Add task
            </Btn>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', letterSpacing: '.04em', display: 'flex', gap: 6, alignItems: 'center' }}>
        {label}{required && <span style={{ color: 'var(--emerald)' }}>*</span>}
        {hint && <span style={{ color: 'var(--text-3)', fontWeight: 400, fontStyle: 'italic' }}>· {hint}</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * Description textarea that accepts files dropped from the FileTree and inserts
 * their `@/path` reference at the caret position (or appends if not focused).
 */
function DescriptionInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [over, setOver] = useState(false);

  const insertAtCaret = (text: string) => {
    const el = ref.current;
    if (!el) { onChange(value + text); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
    const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);
    const inserted = (needsSpaceBefore ? ' ' : '') + text + (needsSpaceAfter ? ' ' : '');
    const next = before + inserted + after;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const onDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    if (e.dataTransfer.types.includes(DND_TYPE) || e.dataTransfer.types.includes('text/plain')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setOver(true);
    }
  };
  const onDragLeave = () => setOver(false);
  const onDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setOver(false);
    const dropped = e.dataTransfer.getData(DND_TYPE) || e.dataTransfer.getData('text/plain');
    if (dropped && dropped.startsWith('@/')) insertAtCaret(dropped);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', minHeight: 170 }}>
      <textarea ref={ref} autoFocus value={value} onChange={(e) => onChange(e.target.value)}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        placeholder="Describe the work. Drag a file or folder from the tree → it'll be inserted as @/path/to/file."
        style={{
          ...inputStyle, resize: 'vertical', flex: 1, minHeight: 170,
          outline: over ? '2px dashed var(--emerald)' : undefined,
          outlineOffset: over ? -3 : undefined,
        }} />
      {over && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'var(--accent-soft)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: 'var(--emerald)', fontWeight: 500,
          fontFamily: 'var(--mono)',
        }}>
          drop to insert @/path
        </div>
      )}
    </div>
  );
}

function FileTreePanel({ folderName, tree, loading, onHide }: {
  folderName: string | null;
  tree: FileTreeNode[];
  loading: boolean;
  onHide: () => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => q ? filterTree(tree, '', q) : tree, [tree, q]);
  const matchCount = useMemo(() => q ? countFiles(filtered) : null, [filtered, q]);

  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 8, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', minHeight: 170,
    }}>
      <div style={{
        padding: '6px 10px', fontSize: 10, fontWeight: 600, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--text-3)',
        borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--bg-1)',
      }}>
        <Icon name="folder" size={11} />
        <span style={{
          flex: 1, fontFamily: 'var(--mono)', textTransform: 'none',
          letterSpacing: 0, color: 'var(--text-2)', fontSize: 10,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {folderName || 'project'}
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-3)' }} title="Drag to insert">⇢</span>
        <button onClick={onHide} title="Hide file tree"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex', marginLeft: 2 }}>
          <Icon name="x" size={11} />
        </button>
      </div>

      <div style={{
        padding: '6px 8px', borderBottom: '1px solid var(--border)',
        position: 'relative', display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--bg-1)',
      }}>
        <span style={{ position: 'absolute', left: 16, color: 'var(--text-3)', display: 'flex', pointerEvents: 'none' }}>
          <Icon name="search" size={11} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter files…"
          spellCheck={false}
          style={{
            flex: 1, padding: '5px 24px 5px 26px',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--text-0)',
            fontSize: 11, outline: 'none', fontFamily: 'var(--mono)',
          }} />
        {query && (
          <button onClick={() => setQuery('')} title="Clear"
            style={{
              position: 'absolute', right: 12, background: 'transparent',
              border: 'none', color: 'var(--text-3)', cursor: 'pointer',
              padding: 2, borderRadius: 4, display: 'flex',
            }}>
            <Icon name="x" size={10} />
          </button>
        )}
      </div>

      {q && (
        <div style={{
          padding: '4px 10px', fontSize: 10, color: 'var(--text-3)',
          fontFamily: 'var(--mono)', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-1)',
        }}>
          {matchCount} {matchCount === 1 ? 'match' : 'matches'}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px', fontSize: 12, fontFamily: 'var(--mono)' }}>
        {loading ? (
          <div style={{ padding: '8px 10px', color: 'var(--text-3)', fontStyle: 'italic' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '8px 10px', color: 'var(--text-3)', fontStyle: 'italic' }}>
            {q ? `No matches for "${query}"` : 'No folder opened.'}
          </div>
        ) : filtered.map((n, i) => (
          <TreeNode key={n.name + i} node={n} path="" depth={0} query={q} />
        ))}
      </div>
    </div>
  );
}

function filterTree(nodes: FileTreeNode[], parentPath: string, q: string): FileTreeNode[] {
  const out: FileTreeNode[] = [];
  for (const n of nodes) {
    const full = parentPath ? `${parentPath}/${n.name}` : n.name;
    const selfMatch = n.name.toLowerCase().includes(q) || full.toLowerCase().includes(q);
    if (n.type === 'dir') {
      const kids = n.children ? filterTree(n.children, full, q) : [];
      if (selfMatch || kids.length > 0) {
        out.push({ ...n, children: selfMatch ? (n.children ?? []) : kids });
      }
    } else if (selfMatch) {
      out.push(n);
    }
  }
  return out;
}

function countFiles(nodes: FileTreeNode[]): number {
  let c = 0;
  for (const n of nodes) {
    if (n.type === 'dir') c += countFiles(n.children ?? []);
    else c += 1;
  }
  return c;
}

function TreeNode({ node, path, depth, query }: { node: FileTreeNode; path: string; depth: number; query: string }) {
  const [openState, setOpen] = useState(depth < 1);
  const open = query ? true : openState;
  const fullPath = path ? `${path}/${node.name}` : node.name;
  const ref = `@/${fullPath}`;
  const isDir = node.type === 'dir';

  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(DND_TYPE, ref);
    e.dataTransfer.setData('text/plain', ref);
  };

  return (
    <>
      <div draggable onDragStart={onDragStart}
        onClick={() => isDir && !query && setOpen((o) => !o)}
        title={`Drag to insert ${ref}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: `2px 6px 2px ${6 + depth * 12}px`,
          borderRadius: 4, cursor: isDir ? 'pointer' : 'grab',
          color: isDir ? 'var(--text-1)' : 'var(--text-2)',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-3)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
        {isDir ? (
          <span style={{
            display: 'flex', width: 10, color: 'var(--text-3)',
            transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .1s',
          }}>
            <Icon name="chevron" size={10} />
          </span>
        ) : (
          <span style={{ width: 10 }} />
        )}
        <span style={{ display: 'flex', color: isDir ? 'var(--amber)' : 'var(--text-3)' }}>
          <Icon name={isDir ? 'folder' : 'file'} size={11} />
        </span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {highlightMatch(node.name, query)}
        </span>
      </div>
      {isDir && open && node.children && node.children.map((c, i) => (
        <TreeNode key={c.name + i} node={c} path={fullPath} depth={depth + 1} query={query} />
      ))}
    </>
  );
}

function highlightMatch(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const lower = text.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf(q, i);
    if (at === -1) { out.push(text.slice(i)); break; }
    if (at > i) out.push(text.slice(i, at));
    out.push(
      <mark key={at} style={{
        background: 'var(--accent-soft)', color: 'var(--emerald)',
        padding: 0, borderRadius: 2, fontWeight: 600,
      }}>{text.slice(at, at + q.length)}</mark>
    );
    i = at + q.length;
  }
  return out;
}

function BlockedByPicker({ candidates, value, onChange }: {
  candidates: BlockerCandidate[];
  value: number | null;
  onChange: (idx: number | null) => void;
}) {
  const selected = value !== null ? candidates.find((c) => c.index === value) ?? null : null;
  const available = candidates.filter((c) => c.index !== value);

  if (candidates.length === 0) {
    return (
      <div style={{
        padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8,
        border: '1px dashed var(--border-2)',
        fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic',
      }}>
        No other tasks to branch from yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {selected && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 4px 3px 8px',
            background: 'var(--bg-2)', border: '1px solid var(--border-2)',
            borderRadius: 999, fontSize: 11, color: 'var(--text-1)',
            fontFamily: 'var(--mono)', maxWidth: 360,
          }}>
            <StatusDot status={selected.status} />
            <span style={{ color: 'var(--text-3)' }}>#{selected.numericId ?? selected.index + 1}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--sans)' }}>
              {selected.title}
            </span>
            <button onClick={() => onChange(null)} aria-label="Clear blocker"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 3, borderRadius: 4, display: 'flex' }}>
              <Icon name="x" size={10} />
            </button>
          </span>
        </div>
      )}

      {!selected && available.length > 0 && (
        <div style={{ position: 'relative' }}>
          <select
            value=""
            onChange={(e) => {
              const raw = e.target.value;
              onChange(raw === '' ? null : Number(raw));
            }}
            style={{
              width: '100%', appearance: 'none', WebkitAppearance: 'none',
              padding: '7px 28px 7px 10px',
              background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-3)', fontSize: 12, outline: 'none',
              fontFamily: 'inherit', cursor: 'pointer',
            }}>
            <option value="">Select a task this one blocks on…</option>
            {available.map((c) => (
              <option key={c.index} value={c.index}>
                #{c.numericId ?? c.index + 1} · {c.title} ({c.status})
              </option>
            ))}
          </select>
          <div style={{
            position: 'absolute', right: 10, top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none',
            color: 'var(--text-3)', display: 'flex',
          }}>
            <Icon name="chevronDown" size={12} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: StoryStatus }) {
  const color: Record<StoryStatus, string> = {
    pending: 'var(--text-3)', blocked: 'var(--text-3)',
    running: 'var(--emerald)', pushing: 'var(--sky)',
    review: 'var(--violet)', done: 'var(--emerald)',
    failed: 'var(--rose)', cancelled: 'var(--amber)',
    interrupted: 'var(--amber)',
  };
  const c = color[status] ?? 'var(--text-3)';
  return (
    <span style={{
      width: 6, height: 6, borderRadius: 6, background: c, flexShrink: 0,
      boxShadow: status === 'running' ? `0 0 0 2px ${c}22` : 'none',
    }} />
  );
}

function ModelPhaseCard({
  phase, label, icon,
  model, onModelChange,
  thinking, onThinkingChange,
}: {
  phase: Phase;
  label: string;
  icon: Parameters<typeof Icon>[0]['name'];
  model: string;
  onModelChange: (v: string) => void;
  thinking: ThinkingLevel;
  onThinkingChange: (v: ThinkingLevel) => void;
}) {
  void phase;
  const active = THINKING_LEVELS.find((l) => l.v === thinking) ?? THINKING_LEVELS[2];
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8,
      padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10, fontWeight: 600, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--text-3)',
      }}>
        <Icon name={icon} size={11} />{label}
      </div>

      <div style={{ position: 'relative' }}>
        <select value={model} onChange={(e) => onModelChange(e.target.value)}
          style={{
            width: '100%', appearance: 'none', WebkitAppearance: 'none',
            padding: '5px 22px 5px 8px',
            background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text-0)', fontSize: 12, fontWeight: 500, outline: 'none',
            fontFamily: 'inherit', cursor: 'pointer',
          }}>
          {MODEL_CATALOG.map((m) => (
            <option key={m.v} value={m.v}>{m.name}</option>
          ))}
        </select>
        <div style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: 'var(--text-3)', display: 'flex',
        }}>
          <Icon name="chevronDown" size={11} />
        </div>
      </div>

      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase',
          color: 'var(--text-3)', marginBottom: 4,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="sparkle" size={9} />Thinking
          </span>
          <span style={{
            fontFamily: 'var(--mono)', color: active.color, fontWeight: 600,
            textTransform: 'none', letterSpacing: 0,
          }}>{active.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {THINKING_LEVELS.map((lvl) => {
            const isActive = lvl.v === thinking;
            return (
              <button key={lvl.v} type="button" onClick={() => onThinkingChange(lvl.v)}
                title={`Thinking: ${lvl.label}`}
                style={{
                  flex: 1, height: 20, padding: 0,
                  background: isActive ? 'var(--bg-1)' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? lvl.color : 'var(--border)',
                  boxShadow: isActive ? `0 0 0 1px ${lvl.color}22 inset` : 'none',
                  borderRadius: 5, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
                }}>
                {lvl.dots === 0 ? (
                  <span style={{
                    fontSize: 9, color: isActive ? lvl.color : 'var(--text-3)', fontWeight: 600,
                  }}>∅</span>
                ) : (
                  Array.from({ length: lvl.dots }).map((_, i) => (
                    <span key={i} style={{
                      width: 3, height: 3, borderRadius: 3,
                      background: isActive ? lvl.color : 'var(--text-3)',
                      opacity: isActive ? 1 : 0.5,
                    }} />
                  ))
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PhaseModels, PhaseModel, RepoTreeEntry, ThinkingLevel } from '@nightcoder/shared-types/ipc';
import { Icon } from './icons';
import { Btn } from './primitives';

export type NewTaskData = {
  title: string;
  description: string;
  acceptance: string[];
  model?: string;
  attachedFilePaths: string[];
  phaseModels?: PhaseModels;
  blockerTaskId?: string;
};

export type BlockerOption = {
  taskId: string;
  title: string;
  /** Shown alongside the title so users can tell similarly-named tasks apart. */
  hint?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (data: NewTaskData) => void;
  /** Callers pass the repo root when a folder is selected — enables the file tree. */
  folderPath?: string | null;
  /** Existing tasks the new one can depend on. */
  blockerOptions?: readonly BlockerOption[];
};

type PhaseKey = 'planning' | 'implementation' | 'qa';
const PHASES: readonly { key: PhaseKey; label: string; hint: string }[] = [
  { key: 'planning',       label: 'Planning',       hint: 'break the brief into a plan' },
  { key: 'implementation', label: 'Implementation', hint: 'write the code (used today)' },
  { key: 'qa',             label: 'QA',             hint: 'verify tests & acceptance' },
];

const MODEL_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '',       label: 'Default (sonnet)' },
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus',   label: 'Opus' },
  { value: 'haiku',  label: 'Haiku' },
];

const THINKING_OPTIONS: readonly { value: ThinkingLevel; label: string }[] = [
  { value: 'off',    label: 'No extra thinking' },
  { value: 'low',    label: 'Think briefly' },
  { value: 'medium', label: 'Think carefully' },
  { value: 'high',   label: 'Think deeply' },
];

const INPUT_BORDER_COLOR = 'var(--border)';
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: 'var(--bg-2)', border: `1px solid ${INPUT_BORDER_COLOR}`,
  borderRadius: 8, color: 'var(--text-0)', fontSize: 13,
  outline: 'none', transition: 'border-color .12s',
};

const DRAG_MIME = 'application/x-nightcoder-path';

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

/** Recursively keep only nodes whose path or descendants match the query. */
function filterTree(nodes: readonly RepoTreeEntry[], query: string): RepoTreeEntry[] {
  if (!query) return [...nodes];
  const q = query.toLowerCase();
  const out: RepoTreeEntry[] = [];
  for (const n of nodes) {
    if (n.kind === 'dir' && n.children) {
      const kids = filterTree(n.children, query);
      if (kids.length > 0 || n.path.toLowerCase().includes(q)) {
        out.push({ ...n, children: kids });
      }
    } else if (n.path.toLowerCase().includes(q) || n.name.toLowerCase().includes(q)) {
      out.push(n);
    }
  }
  return out;
}

/** Collect every dir path under a tree — used to auto-expand when filtering. */
function collectDirPaths(nodes: readonly RepoTreeEntry[], into: Set<string>): void {
  for (const n of nodes) {
    if (n.kind === 'dir') {
      into.add(n.path);
      if (n.children) collectDirPaths(n.children, into);
    }
  }
}

export function AddTaskDialog({ open, onClose, onAdd, folderPath, blockerOptions }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptance, setAcceptance] = useState('');
  const [phaseModels, setPhaseModels] = useState<PhaseModels>({});
  const [blockerTaskId, setBlockerTaskId] = useState<string>('');
  const [attachedFilePaths, setAttachedFilePaths] = useState<string[]>([]);
  const [pickError, setPickError] = useState<string | null>(null);

  const [tree, setTree] = useState<RepoTreeEntry[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeFilter, setTreeFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [dropActive, setDropActive] = useState(false);

  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Reset state whenever the dialog opens ─────────────────────────────
  useEffect(() => {
    if (!open) return;
    setTitle(''); setDescription(''); setAcceptance('');
    setPhaseModels({}); setBlockerTaskId('');
    setAttachedFilePaths([]); setPickError(null);
    setTreeFilter(''); setExpanded(new Set()); setDropActive(false);
  }, [open]);

  // ── Load repo tree when the dialog opens and a folder is set ─────────
  useEffect(() => {
    if (!open || !folderPath) {
      setTree([]); setTreeError(null); setTreeLoading(false);
      return;
    }
    let cancelled = false;
    setTreeLoading(true); setTreeError(null);
    window.nightcoder.listRepoTree({ folderPath })
      .then((res) => {
        if (cancelled) return;
        if (res.kind === 'ok') {
          setTree(res.tree);
        } else {
          setTree([]); setTreeError(res.message);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTree([]); setTreeError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => { if (!cancelled) setTreeLoading(false); });
    return () => { cancelled = true; };
  }, [open, folderPath]);

  // ── Esc closes, ignoring typing inside form controls ─────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filteredTree = useMemo(() => filterTree(tree, treeFilter), [tree, treeFilter]);

  // When the user filters the tree, auto-expand every remaining directory so
  // matches aren't hidden behind a collapsed parent.
  const effectiveExpanded = useMemo(() => {
    if (!treeFilter) return expanded;
    const s = new Set(expanded);
    collectDirPaths(filteredTree, s);
    return s;
  }, [expanded, filteredTree, treeFilter]);

  if (!open) return null;

  const canAdd = description.trim().length > 0;

  const setPhase = (key: PhaseKey, patch: Partial<PhaseModel>): void => {
    setPhaseModels((prev) => {
      const current = prev[key] ?? {};
      const next: PhaseModel = { ...current, ...patch };
      // Drop the phase entirely if it's been cleared — keeps the persisted
      // shape minimal and makes backward-compat easy.
      if (!next.model && (!next.thinking || next.thinking === 'off')) {
        const { [key]: _omit, ...rest } = prev;
        void _omit;
        return rest;
      }
      return { ...prev, [key]: next };
    });
  };

  const pickFiles = async () => {
    setPickError(null);
    try {
      const result = await window.nightcoder.pickFilesToAttach();
      if (result.kind === 'cancelled') return;
      setAttachedFilePaths((prev) => {
        const seen = new Set(prev);
        const next = [...prev];
        for (const p of result.paths) {
          if (!seen.has(p)) { next.push(p); seen.add(p); }
        }
        return next;
      });
    } catch (err) {
      setPickError(err instanceof Error ? err.message : String(err));
    }
  };

  const removeFile = (path: string) => {
    setAttachedFilePaths((prev) => prev.filter((p) => p !== path));
  };

  const toggleDir = (dirPath: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath); else next.add(dirPath);
      return next;
    });
  };

  // ── Drop target: insert @path at the caret position ──────────────────
  const insertAtCaret = (text: string) => {
    const ta = descriptionRef.current;
    if (!ta) {
      setDescription((prev) => (prev.length > 0 && !prev.endsWith(' ') ? `${prev} ${text}` : `${prev}${text}`));
      return;
    }
    const start = ta.selectionStart ?? description.length;
    const end = ta.selectionEnd ?? description.length;
    const before = description.slice(0, start);
    const after = description.slice(end);
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
    const needsTrailingSpace = after.length > 0 && !/^\s/.test(after);
    const insertion = `${needsLeadingSpace ? ' ' : ''}${text}${needsTrailingSpace ? ' ' : ''}`;
    const next = `${before}${insertion}${after}`;
    setDescription(next);
    // Re-place the caret after the insertion once React commits.
    requestAnimationFrame(() => {
      const el = descriptionRef.current;
      if (!el) return;
      const caret = before.length + insertion.length;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const onDescriptionDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const path = e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData('text/plain');
    if (!path) return;
    e.preventDefault();
    setDropActive(false);
    insertAtCaret(`@${path}`);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fade-in .14s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(960px, 96vw)', maxHeight: '92vh',
        background: 'var(--bg-1)', border: '1px solid var(--border-2)',
        borderRadius: 14, boxShadow: 'var(--shadow-2)',
        animation: 'slide-up .2s ease',
        display: 'flex', flexDirection: 'column',
      }}>
        <header style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 20px 14px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald)' }}>
            <Icon name="plus" size={16} />
          </div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>New task</h2>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
            drag a file from the tree into the description to reference it with @path
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex' }} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </header>

        <div style={{ display: 'flex', gap: 0, flex: 1, minHeight: 0 }}>
          {/* ── File tree panel ─────────────────────────────────── */}
          <aside style={{
            width: 300, flexShrink: 0,
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-0)',
            display: 'flex', flexDirection: 'column', minHeight: 0,
          }}>
            <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 8px', background: 'var(--bg-2)',
                border: '1px solid var(--border)', borderRadius: 6,
              }}>
                <Icon name="search" size={12} />
                <input
                  value={treeFilter}
                  onChange={(e) => setTreeFilter(e.target.value)}
                  placeholder="Filter files…"
                  aria-label="Filter files"
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    color: 'var(--text-0)', fontSize: 12, outline: 'none',
                    fontFamily: 'var(--mono)',
                  }}
                />
                {treeFilter && (
                  <button
                    onClick={() => setTreeFilter('')}
                    aria-label="Clear filter"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <Icon name="x" size={11} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 4px 12px', minHeight: 0 }}>
              {!folderPath && (
                <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-3)' }}>
                  Pick a folder to see its file tree.
                </div>
              )}
              {folderPath && treeLoading && (
                <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-3)' }}>
                  Loading tree…
                </div>
              )}
              {folderPath && treeError && (
                <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--rose)' }}>
                  Couldn't load tree: {treeError}
                </div>
              )}
              {folderPath && !treeLoading && !treeError && filteredTree.length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-3)' }}>
                  {treeFilter ? 'No files match this filter.' : 'No files found.'}
                </div>
              )}
              {folderPath && filteredTree.length > 0 && (
                <TreeList
                  nodes={filteredTree}
                  depth={0}
                  expanded={effectiveExpanded}
                  onToggle={toggleDir}
                />
              )}
            </div>
          </aside>

          {/* ── Form ────────────────────────────────────────────── */}
          <div style={{
            flex: 1, minWidth: 0, overflow: 'auto',
            padding: '18px 20px 20px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <Field label="Title" hint="optional">
              <input
                value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="What should the agent do?" style={inputStyle}
              />
            </Field>
            <Field label="Description / brief" required hint="drop a file from the tree to paste @path">
              <textarea
                ref={descriptionRef}
                autoFocus
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes(DRAG_MIME) || e.dataTransfer.types.includes('text/plain')) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    setDropActive(true);
                  }
                }}
                onDragLeave={() => setDropActive(false)}
                onDrop={onDescriptionDrop}
                placeholder="Describe the work. Drag files from the tree to reference them with @path."
                rows={5}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  borderColor: dropActive ? 'var(--emerald)' : INPUT_BORDER_COLOR,
                  boxShadow: dropActive ? '0 0 0 2px rgba(16,185,129,.2)' : undefined,
                }}
              />
            </Field>

            <Field label="Acceptance criteria" hint="one per line, optional">
              <textarea value={acceptance} onChange={(e) => setAcceptance(e.target.value)}
                placeholder={"Column drag works\nCounts are correct"}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>

            {/* ── Phases section ─────────────────────────────── */}
            <section>
              <SectionHeader
                title="Phase models"
                hint="Implementation drives today's single run. Planning / QA are saved for the upcoming multi-phase executor."
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PHASES.map(({ key, label, hint }) => {
                  const cur = phaseModels[key] ?? {};
                  return (
                    <div
                      key={key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 1fr 1fr',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 500 }}>{label}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{hint}</span>
                      </div>
                      <select
                        aria-label={`${label} model`}
                        value={cur.model ?? ''}
                        onChange={(e) => setPhase(key, { model: e.target.value || undefined })}
                        style={{ ...inputStyle, height: 32 }}
                      >
                        {MODEL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <select
                        aria-label={`${label} thinking`}
                        value={cur.thinking ?? 'off'}
                        onChange={(e) => setPhase(key, { thinking: e.target.value as ThinkingLevel })}
                        style={{ ...inputStyle, height: 32 }}
                      >
                        {THINKING_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Blocker selector ──────────────────────────── */}
            <Field label="Blocked by" hint="optional — branch off this task and target its PR branch">
              <select
                value={blockerTaskId}
                onChange={(e) => setBlockerTaskId(e.target.value)}
                style={{ ...inputStyle, height: 32 }}
              >
                <option value="">No blocker (branch off main)</option>
                {(blockerOptions ?? []).map((opt) => (
                  <option key={opt.taskId} value={opt.taskId}>
                    {opt.hint ? `${opt.hint} — ${opt.title}` : opt.title}
                  </option>
                ))}
              </select>
            </Field>

            {/* ── Attachments (existing flow) ───────────────── */}
            <Field label="Attached files" hint="copied into .nightcoder/tasks/<id>/files — shared with the agent">
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
                        <span
                          title={p}
                          style={{
                            flex: 1, fontSize: 12, fontFamily: 'var(--mono)',
                            color: 'var(--text-1)', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                          }}
                        >
                          {basename(p)}
                        </span>
                        <button
                          onClick={() => removeFile(p)}
                          title="Remove"
                          aria-label={`Remove ${basename(p)}`}
                          style={{
                            background: 'transparent', border: 'none',
                            color: 'var(--text-3)', cursor: 'pointer',
                            padding: 2, display: 'flex',
                          }}
                        >
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
        </div>

        <footer style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          padding: '14px 20px 16px', borderTop: '1px solid var(--border)',
        }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            icon="check"
            disabled={!canAdd}
            onClick={() => canAdd && onAdd({
              title: title.trim() || description.trim().split(' ').slice(0, 6).join(' '),
              description: description.trim(),
              acceptance: acceptance.split('\n').map((s) => s.trim()).filter(Boolean),
              model: phaseModels.implementation?.model || undefined,
              attachedFilePaths,
              phaseModels: Object.keys(phaseModels).length > 0 ? phaseModels : undefined,
              blockerTaskId: blockerTaskId || undefined,
            })}
          >
            Add task
          </Btn>
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

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', letterSpacing: '.04em' }}>{title}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function TreeList({
  nodes,
  depth,
  expanded,
  onToggle,
}: {
  nodes: readonly RepoTreeEntry[];
  depth: number;
  expanded: ReadonlySet<string>;
  onToggle: (path: string) => void;
}) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={depth}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: RepoTreeEntry;
  depth: number;
  expanded: ReadonlySet<string>;
  onToggle: (path: string) => void;
}) {
  const isDir = node.kind === 'dir';
  const isOpen = isDir && expanded.has(node.path);
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME, node.path);
    e.dataTransfer.setData('text/plain', `@${node.path}`);
    e.dataTransfer.effectAllowed = 'copy';
  };
  return (
    <li>
      <div
        draggable
        onDragStart={onDragStart}
        onClick={() => isDir && onToggle(node.path)}
        title={node.path}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          paddingLeft: 8 + depth * 12, paddingRight: 8,
          paddingTop: 3, paddingBottom: 3,
          cursor: isDir ? 'pointer' : 'grab',
          fontSize: 12, color: 'var(--text-1)',
          fontFamily: 'var(--mono)',
          userSelect: 'none',
          borderRadius: 4,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ width: 12, display: 'flex', alignItems: 'center', color: 'var(--text-3)' }}>
          {isDir ? <Icon name={isOpen ? 'chevronDown' : 'chevron'} size={10} /> : null}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', color: isDir ? 'var(--text-2)' : 'var(--text-1)' }}>
          <Icon name={isDir ? 'folder' : 'file'} size={11} />
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
      </div>
      {isDir && isOpen && node.children && node.children.length > 0 && (
        <TreeList nodes={node.children} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
      )}
    </li>
  );
}

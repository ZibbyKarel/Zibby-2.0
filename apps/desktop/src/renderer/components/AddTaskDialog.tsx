import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PhaseModels, PhaseModel, RepoTreeEntry, ThinkingLevel } from '@nightcoder/shared-types/ipc';
import {
  Button,
  Icon,
  IconButton,
  IconName,
  Surface,
  Text,
  Textarea,
  TextField,
} from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';

export type NewTaskData = {
  title: string;
  description: string;
  acceptance: string[];
  model?: string;
  attachedFilePaths: string[];
  phaseModels?: PhaseModels;
  blockerTaskId?: string;
  /**
   * When false, the orchestrator runs the task end-to-end: it auto-resolves any
   * rebase conflicts via the AI executor and auto-merges the PR once it is
   * mergeable. Defaults to true (the existing human-review flow).
   */
  requiresHumanReview: boolean;
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

const PHASES: readonly {
  key: PhaseKey;
  label: string;
  icon: IconName;
  defaultModel: string;
  defaultThinking: ThinkingLevel;
}[] = [
  { key: 'planning',       label: 'Plan', icon: IconName.Sparkle, defaultModel: 'opus-4.5',   defaultThinking: 'high'   },
  { key: 'implementation', label: 'Code', icon: IconName.Zap,     defaultModel: 'sonnet-4.5', defaultThinking: 'medium' },
  { key: 'qa',             label: 'QA',   icon: IconName.Check,   defaultModel: 'sonnet-4.5', defaultThinking: 'medium' },
];

const MODEL_CATALOG: readonly { value: string; label: string; tag: string; cost: string }[] = [
  { value: 'opus-4.5',   label: 'Opus 4.5',   tag: 'reasoning', cost: '$$$' },
  { value: 'sonnet-4.5', label: 'Sonnet 4.5', tag: 'balanced',  cost: '$$'  },
  { value: 'sonnet-3.7', label: 'Sonnet 3.7', tag: 'balanced',  cost: '$$'  },
  { value: 'haiku-4.5',  label: 'Haiku 4.5',  tag: 'fast',      cost: '$'   },
  { value: 'gpt-5',      label: 'GPT-5',       tag: 'reasoning', cost: '$$$' },
  { value: 'gemini-2.5', label: 'Gemini 2.5', tag: 'balanced',  cost: '$$'  },
];

const THINKING_LEVELS: readonly { value: ThinkingLevel; label: string; dots: number; color: string }[] = [
  { value: 'off',    label: 'Off',  dots: 0, color: 'var(--text-3)'  },
  { value: 'low',    label: 'Low',  dots: 1, color: 'var(--sky)'     },
  { value: 'medium', label: 'Med',  dots: 2, color: 'var(--amber)'   },
  { value: 'high',   label: 'High', dots: 3, color: 'var(--emerald)' },
];

const DRAG_MIME = 'application/x-nightcoder-path';

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: 'var(--bg-2)',
  border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-0)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .12s, box-shadow .12s', fontFamily: 'inherit',
};

const FIELD_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: 'var(--text-2)',
  letterSpacing: '.04em', display: 'flex', gap: 6, alignItems: 'center',
};

function FieldLabel({ label, hint, required }: { label: string; hint?: string; required?: boolean }) {
  return (
    <span style={FIELD_LABEL_STYLE}>
      {label}
      {required && <span style={{ color: 'var(--emerald)' }}>*</span>}
      {hint && (
        <span style={{ color: 'var(--text-3)', fontWeight: 400, fontStyle: 'italic' }}>
          · {hint}
        </span>
      )}
    </span>
  );
}

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

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
  const [requiresHumanReview, setRequiresHumanReview] = useState<boolean>(true);
  const [dropActive, setDropActive] = useState(false);

  const [showTree, setShowTree] = useState<boolean>(() => {
    try { return localStorage.getItem('zb.addTask.showTree') !== '0'; }
    catch { return true; }
  });

  const [tree, setTree] = useState<RepoTreeEntry[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeFilter, setTreeFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try { localStorage.setItem('zb.addTask.showTree', showTree ? '1' : '0'); }
    catch { /* noop */ }
  }, [showTree]);

  useEffect(() => {
    if (!open) return;
    setTitle(''); setDescription(''); setAcceptance('');
    setPhaseModels({}); setBlockerTaskId('');
    setRequiresHumanReview(true);
    setDropActive(false);
    setTreeFilter(''); setExpanded(new Set());
  }, [open]);

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filteredTree = useMemo(() => filterTree(tree, treeFilter), [tree, treeFilter]);

  const effectiveExpanded = useMemo(() => {
    if (!treeFilter) return expanded;
    const s = new Set(expanded);
    collectDirPaths(filteredTree, s);
    return s;
  }, [expanded, filteredTree, treeFilter]);

  if (!open) return null;

  const canAdd = description.trim().length > 0;

  const getPhaseModel = (key: PhaseKey): string => {
    const phase = PHASES.find(p => p.key === key)!;
    return phaseModels[key]?.model ?? phase.defaultModel;
  };

  const getPhaseThinking = (key: PhaseKey): ThinkingLevel => {
    const phase = PHASES.find(p => p.key === key)!;
    return phaseModels[key]?.thinking ?? phase.defaultThinking;
  };

  const setPhase = (key: PhaseKey, patch: Partial<PhaseModel>): void => {
    setPhaseModels((prev) => {
      const current = prev[key] ?? {};
      const next: PhaseModel = { ...current, ...patch };
      if (!next.model && (!next.thinking || next.thinking === 'off')) {
        const { [key]: _omit, ...rest } = prev;
        void _omit;
        return rest;
      }
      return { ...prev, [key]: next };
    });
  };

  const buildFinalPhaseModels = (): PhaseModels => {
    const result: PhaseModels = {};
    for (const phase of PHASES) {
      result[phase.key] = {
        model: phaseModels[phase.key]?.model ?? phase.defaultModel,
        thinking: phaseModels[phase.key]?.thinking ?? phase.defaultThinking,
      };
    }
    return result;
  };

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

  const toggleDir = (dirPath: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath); else next.add(dirPath);
      return next;
    });
  };

  const folderName = folderPath ? basename(folderPath) : 'project';

  return (
    <Surface
      onClick={onClose}
      position="fixed"
      top={0}
      right={0}
      bottom={0}
      left={0}
      zIndex={60}
      background="backdrop"
      direction="row"
      align="center"
      justify="center"
    >
      <Surface
        onClick={(e) => e.stopPropagation()}
        width="min(820px, 96vw)"
        maxHeight="92vh"
        background="bg1"
        bordered
        borderTone="strong"
        radius="md"
        shadow="2"
        direction="column"
        data-testid={TestIds.AddTaskDialog.root}
      >
        {/* Header */}
        <Surface
          as="header"
          bordered={{ bottom: true }}
          paddingX={20}
          paddingTop={16}
          paddingBottom={14}
          direction="row"
          align="center"
          gap={10}
        >
          <Surface
            background="accentSoft"
            radius="sm"
            width={32}
            height={32}
            direction="row"
            align="center"
            justify="center"
          >
            <Icon value={IconName.Plus} size="md" />
          </Surface>
          <Text as="h2" size="lg" weight="semibold">New task</Text>
          <Surface grow />
          <IconButton
            aria-label="Close"
            size="sm"
            variant="ghost"
            icon={IconName.X}
            onClick={onClose}
            data-testid={TestIds.AddTaskDialog.closeBtn}
          />
        </Surface>

        {/* Scrollable form */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 14,
          overflowY: 'auto', flex: 1, minHeight: 0,
          padding: '18px 20px 20px',
        }}>
          <TextField
            label="Title"
            helperText="optional — we'll infer one from the description if empty"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What should the agent do?"
            data-testid={TestIds.AddTaskDialog.titleInput}
          />

          {/* Description + file tree panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel
              label="Description / brief"
              hint={showTree
                ? "drag files from the tree — they'll be inserted as @/path references"
                : 'click the tree icon to show the file tree'}
              required
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: showTree ? '1fr 240px' : '1fr auto',
              gap: 10,
              alignItems: 'stretch',
            }}>
              <div style={{ position: 'relative', display: 'flex', minHeight: 170 }}>
                <textarea
                  ref={descriptionRef}
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
                  autoFocus
                  placeholder="Describe the work. Drag a file or folder from the tree → it'll be inserted as @/path/to/file."
                  style={{
                    ...INPUT_STYLE,
                    resize: 'vertical',
                    flex: 1,
                    minHeight: 170,
                    outline: dropActive ? '2px dashed var(--emerald)' : undefined,
                    outlineOffset: dropActive ? -3 : undefined,
                  }}
                  data-testid={TestIds.AddTaskDialog.descriptionInput}
                />
                {dropActive && (
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

              {showTree ? (
                <FileTreePanel
                  folderName={folderName}
                  loading={treeLoading}
                  error={treeError}
                  hasFolderPath={!!folderPath}
                  filter={treeFilter}
                  onFilterChange={setTreeFilter}
                  filteredTree={filteredTree}
                  effectiveExpanded={effectiveExpanded}
                  onToggle={toggleDir}
                  onHide={() => setShowTree(false)}
                />
              ) : (
                <button
                  onClick={() => setShowTree(true)}
                  title="Show file tree"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, background: 'var(--bg-2)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    color: 'var(--text-3)', cursor: 'pointer',
                    transition: 'color .12s, background .12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--emerald)';
                    e.currentTarget.style.background = 'var(--bg-3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-3)';
                    e.currentTarget.style.background = 'var(--bg-2)';
                  }}
                >
                  <Icon value={IconName.Folder} size="xs" />
                </button>
              )}
            </div>
          </div>

          <Textarea
            label="Acceptance criteria"
            helperText="one per line, optional"
            value={acceptance}
            onChange={(e) => setAcceptance(e.target.value)}
            placeholder={'Column drag works\nCounts are correct\nPersists to localStorage'}
            rows={3}
            data-testid={TestIds.AddTaskDialog.acceptanceInput}
          />

          {/* Blocked by */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel label="Blocked by" hint="task will wait until dependencies finish" />
            <div style={{ position: 'relative' }}>
              <select
                value={blockerTaskId}
                onChange={(e) => setBlockerTaskId(e.target.value)}
                style={{
                  width: '100%', appearance: 'none', WebkitAppearance: 'none',
                  padding: '7px 28px 7px 10px',
                  background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8,
                  color: blockerTaskId ? 'var(--text-0)' : 'var(--text-3)',
                  fontSize: 12, outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
                data-testid={TestIds.AddTaskDialog.blockerSelect}
              >
                <option value="">Select a task this depends on…</option>
                {(blockerOptions ?? []).map((opt) => (
                  <option key={opt.taskId} value={opt.taskId}>
                    {opt.hint ? `${opt.hint} — ${opt.title}` : opt.title}
                  </option>
                ))}
              </select>
              <div style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', color: 'var(--text-3)', display: 'flex',
              }}>
                <Icon value={IconName.ChevronDown} size="xs" />
              </div>
            </div>
          </div>

          {/* Review */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel label="Review" />
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', background: 'var(--bg-2)',
              border: `1px solid ${requiresHumanReview ? 'var(--emerald)' : 'var(--border)'}`,
              borderRadius: 8, cursor: 'pointer',
              transition: 'border-color .12s',
            }}>
              <input
                type="checkbox"
                checked={requiresHumanReview}
                onChange={(e) => setRequiresHumanReview(e.target.checked)}
                style={{
                  marginTop: 2, width: 14, height: 14,
                  accentColor: 'var(--emerald)' as string,
                  cursor: 'pointer', flexShrink: 0,
                } as React.CSSProperties}
                data-testid={TestIds.AddTaskDialog.requiresReviewCheckbox}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-0)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Human review required
                  {requiresHumanReview && (
                    <span style={{
                      fontSize: 9, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
                      padding: '1px 6px', borderRadius: 3,
                      background: 'var(--accent-soft)', color: 'var(--emerald)',
                      fontFamily: 'var(--mono)',
                    }}>default</span>
                  )}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  Pause before merging so you can sign off on the agent's work.
                </span>
              </div>
            </label>
          </div>

          {/* Agents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel label="Agents" hint="pick the model and thinking depth for each phase" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {PHASES.map((phase) => (
                <ModelPickCard
                  key={phase.key}
                  label={phase.label}
                  icon={phase.icon}
                  model={getPhaseModel(phase.key)}
                  onModelChange={(m) => setPhase(phase.key, { model: m })}
                  thinking={getPhaseThinking(phase.key)}
                  onThinkChange={(t) => setPhase(phase.key, { thinking: t })}
                  phaseModelSelectTestId={TestIds.AddTaskDialog.phaseModelSelect(phase.key)}
                  phaseThinkingSelectTestId={TestIds.AddTaskDialog.phaseThinkingSelect(phase.key)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <Surface
          as="footer"
          bordered={{ top: true }}
          paddingX={20}
          paddingTop={14}
          paddingBottom={16}
          direction="row"
          align="center"
          justify="end"
          gap={8}
        >
          <Button
            variant="ghost"
            label="Cancel"
            onClick={onClose}
            data-testid={TestIds.AddTaskDialog.cancelBtn}
          />
          <Button
            variant="primary"
            label="Add task"
            startIcon={IconName.Check}
            disabled={!canAdd}
            onClick={() => canAdd && onAdd({
              title: title.trim() || description.trim().split(' ').slice(0, 6).join(' '),
              description: description.trim(),
              acceptance: acceptance.split('\n').map((s) => s.trim()).filter(Boolean),
              model: getPhaseModel('implementation'),
              attachedFilePaths: [],
              phaseModels: buildFinalPhaseModels(),
              blockerTaskId: blockerTaskId || undefined,
              requiresHumanReview,
            })}
            data-testid={TestIds.AddTaskDialog.submitBtn}
          />
        </Surface>
      </Surface>
    </Surface>
  );
}

// ── Model pick card ────────────────────────────────────────────────────────────

function ModelPickCard({
  label, icon, model, onModelChange, thinking, onThinkChange,
  phaseModelSelectTestId, phaseThinkingSelectTestId,
}: {
  label: string;
  icon: IconName;
  model: string;
  onModelChange: (model: string) => void;
  thinking: ThinkingLevel;
  onThinkChange: (level: ThinkingLevel) => void;
  phaseModelSelectTestId?: string;
  phaseThinkingSelectTestId?: string;
}) {
  const selectedMeta = MODEL_CATALOG.find(m => m.value === model) ?? MODEL_CATALOG[1];
  const activeThink = THINKING_LEVELS.find(l => l.value === thinking) ?? THINKING_LEVELS[2];

  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8,
      padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0,
    }}>
      {/* Phase label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10, fontWeight: 600, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--text-3)',
      }}>
        <Icon value={icon} size="xs" />
        {label}
      </div>

      {/* Model select */}
      <div style={{ position: 'relative' }}>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          style={{
            width: '100%', appearance: 'none', WebkitAppearance: 'none',
            padding: '5px 22px 5px 8px',
            background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text-0)', fontSize: 12, fontWeight: 500, outline: 'none',
            fontFamily: 'inherit', cursor: 'pointer', boxSizing: 'border-box',
          }}
          data-testid={phaseModelSelectTestId}
        >
          {MODEL_CATALOG.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <div style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: 'var(--text-3)', display: 'flex',
        }}>
          <Icon value={IconName.ChevronDown} size="xs" />
        </div>
      </div>

      {/* Thinking level */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase',
          color: 'var(--text-3)', marginBottom: 4,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon value={IconName.Sparkle} size="xs" /> Thinking
          </span>
          <span style={{
            fontFamily: 'var(--mono)', color: activeThink.color, fontWeight: 600,
            textTransform: 'none', letterSpacing: 0,
          }}>
            {activeThink.label}
          </span>
        </div>
        <div
          style={{ display: 'flex', gap: 3 }}
          data-testid={phaseThinkingSelectTestId}
        >
          {THINKING_LEVELS.map(lvl => {
            const active = lvl.value === thinking;
            return (
              <button
                key={lvl.value}
                onClick={() => onThinkChange(lvl.value)}
                title={`Thinking: ${lvl.label}`}
                style={{
                  flex: 1, height: 20, padding: 0,
                  background: active ? 'var(--bg-1)' : 'transparent',
                  border: '1px solid',
                  borderColor: active ? lvl.color : 'var(--border)',
                  borderRadius: 5, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
                  transition: 'all .12s',
                }}
              >
                {lvl.dots === 0 ? (
                  <span style={{ fontSize: 9, color: active ? lvl.color : 'var(--text-3)', fontWeight: 600 }}>∅</span>
                ) : (
                  Array.from({ length: lvl.dots }).map((_, i) => (
                    <span key={i} style={{
                      width: 3, height: 3, borderRadius: 3,
                      background: active ? lvl.color : 'var(--text-3)',
                      opacity: active ? 1 : 0.5,
                    }} />
                  ))
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tag + cost */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-3)',
      }}>
        <span>{selectedMeta.tag}</span>
        <span>{selectedMeta.cost}</span>
      </div>
    </div>
  );
}

// ── File tree panel ────────────────────────────────────────────────────────────

function FileTreePanel({
  folderName, loading, error, hasFolderPath, filter, onFilterChange,
  filteredTree, effectiveExpanded, onToggle, onHide,
}: {
  folderName: string;
  loading: boolean;
  error: string | null;
  hasFolderPath: boolean;
  filter: string;
  onFilterChange: (q: string) => void;
  filteredTree: readonly RepoTreeEntry[];
  effectiveExpanded: ReadonlySet<string>;
  onToggle: (path: string) => void;
  onHide: () => void;
}) {
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 8, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', minHeight: 170,
    }}>
      {/* Header */}
      <div style={{
        padding: '6px 10px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--bg-1)',
      }}>
        <Icon value={IconName.Folder} size="xs" />
        <span style={{
          flex: 1, fontFamily: 'var(--mono)', color: 'var(--text-2)', fontSize: 10,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {folderName}
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-3)' }} title="Drag to insert">⇢</span>
        <button
          onClick={onHide}
          title="Hide file tree"
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-3)',
            cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex', marginLeft: 2,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          <Icon value={IconName.X} size="xs" />
        </button>
      </div>

      {/* Filter input */}
      <div style={{
        padding: '6px 8px', borderBottom: '1px solid var(--border)',
        position: 'relative', display: 'flex', alignItems: 'center',
        background: 'var(--bg-1)',
      }}>
        <span style={{ position: 'absolute', left: 16, color: 'var(--text-3)', display: 'flex', pointerEvents: 'none' }}>
          <Icon value={IconName.Search} size="xs" />
        </span>
        <input
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter files…"
          spellCheck={false}
          style={{
            flex: 1, padding: '5px 24px 5px 26px',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--text-0)',
            fontSize: 11, outline: 'none', fontFamily: 'var(--mono)',
            boxSizing: 'border-box',
          }}
        />
        {filter && (
          <button
            onClick={() => onFilterChange('')}
            title="Clear"
            style={{
              position: 'absolute', right: 12, background: 'transparent',
              border: 'none', color: 'var(--text-3)', cursor: 'pointer',
              padding: 2, borderRadius: 4, display: 'flex',
            }}
          >
            <Icon value={IconName.X} size="xs" />
          </button>
        )}
      </div>

      {/* Tree content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
        {!hasFolderPath && (
          <div style={{ padding: '8px 10px', color: 'var(--text-3)', fontStyle: 'italic', fontSize: 11 }}>
            Pick a folder to see its file tree.
          </div>
        )}
        {hasFolderPath && loading && (
          <div style={{ padding: '8px 10px', color: 'var(--text-3)', fontSize: 11 }}>
            Loading tree…
          </div>
        )}
        {hasFolderPath && error && (
          <div style={{ padding: '8px 10px', color: 'var(--rose)', fontSize: 11 }}>
            Couldn&apos;t load tree: {error}
          </div>
        )}
        {hasFolderPath && !loading && !error && filteredTree.length === 0 && (
          <div style={{ padding: '8px 10px', color: 'var(--text-3)', fontStyle: 'italic', fontSize: 11 }}>
            {filter ? 'No files match this filter.' : 'No files found.'}
          </div>
        )}
        {filteredTree.length > 0 && (
          <TreeList nodes={filteredTree} depth={0} expanded={effectiveExpanded} onToggle={onToggle} />
        )}
      </div>
    </div>
  );
}

// ── Tree list / node ───────────────────────────────────────────────────────────

function TreeList({
  nodes, depth, expanded, onToggle,
}: {
  nodes: readonly RepoTreeEntry[];
  depth: number;
  expanded: ReadonlySet<string>;
  onToggle: (path: string) => void;
}) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {nodes.map((node) => (
        <TreeNode key={node.path} node={node} depth={depth} expanded={expanded} onToggle={onToggle} />
      ))}
    </ul>
  );
}

function TreeNode({
  node, depth, expanded, onToggle,
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
          padding: `2px 6px 2px ${6 + depth * 12}px`,
          borderRadius: 4, cursor: isDir ? 'pointer' : 'grab',
          color: isDir ? 'var(--text-1)' : 'var(--text-2)',
          userSelect: 'none', fontSize: 12, fontFamily: 'var(--mono)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-3)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{
          display: 'flex', width: 10, color: 'var(--text-3)',
          transform: isDir ? (isOpen ? 'rotate(90deg)' : 'rotate(0)') : 'none',
          transition: 'transform .1s',
        }}>
          {isDir ? <Icon value={IconName.ChevronRight} size="xs" /> : null}
        </span>
        <span style={{ display: 'flex', color: isDir ? 'var(--amber)' : 'var(--text-3)' }}>
          <Icon value={isDir ? IconName.Folder : IconName.File} size="xs" />
        </span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
      </div>
      {isDir && isOpen && node.children && node.children.length > 0 && (
        <TreeList nodes={node.children} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
      )}
    </li>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  PhaseModels,
  PhaseModel,
  RepoTreeEntry,
  ThinkingLevel,
} from '@nightcoder/shared-types/ipc';
import {
  Button,
  Icon,
  IconButton,
  IconName,
  Select,
  Stack,
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
  /** All selected dependency task IDs. First entry (if any) is used as the branch parent. */
  blockerTaskIds?: string[];
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
const PHASES: readonly { key: PhaseKey; label: string; icon: IconName }[] = [
  { key: 'planning', label: 'Plan', icon: IconName.ScrollText },
  { key: 'implementation', label: 'Code', icon: IconName.Zap },
  { key: 'qa', label: 'QA', icon: IconName.Check },
];

const MODEL_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
  { value: 'haiku', label: 'Haiku' },
];

const THINKING_LEVELS: readonly {
  value: ThinkingLevel;
  label: string;
  dots: number;
}[] = [
  { value: 'off', label: 'Off', dots: 0 },
  { value: 'low', label: 'Low', dots: 1 },
  { value: 'medium', label: 'Med', dots: 2 },
  { value: 'high', label: 'High', dots: 3 },
];

const DRAG_MIME = 'application/x-nightcoder-path';
const TREE_STORAGE_KEY = 'nc.addTask.showTree';

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

/** Recursively keep only nodes whose path or descendants match the query. */
function filterTree(
  nodes: readonly RepoTreeEntry[],
  query: string,
): RepoTreeEntry[] {
  if (!query) return [...nodes];
  const q = query.toLowerCase();
  const out: RepoTreeEntry[] = [];
  for (const n of nodes) {
    if (n.kind === 'dir' && n.children) {
      const kids = filterTree(n.children, query);
      if (kids.length > 0 || n.path.toLowerCase().includes(q)) {
        out.push({ ...n, children: kids });
      }
    } else if (
      n.path.toLowerCase().includes(q) ||
      n.name.toLowerCase().includes(q)
    ) {
      out.push(n);
    }
  }
  return out;
}

/** Collect every dir path under a tree — used to auto-expand when filtering. */
function collectDirPaths(
  nodes: readonly RepoTreeEntry[],
  into: Set<string>,
): void {
  for (const n of nodes) {
    if (n.kind === 'dir') {
      into.add(n.path);
      if (n.children) collectDirPaths(n.children, into);
    }
  }
}

function readTreeStoragePref(): boolean {
  try {
    return localStorage.getItem(TREE_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function AddTaskDialog({
  open,
  onClose,
  onAdd,
  folderPath,
  blockerOptions,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptance, setAcceptance] = useState('');
  const [phaseModels, setPhaseModels] = useState<PhaseModels>({});
  const [blockerTaskIds, setBlockerTaskIds] = useState<string[]>([]);
  const [requiresHumanReview, setRequiresHumanReview] = useState<boolean>(true);
  const [attachedFilePaths, setAttachedFilePaths] = useState<string[]>([]);
  const [pickError, setPickError] = useState<string | null>(null);
  const [showTree, setShowTree] = useState<boolean>(readTreeStoragePref);

  const [tree, setTree] = useState<RepoTreeEntry[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeFilter, setTreeFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [dropActive, setDropActive] = useState(false);

  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  // Persist tree visibility preference
  useEffect(() => {
    try {
      localStorage.setItem(TREE_STORAGE_KEY, showTree ? '1' : '0');
    } catch {
      /* noop */
    }
  }, [showTree]);

  // ── Reset state whenever the dialog opens ─────────────────────────────
  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setAcceptance('');
    setPhaseModels({});
    setBlockerTaskIds([]);
    setRequiresHumanReview(true);
    setAttachedFilePaths([]);
    setPickError(null);
    setTreeFilter('');
    setExpanded(new Set());
    setDropActive(false);
  }, [open]);

  // ── Load repo tree when the dialog opens and a folder is set ─────────
  useEffect(() => {
    if (!open || !folderPath) {
      setTree([]);
      setTreeError(null);
      setTreeLoading(false);
      return;
    }
    let cancelled = false;
    setTreeLoading(true);
    setTreeError(null);
    window.nightcoder
      .listRepoTree({ folderPath })
      .then((res) => {
        if (cancelled) return;
        if (res.kind === 'ok') {
          setTree(res.tree);
        } else {
          setTree([]);
          setTreeError(res.message);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTree([]);
        setTreeError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setTreeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, folderPath]);

  // ── Esc closes ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filteredTree = useMemo(
    () => filterTree(tree, treeFilter),
    [tree, treeFilter],
  );

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
          if (!seen.has(p)) {
            next.push(p);
            seen.add(p);
          }
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
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  // ── Drop into description: insert @path at caret ──────────────────────
  const insertAtCaret = (text: string) => {
    const ta = descriptionRef.current;
    if (!ta) {
      setDescription((prev) =>
        prev.length > 0 && !prev.endsWith(' ')
          ? `${prev} ${text}`
          : `${prev}${text}`,
      );
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
    const path =
      e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData('text/plain');
    if (!path) return;
    e.preventDefault();
    setDropActive(false);
    insertAtCaret(`@${path}`);
  };

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
        {/* ── Header ─────────────────────────────────────────────── */}
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
          <Text as="h2" size="lg" weight="semibold">
            New task
          </Text>
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

        {/* ── Form ────────────────────────────────────────────────── */}
        <Surface
          grow
          minHeight={0}
          overflowY="auto"
          paddingX={20}
          paddingTop={18}
          paddingBottom={20}
          direction="column"
          gap={14}
        >
          <TextField
            label="Title"
            helperText="optional — inferred from description if empty"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What should the agent do?"
            data-testid={TestIds.AddTaskDialog.titleInput}
          />

          {/* Description + collapsible file tree side by side */}
          <Surface direction="column" gap={6}>
            <Surface direction="row" align="center" gap={6}>
              <Text size="xs" weight="medium" tone="muted" tracking="wide">
                Description / brief{' '}
                <Text as="span" size="xs" tone="rose">
                  *
                </Text>
              </Text>
              <Text size="xs" tone="faint" italic>
                {showTree
                  ? '· drag files from the tree to insert @path'
                  : '· click the tree icon to show the file tree'}
              </Text>
            </Surface>
            <Surface direction="row" align="stretch" gap={10}>
              <Surface grow minWidth={0} position="relative">
                <Textarea
                  ref={descriptionRef}
                  required
                  autoFocus
                  invalid={dropActive}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onDragOver={(e) => {
                    if (
                      e.dataTransfer.types.includes(DRAG_MIME) ||
                      e.dataTransfer.types.includes('text/plain')
                    ) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                      setDropActive(true);
                    }
                  }}
                  onDragLeave={() => setDropActive(false)}
                  onDrop={onDescriptionDrop}
                  placeholder="Describe the work. Drag files from the tree to reference them with @path."
                  rows={6}
                  data-testid={TestIds.AddTaskDialog.descriptionInput}
                />
              </Surface>

              {showTree ? (
                <Surface
                  width={240}
                  shrink={false}
                  background="bg0"
                  bordered
                  radius="sm"
                  direction="column"
                  overflowY="hidden"
                >
                  {/* Tree panel header */}
                  <Surface
                    bordered={{ bottom: true }}
                    paddingX={10}
                    paddingTop={6}
                    paddingBottom={6}
                    direction="row"
                    align="center"
                    gap={6}
                    background="bg1"
                  >
                    <Icon value={IconName.Folder} size="xs" />
                    <Surface grow minWidth={0}>
                      <Text size="xs" mono tone="muted" truncate>
                        {folderPath ? basename(folderPath) : 'project'}
                      </Text>
                    </Surface>
                    <IconButton
                      aria-label="Hide file tree"
                      size="sm"
                      variant="ghost"
                      icon={IconName.X}
                      onClick={() => setShowTree(false)}
                    />
                  </Surface>
                  {/* Tree search */}
                  <Surface
                    bordered={{ bottom: true }}
                    paddingX={8}
                    paddingTop={6}
                    paddingBottom={6}
                    background="bg1"
                    direction="row"
                    align="center"
                    gap={6}
                  >
                    <Icon value={IconName.Search} size="xs" />
                    <input
                      value={treeFilter}
                      onChange={(e) => setTreeFilter(e.target.value)}
                      placeholder="Filter files…"
                      aria-label="Filter files"
                      className="ds-bare-input ds-mono"
                    />
                    {treeFilter && (
                      <IconButton
                        aria-label="Clear filter"
                        size="sm"
                        variant="ghost"
                        icon={IconName.X}
                        onClick={() => setTreeFilter('')}
                      />
                    )}
                  </Surface>
                  {/* Tree body */}
                  <Surface
                    grow
                    overflowY="auto"
                    paddingX={4}
                    paddingTop={6}
                    paddingBottom={8}
                    minHeight={0}
                  >
                    {!folderPath && (
                      <Surface paddingX={10} paddingY={8}>
                        <Text size="xs" tone="faint">
                          Pick a folder to see its file tree.
                        </Text>
                      </Surface>
                    )}
                    {folderPath && treeLoading && (
                      <Surface paddingX={10} paddingY={8}>
                        <Text size="xs" tone="faint">
                          Loading…
                        </Text>
                      </Surface>
                    )}
                    {folderPath && treeError && (
                      <Surface paddingX={10} paddingY={8}>
                        <Text size="xs" tone="rose">
                          Couldn&apos;t load tree: {treeError}
                        </Text>
                      </Surface>
                    )}
                    {folderPath &&
                      !treeLoading &&
                      !treeError &&
                      filteredTree.length === 0 && (
                        <Surface paddingX={10} paddingY={8}>
                          <Text size="xs" tone="faint">
                            {treeFilter ? 'No files match.' : 'No files found.'}
                          </Text>
                        </Surface>
                      )}
                    {folderPath && filteredTree.length > 0 && (
                      <TreeList
                        nodes={filteredTree}
                        depth={0}
                        expanded={effectiveExpanded}
                        onToggle={toggleDir}
                      />
                    )}
                  </Surface>
                </Surface>
              ) : (
                <button
                  onClick={() => setShowTree(true)}
                  title="Show file tree"
                  aria-label="Show file tree"
                  className="ds-tree-toggle-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    flexShrink: 0,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-3)',
                    cursor: 'pointer',
                  }}
                >
                  <Icon value={IconName.Folder} size="sm" />
                </button>
              )}
            </Surface>
          </Surface>

          <Textarea
            label="Acceptance criteria"
            helperText="one per line, optional"
            value={acceptance}
            onChange={(e) => setAcceptance(e.target.value)}
            placeholder={'Column drag works\nCounts are correct'}
            rows={3}
            data-testid={TestIds.AddTaskDialog.acceptanceInput}
          />

          {/* ── Blocked by (multi-select) ──────────────────────── */}
          <Surface direction="column" gap={6}>
            <Surface direction="column" gap={2}>
              <Text size="xs" weight="medium" tone="muted" tracking="wide">
                Blocked by
              </Text>
              <Text size="xs" tone="faint" italic>
                task will wait until selected dependencies finish
              </Text>
            </Surface>
            <BlockedByPicker
              options={blockerOptions ?? []}
              value={blockerTaskIds}
              onChange={setBlockerTaskIds}
            />
          </Surface>

          {/* ── Review gate ────────────────────────────────────── */}
          <Surface direction="column" gap={6}>
            <Text size="xs" weight="medium" tone="muted" tracking="wide">
              Review
            </Text>
            <ReviewCard
              checked={requiresHumanReview}
              onChange={setRequiresHumanReview}
              data-testid={TestIds.AddTaskDialog.requiresReviewCheckbox}
            />
          </Surface>

          {/* ── Agents / phase models ──────────────────────────── */}
          <Surface as="section" direction="column" gap={8}>
            <Surface direction="column" gap={2}>
              <Text size="xs" weight="medium" tone="muted" tracking="wide">
                Agents
              </Text>
              <Text size="xs" tone="faint" italic>
                pick the model and thinking depth for each phase
              </Text>
            </Surface>
            <Surface direction="row" gap={8}>
              {PHASES.map(({ key, label, icon }) => {
                const cur = phaseModels[key] ?? {};
                return (
                  <ModelPick
                    key={key}
                    label={label}
                    icon={icon}
                    model={cur.model ?? ''}
                    onModelChange={(m) =>
                      setPhase(key, { model: m || undefined })
                    }
                    thinking={cur.thinking ?? 'off'}
                    onThinkingChange={(t) => setPhase(key, { thinking: t })}
                    modelSelectTestId={TestIds.AddTaskDialog.phaseModelSelect(
                      key,
                    )}
                    thinkingSelectTestId={TestIds.AddTaskDialog.phaseThinkingSelect(
                      key,
                    )}
                  />
                );
              })}
            </Surface>
          </Surface>

          {/* ── Attached files ────────────────────────────────── */}
          <Surface direction="column" gap={6}>
            <Surface direction="row" align="center" gap={6}>
              <Text size="xs" weight="medium" tone="muted" tracking="wide">
                Attached files
              </Text>
              <Text size="xs" tone="faint" italic>
                · copied into .nightcoder/tasks/&lt;id&gt;/files — shared with
                the agent
              </Text>
            </Surface>
            <Surface direction="column" gap={8}>
              {attachedFilePaths.length > 0 && (
                <Stack direction="column" gap={4}>
                  {attachedFilePaths.map((p) => (
                    <Surface
                      key={p}
                      bordered
                      radius="sm"
                      background="bg2"
                      paddingX={8}
                      paddingY={6}
                      direction="row"
                      align="center"
                      gap={8}
                    >
                      <Icon value={IconName.File} size="sm" />
                      <Surface grow minWidth={0} title={p}>
                        <Text size="sm" mono tone="muted" truncate>
                          {basename(p)}
                        </Text>
                      </Surface>
                      <IconButton
                        aria-label={`Remove ${basename(p)}`}
                        title="Remove"
                        size="sm"
                        variant="ghost"
                        icon={IconName.X}
                        onClick={() => removeFile(p)}
                      />
                    </Surface>
                  ))}
                </Stack>
              )}
              <Stack direction="row">
                <Button
                  size="sm"
                  variant="secondary"
                  label="Attach files"
                  startIcon={IconName.Paperclip}
                  onClick={() => void pickFiles()}
                  data-testid={TestIds.AddTaskDialog.attachFilesBtn}
                />
              </Stack>
              {pickError && (
                <Text size="xs" tone="rose">
                  {pickError}
                </Text>
              )}
            </Surface>
          </Surface>
        </Surface>

        {/* ── Footer ─────────────────────────────────────────────── */}
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
            onClick={() =>
              canAdd &&
              onAdd({
                title:
                  title.trim() ||
                  description.trim().split(' ').slice(0, 6).join(' '),
                description: description.trim(),
                acceptance: acceptance
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
                model: phaseModels.implementation?.model || undefined,
                attachedFilePaths,
                phaseModels:
                  Object.keys(phaseModels).length > 0 ? phaseModels : undefined,
                blockerTaskIds:
                  blockerTaskIds.length > 0 ? blockerTaskIds : undefined,
                requiresHumanReview,
              })
            }
            data-testid={TestIds.AddTaskDialog.submitBtn}
          />
        </Surface>
      </Surface>
    </Surface>
  );
}

// ── BlockedByPicker ──────────────────────────────────────────────────────────

type BlockedByPickerProps = {
  options: readonly BlockerOption[];
  value: string[];
  onChange: (ids: string[]) => void;
};

function BlockedByPicker({ options, value, onChange }: BlockedByPickerProps) {
  const candidates = options.filter((o) => !value.includes(o.taskId));
  const selected = value
    .map((id) => options.find((o) => o.taskId === id))
    .filter(Boolean) as BlockerOption[];

  const add = (taskId: string) => {
    if (!taskId) return;
    onChange([...value, taskId]);
  };
  const remove = (taskId: string) =>
    onChange(value.filter((v) => v !== taskId));

  if (options.length === 0) {
    return (
      <Surface
        bordered
        radius="sm"
        background="bg2"
        paddingX={12}
        paddingY={10}
      >
        <Text size="xs" tone="faint" italic>
          No other tasks to depend on yet.
        </Text>
      </Surface>
    );
  }

  return (
    <Surface
      direction="column"
      gap={8}
      data-testid={TestIds.AddTaskDialog.blockerSelect}
    >
      {selected.length > 0 && (
        <Surface direction="row" gap={6} style={{ flexWrap: 'wrap' }}>
          {selected.map((opt) => (
            <Surface
              key={opt.taskId}
              bordered
              radius="pill"
              background="bg2"
              paddingLeft={8}
              paddingRight={4}
              paddingTop={3}
              paddingBottom={3}
              direction="row"
              align="center"
              gap={6}
            >
              {opt.hint && (
                <Text size="xs" mono tone="faint">
                  {opt.hint}
                </Text>
              )}
              <Text size="xs" tone="muted" truncate style={{ maxWidth: 200 }}>
                {opt.title}
              </Text>
              <IconButton
                aria-label={`Remove ${opt.title}`}
                size="sm"
                variant="ghost"
                icon={IconName.X}
                onClick={() => remove(opt.taskId)}
              />
            </Surface>
          ))}
        </Surface>
      )}
      {candidates.length > 0 && (
        <Surface grow>
          <Select
            aria-label="Add a dependency"
            value=""
            onChange={(e) => add(e.target.value)}
            options={[
              {
                value: '',
                label:
                  selected.length > 0
                    ? '+ Add another dependency…'
                    : 'Select a task this depends on…',
              },
              ...candidates.map((o) => ({
                value: o.taskId,
                label: o.hint ? `${o.hint} — ${o.title}` : o.title,
              })),
            ]}
          />
        </Surface>
      )}
    </Surface>
  );
}

// ── ReviewCard ───────────────────────────────────────────────────────────────

type ReviewCardProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'data-testid'?: string;
};

function ReviewCard({
  checked,
  onChange,
  'data-testid': testId,
}: ReviewCardProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        background: 'var(--bg-2)',
        border: `1px solid ${checked ? 'var(--emerald)' : 'var(--border)'}`,
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'border-color .12s',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testId}
        style={{
          marginTop: 2,
          width: 14,
          height: 14,
          accentColor: 'var(--emerald)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />
      <Surface direction="column" gap={2} grow>
        <Surface direction="row" align="center" gap={6}>
          <Text size="sm" weight="medium">
            Human review required
          </Text>
          {checked && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                padding: '1px 6px',
                borderRadius: 3,
                background: 'var(--accent-soft)',
                color: 'var(--emerald)',
                fontFamily: 'var(--mono)',
              }}
            >
              default
            </span>
          )}
        </Surface>
        <Text size="xs" tone="faint">
          Pause before merging so you can sign off on the agent&apos;s work.
        </Text>
      </Surface>
    </label>
  );
}

// ── ModelPick card ───────────────────────────────────────────────────────────

const PHASE_ICON_MAP: Record<string, IconName> = {
  sparkle: IconName.Sparkle,
  zap: IconName.Zap,
  check: IconName.Check,
};

type ModelPickProps = {
  label: string;
  icon: string;
  model: string;
  onModelChange: (model: string) => void;
  thinking: ThinkingLevel;
  onThinkingChange: (level: ThinkingLevel) => void;
  modelSelectTestId?: string;
  thinkingSelectTestId?: string;
};

function ModelPick({
  label,
  icon,
  model,
  onModelChange,
  thinking,
  onThinkingChange,
  modelSelectTestId,
  thinkingSelectTestId,
}: ModelPickProps) {
  const iconValue = PHASE_ICON_MAP[icon] ?? IconName.Sparkle;
  const activeLevel =
    THINKING_LEVELS.find((l) => l.value === thinking) ?? THINKING_LEVELS[0];

  return (
    <Surface
      grow
      minWidth={0}
      bordered
      radius="sm"
      background="bg2"
      paddingX={10}
      paddingTop={8}
      paddingBottom={8}
      direction="column"
      gap={8}
    >
      {/* Phase label */}
      <Surface direction="row" align="center" gap={6}>
        <Icon value={iconValue} size="xs" />
        <Text
          size="xs"
          weight="semibold"
          tone="faint"
          tracking="wide"
          style={{ textTransform: 'uppercase' }}
        >
          {label}
        </Text>
      </Surface>

      {/* Model dropdown */}
      <Select
        aria-label={`${label} model`}
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        options={MODEL_OPTIONS}
        data-testid={modelSelectTestId}
      />

      {/* Thinking segmented control */}
      <Surface direction="column" gap={4}>
        <Surface direction="row" align="center" justify="between">
          <Surface direction="row" align="center" gap={4}>
            <Icon value={IconName.Sparkle} size="xs" />
            <Text
              size="xs"
              tone="faint"
              style={{
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                fontSize: 9,
              }}
            >
              Thinking
            </Text>
          </Surface>
          <Text
            size="xs"
            mono
            style={{ color: thinkingLevelColor(activeLevel.value) }}
          >
            {activeLevel.label}
          </Text>
        </Surface>
        <Surface direction="row" gap={3}>
          {THINKING_LEVELS.map((lvl) => {
            const active = lvl.value === thinking;
            const color = thinkingLevelColor(lvl.value);
            return (
              <button
                key={lvl.value}
                onClick={() => onThinkingChange(lvl.value)}
                title={`Thinking: ${lvl.label}`}
                data-testid={
                  lvl.value === thinking ? thinkingSelectTestId : undefined
                }
                style={{
                  flex: 1,
                  height: 20,
                  padding: 0,
                  background: active ? 'var(--bg-1)' : 'transparent',
                  border: `1px solid ${active ? color : 'var(--border)'}`,
                  boxShadow: active ? `0 0 0 1px ${color}22 inset` : 'none',
                  borderRadius: 5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  transition: 'all .12s',
                }}
              >
                {lvl.dots === 0 ? (
                  <span
                    style={{
                      fontSize: 9,
                      color: active ? color : 'var(--text-3)',
                      fontWeight: 600,
                    }}
                  >
                    ∅
                  </span>
                ) : (
                  Array.from({ length: lvl.dots }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: 3,
                        background: active ? color : 'var(--text-3)',
                        opacity: active ? 1 : 0.5,
                      }}
                    />
                  ))
                )}
              </button>
            );
          })}
        </Surface>
      </Surface>
    </Surface>
  );
}

function thinkingLevelColor(level: ThinkingLevel): string {
  switch (level) {
    case 'low':
      return 'var(--sky)';
    case 'medium':
      return 'var(--amber)';
    case 'high':
      return 'var(--emerald)';
    default:
      return 'var(--text-3)';
  }
}

// ── TreeList / TreeNode ──────────────────────────────────────────────────────

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
    <Surface as="ul">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={depth}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </Surface>
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
    <Surface as="li">
      <Surface
        draggable
        onDragStart={onDragStart}
        onClick={() => isDir && onToggle(node.path)}
        title={node.path}
        direction="row"
        align="center"
        gap={4}
        paddingLeft={8 + depth * 12}
        paddingRight={8}
        paddingTop={3}
        paddingBottom={3}
        cursor={isDir ? 'pointer' : 'grab'}
        userSelect="none"
        radius="sm"
        interactive
      >
        <Surface width={12} direction="row" align="center">
          {isDir ? (
            <Icon
              value={isOpen ? IconName.ChevronDown : IconName.ChevronRight}
              size="xs"
            />
          ) : null}
        </Surface>
        <Surface direction="row" align="center">
          <Icon value={isDir ? IconName.Folder : IconName.File} size="xs" />
        </Surface>
        <Text size="sm" mono tone={isDir ? 'subtle' : 'muted'} truncate>
          {node.name}
        </Text>
      </Surface>
      {isDir && isOpen && node.children && node.children.length > 0 && (
        <TreeList
          nodes={node.children}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
        />
      )}
    </Surface>
  );
}

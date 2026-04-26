import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PhaseModels, PhaseModel, RepoTreeEntry, ThinkingLevel } from '@nightcoder/shared-types/ipc';
import {
  Button,
  IconButton,
  Select,
  Stack,
  Surface,
  Text,
  Textarea,
  TextField,
} from '@nightcoder/design-system';
import { Icon } from './icons';

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
        width="min(960px, 96vw)"
        maxHeight="92vh"
        background="bg1"
        bordered
        borderTone="strong"
        radius="md"
        shadow="2"
        direction="column"
      >
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
            <Icon name="plus" size={16} />
          </Surface>
          <Text as="h2" size="lg" weight="semibold">New task</Text>
          <Text size="xs" mono tone="faint">
            drag a file from the tree into the description to reference it with @path
          </Text>
          <Surface grow />
          <IconButton
            aria-label="Close"
            size="sm"
            variant="ghost"
            icon={<Icon name="x" size={16} />}
            onClick={onClose}
          />
        </Surface>

        <Surface direction="row" grow minHeight={0}>
          {/* ── File tree panel ─────────────────────────────────── */}
          <Surface
            as="aside"
            width={300}
            shrink={false}
            bordered={{ right: true }}
            background="bg0"
            direction="column"
            minHeight={0}
          >
            <Surface
              bordered={{ bottom: true }}
              paddingX={12}
              paddingTop={12}
              paddingBottom={8}
            >
              <Surface
                background="bg2"
                bordered
                radius="sm"
                paddingX={8}
                paddingY={6}
                direction="row"
                align="center"
                gap={6}
              >
                <Icon name="search" size={12} />
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
                    icon={<Icon name="x" size={11} />}
                    onClick={() => setTreeFilter('')}
                  />
                )}
              </Surface>
            </Surface>
            <Surface
              grow
              overflowY="auto"
              paddingX={4}
              paddingTop={8}
              paddingBottom={12}
              minHeight={0}
            >
              {!folderPath && (
                <Surface paddingX={12} paddingY={10}>
                  <Text size="xs" tone="faint">Pick a folder to see its file tree.</Text>
                </Surface>
              )}
              {folderPath && treeLoading && (
                <Surface paddingX={12} paddingY={10}>
                  <Text size="xs" tone="faint">Loading tree…</Text>
                </Surface>
              )}
              {folderPath && treeError && (
                <Surface paddingX={12} paddingY={10}>
                  <Text size="xs" tone="rose">Couldn&apos;t load tree: {treeError}</Text>
                </Surface>
              )}
              {folderPath && !treeLoading && !treeError && filteredTree.length === 0 && (
                <Surface paddingX={12} paddingY={10}>
                  <Text size="xs" tone="faint">
                    {treeFilter ? 'No files match this filter.' : 'No files found.'}
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

          {/* ── Form ────────────────────────────────────────────── */}
          <Surface
            grow
            minWidth={0}
            overflowY="auto"
            paddingX={20}
            paddingTop={18}
            paddingBottom={20}
            direction="column"
            gap={14}
          >
            <TextField
              label="Title"
              helperText="optional"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What should the agent do?"
            />
            <Textarea
              ref={descriptionRef}
              label="Description / brief"
              helperText="drop a file from the tree to paste @path"
              required
              autoFocus
              invalid={dropActive}
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
            />

            <Textarea
              label="Acceptance criteria"
              helperText="one per line, optional"
              value={acceptance}
              onChange={(e) => setAcceptance(e.target.value)}
              placeholder={'Column drag works\nCounts are correct'}
              rows={3}
            />

            {/* ── Phases section ─────────────────────────────── */}
            <Surface as="section" direction="column" gap={8}>
              <Surface direction="column" gap={2}>
                <Text size="xs" weight="medium" tone="muted" tracking="wide">Phase models</Text>
                <Text size="xs" tone="faint" italic>
                  Implementation drives today&apos;s single run. Planning / QA are saved for the upcoming multi-phase executor.
                </Text>
              </Surface>
              <Stack direction="column" gap={8}>
                {PHASES.map(({ key, label, hint }) => {
                  const cur = phaseModels[key] ?? {};
                  return (
                    <Stack key={key} direction="row" align="center" gap={8}>
                      <Surface width={110} direction="column">
                        <Text size="sm" weight="medium" tone="muted">{label}</Text>
                        <Text size="xxs" tone="faint">{hint}</Text>
                      </Surface>
                      <Surface grow>
                        <Select
                          aria-label={`${label} model`}
                          value={cur.model ?? ''}
                          onChange={(e) => setPhase(key, { model: e.target.value || undefined })}
                          options={MODEL_OPTIONS}
                        />
                      </Surface>
                      <Surface grow>
                        <Select
                          aria-label={`${label} thinking`}
                          value={cur.thinking ?? 'off'}
                          onChange={(e) => setPhase(key, { thinking: e.target.value as ThinkingLevel })}
                          options={THINKING_OPTIONS}
                        />
                      </Surface>
                    </Stack>
                  );
                })}
              </Stack>
            </Surface>

            {/* ── Blocker selector ──────────────────────────── */}
            <Select
              label="Blocked by"
              helperText="optional — branch off this task and target its PR branch"
              value={blockerTaskId}
              onChange={(e) => setBlockerTaskId(e.target.value)}
              options={[
                { value: '', label: 'No blocker (branch off main)' },
                ...(blockerOptions ?? []).map((opt) => ({
                  value: opt.taskId,
                  label: opt.hint ? `${opt.hint} — ${opt.title}` : opt.title,
                })),
              ]}
            />

            {/* ── Attachments (existing flow) ───────────────── */}
            <Surface direction="column" gap={6}>
              <Surface direction="row" align="center" gap={6}>
                <Text size="xs" weight="medium" tone="muted" tracking="wide">Attached files</Text>
                <Text size="xs" tone="faint" italic>
                  · copied into .nightcoder/tasks/&lt;id&gt;/files — shared with the agent
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
                        <Icon name="file" size={13} />
                        <Surface grow minWidth={0} title={p}>
                          <Text size="sm" mono tone="muted" truncate>{basename(p)}</Text>
                        </Surface>
                        <IconButton
                          aria-label={`Remove ${basename(p)}`}
                          title="Remove"
                          size="sm"
                          variant="ghost"
                          icon={<Icon name="x" size={12} />}
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
                    startIcon={<Icon name="paperclip" size={13} />}
                    onClick={() => void pickFiles()}
                  />
                </Stack>
                {pickError && <Text size="xs" tone="rose">{pickError}</Text>}
              </Surface>
            </Surface>
          </Surface>
        </Surface>

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
          <Button variant="ghost" label="Cancel" onClick={onClose} />
          <Button
            variant="primary"
            label="Add task"
            startIcon={<Icon name="check" size={13} />}
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
          />
        </Surface>
      </Surface>
    </Surface>
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
          {isDir ? <Icon name={isOpen ? 'chevronDown' : 'chevron'} size={10} /> : null}
        </Surface>
        <Surface direction="row" align="center">
          <Icon name={isDir ? 'folder' : 'file'} size={11} />
        </Surface>
        <Text size="sm" mono tone={isDir ? 'subtle' : 'muted'} truncate>{node.name}</Text>
      </Surface>
      {isDir && isOpen && node.children && node.children.length > 0 && (
        <TreeList nodes={node.children} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
      )}
    </Surface>
  );
}

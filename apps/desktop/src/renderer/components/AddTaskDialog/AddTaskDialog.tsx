import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PhaseModels, PhaseModel, RepoTreeEntry } from '@nightcoder/shared-types/ipc';
import {
  Button,
  Icon,
  IconButton,
  IconName,
  Stack,
  Surface,
  Text,
  Textarea,
  TextField,
} from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import type { NewTaskData, BlockerOption, PhaseKey } from './types';
import { TREE_STORAGE_KEY, readTreeStoragePref } from './types';
import { DRAG_MIME, basename, filterTree, collectDirPaths, TreeList } from './FileTree';
import { ModelPick } from './ModelPick';
import { BlockedByPicker } from './BlockedByPicker';
import { ReviewCard } from './ReviewCard';

const PHASES: readonly { key: PhaseKey; label: string; icon: IconName }[] = [
  { key: 'planning', label: 'Plan', icon: IconName.ScrollText },
  { key: 'implementation', label: 'Code', icon: IconName.Zap },
  { key: 'qa', label: 'QA', icon: IconName.Check },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (data: NewTaskData) => void;
  /** Callers pass the repo root when a folder is selected — enables the file tree. */
  folderPath?: string | null;
  /** Existing tasks the new one can depend on. */
  blockerOptions?: readonly BlockerOption[];
};

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

  // Reset state whenever the dialog opens
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

  // Load repo tree when the dialog opens and a folder is set
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

  // Esc closes
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

  // Drop into description: insert @path at caret
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

        {/* Form */}
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

          {/* Blocked by (multi-select) */}
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

          {/* Review gate */}
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

          {/* Agents / phase models */}
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
                    icon={icon as unknown as string}
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

          {/* Attached files */}
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

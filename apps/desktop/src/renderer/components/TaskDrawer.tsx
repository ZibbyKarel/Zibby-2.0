import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  TaskDiffFile,
  TaskDiffResult,
  TaskFile,
} from '@nightcoder/shared-types/ipc';
import {
  Alert,
  Badge,
  Button,
  Chip,
  Drawer,
  Icon,
  IconButton,
  IconName,
  Select,
  Spacer,
  Stack,
  Surface,
  Tabs,
  Text,
  TextField,
  Textarea,
  type TextTone,
} from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import { fmtDuration, fmtNum } from './primitives';
import type { TaskVM } from '../viewModel';

export type DrawerTab = 'logs' | 'diff' | 'details';

type SaveData = {
  title: string;
  description: string;
  acceptance: string[];
  model?: string;
};

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

export function TaskDrawer({
  task,
  open,
  onClose,
  onRun,
  onSave,
  tab,
  setTab,
  runtimeMs,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1') setTab('logs');
      if (e.key === '2') setTab('diff');
      if (e.key === '3') setTab('details');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setTab]);

  if (!task) return null;

  const canRun =
    task.status === 'pending' || task.status === 'failed' || task.status === 'blocked';
  const canResume =
    task.status === 'interrupted' ||
    (task.interrupted && (task.status === 'running' || task.status === 'pushing'));
  const runnable = canRun || canResume;
  const tokens = task.tokens as { in: number; out: number } | null | undefined;

  return (
    <Drawer open={open} onClose={onClose} anchor="right" width="min(720px, 92vw)">
      <Surface direction="column" grow minHeight={0} height="100%" data-testid={TestIds.Drawer.root}>
        <Surface
          as="header"
          bordered={{ bottom: true }}
          paddingX={18}
          paddingTop={14}
          paddingBottom={12}
          direction="column"
          gap={8}
        >
          <Stack direction="row" align="center" gap={8}>
            <Text size="xs" mono tone="faint">
              #{task.numericId ?? task.index + 1}
            </Text>
            {(task.status !== 'pending' || task.startedAt !== null) && (
              <Badge status={task.status} />
            )}
            {task.status === 'running' && runtimeMs != null && (
              <Text size="xs" mono tone="emerald">{fmtDuration(runtimeMs)}</Text>
            )}
            <Spacer />
            <Button
              size="sm"
              variant="primary"
              startIcon={<Icon value={IconName.Play} size={11} />}
              label={canResume ? 'Resume' : 'Run'}
              disabled={!runnable}
              title={runnable ? undefined : 'Task is not in a runnable state'}
              onClick={onRun}
              data-testid={TestIds.Drawer.runBtn}
            />
            <IconButton
              aria-label="Close drawer"
              size="sm"
              variant="ghost"
              icon={<Icon value={IconName.X} size={14} />}
              onClick={onClose}
              data-testid={TestIds.Drawer.closeBtn}
            />
          </Stack>
          <Text as="h2" size="xl" weight="semibold" tracking="tight" data-testid={TestIds.Drawer.title}>
            {task.title}
          </Text>
          <Stack direction="row" wrap gap={6}>
            {task.branch && <Chip icon={<Icon value={IconName.Git} size={11} />}>{task.branch}</Chip>}
            {task.prUrl && (
              <Chip tone="accent" icon={<Icon value={IconName.Github} size={11} />}>
                PR #{task.prUrl.split('/').pop()}
              </Chip>
            )}
            {task.model && (
              <Chip tone="violet" icon={<Icon value={IconName.Sparkle} size={11} />}>{task.model}</Chip>
            )}
            {tokens != null && (
              <Chip icon={<Icon value={IconName.Zap} size={11} />}>
                ↑{fmtNum(tokens.in)} ↓{fmtNum(tokens.out)}
              </Chip>
            )}
          </Stack>
        </Surface>

        <Surface paddingX={12} bordered={{ bottom: true }}>
          <Tabs<DrawerTab>
            tabs={[
              {
                key: 'logs',
                label: 'Logs',
                icon: <Icon value={IconName.Terminal} size={13} />,
                badge: task.logs.length || undefined,
                testId: TestIds.Drawer.tab('logs'),
              },
              {
                key: 'diff',
                label: 'Diff',
                icon: <Icon value={IconName.Diff} size={13} />,
                testId: TestIds.Drawer.tab('diff'),
              },
              {
                key: 'details',
                label: 'Details',
                icon: <Icon value={IconName.Edit} size={13} />,
                testId: TestIds.Drawer.tab('details'),
              },
            ]}
            activeKey={tab}
            onChange={setTab}
            variant="underline"
            size="sm"
          />
        </Surface>

        <Surface grow overflowY="auto" minHeight={0}>
          {tab === 'logs' && (
            <Surface data-testid={TestIds.Drawer.panel('logs')} direction="column" grow>
              <LogsView task={task} />
            </Surface>
          )}
          {tab === 'diff' && (
            <Surface data-testid={TestIds.Drawer.panel('diff')} direction="column" grow>
              <DiffPanel task={task} />
            </Surface>
          )}
          {tab === 'details' && (
            <Surface data-testid={TestIds.Drawer.panel('details')} direction="column" grow>
              <DetailsView task={task} onSave={onSave} />
            </Surface>
          )}
        </Surface>
      </Surface>
    </Drawer>
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
      <Surface
        paddingX={20}
        paddingY={40}
        direction="column"
        align="center"
        gap={8}
        data-testid={TestIds.Drawer.logsEmpty}
      >
        <Icon value={IconName.Terminal} size={28} />
        <Text size="sm" tone="faint">No logs yet. Run this task to stream output.</Text>
      </Surface>
    );
  }
  return (
    <Surface
      ref={containerRef as React.Ref<HTMLElement>}
      onScroll={handleScroll}
      height="100%"
      overflowY="auto"
      position="relative"
      background="bg0"
    >
      <Surface as="pre" paddingX={18} paddingY={14} direction="column" gap={0}>
        {task.logs.map((l, i) => {
          const tone: TextTone = l.s === 'err' ? 'rose' : l.s === 'info' ? 'sky' : 'muted';
          const prefix = l.s === 'err' ? '✗ ' : '';
          return (
            <Stack key={i} direction="row" gap={8} data-testid={TestIds.Drawer.logLine(i + 1)}>
              <Surface minWidth={28} userSelect="none">
                <Text size="sm" mono tone="faint" align="end">
                  {String(i + 1).padStart(3, ' ')}
                </Text>
              </Surface>
              <Surface grow>
                <Text size="sm" mono tone={tone} whitespace="pre-wrap">
                  {prefix}{l.l}
                </Text>
              </Surface>
            </Stack>
          );
        })}
        {task.status === 'running' && <span className="ds-caret" />}
      </Surface>
      {!autoScroll && (
        <Surface
          position="sticky"
          bottom={16}
          direction="row"
          justify="end"
          paddingRight={16}
          pointerEvents="none"
        >
          <Surface pointerEvents="auto" radius="pill" shadow="2">
            <IconButton
              aria-label="Scroll to bottom"
              title="Scroll to bottom"
              variant="secondary"
              icon={<Icon value={IconName.ChevronDown} size={16} />}
              onClick={scrollToBottom}
            />
          </Surface>
        </Surface>
      )}
    </Surface>
  );
}

function diffSummary(f: TaskDiffFile): { adds: number; dels: number } {
  let adds = 0;
  let dels = 0;
  for (const h of f.hunks) {
    for (const line of h.split('\n')) {
      if (line.startsWith('+') && !line.startsWith('+++')) adds++;
      else if (line.startsWith('-') && !line.startsWith('---')) dels++;
    }
  }
  return { adds, dels };
}

function filePathLabel(f: TaskDiffFile): string {
  if (
    f.changeKind === 'renamed' &&
    f.oldPath &&
    f.newPath &&
    f.oldPath !== f.newPath
  ) {
    return `${f.oldPath} → ${f.newPath}`;
  }
  return f.newPath ?? f.oldPath ?? '(unknown)';
}

function changeKindTone(kind: TaskDiffFile['changeKind']): TextTone {
  switch (kind) {
    case 'added':
      return 'emerald';
    case 'deleted':
      return 'rose';
    case 'renamed':
      return 'sky';
    case 'binary':
      return 'faint';
    default:
      return 'amber';
  }
}

type HunkLine =
  | { kind: 'header'; text: string }
  | { kind: 'add'; text: string; newLine: number }
  | { kind: 'del'; text: string; oldLine: number }
  | { kind: 'context'; text: string; oldLine: number; newLine: number }
  | { kind: 'other'; text: string };

function parseHunkLines(hunk: string): HunkLine[] {
  const out: HunkLine[] = [];
  const lines = hunk.split('\n');
  let oldLine = 0;
  let newLine = 0;
  for (const line of lines) {
    if (line.startsWith('@@')) {
      const m = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        oldLine = Number(m[1]);
        newLine = Number(m[2]);
      }
      out.push({ kind: 'header', text: line });
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      out.push({ kind: 'add', text: line.slice(1), newLine });
      newLine++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      out.push({ kind: 'del', text: line.slice(1), oldLine });
      oldLine++;
    } else if (line.startsWith(' ')) {
      out.push({ kind: 'context', text: line.slice(1), oldLine, newLine });
      oldLine++;
      newLine++;
    } else if (line.length > 0) {
      // e.g. `\ No newline at end of file`
      out.push({ kind: 'other', text: line });
    }
  }
  return out;
}

function DiffHunks({ hunks }: { hunks: string[] }) {
  const rows: HunkLine[] = [];
  for (const h of hunks) rows.push(...parseHunkLines(h));

  return (
    <Surface overflowX="auto" background="bg0">
      {rows.map((r, i) => <HunkRow key={i} row={r} />)}
    </Surface>
  );
}

type HunkRowBackground = 'emeraldTint' | 'roseTint' | 'bg2' | 'transparent';
function rowBackground(kind: HunkLine['kind']): HunkRowBackground {
  switch (kind) {
    case 'add':    return 'emeraldTint';
    case 'del':    return 'roseTint';
    case 'header': return 'bg2';
    default:       return 'transparent';
  }
}

function HunkRow({ row }: { row: HunkLine }) {
  const sign =
    row.kind === 'add' ? '+' : row.kind === 'del' ? '−' : row.kind === 'header' ? '' : ' ';
  const oldN =
    row.kind === 'del' ? row.oldLine : row.kind === 'context' ? row.oldLine : '';
  const newN =
    row.kind === 'add' ? row.newLine : row.kind === 'context' ? row.newLine : '';
  const signTone: TextTone =
    row.kind === 'add' ? 'emerald' : row.kind === 'del' ? 'rose' : 'faint';
  const isHeader = row.kind === 'header';

  return (
    <Surface
      direction="row"
      paddingX={10}
      paddingY={isHeader ? 2 : undefined}
      background={rowBackground(row.kind)}
      bordered={isHeader ? { top: true, bottom: true } : undefined}
    >
      {isHeader ? (
        <Surface grow>
          <Text size="sm" mono tone="faint" whitespace="pre">{row.text}</Text>
        </Surface>
      ) : (
        <>
          <Surface width={40} paddingRight={8} userSelect="none">
            <Text size="sm" mono tone="faint" align="end">{oldN}</Text>
          </Surface>
          <Surface width={40} paddingRight={8} userSelect="none">
            <Text size="sm" mono tone="faint" align="end">{newN}</Text>
          </Surface>
          <Surface width={14} shrink={false}>
            <Text size="sm" mono tone={signTone}>{sign}</Text>
          </Surface>
          <Text size="sm" mono whitespace="pre">{row.text}</Text>
        </>
      )}
    </Surface>
  );
}

function DiffFileBlock({ file }: { file: TaskDiffFile }) {
  const [collapsed, setCollapsed] = useState(false);
  const { adds, dels } = diffSummary(file);
  const label = filePathLabel(file);

  return (
    <Surface bordered radius="sm" background="bg1" overflowX="hidden" overflowY="hidden">
      <Surface
        as="button"
        type="button"
        width="100%"
        direction="row"
        align="center"
        gap={8}
        paddingX={10}
        paddingY={8}
        background="bg2"
        bordered={!collapsed ? { bottom: true } : undefined}
        cursor="pointer"
        textAlign="left"
        onClick={() => setCollapsed((c) => !c)}
      >
        <Icon value={collapsed ? IconName.ChevronRight : IconName.ChevronDown} size={12} />
        <Surface background="bg3" radius="pill" paddingX={6} paddingY={1}>
          <Text size="xxs" mono tone={changeKindTone(file.changeKind)} tracking="wide" transform="uppercase">
            {file.changeKind}
          </Text>
        </Surface>
        <Surface grow minWidth={0} title={label}>
          <Text as="code" size="sm" mono tone="muted" truncate>{label}</Text>
        </Surface>
        <Text size="xs" mono tone="emerald">+{adds}</Text>
        <Text size="xs" mono tone="rose">−{dels}</Text>
      </Surface>
      {!collapsed &&
        (file.changeKind === 'binary' || file.hunks.length === 0 ? (
          <Surface paddingX={12} paddingY={14}>
            <Text size="sm" tone="faint">
              {file.changeKind === 'binary'
                ? 'Binary file — diff not shown.'
                : 'No textual changes in this file.'}
            </Text>
          </Surface>
        ) : (
          <DiffHunks hunks={file.hunks} />
        ))}
    </Surface>
  );
}

function DiffPanel({ task }: { task: TaskVM }) {
  const [result, setResult] = useState<TaskDiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await window.nightcoder.getTaskDiff({ taskId: task.taskId });
    setResult(r);
    setLoading(false);
  }, [task.taskId]);

  const squashAndMerge = useCallback(async () => {
    if (!task.prUrl) return;
    const ok = window.confirm(
      `Squash and merge this task's PR?\n\nAll commits on the task branch will be combined into a single commit on ${task.prUrl}.`,
    );
    if (!ok) return;
    setMergeError(null);
    setMerging(true);
    try {
      const res = await window.nightcoder.squashMergeTask({ taskId: task.taskId });
      if (res.kind === 'error') {
        setMergeError(res.message);
      } else {
        void refresh();
      }
    } finally {
      setMerging(false);
    }
  }, [task.taskId, task.prUrl, refresh]);

  // Re-fetch when the task changes, or when its status moves to a state that
  // likely produced new commits (running → review/done, etc.).
  useEffect(() => {
    void refresh();
  }, [refresh, task.status]);

  if (loading && !result) {
    return (
      <Surface paddingX={20} paddingY={40} direction="column" align="center" gap={10}>
        <span className="ds-spinner" />
        <Text size="sm" tone="faint">Loading diff…</Text>
      </Surface>
    );
  }

  if (result?.kind === 'error') {
    return (
      <Surface padding={18} direction="column" gap={10}>
        <Alert severity="error" title="Failed to load diff">
          {result.message}
        </Alert>
        <Stack direction="row">
          <Button
            size="sm"
            variant="secondary"
            label="Retry"
            startIcon={<Icon value={IconName.Refresh} size={13} />}
            onClick={() => void refresh()}
          />
        </Stack>
      </Surface>
    );
  }

  if (result?.kind === 'empty') {
    const msg =
      result.reason === 'no-branch'
        ? "No diff available. The task hasn't produced a branch yet."
        : "No changes on the task's branch compared to the base branch.";
    return (
      <Surface paddingX={20} paddingY={40} direction="column" align="center" gap={10}>
        <Icon value={IconName.Diff} size={28} />
        <Text size="sm" tone="faint">{msg}</Text>
        <Button
          size="sm"
          variant="ghost"
          label="Refresh"
          startIcon={<Icon value={IconName.Refresh} size={13} />}
          onClick={() => void refresh()}
        />
      </Surface>
    );
  }

  if (result?.kind !== 'ok') return null;

  const totals = result.files.reduce(
    (acc, f) => {
      const s = diffSummary(f);
      return { adds: acc.adds + s.adds, dels: acc.dels + s.dels };
    },
    { adds: 0, dels: 0 },
  );

  return (
    <Surface padding={14} direction="column" gap={10}>
      <Stack direction="row" align="center" gap={10}>
        <Text size="xs" mono tone="muted">
          {result.files.length} file{result.files.length === 1 ? '' : 's'}
        </Text>
        <Text size="xs" mono tone="emerald">+{totals.adds}</Text>
        <Text size="xs" mono tone="rose">−{totals.dels}</Text>
        <Text size="xs" mono tone="faint">
          {result.branch
            ? `${result.baseBranch}…${result.branch}`
            : result.baseBranch}
        </Text>
        <Spacer />
        <Button
          size="sm"
          variant="primary"
          label={merging ? 'Merging…' : 'Squash and Merge'}
          startIcon={<Icon value={IconName.Git} size={13} />}
          onClick={() => void squashAndMerge()}
          disabled={merging || loading || !task.prUrl}
          title={
            task.prUrl
              ? 'Squash all commits on this branch into one and merge the PR'
              : 'Task has no PR yet'
          }
          data-testid={TestIds.Drawer.diffMergeBtn}
        />
        <Button
          size="sm"
          variant="ghost"
          label={loading ? 'Refreshing…' : 'Refresh'}
          startIcon={<Icon value={IconName.Refresh} size={13} />}
          onClick={() => void refresh()}
          disabled={loading || merging}
          data-testid={TestIds.Drawer.diffRefreshBtn}
        />
      </Stack>
      {mergeError && (
        <Alert severity="error" title="Squash-merge failed">
          <Text size="sm" tone="rose" whitespace="pre-wrap">{mergeError}</Text>
        </Alert>
      )}
      <Surface direction="column" gap={10}>
        {result.files.map((f, i) => (
          <DiffFileBlock
            key={`${f.oldPath ?? ''}→${f.newPath ?? ''}-${i}`}
            file={f}
          />
        ))}
      </Surface>
    </Surface>
  );
}

const MODEL_OPTIONS = [
  { value: '', label: 'Sonnet (default)' },
  { value: 'opus', label: 'Opus' },
  { value: 'haiku', label: 'Haiku' },
];

function DetailsView({
  task,
  onSave,
}: {
  task: TaskVM;
  onSave: (data: SaveData) => void;
}) {
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
      acceptance: acceptance
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
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
      <Surface padding={18} direction="column" gap={14}>
        <TextField
          label="Title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid={TestIds.Drawer.detailsTitle}
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          data-testid={TestIds.Drawer.detailsDescription}
        />
        <Textarea
          label="Acceptance criteria"
          helperText="one per line"
          value={acceptance}
          onChange={(e) => setAcceptance(e.target.value)}
          rows={4}
          data-testid={TestIds.Drawer.detailsAcceptance}
        />
        <Select
          label="Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          options={MODEL_OPTIONS}
          data-testid={TestIds.Drawer.detailsModel}
        />
        <Stack direction="row" justify="end" gap={8}>
          <Button
            variant="ghost"
            label="Cancel"
            onClick={handleCancel}
            data-testid={TestIds.Drawer.detailsCancelBtn}
          />
          <Button
            variant="primary"
            label="Save"
            startIcon={<Icon value={IconName.Check} size={13} />}
            disabled={!title.trim() || !description.trim()}
            onClick={handleSave}
            data-testid={TestIds.Drawer.detailsSaveBtn}
          />
        </Stack>
      </Surface>
    );
  }

  return (
    <Surface padding={18} direction="column" gap={18}>
      <Stack direction="row" justify="end">
        <Button
          size="sm"
          variant="outline"
          label="Edit"
          startIcon={<Icon value={IconName.Edit} size={13} />}
          onClick={() => setEditing(true)}
          data-testid={TestIds.Drawer.detailsEditBtn}
        />
      </Stack>

      <Section label="Description">
        <Text size="md" tone="muted" whitespace="pre-wrap">{task.description}</Text>
      </Section>

      {task.acceptance.length > 0 && (
        <Section label="Acceptance criteria">
          <Stack direction="column" gap={8}>
            {task.acceptance.map((a, i) => (
              <Stack key={i} direction="row" align="start" gap={8}>
                <Surface
                  width={16}
                  height={16}
                  radius="sm"
                  background="bg3"
                  bordered
                  borderTone="strong"
                  direction="row"
                  align="center"
                  justify="center"
                  shrink={false}
                >
                  {task.status === 'done' && (
                    <Icon value={IconName.Check} size={10} strokeWidth={2.5} />
                  )}
                </Surface>
                <Text size="md" tone="muted">{a}</Text>
              </Stack>
            ))}
          </Stack>
        </Section>
      )}

      {task.affectedFiles.length > 0 && (
        <Section label="Affected files">
          <Stack direction="row" wrap gap={6}>
            {task.affectedFiles.map((f, i) => (
              <Chip key={i}>{f}</Chip>
            ))}
          </Stack>
        </Section>
      )}

      <Section label="Attached files">
        <AttachedFilesPanel taskId={task.taskId} />
      </Section>

      <Surface direction="row" gap={12}>
        <Surface grow>
          <KV k="Model" v={task.model ?? 'Sonnet (default)'} />
        </Surface>
        <Surface grow>
          <KV k="Branch" v={task.branch ?? '—'} mono />
        </Surface>
      </Surface>
      <Surface direction="row" gap={12}>
        <Surface grow>
          <KV k="Status" v={task.status} />
        </Surface>
        <Surface grow>
          <KV
            k="Tokens"
            v={
              task.tokens != null
                ? `↑${fmtNum((task.tokens as { in: number; out: number }).in)}  ↓${fmtNum((task.tokens as { in: number; out: number }).out)}`
                : '—'
            }
            mono
          />
        </Surface>
      </Surface>
    </Surface>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Surface direction="column" gap={8}>
      <Text as="h3" size="xxs" weight="semibold" tone="faint" tracking="wider" transform="uppercase">
        {label}
      </Text>
      {children}
    </Surface>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <Surface bordered radius="sm" background="bg2" paddingX={10} paddingY={8} direction="column" gap={2}>
      <Text size="xxs" tone="faint" tracking="wider" transform="uppercase">{k}</Text>
      <Text size="sm" mono={mono}>{v}</Text>
    </Surface>
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
      const res = await window.nightcoder.addTaskFiles({
        taskId,
        sourcePaths: pick.paths,
      });
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
    <Surface direction="column" gap={8}>
      {loading ? (
        <Text size="sm" tone="faint">Loading…</Text>
      ) : files.length === 0 ? (
        <Text size="sm" tone="faint">No files attached yet.</Text>
      ) : (
        <Stack direction="column" gap={4}>
          {files.map((f) => (
            <Surface
              key={f.name}
              bordered
              radius="sm"
              background="bg2"
              paddingX={8}
              paddingY={6}
              direction="row"
              align="center"
              gap={8}
            >
              <Icon value={IconName.File} size={13} />
              <Surface grow minWidth={0} title={f.name}>
                <Text size="sm" mono tone="muted" truncate>{f.name}</Text>
              </Surface>
              <Text size="xs" mono tone="faint">{formatBytes(f.size)}</Text>
              <IconButton
                aria-label={`Remove ${f.name}`}
                title="Remove"
                size="sm"
                variant="ghost"
                disabled={busy}
                icon={<Icon value={IconName.Trash} size={13} />}
                onClick={() => void onRemove(f.name)}
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
          startIcon={<Icon value={IconName.Paperclip} size={13} />}
          onClick={() => void onAdd()}
          disabled={busy}
        />
      </Stack>
      {error && <Text size="xs" tone="rose">{error}</Text>}
    </Surface>
  );
}

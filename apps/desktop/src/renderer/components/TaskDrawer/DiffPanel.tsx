import React, { useCallback, useEffect, useState } from 'react';
import type { TaskDiffFile, TaskDiffResult } from '@nightcoder/shared-types/ipc';
import {
  Alert,
  Button,
  Icon,
  IconName,
  Spacer,
  Stack,
  Surface,
  Text,
  type TextTone,
} from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import type { TaskVM } from '../../viewModel';
import type { HunkLine, HunkRowBackground } from './types';

// ── Diff utilities ───────────────────────────────────────────────────────────

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
      out.push({ kind: 'other', text: line });
    }
  }
  return out;
}

function rowBackground(kind: HunkLine['kind']): HunkRowBackground {
  switch (kind) {
    case 'add':    return 'emeraldTint';
    case 'del':    return 'roseTint';
    case 'header': return 'bg2';
    default:       return 'transparent';
  }
}

// ── HunkRow ──────────────────────────────────────────────────────────────────

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

// ── DiffHunks ────────────────────────────────────────────────────────────────

function DiffHunks({ hunks }: { hunks: string[] }) {
  const rows: HunkLine[] = [];
  for (const h of hunks) rows.push(...parseHunkLines(h));

  return (
    <Surface overflowX="auto" background="bg0">
      {rows.map((r, i) => <HunkRow key={i} row={r} />)}
    </Surface>
  );
}

// ── DiffFileBlock ────────────────────────────────────────────────────────────

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
        <Icon value={collapsed ? IconName.ChevronRight : IconName.ChevronDown} size="xs" />
        <Surface background="bg3" radius="pill" paddingX={6} paddingY={1}>
          <Text size="xs" mono tone={changeKindTone(file.changeKind)} tracking="wide" transform="uppercase">
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

// ── DiffPanel ────────────────────────────────────────────────────────────────

export function DiffPanel({ task }: { task: TaskVM }) {
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
            startIcon={IconName.Refresh}
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
        <Icon value={IconName.Diff} size="xl" />
        <Text size="sm" tone="faint">{msg}</Text>
        <Button
          size="sm"
          variant="ghost"
          label="Refresh"
          startIcon={IconName.Refresh}
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
          startIcon={IconName.Git}
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
          startIcon={IconName.Refresh}
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

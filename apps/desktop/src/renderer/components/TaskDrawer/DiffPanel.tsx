import React, { useCallback, useEffect, useState } from 'react';
import type { TaskDiffResult } from '@nightcoder/shared-types/ipc';
import {
  Alert,
  Button,
  Container,
  Icon,
  IconName,
  Spacer,
  Stack,
  Text,
} from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import type { TaskVM } from '../../viewModel';
import { diffSummary } from './diffUtils';
import { DiffFileBlock } from './DiffFileBlock';

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
      <Container padding={['500', '250']}>
        <Stack direction="column" align="center" gap="100">
          <span className="ds-spinner" />
          <Text size="sm" tone="faint">
            Loading diff…
          </Text>
        </Stack>
      </Container>
    );
  }

  if (result?.kind === 'error') {
    return (
      <Container padding={['200', '200']}>
        <Stack direction="column" gap="100">
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
        </Stack>
      </Container>
    );
  }

  if (result?.kind === 'empty') {
    const msg =
      result.reason === 'no-branch'
        ? "No diff available. The task hasn't produced a branch yet."
        : "No changes on the task's branch compared to the base branch.";
    return (
      <Container padding={['500', '250']}>
        <Stack direction="column" align="center" gap="100">
          <Icon value={IconName.Diff} size="xl" />
          <Text size="sm" tone="faint">
            {msg}
          </Text>
          <Button
            size="sm"
            variant="ghost"
            label="Refresh"
            startIcon={IconName.Refresh}
            onClick={() => void refresh()}
          />
        </Stack>
      </Container>
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
    <Container padding={['150', '150']}>
      <Stack direction="column" gap="100">
        <Stack direction="row" align="center" gap="100">
          <Text size="xs" mono tone="muted">
            {result.files.length} file{result.files.length === 1 ? '' : 's'}
          </Text>
          <Text size="xs" mono tone="emerald">
            +{totals.adds}
          </Text>
          <Text size="xs" mono tone="rose">
            −{totals.dels}
          </Text>
          <Text size="xs" mono tone="faint">
            {result.branch ? `${result.baseBranch}…${result.branch}` : result.baseBranch}
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
            <Text size="sm" tone="rose" whitespace="pre-wrap">
              {mergeError}
            </Text>
          </Alert>
        )}
        <Stack direction="column" gap="100">
          {result.files.map((f, i) => (
            <DiffFileBlock
              key={`${f.oldPath ?? ''}→${f.newPath ?? ''}-${i}`}
              file={f}
            />
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

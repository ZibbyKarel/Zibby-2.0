import React from 'react';
import {
  Badge,
  Button,
  Chip,
  Icon,
  IconButton,
  IconName,
  Stack,
  Surface,
  Text,
} from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import { fmtDuration } from './primitives';
import type { TaskVM } from '../viewModel';

type Props = {
  task: TaskVM;
  runtimeMs: number | null;
  isDragging: boolean;
  dragHandlers: React.HTMLAttributes<HTMLElement>;
  onOpen: () => void;
  onEdit: () => void;
  onRun: () => void;
  onDelete: () => void;
};

function formatResumeAt(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function TaskCard({ task, runtimeMs, isDragging, dragHandlers, onOpen, onEdit, onRun, onDelete }: Props) {
  const waits = task.waitsOn.length > 0;
  const canRun =
    task.status === 'pending' ||
    task.status === 'failed' ||
    task.status === 'blocked' ||
    task.status === 'conflict';
  const canResume =
    task.status === 'interrupted' ||
    (task.interrupted && (task.status === 'running' || task.status === 'pushing'));
  const pausedByLimit = task.status === 'interrupted' && task.limitResetsAt != null;
  const tokens = task.tokens as { in: number; out: number } | null | undefined;

  return (
    <Surface
      as="article"
      background="bg2"
      bordered
      radius="md"
      padding={12}
      interactive
      cursor="pointer"
      opacity={isDragging ? 0.4 : 1}
      position="relative"
      onClick={onOpen}
      data-testid={TestIds.TaskCard.root(task.index)}
      {...dragHandlers}
    >
      {task.status === 'running' && (
        <Surface
          position="absolute"
          top={0}
          left={0}
          right={0}
          height={2}
          overflowY="hidden"
          className="ds-shimmer-bar"
        />
      )}

      <Stack as="header" direction="row" align="start" gap={8}>
        <Text size="xs" mono tone="faint">#{task.numericId ?? task.index + 1}</Text>
        <Surface grow>
          <Text
            as="h3"
            size="md"
            weight="semibold"
            tracking="tight"
            data-testid={TestIds.TaskCard.title(task.index)}
          >
            {task.title}
          </Text>
        </Surface>
        <IconButton
          aria-label="Edit task"
          title="Details"
          size="sm"
          variant="ghost"
          icon={<Icon value={IconName.More} size={14} />}
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          data-testid={TestIds.TaskCard.editBtn(task.index)}
        />
      </Stack>

      {task.description && (
        <Surface paddingTop={2} paddingBottom={10}>
          <Text
            size="sm"
            tone="muted"
            lineClamp={2}
            data-testid={TestIds.TaskCard.description(task.index)}
          >
            {task.description}
          </Text>
        </Surface>
      )}

      <Stack direction="row" wrap gap={5}>
        {task.branch && (
          <Chip icon={<Icon value={IconName.Git} size={11} />}>
            {task.branch.replace('nightcoder/', '')}
          </Chip>
        )}
        {task.prUrl && (
          <Chip
            tone="accent"
            icon={<Icon value={IconName.Github} size={11} />}
            title={task.prUrl}
            onClick={(e) => { e.stopPropagation(); void window.nightcoder.openExternal(task.prUrl!); }}
            data-testid={TestIds.TaskCard.prChip(task.index)}
          >
            PR #{task.prUrl.split('/').pop()}
          </Chip>
        )}
        {task.model && (
          <Chip tone="violet" icon={<Icon value={IconName.Sparkle} size={11} />}>{task.model}</Chip>
        )}
        {waits && (
          <Chip tone="warn" icon={<Icon value={IconName.Clock} size={11} />}>
            waits #{task.waitsOn.join(', #')}
          </Chip>
        )}
        {pausedByLimit && (
          <Chip tone="warn" icon={<Icon value={IconName.Clock} size={11} />}>
            paused · resumes {formatResumeAt(task.limitResetsAt!)}
          </Chip>
        )}
        {canResume && !pausedByLimit && (
          <Chip tone="warn" icon={<Icon value={IconName.Warn} size={11} />}>interrupted</Chip>
        )}
        {task.status === 'merging' && (
          <Chip tone="sky" icon={<Icon value={IconName.Clock} size={11} />}>auto-merging</Chip>
        )}
      </Stack>

      {task.status === 'conflict' && task.conflictedFiles.length > 0 && (
        <Surface
          paddingTop={6}
          data-testid={TestIds.TaskCard.conflictedFiles(task.index)}
        >
          <Text size="xs" tone="rose" weight="medium">
            Auto-resolve failed — conflicted files:
          </Text>
          <ul className="mt-1 ml-4 list-disc">
            {task.conflictedFiles.map((f) => (
              <li key={f}>
                <Text as="span" size="xs" mono tone="muted">{f}</Text>
              </li>
            ))}
          </ul>
        </Surface>
      )}

      <Surface paddingTop={10} direction="row" align="center" justify="between" gap={8}>
        <Stack direction="row" align="center" gap={10}>
          {task.status === 'running' && runtimeMs != null && (
            <Stack direction="row" align="center" gap={4}>
              <span className="ds-dot-running" />
              <Text size="xs" mono tone="emerald">{fmtDuration(runtimeMs)}</Text>
            </Stack>
          )}
          {task.status === 'done' && task.endedAt && task.startedAt && (
            <Stack direction="row" align="center" gap={4}>
              <Icon value={IconName.Check} size={11} />
              <Text size="xs" mono tone="faint">{fmtDuration(task.endedAt - task.startedAt)}</Text>
            </Stack>
          )}
          {task.status === 'failed' && task.endedAt && task.startedAt && (
            <Stack direction="row" align="center" gap={4}>
              <Icon value={IconName.Warn} size={11} />
              <Text size="xs" mono tone="rose">{fmtDuration(task.endedAt - task.startedAt)}</Text>
            </Stack>
          )}
          {tokens != null && (
            <Text size="xs" mono tone="faint" title="tokens in / out">
              ↑{(tokens.in / 1000).toFixed(1)}k ↓{(tokens.out / 1000).toFixed(1)}k
            </Text>
          )}
        </Stack>
        <Stack direction="row" align="center" gap={6}>
          {canResume && (
            <Button
              size="sm"
              variant="secondary"
              label="resume"
              startIcon={<Icon value={IconName.Play} size={11} />}
              title="Resume this interrupted task"
              onClick={(e) => { e.stopPropagation(); onRun(); }}
              data-testid={TestIds.TaskCard.resumeBtn(task.index)}
            />
          )}
          <Button
            size="sm"
            variant="primary"
            label="run"
            disabled={!canRun}
            startIcon={<Icon value={IconName.Play} size={11} />}
            title={canRun ? 'Run this task' : 'Task is not in a runnable state'}
            onClick={(e) => { e.stopPropagation(); onRun(); }}
            data-testid={TestIds.TaskCard.runBtn(task.index)}
          />
          <IconButton
            aria-label="Remove task"
            title="Remove"
            size="sm"
            variant="ghost"
            icon={<Icon value={IconName.Trash} size={12} />}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            data-testid={TestIds.TaskCard.deleteBtn(task.index)}
          />
          {(task.status !== 'pending' || task.startedAt !== null) && (
            <Badge status={task.status} data-testid={TestIds.TaskCard.statusBadge(task.index)} />
          )}
        </Stack>
      </Surface>
    </Surface>
  );
}

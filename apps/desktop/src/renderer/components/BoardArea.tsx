import React from 'react';
import { Container, Stack } from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import { TaskCard } from './TaskCard';
import { Column } from './Column';
import type { TaskVM } from '../viewModel';

type ColId = 'queue' | 'running' | 'review' | 'done';

const COLS: readonly { id: ColId; title: string; accent: 'amber' | 'emerald' | 'violet' | 'sky' }[] = [
  { id: 'queue',   title: 'Queued',  accent: 'amber' },
  { id: 'running', title: 'Running', accent: 'emerald' },
  { id: 'review',  title: 'Review',  accent: 'violet' },
  { id: 'done',    title: 'Done',    accent: 'sky' },
];

type BoardAreaProps = {
  grouped: Record<ColId, TaskVM[]>;
  dragId: string | null;
  onDropTask: (taskId: string, colId: ColId) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onOpenTask: (idx: number) => void;
  onEditTask: (idx: number) => void;
  onRunTask: (idx: number) => void;
  onDeleteTask: (idx: number) => void;
  runtimeMs: (task: TaskVM) => number | null;
};

export function BoardArea({
  grouped,
  dragId,
  onDropTask,
  onDragStart,
  onDragEnd,
  onOpenTask,
  onEditTask,
  onRunTask,
  onDeleteTask,
  runtimeMs,
}: BoardAreaProps) {
  return (
    <Container
      as="main"
      grow
      padding={['200', '250', '300', '250']}
      overflowY="auto"
      data-testid={TestIds.Board.root}
    >
      <Stack direction="column" gap="200">
        <Stack direction="row" gap="150" grow>
          {COLS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              accent={col.accent}
              count={grouped[col.id].length}
              isEmpty={grouped[col.id].length === 0}
              onDropTask={(id) => onDropTask(id, col.id)}
            >
              {grouped[col.id].map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  runtimeMs={runtimeMs(t)}
                  isDragging={dragId === t.id}
                  dragHandlers={{
                    draggable: true,
                    onDragStart: (e: React.DragEvent) => onDragStart(e, t.id),
                    onDragEnd,
                  }}
                  onOpen={() => onOpenTask(t.index)}
                  onEdit={() => onEditTask(t.index)}
                  onRun={() => onRunTask(t.index)}
                  onDelete={() => onDeleteTask(t.index)}
                />
              ))}
            </Column>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

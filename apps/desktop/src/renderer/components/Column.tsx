import React, { useState } from 'react';
import { Stack, Surface, Text } from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import type { TaskColumn } from '../viewModel';

export type ColumnAccent = 'emerald' | 'rose' | 'amber' | 'sky' | 'violet';

type Props = {
  id: TaskColumn;
  title: string;
  /** Token-driven accent name (drives dot fill + hover border tone). */
  accent: ColumnAccent;
  count: number;
  children: React.ReactNode;
  isEmpty: boolean;
  onDropTask: (taskId: string) => void;
};

export function Column({ id, title, accent, count, children, isEmpty, onDropTask }: Props) {
  const [hover, setHover] = useState(false);
  return (
    <Surface
      as="section"
      data-col={id}
      data-testid={TestIds.Board.column(id)}
      background={hover ? 'bg2' : 'bg1'}
      bordered
      borderTone={hover ? accent : 'default'}
      radius="md"
      direction="column"
      gap={10}
      grow
      minWidth={280}
      minHeight={420}
      padding={12}
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        setHover(false);
        const taskId = e.dataTransfer.getData('text/task-id');
        if (taskId) onDropTask(taskId);
      }}
    >
      <Surface as="header" paddingX={4} paddingY={2} direction="row" align="center" gap={8}>
        <Surface background={accent} width={7} height={7} radius="pill" />
        <Text as="h2" size="sm" weight="semibold" tone="muted" tracking="wide" transform="uppercase">
          {title}
        </Text>
        <Surface background="bg3" radius="pill" paddingX={7} paddingY={1}>
          <Text size="xs" mono tone="faint" data-testid={TestIds.Board.columnCount(id)}>{count}</Text>
        </Surface>
      </Surface>
      <Stack direction="column" gap={8} grow>
        {children}
        {isEmpty && (
          <Surface
            grow
            bordered
            borderStyle="dashed"
            radius="sm"
            paddingX={10}
            paddingY={20}
            minHeight={80}
            direction="row"
            align="center"
            justify="center"
            data-testid={TestIds.Board.columnEmpty(id)}
          >
            <Text size="xs" tone="faint" italic>drop tasks here</Text>
          </Surface>
        )}
      </Stack>
    </Surface>
  );
}

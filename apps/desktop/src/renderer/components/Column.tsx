import React, { useState } from 'react';
import { Card, Container, Stack, Text } from '@nightcoder/design-system';
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
    <Card
      as="section"
      data-col={id}
      data-testid={TestIds.Board.column(id)}
      background={hover ? 'bg2' : 'bg1'}
      bordered
      borderTone={hover ? accent : 'default'}
      radius="md"
      padding={['150', '150']}
      minWidth={280}
      minHeight={420}
      grow
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        setHover(false);
        const taskId = e.dataTransfer.getData('text/task-id');
        if (taskId) onDropTask(taskId);
      }}
    >
      <Stack direction="column" gap="100" grow>
        <Container as="header" padding={['25', '50']}>
          <Stack direction="row" align="center" gap="100">
            <Card variant="filled" background={accent} bordered={false} radius="pill" padding="0" width={7} height={7} />
            <Text as="h2" size="sm" weight="semibold" tone="muted" tracking="wide" transform="uppercase">
              {title}
            </Text>
            <Card variant="filled" background="bg3" bordered={false} radius="pill" padding={['25', '75']}>
              <Text size="xs" mono tone="faint" data-testid={TestIds.Board.columnCount(id)}>{count}</Text>
            </Card>
          </Stack>
        </Container>
        <Stack direction="column" gap="100" grow>
          {children}
          {isEmpty && (
            <Card
              variant="outlined"
              background="transparent"
              bordered
              borderStyle="dashed"
              radius="sm"
              padding={['250', '100']}
              minHeight={80}
              grow
              data-testid={TestIds.Board.columnEmpty(id)}
            >
              <Stack direction="row" align="center" justify="center" grow>
                <Text size="xs" tone="faint" italic>drop tasks here</Text>
              </Stack>
            </Card>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

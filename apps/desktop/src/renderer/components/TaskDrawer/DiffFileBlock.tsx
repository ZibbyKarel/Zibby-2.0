import React, { useState } from 'react';
import type { TaskDiffFile } from '@nightcoder/shared-types/ipc';
import { Button, Card, Container, Icon, IconName, Stack, Text, type TextTone } from '@nightcoder/design-system';
import type { HunkLine } from './types';
import { diffSummary, filePathLabel, changeKindTone, parseHunkLines, rowBackground } from './diffUtils';

function HunkRow({ row }: { row: HunkLine }) {
  const sign =
    row.kind === 'add' ? '+' : row.kind === 'del' ? '−' : row.kind === 'header' ? '' : ' ';
  const oldN = row.kind === 'del' ? row.oldLine : row.kind === 'context' ? row.oldLine : '';
  const newN = row.kind === 'add' ? row.newLine : row.kind === 'context' ? row.newLine : '';
  const signTone: TextTone =
    row.kind === 'add' ? 'emerald' : row.kind === 'del' ? 'rose' : 'faint';
  const isHeader = row.kind === 'header';

  return (
    <Card
      variant="filled"
      background={rowBackground(row.kind)}
      bordered={isHeader ? { top: true, bottom: true } : false}
      radius="none"
      padding={isHeader ? ['25', '100'] : ['0', '100']}
    >
      <Stack direction="row">
        {isHeader ? (
          <Stack grow>
            <Text size="sm" mono tone="faint" whitespace="pre">
              {row.text}
            </Text>
          </Stack>
        ) : (
          <>
            <Container width={40} padding={['0', '100', '0', '0']} userSelect="none">
              <Text size="sm" mono tone="faint" align="end">
                {oldN}
              </Text>
            </Container>
            <Container width={40} padding={['0', '100', '0', '0']} userSelect="none">
              <Text size="sm" mono tone="faint" align="end">
                {newN}
              </Text>
            </Container>
            <Container width={14} shrink={false}>
              <Text size="sm" mono tone={signTone}>
                {sign}
              </Text>
            </Container>
            <Text size="sm" mono whitespace="pre">
              {row.text}
            </Text>
          </>
        )}
      </Stack>
    </Card>
  );
}

function DiffHunks({ hunks }: { hunks: string[] }) {
  const rows: HunkLine[] = [];
  for (const h of hunks) rows.push(...parseHunkLines(h));

  return (
    <Card variant="filled" background="bg0" bordered={false} radius="none" padding="none" overflowX="auto">
      {rows.map((r, i) => (
        <HunkRow key={i} row={r} />
      ))}
    </Card>
  );
}

export function DiffFileBlock({ file }: { file: TaskDiffFile }) {
  const [collapsed, setCollapsed] = useState(false);
  const { adds, dels } = diffSummary(file);
  const label = filePathLabel(file);

  return (
    <Card
      variant="outlined"
      background="bg1"
      radius="sm"
      padding="none"
      overflowX="hidden"
      overflowY="hidden"
    >
      <Button
        variant="surface"
        type="button"
        background="bg2"
        bordered={!collapsed ? { bottom: true } : false}
        radius="none"
        textAlign="left"
        padding={['100', '100']}
        width="100%"
        onClick={() => setCollapsed((c) => !c)}
      >
        <Stack direction="row" align="center" gap="100" grow>
          <Icon value={collapsed ? IconName.ChevronRight : IconName.ChevronDown} size="xs" />
          <Card variant="filled" background="bg3" bordered={false} radius="pill" padding={['25', '75']}>
            <Text
              size="xs"
              mono
              tone={changeKindTone(file.changeKind)}
              tracking="wide"
              transform="uppercase"
            >
              {file.changeKind}
            </Text>
          </Card>
          <Container grow minWidth={0} title={label}>
            <Text as="code" size="sm" mono tone="muted" truncate>
              {label}
            </Text>
          </Container>
          <Text size="xs" mono tone="emerald">
            +{adds}
          </Text>
          <Text size="xs" mono tone="rose">
            −{dels}
          </Text>
        </Stack>
      </Button>
      {!collapsed &&
        (file.changeKind === 'binary' || file.hunks.length === 0 ? (
          <Container padding={['150', '150']}>
            <Text size="sm" tone="faint">
              {file.changeKind === 'binary'
                ? 'Binary file — diff not shown.'
                : 'No textual changes in this file.'}
            </Text>
          </Container>
        ) : (
          <DiffHunks hunks={file.hunks} />
        ))}
    </Card>
  );
}

import React, { useState } from 'react';
import type { TaskDiffFile } from '@nightcoder/shared-types/ipc';
import { Icon, IconName, Surface, Text, type TextTone } from '@nightcoder/design-system';
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
    <Surface
      direction="row"
      paddingX={10}
      paddingY={isHeader ? 2 : undefined}
      background={rowBackground(row.kind)}
      bordered={isHeader ? { top: true, bottom: true } : undefined}
    >
      {isHeader ? (
        <Surface grow>
          <Text size="sm" mono tone="faint" whitespace="pre">
            {row.text}
          </Text>
        </Surface>
      ) : (
        <>
          <Surface width={40} paddingRight={8} userSelect="none">
            <Text size="sm" mono tone="faint" align="end">
              {oldN}
            </Text>
          </Surface>
          <Surface width={40} paddingRight={8} userSelect="none">
            <Text size="sm" mono tone="faint" align="end">
              {newN}
            </Text>
          </Surface>
          <Surface width={14} shrink={false}>
            <Text size="sm" mono tone={signTone}>
              {sign}
            </Text>
          </Surface>
          <Text size="sm" mono whitespace="pre">
            {row.text}
          </Text>
        </>
      )}
    </Surface>
  );
}

function DiffHunks({ hunks }: { hunks: string[] }) {
  const rows: HunkLine[] = [];
  for (const h of hunks) rows.push(...parseHunkLines(h));

  return (
    <Surface overflowX="auto" background="bg0">
      {rows.map((r, i) => (
        <HunkRow key={i} row={r} />
      ))}
    </Surface>
  );
}

export function DiffFileBlock({ file }: { file: TaskDiffFile }) {
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
          <Text
            size="xs"
            mono
            tone={changeKindTone(file.changeKind)}
            tracking="wide"
            transform="uppercase"
          >
            {file.changeKind}
          </Text>
        </Surface>
        <Surface grow minWidth={0} title={label}>
          <Text as="code" size="sm" mono tone="muted" truncate>
            {label}
          </Text>
        </Surface>
        <Text size="xs" mono tone="emerald">
          +{adds}
        </Text>
        <Text size="xs" mono tone="rose">
          −{dels}
        </Text>
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

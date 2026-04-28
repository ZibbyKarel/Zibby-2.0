import React, { useEffect } from 'react';
import {
  Badge,
  Button,
  Card,
  Chip,
  Container,
  Drawer,
  Icon,
  IconButton,
  IconName,
  Spacer,
  Stack,
  Tabs,
  Text,
} from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import { fmtDuration, fmtNum } from '../primitives';
import type { TaskVM } from '../../viewModel';
import type { DrawerTab, SaveData } from './types';
import { LogsView } from './LogsView';
import { DiffPanel } from './DiffPanel';
import { DetailsView } from './DetailsView';

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
      <Container grow minHeight={0} height="100%" data-testid={TestIds.Drawer.root}>
        <Stack direction="column" grow>
          <Card
            as="header"
            variant="filled"
            background="transparent"
            bordered={{ bottom: true }}
            radius="none"
            padding={['150', '200', '150', '200']}
          >
            <Stack direction="column" gap="100">
              <Stack direction="row" align="center" gap="100">
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
                  startIcon={IconName.Play}
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
                  icon={IconName.X}
                  onClick={onClose}
                  data-testid={TestIds.Drawer.closeBtn}
                />
              </Stack>
              <Text as="h2" size="xl" weight="semibold" tracking="tight" data-testid={TestIds.Drawer.title}>
                {task.title}
              </Text>
              <Stack direction="row" wrap gap="75">
                {task.branch && <Chip icon={<Icon value={IconName.Git} size="xs" />}>{task.branch}</Chip>}
                {task.prUrl && (
                  <Chip tone="accent" icon={<Icon value={IconName.Github} size="xs" />}>
                    PR #{task.prUrl.split('/').pop()}
                  </Chip>
                )}
                {task.model && (
                  <Chip tone="violet" icon={<Icon value={IconName.Sparkle} size="xs" />}>{task.model}</Chip>
                )}
                {tokens != null && (
                  <Chip icon={<Icon value={IconName.Zap} size="xs" />}>
                    ↑{fmtNum(tokens.in)} ↓{fmtNum(tokens.out)}
                  </Chip>
                )}
              </Stack>
            </Stack>
          </Card>

          <Card variant="filled" background="transparent" bordered={{ bottom: true }} radius="none" padding={['0', '150']}>
            <Tabs<DrawerTab>
              tabs={[
                {
                  key: 'logs',
                  label: 'Logs',
                  icon: <Icon value={IconName.Terminal} size="sm" />,
                  badge: task.logs.length || undefined,
                  testId: TestIds.Drawer.tab('logs'),
                },
                {
                  key: 'diff',
                  label: 'Diff',
                  icon: <Icon value={IconName.Diff} size="sm" />,
                  testId: TestIds.Drawer.tab('diff'),
                },
                {
                  key: 'details',
                  label: 'Details',
                  icon: <Icon value={IconName.Edit} size="sm" />,
                  testId: TestIds.Drawer.tab('details'),
                },
              ]}
              activeKey={tab}
              onChange={setTab}
              variant="underline"
              size="sm"
            />
          </Card>

          <Container grow overflowY="auto" minHeight={0}>
            {tab === 'logs' && (
              <Container data-testid={TestIds.Drawer.panel('logs')} grow>
                <Stack direction="column" grow>
                  <LogsView task={task} />
                </Stack>
              </Container>
            )}
            {tab === 'diff' && (
              <Container data-testid={TestIds.Drawer.panel('diff')} grow>
                <Stack direction="column" grow>
                  <DiffPanel task={task} />
                </Stack>
              </Container>
            )}
            {tab === 'details' && (
              <Container data-testid={TestIds.Drawer.panel('details')} grow>
                <Stack direction="column" grow>
                  <DetailsView task={task} onSave={onSave} />
                </Stack>
              </Container>
            )}
          </Container>
        </Stack>
      </Container>
    </Drawer>
  );
}

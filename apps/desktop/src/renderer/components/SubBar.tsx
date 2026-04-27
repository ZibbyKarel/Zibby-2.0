import React from 'react';
import {
  Button,
  Divider,
  FilterChip,
  IconName,
  Spacer,
  Stack,
  Surface,
  Text,
} from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';

type FilterKey = 'interrupted' | 'cancelled_error' | 'pending';

type SubBarProps = {
  taskCount: number;
  runningCount: number;
  activeFilters: Set<FilterKey>;
  onToggleFilter: (key: FilterKey) => void;
  hasFolder: boolean;
  syncing: boolean;
  onSync: () => void;
  onAddTask: () => void;
  onRunAll: () => void;
  hasRunnableTasks: boolean;
};

const FILTERS: readonly { key: FilterKey; label: string; tone: 'warn' | 'rose' | 'sky'; testId: string }[] = [
  { key: 'interrupted',     label: 'Interrupted',       tone: 'warn', testId: TestIds.SubBar.filterInterrupted },
  { key: 'cancelled_error', label: 'Cancelled / Error', tone: 'rose', testId: TestIds.SubBar.filterCancelledErr },
  { key: 'pending',         label: 'Pending',           tone: 'sky',  testId: TestIds.SubBar.filterPending },
];

export function SubBar({
  taskCount,
  runningCount,
  activeFilters,
  onToggleFilter,
  hasFolder,
  syncing,
  onSync,
  onAddTask,
  onRunAll,
  hasRunnableTasks,
}: SubBarProps) {
  return (
    <Surface
      background="bg0"
      bordered={{ bottom: true }}
      paddingX={20}
      paddingY={12}
      data-testid={TestIds.SubBar.root}
    >
      <Stack direction="row" align="center" gap={10}>
        <Text size="xs" tone="faint" mono data-testid={TestIds.SubBar.taskCount}>
          {taskCount} tasks · {runningCount} running
        </Text>
        <Divider orientation="vertical" />
        {FILTERS.map(({ key, label, tone, testId }) => (
          <FilterChip
            key={key}
            tone={tone}
            size="md"
            active={activeFilters.has(key)}
            onToggle={() => onToggleFilter(key)}
            data-testid={testId}
          >
            {label}
          </FilterChip>
        ))}
        <Spacer />
        <Button
          size="sm"
          variant="secondary"
          disabled={!hasFolder || syncing}
          onClick={onSync}
          title="Synchronize task states with their pull requests"
          startIcon={IconName.Refresh}
          label={syncing ? 'Synchronizing…' : 'Synchronize'}
          data-testid={TestIds.SubBar.syncBtn}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={onAddTask}
          startIcon={IconName.Plus}
          label="Add task"
          data-testid={TestIds.SubBar.addTaskBtn}
        />
        <Button
          size="sm"
          variant="primary"
          disabled={!hasRunnableTasks}
          onClick={onRunAll}
          startIcon={IconName.Play}
          label="Run all"
          data-testid={TestIds.SubBar.runAllBtn}
        />
      </Stack>
    </Surface>
  );
}

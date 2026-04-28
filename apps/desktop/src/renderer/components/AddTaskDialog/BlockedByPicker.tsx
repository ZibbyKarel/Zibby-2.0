import React from 'react';
import { Card, IconButton, IconName, Select, Stack, Text } from '@nightcoder/design-system';
import { TestIds } from '@nightcoder/test-ids';
import type { BlockerOption } from './types';

type BlockedByPickerProps = {
  options: readonly BlockerOption[];
  value: string[];
  onChange: (ids: string[]) => void;
};

export function BlockedByPicker({ options, value, onChange }: BlockedByPickerProps) {
  const candidates = options.filter((o) => !value.includes(o.taskId));
  const selected = value
    .map((id) => options.find((o) => o.taskId === id))
    .filter(Boolean) as BlockerOption[];

  const add = (taskId: string) => {
    if (!taskId) return;
    onChange([...value, taskId]);
  };
  const remove = (taskId: string) =>
    onChange(value.filter((v) => v !== taskId));

  if (options.length === 0) {
    return (
      <Card
        variant="outlined"
        background="bg2"
        radius="sm"
        padding={['100', '150']}
      >
        <Text size="xs" tone="faint" italic>
          No other tasks to depend on yet.
        </Text>
      </Card>
    );
  }

  return (
    <Stack
      direction="column"
      gap="100"
      data-testid={TestIds.AddTaskDialog.blockerSelect}
    >
      {selected.length > 0 && (
        <Stack direction="row" gap="75" wrap>
          {selected.map((opt) => (
            <Card
              key={opt.taskId}
              variant="outlined"
              background="bg2"
              radius="pill"
              padding={['25', '50', '25', '100']}
            >
              <Stack direction="row" align="center" gap="75">
                {opt.hint && (
                  <Text size="xs" mono tone="faint">
                    {opt.hint}
                  </Text>
                )}
                <Text size="xs" tone="muted" truncate style={{ maxWidth: 200 }}>
                  {opt.title}
                </Text>
                <IconButton
                  aria-label={`Remove ${opt.title}`}
                  size="sm"
                  variant="ghost"
                  icon={IconName.X}
                  onClick={() => remove(opt.taskId)}
                />
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
      {candidates.length > 0 && (
        <Stack grow>
          <Select
            aria-label="Add a dependency"
            value=""
            onChange={(e) => add(e.target.value)}
            options={[
              {
                value: '',
                label:
                  selected.length > 0
                    ? '+ Add another dependency…'
                    : 'Select a task this depends on…',
              },
              ...candidates.map((o) => ({
                value: o.taskId,
                label: o.hint ? `${o.hint} — ${o.title}` : o.title,
              })),
            ]}
          />
        </Stack>
      )}
    </Stack>
  );
}

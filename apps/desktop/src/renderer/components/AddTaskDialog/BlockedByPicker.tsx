import React from 'react';
import { IconButton, IconName, Select, Surface, Text } from '@nightcoder/design-system';
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
      <Surface
        bordered
        radius="sm"
        background="bg2"
        paddingX={12}
        paddingY={10}
      >
        <Text size="xs" tone="faint" italic>
          No other tasks to depend on yet.
        </Text>
      </Surface>
    );
  }

  return (
    <Surface
      direction="column"
      gap={8}
      data-testid={TestIds.AddTaskDialog.blockerSelect}
    >
      {selected.length > 0 && (
        <Surface direction="row" gap={6} style={{ flexWrap: 'wrap' }}>
          {selected.map((opt) => (
            <Surface
              key={opt.taskId}
              bordered
              radius="pill"
              background="bg2"
              paddingLeft={8}
              paddingRight={4}
              paddingTop={3}
              paddingBottom={3}
              direction="row"
              align="center"
              gap={6}
            >
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
            </Surface>
          ))}
        </Surface>
      )}
      {candidates.length > 0 && (
        <Surface grow>
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
        </Surface>
      )}
    </Surface>
  );
}

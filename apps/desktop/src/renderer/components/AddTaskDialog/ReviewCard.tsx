import React from 'react';
import { Surface, Text } from '@nightcoder/design-system';

type ReviewCardProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'data-testid'?: string;
};

export function ReviewCard({
  checked,
  onChange,
  'data-testid': testId,
}: ReviewCardProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        background: 'var(--bg-2)',
        border: `1px solid ${checked ? 'var(--emerald)' : 'var(--border)'}`,
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'border-color .12s',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testId}
        style={{
          marginTop: 2,
          width: 14,
          height: 14,
          accentColor: 'var(--emerald)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />
      <Surface direction="column" gap={2} grow>
        <Surface direction="row" align="center" gap={6}>
          <Text size="sm" weight="medium">
            Human review required
          </Text>
          {checked && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                padding: '1px 6px',
                borderRadius: 3,
                background: 'var(--accent-soft)',
                color: 'var(--emerald)',
                fontFamily: 'var(--mono)',
              }}
            >
              default
            </span>
          )}
        </Surface>
        <Text size="xs" tone="faint">
          Pause before merging so you can sign off on the agent&apos;s work.
        </Text>
      </Surface>
    </label>
  );
}

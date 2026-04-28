import React from 'react';
import { Card, Stack, Text } from '@nightcoder/design-system';

export function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack direction="column" gap="100">
      <Text
        as="h3"
        size="xs"
        weight="semibold"
        tone="faint"
        tracking="wider"
        transform="uppercase"
      >
        {label}
      </Text>
      {children}
    </Stack>
  );
}

export function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <Card
      variant="outlined"
      background="bg2"
      radius="sm"
      padding={['100', '100']}
    >
      <Stack direction="column" gap="25">
        <Text size="xs" tone="faint" tracking="wider" transform="uppercase">
          {k}
        </Text>
        <Text size="sm" mono={mono}>
          {v}
        </Text>
      </Stack>
    </Card>
  );
}

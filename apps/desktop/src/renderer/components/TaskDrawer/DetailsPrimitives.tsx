import React from 'react';
import { Surface, Text } from '@nightcoder/design-system';

export function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Surface direction="column" gap={8}>
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
    </Surface>
  );
}

export function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <Surface
      bordered
      radius="sm"
      background="bg2"
      paddingX={10}
      paddingY={8}
      direction="column"
      gap={2}
    >
      <Text size="xs" tone="faint" tracking="wider" transform="uppercase">
        {k}
      </Text>
      <Text size="sm" mono={mono}>
        {v}
      </Text>
    </Surface>
  );
}

import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from './Text';
import { Stack } from '../Stack';

const meta = {
  title: 'Design System/Text',
  component: Text,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

const wrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 18, width: 540 };
const label: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-2)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

export const Overview: Story = {
  args: { children: 'Sample text' },
  render: () => (
    <div style={wrap}>
      <div>
        <div style={label}>Sizes</div>
        <Stack direction="column" gap={4}>
          <Text size="xxs">xxs · the quick brown fox</Text>
          <Text size="xs">xs · the quick brown fox</Text>
          <Text size="sm">sm · the quick brown fox</Text>
          <Text size="md">md · the quick brown fox</Text>
          <Text size="lg">lg · the quick brown fox</Text>
          <Text size="xl">xl · the quick brown fox</Text>
        </Stack>
      </div>
      <div>
        <div style={label}>Weights</div>
        <Stack direction="row" gap={12}>
          <Text weight="normal">normal</Text>
          <Text weight="medium">medium</Text>
          <Text weight="semibold">semibold</Text>
          <Text weight="bold">bold</Text>
        </Stack>
      </div>
      <div>
        <div style={label}>Tones</div>
        <Stack direction="row" gap={12} wrap>
          <Text tone="default">default</Text>
          <Text tone="muted">muted</Text>
          <Text tone="subtle">subtle</Text>
          <Text tone="faint">faint</Text>
          <Text tone="emerald">emerald</Text>
          <Text tone="rose">rose</Text>
          <Text tone="amber">amber</Text>
          <Text tone="sky">sky</Text>
          <Text tone="violet">violet</Text>
        </Stack>
      </div>
      <div>
        <div style={label}>Mono / tracking / transform / tabular</div>
        <Stack direction="column" gap={4}>
          <Text mono size="sm">git@nightcoder:claude/refactor-design-system</Text>
          <Text tracking="wide" transform="uppercase" tone="subtle" size="xs">section heading</Text>
          <Text tabular size="sm">123,456,789</Text>
        </Stack>
      </div>
      <div>
        <div style={label}>Truncate</div>
        <div style={{ width: 200, border: '1px dashed var(--border)' }}>
          <Text truncate as="div">a very long string that does not fit in a tiny container</Text>
        </div>
      </div>
      <div>
        <div style={label}>Whitespace</div>
        <Stack direction="column" gap={6}>
          <Text whitespace="pre" mono size="sm" as="div">{'  preserves   spaces'}</Text>
          <Text whitespace="pre-wrap" mono size="sm" as="div">{'a long line\nthat\npreserves newlines'}</Text>
          <Text whitespace="nowrap" as="div">no wrap forces a single line of text content</Text>
        </Stack>
      </div>
      <div>
        <div style={label}>Element override</div>
        <Stack direction="column" gap={4}>
          <Text as="h1" size="xl" weight="bold">h1 heading</Text>
          <Text as="h2" size="lg" weight="semibold">h2 heading</Text>
          <Text as="p" size="md" tone="muted">paragraph copy</Text>
          <Text as="code" mono tone="subtle">inline code</Text>
        </Stack>
      </div>
    </div>
  ),
};

export const Playground: Story = {
  args: {
    children: 'Sample text',
    size: 'md',
    weight: 'normal',
    tone: 'default',
    mono: false,
    tracking: 'normal',
    transform: 'none',
    align: 'start',
    truncate: false,
    tabular: false,
  },
  argTypes: {
    children: { control: 'text' },
    size:      { control: 'select', options: ['xxs', 'xs', 'sm', 'md', 'lg', 'xl'] },
    weight:    { control: 'select', options: ['normal', 'medium', 'semibold', 'bold'] },
    tone:      { control: 'select', options: ['default', 'muted', 'subtle', 'faint', 'inverse', 'emerald', 'rose', 'amber', 'sky', 'violet', 'inherit'] },
    tracking:  { control: 'select', options: ['normal', 'tight', 'wide', 'wider'] },
    transform: { control: 'select', options: ['none', 'uppercase'] },
    align:     { control: 'select', options: ['start', 'center', 'end', 'justify'] },
    whitespace: { control: 'select', options: ['normal', 'pre', 'pre-wrap', 'pre-line', 'nowrap', 'break-word'] },
    mono:     { control: 'boolean' },
    truncate: { control: 'boolean' },
    tabular:  { control: 'boolean' },
    italic:   { control: 'boolean' },
    lineClamp: { control: 'number' },
    as:       { control: 'select', options: ['span', 'p', 'div', 'h1', 'h2', 'h3', 'code', 'pre'] },
  },
};

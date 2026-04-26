import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spacer } from './Spacer';
import { Stack } from '../Stack';
import { Surface } from '../Surface';

const meta = {
  title: 'Design System/Spacer',
  component: Spacer,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Spacer>;

export default meta;

type Story = StoryObj<typeof meta>;

const wrap: CSSProperties = { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, width: 720 };
const label: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-2)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

export const Overview: Story = {
  args: {},
  render: () => (
    <div style={wrap}>
      <div>
        <div style={label}>flex: 1 spacer pushes the right group</div>
        <Surface bordered padding={12} radius="sm">
          <Stack direction="row" align="center" gap={8}>
            <Surface bordered padding={6} radius="sm">left</Surface>
            <Spacer />
            <Surface bordered padding={6} radius="sm">right</Surface>
          </Stack>
        </Surface>
      </div>
      <div>
        <div style={label}>Fixed horizontal spacers (8 / 24 / 48 px)</div>
        <Surface bordered padding={12} radius="sm">
          <Stack direction="row" align="center">
            <Surface bordered padding={6} radius="sm">a</Surface>
            <Spacer axis="horizontal" size={8} />
            <Surface bordered padding={6} radius="sm">b</Surface>
            <Spacer axis="horizontal" size={24} />
            <Surface bordered padding={6} radius="sm">c</Surface>
            <Spacer axis="horizontal" size={48} />
            <Surface bordered padding={6} radius="sm">d</Surface>
          </Stack>
        </Surface>
      </div>
      <div>
        <div style={label}>Fixed vertical spacers</div>
        <Surface bordered padding={12} radius="sm">
          <Stack direction="column">
            <Surface bordered padding={6} radius="sm">top</Surface>
            <Spacer axis="vertical" size={20} />
            <Surface bordered padding={6} radius="sm">middle</Surface>
            <Spacer axis="vertical" size={40} />
            <Surface bordered padding={6} radius="sm">bottom</Surface>
          </Stack>
        </Surface>
      </div>
      <div>
        <div style={label}>Custom class</div>
        <Surface bordered padding={12} radius="sm">
          <Stack direction="row" align="center" gap={8}>
            <Surface bordered padding={6} radius="sm">a</Surface>
            <Spacer className="opacity-50" />
            <Surface bordered padding={6} radius="sm">b</Surface>
          </Stack>
        </Surface>
      </div>
    </div>
  ),
};

export const Playground: Story = {
  args: { axis: 'both', size: undefined },
  argTypes: {
    axis: { control: 'select', options: ['horizontal', 'vertical', 'both'] },
    size: { control: 'text' },
    className: { control: 'text' },
  },
  render: (args) => (
    <Surface bordered padding={12} radius="sm">
      <Stack direction={args.axis === 'vertical' ? 'column' : 'row'} align="center" gap={8}>
        <Surface bordered padding={6} radius="sm">left/top</Surface>
        <Spacer {...args} />
        <Surface bordered padding={6} radius="sm">right/bottom</Surface>
      </Stack>
    </Surface>
  ),
};

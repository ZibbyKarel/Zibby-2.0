import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spacer } from './Spacer';
import { Stack } from '../Stack';
import { Card } from '../Card';

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
        <Card variant="outlined" radius="sm" padding={['150', '150']}>
          <Stack direction="row" align="center" gap="100">
            <Card variant="outlined" radius="sm" padding={['75', '75']}>left</Card>
            <Spacer />
            <Card variant="outlined" radius="sm" padding={['75', '75']}>right</Card>
          </Stack>
        </Card>
      </div>
      <div>
        <div style={label}>Fixed horizontal spacers (100=8px / 300=24px / 500=40px)</div>
        <Card variant="outlined" radius="sm" padding={['150', '150']}>
          <Stack direction="row" align="center">
            <Card variant="outlined" radius="sm" padding={['75', '75']}>a</Card>
            <Spacer axis="horizontal" size="100" />
            <Card variant="outlined" radius="sm" padding={['75', '75']}>b</Card>
            <Spacer axis="horizontal" size="300" />
            <Card variant="outlined" radius="sm" padding={['75', '75']}>c</Card>
            <Spacer axis="horizontal" size="500" />
            <Card variant="outlined" radius="sm" padding={['75', '75']}>d</Card>
          </Stack>
        </Card>
      </div>
      <div>
        <div style={label}>Fixed vertical spacers</div>
        <Card variant="outlined" radius="sm" padding={['150', '150']}>
          <Stack direction="column">
            <Card variant="outlined" radius="sm" padding={['75', '75']}>top</Card>
            <Spacer axis="vertical" size="250" />
            <Card variant="outlined" radius="sm" padding={['75', '75']}>middle</Card>
            <Spacer axis="vertical" size="500" />
            <Card variant="outlined" radius="sm" padding={['75', '75']}>bottom</Card>
          </Stack>
        </Card>
      </div>
      <div>
        <div style={label}>Custom class</div>
        <Card variant="outlined" radius="sm" padding={['150', '150']}>
          <Stack direction="row" align="center" gap="100">
            <Card variant="outlined" radius="sm" padding={['75', '75']}>a</Card>
            <Spacer className="opacity-50" />
            <Card variant="outlined" radius="sm" padding={['75', '75']}>b</Card>
          </Stack>
        </Card>
      </div>
    </div>
  ),
};

export const Playground: Story = {
  args: { axis: 'both', size: undefined },
  argTypes: {
    axis: { control: 'select', options: ['horizontal', 'vertical', 'both'] },
    size: { control: 'select', options: [undefined, '0', '25', '50', '75', '100', '150', '200', '250', '300', '350', '400', '450', '500'] },
    className: { control: 'text' },
  },
  render: (args) => (
    <Card variant="outlined" radius="sm" padding={['150', '150']}>
      <Stack direction={args.axis === 'vertical' ? 'column' : 'row'} align="center" gap="100">
        <Card variant="outlined" radius="sm" padding={['75', '75']}>left/top</Card>
        <Spacer {...args} />
        <Card variant="outlined" radius="sm" padding={['75', '75']}>right/bottom</Card>
      </Stack>
    </Card>
  ),
};

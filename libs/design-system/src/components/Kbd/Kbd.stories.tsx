import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd } from './Kbd';

const meta = {
  title: 'Design System/Kbd',
  component: Kbd,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Kbd>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };
const col: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const label: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-tertiary)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 4,
};

export const Overview: Story = {
  args: { children: '⌘K' },
  render: () => (
    <div style={col}>
      <div>
        <div style={label}>Sizes</div>
        <div style={row}>
          <Kbd size="sm">⌘K</Kbd>
          <Kbd size="md">⌘K</Kbd>
        </div>
      </div>
      <div>
        <div style={label}>Common shortcuts</div>
        <div style={row}>
          <Kbd>⌘K</Kbd>
          <Kbd>⌘N</Kbd>
          <Kbd>⌘⏎</Kbd>
          <Kbd>Esc</Kbd>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
        </div>
      </div>
      <div>
        <div style={label}>Custom class</div>
        <div style={row}>
          <Kbd className="opacity-50">⌘.</Kbd>
        </div>
      </div>
    </div>
  ),
};

export const Playground: Story = {
  args: { children: '⌘K', size: 'md' },
  argTypes: {
    children: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md'] },
    className: { control: 'text' },
  },
};

import { useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FilterChip } from './FilterChip';
import { Icon, IconName } from './Icon';

const meta = {
  title: 'Design System/FilterChip',
  component: FilterChip,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof FilterChip>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };
const col: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16 };
const label: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-2)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const tones = ['neutral', 'accent', 'violet', 'warn', 'sky', 'rose'] as const;

export const Overview: Story = {
  args: { children: 'Filter', active: false },
  render: () => (
    <div style={col}>
      <div>
        <div style={label}>Inactive (every tone collapses to neutral)</div>
        <div style={row}>
          {tones.map((tone) => (
            <FilterChip key={tone} tone={tone}>{tone}</FilterChip>
          ))}
        </div>
      </div>
      <div>
        <div style={label}>Active</div>
        <div style={row}>
          {tones.map((tone) => (
            <FilterChip key={tone} active tone={tone}>{tone}</FilterChip>
          ))}
        </div>
      </div>
      <div>
        <div style={label}>Sizes</div>
        <div style={row}>
          <FilterChip size="sm">small</FilterChip>
          <FilterChip size="md">medium</FilterChip>
          <FilterChip active size="sm" tone="accent">small active</FilterChip>
          <FilterChip active size="md" tone="violet">medium active</FilterChip>
        </div>
      </div>
      <div>
        <div style={label}>With icon</div>
        <div style={row}>
          <FilterChip icon={<Icon value={IconName.Filter} size={11} />}>
            Interrupted
          </FilterChip>
          <FilterChip active tone="warn" icon={<Icon value={IconName.Filter} size={11} />}>
            Interrupted
          </FilterChip>
        </div>
      </div>
      <div>
        <div style={label}>Disabled</div>
        <div style={row}>
          <FilterChip disabled>Off</FilterChip>
          <FilterChip disabled active tone="accent">On</FilterChip>
        </div>
      </div>
      <div>
        <div style={label}>Custom class</div>
        <div style={row}>
          <FilterChip className="opacity-70">Muted</FilterChip>
        </div>
      </div>
    </div>
  ),
};

export const Playground: Story = {
  args: {
    children: 'Pending',
    active: false,
    tone: 'accent',
    size: 'md',
    disabled: false,
  },
  argTypes: {
    onToggle: { action: 'toggle' },
    tone: { control: 'select', options: tones as unknown as string[] },
    size: { control: 'select', options: ['sm', 'md'] },
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
  render: (args) => {
    const [active, setActive] = useState(args.active ?? false);
    return (
      <FilterChip
        {...args}
        active={active}
        onToggle={(next, e) => {
          setActive(next);
          args.onToggle?.(next, e);
        }}
      />
    );
  },
};

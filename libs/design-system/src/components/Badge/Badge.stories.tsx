import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, type BadgeStatus } from './Badge';

const meta = {
  title: 'Design System/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };
const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const label: CSSProperties = { fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '.08em', textTransform: 'uppercase' };

const statuses: readonly BadgeStatus[] = [
  'pending', 'blocked', 'running', 'pushing', 'review', 'done', 'failed', 'cancelled', 'interrupted',
];

/**
 * Every supported status, plus dot toggle, custom colors, and pulse override.
 */
export const Overview: Story = {
  render: () => (
    <div style={stack}>
      <div>
        <div style={label}>Statuses</div>
        <div style={row}>
          {statuses.map((s) => (
            <Badge key={s} status={s} />
          ))}
        </div>
      </div>
      <div>
        <div style={label}>Dot off</div>
        <div style={row}>
          {statuses.map((s) => (
            <Badge key={s} status={s} dot={false} />
          ))}
        </div>
      </div>
      <div>
        <div style={label}>Custom label</div>
        <div style={row}>
          <Badge status="running" label="building" />
          <Badge status="done"    label="merged" />
          <Badge status="failed"  label="errored" />
        </div>
      </div>
      <div>
        <div style={label}>Custom color & background</div>
        <div style={row}>
          <Badge label="violet"  color="var(--violet)"  background="rgba(167,139,250,.12)" />
          <Badge label="sky"     color="var(--sky)"     background="rgba(56,189,248,.12)" />
          <Badge label="emerald" color="var(--emerald)" background="rgba(16,185,129,.12)" />
        </div>
      </div>
      <div>
        <div style={label}>Force pulse</div>
        <div style={row}>
          <Badge status="done" pulse />
          <Badge label="syncing" color="var(--sky)" background="rgba(56,189,248,.12)" pulse />
        </div>
      </div>
    </div>
  ),
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    status: 'running',
    label: undefined,
    dot: true,
    pulse: undefined,
    color: undefined,
    background: undefined,
    className: '',
  },
  argTypes: {
    status: { control: 'select', options: [undefined, ...statuses] },
    label: { control: 'text' },
    dot: { control: 'boolean' },
    pulse: { control: 'boolean' },
    color: { control: 'text' },
    background: { control: 'text' },
    className: { control: 'text' },
  },
};

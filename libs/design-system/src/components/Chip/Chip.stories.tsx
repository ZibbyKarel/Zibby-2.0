import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip, type ChipTone } from './Chip';

const meta = {
  title: 'Design System/Chip',
  component: Chip,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };
const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const label: CSSProperties = { fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '.08em', textTransform: 'uppercase' };

const tones: readonly ChipTone[] = ['neutral', 'accent', 'violet', 'warn', 'sky', 'rose'];

const branch = (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
    <circle cx="3" cy="2" r="1.5" />
    <circle cx="3" cy="9" r="1.5" />
    <circle cx="9" cy="5" r="1.5" />
    <path d="M3 3.5v4M4.5 5h2.8" />
  </svg>
);

/**
 * Every tone × size, with icon, deletable, interactive, and custom className variants.
 */
export const Overview: Story = {
  args: { children: 'overview' },
  render: () => (
    <div style={stack}>
      <div>
        <div style={label}>Tones</div>
        <div style={row}>
          {tones.map((t) => (
            <Chip key={t} tone={t}>{t}</Chip>
          ))}
        </div>
      </div>
      <div>
        <div style={label}>Sizes</div>
        <div style={row}>
          <Chip size="sm" tone="accent">small</Chip>
          <Chip size="md" tone="accent">medium</Chip>
        </div>
      </div>
      <div>
        <div style={label}>With icon</div>
        <div style={row}>
          <Chip icon={branch} tone="neutral">main</Chip>
          <Chip icon={branch} tone="violet">feature/x</Chip>
        </div>
      </div>
      <div>
        <div style={label}>Deletable</div>
        <div style={row}>
          {tones.map((t) => (
            <Chip key={t} tone={t} onDelete={() => {}}>{t}</Chip>
          ))}
        </div>
      </div>
      <div>
        <div style={label}>Interactive (clickable)</div>
        <div style={row}>
          <Chip tone="accent" onClick={() => {}}>tap me</Chip>
          <Chip tone="violet" onClick={() => {}} icon={branch}>open PR</Chip>
        </div>
      </div>
      <div>
        <div style={label}>Custom className</div>
        <div style={row}>
          <Chip className="uppercase tracking-widest" tone="warn">custom</Chip>
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
    children: 'design-system',
    tone: 'accent',
    size: 'md',
    title: '',
    className: '',
  },
  argTypes: {
    children: { control: 'text' },
    tone: { control: 'select', options: tones },
    size: { control: 'select', options: ['sm', 'md'] },
    title: { control: 'text' },
    className: { control: 'text' },
    onDelete: { action: 'delete' },
    onClick: { action: 'click' },
  },
};

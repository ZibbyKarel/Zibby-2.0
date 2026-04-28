import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon, IconName } from './Icon';
import type { Size } from '../../tokens';

const sizes: Size[] = ['xs', 'sm', 'md', 'lg', 'xl'];

const meta = {
  title: 'Design System/Icon',
  component: Icon,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
  gap: 12,
  width: 'min(720px, 92vw)',
};

const cell: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '12px 8px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg-elevated)',
};

const label: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-tertiary)',
  fontFamily: 'var(--mono)',
  letterSpacing: '.04em',
};

const sectionLabel: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-tertiary)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' };

const iconNames = Object.values(IconName);

/**
 * Every glyph in the curated set, plus size and stroke variants.
 */
export const Overview: Story = {
  args: { value: IconName.Check },
  render: () => (
    <div>
      <div style={sectionLabel}>Catalog ({iconNames.length} icons)</div>
      <div style={grid}>
        {iconNames.map((name) => (
          <div key={name} style={cell}>
            <Icon value={name} size="lg" />
            <span style={label}>{name}</span>
          </div>
        ))}
      </div>
      <div style={{ ...sectionLabel, marginTop: 24 }}>Sizes</div>
      <div style={row}>
        {sizes.map((s) => (
          <div key={s} style={cell}>
            <Icon value={IconName.Sparkle} size={s} />
            <span style={label}>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ ...sectionLabel, marginTop: 24 }}>Stroke</div>
      <div style={row}>
        {[1, 1.5, 2, 2.5].map((w) => (
          <div key={w} style={cell}>
            <Icon value={IconName.Bell} size="xl" strokeWidth={w} />
            <span style={label}>{w}</span>
          </div>
        ))}
      </div>
      <div style={{ ...sectionLabel, marginTop: 24 }}>Inherited color</div>
      <div style={row}>
        <span style={{ color: 'var(--emerald)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon value={IconName.CheckCircle} /> emerald
        </span>
        <span style={{ color: 'var(--rose)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon value={IconName.AlertCircle} /> rose
        </span>
        <span style={{ color: 'var(--amber)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon value={IconName.AlertTriangle} /> amber
        </span>
      </div>
    </div>
  ),
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    value: IconName.Sparkle,
    size: 'xl',
    strokeWidth: 1.75,
    className: '',
  },
  argTypes: {
    value: { control: 'select', options: iconNames },
    size: { control: 'select', options: sizes },
    strokeWidth: { control: { type: 'range', min: 0.5, max: 3, step: 0.25 } },
    className: { control: 'text' },
  },
};

import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta = {
  title: 'Design System/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const label: CSSProperties = { fontSize: 11, color: 'var(--text-2)', letterSpacing: '.08em', textTransform: 'uppercase' };

const variants = ['primary', 'secondary', 'ghost', 'outline', 'danger'] as const;
const sizes = ['sm', 'md', 'lg'] as const;

const dot = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
    <circle cx="7" cy="7" r="4" />
  </svg>
);

const x = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M3 3l8 8M11 3l-8 8" />
  </svg>
);

/**
 * Every supported variant, size, icon configuration and disabled state
 * rendered side by side as the visual-regression baseline.
 */
export const Overview: Story = {
  render: () => (
    <div style={stack}>
      <div>
        <div style={label}>Variants</div>
        <div style={row}>
          {variants.map((v) => (
            <Button key={v} label={v} variant={v} />
          ))}
        </div>
      </div>
      <div>
        <div style={label}>Sizes</div>
        <div style={row}>
          {sizes.map((s) => (
            <Button key={s} label={s} variant="primary" size={s} />
          ))}
        </div>
      </div>
      <div>
        <div style={label}>Icons</div>
        <div style={row}>
          <Button label="Start" startIcon={dot} variant="secondary" />
          <Button label="End" endIcon={dot} variant="secondary" />
          <Button label="Both" startIcon={dot} endIcon={dot} variant="secondary" />
        </div>
      </div>
      <div>
        <div style={label}>Icon-only</div>
        <div style={row}>
          {sizes.map((s) => (
            <Button key={s} icon={x} size={s} variant="ghost" aria-label={`Close ${s}`} />
          ))}
          <Button icon={x} variant="outline" aria-label="Close outline" />
          <Button icon={x} variant="danger" aria-label="Close danger" />
        </div>
      </div>
      <div>
        <div style={label}>Disabled</div>
        <div style={row}>
          {variants.map((v) => (
            <Button key={v} label={v} variant={v} disabled />
          ))}
        </div>
      </div>
      <div>
        <div style={label}>Custom className</div>
        <div style={row}>
          <Button label="Wide" variant="primary" className="w-48" />
        </div>
      </div>
    </div>
  ),
};

/**
 * Drive every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    label: 'Click me',
    variant: 'primary',
    size: 'md',
    disabled: false,
    type: 'button',
    className: '',
  },
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: variants },
    size: { control: 'select', options: sizes },
    disabled: { control: 'boolean' },
    type: { control: 'select', options: ['button', 'submit', 'reset'] },
    className: { control: 'text' },
    onClick: { action: 'click' },
  },
};

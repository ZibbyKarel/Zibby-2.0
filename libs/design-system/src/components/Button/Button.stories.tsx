import { Fragment, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { IconName } from '../Icon';

const meta = {
  title: 'Design System/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};
const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};
const label: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-2)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
};

const variants = [
  'primary',
  'secondary',
  'ghost',
  'outline',
  'danger',
] as const;
const sizes = ['sm', 'md', 'lg'] as const;

const icon = IconName.AlertTriangle;

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
        {sizes.map((size) => (
          <Fragment key={size}>
            <div style={row}>
              <Button
                label="Start"
                startIcon={icon}
                variant="secondary"
                size={size}
              />
              <Button
                label="End"
                endIcon={icon}
                variant="secondary"
                size={size}
              />
              <Button
                label="Both"
                startIcon={icon}
                endIcon={icon}
                variant="secondary"
                size={size}
              />
            </div>
            <br />
          </Fragment>
        ))}
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

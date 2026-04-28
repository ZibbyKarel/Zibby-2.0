import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton } from './IconButton';
import { IconName } from '../Icon';

const meta = {
  title: 'Design System/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' };
const col: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16 };
const label: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-tertiary)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const variants = ['ghost', 'secondary', 'outline', 'primary', 'danger'] as const;
const sizes = ['sm', 'md', 'lg'] as const;
const iconNames = Object.values(IconName);

/** Every variant × every size, plus the disabled and custom-classed states. */
export const Overview: Story = {
  args: { 'aria-label': 'Refresh', icon: IconName.Refresh },
  render: () => (
    <div style={col}>
      {variants.map((variant) => (
        <div key={variant}>
          <div style={label}>{variant}</div>
          <div style={row}>
            {sizes.map((size) => (
              <IconButton
                key={size}
                aria-label={`${size} refresh`}
                icon={IconName.Refresh}
                variant={variant}
                size={size}
              />
            ))}
            <IconButton
              aria-label="Disabled"
              icon={IconName.Refresh}
              variant={variant}
              disabled
            />
            <IconButton
              aria-label="With custom class"
              icon={IconName.Sparkle}
              variant={variant}
              className="opacity-80"
            />
          </div>
        </div>
      ))}
    </div>
  ),
};

/** Drive every prop from the controls panel. */
export const Playground: Story = {
  args: {
    'aria-label': 'Refresh',
    icon: IconName.Refresh,
    variant: 'ghost',
    size: 'md',
    disabled: false,
  },
  argTypes: {
    onClick: { action: 'click' },
    icon: { control: 'select', options: iconNames },
    variant: { control: 'select', options: variants },
    size: { control: 'select', options: sizes },
    disabled: { control: 'boolean' },
    'aria-label': { control: 'text' },
  },
};

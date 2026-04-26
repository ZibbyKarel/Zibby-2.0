import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton } from './IconButton';
import { Icon, IconName } from './Icon';

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
  color: 'var(--text-2)',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

/** Every variant × every size, plus the disabled and custom-classed states. */
export const Overview: Story = {
  args: { 'aria-label': 'Refresh', icon: <Icon value={IconName.Refresh} /> },
  render: () => (
    <div style={col}>
      {(['ghost', 'secondary', 'outline', 'primary', 'danger'] as const).map((variant) => (
        <div key={variant}>
          <div style={label}>{variant}</div>
          <div style={row}>
            <IconButton aria-label="Small refresh" icon={<Icon value={IconName.Refresh} size={12} />} variant={variant} size="sm" />
            <IconButton aria-label="Refresh" icon={<Icon value={IconName.Refresh} />} variant={variant} size="md" />
            <IconButton aria-label="Big refresh" icon={<Icon value={IconName.Refresh} size={20} />} variant={variant} size="lg" />
            <IconButton aria-label="Disabled" icon={<Icon value={IconName.Refresh} />} variant={variant} disabled />
            <IconButton aria-label="With custom class" icon={<Icon value={IconName.Sparkle} />} variant={variant} className="opacity-80" />
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
    icon: <Icon value={IconName.Refresh} />,
    variant: 'ghost',
    size: 'md',
    disabled: false,
  },
  argTypes: {
    onClick: { action: 'click' },
    variant: {
      control: 'select',
      options: ['ghost', 'secondary', 'outline', 'primary', 'danger'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    'aria-label': { control: 'text' },
  },
};

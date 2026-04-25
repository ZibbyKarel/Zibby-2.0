import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Design System/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 };

/**
 * Every checkbox state, side-by-side.
 */
export const Overview: Story = {
  render: () => (
    <div style={stack}>
      <Checkbox label="Unchecked (default)" />
      <Checkbox label="Checked by default" defaultChecked />
      <Checkbox label="With helper" helperText="More context for the option" />
      <Checkbox label="Required" required />
      <Checkbox label="Invalid" invalid helperText="Please tick this box" />
      <Checkbox label="Disabled (off)" disabled />
      <Checkbox label="Disabled (on)" disabled defaultChecked />
      <Checkbox size="sm" label="Small" defaultChecked />
      <Checkbox size="md" label="Medium" defaultChecked />
      <Checkbox size="lg" label="Large" defaultChecked />
      <Checkbox label="Custom className" className="ring-2 ring-[var(--violet)]/30" />
      <Checkbox aria-label="No label" />
    </div>
  ),
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    label: 'Subscribe to newsletter',
    helperText: '',
    size: 'md',
    invalid: false,
    disabled: false,
    required: false,
    defaultChecked: false,
    className: '',
  },
  argTypes: {
    label: { control: 'text' },
    helperText: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    defaultChecked: { control: 'boolean' },
    className: { control: 'text' },
    onChange: { action: 'change' },
  },
};

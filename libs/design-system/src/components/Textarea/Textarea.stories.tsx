import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './Textarea';

const meta = {
  title: 'Design System/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: 'min(420px, 80vw)',
};

/**
 * Every visual state for `Textarea`, side-by-side. Acts as the visual baseline.
 */
export const Overview: Story = {
  render: () => (
    <div style={stack}>
      <Textarea label="Empty" />
      <Textarea label="Placeholder" placeholder="Write something…" />
      <Textarea label="Filled" defaultValue={'Line one\nLine two\nLine three'} />
      <Textarea label="With helper" helperText="Markdown is supported" />
      <Textarea label="Required" required placeholder="Required field" />
      <Textarea label="Invalid" invalid defaultValue="oops" helperText="Try again" />
      <Textarea label="Disabled" disabled defaultValue="Locked" />
      <Textarea label="Read-only" readOnly defaultValue="Read-only value" />
      <Textarea label="No resize" resize="none" />
      <Textarea label="Both directions" resize="both" />
      <Textarea label="Tall" rows={8} placeholder="Plenty of room" />
      <Textarea label="Custom className" className="font-mono" placeholder="Monospace" />
    </div>
  ),
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    label: 'Field label',
    placeholder: 'Type something…',
    helperText: '',
    defaultValue: '',
    rows: 4,
    invalid: false,
    disabled: false,
    readOnly: false,
    required: false,
    fullWidth: true,
    resize: 'vertical',
    className: '',
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    helperText: { control: 'text' },
    defaultValue: { control: 'text' },
    rows: { control: 'number' },
    resize: { control: 'select', options: ['none', 'vertical', 'horizontal', 'both'] },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    className: { control: 'text' },
    onChange: { action: 'change' },
    onFocus: { action: 'focus' },
    onBlur: { action: 'blur' },
  },
  render: (args) => (
    <div style={{ width: 'min(420px, 80vw)' }}>
      <Textarea {...args} />
    </div>
  ),
};

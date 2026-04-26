import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './TextField';

const meta = {
  title: 'Design System/TextField',
  component: TextField,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: 'min(420px, 80vw)',
};

const search = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="6" cy="6" r="4" />
    <path d="M9 9l3 3" />
  </svg>
);

/**
 * Every visual state for `TextField`, side-by-side. Acts as the visual baseline.
 */
export const Overview: Story = {
  render: () => (
    <div style={stack}>
      <TextField label="Empty" />
      <TextField label="Placeholder" placeholder="Search stories…" />
      <TextField label="Filled" defaultValue="Hello, design system" />
      <TextField label="With helper" helperText="A short hint goes here" />
      <TextField label="Required" required placeholder="Required field" />
      <TextField label="Invalid" invalid defaultValue="bad@" helperText="Invalid email" />
      <TextField label="Disabled" disabled defaultValue="Locked" />
      <TextField label="Read-only" readOnly defaultValue="Read-only value" />
      <TextField label="Password" type="password" defaultValue="hunter2" />
      <TextField label="Email" type="email" placeholder="you@example.com" />
      <TextField label="Number" type="number" defaultValue={42} />
      <TextField label="Start adornment" startAdornment={search} placeholder="Search" />
      <TextField label="End adornment" endAdornment={<span>%</span>} defaultValue="50" />
      <TextField label="Both adornments" startAdornment={<span>$</span>} endAdornment={<span>USD</span>} defaultValue="100" />
      <TextField label="Small" size="sm" placeholder="Small" />
      <TextField label="Medium" size="md" placeholder="Medium" />
      <TextField label="Large" size="lg" placeholder="Large" />
      <TextField label="Custom className" className="font-mono" placeholder="Monospace" />
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
    type: 'text',
    size: 'md',
    invalid: false,
    disabled: false,
    readOnly: false,
    required: false,
    fullWidth: true,
    className: '',
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    helperText: { control: 'text' },
    defaultValue: { control: 'text' },
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
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
      <TextField {...args} />
    </div>
  ),
};

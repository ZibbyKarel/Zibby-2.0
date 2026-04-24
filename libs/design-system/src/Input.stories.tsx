import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta = {
  title: 'Design System/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(160px, max-content) 1fr',
  alignItems: 'center',
  gap: '0.75rem',
  width: 'min(520px, 80vw)',
};

const label: React.CSSProperties = {
  color: 'var(--text-2)',
  fontSize: '0.8125rem',
};

/**
 * Every visual state the `Input` primitive supports, side by side. This is the
 * canonical reference for reviewers: if a visual regression is introduced, it
 * surfaces here first.
 */
export const Overview: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={row}>
        <span style={label}>Empty</span>
        <Input />
      </div>
      <div style={row}>
        <span style={label}>Placeholder</span>
        <Input placeholder="Search stories…" />
      </div>
      <div style={row}>
        <span style={label}>Filled</span>
        <Input defaultValue="Hello, design system" />
      </div>
      <div style={row}>
        <span style={label}>Disabled</span>
        <Input disabled defaultValue="Locked" />
      </div>
      <div style={row}>
        <span style={label}>Read-only</span>
        <Input readOnly defaultValue="Read-only value" />
      </div>
      <div style={row}>
        <span style={label}>Invalid</span>
        <Input aria-invalid defaultValue="bad@" />
      </div>
      <div style={row}>
        <span style={label}>Required</span>
        <Input required placeholder="Required field" />
      </div>
      <div style={row}>
        <span style={label}>Password</span>
        <Input type="password" defaultValue="hunter2" />
      </div>
      <div style={row}>
        <span style={label}>Email</span>
        <Input type="email" placeholder="you@example.com" />
      </div>
      <div style={row}>
        <span style={label}>Number</span>
        <Input type="number" defaultValue={42} />
      </div>
      <div style={row}>
        <span style={label}>Custom className</span>
        <Input className="max-w-[12rem]" placeholder="Narrow" />
      </div>
    </div>
  ),
};

/**
 * Drives every configurable prop from the Storybook controls panel so you can
 * exercise the component end-to-end without editing code.
 */
export const Playground: Story = {
  args: {
    type: 'text',
    placeholder: 'Type something…',
    defaultValue: '',
    disabled: false,
    readOnly: false,
    required: false,
    autoFocus: false,
    className: '',
    name: 'playground',
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
      description: 'Native HTML input type',
    },
    placeholder: { control: 'text' },
    defaultValue: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    autoFocus: { control: 'boolean' },
    className: { control: 'text', description: 'Extra Tailwind classes merged after the base styles' },
    name: { control: 'text' },
    maxLength: { control: 'number' },
    minLength: { control: 'number' },
    onChange: { action: 'change' },
    onFocus: { action: 'focus' },
    onBlur: { action: 'blur' },
  },
};

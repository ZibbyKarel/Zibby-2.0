import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select, type SelectOption } from './Select';

const meta = {
  title: 'Design System/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: 'min(420px, 80vw)',
};

const fruit: readonly SelectOption[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
  { value: 'd', label: 'Durian (out of stock)', disabled: true },
];

/**
 * Every visual state for `Select` rendered side-by-side.
 */
export const Overview: Story = {
  args: { options: fruit },
  render: () => (
    <div style={stack}>
      <Select label="Default" options={fruit} defaultValue="a" />
      <Select label="With placeholder" options={fruit} placeholder="Pick a fruit" defaultValue="" />
      <Select label="With helper" options={fruit} helperText="Pick whichever you like" />
      <Select label="Required" options={fruit} required />
      <Select label="Invalid" options={fruit} invalid helperText="Pick one" />
      <Select label="Disabled" options={fruit} disabled defaultValue="a" />
      <Select label="Small" options={fruit} size="sm" />
      <Select label="Medium" options={fruit} size="md" />
      <Select label="Large" options={fruit} size="lg" />
      <Select label="Custom className" options={fruit} className="font-mono" />
    </div>
  ),
};

/**
 * Drives every prop from the controls panel.
 */
export const Playground: Story = {
  args: {
    label: 'Fruit',
    options: fruit,
    placeholder: '',
    helperText: '',
    size: 'md',
    invalid: false,
    disabled: false,
    required: false,
    fullWidth: true,
    className: '',
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    helperText: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    className: { control: 'text' },
    onChange: { action: 'change' },
    onFocus: { action: 'focus' },
    onBlur: { action: 'blur' },
  },
  render: (args) => (
    <div style={{ width: 'min(420px, 80vw)' }}>
      <Select {...args} />
    </div>
  ),
};

import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from './Form';
import { FormInput } from './FormInput';

type Demo = { empty: string; filled: string; helper: string; invalid: string; disabled: string };
type One = { value: string };

const meta = {
  title: 'Form/FormInput',
  component: FormInput,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof FormInput>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: 'min(420px, 80vw)',
};

/**
 * Visual states side-by-side, all wrapped in a single `<Form>`.
 */
export const Overview: Story = {
  args: { name: 'overview' },
  render: () => (
    <Form<Demo>
      onSubmit={() => {}}
      defaultValues={{
        empty: '',
        filled: 'Hello',
        helper: '',
        invalid: 'bad@',
        disabled: 'Locked',
      }}
      style={stack}
    >
      <FormInput<Demo> name="empty" label="Empty" placeholder="Type something…" />
      <FormInput<Demo> name="filled" label="Filled" />
      <FormInput<Demo> name="helper" label="With helper" helperText="A short hint" />
      <FormInput<Demo> name="invalid" label="Invalid" invalid helperText="Invalid email" />
      <FormInput<Demo> name="disabled" label="Disabled" disabled />
    </Form>
  ),
};

/**
 * Drives `label`, `placeholder`, `helperText`, `defaultValue`, `size`,
 * `invalid`, and `required` from the controls panel. Wrapped in a `<Form>`.
 */
export const Playground: Story = {
  args: {
    name: 'value',
    label: 'Field label',
    placeholder: 'Type something…',
    helperText: '',
    defaultValue: '',
    size: 'md',
    invalid: false,
    disabled: false,
    readOnly: false,
    required: false,
    fullWidth: true,
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    helperText: { control: 'text' },
    defaultValue: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
  render: (args) => (
    <Form<One> onSubmit={() => {}} defaultValues={{ value: '' }} style={stack}>
      <FormInput {...args} name="value" />
    </Form>
  ),
};

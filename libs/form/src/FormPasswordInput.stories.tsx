import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from './Form';
import { FormPasswordInput } from './FormPasswordInput';

const meta = {
  title: 'Form/FormPasswordInput',
  component: FormPasswordInput,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof FormPasswordInput>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: 'min(420px, 80vw)',
};

type Demo = { empty: string; filled: string; invalid: string; disabled: string };

export const Overview: Story = {
  args: { name: 'overview' },
  render: () => (
    <Form<Demo>
      onSubmit={() => {}}
      defaultValues={{ empty: '', filled: 'hunter2', invalid: 'x', disabled: 'locked' }}
      style={stack}
    >
      <FormPasswordInput<Demo> name="empty" label="Empty" />
      <FormPasswordInput<Demo> name="filled" label="Filled" />
      <FormPasswordInput<Demo> name="invalid" label="Invalid" invalid helperText="Too short" />
      <FormPasswordInput<Demo> name="disabled" label="Disabled" disabled />
    </Form>
  ),
};

type One = { password: string };

export const Playground: Story = {
  args: {
    name: 'password',
    label: 'Password',
    placeholder: '',
    helperText: '',
    defaultValue: '',
    size: 'md',
    invalid: false,
    disabled: false,
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
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
  render: (args) => (
    <Form<One> onSubmit={() => {}} defaultValues={{ password: '' }} style={stack}>
      <FormPasswordInput {...args} name="password" />
    </Form>
  ),
};

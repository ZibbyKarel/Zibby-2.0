import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from '../Form';
import { FormCheckbox } from './FormCheckbox';

const meta = {
  title: 'Form/FormCheckbox',
  component: FormCheckbox,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof FormCheckbox>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: 'min(420px, 80vw)',
};

type Demo = {
  empty: boolean;
  checked: boolean;
  helper: boolean;
  invalid: boolean;
  disabled: boolean;
};

export const Overview: Story = {
  args: { name: 'overview' },
  render: () => (
    <Form<Demo>
      onSubmit={() => {}}
      defaultValues={{
        empty: false,
        checked: true,
        helper: false,
        invalid: false,
        disabled: true,
      }}
      style={stack}
    >
      <FormCheckbox<Demo> name="empty" label="Unchecked" />
      <FormCheckbox<Demo> name="checked" label="Checked by default" />
      <FormCheckbox<Demo> name="helper" label="With helper" helperText="Optional hint" />
      <FormCheckbox<Demo> name="invalid" label="Invalid" invalid helperText="Must agree" />
      <FormCheckbox<Demo> name="disabled" label="Disabled" disabled />
    </Form>
  ),
};

type One = { agreed: boolean };

export const Playground: Story = {
  args: {
    name: 'agreed',
    label: 'I agree',
    helperText: '',
    defaultValue: false,
    size: 'md',
    invalid: false,
    disabled: false,
  },
  argTypes: {
    label: { control: 'text' },
    helperText: { control: 'text' },
    defaultValue: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  render: (args) => (
    <Form<One> onSubmit={() => {}} defaultValues={{ agreed: false }} style={stack}>
      <FormCheckbox {...args} name="agreed" />
    </Form>
  ),
};

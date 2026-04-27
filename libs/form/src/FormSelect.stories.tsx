import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from './Form';
import { FormSelect } from './FormSelect';

const meta = {
  title: 'Form/FormSelect',
  component: FormSelect,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof FormSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: 'min(420px, 80vw)',
};

const colorOptions = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];

type Demo = {
  empty: string;
  preselected: string;
  helper: string;
  invalid: string;
  disabled: string;
};

export const Overview: Story = {
  args: { name: 'overview', options: colorOptions },
  render: () => (
    <Form<Demo>
      onSubmit={() => {}}
      defaultValues={{
        empty: '',
        preselected: 'green',
        helper: '',
        invalid: '',
        disabled: 'blue',
      }}
      style={stack}
    >
      <FormSelect<string, Demo>
        name="empty"
        label="Empty (with placeholder)"
        placeholder="Pick a color"
        options={colorOptions}
      />
      <FormSelect<string, Demo>
        name="preselected"
        label="Preselected"
        options={colorOptions}
      />
      <FormSelect<string, Demo>
        name="helper"
        label="With helper"
        options={colorOptions}
        helperText="Hex codes available later"
      />
      <FormSelect<string, Demo>
        name="invalid"
        label="Invalid"
        options={colorOptions}
        invalid
        helperText="Pick a color"
      />
      <FormSelect<string, Demo>
        name="disabled"
        label="Disabled"
        options={colorOptions}
        disabled
      />
    </Form>
  ),
};

type One = { color: string };

export const Playground: Story = {
  args: {
    name: 'color',
    options: colorOptions,
    label: 'Color',
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
    defaultValue: { control: 'select', options: ['', 'red', 'green', 'blue'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
  render: (args) => (
    <Form<One> onSubmit={() => {}} defaultValues={{ color: '' }} style={stack}>
      <FormSelect {...args} name="color" options={colorOptions} />
    </Form>
  ),
};

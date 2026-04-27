import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from './Form';
import { FormTextarea } from './FormTextarea';

const meta = {
  title: 'Form/FormTextarea',
  component: FormTextarea,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof FormTextarea>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: 'min(420px, 80vw)',
};

type Demo = { empty: string; filled: string; helper: string; invalid: string; disabled: string };

export const Overview: Story = {
  args: { name: 'overview' },
  render: () => (
    <Form<Demo>
      onSubmit={() => {}}
      defaultValues={{
        empty: '',
        filled: 'Hello',
        helper: '',
        invalid: 'too short',
        disabled: 'Locked',
      }}
      style={stack}
    >
      <FormTextarea<Demo> name="empty" label="Empty" placeholder="Notes…" />
      <FormTextarea<Demo> name="filled" label="Filled" />
      <FormTextarea<Demo> name="helper" label="With helper" helperText="Tip: be concise" />
      <FormTextarea<Demo> name="invalid" label="Invalid" invalid helperText="Min 50 chars" />
      <FormTextarea<Demo> name="disabled" label="Disabled" disabled />
    </Form>
  ),
};

type One = { notes: string };

export const Playground: Story = {
  args: {
    name: 'notes',
    label: 'Notes',
    placeholder: '',
    helperText: '',
    defaultValue: '',
    rows: 4,
    invalid: false,
    disabled: false,
    readOnly: false,
    required: false,
    fullWidth: true,
    resize: 'vertical',
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    helperText: { control: 'text' },
    defaultValue: { control: 'text' },
    rows: { control: 'number' },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    resize: { control: 'select', options: ['none', 'vertical', 'horizontal', 'both'] },
  },
  render: (args) => (
    <Form<One> onSubmit={() => {}} defaultValues={{ notes: '' }} style={stack}>
      <FormTextarea {...args} name="notes" />
    </Form>
  ),
};

import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from '../Form';
import { FormSearchField } from './FormSearchField';

const meta = {
  title: 'Form/FormSearchField',
  component: FormSearchField,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof FormSearchField>;

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

type Demo = { empty: string; filled: string; invalid: string; disabled: string };

export const Overview: Story = {
  args: { name: 'overview' },
  render: () => (
    <Form<Demo>
      onSubmit={() => {}}
      defaultValues={{ empty: '', filled: 'kanban', invalid: 'bad', disabled: 'locked' }}
      style={stack}
    >
      <FormSearchField<Demo> name="empty" placeholder="Search…" startAdornment={search} />
      <FormSearchField<Demo> name="filled" placeholder="Search…" startAdornment={search} />
      <FormSearchField<Demo> name="invalid" placeholder="Search…" startAdornment={search} invalid />
      <FormSearchField<Demo> name="disabled" placeholder="Search…" startAdornment={search} disabled />
    </Form>
  ),
};

type One = { q: string };

export const Playground: Story = {
  args: {
    name: 'q',
    placeholder: 'Search…',
    defaultValue: '',
    invalid: false,
    disabled: false,
    minWidth: 220,
  },
  argTypes: {
    placeholder: { control: 'text' },
    defaultValue: { control: 'text' },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    minWidth: { control: 'number' },
  },
  render: (args) => (
    <Form<One> onSubmit={() => {}} defaultValues={{ q: '' }} style={stack}>
      <FormSearchField {...args} name="q" startAdornment={search} />
    </Form>
  ),
};

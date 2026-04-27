import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SubmitHandler, UseFormProps } from 'react-hook-form';
import { z } from 'zod';
import { Form } from './Form';
import { FormInput } from './FormInput';
import { FormPasswordInput } from './FormPasswordInput';
import { zodResolver } from '@hookform/resolvers/zod';

const loginSchema = z.object({
  login: z.string().min(1, 'Login is required'),
  password: z.string().min(4, 'At least 4 chars'),
});
type Login = z.infer<typeof loginSchema>;

// `Form` is generic, which fights with Storybook's argument inference. We
// expose a non-generic façade purely for the Storybook meta — runtime is
// still the real `Form`, just retyped so `args` becomes ergonomic.
type StoryArgs = {
  onSubmit?: SubmitHandler<Login>;
  defaultValues?: Login;
  mode?: UseFormProps<Login>['mode'];
  children?: ReactNode;
};
const FormForStories = Form as unknown as ComponentType<StoryArgs>;

const meta = {
  title: 'Form/Form',
  component: FormForStories,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof FormForStories>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: 'min(420px, 80vw)',
};

/**
 * The canonical use-case: a tiny login form. Children consume the form
 * context, no `control` prop required.
 */
export const Overview: Story = {
  render: () => {
    const [submitted, setSubmitted] = useState<Login | null>(null);
    return (
      <div style={stack}>
        <Form<Login>
          resolver={zodResolver(loginSchema)}
          defaultValues={{ login: '', password: '' }}
          onSubmit={(values) => setSubmitted(values)}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <FormInput<Login> name="login" label="Login" placeholder="alice" />
          <FormPasswordInput<Login> name="password" label="Password" />
          <button type="submit" style={{ marginTop: 4 }}>
            Sign in
          </button>
        </Form>
        {submitted && (
          <pre style={{ fontSize: 12 }}>
            {JSON.stringify(submitted, null, 2)}
          </pre>
        )}
      </div>
    );
  },
};

/**
 * Drives `mode` and `defaultValues` from the controls panel. Submit values
 * are logged via the action addon.
 */
export const Playground: Story = {
  args: {
    mode: 'onSubmit',
    defaultValues: { login: '', password: '' },
  },
  argTypes: {
    mode: {
      control: 'select',
      options: ['onSubmit', 'onChange', 'onBlur', 'onTouched', 'all'],
    },
    onSubmit: { action: 'submit' },
  },
  render: (args) => (
    <div style={stack}>
      <Form<Login>
        onSubmit={args.onSubmit ?? (() => {})}
        resolver={zodResolver(loginSchema)}
        defaultValues={args.defaultValues ?? { login: '', password: '' }}
        mode={args.mode}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <FormInput<Login> name="login" label="Login" />
        <FormPasswordInput<Login> name="password" label="Password" />
        <button type="submit">Submit</button>
      </Form>
    </div>
  ),
};

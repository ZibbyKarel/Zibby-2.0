// @vitest-environment jsdom
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Form } from './Form';
import { FormInput } from './FormInput';
import { zodResolver } from '@hookform/resolvers/zod';

const loginSchema = z.object({
  login: z.string().min(1, 'Required'),
  password: z.string(),
});
type Login = z.infer<typeof loginSchema>;

describe('Form', () => {
  it('submits typed values via handleSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <Form<Login> onSubmit={onSubmit} defaultValues={{ login: '', password: '' }}>
        <FormInput<Login> name="login" label="Login" data-testid="login" />
        <FormInput<Login> name="password" label="Password" data-testid="password" />
        <button type="submit">Go</button>
      </Form>,
    );

    await user.type(screen.getByTestId('login'), 'alice');
    await user.type(screen.getByTestId('password'), 'pw');
    await user.click(screen.getByRole('button', { name: 'Go' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ login: 'alice', password: 'pw' });
  });

  it('invokes onInvalid (and not onSubmit) when validation fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onInvalid = vi.fn();

    render(
      <Form<Login>
        onSubmit={onSubmit}
        onInvalid={onInvalid}
        resolver={zodResolver(loginSchema)}
        defaultValues={{ login: '', password: '' }}
      >
        <FormInput<Login> name="login" data-testid="login" />
        <button type="submit">Go</button>
      </Form>,
    );

    await user.click(screen.getByRole('button', { name: 'Go' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(1);
  });

  it('exposes form methods via formRef and accepts a children render-prop', async () => {
    const user = userEvent.setup();
    const methodsRef = createRef<UseFormReturn<Login>>();

    render(
      <Form<Login>
        onSubmit={() => {}}
        defaultValues={{ login: 'seed', password: '' }}
        formRef={methodsRef}
      >
        {(methods) => (
          <>
            <FormInput<Login> name="login" data-testid="login" />
            <button type="button" onClick={() => methods.reset({ login: '', password: '' })}>
              Reset
            </button>
          </>
        )}
      </Form>,
    );

    expect((screen.getByTestId('login') as HTMLInputElement).value).toBe('seed');
    expect(typeof methodsRef.current?.reset).toBe('function');

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect((screen.getByTestId('login') as HTMLInputElement).value).toBe('');
  });

  it('forwards extra form attributes (className, noValidate, ref)', () => {
    const ref = createRef<HTMLFormElement>();
    render(
      <Form<Login>
        onSubmit={() => {}}
        ref={ref}
        className="extra-class"
        noValidate
        data-testid="form"
      >
        <span />
      </Form>,
    );
    const form = screen.getByTestId('form');
    expect(ref.current).toBe(form);
    expect(form).toHaveClass('extra-class');
    expect(form).toHaveAttribute('novalidate');
  });
});

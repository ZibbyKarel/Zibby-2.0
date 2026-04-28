// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from './Form';
import { FormInput } from '../FormInput';

type Login = { login: string; password: string };

describe('Form', () => {
  it('submits typed values via the wrapped handleSubmit', async () => {
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

  it('seeds inputs from defaultValues', () => {
    render(
      <Form<Login>
        onSubmit={() => {}}
        defaultValues={{ login: 'seed', password: '' }}
      >
        <FormInput<Login> name="login" data-testid="login" />
      </Form>,
    );

    expect((screen.getByTestId('login') as HTMLInputElement).value).toBe('seed');
  });

  it('forwards extra form attributes onto the underlying <form>', () => {
    render(
      <Form<Login>
        onSubmit={() => {}}
        defaultValues={{ login: '', password: '' }}
        className="extra-class"
        noValidate
        data-testid="form"
      >
        <span />
      </Form>,
    );

    const form = screen.getByTestId('form');
    expect(form.tagName).toBe('FORM');
    expect(form).toHaveClass('extra-class');
    expect(form).toHaveAttribute('novalidate');
  });
});

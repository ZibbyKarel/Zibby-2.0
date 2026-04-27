// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { Form } from '../Form';
import { FormPasswordInput } from './FormPasswordInput';
import { zodResolver } from '@hookform/resolvers/zod';

const requiredPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});
type Values = z.infer<typeof requiredPasswordSchema>;

describe('FormPasswordInput', () => {
  it('renders an input of type=password', () => {
    render(
      <Form<Values> onSubmit={() => {}} defaultValues={{ password: '' }}>
        <FormPasswordInput<Values> name="password" data-testid="pw" />
      </Form>,
    );
    expect(screen.getByTestId('pw')).toHaveAttribute('type', 'password');
  });

  it('captures the password and submits it via the form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <Form<Values> onSubmit={onSubmit} defaultValues={{ password: '' }}>
        <FormPasswordInput<Values> name="password" data-testid="pw" />
        <button type="submit">Go</button>
      </Form>,
    );

    await user.type(screen.getByTestId('pw'), 'hunter2');
    await user.click(screen.getByRole('button', { name: 'Go' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hunter2' }),
      expect.anything(),
    );
  });

  it('surfaces validation errors as helperText', async () => {
    const user = userEvent.setup();
    render(
      <Form<Values>
        onSubmit={() => {}}
        resolver={zodResolver(requiredPasswordSchema)}
        defaultValues={{ password: '' }}
      >
        <FormPasswordInput<Values> name="password" data-testid="pw" />
        <button type="submit">Go</button>
      </Form>,
    );

    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByTestId('pw')).toHaveAttribute('aria-invalid', 'true');
  });
});

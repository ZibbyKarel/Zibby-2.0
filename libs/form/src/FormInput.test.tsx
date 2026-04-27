// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { Form } from './Form';
import { FormInput } from './FormInput';
import { zodResolver } from '@hookform/resolvers/zod';

const requiredLoginSchema = z.object({
  login: z.string().min(1, 'Required field'),
});
type Values = z.infer<typeof requiredLoginSchema>;

describe('FormInput', () => {
  it('reads value from context and reports it on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <Form<Values> onSubmit={onSubmit} defaultValues={{ login: '' }}>
        <FormInput<Values> name="login" data-testid="login" />
        <button type="submit">Go</button>
      </Form>,
    );

    await user.type(screen.getByTestId('login'), 'alice');
    await user.click(screen.getByRole('button', { name: 'Go' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ login: 'alice' }),
      expect.anything(),
    );
  });

  it('renders the schema-derived error message as helperText and sets aria-invalid', async () => {
    const user = userEvent.setup();
    render(
      <Form<Values>
        onSubmit={() => {}}
        resolver={zodResolver(requiredLoginSchema)}
        defaultValues={{ login: '' }}
      >
        <FormInput<Values> name="login" label="Login" data-testid="login" />
        <button type="submit">Go</button>
      </Form>,
    );

    await user.click(screen.getByRole('button', { name: 'Go' }));

    expect(screen.getByText('Required field')).toBeInTheDocument();
    expect(screen.getByTestId('login')).toHaveAttribute('aria-invalid', 'true');
  });

  it('falls back to consumer-provided helperText when there is no error', () => {
    render(
      <Form<Values> onSubmit={() => {}} defaultValues={{ login: '' }}>
        <FormInput<Values> name="login" label="Login" helperText="Hint" />
      </Form>,
    );
    expect(screen.getByText('Hint')).toBeInTheDocument();
  });

  it('honors a defaultValue prop on the field', () => {
    render(
      <Form<Values> onSubmit={() => {}}>
        <FormInput<Values> name="login" defaultValue="seed" data-testid="login" />
      </Form>,
    );
    expect((screen.getByTestId('login') as HTMLInputElement).value).toBe('seed');
  });

  it('forwards data-testid to the underlying input', () => {
    render(
      <Form<Values> onSubmit={() => {}} defaultValues={{ login: '' }}>
        <FormInput<Values> name="login" data-testid="my-id" />
      </Form>,
    );
    expect(screen.getByTestId('my-id')).toBeInstanceOf(HTMLInputElement);
  });
});

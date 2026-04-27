// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { Form } from './Form';
import { FormCheckbox } from './FormCheckbox';
import { zodResolver } from '@hookform/resolvers/zod';

const mustAgreeSchema = z.object({
  agreed: z.boolean().refine((v) => v === true, { message: 'Must agree' }),
});
type Values = z.infer<typeof mustAgreeSchema>;

describe('FormCheckbox', () => {
  it('writes a boolean back to the form value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <Form<Values> onSubmit={onSubmit} defaultValues={{ agreed: false }}>
        <FormCheckbox<Values> name="agreed" label="Agree" data-testid="cb" />
        <button type="submit">Go</button>
      </Form>,
    );

    expect((screen.getByTestId('cb') as HTMLInputElement).checked).toBe(false);
    await user.click(screen.getByTestId('cb'));
    expect((screen.getByTestId('cb') as HTMLInputElement).checked).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ agreed: true }),
      expect.anything(),
    );
  });

  it('respects defaultValue=true', () => {
    render(
      <Form<Values> onSubmit={() => {}}>
        <FormCheckbox<Values> name="agreed" defaultValue={true} data-testid="cb" />
      </Form>,
    );
    expect((screen.getByTestId('cb') as HTMLInputElement).checked).toBe(true);
  });

  it('renders error helperText when validation fails', async () => {
    const user = userEvent.setup();
    render(
      <Form<Values>
        onSubmit={() => {}}
        resolver={zodResolver(mustAgreeSchema)}
        defaultValues={{ agreed: false }}
      >
        <FormCheckbox<Values> name="agreed" data-testid="cb" />
        <button type="submit">Go</button>
      </Form>,
    );
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByText('Must agree')).toBeInTheDocument();
    expect(screen.getByTestId('cb')).toHaveAttribute('aria-invalid', 'true');
  });
});

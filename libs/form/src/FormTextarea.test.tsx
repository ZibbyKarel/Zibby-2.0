// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { Form } from './Form';
import { FormTextarea } from './FormTextarea';
import { zodResolver } from '@hookform/resolvers/zod';

const requiredNotesSchema = z.object({
  notes: z.string().min(1, 'Notes required'),
});
type Values = z.infer<typeof requiredNotesSchema>;

describe('FormTextarea', () => {
  it('writes user input back to the form value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <Form<Values> onSubmit={onSubmit} defaultValues={{ notes: '' }}>
        <FormTextarea<Values> name="notes" data-testid="notes" />
        <button type="submit">Go</button>
      </Form>,
    );

    await user.type(screen.getByTestId('notes'), 'multi\nline');
    await user.click(screen.getByRole('button', { name: 'Go' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'multi\nline' }),
      expect.anything(),
    );
  });

  it('renders the validation error as helperText and sets aria-invalid', async () => {
    const user = userEvent.setup();
    render(
      <Form<Values>
        onSubmit={() => {}}
        resolver={zodResolver(requiredNotesSchema)}
        defaultValues={{ notes: '' }}
      >
        <FormTextarea<Values> name="notes" data-testid="notes" />
        <button type="submit">Go</button>
      </Form>,
    );

    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByText('Notes required')).toBeInTheDocument();
    expect(screen.getByTestId('notes')).toHaveAttribute('aria-invalid', 'true');
  });

  it('seeds defaultValue', () => {
    render(
      <Form<Values> onSubmit={() => {}}>
        <FormTextarea<Values> name="notes" defaultValue="seed" data-testid="notes" />
      </Form>,
    );
    expect((screen.getByTestId('notes') as HTMLTextAreaElement).value).toBe('seed');
  });
});

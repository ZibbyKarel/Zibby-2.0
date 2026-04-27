// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from '../Form';
import { FormSearchField } from './FormSearchField';

type Values = { q: string };

describe('FormSearchField', () => {
  it('writes user input back to the form value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <Form<Values> onSubmit={onSubmit} defaultValues={{ q: '' }}>
        <FormSearchField<Values> name="q" data-testid="q" />
        <button type="submit">Go</button>
      </Form>,
    );

    await user.type(screen.getByTestId('q'), 'kanban');
    await user.click(screen.getByRole('button', { name: 'Go' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'kanban' }),
      expect.anything(),
    );
  });

  it('seeds defaultValue', () => {
    render(
      <Form<Values> onSubmit={() => {}}>
        <FormSearchField<Values> name="q" defaultValue="seed" data-testid="q" />
      </Form>,
    );
    expect((screen.getByTestId('q') as HTMLInputElement).value).toBe('seed');
  });

  it('forwards aria-invalid when invalid is true', () => {
    render(
      <Form<Values> onSubmit={() => {}} defaultValues={{ q: '' }}>
        <FormSearchField<Values> name="q" invalid data-testid="q" />
      </Form>,
    );
    expect(screen.getByTestId('q')).toHaveAttribute('aria-invalid', 'true');
  });
});

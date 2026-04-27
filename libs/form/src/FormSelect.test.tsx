// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { Form } from './Form';
import { FormSelect } from './FormSelect';
import { zodResolver } from '@hookform/resolvers/zod';

type Color = 'red' | 'green' | 'blue';
type Values = { color: Color };

const requiredColorSchema = z.object({
  color: z.string().min(1, 'Pick a color'),
});

const options = [
  { value: 'red' as const, label: 'Red' },
  { value: 'green' as const, label: 'Green' },
  { value: 'blue' as const, label: 'Blue' },
];

describe('FormSelect', () => {
  it('writes the selected option back to the form value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <Form<Values> onSubmit={onSubmit} defaultValues={{ color: 'red' }}>
        <FormSelect<Color, Values>
          name="color"
          options={options}
          label="Color"
          data-testid="color"
        />
        <button type="submit">Go</button>
      </Form>,
    );

    expect((screen.getByTestId('color') as HTMLSelectElement).value).toBe('red');

    await user.selectOptions(screen.getByTestId('color'), 'blue');
    await user.click(screen.getByRole('button', { name: 'Go' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'blue' }),
      expect.anything(),
    );
  });

  it('renders error helperText when validation fails', async () => {
    const user = userEvent.setup();
    render(
      <Form<z.infer<typeof requiredColorSchema>>
        onSubmit={() => {}}
        resolver={zodResolver(requiredColorSchema)}
        defaultValues={{ color: '' }}
      >
        <FormSelect
          name="color"
          options={options}
          placeholder="Pick one"
          data-testid="color"
        />
        <button type="submit">Go</button>
      </Form>,
    );
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByText('Pick a color')).toBeInTheDocument();
    expect(screen.getByTestId('color')).toHaveAttribute('aria-invalid', 'true');
  });
});

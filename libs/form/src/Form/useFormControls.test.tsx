// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormControls } from './useFormControls';
import { FormInput } from '../FormInput';

type Login = { login: string; password: string };

describe('useFormControls', () => {
  it('returns a stable shape exposing renderForm + submit', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormControls<Login>({
        defaultValues: { login: '', password: '' },
        onSubmit,
      }),
    );

    expect(typeof result.current.renderForm).toBe('function');
    expect(typeof result.current.submit).toBe('function');
  });

  it('renderForm wraps children in a FormProvider so field hooks resolve', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    function Harness() {
      const { renderForm, submit } = useFormControls<Login>({
        defaultValues: { login: '', password: '' },
        onSubmit,
      });
      return renderForm(
        <form onSubmit={submit}>
          <FormInput<Login> name="login" data-testid="login" />
          <button type="submit">Go</button>
        </form>,
      );
    }

    render(<Harness />);

    await user.type(screen.getByTestId('login'), 'alice');
    await user.click(screen.getByRole('button', { name: 'Go' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ login: 'alice', password: '' });
  });
});

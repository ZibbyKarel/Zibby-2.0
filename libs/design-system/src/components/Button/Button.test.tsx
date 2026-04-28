// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, ButtonDataTestIds } from './Button';
import { IconName } from '../Icon';
import { defaultDarkTokens } from '../../tokens';

function rgb(hex: string): string {
  const span = document.createElement('span');
  span.style.color = hex;
  return span.style.color;
}

describe('Button', () => {
  it('renders the label inside a native button', () => {
    render(<Button label="Save" />);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeInstanceOf(HTMLButtonElement);
  });

  it('forwards the ref to the underlying button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button label="Hi" ref={ref} />);
    expect(ref.current).toBe(screen.getByRole('button'));
  });

  it('places startIcon', () => {
    render(<Button label="Send" startIcon={IconName.AlertCircle} />);
    expect(screen.getByTestId(ButtonDataTestIds.StartIcon)).toBeInTheDocument();
  });

  it('places endIcon', () => {
    render(<Button label="Send" endIcon={IconName.AlertCircle} />);
    expect(screen.getByTestId(ButtonDataTestIds.EndIcon)).toBeInTheDocument();
  });

  it.each(['primary', 'secondary', 'ghost', 'outline', 'danger'] as const)(
    'applies %s variant styling',
    (variant) => {
      render(<Button label={variant} variant={variant} />);
      const btn = screen.getByRole('button', { name: variant });
      expect(btn.className).toMatch(/(bg-\[|bg-transparent)/);
    },
  );

  it.each([
    ['sm', 'h-7'],
    ['md', 'h-8'],
    ['lg', 'h-10'],
  ] as const)('applies %s size class %s', (size, expected) => {
    render(<Button label={size} size={size} />);
    expect(screen.getByRole('button').className).toContain(expected);
  });

  it('merges a consumer className with the base styles', () => {
    render(<Button label="x" className="extra-class" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('extra-class');
    expect(btn.className).toContain('rounded-[var(--radius-sm)]');
  });

  it('respects the disabled prop', () => {
    render(<Button label="Off" disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('fires onClick when the user clicks', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button label="Go" onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  describe('surface variant', () => {
    it('renders children verbatim and drops fixed-size classes', () => {
      render(
        <Button variant="surface" data-testid="b">
          <span>row content</span>
        </Button>,
      );
      const btn = screen.getByTestId('b');
      expect(btn).toBeInstanceOf(HTMLButtonElement);
      expect(btn.className).toContain('ds-button-surface');
      expect(btn.className).not.toContain('h-7');
      expect(btn.className).not.toContain('h-8');
      expect(btn.className).not.toContain('h-10');
      expect(btn.querySelector('span')!.textContent).toBe('row content');
    });

    it('label still works without children in surface mode', () => {
      render(<Button variant="surface" label="Just text" />);
      expect(screen.getByText('Just text')).toBeInTheDocument();
    });

    it('applies visual treatment via inline styles', () => {
      render(
        <Button
          variant="surface"
          background="bg2"
          bordered={{ bottom: true }}
          borderTone="default"
          radius="sm"
          data-testid="b"
        >
          x
        </Button>,
      );
      const btn = screen.getByTestId('b');
      expect(btn.style.background).toBe(rgb(defaultDarkTokens.color.bg[2]));
      expect(btn.style.borderBottomWidth).toBe('1px');
      expect(btn.style.borderTopWidth).toBe('');
      expect(btn.style.borderRadius).toBe(defaultDarkTokens.size.radiusSm);
    });

    it('accepts Container layout/sizing/padding props', () => {
      render(
        <Button
          variant="surface"
          padding={['100', '100']}
          minWidth={120}
          textAlign="left"
          data-testid="b"
        >
          x
        </Button>,
      );
      const btn = screen.getByTestId('b');
      expect(btn.style.paddingLeft).toBe('8px');
      expect(btn.style.paddingTop).toBe('8px');
      expect(btn.style.minWidth).toBe('120px');
      expect(btn.style.textAlign).toBe('left');
    });

    it('does NOT leak Container/visual props as DOM attributes', () => {
      render(
        <Button
          variant="surface"
          padding={['100', '100']}
          minWidth={120}
          background="bg2"
          bordered
          radius="sm"
          data-testid="b"
        >
          x
        </Button>,
      );
      const btn = screen.getByTestId('b');
      for (const attr of ['padding', 'minwidth', 'background', 'bordered', 'radius']) {
        expect(btn.hasAttribute(attr)).toBe(false);
      }
    });
  });
});

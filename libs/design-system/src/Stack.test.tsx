// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Stack } from './Stack';

describe('Stack', () => {
  it('renders its children inside a flex container', () => {
    render(
      <Stack data-testid="s">
        <span>a</span>
        <span>b</span>
      </Stack>,
    );
    const node = screen.getByTestId('s');
    expect(node.style.display).toBe('flex');
    expect(node).toHaveTextContent('ab');
  });

  it('forwards the ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Stack ref={ref} data-testid="s">x</Stack>);
    expect(ref.current).toBe(screen.getByTestId('s'));
  });

  it.each(['row', 'column', 'row-reverse', 'column-reverse'] as const)(
    'sets flex direction %s',
    (dir) => {
      render(<Stack direction={dir} data-testid="s">x</Stack>);
      expect((screen.getByTestId('s') as HTMLElement).style.flexDirection).toBe(dir);
    },
  );

  it.each([
    ['start', 'flex-start'],
    ['center', 'center'],
    ['end', 'flex-end'],
    ['stretch', 'stretch'],
    ['baseline', 'baseline'],
  ] as const)('maps align=%s to %s', (align, css) => {
    render(<Stack align={align} data-testid="s">x</Stack>);
    expect((screen.getByTestId('s') as HTMLElement).style.alignItems).toBe(css);
  });

  it.each([
    ['start', 'flex-start'],
    ['center', 'center'],
    ['end', 'flex-end'],
    ['between', 'space-between'],
    ['around', 'space-around'],
    ['evenly', 'space-evenly'],
  ] as const)('maps justify=%s to %s', (justify, css) => {
    render(<Stack justify={justify} data-testid="s">x</Stack>);
    expect((screen.getByTestId('s') as HTMLElement).style.justifyContent).toBe(css);
  });

  it('applies numeric gap as px', () => {
    render(<Stack gap={12} data-testid="s">x</Stack>);
    expect((screen.getByTestId('s') as HTMLElement).style.gap).toBe('12px');
  });

  it('applies string gap verbatim', () => {
    render(<Stack gap="1.5rem" data-testid="s">x</Stack>);
    expect((screen.getByTestId('s') as HTMLElement).style.gap).toBe('1.5rem');
  });

  it('toggles wrap', () => {
    render(<Stack wrap data-testid="s">x</Stack>);
    expect((screen.getByTestId('s') as HTMLElement).style.flexWrap).toBe('wrap');
  });

  it('uses inline-flex when inline', () => {
    render(<Stack inline data-testid="s">x</Stack>);
    expect((screen.getByTestId('s') as HTMLElement).style.display).toBe('inline-flex');
  });

  it('renders the requested element via the `as` prop', () => {
    render(<Stack as="ul" data-testid="s"><li>x</li></Stack>);
    expect(screen.getByTestId('s').tagName).toBe('UL');
  });

  it('merges a consumer className', () => {
    render(<Stack data-testid="s" className="extra-class">x</Stack>);
    expect(screen.getByTestId('s').className).toContain('extra-class');
  });
});

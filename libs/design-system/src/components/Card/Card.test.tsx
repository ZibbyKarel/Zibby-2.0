// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, CardHeader, CardContent, CardActions } from './Card';
import { defaultDarkTokens } from '../../tokens';

// JSDOM normalises hex inline-style values to the equivalent `rgb(…)` form,
// so we compare via a small helper.
function rgb(hex: string): string {
  const span = document.createElement('span');
  span.style.color = hex;
  return span.style.color;
}

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>hello</Card>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('forwards the ref', () => {
    const ref = createRef<HTMLElement>();
    render(<Card ref={ref} data-testid="c">x</Card>);
    expect(ref.current).toBe(screen.getByTestId('c'));
  });

  it('always carries the ds-container and ds-card classes', () => {
    render(<Card data-testid="c">x</Card>);
    const cls = screen.getByTestId('c').className;
    expect(cls).toContain('ds-container');
    expect(cls).toContain('ds-card');
  });

  it('outlined variant applies bg1 + default border', () => {
    render(<Card variant="outlined" data-testid="c">x</Card>);
    const el = screen.getByTestId('c');
    expect(el.style.background).toBe(rgb(defaultDarkTokens.color.bg[1]));
    expect(el.style.borderTopWidth).toBe('1px');
    expect(el.style.borderColor).toBe(rgb(defaultDarkTokens.color.border.default));
    expect(el.style.boxShadow).toBe('');
  });

  it('elevated variant applies the shadow-2 token', () => {
    render(<Card variant="elevated" data-testid="c">x</Card>);
    const el = screen.getByTestId('c');
    expect(el.style.boxShadow).toBe(defaultDarkTokens.size.shadow2);
    expect(el.style.borderTopWidth).toBe('1px');
  });

  it('filled variant applies bg2 with no border', () => {
    render(<Card variant="filled" data-testid="c">x</Card>);
    const el = screen.getByTestId('c');
    expect(el.style.background).toBe(rgb(defaultDarkTokens.color.bg[2]));
    expect(el.style.borderTopWidth).toBe('');
    expect(el.style.borderBottomWidth).toBe('');
  });

  it('explicit `background` overrides the variant default', () => {
    render(<Card variant="outlined" background="bg3" data-testid="c">x</Card>);
    expect(screen.getByTestId('c').style.background).toBe(rgb(defaultDarkTokens.color.bg[3]));
  });

  it('explicit `bordered={false}` drops the variant border', () => {
    render(<Card variant="outlined" bordered={false} data-testid="c">x</Card>);
    const el = screen.getByTestId('c');
    expect(el.style.borderTopWidth).toBe('');
    expect(el.style.borderColor).toBe('');
  });

  it('per-edge bordered only sets the requested sides', () => {
    render(<Card bordered={{ bottom: true }} data-testid="c">x</Card>);
    const el = screen.getByTestId('c');
    expect(el.style.borderTopWidth).toBe('');
    expect(el.style.borderBottomWidth).toBe('1px');
    expect(el.style.borderLeftWidth).toBe('');
    expect(el.style.borderRightWidth).toBe('');
  });

  it('borderTone selects an accent color', () => {
    render(<Card bordered borderTone="rose" data-testid="c">x</Card>);
    expect(screen.getByTestId('c').style.borderColor).toBe(rgb(defaultDarkTokens.color.accent.rose));
  });

  it('borderStyle="dashed" applies when an edge is set', () => {
    render(<Card bordered borderStyle="dashed" data-testid="c">x</Card>);
    expect(screen.getByTestId('c').style.borderStyle).toBe('dashed');
  });

  it('explicit shadow="2" applies the shadow even on outlined', () => {
    render(<Card variant="outlined" shadow="2" data-testid="c">x</Card>);
    expect(screen.getByTestId('c').style.boxShadow).toBe(defaultDarkTokens.size.shadow2);
  });

  it.each([
    ['none', '0px'],
    ['sm',   '12px'],
    ['md',   '16px'],
    ['lg',   '24px'],
  ] as const)('padding=%s sets every edge to %s', (pad, expected) => {
    render(<Card padding={pad} data-testid="c">x</Card>);
    const el = screen.getByTestId('c');
    expect(el.style.paddingTop).toBe(expected);
    expect(el.style.paddingRight).toBe(expected);
    expect(el.style.paddingBottom).toBe(expected);
    expect(el.style.paddingLeft).toBe(expected);
  });

  it('padding tuple [v, h] passes through to Container', () => {
    render(<Card padding={['75', '250']} data-testid="c">x</Card>);
    const el = screen.getByTestId('c');
    expect(el.style.paddingTop).toBe('6px');
    expect(el.style.paddingBottom).toBe('6px');
    expect(el.style.paddingLeft).toBe('20px');
    expect(el.style.paddingRight).toBe('20px');
  });

  it('padding tuple [t, r, b, l] passes through to Container', () => {
    render(<Card padding={['25', '50', '75', '100']} data-testid="c">x</Card>);
    const el = screen.getByTestId('c');
    expect(el.style.paddingTop).toBe('2px');
    expect(el.style.paddingRight).toBe('4px');
    expect(el.style.paddingBottom).toBe('6px');
    expect(el.style.paddingLeft).toBe('8px');
  });

  it.each(['none', 'sm', 'md', 'pill'] as const)('radius=%s applies a token-driven border-radius', (r) => {
    render(<Card radius={r} data-testid="c">x</Card>);
    const expected =
      r === 'none' ? '' :
      r === 'sm'   ? defaultDarkTokens.size.radiusSm :
      r === 'md'   ? defaultDarkTokens.size.radius :
      /* pill */    '999px';
    expect(screen.getByTestId('c').style.borderRadius).toBe(expected);
  });

  it.each(['div', 'article', 'section', 'li', 'aside', 'main', 'header', 'footer'] as const)('renders the requested element via as=%s', (as) => {
    render(<Card as={as} data-testid="c">x</Card>);
    expect(screen.getByTestId('c').tagName).toBe(as.toUpperCase());
  });

  it('exposes Container layout/sizing props at the public API', () => {
    render(<Card minWidth={280} maxWidth="48rem" overflowY="auto" data-testid="c">x</Card>);
    const el = screen.getByTestId('c');
    expect(el.style.minWidth).toBe('280px');
    expect(el.style.maxWidth).toBe('48rem');
    expect(el.style.overflowY).toBe('auto');
  });

  it('reacts to clicks when interactive', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Card interactive data-testid="c" onClick={onClick}>
        click
      </Card>,
    );
    const node = screen.getByTestId('c');
    expect(node.className).toContain('cursor-pointer');
    await user.click(node);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges a consumer className', () => {
    render(<Card data-testid="c" className="extra-class">x</Card>);
    expect(screen.getByTestId('c').className).toContain('extra-class');
  });

  it('inline `style` overrides win over computed visual style', () => {
    render(<Card variant="outlined" style={{ background: 'red' }} data-testid="c">x</Card>);
    expect(screen.getByTestId('c').style.background).toBe('red');
  });

  it('CardHeader renders title, subtitle and action', () => {
    render(
      <CardHeader
        title="Title"
        subtitle="Subtitle"
        action={<button type="button">act</button>}
      />,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'act' })).toBeInTheDocument();
  });

  it('CardContent and CardActions render their children', () => {
    render(
      <Card>
        <CardContent>body</CardContent>
        <CardActions>
          <button type="button">ok</button>
        </CardActions>
      </Card>,
    );
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ok' })).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Container, computeContainerStyle } from './Container';

describe('Container', () => {
  it('renders a div by default', () => {
    const { container } = render(<Container>x</Container>);
    expect((container.firstChild as HTMLElement).tagName).toBe('DIV');
  });

  it.each(
    ['span', 'section', 'article', 'main', 'header', 'footer', 'aside', 'nav', 'ul', 'ol', 'li', 'pre', 'figure', 'label'] as const,
  )('renders the requested element via as=%s', (as) => {
    const { container } = render(<Container as={as}>x</Container>);
    expect((container.firstChild as HTMLElement).tagName).toBe(as.toUpperCase());
  });

  it('forwards refs', () => {
    const ref = createRef<HTMLElement>();
    render(<Container ref={ref} data-testid="c">x</Container>);
    expect(ref.current).toBe(screen.getByTestId('c'));
  });

  it('always carries the ds-container class', () => {
    render(<Container data-testid="c">x</Container>);
    expect(screen.getByTestId('c').className).toContain('ds-container');
  });

  it('merges a consumer className', () => {
    render(<Container data-testid="c" className="extra-class">x</Container>);
    const cls = screen.getByTestId('c').className;
    expect(cls).toContain('ds-container');
    expect(cls).toContain('extra-class');
  });

  it('padding [v, h] sets vertical on top/bottom and horizontal on left/right', () => {
    render(<Container padding={['75', '250']} data-testid="c">x</Container>);
    const el = screen.getByTestId('c');
    expect(el.style.paddingTop).toBe('6px');
    expect(el.style.paddingBottom).toBe('6px');
    expect(el.style.paddingLeft).toBe('20px');
    expect(el.style.paddingRight).toBe('20px');
  });

  it('padding [t, r, b, l] sets each edge independently', () => {
    render(<Container padding={['25', '50', '75', '100']} data-testid="c">x</Container>);
    const el = screen.getByTestId('c');
    expect(el.style.paddingTop).toBe('2px');
    expect(el.style.paddingRight).toBe('4px');
    expect(el.style.paddingBottom).toBe('6px');
    expect(el.style.paddingLeft).toBe('8px');
  });

  it('uniform padding via [n, n] sets every edge', () => {
    render(<Container padding={['150', '150']} data-testid="c">x</Container>);
    const el = screen.getByTestId('c');
    expect(el.style.paddingTop).toBe('12px');
    expect(el.style.paddingRight).toBe('12px');
    expect(el.style.paddingBottom).toBe('12px');
    expect(el.style.paddingLeft).toBe('12px');
  });

  it('positioning props produce correct inline styles', () => {
    render(
      <Container position="fixed" top={16} right={16} bottom="50%" left={0} zIndex={80} data-testid="c">
        x
      </Container>,
    );
    const el = screen.getByTestId('c');
    expect(el.style.position).toBe('fixed');
    expect(el.style.top).toBe('16px');
    expect(el.style.right).toBe('16px');
    expect(el.style.bottom).toBe('50%');
    expect(el.style.left).toBe('0px');
    expect(el.style.zIndex).toBe('80');
  });

  it('dimension props produce correct inline styles', () => {
    render(
      <Container width={120} height="100%" minWidth={280} maxWidth="48rem" minHeight={420} maxHeight={800} data-testid="c">
        x
      </Container>,
    );
    const el = screen.getByTestId('c');
    expect(el.style.width).toBe('120px');
    expect(el.style.height).toBe('100%');
    expect(el.style.minWidth).toBe('280px');
    expect(el.style.maxWidth).toBe('48rem');
    expect(el.style.minHeight).toBe('420px');
    expect(el.style.maxHeight).toBe('800px');
  });

  it('overflow / overflowX / overflowY pass through', () => {
    render(<Container overflow="auto" overflowX="hidden" overflowY="scroll" data-testid="c">x</Container>);
    const el = screen.getByTestId('c');
    expect(el.style.overflow).toBe('auto');
    expect(el.style.overflowX).toBe('hidden');
    expect(el.style.overflowY).toBe('scroll');
  });

  it('cursor / userSelect / pointerEvents / opacity / textAlign / resize pass through', () => {
    render(
      <Container
        cursor="pointer"
        userSelect="none"
        pointerEvents="none"
        opacity={0.4}
        textAlign="center"
        resize="vertical"
        data-testid="c"
      >
        x
      </Container>,
    );
    const el = screen.getByTestId('c');
    expect(el.style.cursor).toBe('pointer');
    expect(el.style.userSelect).toBe('none');
    expect(el.style.pointerEvents).toBe('none');
    expect(el.style.opacity).toBe('0.4');
    expect(el.style.textAlign).toBe('center');
    expect(el.style.resize).toBe('vertical');
  });

  it('grow sets flex-grow:1', () => {
    render(<Container grow data-testid="c">x</Container>);
    expect(screen.getByTestId('c').style.flexGrow).toBe('1');
  });

  it('shrink={false} pins flex-shrink at 0', () => {
    render(<Container shrink={false} data-testid="c">x</Container>);
    expect(screen.getByTestId('c').style.flexShrink).toBe('0');
  });

  it('shrink={true} opts into flex-shrink:1', () => {
    render(<Container shrink data-testid="c">x</Container>);
    expect(screen.getByTestId('c').style.flexShrink).toBe('1');
  });

  it('inline style prop wins over computed defaults', () => {
    render(<Container padding={['50', '50']} style={{ paddingTop: '20px' }} data-testid="c">x</Container>);
    expect(screen.getByTestId('c').style.paddingTop).toBe('20px');
  });

  it('forwards arbitrary props (data-*, role, aria-*)', () => {
    render(
      <Container data-testid="c" role="region" aria-label="region">
        x
      </Container>,
    );
    const el = screen.getByTestId('c');
    expect(el).toHaveAttribute('role', 'region');
    expect(el).toHaveAttribute('aria-label', 'region');
  });

  it('does NOT leak Container-style props onto the DOM as attributes', () => {
    // React would otherwise warn loudly when these prop keys reach the element
    // as unknown HTML attributes. We assert the rendered DOM doesn't carry them.
    const { container } = render(
      <Container padding={['150', '150']} minWidth={100} cursor="pointer" grow shrink={false} zIndex={5}>
        x
      </Container>,
    );
    const el = container.firstChild as HTMLElement;
    for (const attr of ['padding', 'minwidth', 'cursor', 'grow', 'shrink', 'zindex']) {
      expect(el.hasAttribute(attr)).toBe(false);
    }
  });
});

describe('computeContainerStyle', () => {
  it('returns an empty object for an empty input', () => {
    expect(computeContainerStyle({})).toEqual({});
  });

  it('only writes keys whose props are defined', () => {
    const style = computeContainerStyle({ padding: ['100', '100'], cursor: 'pointer' });
    expect(style).toEqual({
      paddingTop: '8px',
      paddingRight: '8px',
      paddingBottom: '8px',
      paddingLeft: '8px',
      cursor: 'pointer',
    });
  });

  it('expands [v, h] to four edges', () => {
    const style = computeContainerStyle({ padding: ['100', '50'] });
    expect(style.paddingTop).toBe('8px');
    expect(style.paddingBottom).toBe('8px');
    expect(style.paddingLeft).toBe('4px');
    expect(style.paddingRight).toBe('4px');
  });

  it('expands [t, r, b, l] to four edges in order', () => {
    const style = computeContainerStyle({ padding: ['25', '50', '75', '100'] });
    expect(style.paddingTop).toBe('2px');
    expect(style.paddingRight).toBe('4px');
    expect(style.paddingBottom).toBe('6px');
    expect(style.paddingLeft).toBe('8px');
  });
});

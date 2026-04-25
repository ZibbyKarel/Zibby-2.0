// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Kbd } from './Kbd';

describe('Kbd', () => {
  it('renders the supplied children inside a <kbd> element', () => {
    render(<Kbd>⌘K</Kbd>);
    const el = screen.getByText('⌘K');
    expect(el.tagName).toBe('KBD');
  });

  it('merges a custom className', () => {
    render(<Kbd className="my-class">N</Kbd>);
    expect(screen.getByText('N')).toHaveClass('my-class');
  });

  it('applies the small size class when size="sm"', () => {
    render(<Kbd size="sm">x</Kbd>);
    expect(screen.getByText('x').className).toMatch(/h-4/);
  });

  it('applies the medium size class by default', () => {
    render(<Kbd>x</Kbd>);
    expect(screen.getByText('x').className).toMatch(/h-\[18px\]/);
  });
});

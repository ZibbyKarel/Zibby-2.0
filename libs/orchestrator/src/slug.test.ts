import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('lowercases, strips accents, and replaces non-alnum with dashes', () => {
    expect(slugify('Přidej endpoint /health')).toBe('pridej-endpoint-health');
  });

  it('collapses runs of separators and trims leading/trailing dashes', () => {
    expect(slugify('  foo  ---   bar!!  ')).toBe('foo-bar');
  });

  it('caps length at 50 characters', () => {
    const long = 'a'.repeat(80);
    expect(slugify(long).length).toBe(50);
  });

  it('falls back to "task" when input has nothing usable', () => {
    expect(slugify('!!!')).toBe('task');
    expect(slugify('')).toBe('task');
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug when it is not taken', () => {
    expect(uniqueSlug('foo', new Set())).toBe('foo');
  });

  it('appends -2, -3, ... when collisions exist', () => {
    const taken = new Set(['foo', 'foo-2']);
    expect(uniqueSlug('foo', taken)).toBe('foo-3');
  });
});

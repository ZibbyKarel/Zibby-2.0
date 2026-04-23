import { describe, it, expect } from 'vitest';
import { truncateContent, renderContextForPrompt } from './repo-context';
import type { RepoContext } from './repo-context';

function makeCtx(overrides: Partial<RepoContext> = {}): RepoContext {
  return {
    folderPath: '/fake',
    aiConventions: [],
    projectInfo: [],
    tree: '',
    ...overrides,
  };
}

describe('truncateContent', () => {
  it('returns content unchanged when at or under the limit', () => {
    expect(truncateContent('hello', 10)).toBe('hello');
    expect(truncateContent('hello', 5)).toBe('hello');
  });

  it('truncates content beyond the per-file limit and inserts marker', () => {
    const original = 'a'.repeat(10_000);
    const result = truncateContent(original, 8_000);
    expect(result.startsWith('a'.repeat(8_000))).toBe(true);
    expect(result).toContain('[… truncated 2000 chars …]');
    expect(result).toBe('a'.repeat(8_000) + '[… truncated 2000 chars …]');
  });

  it('uses Unicode ellipsis character (U+2026), not three dots', () => {
    const result = truncateContent('ab', 1);
    expect(result).toContain('…');
    expect(result).not.toContain('...');
  });

  it('reports the exact number of dropped characters in the marker', () => {
    const result = truncateContent('abcdefgh', 5);
    expect(result).toBe('abcde[… truncated 3 chars …]');
  });
});

describe('renderContextForPrompt total-context cap', () => {
  it('does not add a marker when content is under the total cap', () => {
    const ctx = makeCtx({
      projectInfo: [{ relPath: 'README.md', content: 'Short readme' }],
    });
    const result = renderContextForPrompt(ctx, { maxTotalChars: 32_000 });
    expect(result).not.toContain('[… truncated');
  });

  it('caps the combined output and inserts truncation marker when over the total cap', () => {
    const ctx = makeCtx({
      aiConventions: [{ relPath: 'CLAUDE.md', content: 'x'.repeat(20_000) }],
      projectInfo: [{ relPath: 'README.md', content: 'y'.repeat(20_000) }],
    });
    const result = renderContextForPrompt(ctx, { maxTotalChars: 5_000 });
    const markerIdx = result.indexOf('[… truncated');
    expect(markerIdx).toBeGreaterThanOrEqual(0);
    expect(markerIdx).toBeLessThanOrEqual(5_000);
    expect(result.endsWith(']')).toBe(true);
  });

  it('preserves earlier (higher-priority) files and truncates later ones', () => {
    const ctx = makeCtx({
      aiConventions: [{ relPath: 'CLAUDE.md', content: 'convention-content' }],
      projectInfo: [{ relPath: 'README.md', content: 'z'.repeat(30_000) }],
    });
    const result = renderContextForPrompt(ctx, { maxTotalChars: 500 });
    expect(result).toContain('convention-content');
    expect(result).toContain('[… truncated');
  });
});

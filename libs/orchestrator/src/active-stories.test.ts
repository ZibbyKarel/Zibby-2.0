import { describe, expect, it } from 'vitest';
import { isStoryActive, tryClaimStory } from './active-stories';

describe('active-stories registry', () => {
  it('grants a single claim and blocks a concurrent second claim', () => {
    const first = tryClaimStory('/tmp/repo-a', '1-story');
    expect(first).not.toBeNull();
    expect(isStoryActive('/tmp/repo-a', '1-story')).toBe(true);

    const second = tryClaimStory('/tmp/repo-a', '1-story');
    expect(second).toBeNull();

    first!();
    expect(isStoryActive('/tmp/repo-a', '1-story')).toBe(false);
  });

  it('releases cleanly so the same slug can be re-claimed afterwards', () => {
    const first = tryClaimStory('/tmp/repo-b', '2-story');
    expect(first).not.toBeNull();
    first!();

    const retry = tryClaimStory('/tmp/repo-b', '2-story');
    expect(retry).not.toBeNull();
    retry!();
  });

  it('treats the same slug in different repos as independent claims', () => {
    const a = tryClaimStory('/tmp/repo-c', '3-story');
    const b = tryClaimStory('/tmp/repo-d', '3-story');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    a!();
    b!();
  });
});

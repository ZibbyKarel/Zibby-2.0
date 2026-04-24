import { describe, expect, it } from 'vitest';
import type { Story } from '@nightcoder/shared-types/ipc';
import { tryClaimStory } from './active-stories';
import { executeStory, type StoryExecutionEvent } from './execute-story';
import { slugify } from './slug';

const story: Story = {
  title: 'My cool story',
  description: 'desc',
  acceptanceCriteria: ['ac'],
  affectedFiles: [],
};

describe('executeStory duplicate guard', () => {
  it('bails out when the slug is already claimed, without touching git', async () => {
    const repoPath = '/tmp/nightcoder-executestory-dedup-test';
    const slugBase = slugify(`${0 + 1}-${story.title}`);

    const release = tryClaimStory(repoPath, slugBase);
    expect(release).not.toBeNull();

    try {
      const events: StoryExecutionEvent[] = [];
      const result = await executeStory({
        story,
        storyIndex: 0,
        repoPath,
        baseBranch: 'main',
        usedSlugs: new Set<string>(),
        signal: { cancelled: false },
        onEvent: (e) => events.push(e),
      });

      expect(result.success).toBe(false);
      expect(result.duplicate).toBe(true);
      expect(result.error).toBe('already running');
      expect(events.some((e) => e.kind === 'status' && e.status === 'running')).toBe(false);
      expect(events.some((e) => e.kind === 'log' && e.stream === 'info' && /already being executed/.test(e.line))).toBe(true);
    } finally {
      release!();
    }
  });
});

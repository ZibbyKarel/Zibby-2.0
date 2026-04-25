import { describe, expect, it } from 'vitest';
import type { Story } from '@nightcoder/shared-types/ipc';
import { tryClaimStory } from './active-stories';
import { executeStory, implementationModelFor, implementationThinkingFor, thinkingPreamble, type StoryExecutionEvent } from './execute-story';
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

describe('phase model resolution', () => {
  it('prefers phaseModels.implementation.model over legacy story.model', () => {
    const s: Story = {
      taskId: 't',
      title: 't',
      description: 'd',
      acceptanceCriteria: ['x'],
      affectedFiles: [],
      model: 'haiku',
      phaseModels: { implementation: { model: 'opus' } },
    };
    expect(implementationModelFor(s)).toBe('opus');
  });

  it('falls back to legacy story.model when no phase config is set', () => {
    const s: Story = {
      taskId: 't',
      title: 't',
      description: 'd',
      acceptanceCriteria: ['x'],
      affectedFiles: [],
      model: 'haiku',
    };
    expect(implementationModelFor(s)).toBe('haiku');
    expect(implementationThinkingFor(s)).toBeUndefined();
  });

  it('returns undefined when nothing is set — runner uses its env default', () => {
    const s: Story = {
      taskId: 't', title: 't', description: 'd', acceptanceCriteria: ['x'], affectedFiles: [],
    };
    expect(implementationModelFor(s)).toBeUndefined();
  });

  it('thinking preamble is empty for off / undefined, non-empty for low/medium/high', () => {
    expect(thinkingPreamble(undefined)).toBe('');
    expect(thinkingPreamble('off')).toBe('');
    expect(thinkingPreamble('low').length).toBeGreaterThan(0);
    expect(thinkingPreamble('medium').length).toBeGreaterThan(0);
    expect(thinkingPreamble('high').length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import type { PersistedTask, Story, StoryStatus } from '@nightcoder/shared-types/ipc';
import { resolveBlockerBaseBranch } from './blocker-base';

function makeTask(overrides: Partial<PersistedTask> = {}): PersistedTask {
  return {
    taskId: 'blocker',
    status: 'done',
    branch: 'nightcoder/blocker-branch',
    prUrl: null,
    startedAt: null,
    endedAt: null,
    ...overrides,
  };
}

function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    taskId: 'new',
    title: 'New task',
    description: 'desc',
    acceptanceCriteria: ['x'],
    affectedFiles: [],
    blockerTaskId: 'blocker',
    ...overrides,
  };
}

describe('resolveBlockerBaseBranch', () => {
  it('returns null when the story has no blocker', () => {
    expect(
      resolveBlockerBaseBranch({
        story: makeStory({ blockerTaskId: undefined }),
        tasks: {},
      }),
    ).toBeNull();
  });

  it('returns null when the blocker task is not persisted', () => {
    expect(resolveBlockerBaseBranch({ story: makeStory(), tasks: {} })).toBeNull();
  });

  it('returns null when the blocker is not yet in a branch-producing status', () => {
    const notReady: StoryStatus[] = ['pending', 'blocked', 'running', 'failed', 'cancelled', 'interrupted'];
    for (const status of notReady) {
      expect(
        resolveBlockerBaseBranch({
          story: makeStory(),
          tasks: { blocker: makeTask({ status }) },
        }),
      ).toBeNull();
    }
  });

  it('returns null when the branch is missing even if status is done', () => {
    expect(
      resolveBlockerBaseBranch({
        story: makeStory(),
        tasks: { blocker: makeTask({ status: 'done', branch: null }) },
      }),
    ).toBeNull();
  });

  it('returns the blocker branch when pushing/review/done and branch is set', () => {
    const ready: StoryStatus[] = ['pushing', 'review', 'done'];
    for (const status of ready) {
      expect(
        resolveBlockerBaseBranch({
          story: makeStory(),
          tasks: { blocker: makeTask({ status }) },
        }),
      ).toBe('nightcoder/blocker-branch');
    }
  });

  it('tolerates an undefined tasks map', () => {
    expect(
      resolveBlockerBaseBranch({ story: makeStory(), tasks: undefined }),
    ).toBeNull();
  });
});

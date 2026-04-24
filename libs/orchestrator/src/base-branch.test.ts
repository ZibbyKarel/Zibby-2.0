import { describe, expect, it } from 'vitest';
import type { PersistedTask, RefinedPlan } from '@nightcoder/shared-types/ipc';
import { deriveBranchForStory, resolveBaseBranch } from './base-branch';

function plan(stories: Array<{ id: string; title: string; numericId?: number }>, deps: Array<[number, number]> = []): RefinedPlan {
  return {
    stories: stories.map((s) => ({
      taskId: s.id,
      title: s.title,
      description: 'd',
      acceptanceCriteria: ['a'],
      affectedFiles: [],
      numericId: s.numericId,
    })),
    dependencies: deps.map(([from, to]) => ({ from, to, reason: 'test' })),
  };
}

function task(partial: Partial<PersistedTask> & { taskId: string }): PersistedTask {
  return {
    status: 'pending',
    branch: null,
    prUrl: null,
    startedAt: null,
    endedAt: null,
    ...partial,
  };
}

describe('resolveBaseBranch', () => {
  it('returns the fallback when the story has no incoming deps', () => {
    const p = plan([{ id: 'a', title: 'A' }]);
    const base = resolveBaseBranch({ plan: p, tasks: {}, storyIndex: 0, fallback: 'main' });
    expect(base).toBe('main');
  });

  it('returns the blocker\'s persisted branch when available', () => {
    const p = plan([
      { id: 'a', title: 'Add Widget' },
      { id: 'b', title: 'Widget polish' },
    ], [[0, 1]]);
    const tasks = { a: task({ taskId: 'a', branch: 'nightcoder/1-add-widget', status: 'review' }) };
    const base = resolveBaseBranch({ plan: p, tasks, storyIndex: 1, fallback: 'main' });
    expect(base).toBe('nightcoder/1-add-widget');
  });

  it('derives the blocker\'s branch deterministically when none is persisted', () => {
    const p = plan([
      { id: 'a', title: 'Add Widget', numericId: 7 },
      { id: 'b', title: 'Widget polish' },
    ], [[0, 1]]);
    const base = resolveBaseBranch({ plan: p, tasks: {}, storyIndex: 1, fallback: 'main' });
    expect(base).toBe('nightcoder/7-add-widget');
  });

  it('falls back to fallback when the blocker is cancelled/failed/done', () => {
    const p = plan([
      { id: 'a', title: 'Add Widget' },
      { id: 'b', title: 'Widget polish' },
    ], [[0, 1]]);
    for (const status of ['failed', 'cancelled', 'done'] as const) {
      const tasks = { a: task({ taskId: 'a', branch: 'nightcoder/1-add-widget', status }) };
      const base = resolveBaseBranch({ plan: p, tasks, storyIndex: 1, fallback: 'main' });
      expect(base).toBe('main');
    }
  });

  it('picks the lowest-index blocker deterministically when there are multiple', () => {
    const p = plan([
      { id: 'a', title: 'One' },
      { id: 'b', title: 'Two' },
      { id: 'c', title: 'Three' },
    ], [[0, 2], [1, 2]]);
    const tasks = {
      a: task({ taskId: 'a', branch: 'branch-a', status: 'review' }),
      b: task({ taskId: 'b', branch: 'branch-b', status: 'review' }),
    };
    const base = resolveBaseBranch({ plan: p, tasks, storyIndex: 2, fallback: 'main' });
    expect(base).toBe('branch-a');
  });
});

describe('deriveBranchForStory', () => {
  it('uses numericId + slugified title', () => {
    expect(deriveBranchForStory({
      taskId: 'x', title: 'Fix Up The Thing!', description: 'd',
      acceptanceCriteria: [], affectedFiles: [], numericId: 5,
    }, 0)).toBe('nightcoder/5-fix-up-the-thing');
  });
  it('falls back to (index+1) when no numericId', () => {
    expect(deriveBranchForStory({
      taskId: 'x', title: 'Hello', description: 'd',
      acceptanceCriteria: [], affectedFiles: [],
    }, 2)).toBe('nightcoder/3-hello');
  });
});

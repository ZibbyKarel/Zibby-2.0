import { describe, expect, it } from 'vitest';
import { addStoryToPlan } from './plan';
import type { RefinedPlan } from './ipc';

function story(i: number): RefinedPlan['stories'][number] {
  return {
    taskId: `t${i}`,
    title: `Task ${i}`,
    description: 'desc',
    acceptanceCriteria: ['a'],
    affectedFiles: [],
  };
}

describe('addStoryToPlan', () => {
  it('appends a story without dependencies when no blocker', () => {
    const plan: RefinedPlan = { stories: [story(1)], dependencies: [] };
    const next = addStoryToPlan(plan, {
      taskId: 't2',
      title: 'New',
      description: 'd',
      acceptance: ['c'],
      blockingIndex: null,
    });
    expect(next.stories).toHaveLength(2);
    expect(next.stories[1].taskId).toBe('t2');
    expect(next.dependencies).toEqual([]);
  });

  it('adds a dependency from blocker to new story', () => {
    const plan: RefinedPlan = { stories: [story(1), story(2)], dependencies: [] };
    const next = addStoryToPlan(plan, {
      taskId: 't3',
      title: 'Third',
      description: 'd',
      acceptance: ['c'],
      blockingIndex: 0,
    });
    expect(next.dependencies).toEqual([
      { from: 0, to: 2, reason: 'user: blocks this task' },
    ]);
  });

  it('preserves existing dependencies alongside the new one', () => {
    const plan: RefinedPlan = {
      stories: [story(1), story(2), story(3)],
      dependencies: [{ from: 0, to: 1, reason: 'existing' }],
    };
    const next = addStoryToPlan(plan, {
      taskId: 't4',
      title: 'Four',
      description: 'd',
      acceptance: ['c'],
      blockingIndex: 1,
    });
    expect(next.dependencies).toEqual([
      { from: 0, to: 1, reason: 'existing' },
      { from: 1, to: 3, reason: 'user: blocks this task' },
    ]);
  });

  it('ignores out-of-range blockingIndex', () => {
    const plan: RefinedPlan = { stories: [story(1)], dependencies: [] };
    const next = addStoryToPlan(plan, {
      taskId: 't2',
      title: 'New',
      description: 'd',
      acceptance: ['c'],
      blockingIndex: 99,
    });
    expect(next.dependencies).toEqual([]);
  });

  it('stores agents and model on the new story', () => {
    const plan: RefinedPlan = { stories: [], dependencies: [] };
    const next = addStoryToPlan(plan, {
      taskId: 't1',
      title: 'First',
      description: 'd',
      acceptance: ['c'],
      blockingIndex: null,
      model: 'opus',
      agents: {
        plan: { model: 'opus', thinking: 'high' },
        code: { model: 'sonnet', thinking: 'medium' },
        qa: { model: 'haiku', thinking: 'low' },
      },
    });
    expect(next.stories[0].model).toBe('opus');
    expect(next.stories[0].agents?.code?.model).toBe('sonnet');
    expect(next.stories[0].agents?.qa?.thinking).toBe('low');
  });
});

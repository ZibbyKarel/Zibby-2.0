import { describe, expect, it } from 'vitest';
import { buildDag, collectTransitiveSuccessors, removeStoryFromPlan } from './dag';
import type { RefinedPlan } from '@nightcoder/shared-types/ipc';

describe('buildDag', () => {
  it('returns empty-waitingFor nodes when there are no dependencies', () => {
    const nodes = buildDag(3, []);
    expect(nodes).toHaveLength(3);
    for (const n of nodes) {
      expect(n.waitingFor.size).toBe(0);
      expect(n.successors.size).toBe(0);
    }
  });

  it('wires successors and waitingFor from dependency edges', () => {
    const nodes = buildDag(3, [
      { from: 0, to: 1, reason: 'x' },
      { from: 1, to: 2, reason: 'y' },
    ]);
    expect([...nodes[0].successors]).toEqual([1]);
    expect([...nodes[1].waitingFor]).toEqual([0]);
    expect([...nodes[1].successors]).toEqual([2]);
    expect([...nodes[2].waitingFor]).toEqual([1]);
  });

  it('throws on a cycle', () => {
    expect(() =>
      buildDag(3, [
        { from: 0, to: 1, reason: 'a' },
        { from: 1, to: 2, reason: 'b' },
        { from: 2, to: 0, reason: 'c' },
      ])
    ).toThrow(/cycle/i);
  });

  it('silently drops self-loops and out-of-range edges', () => {
    const nodes = buildDag(2, [
      { from: 0, to: 0, reason: 'self' },
      { from: 5, to: 1, reason: 'oob-from' },
      { from: 0, to: 99, reason: 'oob-to' },
      { from: -1, to: 1, reason: 'neg-from' },
    ]);
    expect(nodes[0].successors.size).toBe(0);
    expect(nodes[1].waitingFor.size).toBe(0);
  });

  it('handles fan-out and fan-in correctly', () => {
    // 0 -> {1, 2} -> 3
    const nodes = buildDag(4, [
      { from: 0, to: 1, reason: '' },
      { from: 0, to: 2, reason: '' },
      { from: 1, to: 3, reason: '' },
      { from: 2, to: 3, reason: '' },
    ]);
    expect([...nodes[0].successors].sort()).toEqual([1, 2]);
    expect([...nodes[3].waitingFor].sort()).toEqual([1, 2]);
  });
});

const makeStory = (title: string) => ({
  title,
  description: 'desc',
  acceptanceCriteria: ['ac'],
  affectedFiles: [],
});

describe('removeStoryFromPlan', () => {
  it('removes a story with no edges cleanly', () => {
    const plan: RefinedPlan = {
      stories: [makeStory('A'), makeStory('B'), makeStory('C')],
      dependencies: [],
    };
    const result = removeStoryFromPlan(plan, 1);
    expect(result.stories).toHaveLength(2);
    expect(result.stories[0].title).toBe('A');
    expect(result.stories[1].title).toBe('C');
    expect(result.dependencies).toHaveLength(0);
  });

  it('drops edges where from or to equals the removed index', () => {
    const plan: RefinedPlan = {
      stories: [makeStory('A'), makeStory('B'), makeStory('C')],
      dependencies: [
        { from: 0, to: 1, reason: 'a needs b' },
        { from: 1, to: 2, reason: 'b needs c' },
        { from: 0, to: 2, reason: 'a needs c' },
      ],
    };
    const result = removeStoryFromPlan(plan, 1);
    expect(result.dependencies).toHaveLength(1);
    expect(result.dependencies[0]).toEqual({ from: 0, to: 1, reason: 'a needs c' });
  });

  it('decrements edge indices that are greater than the removed index', () => {
    const plan: RefinedPlan = {
      stories: [makeStory('A'), makeStory('B'), makeStory('C'), makeStory('D')],
      dependencies: [
        { from: 0, to: 2, reason: 'a to c' },
        { from: 2, to: 3, reason: 'c to d' },
      ],
    };
    const result = removeStoryFromPlan(plan, 1);
    expect(result.stories).toHaveLength(3);
    expect(result.dependencies).toHaveLength(2);
    expect(result.dependencies[0]).toEqual({ from: 0, to: 1, reason: 'a to c' });
    expect(result.dependencies[1]).toEqual({ from: 1, to: 2, reason: 'c to d' });
  });
});

describe('collectTransitiveSuccessors', () => {
  it('returns the full descendant set', () => {
    const nodes = buildDag(4, [
      { from: 0, to: 1, reason: '' },
      { from: 1, to: 2, reason: '' },
      { from: 1, to: 3, reason: '' },
    ]);
    expect([...collectTransitiveSuccessors(nodes, 0)].sort()).toEqual([1, 2, 3]);
    expect([...collectTransitiveSuccessors(nodes, 1)].sort()).toEqual([2, 3]);
    expect(collectTransitiveSuccessors(nodes, 2).size).toBe(0);
  });

  it('does not revisit nodes in a diamond', () => {
    // 0 -> 1, 0 -> 2, 1 -> 3, 2 -> 3
    const nodes = buildDag(4, [
      { from: 0, to: 1, reason: '' },
      { from: 0, to: 2, reason: '' },
      { from: 1, to: 3, reason: '' },
      { from: 2, to: 3, reason: '' },
    ]);
    const descendants = collectTransitiveSuccessors(nodes, 0);
    expect([...descendants].sort()).toEqual([1, 2, 3]);
  });
});

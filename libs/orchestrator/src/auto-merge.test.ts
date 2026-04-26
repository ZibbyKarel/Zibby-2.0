import { describe, expect, it, vi } from 'vitest';
import type { Story } from '@nightcoder/shared-types/ipc';
import { startAutoMerge, type AutoMergeEvent } from './auto-merge';
import type { ConflictResolverResult } from './conflict-resolver';

const story: Story = {
  taskId: 't1',
  title: 'Cool feature',
  description: 'Adds a cool feature',
  acceptanceCriteria: ['It works'],
  affectedFiles: [],
};

function pollSetup(states: Array<'CLEAN' | 'DIRTY' | 'BLOCKED' | 'UNKNOWN'>) {
  let i = 0;
  const viewMergeState = vi.fn(async () => {
    const s = states[Math.min(i, states.length - 1)];
    i++;
    return { mergeable: s === 'DIRTY' ? 'CONFLICTING' as const : 'MERGEABLE' as const, mergeStateStatus: s };
  });
  return viewMergeState;
}

describe('startAutoMerge', () => {
  it('merges immediately when the PR is CLEAN', async () => {
    const viewMergeState = pollSetup(['CLEAN']);
    const mergePr = vi.fn(async () => {});
    const events: AutoMergeEvent[] = [];

    const handle = startAutoMerge({
      worktreePath: '/tmp/x',
      branch: 'feat/x',
      baseBranch: 'main',
      story,
      signal: { cancelled: false },
      pollIntervalMs: 5,
      maxWaitMs: 10_000,
      onEvent: (e) => events.push(e),
      viewMergeState,
      mergePr,
      forcePush: vi.fn(),
      resolver: vi.fn(),
    });

    await handle.done;
    expect(viewMergeState).toHaveBeenCalledTimes(1);
    expect(mergePr).toHaveBeenCalledTimes(1);
    expect(events.some((e) => e.kind === 'merged')).toBe(true);
  });

  it('runs the resolver and force-pushes on DIRTY, then merges when CLEAN', async () => {
    const viewMergeState = pollSetup(['DIRTY', 'CLEAN']);
    const mergePr = vi.fn(async () => {});
    const forcePush = vi.fn(async () => {});
    const resolver = vi.fn(async (): Promise<ConflictResolverResult> => ({
      kind: 'resolved',
      attempts: 1,
      filesTouched: ['file.txt'],
    }));

    const handle = startAutoMerge({
      worktreePath: '/tmp/x',
      branch: 'feat/x',
      baseBranch: 'main',
      story,
      signal: { cancelled: false },
      pollIntervalMs: 5,
      maxWaitMs: 10_000,
      onEvent: () => {},
      viewMergeState,
      mergePr,
      forcePush,
      resolver,
    });

    await handle.done;
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(forcePush).toHaveBeenCalledTimes(1);
    expect(mergePr).toHaveBeenCalledTimes(1);
  });

  it('emits failed and stops when resolver gives up', async () => {
    const viewMergeState = pollSetup(['DIRTY']);
    const resolver = vi.fn(async (): Promise<ConflictResolverResult> => ({
      kind: 'failed',
      reason: 'max-attempts',
      attempts: 3,
      conflictedFiles: ['x.txt'],
      message: 'gave up',
    }));
    const events: AutoMergeEvent[] = [];

    const handle = startAutoMerge({
      worktreePath: '/tmp/x',
      branch: 'feat/x',
      baseBranch: 'main',
      story,
      signal: { cancelled: false },
      pollIntervalMs: 5,
      maxWaitMs: 10_000,
      onEvent: (e) => events.push(e),
      viewMergeState,
      mergePr: vi.fn(),
      forcePush: vi.fn(),
      resolver,
    });

    await handle.done;
    expect(events.some((e) => e.kind === 'failed')).toBe(true);
  });

  it('respects stop()', async () => {
    const viewMergeState = vi.fn(async () => ({
      mergeable: 'UNKNOWN' as const,
      mergeStateStatus: 'BLOCKED' as const,
    }));

    const handle = startAutoMerge({
      worktreePath: '/tmp/x',
      branch: 'feat/x',
      baseBranch: 'main',
      story,
      signal: { cancelled: false },
      pollIntervalMs: 5,
      maxWaitMs: 10_000,
      onEvent: () => {},
      viewMergeState,
      mergePr: vi.fn(),
      forcePush: vi.fn(),
      resolver: vi.fn(),
    });

    setTimeout(() => handle.stop(), 30);
    await handle.done;
    // Should have polled at least once, but never merged or resolved.
    expect(viewMergeState.mock.calls.length).toBeGreaterThan(0);
  });

  it('emits failed when maxWaitMs is exceeded in BLOCKED', async () => {
    const viewMergeState = vi.fn(async () => ({
      mergeable: 'MERGEABLE' as const,
      mergeStateStatus: 'BLOCKED' as const,
    }));
    const events: AutoMergeEvent[] = [];

    const handle = startAutoMerge({
      worktreePath: '/tmp/x',
      branch: 'feat/x',
      baseBranch: 'main',
      story,
      signal: { cancelled: false },
      pollIntervalMs: 5,
      maxWaitMs: 50,
      onEvent: (e) => events.push(e),
      viewMergeState,
      mergePr: vi.fn(),
      forcePush: vi.fn(),
      resolver: vi.fn(),
    });

    await handle.done;
    expect(events.some((e) => e.kind === 'failed')).toBe(true);
  });
});

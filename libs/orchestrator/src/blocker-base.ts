import type { PersistedTask, Story, StoryStatus } from '@nightcoder/shared-types/ipc';

/**
 * Statuses for which the blocker's branch is guaranteed to exist (pushed
 * and/or merged). We also accept `pushing` defensively — by then the branch
 * is locally materialised even if the push hasn't resolved yet.
 */
const BLOCKER_READY_STATUSES: ReadonlySet<StoryStatus> = new Set([
  'pushing',
  'review',
  'done',
]);

/**
 * Resolve the base branch a story should be branched from / PR'd into, given
 * its `blockerTaskId`.
 *
 * Returns the blocker's branch name when:
 *  - the story has a `blockerTaskId`
 *  - the blocker is in a status where its branch exists (see BLOCKER_READY_STATUSES)
 *  - the blocker has a persisted branch name
 *
 * Returns null in every other case so the caller falls back to the repo's
 * default base branch. This is deliberately conservative: if the blocker
 * hasn't produced a branch yet, using it would trip `git worktree add` with
 * a "missing ref" error the user can't easily diagnose.
 */
export function resolveBlockerBaseBranch(args: {
  story: Story;
  tasks: Record<string, PersistedTask> | undefined;
}): string | null {
  const blockerId = args.story.blockerTaskId;
  if (!blockerId) return null;
  const blocker = args.tasks?.[blockerId];
  if (!blocker) return null;
  if (!blocker.branch) return null;
  if (!BLOCKER_READY_STATUSES.has(blocker.status)) return null;
  return blocker.branch;
}

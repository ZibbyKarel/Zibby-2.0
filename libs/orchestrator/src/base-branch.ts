import type { PersistedTask, RefinedPlan, Story, StoryStatus } from '@nightcoder/shared-types/ipc';
import { slugify } from './slug';

/**
 * When a story has a "blocked by" dependency, the intent is that the new task
 * continues work on top of the blocker's branch — both so that the worktree
 * starts from the blocker's commits and so that the resulting PR targets the
 * blocker's branch instead of main.
 *
 * This helper resolves the base ref for a story:
 *  - If the story has one or more incoming dependencies, pick the deterministic
 *    lowest-index one as the blocker (stable across runs; avoids surprise when
 *    two blockers exist and one's branch was pushed first).
 *  - If the blocker has a persisted branch in `tasks`, use that. Otherwise
 *    derive the branch name from the blocker's numericId/title and fall back
 *    to the provided `fallback` only if the blocker looks like it was never
 *    started (no numericId, no persisted branch).
 *  - When there's no dependency at all, return `fallback` (the repo's default
 *    branch — main/master).
 *
 * We also consider the blocker's status: cancelled/failed blockers fall back
 * to `fallback` so the new task doesn't branch off a dead line.
 */
export type ResolveBaseBranchInput = {
  plan: RefinedPlan;
  tasks: Readonly<Record<string, PersistedTask>>;
  storyIndex: number;
  /** Repo's default branch (main/master), used when no blocker applies. */
  fallback: string;
};

const DEAD_STATUSES: ReadonlySet<StoryStatus> = new Set(['cancelled', 'failed']);

export function resolveBaseBranch(input: ResolveBaseBranchInput): string {
  const { plan, tasks, storyIndex, fallback } = input;
  const incoming = plan.dependencies
    .filter((d) => d.to === storyIndex)
    .map((d) => d.from)
    .sort((a, b) => a - b);
  if (incoming.length === 0) return fallback;

  const blockerIndex = incoming[0];
  const blocker = plan.stories[blockerIndex];
  if (!blocker) return fallback;

  const persisted = tasks[blocker.taskId];
  if (persisted && DEAD_STATUSES.has(persisted.status)) return fallback;
  if (persisted?.branch) return persisted.branch;

  return deriveBranchForStory(blocker, blockerIndex);
}

/**
 * Mirrors `executeStory`'s branch naming (`nightcoder/<numericId>-<slug>`) so
 * callers can name the blocker's branch deterministically even before its
 * first 'branch' event has been persisted.
 */
export function deriveBranchForStory(story: Story, storyIndex: number): string {
  return `nightcoder/${slugify(`${story.numericId ?? storyIndex + 1}-${story.title}`)}`;
}

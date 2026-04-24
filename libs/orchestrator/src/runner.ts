import type { PersistedTask, RefinedPlan, Story } from '@nightcoder/shared-types/ipc';
import { executeStory, type StoryExecutionEvent, type ResumeContext } from './execute-story';
import { detectBaseBranch } from './worktree';
import { resolveBaseBranch } from './base-branch';

export type SingleStoryHandle = {
  result: Promise<{ success: boolean }>;
  cancel: () => void;
};

export function runSingleStory(args: {
  story: Story;
  storyIndex: number;
  repoPath: string;
  baseBranch?: string;
  /** Full plan — lets the runner resolve a blocker-based base branch. */
  plan?: RefinedPlan;
  tasks?: Readonly<Record<string, PersistedTask>>;
  onEvent: (event: { storyIndex: number } & StoryExecutionEvent) => void;
}): SingleStoryHandle {
  const signal = { cancelled: false };
  const usedSlugs = new Set<string>();

  const result = (async () => {
    const fallback = args.baseBranch ?? (await detectBaseBranch(args.repoPath));
    const baseBranch = args.plan
      ? resolveBaseBranch({
          plan: args.plan,
          tasks: args.tasks ?? {},
          storyIndex: args.storyIndex,
          fallback,
        })
      : fallback;
    const res = await executeStory({
      story: args.story,
      storyIndex: args.storyIndex,
      repoPath: args.repoPath,
      baseBranch,
      usedSlugs,
      signal,
      onEvent: (e) => args.onEvent({ storyIndex: args.storyIndex, ...e }),
    });
    return { success: res.success };
  })();

  return {
    result,
    cancel: () => {
      signal.cancelled = true;
    },
  };
}

/**
 * Resume a previously-interrupted story. Reuses the existing worktree (or
 * recreates it from the persisted branch) and feeds claude a continuation
 * prompt built from the task's plan.md + journal tail.
 */
export function runStoryResume(args: {
  story: Story;
  storyIndex: number;
  repoPath: string;
  baseBranch?: string;
  resume: ResumeContext;
  onEvent: (event: { storyIndex: number } & StoryExecutionEvent) => void;
}): SingleStoryHandle {
  const signal = { cancelled: false };
  const usedSlugs = new Set<string>();

  const result = (async () => {
    const baseBranch = args.baseBranch ?? (await detectBaseBranch(args.repoPath));
    const res = await executeStory({
      story: args.story,
      storyIndex: args.storyIndex,
      repoPath: args.repoPath,
      baseBranch,
      usedSlugs,
      signal,
      onEvent: (e) => args.onEvent({ storyIndex: args.storyIndex, ...e }),
      resume: args.resume,
    });
    return { success: res.success };
  })();

  return {
    result,
    cancel: () => {
      signal.cancelled = true;
    },
  };
}

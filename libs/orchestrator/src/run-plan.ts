import type { RefinedPlan } from '@zibby/shared-types/ipc';
import { detectBaseBranch } from './worktree';
import { executeStory, type StoryExecutionEvent } from './execute-story';

export type PlanEvent =
  | ({ storyIndex: number } & StoryExecutionEvent)
  | { kind: 'run-done'; success: boolean };

export type PlanRunHandle = {
  runId: string;
  result: Promise<{ success: boolean }>;
  cancel: () => void;
};

let nextRunId = 1;

export function startPlanRun(args: {
  plan: RefinedPlan;
  repoPath: string;
  baseBranch?: string;
  onEvent: (event: PlanEvent) => void;
}): PlanRunHandle {
  const runId = `run-${Date.now()}-${nextRunId++}`;
  const signal = { cancelled: false };
  const usedSlugs = new Set<string>();

  const result = (async () => {
    const baseBranch = args.baseBranch ?? (await detectBaseBranch(args.repoPath));
    for (let i = 0; i < args.plan.stories.length; i++) {
      if (signal.cancelled) break;
      args.onEvent({ storyIndex: i, kind: 'status', status: 'running' });
      const res = await executeStory({
        story: args.plan.stories[i],
        storyIndex: i,
        repoPath: args.repoPath,
        baseBranch,
        usedSlugs,
        signal,
        onEvent: (e) => args.onEvent({ storyIndex: i, ...e }),
      });
      if (!res.success) {
        args.onEvent({ kind: 'run-done', success: false });
        return { success: false };
      }
    }
    args.onEvent({ kind: 'run-done', success: !signal.cancelled });
    return { success: !signal.cancelled };
  })();

  return {
    runId,
    result,
    cancel: () => {
      signal.cancelled = true;
    },
  };
}

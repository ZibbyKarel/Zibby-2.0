import type { RefinedPlan } from '@zibby/shared-types/ipc';
import { detectBaseBranch } from './worktree';
import { executeStory, type StoryExecutionEvent } from './execute-story';
import { buildDag, collectTransitiveSuccessors, type DagNode } from './dag';

const DEFAULT_PARALLELISM = Number(process.env.MAX_PARALLEL_RUNNERS ?? 3);

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
  maxParallel?: number;
  completedIndices?: readonly number[];
  onEvent: (event: PlanEvent) => void;
}): PlanRunHandle {
  const runId = `run-${Date.now()}-${nextRunId++}`;
  const signal = { cancelled: false };
  const usedSlugs = new Set<string>();
  const maxParallel = Math.max(1, args.maxParallel ?? DEFAULT_PARALLELISM);

  const result = (async () => {
    const baseBranch = args.baseBranch ?? (await detectBaseBranch(args.repoPath));
    const dag = safeBuildDag(args.plan, args.onEvent);
    if (!dag) {
      args.onEvent({ kind: 'run-done', success: false });
      return { success: false };
    }

    const status: Array<'pending' | 'running' | 'done' | 'failed' | 'blocked'> = dag.map(() => 'pending');
    for (const idx of args.completedIndices ?? []) {
      if (idx >= 0 && idx < status.length) status[idx] = 'done';
    }
    let failed = false;

    const blockCascade = (fromIndex: number) => {
      for (const idx of collectTransitiveSuccessors(dag, fromIndex)) {
        if (status[idx] === 'pending') {
          status[idx] = 'blocked';
          args.onEvent({ storyIndex: idx, kind: 'status', status: 'blocked' });
        }
      }
    };

    const markNowReady = (): number[] => {
      const ready: number[] = [];
      for (let i = 0; i < dag.length; i++) {
        if (status[i] !== 'pending') continue;
        const allPredsDone = [...dag[i].waitingFor].every((p) => status[p] === 'done');
        if (allPredsDone) ready.push(i);
      }
      return ready;
    };

    const runOne = async (index: number): Promise<void> => {
      status[index] = 'running';
      const res = await executeStory({
        story: args.plan.stories[index],
        storyIndex: index,
        repoPath: args.repoPath,
        baseBranch,
        usedSlugs,
        signal,
        onEvent: (e) => args.onEvent({ storyIndex: index, ...e }),
      });
      if (res.success) {
        status[index] = 'done';
      } else if (res.duplicate) {
        // Another concurrent execution owns this story. Treat it as done from
        // this run's perspective so downstream tasks don't stall, and don't
        // cascade failure — the other execution will drive the real events.
        status[index] = 'done';
      } else {
        status[index] = 'failed';
        failed = true;
        blockCascade(index);
      }
    };

    const active = new Set<Promise<void>>();
    while (true) {
      if (signal.cancelled) break;
      const ready = markNowReady();
      while (ready.length > 0 && active.size < maxParallel) {
        const idx = ready.shift()!;
        const p = runOne(idx).finally(() => active.delete(p));
        active.add(p);
      }
      if (active.size === 0) break;
      await Promise.race(active);
    }
    await Promise.allSettled([...active]);

    const success = !failed && !signal.cancelled;
    args.onEvent({ kind: 'run-done', success });
    return { success };
  })();

  return {
    runId,
    result,
    cancel: () => {
      signal.cancelled = true;
    },
  };
}

function safeBuildDag(plan: RefinedPlan, onEvent: (e: PlanEvent) => void): DagNode[] | null {
  try {
    return buildDag(plan.stories.length, plan.dependencies);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    for (let i = 0; i < plan.stories.length; i++) {
      onEvent({ storyIndex: i, kind: 'log', stream: 'stderr', line: msg });
      onEvent({ storyIndex: i, kind: 'status', status: 'failed' });
    }
    return null;
  }
}

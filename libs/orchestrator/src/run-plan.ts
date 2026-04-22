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
  cancelStory: (storyIndex: number) => void;
};

let nextRunId = 1;

export function startPlanRun(args: {
  plan: RefinedPlan;
  repoPath: string;
  baseBranch?: string;
  maxParallel?: number;
  onEvent: (event: PlanEvent) => void;
}): PlanRunHandle {
  const runId = `run-${Date.now()}-${nextRunId++}`;
  const signal = { cancelled: false };
  const storySignals = new Map<number, { cancelled: boolean }>();
  const usedSlugs = new Set<string>();
  const maxParallel = Math.max(1, args.maxParallel ?? DEFAULT_PARALLELISM);

  const result = (async () => {
    const baseBranch = args.baseBranch ?? (await detectBaseBranch(args.repoPath));
    const dag = safeBuildDag(args.plan, args.onEvent);
    if (!dag) {
      args.onEvent({ kind: 'run-done', success: false });
      return { success: false };
    }

    const status: Array<'pending' | 'running' | 'done' | 'failed' | 'blocked' | 'cancelled'> = dag.map(() => 'pending');
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
      const storySignal = { cancelled: false };
      storySignals.set(index, storySignal);
      status[index] = 'running';
      const res = await executeStory({
        story: args.plan.stories[index],
        storyIndex: index,
        repoPath: args.repoPath,
        baseBranch,
        usedSlugs,
        signal,
        storySignal,
        onEvent: (e) => args.onEvent({ storyIndex: index, ...e }),
      });
      storySignals.delete(index);
      if (res.success) {
        status[index] = 'done';
      } else if (storySignal.cancelled && !signal.cancelled) {
        // Per-story cancellation: don't cascade blocked, don't mark run as failed
        status[index] = 'cancelled';
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
    cancelStory: (storyIndex: number) => {
      const s = storySignals.get(storyIndex);
      if (s) s.cancelled = true;
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

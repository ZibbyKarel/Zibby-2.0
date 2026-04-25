import type { RefinedPlan, StoryStatus } from '@nightcoder/shared-types/ipc';

export type LogLine = { s: 'out' | 'err' | 'info'; l: string };

export type StoryRuntime = {
  status: StoryStatus;
  logs: LogLine[];
  branch: string | null;
  prUrl: string | null;
  startedAt: number | null;
  endedAt: number | null;
  /** Epoch ms when the usage limit that paused this task resets. */
  limitResetsAt: number | null;
};

export type TaskVM = {
  id: string;
  taskId: string;
  index: number;
  /** Persistent project-scoped numeric ID, null until first run. */
  numericId: number | null;
  title: string;
  description: string;
  acceptance: string[];
  affectedFiles: string[];
  model: string | null;
  status: StoryStatus;
  branch: string | null;
  prUrl: string | null;
  startedAt: number | null;
  endedAt: number | null;
  tokens: null;
  logs: LogLine[];
  diff: null;
  waitsOn: number[];
  /** Task was `running` when the app last loaded — Resume is the right action. */
  interrupted: boolean;
  /** Epoch ms when a usage-limit-induced pause resets. */
  limitResetsAt: number | null;
};

export type TaskColumn = 'queue' | 'running' | 'review' | 'done';

export function statusToCol(status: StoryStatus): TaskColumn {
  if (status === 'running' || status === 'pushing') return 'running';
  if (status === 'review') return 'review';
  if (status === 'done' || status === 'failed' || status === 'cancelled') return 'done';
  return 'queue'; // pending | blocked | interrupted
}

export function toTasks(
  plan: RefinedPlan,
  runtime: Record<number, StoryRuntime>,
  interruptedIndices: ReadonlySet<number> = new Set(),
): TaskVM[] {
  return plan.stories.map((story, idx) => {
    const rt = runtime[idx];
    const waitsOn = plan.dependencies
      .filter((d) => d.to === idx)
      .map((d) => d.from);
    const persistedStatus = rt?.status ?? 'pending';
    const interrupted = interruptedIndices.has(idx) || persistedStatus === 'interrupted';
    // A persisted 'running'/'pushing' status with no live orchestrator means
    // the app was closed mid-run. Show it as interrupted instead of falsely
    // claiming the task is still executing. The underlying runtime status is
    // left untouched so the main process keeps the 'pushing' distinction it
    // needs to set `pushOnly` on resume.
    const status: StoryStatus =
      interrupted && (persistedStatus === 'running' || persistedStatus === 'pushing')
        ? 'interrupted'
        : persistedStatus;
    return {
      id: String(idx),
      taskId: story.taskId,
      index: idx,
      numericId: story.numericId ?? null,
      title: story.title,
      description: story.description,
      acceptance: story.acceptanceCriteria,
      affectedFiles: story.affectedFiles,
      model: story.model ?? null,
      status,
      branch: rt?.branch ?? null,
      prUrl: rt?.prUrl ?? null,
      startedAt: rt?.startedAt ?? null,
      endedAt: rt?.endedAt ?? null,
      tokens: null,
      logs: rt?.logs ?? [],
      diff: null,
      waitsOn,
      interrupted,
      limitResetsAt: rt?.limitResetsAt ?? null,
    };
  });
}

export function emptyRuntime(): StoryRuntime {
  return {
    status: 'pending',
    logs: [],
    branch: null,
    prUrl: null,
    startedAt: null,
    endedAt: null,
    limitResetsAt: null,
  };
}

const TERMINAL_STATUSES: StoryStatus[] = ['done', 'failed', 'cancelled'];
export function isTerminal(s: StoryStatus): boolean {
  return TERMINAL_STATUSES.includes(s);
}

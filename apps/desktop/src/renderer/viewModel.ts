import type { RefinedPlan, StoryStatus } from '@nightcoder/shared-types/ipc';

export type LogLine = { s: 'out' | 'err' | 'info'; l: string };

export type StoryRuntime = {
  status: StoryStatus;
  logs: LogLine[];
  branch: string | null;
  prUrl: string | null;
  startedAt: number | null;
  endedAt: number | null;
};

export type TaskVM = {
  id: string;
  taskId: string;
  index: number;
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
};

export type TaskColumn = 'queue' | 'running' | 'review' | 'done';

export function statusToCol(status: StoryStatus): TaskColumn {
  if (status === 'running' || status === 'pushing') return 'running';
  if (status === 'review') return 'review';
  if (status === 'done' || status === 'failed' || status === 'cancelled') return 'done';
  return 'queue'; // pending | blocked
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
    return {
      id: String(idx),
      taskId: story.taskId,
      index: idx,
      title: story.title,
      description: story.description,
      acceptance: story.acceptanceCriteria,
      affectedFiles: story.affectedFiles,
      model: story.model ?? null,
      status: rt?.status ?? 'pending',
      branch: rt?.branch ?? null,
      prUrl: rt?.prUrl ?? null,
      startedAt: rt?.startedAt ?? null,
      endedAt: rt?.endedAt ?? null,
      tokens: null,
      logs: rt?.logs ?? [],
      diff: null,
      waitsOn,
      interrupted: interruptedIndices.has(idx),
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
  };
}

const TERMINAL_STATUSES: StoryStatus[] = ['done', 'failed', 'cancelled'];
export function isTerminal(s: StoryStatus): boolean {
  return TERMINAL_STATUSES.includes(s);
}

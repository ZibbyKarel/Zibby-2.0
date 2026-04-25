export const IpcChannels = {
  PickFolder: 'nightcoder:pickFolder',
  Refine: 'nightcoder:refine',
  Advise: 'nightcoder:advise',
  StartRun: 'nightcoder:startRun',
  RunStory: 'nightcoder:runStory',
  ResumeTask: 'nightcoder:resumeTask',
  CancelRun: 'nightcoder:cancelRun',
  LoadState: 'nightcoder:loadState',
  SaveState: 'nightcoder:saveState',
  RemoveStory: 'nightcoder:removeStory',
  GetUsage: 'nightcoder:getUsage',
  OpenExternal: 'nightcoder:openExternal',
  PickFilesToAttach: 'nightcoder:pickFilesToAttach',
  AddTaskFiles: 'nightcoder:addTaskFiles',
  ListTaskFiles: 'nightcoder:listTaskFiles',
  RemoveTaskFile: 'nightcoder:removeTaskFile',
  GetTaskDiff: 'nightcoder:getTaskDiff',
  SquashMergeTask: 'nightcoder:squashMergeTask',
  SyncTaskStates: 'nightcoder:syncTaskStates',
  ListRepoTree: 'nightcoder:listRepoTree',
} as const;

export const IpcEvents = {
  RunEvent: 'nightcoder:runEvent',
  UsageUpdate: 'nightcoder:usageUpdate',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

export type PickFolderResult =
  | { kind: 'cancelled' }
  | { kind: 'selected'; path: string; isGitRepo: boolean; hasOrigin: boolean };

/** How hard the model should "think" during a phase. Stored only — claude CLI
 * has no thinking flag today, so 'off' is a no-op and higher levels prepend a
 * preamble to the prompt ("Think carefully before acting."). */
export type ThinkingLevel = 'off' | 'low' | 'medium' | 'high';

export type PhaseModel = {
  /** Claude model alias (e.g. 'sonnet', 'opus', 'haiku'). */
  model?: string;
  thinking?: ThinkingLevel;
};

/**
 * Per-phase execution configuration. The orchestrator currently does one
 * claude run per story — for that single run we use `implementation`. Planning
 * and QA are persisted for forward-compat with a future multi-phase executor.
 */
export type PhaseModels = {
  planning?: PhaseModel;
  implementation?: PhaseModel;
  qa?: PhaseModel;
};

export type Story = {
  taskId: string;
  /** Monotonically increasing project-scoped ID, assigned at first run. */
  numericId?: number;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  affectedFiles: string[];
  model?: string;
  /**
   * Per-phase model + thinking config. If present,
   * `phaseModels.implementation.model` is used for the single claude run,
   * falling back to `model` and then the env default.
   */
  phaseModels?: PhaseModels;
  /**
   * taskId of another story that must finish before this one. When set, the
   * new task's worktree is branched off the blocker's branch and the resulting
   * PR targets that branch instead of the repo's default base.
   */
  blockerTaskId?: string;
};

export type Dependency = {
  from: number;
  to: number;
  reason: string;
};

export type RefinedPlan = {
  stories: Story[];
  dependencies: Dependency[];
};

export type RefineRequest = {
  folderPath: string;
  brief: string;
};

export type RefineResult =
  | { kind: 'ok'; plan: RefinedPlan }
  | { kind: 'error'; message: string };

export type AdvisorReview = {
  overall: string;
  concerns: string[];
  perStoryNotes: { storyIndex: number; note: string }[];
  suggestedDependencies: Dependency[];
};

export type AdviseRequest = {
  folderPath: string;
  plan: RefinedPlan;
};

export type AdviseResult =
  | { kind: 'ok'; review: AdvisorReview }
  | { kind: 'error'; message: string };

export type StoryStatus =
  | 'pending'
  | 'blocked'
  | 'running'
  | 'pushing'
  | 'review'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'interrupted';

export type RunStartRequest = {
  folderPath: string;
  plan: RefinedPlan;
  baseBranch?: string;
  completedIndices?: number[];
};

export type RunStartResult =
  | { kind: 'started'; runId: string }
  | { kind: 'error'; message: string };

export type RunStoryRequest = {
  runId: string;
  storyIndex: number;
  folderPath: string;
  plan: RefinedPlan;
  baseBranch?: string;
};

export type RunStoryResult =
  | { kind: 'ok' }
  | { kind: 'error'; message: string };

export type ResumeTaskRequest = {
  taskId: string;
};

export type ResumeTaskResult =
  | { kind: 'ok'; runId: string }
  | { kind: 'error'; message: string };

export type RunEvent =
  | { runId: string; storyIndex: number; kind: 'status'; status: StoryStatus }
  | { runId: string; storyIndex: number; kind: 'log'; stream: 'stdout' | 'stderr' | 'info'; line: string }
  | { runId: string; storyIndex: number; kind: 'branch'; branch: string }
  | { runId: string; storyIndex: number; kind: 'pr'; url: string; branch: string }
  | { runId: string; storyIndex: number; kind: 'limit-hit'; resetsAt: number | null }
  | { runId: string; kind: 'run-done'; success: boolean };

export type RemoveStoryPayload = {
  storyIndex: number;
};

export type RemoveStoryResult = {
  plan: RefinedPlan;
  branchDeletionWarning?: string;
};

export type PersistedStoryRuntime = {
  status: StoryStatus;
  branch: string | null;
  prUrl: string | null;
  startedAt: number | null;
  endedAt: number | null;
  /** Epoch ms when the Claude usage limit that interrupted this task resets. */
  limitResetsAt?: number | null;
};

/**
 * Persisted per-task runtime state for the per-project `.nightcoder/index.json`
 * manifest. Keyed by stable taskId so replan doesn't shift entries.
 */
export type PersistedTask = {
  taskId: string;
  status: StoryStatus;
  branch: string | null;
  prUrl: string | null;
  startedAt: number | null;
  endedAt: number | null;
  sessionId?: string;
  /** Epoch ms when the Claude usage limit that interrupted this task resets. */
  limitResetsAt?: number | null;
};

/** Shape of `<repo>/.nightcoder/index.json`. */
export type ProjectState = {
  version: 1;
  brief: string;
  plan: RefinedPlan;
  tasks: Record<string, PersistedTask>;
  /** Monotonically increasing counter; next task created will get this value. */
  nextTaskNum: number;
};

/**
 * Wire format still accepted by the legacy SaveState IPC. The main process
 * decomposes this into `{ lastOpenedFolder }` (userData) plus a per-project
 * ProjectState file. New code should prefer the per-project store directly.
 */
export type PersistedState = {
  folderPath?: string;
  brief?: string;
  plan?: RefinedPlan;
  runtime?: Record<number, PersistedStoryRuntime>;
};

export type LoadedAppState = {
  folder: PickFolderResult | null;
  brief: string;
  plan: RefinedPlan | null;
  runtime: Record<number, PersistedStoryRuntime> | null;
};

export type UsageWindow = {
  usedPercentage: number;
  resetsAt: number;
};

export type Usage = {
  fiveHour: UsageWindow | null;
  sevenDay: UsageWindow | null;
  fetchedAt: number;
};

export type TaskFile = {
  name: string;
  size: number;
};

export type PickFilesToAttachResult =
  | { kind: 'cancelled' }
  | { kind: 'selected'; paths: string[] };

export type AddTaskFilesRequest = {
  taskId: string;
  sourcePaths: string[];
};

export type AddTaskFilesResult =
  | { kind: 'ok'; files: TaskFile[] }
  | { kind: 'error'; message: string };

export type ListTaskFilesRequest = {
  taskId: string;
};

export type ListTaskFilesResult =
  | { kind: 'ok'; files: TaskFile[] }
  | { kind: 'error'; message: string };

export type RemoveTaskFileRequest = {
  taskId: string;
  name: string;
};

export type RemoveTaskFileResult =
  | { kind: 'ok'; files: TaskFile[] }
  | { kind: 'error'; message: string };

/**
 * One file's portion of a unified git diff. `hunks` contains the `@@ ... @@`
 * blocks as raw strings, suitable for feeding into @git-diff-view/react.
 */
export type TaskDiffFile = {
  oldPath: string | null;
  newPath: string | null;
  /** 'added' | 'deleted' | 'modified' | 'renamed' | 'binary'. */
  changeKind: 'added' | 'deleted' | 'modified' | 'renamed' | 'binary';
  /** Best-effort language hint (lowercase, e.g. 'typescript', 'tsx', 'json'). */
  lang: string | null;
  hunks: string[];
};

export type TaskDiffResult =
  | { kind: 'ok'; baseBranch: string; branch: string | null; files: TaskDiffFile[] }
  | { kind: 'empty'; reason: 'no-branch' | 'no-changes' }
  | { kind: 'error'; message: string };

export type GetTaskDiffRequest = {
  taskId: string;
};

export type SquashMergeTaskRequest = {
  taskId: string;
};

export type SquashMergeTaskResult =
  | { kind: 'ok'; prUrl: string; subject: string }
  | { kind: 'error'; message: string };

export type SyncTaskStatesRequest = {
  folderPath: string;
};

export type SyncTaskStateUpdate = {
  storyIndex: number;
  taskId: string;
  /** New status assigned to the task as a result of syncing. */
  status: StoryStatus;
  /** PR URL at the time of sync; useful if the renderer didn't have it yet. */
  prUrl: string | null;
  branch: string | null;
};

/**
 * One entry in the repo file tree. `children` is present only for directories;
 * leaf files omit it (undefined). `path` is relative to the repo root and uses
 * forward slashes regardless of OS.
 */
export type RepoTreeEntry = {
  name: string;
  path: string;
  kind: 'file' | 'dir';
  children?: RepoTreeEntry[];
};

export type ListRepoTreeRequest = {
  folderPath: string;
};

export type ListRepoTreeResult =
  | { kind: 'ok'; tree: RepoTreeEntry[] }
  | { kind: 'error'; message: string };

export type SyncTaskStatesResult =
  | {
      kind: 'ok';
      /** Number of tasks inspected (those with a PR URL and non-live status). */
      checked: number;
      /** Tasks whose PR was found merged externally. */
      mergedCount: number;
      updates: SyncTaskStateUpdate[];
    }
  | { kind: 'error'; message: string };

export type IpcApi = {
  version: string;
  pickFolder: () => Promise<PickFolderResult>;
  refine: (req: RefineRequest) => Promise<RefineResult>;
  advise: (req: AdviseRequest) => Promise<AdviseResult>;
  startRun: (req: RunStartRequest) => Promise<RunStartResult>;
  runStory: (req: RunStoryRequest) => Promise<RunStoryResult>;
  resumeTask: (req: ResumeTaskRequest) => Promise<ResumeTaskResult>;
  cancelRun: (runId: string) => Promise<void>;
  onRunEvent: (handler: (event: RunEvent) => void) => () => void;
  loadState: () => Promise<LoadedAppState>;
  saveState: (state: PersistedState) => Promise<void>;
  removeStory: (storyIndex: number) => Promise<RemoveStoryResult>;
  getUsage: () => Promise<Usage | null>;
  onUsageUpdate: (handler: (usage: Usage | null) => void) => () => void;
  openExternal: (url: string) => Promise<void>;
  pickFilesToAttach: () => Promise<PickFilesToAttachResult>;
  addTaskFiles: (req: AddTaskFilesRequest) => Promise<AddTaskFilesResult>;
  listTaskFiles: (req: ListTaskFilesRequest) => Promise<ListTaskFilesResult>;
  removeTaskFile: (req: RemoveTaskFileRequest) => Promise<RemoveTaskFileResult>;
  getTaskDiff: (req: GetTaskDiffRequest) => Promise<TaskDiffResult>;
  squashMergeTask: (req: SquashMergeTaskRequest) => Promise<SquashMergeTaskResult>;
  syncTaskStates: (req: SyncTaskStatesRequest) => Promise<SyncTaskStatesResult>;
  listRepoTree: (req: ListRepoTreeRequest) => Promise<ListRepoTreeResult>;
};

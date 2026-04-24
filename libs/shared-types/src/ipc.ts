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
} as const;

export const IpcEvents = {
  RunEvent: 'nightcoder:runEvent',
  UsageUpdate: 'nightcoder:usageUpdate',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

export type PickFolderResult =
  | { kind: 'cancelled' }
  | { kind: 'selected'; path: string; isGitRepo: boolean; hasOrigin: boolean };

export type Story = {
  taskId: string;
  /** Monotonically increasing project-scoped ID, assigned at first run. */
  numericId?: number;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  affectedFiles: string[];
  model?: string;
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
};

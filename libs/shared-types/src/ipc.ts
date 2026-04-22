export const IpcChannels = {
  PickFolder: 'zibby:pickFolder',
  Refine: 'zibby:refine',
  Advise: 'zibby:advise',
  StartRun: 'zibby:startRun',
  RunStory: 'zibby:runStory',
  CancelRun: 'zibby:cancelRun',
  LoadState: 'zibby:loadState',
  SaveState: 'zibby:saveState',
  RemoveStory: 'zibby:removeStory',
} as const;

export const IpcEvents = {
  RunEvent: 'zibby:runEvent',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

export type PickFolderResult =
  | { kind: 'cancelled' }
  | { kind: 'selected'; path: string; isGitRepo: boolean; hasOrigin: boolean };

export type Story = {
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
  | 'done'
  | 'failed'
  | 'cancelled';

export type RunStartRequest = {
  folderPath: string;
  plan: RefinedPlan;
  baseBranch?: string;
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

export type RunEvent =
  | { runId: string; storyIndex: number; kind: 'status'; status: StoryStatus }
  | { runId: string; storyIndex: number; kind: 'log'; stream: 'stdout' | 'stderr' | 'info'; line: string }
  | { runId: string; storyIndex: number; kind: 'pr'; url: string; branch: string }
  | { runId: string; kind: 'run-done'; success: boolean };

export type RemoveStoryPayload = {
  storyIndex: number;
};

export type RemoveStoryResult = {
  plan: RefinedPlan;
  branchDeletionWarning?: string;
};

export type PersistedState = {
  folderPath?: string;
  brief?: string;
  plan?: RefinedPlan;
};

export type LoadedAppState = {
  folder: PickFolderResult | null;
  brief: string;
  plan: RefinedPlan | null;
};

export type IpcApi = {
  version: string;
  pickFolder: () => Promise<PickFolderResult>;
  refine: (req: RefineRequest) => Promise<RefineResult>;
  advise: (req: AdviseRequest) => Promise<AdviseResult>;
  startRun: (req: RunStartRequest) => Promise<RunStartResult>;
  runStory: (req: RunStoryRequest) => Promise<RunStoryResult>;
  cancelRun: (runId: string) => Promise<void>;
  onRunEvent: (handler: (event: RunEvent) => void) => () => void;
  loadState: () => Promise<LoadedAppState>;
  saveState: (state: PersistedState) => Promise<void>;
  removeStory: (storyIndex: number) => Promise<RemoveStoryResult>;
};

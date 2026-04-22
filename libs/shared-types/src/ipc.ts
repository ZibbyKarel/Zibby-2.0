export const IpcChannels = {
  PickFolder: 'zibby:pickFolder',
  Refine: 'zibby:refine',
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

export type IpcApi = {
  version: string;
  pickFolder: () => Promise<PickFolderResult>;
  refine: (req: RefineRequest) => Promise<RefineResult>;
};

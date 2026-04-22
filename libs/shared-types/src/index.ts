export const IpcChannels = {
  PickFolder: 'zibby:pickFolder',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

export type PickFolderResult =
  | { kind: 'cancelled' }
  | { kind: 'selected'; path: string; isGitRepo: boolean; hasOrigin: boolean };

export type IpcApi = {
  version: string;
  pickFolder: () => Promise<PickFolderResult>;
};

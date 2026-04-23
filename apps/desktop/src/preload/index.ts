import { contextBridge, ipcRenderer } from 'electron';
import {
  IpcChannels,
  IpcEvents,
  type IpcApi,
  type PickFolderResult,
  type RefineRequest,
  type RefineResult,
  type RefineStoryRequest,
  type RefineStoryResult,
  type AdviseRequest,
  type AdviseResult,
  type RunStartRequest,
  type RunStartResult,
  type RunStoryRequest,
  type RunStoryResult,
  type RunEvent,
  type PersistedState,
  type LoadedAppState,
  type RemoveStoryResult,
} from '@zibby/shared-types/ipc';

const api: IpcApi = {
  version: '0.0.1',
  pickFolder: (): Promise<PickFolderResult> => ipcRenderer.invoke(IpcChannels.PickFolder),
  refine: (req: RefineRequest): Promise<RefineResult> =>
    ipcRenderer.invoke(IpcChannels.Refine, req),
  refineStory: (req: RefineStoryRequest): Promise<RefineStoryResult> =>
    ipcRenderer.invoke(IpcChannels.RefineStory, req),
  advise: (req: AdviseRequest): Promise<AdviseResult> =>
    ipcRenderer.invoke(IpcChannels.Advise, req),
  startRun: (req: RunStartRequest): Promise<RunStartResult> =>
    ipcRenderer.invoke(IpcChannels.StartRun, req),
  runStory: (req: RunStoryRequest): Promise<RunStoryResult> =>
    ipcRenderer.invoke(IpcChannels.RunStory, req),
  cancelRun: (runId: string): Promise<void> => ipcRenderer.invoke(IpcChannels.CancelRun, runId),
  onRunEvent: (handler: (event: RunEvent) => void) => {
    const listener = (_: unknown, event: RunEvent) => handler(event);
    ipcRenderer.on(IpcEvents.RunEvent, listener);
    return () => {
      ipcRenderer.removeListener(IpcEvents.RunEvent, listener);
    };
  },
  loadState: (): Promise<LoadedAppState> => ipcRenderer.invoke(IpcChannels.LoadState),
  saveState: (state: PersistedState): Promise<void> => ipcRenderer.invoke(IpcChannels.SaveState, state),
  removeStory: (storyIndex: number): Promise<RemoveStoryResult> =>
    ipcRenderer.invoke(IpcChannels.RemoveStory, { storyIndex }),
};

contextBridge.exposeInMainWorld('zibby', api);

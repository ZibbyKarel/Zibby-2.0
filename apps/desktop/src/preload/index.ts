import { contextBridge, ipcRenderer } from 'electron';
import {
  IpcChannels,
  IpcEvents,
  type IpcApi,
  type PickFolderResult,
  type RefineRequest,
  type RefineResult,
  type RunStartRequest,
  type RunStartResult,
  type RunEvent,
} from '@zibby/shared-types/ipc';

const api: IpcApi = {
  version: '0.0.1',
  pickFolder: (): Promise<PickFolderResult> => ipcRenderer.invoke(IpcChannels.PickFolder),
  refine: (req: RefineRequest): Promise<RefineResult> =>
    ipcRenderer.invoke(IpcChannels.Refine, req),
  startRun: (req: RunStartRequest): Promise<RunStartResult> =>
    ipcRenderer.invoke(IpcChannels.StartRun, req),
  cancelRun: (runId: string): Promise<void> => ipcRenderer.invoke(IpcChannels.CancelRun, runId),
  onRunEvent: (handler: (event: RunEvent) => void) => {
    const listener = (_: unknown, event: RunEvent) => handler(event);
    ipcRenderer.on(IpcEvents.RunEvent, listener);
    return () => {
      ipcRenderer.removeListener(IpcEvents.RunEvent, listener);
    };
  },
};

contextBridge.exposeInMainWorld('zibby', api);

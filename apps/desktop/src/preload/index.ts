import { contextBridge, ipcRenderer } from 'electron';
import {
  IpcChannels,
  type IpcApi,
  type PickFolderResult,
  type RefineRequest,
  type RefineResult,
} from '@zibby/shared-types/ipc';

const api: IpcApi = {
  version: '0.0.1',
  pickFolder: (): Promise<PickFolderResult> => ipcRenderer.invoke(IpcChannels.PickFolder),
  refine: (req: RefineRequest): Promise<RefineResult> =>
    ipcRenderer.invoke(IpcChannels.Refine, req),
};

contextBridge.exposeInMainWorld('zibby', api);

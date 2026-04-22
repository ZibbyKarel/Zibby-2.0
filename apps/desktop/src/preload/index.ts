import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels, type IpcApi, type PickFolderResult } from '@zibby/shared-types';

const api: IpcApi = {
  version: '0.0.1',
  pickFolder: (): Promise<PickFolderResult> => ipcRenderer.invoke(IpcChannels.PickFolder),
};

contextBridge.exposeInMainWorld('zibby', api);

import { contextBridge } from 'electron';

export type ZibbyApi = {
  version: string;
};

const api: ZibbyApi = {
  version: '0.0.1',
};

contextBridge.exposeInMainWorld('zibby', api);

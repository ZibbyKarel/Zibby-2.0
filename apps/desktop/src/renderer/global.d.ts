import type { IpcApi } from '@nightcoder/shared-types';

declare global {
  interface Window {
    zibby: IpcApi;
  }
}

export {};

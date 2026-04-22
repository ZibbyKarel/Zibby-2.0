import type { IpcApi } from '@zibby/shared-types';

declare global {
  interface Window {
    zibby: IpcApi;
  }
}

export {};

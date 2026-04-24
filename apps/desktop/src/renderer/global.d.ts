import type { IpcApi } from '@nightcoder/shared-types';

declare global {
  interface Window {
    nightcoder: IpcApi;
  }
}

export {};

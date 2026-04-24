import { contextBridge, ipcRenderer } from 'electron';
import {
  IpcChannels,
  IpcEvents,
  type IpcApi,
  type PickFolderResult,
  type RefineRequest,
  type RefineResult,
  type AdviseRequest,
  type AdviseResult,
  type RunStartRequest,
  type RunStartResult,
  type RunStoryRequest,
  type RunStoryResult,
  type ResumeTaskRequest,
  type ResumeTaskResult,
  type RunEvent,
  type PersistedState,
  type LoadedAppState,
  type RemoveStoryResult,
  type Usage,
  type PickFilesToAttachResult,
  type AddTaskFilesRequest,
  type AddTaskFilesResult,
  type ListTaskFilesRequest,
  type ListTaskFilesResult,
  type RemoveTaskFileRequest,
  type RemoveTaskFileResult,
  type GetTaskDiffRequest,
  type TaskDiffResult,
  type SquashAndMergeTaskRequest,
  type SquashAndMergeTaskResult,
} from '@nightcoder/shared-types/ipc';

const api: IpcApi = {
  version: '0.0.1',
  pickFolder: (): Promise<PickFolderResult> => ipcRenderer.invoke(IpcChannels.PickFolder),
  refine: (req: RefineRequest): Promise<RefineResult> =>
    ipcRenderer.invoke(IpcChannels.Refine, req),
  advise: (req: AdviseRequest): Promise<AdviseResult> =>
    ipcRenderer.invoke(IpcChannels.Advise, req),
  startRun: (req: RunStartRequest): Promise<RunStartResult> =>
    ipcRenderer.invoke(IpcChannels.StartRun, req),
  runStory: (req: RunStoryRequest): Promise<RunStoryResult> =>
    ipcRenderer.invoke(IpcChannels.RunStory, req),
  resumeTask: (req: ResumeTaskRequest): Promise<ResumeTaskResult> =>
    ipcRenderer.invoke(IpcChannels.ResumeTask, req),
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
  getUsage: (): Promise<Usage | null> => ipcRenderer.invoke(IpcChannels.GetUsage),
  onUsageUpdate: (handler: (usage: Usage | null) => void) => {
    const listener = (_: unknown, usage: Usage | null) => handler(usage);
    ipcRenderer.on(IpcEvents.UsageUpdate, listener);
    return () => {
      ipcRenderer.removeListener(IpcEvents.UsageUpdate, listener);
    };
  },
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke(IpcChannels.OpenExternal, url),
  pickFilesToAttach: (): Promise<PickFilesToAttachResult> =>
    ipcRenderer.invoke(IpcChannels.PickFilesToAttach),
  addTaskFiles: (req: AddTaskFilesRequest): Promise<AddTaskFilesResult> =>
    ipcRenderer.invoke(IpcChannels.AddTaskFiles, req),
  listTaskFiles: (req: ListTaskFilesRequest): Promise<ListTaskFilesResult> =>
    ipcRenderer.invoke(IpcChannels.ListTaskFiles, req),
  removeTaskFile: (req: RemoveTaskFileRequest): Promise<RemoveTaskFileResult> =>
    ipcRenderer.invoke(IpcChannels.RemoveTaskFile, req),
  getTaskDiff: (req: GetTaskDiffRequest): Promise<TaskDiffResult> =>
    ipcRenderer.invoke(IpcChannels.GetTaskDiff, req),
  squashAndMergeTask: (req: SquashAndMergeTaskRequest): Promise<SquashAndMergeTaskResult> =>
    ipcRenderer.invoke(IpcChannels.SquashAndMergeTask, req),
};

contextBridge.exposeInMainWorld('nightcoder', api);

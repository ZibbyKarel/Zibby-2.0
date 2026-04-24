import { app, BrowserWindow, dialog, ipcMain, shell, type WebContents } from 'electron';
import path from 'node:path';
import { access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  IpcChannels,
  IpcEvents,
  type PickFolderResult,
  type RefineRequest,
  type RefineResult,
  type AdviseRequest,
  type AdviseResult,
  type RunStartRequest,
  type RunStartResult,
  type RunStoryRequest,
  type RunStoryResult,
  type RunEvent,
  type PersistedState,
  type LoadedAppState,
  type RemoveStoryPayload,
  type RemoveStoryResult,
} from '@zibby/shared-types/ipc';
import type { Usage } from '@zibby/shared-types/ipc';
import { refine, advise } from '@zibby/ai-refiner';
import { startPlanRun, runSingleStory, removeStoryFromPlan, slugify, type PlanRunHandle } from '@zibby/orchestrator';
import { deleteStoryBranch } from '@zibby/github';
import { fetchUsage } from '@zibby/usage';
import { loadPersisted, savePersisted } from './state-store';

const execFileP = promisify(execFile);
const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(DEV_URL);

const MAX_PARALLEL_RUNNERS = Math.max(1, Number(process.env.MAX_PARALLEL_RUNNERS ?? 3));
let activeRunnerCount = 0;
const runnerQueue: Array<() => void> = [];

function acquireRunner(): Promise<void> {
  if (activeRunnerCount < MAX_PARALLEL_RUNNERS) {
    activeRunnerCount++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    runnerQueue.push(() => {
      activeRunnerCount++;
      resolve();
    });
  });
}

function releaseRunner(): void {
  activeRunnerCount--;
  const next = runnerQueue.shift();
  if (next) next();
}

const activeRuns = new Map<string, PlanRunHandle>();

const USAGE_POLL_INTERVAL_MS = 5 * 60 * 1000;
let cachedUsage: Usage | null = null;
let usagePollTimer: ReturnType<typeof setInterval> | null = null;
let usageInFlight: Promise<Usage | null> | null = null;

async function refreshUsage(getWebContents: () => WebContents | null): Promise<Usage | null> {
  if (usageInFlight) return usageInFlight;
  usageInFlight = (async () => {
    try {
      const usage = await fetchUsage();
      cachedUsage = usage;
      const wc = getWebContents();
      if (wc && !wc.isDestroyed()) wc.send(IpcEvents.UsageUpdate, usage);
      return usage;
    } catch {
      return cachedUsage;
    } finally {
      usageInFlight = null;
    }
  })();
  return usageInFlight;
}

function startUsagePolling(getWebContents: () => WebContents | null) {
  if (usagePollTimer) return;
  void refreshUsage(getWebContents);
  usagePollTimer = setInterval(() => {
    void refreshUsage(getWebContents);
  }, USAGE_POLL_INTERVAL_MS);
}

async function isGitRepo(folder: string): Promise<boolean> {
  try {
    await access(path.join(folder, '.git'));
    return true;
  } catch {
    return false;
  }
}

async function hasGitOrigin(folder: string): Promise<boolean> {
  try {
    const { stdout } = await execFileP('git', ['remote', 'get-url', 'origin'], { cwd: folder });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

function emitToRenderer(wc: WebContents, event: RunEvent) {
  if (!wc.isDestroyed()) wc.send(IpcEvents.RunEvent, event);
}

function registerIpc(getWebContents: () => WebContents | null) {
  ipcMain.handle(IpcChannels.PickFolder, async (): Promise<PickFolderResult> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select a folder',
    });
    if (result.canceled || result.filePaths.length === 0) return { kind: 'cancelled' };
    const folder = result.filePaths[0];
    const gitRepo = await isGitRepo(folder);
    const origin = gitRepo ? await hasGitOrigin(folder) : false;
    return { kind: 'selected', path: folder, isGitRepo: gitRepo, hasOrigin: origin };
  });

  ipcMain.handle(
    IpcChannels.Refine,
    async (_event, req: RefineRequest): Promise<RefineResult> => {
      try {
        const plan = await refine({ folderPath: req.folderPath, brief: req.brief });
        return { kind: 'ok', plan };
      } catch (err) {
        return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.Advise,
    async (_event, req: AdviseRequest): Promise<AdviseResult> => {
      try {
        const review = await advise({ folderPath: req.folderPath, plan: req.plan });
        return { kind: 'ok', review };
      } catch (err) {
        return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.StartRun,
    async (_event, req: RunStartRequest): Promise<RunStartResult> => {
      try {
        const handle = startPlanRun({
          plan: req.plan,
          repoPath: req.folderPath,
          baseBranch: req.baseBranch,
          completedIndices: req.completedIndices,
          onEvent: (e) => {
            const wc = getWebContents();
            if (!wc) return;
            if ('storyIndex' in e) {
              if (e.kind === 'status') {
                emitToRenderer(wc, {
                  runId: handle.runId,
                  storyIndex: e.storyIndex,
                  kind: 'status',
                  status: e.status,
                });
              } else if (e.kind === 'log') {
                emitToRenderer(wc, {
                  runId: handle.runId,
                  storyIndex: e.storyIndex,
                  kind: 'log',
                  stream: e.stream,
                  line: e.line,
                });
              } else if (e.kind === 'pr') {
                emitToRenderer(wc, {
                  runId: handle.runId,
                  storyIndex: e.storyIndex,
                  kind: 'pr',
                  url: e.url,
                  branch: e.branch,
                });
              }
            } else if (e.kind === 'run-done') {
              emitToRenderer(wc, { runId: handle.runId, kind: 'run-done', success: e.success });
              activeRuns.delete(handle.runId);
            }
          },
        });
        activeRuns.set(handle.runId, handle);
        return { kind: 'started', runId: handle.runId };
      } catch (err) {
        return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.RunStory,
    async (_event, req: RunStoryRequest): Promise<RunStoryResult> => {
      const story = req.plan.stories[req.storyIndex];
      if (!story) return { kind: 'error', message: `Story ${req.storyIndex} not found in plan` };
      await acquireRunner();
      const handle = runSingleStory({
        story,
        storyIndex: req.storyIndex,
        repoPath: req.folderPath,
        baseBranch: req.baseBranch,
        onEvent: (e) => {
          const wc = getWebContents();
          if (!wc) return;
          if (e.kind === 'status') {
            emitToRenderer(wc, { runId: req.runId, storyIndex: e.storyIndex, kind: 'status', status: e.status });
          } else if (e.kind === 'log') {
            emitToRenderer(wc, { runId: req.runId, storyIndex: e.storyIndex, kind: 'log', stream: e.stream, line: e.line });
          } else if (e.kind === 'pr') {
            emitToRenderer(wc, { runId: req.runId, storyIndex: e.storyIndex, kind: 'pr', url: e.url, branch: e.branch });
          }
        },
      });
      void handle.result
        .catch((err) => {
          const wc = getWebContents();
          if (!wc) return;
          emitToRenderer(wc, {
            runId: req.runId,
            storyIndex: req.storyIndex,
            kind: 'log',
            stream: 'stderr',
            line: err instanceof Error ? err.message : String(err),
          });
        })
        .finally(() => releaseRunner());
      return { kind: 'ok' };
    }
  );

  ipcMain.handle(IpcChannels.CancelRun, async (_event, runId: string): Promise<void> => {
    activeRuns.get(runId)?.cancel();
  });

  ipcMain.handle(IpcChannels.LoadState, async (): Promise<LoadedAppState> => {
    const state = await loadPersisted(app.getPath('userData'));
    let folder: PickFolderResult | null = null;
    if (state.folderPath) {
      try {
        await access(path.join(state.folderPath, '.git'));
        const gitRepo = await isGitRepo(state.folderPath);
        const origin = gitRepo ? await hasGitOrigin(state.folderPath) : false;
        folder = { kind: 'selected', path: state.folderPath, isGitRepo: gitRepo, hasOrigin: origin };
      } catch {
        folder = null;
      }
    }
    return { folder, brief: state.brief ?? '', plan: state.plan ?? null, runtime: state.runtime ?? null };
  });

  ipcMain.handle(IpcChannels.SaveState, async (_event, state: PersistedState): Promise<void> => {
    await savePersisted(app.getPath('userData'), state);
  });

  ipcMain.handle(IpcChannels.GetUsage, async (): Promise<Usage | null> => {
    return refreshUsage(getWebContents);
  });

  ipcMain.handle(
    IpcChannels.RemoveStory,
    async (_event, payload: RemoveStoryPayload): Promise<RemoveStoryResult> => {
      if (activeRuns.size > 0) {
        throw new Error('Cannot remove a story while a run is active');
      }

      const state = await loadPersisted(app.getPath('userData'));
      if (!state.plan) {
        throw new Error('No plan is currently stored');
      }

      const story = state.plan.stories[payload.storyIndex];
      if (!story) {
        throw new Error(`Story ${payload.storyIndex} not found in plan`);
      }

      const updatedPlan = removeStoryFromPlan(state.plan, payload.storyIndex);

      let branchDeletionWarning: string | undefined;
      if (state.folderPath) {
        const slug = slugify(`${payload.storyIndex + 1}-${story.title}`);
        const branch = `zibby/${slug}`;
        const result = await deleteStoryBranch({ repoPath: state.folderPath, branch });
        branchDeletionWarning = result.warning;
      }

      await savePersisted(app.getPath('userData'), { ...state, plan: updatedPlan });

      return { plan: updatedPlan, ...(branchDeletionWarning !== undefined ? { branchDeletionWarning } : {}) };
    }
  );
}

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'NightCoder',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev && DEV_URL) {
    await mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist-renderer', 'index.html'));
  }
}

app.whenReady().then(() => {
  const getWebContents = () => mainWindow?.webContents ?? null;
  registerIpc(getWebContents);
  createWindow();
  startUsagePolling(getWebContents);
});

app.on('window-all-closed', () => {
  for (const handle of activeRuns.values()) handle.cancel();
  activeRuns.clear();
  if (usagePollTimer) {
    clearInterval(usagePollTimer);
    usagePollTimer = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
